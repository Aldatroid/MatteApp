/* ============ Byggstenar: 2D-figurer (area & omkrets) ============ */
import { $ } from '../util.js';
import { setView, onClear } from './scene.js';

export const flat = $('#flat');
export const SVGNS = 'http://www.w3.org/2000/svg';
export let FL = null;
onClear(() => { flat.setAttribute('hidden', ''); flat.innerHTML = ''; FL = null; });
export function svgEl(tag, attrs, parent = flat) { const e = document.createElementNS(SVGNS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent.appendChild(e); return e; }
export const ptsStr = pts => pts.map(p => p.join(',')).join(' ');
export const partPts = p => p.kind === 'rect' ? [[p.x, p.y], [p.x + p.w, p.y], [p.x + p.w, p.y + p.h], [p.x, p.y + p.h]] : p.pts;
export const centroid = pts => [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length];
export const partArea = p => p.kind === 'rect' ? p.w * p.h : p.b * p.h / 2;
export const partExpr = p => p.kind === 'rect' ? `${p.w} · ${p.h} = ${p.w * p.h}` : `${p.b} · ${p.h} / 2 = ${p.b * p.h / 2}`;
export const polyPerim = pts => pts.reduce((s, p, i) => { const q = pts[(i + 1) % pts.length]; return s + Math.hypot(q[0] - p[0], q[1] - p[1]); }, 0);
export function inPoly([x, y], poly) {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, yi] = poly[i], [xj, yj] = poly[j]; if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) c = !c; }
  return c;
}
export function flatText(str, x, y, { cls = '', size = 1, delay = 0, parent = flat } = {}) {
  const t = svgEl('text', { x, y, 'text-anchor': 'middle', 'dominant-baseline': 'central', 'font-size': FL.fs * size, 'stroke-width': FL.fs * 0.3, class: cls }, parent);
  if (delay) t.style.animationDelay = delay + 'ms';
  t.textContent = str; return t;
}
export function sideLabel(s, opts = {}) {
  const [ax, ay] = s.a, [bx, by] = s.b; const mx = (ax + bx) / 2, my = (ay + by) / 2;
  let nx = -(by - ay), ny = bx - ax; const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
  if (s.down) { nx = 0; ny = 1; }
  else if (inPoly([mx + nx * 0.05, my + ny * 0.05], FL.spec.outline)) { nx = -nx; ny = -ny; }
  const d = FL.fs * (0.85 + 1.25 * Math.abs(nx)) * (s.far ? 2.3 : 1);
  return flatText(s.text, mx + nx * d, my + ny * d, opts);
}
export function drawFlat(spec) {
  flat.innerHTML = ''; flat.removeAttribute('hidden');
  setView({ allowRotate: false });
  const xs = spec.outline.map(p => p[0]), ys = spec.outline.map(p => p[1]);
  const minX = Math.min(...xs), minY = Math.min(...ys), W = Math.max(...xs) - minX, H = Math.max(...ys) - minY;
  const pad = Math.max(W, H) * 0.25 + 2.4;
  flat.setAttribute('viewBox', `${minX - pad} ${minY - pad} ${W + 2 * pad} ${H + 2 * pad}`);
  const fs = Math.max(W, H, 4) * 0.075 + 0.2;
  FL = { fs, sw: fs * 0.12, spec, parts: [], dash: `${fs * 0.3} ${fs * 0.22}` };
  spec.parts.forEach(p => {
    const el = svgEl('polygon', { points: ptsStr(partPts(p)), class: 'part' });
    if (spec.dashed) { el.setAttribute('stroke', 'currentColor'); el.setAttribute('stroke-width', FL.sw * 0.7); el.setAttribute('stroke-dasharray', FL.dash); el.setAttribute('stroke-opacity', 0.55); }
    FL.parts.push(el);
  });
  if (spec.grid) spec.parts.filter(p => p.kind === 'rect').forEach(p => innerGrid(p, flat));
  svgEl('polygon', { points: ptsStr(spec.outline), class: 'outline', 'stroke-width': FL.sw });
  (spec.heights || []).forEach(h => {
    svgEl('line', { x1: h.a[0], y1: h.a[1], x2: h.b[0], y2: h.b[1], class: 'dash', 'stroke-width': FL.sw * 0.8, 'stroke-dasharray': FL.dash });
    const vert = Math.abs(h.b[0] - h.a[0]) < Math.abs(h.b[1] - h.a[1]);
    if (h.foot) { const s = fs * 0.45; svgEl('polyline', { points: ptsStr([[h.b[0], h.b[1] - s], [h.b[0] + s, h.b[1] - s], [h.b[0] + s, h.b[1]]]), class: 'dash', 'stroke-width': FL.sw * 0.6 }); }
    const mx = (h.a[0] + h.b[0]) / 2, my = (h.a[1] + h.b[1]) / 2;
    flatText(h.text, vert ? mx + fs * 1.7 : mx, vert ? my : my + fs * 0.9);
  });
  (spec.sides || []).forEach(s => sideLabel(s));
  // Måttlinjer utanför figuren (för höjder som annars skulle hamna inne i delarna).
  (spec.dims || []).forEach(dm => {
    const x = dm.side === 'left' ? minX - fs * 1.4 : minX + W + fs * 1.4, t = fs * 0.35;
    (dm.guides || []).forEach(([gx, gy]) => svgEl('line', { x1: gx, y1: gy, x2: x, y2: gy, class: 'dash', 'stroke-width': FL.sw * 0.5, 'stroke-dasharray': FL.dash }));
    svgEl('line', { x1: x, y1: dm.y1, x2: x, y2: dm.y2, class: 'dash', 'stroke-width': FL.sw * 0.8 });
    svgEl('line', { x1: x - t, y1: dm.y1, x2: x + t, y2: dm.y1, class: 'dash', 'stroke-width': FL.sw * 0.8 });
    svgEl('line', { x1: x - t, y1: dm.y2, x2: x + t, y2: dm.y2, class: 'dash', 'stroke-width': FL.sw * 0.8 });
    flatText(dm.text, x + (dm.side === 'left' ? -1 : 1) * fs * 1.9, (dm.y1 + dm.y2) / 2);
  });
  FL.fx = svgEl('g', {});
  // Anpassa vyn efter allt som ritats (figur + etiketter), med lite luft för tips och facit.
  try {
    const bb = flat.getBBox(), m = fs * 1.3;
    if (bb.width > 0) flat.setAttribute('viewBox', `${bb.x - m} ${bb.y - m} ${bb.width + 2 * m} ${bb.height + 2 * m}`);
  } catch (e) {}
}
export function innerGrid(R, parent = FL.fx) {
  for (let x = 1; x < R.w; x++) svgEl('line', { x1: R.x + x, y1: R.y, x2: R.x + x, y2: R.y + R.h, class: 'gridl', 'stroke-width': FL.sw * 0.5 }, parent);
  for (let y = 1; y < R.h; y++) svgEl('line', { x1: R.x, y1: R.y + y, x2: R.x + R.w, y2: R.y + y, class: 'gridl', 'stroke-width': FL.sw * 0.5 }, parent);
}
export function colorParts(withNames = false) {
  const cls = ['pA', 'pB', 'pC'];
  FL.parts.forEach((el, i) => el.classList.add(cls[i % 3]));
  if (withNames) FL.spec.parts.forEach((p, i) => { const [x, y] = centroid(partPts(p)); flatText(`Del ${i + 1}`, x, y, { parent: FL.fx, size: 0.8, cls: 'pop' }); });
}
export function partAreaLabels() {
  FL.spec.parts.forEach((p, i) => { const [x, y] = centroid(partPts(p)); flatText(String(partArea(p)), x, y, { parent: FL.fx, size: 1.25, cls: 'pop', delay: 300 + i * 450 }); });
}
export function traceSides(sides, step = 380) {
  sides.forEach((s, i) => {
    const p = svgEl('path', { d: `M${s.a[0]},${s.a[1]}L${s.b[0]},${s.b[1]}`, pathLength: 1, class: 'trace', 'stroke-width': FL.sw * 2.4 }, FL.fx);
    p.style.animationDelay = (200 + i * step) + 'ms';
  });
}
export function rectRows(R, step = 380) {
  for (let y = 0; y < R.h; y++) {
    const d = 200 + y * step;
    const r = svgEl('rect', { x: R.x, y: R.y + y, width: R.w, height: 1, class: 'rowfill pop' }, FL.fx); r.style.animationDelay = d + 'ms';
    flatText(String(R.w * (y + 1)), R.x + R.w + FL.fs * 1.5, R.y + y + 0.5, { parent: FL.fx, size: 0.8, cls: 'pop', delay: d });
  }
}
export function triBox(T) {
  const xs = T.pts.map(p => p[0]), ys = T.pts.map(p => p[1]);
  const x = Math.min(...xs), y = Math.min(...ys);
  svgEl('rect', { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y, class: 'ghost', 'stroke-width': FL.sw * 0.8, 'stroke-dasharray': FL.dash }, FL.fx);
}
