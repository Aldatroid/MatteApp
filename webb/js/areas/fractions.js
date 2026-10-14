/* ============ Uppgifter: bråk ============
   Lgr22, åk 4–6: rationella tal och deras egenskaper, del av helhet och del av antal, bråk på
   tallinjen, jämföra bråk och likvärdiga bråk. Figurerna ritas i 2D (staplar, cirklar, prickar
   och tallinje). Svaren är bråk som "3/4" (val) eller heltal (knappsats). */
import { rnd, pick, shuffle } from '../util.js';
import { FL, svgEl, flatText, beginFlat, setFlatBox, fracSvg } from '../three/flat.js';
import { kicker } from '../levels.js';

// Nivåer i ordning. kind = sorts uppgift; övriga fält styr svårigheten.
// parts = möjliga nämnare, group = hur många prickar per grupp (del av antal), choices = antal svarsalternativ.
const levels = [
  { kind: 'color', text: 'Hur stor del är färgad? Upp till 6 delar', parts: [2, 3, 4, 5, 6], choices: 3 },
  { kind: 'color', text: 'Färgad eller ofärgad del, upp till 12 delar', parts: [3, 4, 5, 6, 8, 10, 12], choices: 4, askOff: 0.4, scatter: true },
  { kind: 'of', text: 'Del av antal med täljaren 1, till exempel 1/4 av 12', parts: [2, 3, 4, 5], group: [2, 3, 4, 5], unitOnly: true },
  { kind: 'line', text: 'Bråk på tallinjen mellan 0 och 1', parts: [2, 3, 4, 5, 6, 8, 10], max: 1 },
  { kind: 'of', text: 'Del av antal, till exempel 3/4 av 12', parts: [3, 4, 5, 6], group: [2, 3, 4, 5] },
  { kind: 'compare', text: 'Jämföra bråk: vilket är störst?' },
  { kind: 'equiv', text: 'Likvärdiga bråk, till exempel 1/2 = 2/4', base: [2, 3, 4, 5], mult: [2, 3, 4] },
  { kind: 'line', text: 'Bråk större än 1 på tallinjen', parts: [2, 3, 4, 5], max: 2 },
];

// Bråk i text (frågor, svarsalternativ, förklaringar).
// after = skiljetecken direkt efter bråket; hålls ihop med bråket så att raden inte bryts emellan.
export const fracHtml = (a, b, after = '') => { const f = `<span class="frac"><span>${a}</span><span>${b}</span></span>`; return after ? `<span class="nw">${f}${after}</span>` : f; };
const fv = (a, b) => `${a}/${b}`;
const choice = v => { const [a, b] = v.split('/'); return { value: v, label: v, html: fracHtml(a, b) }; };

const area = {
  id: 'fractions', name: 'Bråk', short: 'Bråk', levels,
  gen(L, n) { return ({ color: genColor, of: genOf, line: genLine, compare: genCompare, equiv: genEquiv })[L.kind](L, n); },
  tags: {
    'brak-ofargad': 'Räknar ibland de ofärgade delarna i stället för de färgade (eller tvärtom) när bråket ska läsas av.',
    'brak-del-mot-del': 'Jämför färgade delar med ofärgade i stället för med hela figuren (till exempel 3/1 i stället för 3/4).',
    'brak-en-del': 'Räknar ut en del men glömmer att ta så många delar som täljaren säger (till exempel svarar 3 på 3/4 av 12).',
    'brak-tallinje-streck': 'Räknar strecken på tallinjen i stället för delarna mellan 0 och 1.',
    'brak-tallinje-hel': 'Räknar hela tallinjen som en hel när den går längre än till 1.',
    'brak-storre-namnare': 'Tror att ett bråk är större när nämnaren är större (till exempel att 1/5 är större än 1/3).',
    'brak-adderar': 'Lägger till samma tal i täljare och nämnare i stället för att multiplicera (till exempel 1/2 = 3/4).',
  },
};
export default area;
const task = (L, n, t) => ({ skill: 'fractions', level: n, kicker: kicker(area, n), remake: () => area.gen(L, n), ...t });

/* ----- Ritning ----- */
const SW = 0.06;
// Stapel med n lika delar; on = mängd med index för färgade delar.
function drawBar(parent, x, y, w, h, n, on = new Set()) {
  const pw = w / n;
  for (let i = 0; i < n; i++) svgEl('rect', { x: x + i * pw, y, width: pw, height: h, class: 'fr' + (on.has(i) ? ' on' : ''), 'stroke-width': SW }, parent);
}
// Cirkel med n lika sektorer, med början rakt upp.
function drawPie(parent, r, n, on = new Set()) {
  const pt = a => [r * Math.cos(a), r * Math.sin(a)].map(v => v.toFixed(4)).join(',');
  for (let i = 0; i < n; i++) {
    const a0 = -Math.PI / 2 + i * 2 * Math.PI / n, a1 = a0 + 2 * Math.PI / n;
    svgEl('path', { d: `M0,0 L${pt(a0)} A${r},${r} 0 ${n === 1 ? 1 : 0} 1 ${pt(a1)} Z`, class: 'fr' + (on.has(i) ? ' on' : ''), 'stroke-width': SW }, parent);
  }
}
const range = n => [...Array(n).keys()];
const firstK = k => new Set(range(k));

/* ----- Hur stor del är färgad? ----- */
function genColor(L, n) {
  const N = pick(L.parts), k = rnd(1, N - 1), off = Math.random() < (L.askOff || 0);
  const ans = off ? N - k : k;
  const on = L.scatter && Math.random() < 0.5 ? new Set(shuffle(range(N)).slice(0, k)) : firstK(k);
  const shape = N <= 8 && Math.random() < 0.5 ? 'pie' : 'bar';
  const correct = fv(ans, N);
  const cand = [fv(N - ans, N), N - ans > 0 ? fv(ans, N - ans) : null, fv(N, ans), fv(ans, N + 1), fv(Math.min(ans + 1, N), N)];
  const opts = [correct]; for (const c of shuffle(cand.filter(Boolean))) if (opts.length < L.choices && !opts.includes(c)) opts.push(c);
  const centers = () => shape === 'bar' ? range(N).map(i => [(i + 0.5) * 10 / N, 1.1]) : range(N).map(i => { const a = -Math.PI / 2 + (i + 0.5) * 2 * Math.PI / N; return [1.9 * Math.cos(a), 1.9 * Math.sin(a)]; });
  return task(L, n, {
    text: `Hur stor del av figuren är ${off ? '<b>inte</b> ' : ''}färgad?`, sub: 'Välj rätt bråk.',
    input: 'choice', choices: shuffle(opts).map(choice), answer: correct, describe: `${off ? 'Ofärgad' : 'Färgad'} del: ${correct}`,
    build() {
      beginFlat(0.9);
      if (shape === 'bar') { drawBar(FL.base, 0, 0, 10, 2.2, N, on); setFlatBox(-0.8, -1.2, 11.6, 6.6); }
      else { drawPie(FL.base, 3, N, on); setFlatBox(-6.3, -3.9, 12.6, 7.8); }
    },
    hint() {
      const s = Math.min(1, (shape === 'bar' ? 10 / N : 2.6) * 0.55 / FL.fs);
      centers().forEach(([x, y], i) => flatText(String(i + 1), x, y, { parent: FL.fx, size: s, cls: 'pop', delay: i * 120 }));
      return `Räkna alla delar: det blir nämnaren, talet under strecket. Räkna sedan de ${off ? 'ofärgade' : 'färgade'} delarna: det blir täljaren.`;
    },
    reveal(ok) {
      FL.fx.innerHTML = '';
      fracSvg(shape === 'bar' ? 5 : 4.9, shape === 'bar' ? 4.0 : 0, ans, N, { size: 1.2, cls: 'pop' });
      return { text: `${off ? 'Ofärgade' : 'Färgade'} delar: ${ans} av ${N}. Det är ${fracHtml(ans, N, '.')}`, auto: ok ? 2400 : 0 };
    },
    tag(g) { if (g === fv(N - ans, N) && N - ans !== ans) return 'brak-ofargad'; if (g === fv(ans, N - ans)) return 'brak-del-mot-del'; return null; },
  });
}

/* ----- Del av antal ----- */
function genOf(L, n) {
  const N = pick(L.parts), g = pick(L.group), m = N * g, k = L.unitOnly ? 1 : rnd(2, N - 1), ans = k * g;
  // Ogrupperat: rutnät med ett antal kolumner som går jämnt upp. Grupperat: N grupper bredvid varandra.
  const divs = range(m).map(i => i + 1).filter(d => m % d === 0);
  const cols = divs.reduce((b, d) => Math.abs(d - Math.sqrt(2 * m)) < Math.abs(b - Math.sqrt(2 * m)) ? d : b, 1), rows = m / cols;
  const gc = g <= 3 ? 1 : 2, gr = Math.ceil(g / gc), step = gc + 0.6, GW = N * gc + (N - 1) * 0.6;
  const W = Math.max(cols, GW), H = Math.max(rows, gr);
  function draw(grouped, colored = 0, counts = false) {
    FL.base.innerHTML = ''; FL.fx.innerHTML = '';
    if (!grouped) { range(m).forEach(i => svgEl('circle', { cx: (i % cols) - (cols - 1) / 2, cy: Math.floor(i / cols) - (rows - 1) / 2, r: 0.3, class: 'dot' }, FL.base)); return; }
    for (let j = 0; j < N; j++) {
      const ox = -GW / 2 + j * step, oy = -gr / 2;
      svgEl('rect', { x: ox - 0.08, y: oy - 0.08, width: gc + 0.16, height: gr + 0.16, rx: 0.3, class: 'grp' + (j < colored ? ' on' : ''), 'stroke-width': SW }, FL.base);
      range(g).forEach(i => svgEl('circle', { cx: ox + (i % gc) + 0.5, cy: oy + Math.floor(i / gc) + 0.5, r: 0.3, class: 'dot' + (j < colored ? ' on' : '') }, FL.base));
      if (counts && j < colored) flatText(String(g), ox + gc / 2, gr / 2 + 0.85, { parent: FL.fx, size: 0.9, cls: 'pop', delay: 200 + j * 250 });
    }
  }
  return task(L, n, {
    text: `Hur mycket är ${fracHtml(k, N)} av ${m}?`, sub: `Prickarna visar de ${m}.`,
    input: 'num', answer: ans, describe: `${k}/${N} av ${m}`,
    build() { beginFlat(0.7); draw(false); setFlatBox(-W / 2 - 0.9, -H / 2 - 0.9, W + 1.8, H + 2.9); },
    hint() {
      draw(true);
      return `Dela upp de ${m} prickarna i ${N} lika stora grupper. Hur många blir det i varje grupp?${k > 1 ? ` Ta sedan ${k} sådana grupper.` : ''}`;
    },
    reveal(ok) {
      draw(true, k, true);
      const txt = `${m} delat i ${N} lika stora grupper blir ${g} i varje. ` + (k === 1 ? `${fracHtml(1, N)} av ${m} är <b>${g}</b>.` : `${fracHtml(k, N)} av ${m} är ${k} grupper: ${k} · ${g} = <b>${ans}</b>.`);
      return { text: txt, auto: ok ? 2600 : 0 };
    },
    tag(v) { v = Number(v); if (k > 1 && v === g) return 'brak-en-del'; return null; },
  });
}

/* ----- Tallinjen ----- */
function genLine(L, n) {
  const max = L.max, N = pick(L.parts);
  let k; do { k = max === 1 ? rnd(1, N - 1) : rnd(N + 1, 2 * N - 1); } while (k % N === 0);
  const U = 10 / max, xa = k * U / N, correct = fv(k, N);
  const cand = [fv(k, N + 1), fv(k, N - 1), fv(k + 1, N), fv(k - 1, N), max === 2 ? fv(k, 2 * N) : null, max === 2 ? fv(k - N, N) : null].filter(c => c && !/(^0\/)|(\/[01]$)/.test(c));
  const opts = [correct]; for (const c of shuffle(cand)) if (opts.length < 4 && !opts.includes(c)) opts.push(c);
  return task(L, n, {
    text: 'Vilket bråk pekar pilen på?', sub: max === 1 ? 'Sträckan från 0 till 1 är en hel.' : 'Sträckan från 0 till 1 är en hel, och från 1 till 2 är en hel till.',
    input: 'choice', choices: shuffle(opts).map(choice), answer: correct, describe: `Tallinje: ${correct}`,
    build() {
      beginFlat(0.85);
      svgEl('line', { x1: 0, y1: 0, x2: 10, y2: 0, class: 'nl', 'stroke-width': 0.09 }, FL.base);
      for (let i = 0; i <= max * N; i++) {
        const x = i * U / N, whole = i % N === 0, h = whole ? 0.5 : 0.3;
        svgEl('line', { x1: x, y1: -h, x2: x, y2: h, class: 'nl', 'stroke-width': whole ? 0.09 : 0.06 }, FL.base);
        if (whole) flatText(String(i / N), x, 1.2, { parent: FL.base });
      }
      svgEl('line', { x1: xa, y1: -1.0, x2: xa, y2: -1.9, class: 'nl arrow-stem', 'stroke-width': 0.12 }, FL.base);
      svgEl('polygon', { points: `${xa},-0.4 ${xa - 0.38},-1.1 ${xa + 0.38},-1.1`, class: 'arrow' }, FL.base);
      setFlatBox(-1, -4.4, 12, 6.6);
    },
    hint() {
      for (let i = 0; i < max * N; i++) svgEl('line', { x1: i * U / N, y1: 0, x2: (i + 1) * U / N, y2: 0, class: 'nl ' + (i % 2 ? 'segB' : 'segA'), 'stroke-width': 0.2 }, FL.fx);
      return 'Räkna hur många lika stora delar det är mellan 0 och 1: det blir nämnaren. Räkna sedan stegen från 0 fram till pilen: det blir täljaren.';
    },
    reveal(ok) {
      FL.fx.innerHTML = '';
      const p = svgEl('path', { d: `M0,0L${xa},0`, pathLength: 1, class: 'trace', 'stroke-width': 0.22 }, FL.fx); p.style.animationDuration = '.8s';
      fracSvg(xa, -3.1, k, N, { size: 1.1, cls: 'pop' });
      const more = k > N ? ` Det är mer än en hel: 1 hel och ${fracHtml(k - N, N)} till.` : '';
      return { text: `Mellan 0 och 1 finns ${N} lika stora delar, så varje steg är ${fracHtml(1, N, '.')} Pilen är ${k} steg från 0: ${fracHtml(k, N, '.')}${more}`, auto: ok ? 2800 : 0 };
    },
    tag(g) { if (g === fv(k, N + 1) || g === fv(k, N - 1)) return 'brak-tallinje-streck'; if (max === 2 && g === fv(k, 2 * N)) return 'brak-tallinje-hel'; return null; },
  });
}

/* ----- Jämföra bråk ----- */
function genCompare(L, n) {
  const r = Math.random(); let A, B, kind;
  if (r < 0.15) { kind = 'equal'; const N = pick([2, 3, 4, 5, 6]), k = rnd(1, N - 1); [A, B] = shuffle([[k, N], [2 * k, 2 * N]]); }
  else if (r < 0.55) { kind = 'den'; const N = rnd(3, 10); const [k1, k2] = shuffle(range(N - 1).map(i => i + 1)).slice(0, 2); A = [k1, N]; B = [k2, N]; }
  else { kind = 'num'; const k = rnd(1, 3); const [n1, n2] = shuffle(range(10 - k).map(i => i + k + 1)).slice(0, 2); A = [k, n1]; B = [k, n2]; }
  const cmp = A[0] * B[1] - B[0] * A[1], answer = cmp === 0 ? 'lika' : fv(...(cmp > 0 ? A : B));
  const choices = [choice(fv(...A)), choice(fv(...B)), { value: 'lika', label: 'Lika stora' }];
  function draw(colored, win = null) {
    FL.base.innerHTML = '';
    [A, B].forEach(([a, b], i) => {
      const y = i * 2.4;
      drawBar(FL.base, 0, y, 10, 1.4, b, colored ? firstK(a) : new Set());
      if (win === i || win === 'both') svgEl('rect', { x: -0.12, y: y - 0.12, width: 10.24, height: 1.64, class: 'win', 'stroke-width': 0.14, rx: 0.1 }, FL.base);
      fracSvg(-1.4, y + 0.7, a, b, { parent: FL.base });
    });
  }
  const why = kind === 'den' ? `Båda är delade i ${A[1]} lika stora delar, så det bråk som har flest delar är störst.`
    : kind === 'num' ? `Båda har ${A[0]} ${A[0] === 1 ? 'del' : 'delar'}. Ju fler delar en hel delas i, desto mindre blir varje del, så ${fracHtml(...(A[1] < B[1] ? A : B))} är störst.`
      : `${fracHtml(...A)} och ${fracHtml(...B)} täcker lika mycket av stapeln. De är lika stora.`;
  return task(L, n, {
    text: 'Vilket bråk är störst?', sub: 'Staplarna är lika långa.',
    input: 'choice', choices, answer, describe: `Jämför ${fv(...A)} och ${fv(...B)}`,
    build() { beginFlat(0.85); draw(false); setFlatBox(-2.8, -0.9, 13.6, 5.4); },
    hint() {
      draw(true);
      return kind === 'den' ? 'Båda staplarna är delade i lika många delar. Vilken har flest färgade delar?'
        : kind === 'num' ? 'Båda har lika många färgade delar. Titta på hur stora delarna är. Ju fler delar en hel delas i, desto mindre blir delarna.'
          : 'Jämför hur långt det färgade räcker i båda staplarna.';
    },
    reveal(ok) { draw(true, cmp === 0 ? 'both' : cmp > 0 ? 0 : 1); return { text: why, auto: ok ? 2800 : 0 }; },
    tag(g) { if (kind === 'num' && g !== 'lika') { const [, b] = g.split('/').map(Number); if (b === Math.max(A[1], B[1])) return 'brak-storre-namnare'; } return null; },
  });
}

/* ----- Likvärdiga bråk ----- */
function genEquiv(L, n) {
  const b = pick(L.base), a = rnd(1, b - 1), m = pick(L.mult), d = b * m, ans = a * m;
  function draw(colored) {
    FL.base.innerHTML = '';
    drawBar(FL.base, 0, 0, 10, 1.4, b, firstK(a));
    drawBar(FL.base, 0, 2.4, 10, 1.4, d, colored ? firstK(ans) : new Set());
    fracSvg(-1.4, 0.7, a, b, { parent: FL.base });
    fracSvg(-1.4, 3.1, colored ? ans : '?', d, { parent: FL.base });
  }
  return task(L, n, {
    text: `${fracHtml(a, b)} = <span class="frac"><span><span class="slot">?</span></span><span>${d}</span></span>`, big: true, inlineSlot: true,
    sub: 'Båda bråken ska vara lika stora.',
    input: 'num', answer: ans, describe: `${a}/${b} = ?/${d}`,
    build() { beginFlat(0.85); draw(false); setFlatBox(-2.8, -0.9, 13.6, 5.4); },
    hint() {
      for (let j = 1; j < b; j++) svgEl('line', { x1: j * 10 / b, y1: 2.2, x2: j * 10 / b, y2: 4.0, class: 'nl segA', 'stroke-width': 0.16 }, FL.fx);
      return `Varje del i den övre stapeln motsvarar ${m} delar i den nedre. Hur många delar blir det färgade?`;
    },
    reveal(ok) {
      FL.fx.innerHTML = ''; draw(true);
      return { text: `${fracHtml(a, b)} = ${fracHtml(ans, d, '.')} Nämnaren blev ${m} gånger större (${b} · ${m} = ${d}), så täljaren blir också ${m} gånger större: ${a} · ${m} = <b>${ans}</b>.`, auto: ok ? 3000 : 0 };
    },
    tag(v) { v = Number(v); if (v === a + (d - b) && v !== ans) return 'brak-adderar'; return null; },
  });
}
