/* ============ Uppgifter: längd ============
   Lgr22, åk 4–6: mätning av längd, enheter och enhetsbyten, även med tal i decimalform.
   Bilden är enhetstrappan (mil, km, m, dm, cm, mm) med faktorn mellan varje steg.
   Alla längder räknas internt i millimeter (heltal), så att decimaler aldrig avrundas fel. */
import { rnd, pick, shuffle } from '../util.js';
import { FL, svgEl, flatText, beginFlat, setFlatBox } from '../three/flat.js';
import { kicker } from '../levels.js';

const UNITS = ['mil', 'km', 'm', 'dm', 'cm', 'mm'];
const MM = { mil: 10000000, km: 1000000, m: 1000, dm: 100, cm: 10, mm: 1 };
// faktor mellan ett steg och nästa steg nedåt i trappan
const STEP = { mil: 10, km: 1000, m: 10, dm: 10, cm: 10 };

// Nivåer i ordning. pairs = [från, till]; dec = antal decimaler i talet man utgår från;
// kind: 'conv' = byt enhet (svar med knappsats), 'mixed' = t.ex. 2 m 35 cm, 'todec' = svar i decimalform (val),
// 'compare' = vilken sträcka är längst (val).
const levels = [
  { kind: 'conv', text: 'Byta till mindre enhet: m, dm, cm, mm', pairs: [['m', 'cm'], ['cm', 'mm'], ['dm', 'cm'], ['m', 'dm'], ['dm', 'mm']], dec: 0 },
  { kind: 'conv', text: 'Byta åt båda hållen: m, dm, cm, mm', pairs: [['m', 'cm'], ['cm', 'mm'], ['cm', 'm'], ['mm', 'cm'], ['dm', 'cm'], ['cm', 'dm'], ['m', 'mm']], dec: 0 },
  { kind: 'conv', text: 'Kilometer och mil', pairs: [['km', 'm'], ['m', 'km'], ['mil', 'km'], ['km', 'mil']], dec: 0 },
  { kind: 'conv', text: 'Tal i decimalform, till exempel 1,5 m = 150 cm', pairs: [['m', 'cm'], ['cm', 'mm'], ['km', 'm'], ['mil', 'km'], ['m', 'mm'], ['dm', 'cm']], dec: 1 },
  { kind: 'mixed', text: 'Två enheter, till exempel 2 m 35 cm = 235 cm', pairs: [['m', 'cm'], ['cm', 'mm'], ['km', 'm'], ['m', 'dm']] },
  { kind: 'todec', text: 'Svara i decimalform, till exempel 250 cm = 2,5 m', pairs: [['cm', 'm'], ['mm', 'cm'], ['m', 'km'], ['km', 'mil'], ['dm', 'm']] },
  { kind: 'compare', text: 'Jämföra längder i olika enheter' },
];

// Tal med decimalkomma och mellanrum som tusentalsavgränsare (från 10 000).
export const fmtNum = n => { const [i, d] = String(n).split('.'); const ii = i.length > 4 ? i.replace(/\B(?=(\d{3})+(?!\d))/g, ' ') : i; return d ? `${ii},${d}` : ii; };
// Längd i mm uttryckt i en enhet (exakt, utan flyttalsfel).
const inUnit = (mm, u) => { const f = MM[u], w = Math.floor(mm / f), r = mm % f; if (!r) return String(w); const d = String(r).padStart(String(f).length - 1, '0').replace(/0+$/, ''); return `${w}.${d}`; };
const factorText = (a, b) => { const f = MM[a] / MM[b]; return f >= 1 ? `· ${fmtNum(f)}` : `/ ${fmtNum(1 / f)}`; };

const area = {
  id: 'length', name: 'Längd och enheter', short: 'Längd', levels,
  gen(L, n) { return ({ conv: genConv, mixed: genMixed, todec: genToDec, compare: genCompare })[L.kind](L, n); },
  tags: {
    'langd-faktor': 'Blandar ihop hur många steg det är mellan enheterna (till exempel 3 m = 30 cm i stället för 300 cm).',
    'langd-riktning': 'Multiplicerar när det ska delas, eller tvärtom, vid byte av enhet.',
    'langd-blandat': 'Lägger ihop talen utan att byta enhet först (till exempel 2 m 35 cm = 37 cm).',
  },
};
export default area;
const task = (L, n, t) => ({ skill: 'length', level: n, kicker: kicker(area, n), remake: () => area.gen(L, n), ...t });

/* ----- Enhetstrappan ----- */
const SW = 2.2, SH = 1.15;
function drawStairs(from, to) {
  beginFlat(0.62);
  // från = guld, till = blå
  UNITS.forEach((u, i) => {
    const x = i * SW, y = i * SH;
    svgEl('rect', { x, y, width: SW - 0.12, height: SH - 0.12, rx: 0.18, class: 'fr' + (u === from ? ' on' : u === to ? ' to' : ''), 'stroke-width': 0.05 }, FL.base);
    flatText(u, x + (SW - 0.12) / 2, y + (SH - 0.12) / 2, { parent: FL.base, size: 1.15 });
    if (i < UNITS.length - 1) flatText(`· ${fmtNum(STEP[u])}`, x + SW + 0.25, y + SH * 0.45, { parent: FL.base, size: 0.8, anchor: 'start', cls: 'step' });
  });
  setFlatBox(-0.6, -0.8, UNITS.length * SW + 2.6, UNITS.length * SH + 1.6);
}
// Markera stegen mellan enheterna och skriv ut den sammanlagda faktorn.
function showPath(from, to, delay = 0) {
  const i0 = UNITS.indexOf(from), i1 = UNITS.indexOf(to), lo = Math.min(i0, i1), hi = Math.max(i0, i1);
  for (let i = lo; i < hi; i++) {
    const x = (i + 1) * SW - 0.06, y0 = i * SH + SH - 0.12, y1 = (i + 1) * SH;
    const p = svgEl('path', { d: `M${x - SW * 0.5},${y0 - 0.05} L${x - SW * 0.5},${y1 + 0.2} L${x + 0.25},${y1 + 0.2}`, pathLength: 1, class: 'trace', 'stroke-width': 0.09, fill: 'none' }, FL.fx);
    p.style.animationDelay = (delay + (i - lo) * 350) + 'ms';
  }
  const f = MM[from] / MM[to], txt = f >= 1 ? `nedåt: · ${fmtNum(f)}` : `uppåt: / ${fmtNum(1 / f)}`;
  flatText(txt, 0, UNITS.length * SH + 0.35, { parent: FL.fx, size: 1, anchor: 'start', cls: 'pop hl', delay: delay + (hi - lo) * 350 });
}
const stairsHint = (a, b) => {
  const down = MM[a] > MM[b], steps = Math.abs(UNITS.indexOf(a) - UNITS.indexOf(b));
  return `Gå från ${a} till ${b} i trappan: ${steps} steg ${down ? 'nedåt. Nedåt blir talet större, så multiplicera' : 'uppåt. Uppåt blir talet mindre, så dela'} med ${fmtNum(down ? MM[a] / MM[b] : MM[b] / MM[a])}.`;
};

// Ett värde i enheten u med högst dec decimaler, som blir ett heltal i enheten t (och högst 4 siffror).
function pickValue(u, t, dec) {
  const unitMM = MM[u] / 10 ** dec, tMM = MM[t];
  for (let i = 0; i < 200; i++) {
    let v = dec ? rnd(1, 99) : rnd(1, 9);
    if (dec && v % 10 === 0) continue;
    if (!dec && MM[u] < MM[t]) v = rnd(1, 9) * (MM[t] / MM[u]) * (Math.random() < 0.4 ? rnd(2, 5) : 1);
    const mm = v * unitMM;
    if (mm % tMM === 0 && mm / tMM <= 9999 && mm / tMM >= 1) return mm;
  }
  return MM[u] * 2;
}

function genConv(L, n) {
  const [a, b] = pick(L.pairs), mm = pickValue(a, b, L.dec), ans = mm / MM[b], src = inUnit(mm, a);
  const f = MM[a] / MM[b];
  return task(L, n, {
    text: `${fmtNum(src)} ${a} = <span class="slot">?</span> ${b}`, big: true, inlineSlot: true, input: 'num', answer: ans,
    sub: 'Använd enhetstrappan.', describe: `${fmtNum(src)} ${a} = ? ${b}`,
    build() { drawStairs(a, b); },
    hint() { showPath(a, b); return stairsHint(a, b); },
    reveal(ok) {
      FL.fx.innerHTML = ''; showPath(a, b);
      const text = f >= 1 ? `1 ${a} = ${fmtNum(f)} ${b}, så ${fmtNum(src)} · ${fmtNum(f)} = <b>${fmtNum(ans)}</b> ${b}.`
        : `1 ${b} = ${fmtNum(1 / f)} ${a}, så ${fmtNum(src)} / ${fmtNum(1 / f)} = <b>${fmtNum(ans)}</b> ${b}.`;
      return { text, auto: ok ? 2600 : 0 };
    },
    tag(v) {
      v = Number(v);
      if (v === ans * 10 || v * 10 === ans) return 'langd-faktor';
      // delat i stället för multiplicerat (eller tvärtom)
      if (Math.abs(v - Number(src) / f) < 1e-9) return 'langd-riktning';
      return null;
    },
  });
}

function genMixed(L, n) {
  const [a, b] = pick(L.pairs), f = MM[a] / MM[b];
  const big = rnd(1, f >= 1000 ? 9 : 9), small = rnd(1, f - 1), ans = big * f + small;
  return task(L, n, {
    text: `${big} ${a} ${small} ${b} = <span class="slot">?</span> ${b}`, big: true, inlineSlot: true, input: 'num', answer: ans,
    sub: `Byt först ${a} till ${b}.`, describe: `${big} ${a} ${small} ${b} = ? ${b}`,
    build() { drawStairs(a, b); },
    hint() { showPath(a, b); return `Hur många ${b} är ${big} ${a}? Lägg sedan till ${small} ${b}.`; },
    reveal(ok) { FL.fx.innerHTML = ''; showPath(a, b); return { text: `${big} ${a} = ${big} · ${fmtNum(f)} = ${fmtNum(big * f)} ${b}. ${fmtNum(big * f)} + ${small} = <b>${fmtNum(ans)}</b> ${b}.`, auto: ok ? 2600 : 0 }; },
    tag(v) { v = Number(v); if (v === big + small) return 'langd-blandat'; if (v === big * f / 10 + small || v === big * f * 10 + small) return 'langd-faktor'; return null; },
  });
}

function genToDec(L, n) {
  // från mindre till större enhet, så att svaret får en decimal
  const [a, b] = pick(L.pairs), f = MM[b] / MM[a];
  let v; do { v = rnd(1, 99) * (f / 10); } while (v % f === 0);
  const mm = v * MM[a], correct = inUnit(mm, b), c = fmtNum(correct);
  const wrong = [v * f, v / (f * 10), v / (f / 10)].map(x => fmtNum(+x.toFixed(4))).concat(fmtNum(Math.floor(v / f) + '.0' + (v % f) / (f / 10)));
  const opts = [c]; for (const w of shuffle(wrong)) if (opts.length < 4 && !opts.includes(w) && w !== '0') opts.push(w);
  return task(L, n, {
    text: `${fmtNum(v)} ${a} = ? ${b}`, input: 'choice', choices: shuffle(opts).map(x => ({ value: x, label: `${x} ${b}` })), answer: c,
    sub: 'Välj rätt svar.', describe: `${fmtNum(v)} ${a} = ? ${b}`,
    build() { drawStairs(a, b); },
    hint() { showPath(a, b); return stairsHint(a, b); },
    reveal(ok) { FL.fx.innerHTML = ''; showPath(a, b); return { text: `1 ${b} = ${fmtNum(f)} ${a}, så ${fmtNum(v)} / ${fmtNum(f)} = <b>${c}</b> ${b}.`, auto: ok ? 2600 : 0 }; },
    tag(g) { if (g === fmtNum(v * f)) return 'langd-riktning'; if (g !== c) return 'langd-faktor'; return null; },
  });
}

// Familjer av enheter för jämförelser: tre längder nära varandra (lo–hi mm, i steg om step mm).
const FAMS = [
  { units: ['m', 'cm', 'mm'], lo: 1000, hi: 3000, step: 10 },
  { units: ['dm', 'cm', 'mm'], lo: 100, hi: 900, step: 1 },
  { units: ['km', 'm', 'mil'], lo: 1000000, hi: 9000000, step: 100000 },
];
const decimals = s => (s.split('.')[1] || '').length;
function genCompare(L, n) {
  // tre längder nära varandra, skrivna i olika enheter med högst två decimaler
  const fam = pick(FAMS), units = shuffle(fam.units), u2 = fam.units[1];
  let items;
  for (let i = 0; i < 200; i++) {
    const c = rnd(fam.lo / fam.step, fam.hi / fam.step) * fam.step;
    const mms = [c, c + rnd(1, 30) * fam.step, c - rnd(1, 30) * fam.step];
    items = mms.map((mm, j) => ({ mm, raw: inUnit(mm, units[j]), u: units[j] }));
    if (new Set(mms).size === 3 && mms.every(x => x > 0) && items.every(x => decimals(x.raw) <= 2)) break;
  }
  items = shuffle(items.map(x => ({ mm: x.mm, txt: `${fmtNum(x.raw)} ${x.u}` })));
  const best = items.reduce((a, b) => b.mm > a.mm ? b : a);
  return task(L, n, {
    text: 'Vilken sträcka är längst?', input: 'choice', choices: items.map(x => ({ value: x.txt, label: x.txt })), answer: best.txt,
    sub: 'Byt till samma enhet först.', describe: `Längst: ${items.map(x => x.txt).join(' / ')}`,
    build() { drawStairs(fam.units[0], fam.units[2]); },
    hint() { return `Skriv alla tre i samma enhet, till exempel ${u2}, och jämför sedan.`; },
    reveal(ok) { return { text: `I ${u2}: ${items.map(x => `${x.txt} = ${fmtNum(inUnit(x.mm, u2))} ${u2}`).join(', ')}. Längst är <b>${best.txt}</b>.`, auto: ok ? 3000 : 0 }; },
  });
}
