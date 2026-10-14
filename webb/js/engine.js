/* ============ Spelmotor ============ */
import { $, $$, pick, esc, clamp, fmtMin, weightedIndex, show, onShow } from './util.js';
import { S, save, today } from './store.js';
import { has3D, world, resize, clearScene, startLoop, stopLoop } from './three/scene.js';
import { areaById, leveledAreas, passAreas } from './curriculum.js';
import { currentLevel, levelState, updateLevel } from './levels.js';
import { countGood } from './areas/mul.js';
import { asset } from './themes.js';
import { playRight } from './sound.js';

export let run = null;
const RIGHT = ['Rätt!', 'Snyggt!', 'Precis!', 'Ja!', 'Bra!', 'Klockrent!'];
onShow('*', id => { if (id === 'play') startLoop(); else { stopLoop(); mascotHide(); setLevelBg(null); } });
export function tick() {
  if (!run) return;
  const now = Date.now(); const d = Math.min(now - run.lastTick, 60000);
  run.activeMs += d; run.lastTick = now; today().ms += d;
}

// mode: 'pass' (dagens pass), 'free' (Utforska: cfg.area = områdes-id eller 'mix') eller 'sandbox'.
export function startRun(mode, cfg = {}) {
  run = { mode, cfg, start: Date.now(), lastTick: Date.now(), activeMs: 0, n: 0, right: 0, first: 0, queue: [], recentKeys: [], lastArea: null, areaRun: 0, counts: {}, levelUps: [], goodBefore: countGood(), task: null, phase: 'ask', durMs: S.settings.passMin * 60000, hintUsed: false, input: '' };
  show('play'); resize();
  $('#exitBtn').textContent = mode === 'pass' ? 'Avsluta' : 'Klar';
  $('#progress').hidden = mode !== 'pass';
  $('#countTxt').hidden = mode === 'pass';
  $('#hintBtn').hidden = false;
  nextTask();
}
export function startSandboxRun(kind) {
  run = { mode: 'sandbox', cfg: { kind }, start: Date.now(), lastTick: Date.now(), activeMs: 0, n: 0, right: 0, queue: [], recentKeys: [], levelUps: [], task: null, phase: 'none' };
  show('play'); resize();
  $('#exitBtn').textContent = 'Tillbaka';
  $('#progress').hidden = true; $('#countTxt').hidden = true; $('#hintBtn').hidden = true;
  clearScene(); if (has3D) world.position.set(0, 0, 0);
}

/* Val av område. Föräldern väljer områden och vikter (curriculum.js + föräldraläget).
   Samma område ska inte komma för många gånger i rad (maxRun/repeat i områdets modul). Det rubbar
   fördelningen, så vikten justeras också efter hur stor andel området hittills fått i passet:
   ligger det efter sin andel kommer det oftare. Då stämmer "ca X % av passet" i föräldraläget. */
function pickArea(list) {
  const sum = list.reduce((s, x) => s + x.w, 0), done = run.counts, n = Object.values(done).reduce((a, b) => a + b, 0);
  const ws = list.map(({ area, w }) => {
    const share = w / sum; let x = w;
    if (n) x *= clamp(1 + 4 * (share - (done[area.id] || 0) / n), 0.15, 4);
    // Ett område med stor andel måste få komma fler gånger i rad, annars kan andelen inte nås.
    const maxRun = share < 1 ? Math.max(area.maxRun ?? 3, Math.ceil(share / (1 - share)) + 1) : Infinity;
    if (area.id === run.lastArea) x *= run.areaRun >= maxRun ? 0 : (area.repeat ?? 0.5);
    return x;
  });
  let i = weightedIndex(ws); if (i < 0) i = weightedIndex(list.map(x => x.w));
  return list[Math.max(0, i)].area;
}
function chooseArea() {
  if (run.mode === 'pass') return pickArea(passAreas());
  if (run.cfg.area === 'mix') return pickArea(leveledAreas().map(area => ({ area, w: 1 })));
  return areaById(run.cfg.area);
}
function makeTask() {
  const area = chooseArea();
  if (area.id === run.lastArea) run.areaRun++; else { run.lastArea = area.id; run.areaRun = 1; }
  run.counts[area.id] = (run.counts[area.id] || 0) + 1;
  if (area.next) return area.next(run, run.cfg);
  const { L, n } = currentLevel(area);
  return area.gen(L, n);
}
function takeQueued() {
  run.queue.forEach(q => q.due--);
  const i = run.queue.findIndex(q => q.due <= 0);
  return i >= 0 ? run.queue.splice(i, 1)[0].make() : null;
}
/* Banor i dagens pass: bakgrunden visar hur långt man kommit.
   PROGRESS-bilderna delar på passets tid. När tiden är slut kommer DOOR_TASKS uppgifter vid dörren
   och sist FINAL_TASKS uppgifter i det sista rummet, sedan sammanfattningen. */
const LEVELS = { progress: ['progress1', 'progress2', 'progress3'], door: 'door', final: 'final' };
const DOOR_TASKS = 1, FINAL_TASKS = 1;
let levelShown = null, levelLayer = 0;
function setLevelBg(key) {
  if (key === levelShown) return;
  levelShown = key;
  const layers = $$('#stage .lvl-bg');
  if (!key) { layers.forEach(l => l.classList.remove('on')); return; }
  levelLayer = 1 - levelLayer;
  const next = layers[levelLayer], prev = layers[1 - levelLayer];
  next.style.backgroundImage = `url(${asset(`levels/${key}.jpg`)})`;
  next.classList.add('on'); prev.classList.remove('on');
}
function passStage() {
  if (run.ending) return run.endLeft >= FINAL_TASKS ? 'door' : 'final';
  const p = Math.min(0.999, run.activeMs / run.durMs);
  return LEVELS.progress[Math.floor(p * LEVELS.progress.length)];
}
export function nextTask() {
  if (!run) return;
  tick();
  if (run.mode === 'pass') {
    if (!run.ending && run.activeMs >= run.durMs && run.n >= 5) { run.ending = true; run.endLeft = DOOR_TASKS + FINAL_TASKS; }
    if (run.ending) { if (run.endLeft <= 0) return finishRun(); run.endLeft--; }
    const stage = passStage(), was = levelShown;
    setLevelBg(stage);
    if (stage !== was && stage === 'door') setTimeout(() => mascotPop('Du har hittat dörren! Klara den här så öppnas den.', 3200), 500);
    if (stage !== was && stage === 'final') setTimeout(() => mascotPop('Du är inne i det hemliga rummet! Sista uppgiften!', 3200), 500);
  }
  const t = takeQueued() || makeTask();
  run.task = t; run.phase = 'ask'; run.hintUsed = false; run.input = ''; run.attempt = 1; run.firstGiven = null;
  clearScene();
  if (has3D) world.position.set(0, 0, 0);
  t.build();
  renderTask(t);
  updateTopbar();
  run.shownAt = Date.now();
}
function updateTopbar() {
  if (!run) return;
  if (run.mode === 'pass') $('#progress i').style.width = (run.ending ? 100 : Math.min(100, (run.activeMs + Math.min(Date.now() - run.lastTick, 60000)) / run.durMs * 100)) + '%';
  else $('#countTxt').textContent = `${run.n} gjorda · ${run.right} rätt`;
}
setInterval(() => { if (run && run.mode === 'pass' && !$('#play').hidden) updateTopbar(); }, 1000);

export function keypad(container, onDigit, onDel, onOk) {
  container.innerHTML = `<div class="keypad">${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `<button class="key" data-k="${n}">${n}</button>`).join('')}<button class="key del" data-k="del" aria-label="Sudda"></button><button class="key" data-k="0">0</button><button class="key ok" data-k="ok" aria-label="OK"></button></div>`;
  container.querySelectorAll('.key').forEach(b => b.addEventListener('click', () => { const k = b.dataset.k; if (k === 'del') onDel(); else if (k === 'ok') onOk(); else onDigit(k); }));
}
function renderTask(t) {
  mascotHide();
  const body = $('#panelBody');
  const slotRow = t.input === 'num' && !t.inlineSlot ? `<div class="q-answer"><span class="slot">?</span>${t.unit ? `<span class="unit">${esc(t.unit)}</span>` : ''}</div>` : '';
  body.innerHTML = `<div class="task-layout"><div class="q-area"><div class="q-kicker">${esc(t.kicker)}</div><div class="q-text${t.big ? ' big' : ''}">${t.text}</div>${slotRow}${t.sub ? `<p class="q-sub">${esc(t.sub)}</p>` : ''}</div><div class="spacer"></div><div class="input-area" id="inputArea"></div></div>`;
  const ia = $('#inputArea');
  ia.classList.toggle('num', t.input === 'num'); ia.classList.toggle('custom', t.input === 'custom');
  if (t.input === 'num') keypad(ia, d => { if (run.phase !== 'ask' || run.input.length >= 4) return; run.input = (run.input === '0' ? '' : run.input) + d; updateSlot(); }, () => { if (run.phase !== 'ask') return; run.input = run.input.slice(0, -1); updateSlot(); }, submit);
  // custom: området ritar egen inmatning (t.ex. rutor att trycka på) och skickar svaret med answer(värde)
  else if (t.input === 'custom') t.renderInput(ia, v => { if (run.phase === 'ask') handleAnswer(v); });
  else {
    ia.innerHTML = `<div class="choices">${t.choices.map(c => `<button class="choice" data-v="${esc(c.value)}" aria-label="${esc(c.label)}">${c.html ?? esc(c.label)}</button>`).join('')}</div>`;
    ia.querySelectorAll('.choice').forEach(b => b.addEventListener('click', () => { if (run.phase === 'ask') handleAnswer(b.dataset.v, b); }));
  }
  const hb = $('#hintBtn'); hb.disabled = !t.hint;
}
function updateSlot() { const s = $('.slot'); if (!s) return; s.textContent = run.input || '?'; s.classList.toggle('filled', !!run.input); }
function submit() { if (!run || run.phase !== 'ask' || !run.input) return; handleAnswer(Number(run.input)); }
/* Maskoten Dino poppar upp vid rätt-i-rad, ny nivå och comebacks */
const MASCOT = {
  streak: ['{n} rätt i rad! Du är grym!', '{n} i rad! Vilken fart!', 'Wow, {n} rätt i rad!', '{n} i rad! Fossilsnabbt!'],
  level: ['Ny nivå! Nu blir det lite klurigare.', 'Du klättrade upp en nivå!', 'Nivå upp! Bra jobbat!'],
  retry: ['Snyggt att du klurade ut det!', 'Där satt den!', 'Bra kämpat!'],
};
// All återkoppling (rätt/fel, förklaringar, tips, pepp) visas av maskoten i 3D-vyn.
// kind: ok | no | tip | pop styr bubblans färg. ms > 0 = försvinn efter så lång tid.
let mascotTimer = 0;
export function say(html, kind = '', ms = 0) {
  const m = $('#mascot'), fb = $('#fb'); if (!m || !fb) return;
  clearTimeout(mascotTimer);
  fb.className = 'feedback ' + kind; fb.innerHTML = html; m.dataset.kind = kind;
  $('#stageHint').style.opacity = 0;
  const wasHidden = m.hidden;
  m.hidden = false; m.classList.remove('out', 'show', 'nudge'); void m.offsetWidth; m.classList.add(wasHidden ? 'show' : 'nudge');
  if (ms) mascotTimer = setTimeout(() => mascotHide(true), ms);
}
function mascotPop(text, ms = 2800) { say(esc(text), 'pop', ms); }
function mascotHide(animated = false) {
  clearTimeout(mascotTimer); const m = $('#mascot'), fb = $('#fb'); if (!m) return;
  const done = () => { m.hidden = true; m.classList.remove('show', 'out', 'nudge'); if (fb) fb.innerHTML = ''; };
  if (animated && !m.hidden) { m.classList.remove('show', 'nudge'); m.classList.add('out'); mascotTimer = setTimeout(done, 360); } else done();
}
const canRetry = t => t.input === 'num' || t.input === 'custom' || (t.choices && t.choices.length >= 3);
function handleAnswer(value, btn) {
  const t = run.task; tick();
  const ok = String(value) === String(t.answer);
  const tag = !ok && t.tag ? t.tag(value) : null;
  if (!ok && run.attempt === 1 && canRetry(t)) {
    // Första felet: nytt försök med ett tips, inte svaret.
    run.attempt = 2; run.firstGiven = value;
    if (tag) addTag(tag);
    let extra = '';
    if (t.hint && !run.hintUsed) { run.hintUsed = true; extra = t.hint(); $('#hintBtn').disabled = true; }
    say(`<strong>Inte riktigt.</strong> Försök en gång till!${extra ? `<br><strong>Tips:</strong> ${extra}` : ''}`, 'no');
    if (t.input === 'num') { run.input = ''; const s = $('.slot'); s.textContent = '?'; s.classList.remove('filled', 'shake'); void s.offsetWidth; s.classList.add('shake'); }
    else if (btn) { btn.classList.add('no'); btn.disabled = true; }
    return;
  }
  const ms = Math.min(Date.now() - run.shownAt, 60000);
  const first = ok && run.attempt === 1;
  const change = record(t, ok, first, ms, tag, value);
  run.n++; if (ok) run.right++; if (first) run.first++;
  run.streak = first ? (run.streak || 0) + 1 : 0;
  if (ok) playRight();
  if (ok && t.input === 'num') ($('.q-answer') || $('.q-text'))?.classList.add('glow');
  // pepp läggs till i samma bubbla som återkopplingen
  const cheer = change > 0 ? pick(MASCOT.level) : [3, 6, 10, 15, 20, 30].includes(run.streak) ? pick(MASCOT.streak).replace('{n}', run.streak) : (ok && !first) ? pick(MASCOT.retry) : '';
  run.phase = 'reveal';
  $('#hintBtn').disabled = true;
  const slot = $('.slot');
  if (slot) { slot.classList.add(ok ? 'ok' : 'no'); if (!ok) slot.insertAdjacentHTML('afterend', ` <span class="slot ok">${esc(t.answer)}</span>`); }
  if (t.input === 'choice') $$('.choice').forEach(b => { if (b.dataset.v === String(t.answer)) b.classList.add('ok'); else if (b === btn) b.classList.add('no'); b.disabled = true; });
  const r = t.reveal(ok) || {};
  say(`<strong>${ok ? (first ? pick(RIGHT) : 'Rätt på andra försöket!') : 'Inte riktigt.'}</strong> ${r.text || ''}${change > 0 ? `<span class="lvl">Ny nivå i ${esc(areaById(t.skill).name.toLowerCase())}!</span>` : cheer ? `<span class="lvl">${esc(cheer)}</span>` : ''}`, ok ? 'ok' : 'no');
  if (!first && t.remake) run.queue.push({ make: t.remake, due: 3 });
  const ia = $('#inputArea');
  ia.classList.add('revealed');
  ia.insertAdjacentHTML('beforeend', `<button class="next-btn" id="nextBtn">Nästa</button>`);
  $('#nextBtn').addEventListener('click', () => { if (run && run.task === t) nextTask(); });
  updateTopbar();
}
function addTag(tag) { const x = S.tags[tag] ||= { n: 0, last: 0 }; x.n++; x.last = Date.now(); }
// Sparar svaret i loggen och låter området uppdatera sin nivå (eller tabellernas lådor).
function record(t, ok, first, ms, tag, given) {
  const now = Date.now(); const d = today(); d.n++; if (first) d.right++;
  const entry = { t: now, s: t.skill, q: t.describe, g: String(given), a: String(t.answer), ok, ms, h: run.hintUsed ? 1 : 0 };
  if (run.firstGiven != null) entry.g1 = String(run.firstGiven);
  S.log.push(entry);
  if (S.log.length > 300) S.log.splice(0, S.log.length - 300);
  if (tag) addTag(tag);
  const area = areaById(t.skill); let change = 0;
  if (area.record) area.record(t, { ok, first, ms, hint: run.hintUsed });
  else if (area.levels) {
    change = updateLevel(area, ok ? (first && !run.hintUsed ? 1 : 0.5) : 0);
    if (change > 0) run.levelUps.push({ id: area.id, level: levelState(area).level });
  }
  save(); return change;
}
export function finishRun() {
  if (!run) return;
  tick();
  const r = run; run = null;
  if (r.n > 0 || r.activeMs > 20000) { S.sessions.push({ start: r.start, ms: r.activeMs, n: r.n, right: r.right, mode: r.mode, kind: r.cfg.kind || r.cfg.area || '' }); if (S.sessions.length > 200) S.sessions.shift(); }
  if (r.mode === 'pass' && r.activeMs >= r.durMs * 0.8) today().pass = true;
  save(); clearScene();
  if (r.mode === 'pass' && r.n > 0) showSummary(r);
  else show(r.mode === 'pass' ? 'home' : 'free');
}
function showSummary(r) {
  const full = r.activeMs >= r.durMs * 0.8;
  $('#sumTitle').textContent = r.ending ? 'Du hittade det hemliga rummet!' : full ? 'Bra jobbat!' : 'Bra kämpat!';
  $('#sumLead').textContent = `Du gjorde ${r.n} ${r.n === 1 ? 'uppgift' : 'uppgifter'} på ${fmtMin(r.activeMs)}.`;
  const good = countGood(), diff = good - r.goodBefore;
  $('#sumStats').innerHTML = `<div class="stat"><b>${r.right} av ${r.n}</b><span>rätt svar${r.right > r.first ? `, varav ${r.first} på första försöket` : ''}</span></div><div class="stat"><b>${good}</b><span>gångertal som sitter${diff > 0 ? ` (+${diff} idag)` : ''}</span></div>`;
  $('#sumNotes').innerHTML = r.levelUps.map(u => `<li>Ny nivå i ${esc(areaById(u.id).name.toLowerCase())}: nivå ${u.level}</li>`).join('') + `<li>Vill du fortsätta? När du utforskar finns ingen klocka.</li>`;
  show('summary');
}

/* Knappar och tangentbord under spel */
$('#exitBtn').addEventListener('click', () => finishRun());
$('#hintBtn').addEventListener('click', () => {
  if (!run || run.phase !== 'ask' || run.hintUsed || !run.task?.hint) return;
  run.hintUsed = true; const txt = run.task.hint();
  say(`<strong>Tips:</strong> ${txt}`, 'tip');
  $('#hintBtn').disabled = true;
});
document.addEventListener('keydown', e => {
  if ($('#play').hidden || !run || !run.task) return;
  if (run.phase === 'reveal' && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); nextTask(); return; }
  if (run.phase !== 'ask' || run.task.input !== 'num') return;
  if (/^[0-9]$/.test(e.key) && run.input.length < 4) { run.input = (run.input === '0' ? '' : run.input) + e.key; updateSlot(); }
  else if (e.key === 'Backspace') { run.input = run.input.slice(0, -1); updateSlot(); }
  else if (e.key === 'Enter') submit();
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { tick(); save(); }
  else if (run) run.lastTick = Date.now();
});
