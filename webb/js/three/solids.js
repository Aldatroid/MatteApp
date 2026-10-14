/* ============ Byggstenar: kroppar ============ */
import { cssVar } from '../util.js';
import { THREE, G, C, FACE_COLORS, has3D, content, stdMat, track, v3, addLabel, anchorAt, later, tween, ease, setView } from './scene.js';
import { stoneSeed, stoneCube } from './stones.js';

export function boxPoly(w, h, d) {
  const x = w / 2, y = h / 2, z = d / 2;
  return { V: [[-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z], [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z]], F: [[0, 3, 2, 1], [4, 5, 6, 7], [0, 4, 7, 3], [1, 2, 6, 5], [3, 7, 6, 2], [0, 1, 5, 4]] };
}
export function prismPoly(n, r, h, rot = 0) {
  const V = [];
  for (let k = 0; k < 2; k++) for (let i = 0; i < n; i++) { const a = rot + i * 2 * Math.PI / n; V.push([r * Math.cos(a), k ? h / 2 : -h / 2, r * Math.sin(a)]); }
  const F = [[...Array(n).keys()], [...Array(n).keys()].map(i => n + i)];
  for (let i = 0; i < n; i++) F.push([i, (i + 1) % n, n + (i + 1) % n, n + i]);
  return { V, F };
}
export function pyramidPoly(n, r, h, rot = 0) {
  const V = [];
  for (let i = 0; i < n; i++) { const a = rot + i * 2 * Math.PI / n; V.push([r * Math.cos(a), -h / 2, r * Math.sin(a)]); }
  V.push([0, h / 2, 0]);
  const F = [[...Array(n).keys()]];
  for (let i = 0; i < n; i++) F.push([i, (i + 1) % n, n]);
  return { V, F };
}
export const SOLIDS = {
  kub: { name: 'kub', art: 'en', poly: () => boxPoly(2.2, 2.2, 2.2), f: 6, e: 12, v: 8, clue: 'Alla sex sidor är lika stora kvadrater.' },
  ratblock: { name: 'rätblock', art: 'ett', poly: () => boxPoly(3.2, 1.6, 1.9), f: 6, e: 12, v: 8, clue: 'Sidorna är rektanglar, som en skokartong.' },
  pyramid: { name: 'pyramid', art: 'en', poly: () => pyramidPoly(4, 1.65, 2.3, Math.PI / 4), f: 5, e: 8, v: 5, clue: 'Fyrkantig botten och trianglar som möts i en spets.' },
  tripyr: { name: 'tresidig pyramid', art: 'en', poly: () => pyramidPoly(3, 1.6, 2.2, -Math.PI / 2), f: 4, e: 6, v: 4, clue: 'Bara trianglar, fyra stycken. Botten är också en triangel.' },
  triprisma: { name: 'tresidigt prisma', art: 'ett', poly: () => prismPoly(3, 1.3, 3.0, 0), rotZ: Math.PI / 2, y: -0.33, f: 5, e: 9, v: 6, clue: 'Två likadana trianglar med tre rektanglar emellan, som ett tält.' },
  hexprisma: { name: 'sexsidigt prisma', art: 'ett', poly: () => prismPoly(6, 1.25, 2.2, 0), f: 8, e: 18, v: 12, clue: 'Två sexhörningar med rektanglar runt om, som en blyertspenna.' },
  klot: { name: 'klot', art: 'ett', curved: 'sphere', clue: 'Runt åt alla håll, som en boll.' },
  cylinder: { name: 'cylinder', art: 'en', curved: 'cyl', clue: 'Två cirklar och en böjd yta emellan, som en burk.' },
  kon: { name: 'kon', art: 'en', curved: 'cone', clue: 'En rund botten och en spets, som en glasstrut.' },
};
export const POLY_IDS = ['kub', 'ratblock', 'pyramid', 'tripyr', 'triprisma', 'hexprisma'];
export const WHAT = { f: 'sidoytor', e: 'kanter', v: 'hörn' };

export function rod(A, B, r, mat) {
  const m = new THREE.Mesh(G.rod, mat);
  m.scale.set(r, A.distanceTo(B), r);
  m.position.copy(A).add(B).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), B.clone().sub(A).normalize());
  return m;
}
export function polyObject(P, color, parent) {
  const g = new THREE.Group(); parent.add(g);
  const matOpts = { flatShading: true, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 };
  const base = stdMat(color, matOpts);
  const o = { group: g, base, matOpts, faces: [], edges: [], verts: [], _fm: [], _he: null };
  for (const loop0 of P.F) {
    const pts = loop0.map(i => v3(P.V[i]));
    const cen = pts.reduce((s, p) => s.add(p), new THREE.Vector3()).multiplyScalar(1 / pts.length);
    let n = pts[1].clone().sub(pts[0]).cross(pts[2].clone().sub(pts[0])).normalize();
    let loop = loop0;
    if (n.dot(cen) < 0) { n.negate(); loop = [...loop0].reverse(); }
    const pos = [];
    for (let k = 1; k < loop.length - 1; k++) pos.push(...P.V[loop[0]], ...P.V[loop[k]], ...P.V[loop[k + 1]]);
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.computeVertexNormals(); track(geo);
    const mesh = new THREE.Mesh(geo, base); g.add(mesh);
    o.faces.push({ mesh, n, cen });
  }
  o.edgeMat = stdMat(cssVar('--edge3d'));
  const seen = new Set();
  for (const loop of P.F) loop.forEach((i, k) => {
    const j = loop[(k + 1) % loop.length]; const key = i < j ? i + '-' + j : j + '-' + i;
    if (seen.has(key)) return; seen.add(key);
    const A = v3(P.V[i]), B = v3(P.V[j]);
    const mesh = rod(A, B, 0.022, o.edgeMat); g.add(mesh);
    o.edges.push({ mesh, mid: A.clone().add(B).multiplyScalar(0.5) });
  });
  const vMat = stdMat(C.coral);
  for (const p of P.V) { const mesh = new THREE.Mesh(G.ball, vMat); mesh.scale.setScalar(0.11); mesh.position.set(...p); mesh.visible = false; g.add(mesh); o.verts.push({ mesh, pos: v3(p) }); }
  return o;
}
export function faceMat(o, i) { return o._fm[i] ||= stdMat(FACE_COLORS[i % FACE_COLORS.length], o.matOpts); }
export function hlEdge(o) { return o._he ||= stdMat('#FFB800'); }
export function setRodR(m, r) { m.scale.x = r; m.scale.z = r; }
export function highlightSolid(o, what) {
  o.faces.forEach((f, i) => f.mesh.material = what === 'f' ? faceMat(o, i) : o.base);
  o.edges.forEach(e => { const on = what === 'e'; e.mesh.material = on ? hlEdge(o) : o.edgeMat; setRodR(e.mesh, on ? 0.055 : 0.022); });
  o.verts.forEach(v => v.mesh.visible = what === 'v');
}
export function countSequence(o, what, step = 380, startDelay = 250) {
  highlightSolid(o, null);
  const items = what === 'f' ? o.faces : what === 'e' ? o.edges : o.verts;
  const made = [];
  items.forEach((it, idx) => later(startDelay + idx * step, () => {
    if (what === 'f') it.mesh.material = faceMat(o, idx);
    else if (what === 'e') { it.mesh.material = hlEdge(o); setRodR(it.mesh, 0.055); }
    else it.mesh.visible = true;
    const pos = what === 'f' ? it.cen.clone().add(it.n.clone().multiplyScalar(0.18)) : (what === 'e' ? it.mid : it.pos).clone().multiplyScalar(what === 'e' ? 1.14 : 1.18);
    const nrm = what === 'f' ? it.n : (what === 'e' ? it.mid : it.pos).clone().normalize();
    made.push(addLabel(String(idx + 1), anchorAt(o.group, pos.x, pos.y, pos.z), { cls: 'num', normal: nrm }));
  }));
  return { ms: startDelay + items.length * step, labels: made };
}
export function buildSolid(id) {
  const def = SOLIDS[id];
  if (!has3D) return null;
  const holder = new THREE.Group(); content.add(holder);
  if (def.curved) {
    let geo;
    if (def.curved === 'sphere') geo = new THREE.SphereGeometry(1.4, 48, 32);
    else if (def.curved === 'cyl') geo = new THREE.CylinderGeometry(1.15, 1.15, 2.4, 56);
    else geo = new THREE.ConeGeometry(1.35, 2.5, 56);
    track(geo);
    holder.add(new THREE.Mesh(geo, stdMat(C.solid, { roughness: 0.45 })));
    return { group: holder, curved: true };
  }
  const o = polyObject(def.poly(), C.solid, holder);
  if (def.rotZ) o.group.rotation.z = def.rotZ;
  if (def.y) o.group.position.y = def.y;
  return o;
}
export function solidView(spin = true) { setView({ dist: 9.5, elev: 0.32, rotY: 0.7, rotX: 0.18, autoSpin: spin, clampX: [-0.7, 0.9] }); }

/* ============ Byggstenar: volym ============ */
export function buildBlock(l, w, h, s = 1) {
  const layers = [];
  const ox = -(l - 1) / 2 * s, oz = -(w - 1) / 2 * s, oy = -(h - 1) / 2 * s;
  const root = new THREE.Group(); content.add(root);
  for (let y = 0; y < h; y++) {
    const L = new THREE.Group(); L.position.y = oy + y * s; root.add(L); layers.push(L);
    for (let x = 0; x < l; x++) for (let z = 0; z < w; z++) {
      const m = stoneCube(stoneSeed(x, y, z), y % 2 ? 'alt' : 'base'); m.scale.setScalar(0.95 * s); m.position.set(ox + x * s, 0, oz + z * s); L.add(m);
    }
  }
  return { root, layers, oy, s };
}
export function explodeLayers(B, l, w, withLabels = true) {
  const gap = 0.7 * B.s; const made = [];
  B.layers.forEach((L, y) => {
    const y0 = L.position.y, y1 = B.oy + y * B.s + (y - (B.layers.length - 1) / 2) * gap;
    tween(600, p => L.position.y = y0 + (y1 - y0) * p, { e: ease.inOut });
    if (withLabels) later(650 + y * 250, () => made.push(addLabel(`${l} · ${w} = ${l * w}`, anchorAt(L, (l / 2) * B.s + 1.1, 0, 0), { cls: y === 0 ? 'sun' : '' })));
  });
  return made;
}
