/* ============ Ljud ============
   Web Audio: ljuden avkodas en gång och kan schemaläggas exakt (behövs för klick-rullningen).
   Webbläsare släpper bara fram ljud efter en tryckning, så kontexten skapas vid första pekningen. */
const FILES = { right: 'assets/sounds/right.wav', snap: 'assets/sounds/snap.wav' };
let ctx = null; const buf = {};
function unlock() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
  ctx = new AC();
  for (const [k, url] of Object.entries(FILES)) fetch(url).then(r => r.arrayBuffer()).then(a => ctx.decodeAudioData(a)).then(b => { buf[k] = b; }).catch(() => {});
}
['pointerdown', 'touchend', 'keydown'].forEach(ev => addEventListener(ev, unlock, { capture: true }));

// delay i ms från nu, rate = uppspelningshastighet (högre = ljusare ton)
function play(name, { delay = 0, rate = 1, vol = 1 } = {}) {
  const b = buf[name]; if (!ctx || !b || ctx.state !== 'running') return;
  const src = ctx.createBufferSource(); src.buffer = b; src.playbackRate.value = rate;
  const g = ctx.createGain(); g.gain.value = vol;
  src.connect(g).connect(ctx.destination);
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
