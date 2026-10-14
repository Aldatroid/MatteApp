/* ============ Uppgifter: area och omkrets ============ */
import { rnd } from '../util.js';
import { flat, FL, svgEl, partPts, partArea, partExpr, polyPerim, sideLabel, drawFlat, innerGrid, colorParts, partAreaLabels, traceSides, rectRows, triBox } from '../three/flat.js';
import { kicker } from '../levels.js';

// Nivåer i ordning. step = vilken sorts figur som ritas (se genArea nedan):
// 1 rektangel på rutnät, 2 rektangel utan rutnät, 3 triangel, 4 två ihopsatta delar, 5 tre ihopsatta delar.
// Ordningen kan ändras och steg kan tas bort eller upprepas.
const levels = [
  { step: 1, text: 'Rektanglar och kvadrater på rutnät' },
  { step: 2, text: 'Rektanglar utan rutnät, större mått' },
  { step: 3, text: 'Trianglar' },
  { step: 4, text: 'Figurer ihopsatta av två delar' },
  { step: 5, text: 'Figurer ihopsatta av tre delar' },
];

const area = {
  id: 'area', name: 'Area och omkrets', short: 'Area & omkrets', levels,
  gen: (L, n) => genArea(L, n),
  tags: {
    'area-omkrets': 'Blandar ihop area och omkrets.',
    'halv-omkrets': 'Räknar bara två av fyra sidor när omkretsen ska räknas ut.',
    'triangel-halva': 'Glömmer att dela med 2 när arean av en triangel ska räknas ut.',
    'en-del': 'Räknar bara en av delarna i sammansatta figurer.',
  },
};
export default area;

function genArea(L, num) {
  const level = L.step;
  // derived = mått som inte står utskrivna men går att räkna ut; visas i tips och facit.
  let parts, outline, sides, heights = [], dims = [], derived = [], ask = 'area', name = 'figurens', grid = false, dashed = false, trace = null, kind;
  const cm = n => `${n} cm`;
  const SD = (a, b, n) => ({ a, b, text: cm(n) });
  if (level <= 2) {
    // Nivå 1: rektangel/kvadrat på rutnät. Nivå 2: utan rutnät, större mått.
    kind = 'rect';
    let w = level === 1 ? rnd(2, 7) : rnd(3, 10), h = level === 1 ? rnd(2, 5) : rnd(2, 9);
    const sq = Math.random() < 0.25;
    if (sq) { w = Math.min(w, level === 1 ? 5 : 9); h = w; } else if (w === h) w++;
    ask = Math.random() < (level === 1 ? 0.3 : 0.5) ? 'omk' : 'area';
    parts = [{ kind: 'rect', x: 0, y: 0, w, h }]; outline = partPts(parts[0]); grid = level === 1; name = sq ? 'kvadratens' : 'rektangelns';
    sides = [SD([0, h], [w, h], w), SD([0, 0], [0, h], h)];
    trace = [SD([0, 0], [w, 0], w), SD([w, 0], [w, h], h), SD([w, h], [0, h], w), SD([0, h], [0, 0], h)];
  } else if (level === 3) {
    // Nivå 3: en triangel, rätvinklig eller med utritad höjd.
    kind = 'tri'; name = 'triangelns';
    let b = rnd(3, 10); const h = rnd(2, 8); if ((b * h) % 2) b++;
    if (Math.random() < 0.5) { parts = [{ kind: 'tri', pts: [[0, 0], [0, h], [b, h]], b, h }]; sides = [SD([0, h], [b, h], b), SD([0, 0], [0, h], h)]; }
    else { const ax = rnd(1, b - 1); parts = [{ kind: 'tri', pts: [[0, h], [ax, 0], [b, h]], b, h }]; sides = [SD([0, h], [b, h], b)]; heights = [{ a: [ax, 0], b: [ax, h], text: cm(h), foot: true }]; }
    outline = parts[0].pts;
  } else if (level === 4) {
    // Nivå 4: två ihopsatta delar, med delningslinjen streckad.
    kind = 'comp'; dashed = true; const r = Math.random();
    if (r < 0.55) {
      const w1 = rnd(4, 9), h1 = rnd(2, 4), w2 = rnd(2, w1 - 2), h2 = rnd(2, 4);
      parts = [{ kind: 'rect', x: 0, y: h2, w: w1, h: h1 }, { kind: 'rect', x: 0, y: 0, w: w2, h: h2 }];
      outline = [[0, 0], [w2, 0], [w2, h2], [w1, h2], [w1, h2 + h1], [0, h2 + h1]];
      sides = [SD([0, 0], [w2, 0], w2), SD([0, 0], [0, h2 + h1], h1 + h2), SD([0, h2 + h1], [w1, h2 + h1], w1), SD([w1, h2], [w1, h2 + h1], h1)];
      derived = [SD([w2, 0], [w2, h2], h2)];
      if (r < 0.2) {
        kind = 'lomk'; ask = 'omk'; dashed = false;
        derived.push(SD([w2, h2], [w1, h2], w1 - w2));
        trace = [SD([0, 0], [w2, 0], w2), SD([w2, 0], [w2, h2], h2), SD([w2, h2], [w1, h2], w1 - w2), SD([w1, h2], [w1, h2 + h1], h1), SD([w1, h2 + h1], [0, h2 + h1], w1), SD([0, h2 + h1], [0, 0], h1 + h2)];
      }
    } else if (r < 0.8) {
      const w = rnd(4, 8), h = rnd(2, 5); let t = rnd(2, 4); if (w % 2 && t % 2) t++;
      parts = [{ kind: 'rect', x: 0, y: t, w, h }, { kind: 'tri', pts: [[0, t], [w / 2, 0], [w, t]], b: w, h: t }];
      outline = [[0, t], [w / 2, 0], [w, t], [w, t + h], [0, t + h]];
      sides = [SD([0, t + h], [w, t + h], w), SD([w, t], [w, t + h], h)];
      heights = [{ a: [w / 2, 0], b: [w / 2, t], text: "", foot: true }]; dims = [{ side: "right", y1: 0, y2: t, text: cm(t), guides: [[w / 2, 0], [w, t]] }];
    } else {
      let w = rnd(3, 6); const h = rnd(2, 5); let b = rnd(3, 5); if (b % 2 && h % 2) b++;
      if (w + b > 10) w = 10 - b;
      parts = [{ kind: 'rect', x: 0, y: 0, w, h }, { kind: 'tri', pts: [[w, 0], [w, h], [w + b, h]], b, h }];
      outline = [[0, 0], [w, 0], [w + b, h], [0, h]];
      sides = [SD([0, 0], [w, 0], w), { ...SD([0, h], [w + b, h], w + b), far: true }, SD([0, 0], [0, h], h)];
      derived = [SD([w, h], [w + b, h], b)];
    }
  } else {
    // Nivå 5: tre ihopsatta delar, utan streckade delningslinjer.
    kind = 'comp'; const r = Math.random();
    if (r < 0.34) {
      const h = rnd(2, 5); let w = rnd(3, 6), b1 = rnd(2, 3), b2 = rnd(2, 3); if (h % 2) { if (b1 % 2) b1++; if (b2 % 2) b2++; } w = Math.min(w, 10 - b1 - b2);
      parts = [{ kind: 'rect', x: b1, y: 0, w, h }, { kind: 'tri', pts: [[0, h], [b1, 0], [b1, h]], b: b1, h }, { kind: 'tri', pts: [[b1 + w, 0], [b1 + w, h], [b1 + w + b2, h]], b: b2, h }];
      outline = [[0, h], [b1, 0], [b1 + w, 0], [b1 + w + b2, h]];
      sides = [SD([b1, 0], [b1 + w, 0], w), SD([0, h], [b1, h], b1), { ...SD([0, h], [b1 + w + b2, h], b1 + w + b2), far: true }];
      derived = [SD([b1 + w, h], [b1 + w + b2, h], b2)];
      dims = [{ side: "left", y1: 0, y2: h, text: cm(h), guides: [[b1, 0], [0, h]] }];
    } else if (r < 0.67) {
      const w1 = rnd(4, 7), h1 = rnd(3, 5); let t = rnd(2, 4); if (w1 % 2 && t % 2) t++;
      const w2 = Math.min(rnd(2, 4), 10 - w1), h2 = rnd(2, h1 - 1);
      parts = [{ kind: 'rect', x: 0, y: t, w: w1, h: h1 }, { kind: 'tri', pts: [[0, t], [w1 / 2, 0], [w1, t]], b: w1, h: t }, { kind: 'rect', x: w1, y: t + h1 - h2, w: w2, h: h2 }];
      outline = [[0, t], [w1 / 2, 0], [w1, t], [w1, t + h1 - h2], [w1 + w2, t + h1 - h2], [w1 + w2, t + h1], [0, t + h1]];
      sides = [{ ...SD([0, t + h1], [w1 + w2, t + h1], w1 + w2), far: true }, SD([w1, t + h1 - h2], [w1 + w2, t + h1 - h2], w2), SD([0, t], [0, t + h1], h1), SD([w1 + w2, t + h1 - h2], [w1 + w2, t + h1], h2)];
      derived = [SD([0, t + h1], [w1, t + h1], w1)];
      heights = [{ a: [w1 / 2, 0], b: [w1 / 2, t], text: "", foot: true }]; dims = [{ side: "right", y1: 0, y2: t, text: cm(t), guides: [[w1 / 2, 0], [w1, t]] }];
    } else {
      const w1 = rnd(5, 9), h1 = rnd(2, 4), w2 = rnd(3, w1 - 2), h2 = rnd(2, 4); let t = rnd(2, 3); if (w2 % 2 && t % 2) t++;
      parts = [{ kind: 'rect', x: 0, y: t + h2, w: w1, h: h1 }, { kind: 'rect', x: 0, y: t, w: w2, h: h2 }, { kind: 'tri', pts: [[0, t], [w2 / 2, 0], [w2, t]], b: w2, h: t }];
      outline = [[0, t], [w2 / 2, 0], [w2, t], [w2, t + h2], [w1, t + h2], [w1, t + h2 + h1], [0, t + h2 + h1]];
      sides = [{ ...SD([0, t], [0, t + h2 + h1], h1 + h2), far: true }, SD([w1, t + h2], [w1, t + h2 + h1], h1), SD([0, t + h2 + h1], [w1, t + h2 + h1], w1), SD([w2, t + h2], [w1, t + h2], w1 - w2)];
      heights = [{ a: [w2 / 2, 0], b: [w2 / 2, t], text: "", foot: true }]; dims = [{ side: "right", y1: 0, y2: t, text: cm(t), guides: [[w2 / 2, 0], [w2, t]] }];
      derived = [SD([0, t], [0, t + h2], h2)];
    }
  }
  const A = parts.reduce((s, p) => s + partArea(p), 0), P = Math.round(polyPerim(outline));
  const isArea = ask === 'area';
  // reserve = mått som visas först i tips/facit; vyn lämnar plats för dem från början.
  const P0 = parts[0], reserve = kind === 'rect' ? [SD([0, 0], [P0.w, 0], P0.w), SD([P0.w, 0], [P0.w, P0.h], P0.h)] : derived;
  const spec = { parts, outline, sides, heights, dims, grid, dashed, reserve };
  const R = parts[0], T = parts.find(p => p.kind === 'tri');
  const showDerived = () => derived.forEach(s => sideLabel(s, { parent: FL.fx, cls: 'hl' }));
  const what = { rect: name === 'kvadratens' ? 'kvadrat' : 'rektangel', tri: 'triangel', comp: parts.length + ' delar', lomk: 'L-figur' }[kind];
  return {
    skill: 'area', level: num, kicker: kicker(area, num), text: `Vad är ${name} ${isArea ? 'area' : 'omkrets'}?`,
    sub: derived.length ? 'Alla sidor har inte mått. Räkna ut de som saknas med hjälp av de andra.' : kind === 'comp' ? `Figuren är ihopsatt av ${parts.length} delar.` : grid ? 'Varje ruta är 1 cm lång.' : 'Måtten står vid sidorna.',
    input: 'num', answer: isArea ? A : P, unit: isArea ? 'cm²' : 'cm', describe: `${isArea ? 'Area' : 'Omkrets'}: ${what}`,
    remake: () => genArea(L, num),
    build() { drawFlat(spec); },
    hint() {
      if (kind === 'rect' && isArea) {
        if (grid) { svgEl('rect', { x: 0, y: 0, width: R.w, height: 1, class: 'rowfill' }, FL.fx); return `En rad har ${R.w} rutor. Hur många rader finns det?`; }
        innerGrid(R); return `Tänk dig rutor: ${R.w} i varje rad och ${R.h} rader.`;
      }
      if (kind === 'rect') { sideLabel(SD([0, 0], [R.w, 0], R.w), { parent: FL.fx, cls: 'hl' }); sideLabel(SD([R.w, 0], [R.w, R.h], R.h), { parent: FL.fx, cls: 'hl' }); return 'Omkretsen är hela vägen runt. Sidorna mittemot varandra är lika långa.'; }
      if (kind === 'tri') { triBox(T); return 'Triangeln är hälften av rektangeln runt den. Räkna ut rektangelns area och dela med 2.'; }
      const dTxt = derived.length ? ' De blå måtten har jag räknat ut från de andra sidorna.' : '';
      if (kind === 'lomk') { showDerived(); return 'Gå runt hela figuren och lägg ihop alla sex sidor.' + dTxt; }
      colorParts(); showDerived(); return `Dela upp figuren i ${parts.length} delar. Räkna ut arean av varje del och lägg ihop.` + dTxt;
    },
    reveal(ok) {
      FL.fx.innerHTML = '';
      showDerived();
      let text;
      if (kind === 'rect' && isArea) { rectRows(R); text = `${R.h} rader med ${R.w} i varje: ${R.w} · ${R.h} = <b>${A}</b> cm².`; }
      else if (kind === 'rect' || kind === 'lomk') { traceSides(trace); text = `${trace.map(s => parseInt(s.text, 10)).join(' + ')} = <b>${P}</b> cm.`; }
      else if (kind === 'tri') { triBox(T); colorParts(); partAreaLabels(); text = `Rektangeln runt är ${T.b} · ${T.h} = ${T.b * T.h} cm². Triangeln är hälften: <b>${A}</b> cm².`; }
      else { colorParts(); partAreaLabels(); text = parts.map((p, i) => `<i class="sw sw-p${i}"></i> Del ${i + 1}: ${partExpr(p)}`).join('<br>') + `<br>${parts.map(partArea).join(' + ')} = <b>${A}</b> cm²`; }
      return { text, auto: ok ? 3200 : 0 };
    },
    tag(g) {
      g = Number(g);
      if (kind === 'rect') { if (isArea && g === P) return 'area-omkrets'; if (!isArea && g === A) return 'area-omkrets'; if (!isArea && g === R.w + R.h) return 'halv-omkrets'; }
      if (kind === 'tri' && g === T.b * T.h) return 'triangel-halva';
      if (kind === 'comp') { if (parts.some(p => partArea(p) === g)) return 'en-del'; if (parts.some(p => p.kind === 'tri' && g === A + partArea(p))) return 'triangel-halva'; }
      return null;
    },
  };
}
