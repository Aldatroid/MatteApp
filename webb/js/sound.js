/* ============ Ljud ============
   Web Audio: effekterna avkodas en gång och kan schemaläggas exakt (behövs för klick-rullningen).
   Effekter och musik går genom var sin volymkanal. Webbläsare släpper bara fram ljud efter en
   tryckning, så kontexten skapas vid första pekningen. Musiken laddas först när den slås på. */
import { $, onShow } from './util.js';
import { S, save } from './store.js';

const FILES = { right: 'assets/sounds/right.wav', snap: 'assets/sounds/snap.wav' };
const MUSIC = 'assets/sounds/music/Where_Giants_Tread.mp3';
const MUSIC_LEVEL = 0.45; // musiken ligger lägre än effekterna även på full volym
const cfg = () => S.settings.sound;
let ctx = null, fxBus = null, musicBus = null, musicEl = null; const buf = {};

// Reglaget är linjärt men örat inte, så volymen kvadreras.
const level = ch => cfg()[ch + 'On'] ? (cfg()[ch] / 100) ** 2 : 0;
function applyVolumes() {
  if (!ctx) return;
  fxBus.gain.setTargetAtTime(level('fx'), ctx.currentTime, 0.02);
  musicBus.gain.setTargetAtTime(level('music') * MUSIC_LEVEL, ctx.currentTime, 0.2);
  syncMusic();
}
function syncMusic() {
  const want = !!ctx && cfg().musicOn && cfg().music > 0 && !document.hidden;
  if (want && !musicEl) {
    musicEl = new Audio(MUSIC); musicEl.loop = true;
    ctx.createMediaElementSource(musicEl).connect(musicBus);
  }
  if (!musicEl) return;
  if (want && musicEl.paused) musicEl.play().catch(() => {});
  else if (!want && !musicEl.paused) musicEl.pause();
}
function unlock() {
  if (ctx) { if (ctx.state === 'suspended' && !document.hidden) ctx.resume(); syncMusic(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC();
  fxBus = ctx.createGain(); fxBus.connect(ctx.destination);
  musicBus = ctx.createGain(); musicBus.connect(ctx.destination);
  applyVolumes();
  for (const [k, url] of Object.entries(FILES)) fetch(url).then(r => r.arrayBuffer()).then(a => ctx.decodeAudioData(a)).then(b => { buf[k] = b; }).catch(() => {});
}
['pointerdown', 'touchend', 'keydown'].forEach(ev => addEventListener(ev, unlock, { capture: true }));
document.addEventListener('visibilitychange', () => {
  if (!ctx) return;
  if (document.hidden) ctx.suspend(); else ctx.resume();
  syncMusic();
});

// delay i ms från nu, rate = uppspelningshastighet (högre = ljusare ton)
function play(name, { delay = 0, rate = 1, vol = 1 } = {}) {
  const b = buf[name]; if (!ctx || !b || ctx.state !== 'running' || !level('fx')) return;
  const src = ctx.createBufferSource(); src.buffer = b; src.playbackRate.value = rate;
  const g = ctx.createGain(); g.gain.value = vol;
  src.connect(g).connect(fxBus);
  src.start(ctx.currentTime + delay / 1000);
}

export const playRight = () => play('right');

/* Klick-rullning när plattor blir klossar: ett klick per kloss, glesat ut när de kommer tätt.
   Tonen ligger still i början och stiger mot slutet (p² ger kurvan). rise 0.9 ≈ knappt en oktav upp. */
const ROLL = { minGap: 45, rise: 0.9 };
export function playRoll(delays) {
  if (!delays.length) return;
  const ts = [...delays].sort((a, b) => a - b), keep = [];
  for (const t of ts) if (!keep.length || t - keep[keep.length - 1] >= ROLL.minGap) keep.push(t);
  // sista klicket ska landa på sista klossen
  const last = ts[ts.length - 1];
  if (keep[keep.length - 1] !== last) { if (keep.length > 1 && last - keep[keep.length - 1] < ROLL.minGap / 2) keep.pop(); keep.push(last); }
  keep.forEach((t, i) => { const p = keep.length > 1 ? i / (keep.length - 1) : 1; play('snap', { delay: t, rate: 1 + ROLL.rise * p * p, vol: 0.6 + 0.4 * p }); });
}

/* ---- Ljudknappen: en rund knapp som finns på alla skärmar och öppnar volymreglagen ----
   Skärmar med en rubrikrad har en plats för knappen (.snd-slot), annars ligger den i hörnet. */
const SPEAKER = '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" fill="currentColor" stroke="none"/>';
const ICON = {
  on: `${SPEAKER}<path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>`,
  off: `${SPEAKER}<path d="M16 9.5l5 5M21 9.5l-5 5"/>`,
  music: '<path d="M9 17.5V6l10-2v11.5"/><circle cx="6.5" cy="17.5" r="2.5" fill="currentColor"/><circle cx="16.5" cy="15.5" r="2.5" fill="currentColor"/>',
};
const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const CH = [['fx', 'Effekter', ICON.on], ['music', 'Musik', ICON.music]];

const ctl = document.createElement('div');
ctl.id = 'soundCtl';
ctl.innerHTML = `<button class="sound-btn" id="soundBtn" aria-label="Ljud" aria-expanded="false" aria-controls="soundPanel"></button>
<div class="sound-panel" id="soundPanel" role="dialog" aria-label="Ljud" hidden>${CH.map(([ch, name, icon]) => `
  <div class="snd-row" data-ch="${ch}">
    <button class="snd-toggle" aria-label="${name} på eller av">${svg(icon)}</button>
    <label><span>${name}</span><input type="range" min="0" max="100" step="5" aria-label="Volym för ${name.toLowerCase()}"></label>
  </div>`).join('')}
</div>`;
document.body.append(ctl);
const btn = $('#soundBtn', ctl), panel = $('#soundPanel', ctl);

function render() {
  const c = cfg(), anyOn = (c.fxOn && c.fx > 0) || (c.musicOn && c.music > 0);
  btn.innerHTML = svg(anyOn ? ICON.on : ICON.off);
  btn.classList.toggle('muted', !anyOn);
  panel.querySelectorAll('.snd-row').forEach(row => {
    const ch = row.dataset.ch, on = c[ch + 'On'];
    row.classList.toggle('on', on);
    row.querySelector('.snd-toggle').setAttribute('aria-pressed', on);
    const r = row.querySelector('input'); r.value = c[ch]; r.style.setProperty('--fill', c[ch] + '%');
  });
}
function changed() { save(); render(); applyVolumes(); }
panel.addEventListener('click', e => {
  const t = e.target.closest('.snd-toggle'); if (!t) return;
  const ch = t.closest('.snd-row').dataset.ch, c = cfg();
  c[ch + 'On'] = !c[ch + 'On'];
  if (c[ch + 'On'] && !c[ch]) c[ch] = 50;
  unlock(); changed();
  if (ch === 'fx' && c.fxOn) play('right');
});
panel.addEventListener('input', e => {
  const ch = e.target.closest('.snd-row').dataset.ch, c = cfg();
  c[ch] = Number(e.target.value);
  if (c[ch] > 0) c[ch + 'On'] = true;
  changed();
});
// en provsmäll när man släpper effektreglaget, så man hör hur starkt det blir
panel.addEventListener('change', e => { if (e.target.closest('.snd-row').dataset.ch === 'fx') play('snap', { rate: 1.3 }); });

function place() {
  const r = btn.getBoundingClientRect(), w = panel.offsetWidth, m = 10;
  panel.style.top = Math.min(r.bottom + 8, innerHeight - panel.offsetHeight - m) + 'px';
  panel.style.left = Math.max(m, Math.min(r.right - w, innerWidth - w - m)) + 'px';
}
function open(on) {
  panel.hidden = !on; btn.setAttribute('aria-expanded', on); btn.classList.toggle('open', on);
  if (on) { render(); place(); }
}
btn.addEventListener('click', () => open(panel.hidden));
document.addEventListener('pointerdown', e => { if (!panel.hidden && !ctl.contains(e.target)) open(false); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) { open(false); btn.focus(); } });
addEventListener('resize', () => { if (!panel.hidden) place(); });

// Flyttar knappen till skärmens plats. Föräldravyn ritas om efter att den visats och anropar därför
// också den här (inställningarna kan då ha bytts genom en inläst säkerhetskopia).
export function dockSoundBtn(id) {
  open(false);
  const slot = $(`#${id} .snd-slot`);
  (slot || document.body).append(ctl);
  ctl.classList.toggle('floating', !slot);
  render(); applyVolumes();
}
onShow('*', dockSoundBtn);
render();
