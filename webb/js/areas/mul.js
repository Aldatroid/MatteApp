/* ============ Uppgifter: multiplikation ============
   Tabellerna har inga nivåer. Varje gångertal har en egen "låda" (0–5) som styr hur ofta det kommer:
   nya och felsvarade oftast, de som sitter mer sällan (repetition med ökande mellanrum). */
import { pick } from '../util.js';
import { S, FAST_MS } from '../store.js';
import { has3D, content, addLabel, anchorAt, removeLabels, later } from '../three/scene.js';
import { mulOrigin, mulBase, buildGrid, GAP } from '../three/blocks.js';

const BOX_W = [2.5, 6, 3.5, 2, 0.8, 0.4];
const BOX_INT = [0, 30e3, 5 * 60e3, 20 * 3600e3, 2 * 86400e3, 5 * 86400e3];
export const ALL_FACTS = []; for (let a = 1; a <= 10; a++) for (let b = 1; b <= 10; b++) ALL_FACTS.push([a, b]);
function pickFact(pool, recentKeys) {
  const now = Date.now(); let total = 0;
  const ws = pool.map(([a, b]) => {
    const k = a + 'x' + b; if (recentKeys.includes(k)) return 0;
    const f = S.facts[k]; const box = f ? f.box : 0; let w = BOX_W[box];
    if (f && box >= 2) { const due = now - f.last > BOX_INT[box]; w *= due ? 2 : (box >= 4 ? 0.3 : 1); }
    if (a === 1 || b === 1 || a === 10 || b === 10) w *= 0.35; else if (a === 2 || b === 2 || a === 5 || b === 5) w *= 0.7;
    total += w; return w;
  });
  if (total <= 0) return pick(pool);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) { r -= ws[i]; if (r <= 0) return pool[i]; }
  return pool[pool.length - 1];
}
export function hardestFacts(n = 12) {
  const seen = ALL_FACTS.filter(([a, b]) => S.facts[a + 'x' + b]?.n);
  const score = ([a, b]) => { const f = S.facts[a + 'x' + b]; return f.box * 10 - (f.n - f.r) / f.n * 10 + (f.ms ? -f.ms / 2000 : 0); };
  return seen.filter(([a, b]) => a > 1 && b > 1 && a < 10 && b < 10).sort((x, y) => score(x) - score(y)).slice(0, n);
}
function makeMul(a, b, fmt = 'prod') {
  const p = a * b, slot = '<span class="slot">?</span>';
  const cols = fmt === 'prod' ? b : 10;
  const { ox, oz } = mulOrigin(a, cols);
  const text = fmt === 'prod' ? `${a} · ${b} = ${slot}` : fmt === 'miss' ? `${a} · ${slot} = ${p}` : `${p} / ${a} = ${slot}`;
  const t = {
    skill: 'mul', key: `${a}x${b}`, a, b, fmt, kicker: 'Gångertabellen', text, big: true, inlineSlot: true, input: 'num',
    answer: fmt === 'prod' ? p : b,
    describe: fmt === 'prod' ? `${a} · ${b}` : fmt === 'miss' ? `${a} · ? = ${p}` : `${p} / ${a}`,
    remake: () => makeMul(a, b, 'prod'),
    build() { mulBase(a, b, cols, fmt); },
    hint() {
      if (fmt !== 'prod') {
        const seq = [1, 2, 3].map(k => a * k).join(', ');
        return `Vilket tal gånger ${a} blir ${p}? Räkna i hopp om ${a}: ${seq} …`;
      }
      let split = null, txt;
      if (b > 5 && b < 10) { split = { axis: 'col', at: 5 }; txt = `Dela upp: ${a} · ${b} = ${a} · 5 + ${a} · ${b - 5}`; }
      else if (a > 5 && a < 10) { split = { axis: 'row', at: 5 }; txt = `Dela upp: ${a} · ${b} = 5 · ${b} + ${a - 5} · ${b}`; }
      else if (a === 10 || b === 10) txt = 'Gånger 10: skriv en nolla efter talet.';
      else txt = `${a} rader med ${b} i varje. Räkna i hopp om ${b}.`;
      if (has3D) {
        t._hg = buildGrid(a, b, ox, oz, { split }); t._hl = [];
        if (split?.axis === 'col') {
          t._hl.push(addLabel(`${a} · 5 = ${a * 5}`, anchorAt(content, ox + 2, 1.2, oz - 1)));
          t._hl.push(addLabel(`${a} · ${b - 5}`, anchorAt(content, ox + 5 + GAP + (b - 6) / 2, 1.2, oz - 1), { cls: 'sun' }));
        } else if (split?.axis === 'row') {
          t._hl.push(addLabel(`5 · ${b} = ${5 * b}`, anchorAt(content, ox - 1.8, 0.6, oz + 2)));
          t._hl.push(addLabel(`${a - 5} · ${b}`, anchorAt(content, ox - 1.8, 0.6, oz + 5 + GAP + (a - 6) / 2), { cls: 'sun' }));
        }
      }
      return txt;
    },
    reveal(ok) {
      if (t._hg) { content.remove(t._hg); removeLabels(t._hl); }
      if (has3D) {
        if (ok) { buildGrid(a, b, ox, oz); later(450, () => addLabel(`${a} · ${b} = ${p}`, anchorAt(content, ox + (b - 1) / 2, 1.3, oz - 1.2), { cls: 'big' })); }
        else buildGrid(a, b, ox, oz, { anim: 'rows', rowLabels: true });
      }
      if (ok) return { text: '', auto: 1300 };
      const seq = a > 3 ? `${b}, ${2 * b}, ${3 * b} … ${p}` : [...Array(a).keys()].map(k => b * (k + 1)).join(', ');
      if (fmt === 'prod') return { text: `${a} · ${b} = <b>${p}</b>. Räkna i hopp om ${b}: ${seq}.` };
      if (fmt === 'miss') return { text: `${a} · <b>${b}</b> = ${p}. Det är ${a} rader med ${b} i varje.` };
      return { text: `${p} / ${a} = <b>${b}</b>, eftersom ${a} · ${b} = ${p}.` };
    },
    tag(g) {
      g = Number(g); if (fmt !== 'prod') return null;
      if (g === a + b) return 'tab-add';
      if ([p + a, p - a, p + b, p - b].includes(g)) return 'tab-step';
      const s = String(p); if (s.length === 2 && String(g) === s[1] + s[0]) return 'tab-swap';
      return null;
    },
  };
  return t;
}
function nextMul(pool, run) {
  let [a, b] = pickFact(pool, run.recentKeys);
  const k = a + 'x' + b;
  run.recentKeys.push(k); if (run.recentKeys.length > 4) run.recentKeys.shift();
  const f = S.facts[k]; let fmt = 'prod';
  if (f && f.box >= 3) { const r = Math.random(); fmt = r < 0.18 ? 'miss' : r < 0.35 ? 'div' : 'prod'; }
  return makeMul(a, b, fmt);
}
export function updateFact(k, ok, ms, hint) {
  const f = S.facts[k] ||= { box: 0, n: 0, r: 0, ms: 0, last: 0 };
  f.n++;
  if (ok) { f.r++; f.ms = f.ms ? Math.round(f.ms * 0.7 + ms * 0.3) : ms; }
  const fast = ms < FAST_MS && !hint;
  if (!ok) f.box = 1;
  else if (f.box === 0) f.box = fast ? 3 : 2;
  else if (fast) f.box = Math.min(5, f.box + 1);
  else if (f.box < 3) f.box++;
  f.last = Date.now();
}
export function countGood() { return ALL_FACTS.filter(([a, b]) => (S.facts[a + 'x' + b]?.box || 0) >= 4).length; }
export function factStatus(f) { if (!f || !f.n) return 'none'; if (f.box >= 4) return 'good'; if (f.box >= 2) return 'mid'; return 'learn'; }

export default {
  id: 'mul', name: 'Multiplikationstabellen', short: 'Tabeller',
  // Tabellerna får komma många gånger i rad i dagens pass; andra områden byts oftare.
  maxRun: 6, repeat: 1,
  next(run, cfg) { return nextMul(cfg.pool || ALL_FACTS, run); },
  record(t, { first, ms, hint }) { updateFact(t.key, first, ms, hint); },
  tags: {
    'tab-add': 'Har adderat i stället för att multiplicera (till exempel svarat 15 på 7 · 8).',
    'tab-step': 'Hamnar ofta ett steg fel i tabellen. Hoppräknar troligen och tappar räkningen.',
    'tab-swap': 'Byter ibland plats på siffrorna (till exempel 65 i stället för 56).',
  },
};
