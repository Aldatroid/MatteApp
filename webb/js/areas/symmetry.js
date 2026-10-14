/* ============ Uppgifter: symmetri ============
   Lgr22, åk 4–6: symmetri och symmetrilinjer. Barnet avgör om en linje är en symmetrilinje, räknar
   symmetrilinjer och speglar figurer på rutnät genom att trycka på rutorna direkt i bilden. */
import { rnd, pick, shuffle } from '../util.js';
import { flat, FL, svgEl, beginFlat, setFlatBox, ptsStr } from '../three/flat.js';
import { kicker } from '../levels.js';

// Nivåer i ordning. kind: 'isline' = är linjen en symmetrilinje, 'count' = hur många symmetrilinjer,
// 'mirror' = spegla på rutnät (dir = lodrät/vågrät linje, w/h = halvans storlek i rutor, cells = antal färgade rutor).
const levels = [
  { kind: 'isline', text: 'Är linjen en symmetrilinje?' },
  { kind: 'mirror', text: 'Spegla en figur i en lodrät linje', dir: 'v', w: 4, h: 5, cells: [3, 5] },
  { kind: 'count', text: 'Hur många symmetrilinjer har figuren?' },
  { kind: 'mirror', text: 'Spegla en figur i en vågrät linje', dir: 'h', w: 6, h: 3, cells: [4, 6] },
  { kind: 'mirror', text: 'Spegla större figurer', dir: 'v', w: 5, h: 6, cells: [6, 9] },
];

// Figurer med sina symmetrilinjer (vinklar i grader genom mittpunkten; 0 = vågrät, 90 = lodrät).
const reg = (n, r = 2.6) => [...Array(n).keys()].map(i => { const a = (-90 + i * 360 / n) * Math.PI / 180; return [r * Math.cos(a), r * Math.sin(a)]; });
const regAxes = n => [...Array(n).keys()].map(k => ((-90 + k * 180 / n) % 180 + 180) % 180);
const SHAPES = [
  { name: 'kvadrat', pts: [[-2.1, -2.1], [2.1, -2.1], [2.1, 2.1], [-2.1, 2.1]], axes: [0, 45, 90, 135] },
  { name: 'rektangel', pts: [[-2.9, -1.6], [2.9, -1.6], [2.9, 1.6], [-2.9, 1.6]], axes: [0, 90] },
  { name: 'liksidig triangel', pts: reg(3, 2.8), axes: regAxes(3) },
  { name: 'likbent triangel', pts: [[0, -2.7], [1.7, 2.1], [-1.7, 2.1]], axes: [90] },
  { name: 'romb', pts: [[0, -2.7], [1.7, 0], [0, 2.7], [-1.7, 0]], axes: [0, 90] },
  { name: 'drake', pts: [[0, -2.7], [1.6, -0.7], [0, 2.7], [-1.6, -0.7]], axes: [90] },
  { name: 'parallellogram', pts: [[-2.1, -1.5], [2.9, -1.5], [2.1, 1.5], [-2.9, 1.5]], axes: [] },
  { name: 'regelbunden femhörning', pts: reg(5), axes: regAxes(5) },
  { name: 'regelbunden sexhörning', pts: reg(6), axes: regAxes(6) },
  { name: 'oregelbunden fyrhörning', pts: [[-2.4, -1.3], [1.5, -2.2], [2.6, 1.3], [-1.3, 2.1]], axes: [] },
  { name: 'cirkel', circle: 2.6, axes: Infinity },
];

const area = {
  id: 'symmetry', name: 'Symmetri', short: 'Symmetri', levels,
  gen(L, n) { return ({ isline: genIsLine, count: genCount, mirror: genMirror })[L.kind](L, n); },
  tags: {
    'sym-kopierar': 'Flyttar figuren till andra sidan i stället för att spegla den.',
    'sym-diagonal': 'Tror att diagonalerna i en rektangel är symmetrilinjer.',
    'sym-missar': 'Missar symmetrilinjer, till exempel kvadratens diagonaler.',
  },
};
export default area;
const task = (L, n, t) => ({ skill: 'symmetry', level: n, kicker: kicker(area, n), remake: () => area.gen(L, n), ...t });

/* ----- Ritning ----- */
const dirOf = a => [Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180)];
// Spegla en punkt i en linje genom origo med vinkeln a.
const reflect = ([x, y], a) => { const [dx, dy] = dirOf(a), d = x * dx + y * dy; return [2 * d * dx - x, 2 * d * dy - y]; };
function drawShape(s, parent, cls = 'fr') {
  return s.circle ? svgEl('circle', { cx: 0, cy: 0, r: s.circle, class: cls, 'stroke-width': 0.06 }, parent) : svgEl('polygon', { points: ptsStr(s.pts), class: cls, 'stroke-width': 0.06 }, parent);
}
function axisLine(a, parent, cls = 'symline', delay = 0) {
  const [dx, dy] = dirOf(a), r = 3.6;
  const l = svgEl('line', { x1: -dx * r, y1: -dy * r, x2: dx * r, y2: dy * r, class: cls, 'stroke-width': 0.08, 'stroke-dasharray': '0.3 0.2' }, parent);
  if (delay) l.style.animationDelay = delay + 'ms';
  return l;
}

/* ----- Är linjen en symmetrilinje? ----- */
function genIsLine(L, n) {
  const s = pick(SHAPES.filter(x => !x.circle));
  const falseAngles = [0, 45, 90, 135].filter(a => !s.axes.includes(a));
  const isAxis = s.axes.length && (Math.random() < 0.55 || !falseAngles.length);
  const a = isAxis ? pick(s.axes) : pick(falseAngles), ans = isAxis ? 'ja' : 'nej';
  return task(L, n, {
    text: 'Är den streckade linjen en symmetrilinje?', sub: `Figuren är en ${s.name}.`,
    input: 'choice', choices: [{ value: 'ja', label: 'Ja' }, { value: 'nej', label: 'Nej' }], answer: ans, describe: `Symmetrilinje? ${s.name}`,
    build() { beginFlat(0.6); drawShape(s, FL.base); axisLine(a, FL.base); setFlatBox(-4, -4, 8, 8); },
    hint() { return 'Tänk dig att du viker figuren längs linjen. Hamnar de två halvorna precis på varandra?'; },
    reveal(ok) {
      // Visa figuren speglad i linjen: täcker den originalet är linjen en symmetrilinje.
      svgEl('polygon', { points: ptsStr(s.pts.map(p => reflect(p, a))), class: 'mirror pop', 'stroke-width': 0.1 }, FL.fx);
      return { text: isAxis ? 'Ja. Om du viker längs linjen hamnar halvorna precis på varandra.' : 'Nej. Om du viker längs linjen hamnar halvorna inte på varandra. Den gula konturen visar var figuren hamnar.', auto: ok ? 2600 : 0 };
    },
  });
}

/* ----- Hur många symmetrilinjer? ----- */
function genCount(L, n) {
  const s = pick(SHAPES), inf = s.axes === Infinity, correct = inf ? 'oandligt' : String(s.axes.length);
  const label = v => v === 'oandligt' ? 'Oändligt många' : v;
  const pool = ['0', '1', '2', '3', '4', '5', '6', 'oandligt'].filter(v => v !== correct);
  const near = pool.filter(v => v !== 'oandligt' && Math.abs(Number(v) - (inf ? 8 : s.axes.length)) <= 2);
  const opts = [correct, ...shuffle(near).slice(0, 2)]; for (const v of shuffle(pool)) if (opts.length < 4 && !opts.includes(v)) opts.push(v);
  return task(L, n, {
    text: 'Hur många symmetrilinjer har figuren?', sub: `Figuren är en ${s.name}.`,
    input: 'choice', choices: shuffle(opts).map(v => ({ value: v, label: label(v) })), answer: correct, describe: `Symmetrilinjer: ${s.name}`,
    build() { beginFlat(0.6); drawShape(s, FL.base); setFlatBox(-4, -4, 8, 8); },
    hint() { return 'En symmetrilinje delar figuren i två halvor som är spegelbilder av varandra. Prova lodrätt, vågrätt och snett.'; },
    reveal(ok) {
      const angles = inf ? [0, 22.5, 45, 67.5, 90, 112.5, 135, 157.5] : s.axes;
      angles.forEach((a, i) => axisLine(a, FL.fx, 'symline pop', 150 + i * 220));
      const text = inf ? 'En cirkel har <b>oändligt många</b> symmetrilinjer: varje linje genom mittpunkten fungerar.'
        : s.axes.length ? `En ${s.name} har <b>${s.axes.length}</b> ${s.axes.length === 1 ? 'symmetrilinje' : 'symmetrilinjer'}.` : `En ${s.name} har <b>inga</b> symmetrilinjer. Hur du än viker den hamnar halvorna inte på varandra.`;
      return { text, auto: ok ? 2800 : 0 };
    },
    tag(g) {
      if (s.name === 'rektangel' && g === '4') return 'sym-diagonal';
      if (!inf && s.axes.length && Number(g) < s.axes.length) return 'sym-missar';
      return null;
    },
  });
}

/* ----- Spegla på rutnät ----- */
function genMirror(L, n) {
  const v = L.dir === 'v', W = L.w, H = L.h, cols = v ? 2 * W : W, rows = v ? H : 2 * H;
  const key = (c, r) => `${c},${r}`;
  const inFixed = (c, r) => v ? c < W : r < H;
  const mirror = (c, r) => v ? [2 * W - 1 - c, r] : [c, 2 * H - 1 - r];
  const shift = (c, r) => v ? [c + W, r] : [c, r + H];
  // Figur: en slumpvandring som börjar vid linjen, så att figuren hänger ihop.
  const k = rnd(...L.cells), fixed = new Set();
  let c = v ? W - 1 : rnd(0, W - 1), r = v ? rnd(0, H - 1) : H - 1;
  for (let i = 0; fixed.size < k && i < 400; i++) {
    fixed.add(key(c, r));
    const [dc, dr] = pick([[1, 0], [-1, 0], [0, 1], [0, -1]]), nc = c + dc, nr = r + dr;
    if (nc >= 0 && nr >= 0 && nc < cols && nr < rows && inFixed(nc, nr)) { c = nc; r = nr; }
  }
  const cells = [...fixed].map(s => s.split(',').map(Number));
  const target = new Set(cells.map(([x, y]) => key(...mirror(x, y))));
  const copied = new Set(cells.map(([x, y]) => key(...shift(x, y))));
  const canon = set => [...set].sort().join(';');
  const answer = canon(target), copyAns = canon(copied);
  const chosen = new Set();
  let rects = {};
  return task(L, n, {
    text: `Spegla figuren i den ${v ? 'lodräta' : 'vågräta'} linjen.`, sub: 'Tryck på rutorna på andra sidan linjen. Tryck igen för att ta bort.',
    input: 'custom', answer, describe: `Spegla ${k} rutor (${v ? 'lodrät' : 'vågrät'} linje)`,
    build() {
      beginFlat(0.6); rects = {};
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
        const fix = inFixed(x, y), on = fixed.has(key(x, y));
        rects[key(x, y)] = svgEl('rect', { x, y, width: 1, height: 1, class: 'cell' + (fix ? (on ? ' on' : ' fixed') : ' tap'), 'stroke-width': 0.04, 'data-k': fix ? '' : key(x, y) }, FL.base);
      }
      svgEl('line', v ? { x1: W, y1: -0.4, x2: W, y2: rows + 0.4 } : { x1: -0.4, y1: H, x2: cols + 0.4, y2: H }, FL.base).setAttribute('class', 'symline');
      FL.base.lastChild.setAttribute('stroke-width', 0.12);
      FL.base.addEventListener('pointerdown', e => {
        const kk = e.target?.dataset?.k; if (!kk || flat.style.pointerEvents !== 'auto') return;
        if (chosen.has(kk)) chosen.delete(kk); else chosen.add(kk);
        e.target.classList.toggle('pick', chosen.has(kk));
      });
      flat.style.pointerEvents = 'auto';
      setFlatBox(-0.7, -0.7, cols + 1.4, rows + 1.4);
    },
    renderInput(ia, submit) {
      ia.innerHTML = '<div class="choices"><button class="choice" data-act="clear">Börja om</button><button class="choice sym-done" data-act="done">Klar</button></div>';
      ia.querySelector('[data-act="clear"]').addEventListener('click', () => { chosen.clear(); Object.values(rects).forEach(el => el.dataset.k && el.classList.remove('pick')); });
      ia.querySelector('[data-act="done"]').addEventListener('click', () => { if (chosen.size) submit(canon(chosen)); });
    },
    hint() {
      // Visa var en av rutorna hamnar.
      const [x, y] = cells[0], [mx, my] = mirror(x, y);
      svgEl('rect', { x: mx + 0.08, y: my + 0.08, width: 0.84, height: 0.84, class: 'cell miss pop', 'stroke-width': 0.08 }, FL.fx);
      svgEl('rect', { x: x + 0.08, y: y + 0.08, width: 0.84, height: 0.84, class: 'cell mark pop', 'stroke-width': 0.08 }, FL.fx);
      return 'Räkna hur många rutor varje färgad ruta är från linjen. Spegelbilden ska vara lika långt från linjen på andra sidan. Jag har visat var en av rutorna hamnar.';
    },
    reveal(ok) {
      flat.style.pointerEvents = '';
      FL.fx.innerHTML = '';
      Object.entries(rects).forEach(([kk, el]) => {
        if (!el.dataset.k) return;
        const want = target.has(kk), got = chosen.has(kk);
        el.classList.remove('pick');
        el.classList.toggle('on', want && got);
        el.classList.toggle('miss', want && !got);
        el.classList.toggle('bad', !want && got);
      });
      return { text: ok ? 'Snyggt speglat! Varje ruta är lika långt från linjen på båda sidor.' : 'Rutorna med gul kant saknades, och de röda ska inte vara med. Varje ruta ska vara lika långt från linjen på andra sidan.', auto: ok ? 2400 : 0 };
    },
    tag(g) { return g === copyAns ? 'sym-kopierar' : null; },
  });
}
