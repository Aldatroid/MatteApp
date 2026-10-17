/* ============ Föremålen i museet (platshållare byggda i kod) ============
   Varje byggfunktion returnerar { root, parts }: root är hela modellen, parts[i] är gruppen för del i
   (samma ordning som parts i catalog.js). Allt som inte ligger i en del (t.ex. stålställningen under
   ett skelett) syns alltid. Modellen står på y = 0 (toppen av sin sockel) med framsidan mot +z.
   Byts senare mot riktiga GLB-modeller, se docs/museum.md. */
import { THREE } from '../three/scene.js';

const V = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V(0, 1, 0);

/* ---------- material och texturer ---------- */
function canvasTex(w, h, draw, { repeat = null, srgb = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat); }
  return t;
}
// brus i en canvas (för sten, ben och liknande)
function speckle(g, w, h, base, spots, n = 900, size = 3) {
  g.fillStyle = base; g.fillRect(0, 0, w, h);
  for (let i = 0; i < n; i++) {
    g.fillStyle = spots[i % spots.length]; g.globalAlpha = 0.08 + Math.random() * 0.18;
    const r = Math.random() * size + 0.5; g.beginPath(); g.arc(Math.random() * w, Math.random() * h, r, 0, 7); g.fill();
  }
  g.globalAlpha = 1;
}
const std = (o) => new THREE.MeshStandardMaterial({ roughness: 0.75, metalness: 0, ...o });
let M = null;
export function materials() {
  if (M) return M;
  const boneTex = canvasTex(256, 256, (g, w, h) => speckle(g, w, h, '#cdb894', ['#7a6040', '#efe2c4', '#9c8158'], 1400, 4), { repeat: [2, 2] });
  const stoneTex = canvasTex(256, 256, (g, w, h) => speckle(g, w, h, '#8d8478', ['#3e3832', '#b9b0a3', '#6b6258'], 1800, 5), { repeat: [1, 1] });
  M = {
    bone: std({ color: 0xffffff, map: boneTex, roughness: 0.8 }),
    fossil: std({ color: 0xb59a74, map: boneTex, roughness: 0.85 }),
    stone: std({ color: 0xffffff, map: stoneTex, roughness: 0.95 }),
    darkStone: std({ color: 0x5d5650, map: stoneTex, roughness: 0.9 }),
    sandstone: std({ color: 0xd7b98a, map: stoneTex, roughness: 0.9 }),
    steel: std({ color: 0x2a2c30, metalness: 0.8, roughness: 0.4 }),
    iron: std({ color: 0x5b5d61, metalness: 0.85, roughness: 0.45 }),
    gold: std({ color: 0xe0ac3c, metalness: 1, roughness: 0.3 }),
    brass: std({ color: 0xc89b4a, metalness: 1, roughness: 0.35 }),
    silver: std({ color: 0xd8dde3, metalness: 1, roughness: 0.25 }),
    lapis: std({ color: 0x2a4fa8, roughness: 0.4 }),
    faience: std({ color: 0x2bb3a6, roughness: 0.3 }),
    alabaster: std({ color: 0xe9dcc2, roughness: 0.55 }),
    ivory: std({ color: 0xeee2c8, roughness: 0.5 }),
    wood: std({ color: 0x6b4426, roughness: 0.7 }),
    darkWood: std({ color: 0x3a2516, roughness: 0.6 }),
    leather: std({ color: 0x4a2c1a, roughness: 0.8 }),
    red: std({ color: 0xa8322a, roughness: 0.6 }),
    black: std({ color: 0x1c1a1a, roughness: 0.6 }),
    yellow: std({ color: 0xd9a531, roughness: 0.6 }),
    shell: std({ color: 0xf2e6d4, roughness: 0.45 }),
    amber: new THREE.MeshPhysicalMaterial({ color: 0xff9a1f, roughness: 0.15, transparent: true, opacity: 0.82, emissive: 0x6b2a00, emissiveIntensity: 0.5 }),
    ghost: new THREE.MeshBasicMaterial({ color: 0xb4d2ff, transparent: true, opacity: 0.27, depthWrite: false }),
  };
  return M;
}

/* ---------- små byggstenar ---------- */
function mesh(geo, mat, parent, pos, rot, scale) {
  const m = new THREE.Mesh(geo, mat);
  if (pos) m.position.set(...pos);
  if (rot) m.rotation.set(...rot);
  if (scale) typeof scale === 'number' ? m.scale.setScalar(scale) : m.scale.set(...scale);
  parent.add(m); return m;
}
// ben (kapsel) mellan två punkter
function bone(parent, a, b, r, mat) {
  const len = a.distanceTo(b);
  const m = new THREE.Mesh(new THREE.CapsuleGeometry(r, Math.max(0.001, len), 3, 8), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(UP, b.clone().sub(a).normalize());
  parent.add(m); return m;
}
// rör längs en kurva som smalnar av: radius(t) med t 0..1
function taperTube(parent, points, radius, mat, segs = 48, radial = 10) {
  const curve = new THREE.CatmullRomCurve3(points);
  const geo = new THREE.TubeGeometry(curve, segs, 1, radial, false);
  const pos = geo.attributes.position, P = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    curve.getPointAt(i / segs, P); const r = radius(i / segs);
    for (let j = 0; j <= radial; j++) {
      const k = i * (radial + 1) + j; v.fromBufferAttribute(pos, k).sub(P).multiplyScalar(r).add(P); pos.setXYZ(k, v.x, v.y, v.z);
    }
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, mat); parent.add(m); return m;
}
// platt form (sidoprofil) som extruderas i z och centreras
function extrude(shape, depth, bevel = 0.03) {
  const g = new THREE.ExtrudeGeometry(shape, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 16 });
  g.translate(0, 0, -depth / 2); return g;
}
const shapeOf = (pts, holes = []) => {
  const s = new THREE.Shape(pts.map(p => new THREE.Vector2(p[0], p[1])));
  holes.forEach(h => { const p = new THREE.Path(); typeof h[0] === 'number' ? p.absellipse(h[0], h[1], h[2], h[3] ?? h[2], 0, Math.PI * 2, false) : p.setFromPoints(h.map(q => new THREE.Vector2(q[0], q[1]))); s.holes.push(p); });
  return s;
};
const smooth = pts => new THREE.SplineCurve(pts.map(p => new THREE.Vector2(p[0], p[1]))).getPoints(pts.length * 8).map(p => [p.x, p.y]);
function rod(parent, x, z, y0, y1, M) { return bone(parent, V(x, y0, z), V(x, y1, z), 0.035, M.steel); }
// kotor längs en kurva (med taggar uppåt och vid behov nedåt)
function vertebrae(parent, curve, n, t0, t1, r, spine, chevron, M, mat = M.bone) {
  for (let i = 0; i < n; i++) {
    const t = t0 + (t1 - t0) * (i + 0.5) / n, p = curve.getPointAt(t), tan = curve.getTangentAt(t);
    const s = typeof r === 'function' ? r(i / n) : r;
    const c = new THREE.Mesh(new THREE.CylinderGeometry(s, s * 0.95, s * 1.5, 10), mat);
    c.position.copy(p); c.quaternion.setFromUnitVectors(UP, tan); parent.add(c);
    const h = typeof spine === 'function' ? spine(i / n) : spine;
    if (h > 0.01) { const sp = new THREE.Mesh(new THREE.BoxGeometry(s * 0.9, h, s * 0.35), mat); sp.position.copy(p).add(V(-0.05, s * 0.6 + h / 2, 0)); sp.rotation.z = 0.25; parent.add(sp); }
    const ch = typeof chevron === 'function' ? chevron(i / n) : chevron;
    if (ch > 0.01) { const cv = new THREE.Mesh(new THREE.BoxGeometry(s * 0.6, ch, s * 0.3), mat); cv.position.copy(p).add(V(-0.05, -s * 0.6 - ch / 2, 0)); cv.rotation.z = -0.3; parent.add(cv); }
  }
}
const group = (parent) => { const g = new THREE.Group(); parent.add(g); return g; };
function newModel(nParts) {
  const root = new THREE.Group(); const parts = [];
  for (let i = 0; i < nParts; i++) parts.push(group(root));
  return { root, parts };
}

/* ============ Stora hallen ============ */
function trex(M) {
  const { root, parts } = newModel(9);
  const [skull, neck, back, ribs, pelvis, legL, legR, arms, tail] = parts;
  const sk = new THREE.Group(); root.add(sk);
  // ryggradens kurva från svansspetsen till skallen
  const spine = new THREE.CatmullRomCurve3([V(-7.4, 1.5, 0), V(-5.6, 2.3, 0), V(-3.4, 3.2, 0), V(-1.4, 3.7, 0), V(0, 3.8, 0), V(1.6, 3.7, 0), V(3, 3.35, 0), V(3.9, 3.3, 0), V(4.5, 3.55, 0), V(5.0, 3.95, 0), V(5.35, 4.05, 0)]);
  vertebrae(tail, spine, 22, 0, 0.47, f => 0.08 + f * 0.13, f => 0.08 + f * 0.4, f => f > 0.15 ? 0.1 + f * 0.35 : 0, M);
  vertebrae(back, spine, 11, 0.47, 0.8, 0.22, f => 0.62 - f * 0.25, 0, M);
  vertebrae(neck, spine, 6, 0.8, 0.985, 0.17, 0.12, 0, M);
  // revben
  for (let i = 0; i < 10; i++) {
    const t = 0.5 + i * 0.03, p = spine.getPointAt(t), L = Math.sin((i + 1) / 11 * Math.PI) * 0.9 + 0.75;
    for (const s of [-1, 1]) taperTube(ribs, [V(p.x, p.y - 0.12, s * 0.2), V(p.x + 0.05, p.y - 0.35, s * 0.62), V(p.x + 0.18, p.y - L * 0.7, s * 0.85), V(p.x + 0.35, p.y - L * 1.15, s * 0.5)], t => 0.065 * (1 - t * 0.5), M.bone, 14, 6);
  }
  // bäcken
  const ilium = extrude(shapeOf(smooth([[-1.1, 0.05], [-0.6, 0.35], [0.4, 0.42], [1.05, 0.15], [0.8, -0.25], [-0.8, -0.2]])), 0.09, 0.03);
  for (const s of [-1, 1]) {
    mesh(ilium, M.bone, pelvis, [0, 3.45, s * 0.36]);
    bone(pelvis, V(0.2, 3.2, s * 0.3), V(0.85, 1.8, s * 0.12), 0.09, M.bone);
    bone(pelvis, V(-0.2, 3.2, s * 0.3), V(-0.95, 2.25, s * 0.15), 0.08, M.bone);
  }
  mesh(new THREE.BoxGeometry(0.75, 0.22, 0.28), M.bone, pelvis, [0.95, 1.7, 0]);
  // ben: två steg i olika läge
  const leg = (g, s, dx) => {
    const hip = V(0, 3.2, s * 0.46), knee = V(0.55 + dx, 1.95, s * 0.52), ankle = V(-0.25 + dx * 1.4, 0.75, s * 0.5), foot = V(0.25 + dx * 1.6, 0.14, s * 0.5);
    bone(g, hip, knee, 0.16, M.bone); bone(g, knee, ankle, 0.12, M.bone); bone(g, knee.clone().add(V(-0.05, 0, s * 0.08)), ankle.clone().add(V(0, 0, s * 0.08)), 0.06, M.bone); bone(g, ankle, foot, 0.08, M.bone);
    mesh(new THREE.SphereGeometry(0.2, 12, 10), M.bone, g, [knee.x, knee.y, knee.z]);
    for (const k of [-1, 0, 1]) {
      const tip = foot.clone().add(V(0.62 - Math.abs(k) * 0.12, -0.08, k * 0.2));
      bone(g, foot, tip, 0.055, M.bone);
      mesh(new THREE.ConeGeometry(0.05, 0.18, 8), M.bone, g, [tip.x + 0.08, tip.y - 0.02, tip.z], [0, 0, -Math.PI / 2 - 0.3]);
    }
  };
  leg(legL, -1, 0.35); leg(legR, 1, -0.3);
  // armar (små!)
  for (const s of [-1, 1]) {
    const sh = V(3.35, 2.75, s * 0.42), el = V(3.6, 2.35, s * 0.5), wr = V(3.9, 2.3, s * 0.48);
    bone(arms, sh, el, 0.055, M.bone); bone(arms, el, wr, 0.045, M.bone);
    bone(arms, wr, wr.clone().add(V(0.15, -0.08, s * 0.03)), 0.02, M.bone); bone(arms, wr, wr.clone().add(V(0.12, -0.14, -s * 0.02)), 0.02, M.bone);
    bone(arms, V(3.25, 3.0, s * 0.35), sh, 0.07, M.bone);
  }
  // skalle med hål (ögonhåla och fönster) och käke
  const head = new THREE.Group(); head.position.set(5.2, 3.95, 0); head.rotation.z = -0.12; skull.add(head);
  const sProfile = smooth([[-0.15, 0.25], [0.05, 0.62], [0.55, 0.66], [1.15, 0.48], [1.65, 0.24], [1.78, 0.02], [1.7, -0.12], [0.9, -0.16], [0.3, -0.18], [-0.1, -0.1]]);
  const sk1 = extrude(shapeOf(sProfile, [[0.35, 0.36, 0.13, 0.15], [0.92, 0.22, 0.3, 0.13], [0.06, 0.12, 0.09, 0.12]]), 0.55, 0.06);
  mesh(sk1, M.bone, head);
  const jaw = new THREE.Group(); jaw.position.set(0, -0.18, 0); jaw.rotation.z = -0.2; head.add(jaw);
  mesh(extrude(shapeOf(smooth([[0, 0], [0.8, -0.02], [1.62, 0.02], [1.55, -0.14], [0.9, -0.24], [0.25, -0.34], [-0.05, -0.2]]), [[0.35, -0.16, 0.14, 0.06]]), 0.5, 0.05), M.bone, jaw);
  const tooth = new THREE.ConeGeometry(0.035, 0.16, 6);
  for (let i = 0; i < 9; i++) {
    const x = 0.55 + i * 0.13;
    for (const s of [-1, 1]) {
      mesh(tooth, M.ivory, head, [x, -0.22, s * 0.25], [Math.PI, 0, 0]);
      if (i < 8) mesh(tooth, M.ivory, jaw, [x + 0.05, 0.06, s * 0.23]);
    }
  }
  // stålställning (syns alltid, även innan benen är hittade)
  rod(sk, 0, 0, 0, 3.75, M); rod(sk, 2.6, 0, 0, 3.45, M); rod(sk, -3.6, 0, 0, 3.15, M); rod(sk, 4.8, 0, 0, 3.75, M);
  bone(sk, V(-3.6, 3.15, 0), V(4.8, 3.75, 0), 0.03, M.steel);
  root.scale.setScalar(0.92);
  return { root, parts };
}

function moai(M) {
  const { root, parts } = newModel(1); const g = parts[0];
  const box = (w, h, d, x, y, z, mat = M.darkStone, r) => mesh(new THREE.BoxGeometry(w, h, d), mat, g, [x, y, z], r);
  const torso = mesh(new THREE.CylinderGeometry(0.95, 1.1, 1.4, 4, 1), M.darkStone, g, [0, 0.7, 0], [0, Math.PI / 4, 0]); torso.scale.set(1, 1, 0.65);
  box(1.25, 2.3, 1.0, 0, 2.55, -0.05);             // huvud
  box(1.32, 0.32, 0.5, 0, 3.15, 0.33);             // ögonbryn
  box(0.36, 0.3, 0.1, -0.3, 2.85, 0.47, M.black);  // ögonhålor
  box(0.36, 0.3, 0.1, 0.3, 2.85, 0.47, M.black);
  const nose = new THREE.Shape([new THREE.Vector2(0, 0.95), new THREE.Vector2(0.38, 0), new THREE.Vector2(0, 0)]);
  mesh(extrude(nose, 0.42, 0.04), M.darkStone, g, [0, 2.0, 0.42], [0, -Math.PI / 2, 0]);
  box(0.8, 0.14, 0.35, 0, 1.78, 0.42);             // läppar
  box(0.7, 0.35, 0.5, 0, 1.55, 0.3);               // haka
  box(0.16, 1.3, 0.35, -0.7, 2.45, -0.05); box(0.16, 1.3, 0.35, 0.7, 2.45, -0.05); // öron
  mesh(new THREE.CylinderGeometry(0.6, 0.65, 0.55, 20), std({ color: 0x8a3b24, roughness: 0.95 }), g, [0, 3.95, -0.1]); // pukao (hatten)
  return { root, parts };
}

// grova världsdelar i (longitud, latitud) för jordgloben
const LAND = [
  [[-168, 65], [-140, 70], [-95, 72], [-80, 62], [-60, 52], [-75, 40], [-81, 25], [-97, 18], [-105, 20], [-118, 33], [-125, 48], [-150, 60]],
  [[-55, 82], [-25, 80], [-20, 70], [-45, 60], [-55, 70]],
  [[-80, 10], [-62, 10], [-50, 0], [-35, -7], [-40, -22], [-58, -38], [-68, -55], [-75, -45], [-71, -18], [-81, -5]],
  [[-17, 21], [-6, 35], [10, 37], [32, 31], [43, 12], [51, 12], [40, -15], [32, -28], [20, -35], [12, -18], [9, 4], [-8, 5], [-17, 14]],
  [[-10, 36], [-9, 43], [-2, 48], [-5, 58], [10, 63], [25, 71], [60, 70], [100, 77], [140, 72], [180, 68], [170, 60], [140, 52], [130, 40], [120, 30], [108, 20], [105, 10], [98, 15], [92, 22], [80, 8], [72, 20], [57, 25], [50, 30], [35, 36], [27, 40], [12, 44], [3, 43]],
  [[114, -22], [130, -12], [142, -11], [153, -26], [147, -39], [135, -35], [115, -34]],
];
function globe(M) {
  const { root, parts } = newModel(1); const g = parts[0];
  const tex = canvasTex(1024, 512, (c, w, h) => {
    const grd = c.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#1d4a5c'); grd.addColorStop(0.5, '#2a6a78'); grd.addColorStop(1, '#1d4a5c');
    c.fillStyle = grd; c.fillRect(0, 0, w, h);
    const X = lon => (lon + 180) / 360 * w, Y = lat => (90 - lat) / 180 * h;
    c.fillStyle = '#d8c48f'; c.strokeStyle = '#7a6438'; c.lineWidth = 2;
    for (const poly of LAND) { c.beginPath(); poly.forEach(([lo, la], i) => i ? c.lineTo(X(lo), Y(la)) : c.moveTo(X(lo), Y(la))); c.closePath(); c.fill(); c.stroke(); }
    c.fillRect(0, Y(-70), w, h - Y(-70));
    c.strokeStyle = 'rgba(240,210,140,.35)'; c.lineWidth = 1.5;
    for (let lo = -180; lo <= 180; lo += 30) { c.beginPath(); c.moveTo(X(lo), 0); c.lineTo(X(lo), h); c.stroke(); }
    for (let la = -60; la <= 60; la += 30) { c.beginPath(); c.moveTo(0, Y(la)); c.lineTo(w, Y(la)); c.stroke(); }
  });
  const tilt = new THREE.Group(); tilt.position.y = 1.85; tilt.rotation.z = 0.41; g.add(tilt);
  mesh(new THREE.SphereGeometry(0.9, 48, 32), std({ map: tex, roughness: 0.45 }), tilt).rotation.y = 2.2;
  mesh(new THREE.TorusGeometry(0.98, 0.035, 8, 64, Math.PI * 1.2), M.brass, tilt, [0, 0, 0], [0, 0, -Math.PI * 0.1]);
  bone(tilt, V(0, -1.02, 0), V(0, 1.02, 0), 0.02, M.brass);
  mesh(new THREE.TorusGeometry(1.0, 0.05, 8, 64), M.brass, g, [0, 1.85, 0], [Math.PI / 2, 0, 0]);
  mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.9, 12), M.darkWood, g, [0, 0.45, 0]);
  for (let i = 0; i < 3; i++) { const a = i * Math.PI * 2 / 3; bone(g, V(0, 0.75, 0), V(Math.cos(a) * 0.55, 0.02, Math.sin(a) * 0.55), 0.04, M.darkWood); }
  for (let i = 0; i < 4; i++) { const a = i * Math.PI / 2; bone(g, V(Math.cos(a) * 1.0, 1.85, Math.sin(a) * 1.0), V(0, 0.85, 0), 0.025, M.brass); }
  return { root, parts };
}

/* ============ Egyptiska salen ============ */
// människoformad kista: en cylinder längs x som formas om (huvud, axlar, fötter)
function podGeometry(len, top) {
  const g = new THREE.CylinderGeometry(1, 1, len, 36, 40, false); g.rotateZ(Math.PI / 2);
  const p = g.attributes.position, v = new THREE.Vector3();
  const prof = t => { // t=0 fötter, t=1 huvud
    if (t > 0.86) return 0.36 + 0.06 * Math.sin((t - 0.86) / 0.14 * Math.PI) - (t > 0.97 ? (t - 0.97) * 6 : 0);
    if (t > 0.72) return 0.36 + (0.86 - t) / 0.14 * 0.12;
    return 0.48 - (0.72 - t) / 0.72 * 0.22 + (t < 0.06 ? -0.06 * (1 - t / 0.06) : 0);
  };
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i); const t = v.x / len + 0.5, r = prof(t);
    let y = v.y * r, z = v.z * r * 1.15;
    if (top) y = Math.max(0, y) * 0.75; else y = Math.min(0, y) * 0.7;
    if (top && t < 0.08 && t > 0.0) y += 0.12 * Math.max(0, v.y); // fötterna
    p.setXYZ(i, v.x, y, z);
  }
  g.computeVertexNormals(); return g;
}
function sarcophagus(M) {
  const { root, parts } = newModel(2); const [box, lid] = parts;
  const len = 2.4;
  const sideTex = canvasTex(512, 256, (c, w, h) => {
    c.fillStyle = '#1f2f6b'; c.fillRect(0, 0, w, h);
    for (let i = 0; i < 18; i++) { c.fillStyle = i % 2 ? '#d9a531' : '#b8432f'; c.fillRect(i * w / 18, h * 0.42, w / 36, h * 0.16); }
    c.fillStyle = '#d9a531'; c.fillRect(0, h * 0.4, w, 4); c.fillRect(0, h * 0.58, w, 4);
  });
  const lidTex = canvasTex(1024, 512, (c, w, h) => {
    // u = runt kistan, v = längs (0 fötter, 1 huvud)
    c.fillStyle = '#d4a23c'; c.fillRect(0, 0, w, h);
    const band = (y0, y1, cols) => { for (let i = 0; i < 40; i++) { c.fillStyle = cols[i % cols.length]; c.fillRect(i * w / 40, y0 * h, w / 40, (y1 - y0) * h); } };
    band(0.06, 0.12, ['#1f2f6b', '#d4a23c', '#b8432f', '#d4a23c']);  // halskrage
    band(0.14, 0.19, ['#2bb3a6', '#1f2f6b']);
    band(0.21, 0.25, ['#b8432f', '#d4a23c']);
    for (let i = 0; i < 24; i++) { c.fillStyle = i % 2 ? '#1f2f6b' : '#d4a23c'; c.fillRect(i * w / 24, 0, w / 48, h * 0.06); } // huvudduk
    c.fillStyle = '#1f2f6b'; for (let x = 0; x < 6; x++) c.fillRect(w * (0.17 + x * 0.03), h * 0.35, w * 0.012, h * 0.55); // hieroglyfspalter
    c.fillStyle = '#7a4a1a'; for (let i = 0; i < 70; i++) c.fillRect(w * (0.17 + (i % 6) * 0.03 - 0.004), h * (0.37 + Math.floor(i / 6) * 0.045), w * 0.02, h * 0.012);
  });
  lidTex.wrapS = THREE.RepeatWrapping; lidTex.flipY = false;
  mesh(new THREE.BoxGeometry(len + 0.1, 0.25, 1.25), M.darkWood, root, [0, 0.125, 0]); // bår
  const b = mesh(podGeometry(len, false), std({ map: sideTex, roughness: 0.5 }), box, [0, 0.7, 0]);
  const l = mesh(podGeometry(len, true), std({ map: lidTex, roughness: 0.45, metalness: 0.15 }), lid, [0, 0.7, 0]);
  // ansiktet (guld) vid huvudänden
  mesh(new THREE.SphereGeometry(0.2, 20, 16), M.gold, lid, [len * 0.42, 0.98, 0], null, [1, 0.7, 0.9]);
  mesh(new THREE.BoxGeometry(0.03, 0.04, 0.09), M.black, lid, [len * 0.43, 1.12, 0.07]); mesh(new THREE.BoxGeometry(0.03, 0.04, 0.09), M.black, lid, [len * 0.43, 1.12, -0.07]);
  mesh(new THREE.BoxGeometry(0.22, 0.06, 0.06), M.lapis, lid, [len * 0.3, 1.0, 0], [0, 0, 0.3]); // skägg
  return { root, parts };
}
function canopic(M) {
  const { root, parts } = newModel(4);
  const jar = new THREE.LatheGeometry([[0, 0], [0.13, 0], [0.17, 0.08], [0.2, 0.25], [0.19, 0.42], [0.15, 0.52], [0.13, 0.55], [0, 0.55]].map(p => new THREE.Vector2(p[0], p[1])), 28);
  const head = new THREE.SphereGeometry(0.14, 20, 14);
  const lids = [
    g => { mesh(head, M.alabaster, g, [0, 0.66, 0]); mesh(new THREE.CylinderGeometry(0.16, 0.19, 0.18, 20), M.lapis, g, [0, 0.62, -0.03]); mesh(new THREE.BoxGeometry(0.08, 0.035, 0.02), M.black, g, [0, 0.69, 0.13]); },
    g => { mesh(head, M.alabaster, g, [0, 0.67, 0]); mesh(new THREE.BoxGeometry(0.12, 0.09, 0.12), M.alabaster, g, [0, 0.63, 0.12]); mesh(new THREE.SphereGeometry(0.16, 16, 10), M.lapis, g, [0, 0.68, -0.05], null, [1, 0.9, 0.8]); },
    g => { mesh(head, M.black, g, [0, 0.66, 0]); mesh(new THREE.ConeGeometry(0.06, 0.2, 10), M.black, g, [0, 0.64, 0.15], [Math.PI / 2, 0, 0]); for (const s of [-1, 1]) mesh(new THREE.ConeGeometry(0.04, 0.17, 6), M.black, g, [s * 0.07, 0.83, 0]); },
    g => { mesh(head, M.alabaster, g, [0, 0.67, 0]); mesh(new THREE.ConeGeometry(0.04, 0.1, 8), M.yellow, g, [0, 0.64, 0.15], [Math.PI / 2 + 0.4, 0, 0]); mesh(new THREE.SphereGeometry(0.15, 16, 10), M.lapis, g, [0, 0.69, -0.04], null, [1, 0.8, 0.9]); },
  ];
  parts.forEach((g, i) => { g.position.x = -1.05 + i * 0.7; mesh(jar, M.alabaster, g); mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.03, 24), M.gold, g, [0, 0.27, 0]); lids[i](g); });
  return { root, parts };
}
function pyramid(M) {
  const { root, parts } = newModel(1); const g = parts[0];
  const tex = canvasTex(256, 256, (c, w, h) => { speckle(c, w, h, '#d9bd88', ['#a9884f', '#efe0bb'], 600, 3); c.strokeStyle = 'rgba(90,60,25,.45)'; c.lineWidth = 2; for (let y = 0; y < h; y += 16) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); for (let x = (y / 16 % 2) * 12; x < w; x += 24) { c.beginPath(); c.moveTo(x, y); c.lineTo(x, y + 16); c.stroke(); } } });
  mesh(new THREE.BoxGeometry(1.9, 0.08, 1.9), std({ color: 0xc9a46a, roughness: 0.95 }), g, [0, 0.04, 0]);
  mesh(new THREE.ConeGeometry(0.95, 1.2, 4, 1), std({ map: tex, roughness: 0.9 }), g, [0, 0.68, 0], [0, Math.PI / 4, 0]);
  mesh(new THREE.ConeGeometry(0.09, 0.115, 4, 1), M.gold, g, [0, 1.225, 0], [0, Math.PI / 4, 0]);
  return { root, parts };
}
function scarab(M) {
  const { root, parts } = newModel(1); const g = parts[0];
  mesh(new THREE.SphereGeometry(0.2, 24, 16), M.faience, g, [0, 0.1, -0.02], null, [0.9, 0.5, 1.2]);
  mesh(new THREE.SphereGeometry(0.1, 16, 12), M.faience, g, [0, 0.08, 0.24], null, [1.2, 0.6, 0.8]);
  mesh(new THREE.BoxGeometry(0.005, 0.05, 0.4), M.black, g, [0, 0.2, -0.04]);
  for (let i = 0; i < 3; i++) for (const s of [-1, 1]) bone(g, V(s * 0.12, 0.05, 0.12 - i * 0.12), V(s * 0.27, 0.01, 0.16 - i * 0.16), 0.012, M.faience);
  return { root, parts };
}
function obelisk(M) {
  const { root, parts } = newModel(1); const g = parts[0];
  const tex = canvasTex(128, 512, (c, w, h) => { speckle(c, w, h, '#c99a7a', ['#7a4a35', '#e9c4a8'], 500, 2); c.fillStyle = 'rgba(70,35,20,.55)'; for (let y = 20; y < h - 10; y += 22) { c.fillRect(w * 0.4, y, w * 0.2, 4); c.fillRect(w * (0.35 + Math.random() * 0.2), y + 8, w * 0.1, 8); } });
  mesh(new THREE.CylinderGeometry(0.3, 0.45, 4.6, 4, 1), std({ map: tex, roughness: 0.85 }), g, [0, 2.3, 0], [0, Math.PI / 4, 0]);
  mesh(new THREE.ConeGeometry(0.3, 0.4, 4), M.gold, g, [0, 4.8, 0], [0, Math.PI / 4, 0]);
  return { root, parts };
}

/* ============ Fossilsalen ============ */
function triceratops(M) {
  const { root, parts } = newModel(3); const [frill, horns, face] = parts;
  const head = new THREE.Group(); head.position.y = 0.95; head.rotation.y = -Math.PI / 2; root.add(head); // nosen mot +z
  // nackkrage: en sköld med flikar i kanten
  const pts = []; for (let i = 0; i <= 40; i++) { const a = i / 40 * Math.PI, r = 1.05 + 0.05 * Math.sin(i * 1.9); pts.push([Math.cos(a) * r, Math.sin(a) * r * 0.95]); }
  pts.push([-0.35, -0.15], [0.35, -0.15]);
  const fr = mesh(extrude(shapeOf(pts, [[0.42, 0.55, 0.17, 0.22], [-0.42, 0.55, 0.17, 0.22]]), 0.1, 0.04), M.fossil, frill, [-0.55, 0.15, 0], [0, Math.PI / 2, 0]);
  fr.rotateX(-0.55);
  head.add(frill);
  // ansikte och näbb
  const prof = smooth([[-0.6, 0.35], [0.1, 0.4], [0.7, 0.2], [1.15, -0.05], [1.05, -0.35], [0.6, -0.42], [-0.5, -0.35]]);
  mesh(extrude(shapeOf(prof, [[0.05, 0.12, 0.13, 0.11]]), 0.62, 0.08), M.fossil, face);
  mesh(extrude(shapeOf(smooth([[-0.4, -0.35], [0.6, -0.42], [1.0, -0.4], [0.85, -0.62], [0.1, -0.68], [-0.4, -0.55]])), 0.5, 0.05), M.fossil, face);
  head.add(face);
  // horn: två långa ovanför ögonen och ett kort på nosen
  for (const s of [-1, 1]) { const h = mesh(new THREE.ConeGeometry(0.09, 1.0, 12), M.fossil, horns, [0.25, 0.75, s * 0.2]); h.rotation.set(s * 0.15, 0, -0.85); }
  mesh(new THREE.ConeGeometry(0.07, 0.3, 10), M.fossil, horns, [0.85, 0.32, 0], [0, 0, -0.5]);
  head.add(horns);
  mesh(new THREE.BoxGeometry(1.4, 0.35, 1.0), M.darkStone, root, [0, 0.175, 0]); // stenblock under
  bone(root, V(0, 0.35, 0), V(0, 0.7, 0), 0.05, M.steel);
  return { root, parts };
}
// logaritmisk spiral (ammonit, pärlbåt)
function spiralShell(g, mat, turns, a, b, rk) {
  const pts = []; const N = 80;
  for (let i = 0; i <= N; i++) { const th = i / N * turns * Math.PI * 2, r = a * Math.exp(b * th); pts.push(V(Math.cos(th) * r, Math.sin(th) * r, 0)); }
  return taperTube(g, pts, t => rk * a * Math.exp(b * t * turns * Math.PI * 2), mat, 120, 16);
}
function ammonite(M) {
  const { root, parts } = newModel(1); const g = parts[0];
  const tex = canvasTex(512, 64, (c, w, h) => { c.fillStyle = '#a07a50'; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(60,35,15,.5)'; for (let x = 0; x < w; x += 9) c.fillRect(x, 0, 3, h); }, { repeat: [1, 1] });
  const s = new THREE.Group(); s.position.y = 0.5; g.add(s);
  spiralShell(s, std({ map: tex, roughness: 0.5, metalness: 0.2 }), 3, 0.012, 0.17, 0.55);
  mesh(new THREE.BoxGeometry(0.5, 0.12, 0.35), M.darkStone, g, [0, 0.06, 0]);
  return { root, parts };
}
function trilobite(M) {
  const { root, parts } = newModel(1); const g = parts[0];
  mesh(new THREE.BoxGeometry(0.7, 0.08, 0.55), M.darkStone, g, [0, 0.04, 0]);
  const t = new THREE.Group(); t.position.y = 0.09; t.scale.setScalar(0.9); g.add(t);
  mesh(new THREE.SphereGeometry(0.15, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), M.fossil, t, [0, 0, 0.13], null, [1.1, 0.35, 0.65]);
  for (let i = 0; i < 9; i++) { const w = 0.14 - i * 0.008; mesh(new THREE.CapsuleGeometry(0.018, w * 1.6, 3, 8), M.fossil, t, [0, 0.01, 0.04 - i * 0.032], [0, 0, Math.PI / 2]); }
  mesh(new THREE.SphereGeometry(0.06, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M.fossil, t, [0, 0, -0.27], null, [1, 0.4, 0.7]);
  bone(t, V(0, 0.03, 0.2), V(0, 0.03, -0.27), 0.03, M.fossil);
  return { root, parts };
}
function tusk(M) {
  const { root, parts } = newModel(1); const g = parts[0];
  taperTube(g, [V(-1.8, 0.35, 0), V(-0.6, 0.55, 0.15), V(0.6, 0.95, 0.35), V(1.4, 1.55, 0.2), V(1.6, 2.05, -0.15)], t => 0.14 * (1 - t * 0.82), M.ivory, 60, 14);
  for (const x of [-1.3, 0.4]) { mesh(new THREE.BoxGeometry(0.12, x < 0 ? 0.32 : 0.75, 0.3), M.darkWood, g, [x, x < 0 ? 0.16 : 0.37, 0.1]); }
  return { root, parts };
}
function amber(M) {
  const { root, parts } = newModel(1); const g = parts[0];
  const geo = new THREE.IcosahedronGeometry(0.16, 2); const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); v.multiplyScalar(1 + Math.sin(v.x * 30) * 0.06 + Math.cos(v.y * 25) * 0.05); p.setXYZ(i, v.x * 1.3, v.y * 0.8, v.z); }
  geo.computeVertexNormals();
  const a = mesh(geo, M.amber, g, [0, 0.16, 0]);
  mesh(new THREE.SphereGeometry(0.025, 10, 8), M.black, g, [0, 0.16, 0], null, [1.8, 0.7, 0.8]); // insekten
  for (const s of [-1, 1]) mesh(new THREE.PlaneGeometry(0.05, 0.02), std({ color: 0xffffff, transparent: true, opacity: 0.5, side: THREE.DoubleSide }), g, [0, 0.175, s * 0.02], [-Math.PI / 2, 0, s * 0.3]);
  a.renderOrder = 2;
  return { root, parts };
}
function meteorite(M) {
  const { root, parts } = newModel(1); const g = parts[0];
  const geo = new THREE.IcosahedronGeometry(0.42, 4); const p = geo.attributes.position, v = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) { v.fromBufferAttribute(p, i); const n = Math.sin(v.x * 9 + 1) * Math.cos(v.z * 8) * 0.08 + Math.sin(v.y * 14) * 0.04 - Math.abs(Math.sin(v.x * 17 + v.y * 11)) * 0.05; v.multiplyScalar(1 + n); p.setXYZ(i, v.x * 1.2, v.y * 0.85, v.z); }
  geo.computeVertexNormals();
  mesh(geo, std({ color: 0x3d3a38, metalness: 0.7, roughness: 0.55 }), g, [0, 0.36, 0]);
  return { root, parts };
}

/* ============ Vikingasalen ============ */
function hullGeometry(L, W, D, sheer) {
  const NU = 48, NV = 16, pos = [], uv = [], idx = [];
  for (let i = 0; i <= NU; i++) {
    const u = i / NU, s = Math.sin(Math.PI * u), w = W * Math.pow(s, 0.75), d = D * Math.pow(s, 0.45) + 0.05, top = sheer * Math.pow(2 * u - 1, 4);
    for (let j = 0; j <= NV; j++) {
      const v = j / NV * 2 - 1, phi = v * Math.PI / 2;
      pos.push((u - 0.5) * L, top - d * Math.cos(phi) + d, w * Math.sin(phi)); uv.push(u, j / NV);
    }
  }
  for (let i = 0; i < NU; i++) for (let j = 0; j < NV; j++) { const a = i * (NV + 1) + j, b = a + NV + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals();
  return g;
}
function ship(M) {
  const { root, parts } = newModel(4); const [keel, hull, shields, mast] = parts;
  const L = 10, W = 1.55, D = 1.2, S = 1.0, base = 0.55;
  const plankTex = canvasTex(64, 512, (c, w, h) => { c.fillStyle = '#7a4d2a'; c.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 32) { c.fillStyle = 'rgba(30,15,5,.6)'; c.fillRect(0, y, w, 3); c.fillStyle = 'rgba(255,220,170,.08)'; c.fillRect(0, y + 3, w, 6); } });
  plankTex.wrapS = plankTex.wrapT = THREE.RepeatWrapping;
  const h = mesh(hullGeometry(L, W, D, S), std({ map: plankTex, side: THREE.DoubleSide, roughness: 0.7 }), hull, [0, base, 0]);
  // köl och stävar som rullar ihop sig i ändarna
  const stem = s => [V(s * 3.6, base + 0.02, 0), V(s * 4.6, base + 0.35, 0), V(s * 5.2, base + 1.4, 0), V(s * 5.25, base + 2.3, 0), V(s * 4.95, base + 2.6, 0), V(s * 4.8, base + 2.35, 0)];
  bone(keel, V(-3.7, base + 0.02, 0), V(3.7, base + 0.02, 0), 0.09, M.darkWood);
  for (const s of [-1, 1]) taperTube(keel, stem(s), t => 0.11 * (1 - t * 0.5), M.darkWood, 40, 8);
  for (let i = -6; i <= 6; i++) mesh(new THREE.BoxGeometry(0.08, 0.06, W * 1.6 * Math.pow(Math.cos(i / 7 * Math.PI / 2), 0.75)), M.darkWood, hull, [i * 0.6, base + D * 0.8, 0]); // tofter
  // sköldar längs relingen
  const cols = [M.yellow, M.black, M.red, M.yellow, M.black];
  const shieldGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.05, 20);
  for (let i = -5; i <= 5; i++) {
    const u = (i * 0.7) / L + 0.5, s = Math.sin(Math.PI * u), w = W * Math.pow(s, 0.75), top = S * Math.pow(2 * u - 1, 4) + D * 0 + base + D * 0.95;
    for (const side of [-1, 1]) { const m = mesh(shieldGeo, cols[(i + 5 + (side > 0 ? 2 : 0)) % cols.length], shields, [i * 0.7, top, side * (w + 0.03)], [Math.PI / 2, 0, 0]); mesh(new THREE.SphereGeometry(0.06, 10, 8), M.iron, shields, [i * 0.7, top, side * (w + 0.07)]); m.rotation.x = Math.PI / 2; }
  }
  // mast och segel
  bone(mast, V(0, base + 0.2, 0), V(0, base + 6.4, 0), 0.09, M.wood);
  bone(mast, V(0, base + 5.9, -2.0), V(0, base + 5.9, 2.0), 0.06, M.wood);
  const sailTex = canvasTex(256, 256, (c, w, h) => { for (let i = 0; i < 8; i++) { c.fillStyle = i % 2 ? '#efe4cf' : '#a8322a'; c.fillRect(i * w / 8, 0, w / 8, h); } });
  const sailGeo = new THREE.PlaneGeometry(4, 3.4, 8, 8); const sp = sailGeo.attributes.position;
  for (let i = 0; i < sp.count; i++) { const x = sp.getX(i), y = sp.getY(i); sp.setZ(i, 0.35 * Math.cos(x / 2 * Math.PI / 2) * (0.6 + (1.7 - y) / 3.4 * 0.4)); }
  sailGeo.computeVertexNormals();
  mesh(sailGeo, std({ map: sailTex, side: THREE.DoubleSide, roughness: 0.9 }), mast, [0.15, base + 4.15, 0], [0, Math.PI / 2, 0]);
  // vagga att stå på (syns alltid)
  for (const x of [-3, 0, 3]) mesh(new THREE.BoxGeometry(0.3, base + 0.1, 1.6), M.darkWood, root, [x, (base + 0.1) / 2, 0]);
  h.castShadow = true;
  return { root, parts };
}
function runestone(M) {
  const { root, parts } = newModel(1); const g = parts[0];
  const W = 1.5, H = 2.9;
  const tex = canvasTex(300, 580, (c, w, h) => {
    speckle(c, w, h, '#8a8580', ['#4e4a46', '#b2aca5'], 1500, 4);
    // ormen som slingrar sig runt kanten, med runor
    c.strokeStyle = '#b3352b'; c.lineWidth = 34; c.lineCap = 'round'; c.beginPath();
    c.moveTo(w * 0.25, h * 0.95); c.bezierCurveTo(w * 0.02, h * 0.6, w * 0.05, h * 0.12, w * 0.5, h * 0.1); c.bezierCurveTo(w * 0.95, h * 0.12, w * 0.98, h * 0.6, w * 0.75, h * 0.95); c.stroke();
    c.fillStyle = '#b3352b'; c.beginPath(); c.ellipse(w * 0.78, h * 0.93, 30, 20, 0.4, 0, 7); c.fill();
    c.strokeStyle = '#2b2522'; c.lineWidth = 3;
    const runeAt = (x, y, a) => { c.save(); c.translate(x, y); c.rotate(a); c.beginPath(); c.moveTo(0, -11); c.lineTo(0, 11); const k = Math.floor(Math.random() * 4); if (k === 0) { c.moveTo(0, -11); c.lineTo(7, -4); } if (k === 1) { c.moveTo(0, -3); c.lineTo(7, -10); c.moveTo(0, 3); c.lineTo(-7, -4); } if (k === 2) { c.moveTo(-6, -6); c.lineTo(6, 6); } if (k === 3) { c.moveTo(0, -11); c.lineTo(6, -5); c.lineTo(0, 1); } c.stroke(); c.restore(); };
    for (let i = 1; i < 22; i++) { const t = i / 22; const p = t < 0.5 ? bez(t * 2, [w * 0.25, h * 0.95], [w * 0.02, h * 0.6], [w * 0.05, h * 0.12], [w * 0.5, h * 0.1]) : bez(t * 2 - 1, [w * 0.5, h * 0.1], [w * 0.95, h * 0.12], [w * 0.98, h * 0.6], [w * 0.75, h * 0.95]); runeAt(p[0], p[1], t < 0.5 ? -0.6 + t * 1.5 : 0.6 + t); }
    c.strokeStyle = '#b3352b'; c.lineWidth = 10; c.beginPath(); c.moveTo(w * 0.5, h * 0.3); c.lineTo(w * 0.5, h * 0.62); c.moveTo(w * 0.36, h * 0.42); c.lineTo(w * 0.64, h * 0.42); c.stroke(); // kors i mitten
  });
  tex.repeat.set(1 / W, 1 / H); tex.offset.set(0.5, 0);
  const shp = shapeOf(smooth([[-0.62, 0], [-0.75, 0.9], [-0.6, 2.2], [-0.15, 2.9], [0.4, 2.7], [0.72, 1.8], [0.7, 0.6], [0.6, 0]]));
  mesh(extrude(shp, 0.35, 0.06), [std({ map: tex, roughness: 0.95 }), M.stone], g);
  return { root, parts };
}
const bez = (t, a, b, c, d) => { const u = 1 - t; return [0, 1].map(k => u * u * u * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t * t * t * d[k]); };
function helmet(M) {
  const { root, parts } = newModel(1); const g = parts[0];
  mesh(new THREE.CylinderGeometry(0.1, 0.15, 0.3, 16), std({ color: 0x5a1f22, roughness: 0.9 }), g, [0, 0.15, 0]); // ställ i sammet
  const h = new THREE.Group(); h.position.y = 0.42; g.add(h);
  mesh(new THREE.SphereGeometry(0.17, 28, 16, 0, Math.PI * 2, 0, Math.PI / 2), M.iron, h, null, null, [1, 1.15, 1.1]);
  mesh(new THREE.TorusGeometry(0.172, 0.012, 8, 40), M.iron, h, [0, 0.005, 0], [Math.PI / 2, 0, 0], [1, 1.1, 1]);
  mesh(new THREE.TorusGeometry(0.17, 0.008, 6, 30, Math.PI), M.iron, h, [0, 0, 0], [0, Math.PI / 2, 0], [1.15, 1.15, 1]);
  mesh(new THREE.TorusGeometry(0.17, 0.008, 6, 30, Math.PI), M.iron, h, [0, 0, 0], [0, 0, 0], [1, 1.15, 1]);
  for (const s of [-1, 1]) mesh(new THREE.TorusGeometry(0.045, 0.011, 8, 20), M.iron, h, [s * 0.055, -0.04, 0.18]); // glasögonskydd
  mesh(new THREE.BoxGeometry(0.02, 0.09, 0.02), M.iron, h, [0, -0.05, 0.19]);
  mesh(new THREE.SphereGeometry(0.02, 8, 6), M.iron, h, [0, 0.2, 0]);
  return { root, parts };
}
function sword(M) {
  const { root, parts } = newModel(1); const g = parts[0];
  const s = new THREE.Group(); s.position.set(0, 0.12, 0); s.rotation.set(-Math.PI / 2 + 0.25, 0, Math.PI / 2); g.add(s);
  const blade = shapeOf([[-0.025, 0], [0.025, 0], [0.022, 0.8], [0, 0.88], [-0.022, 0.8]]);
  mesh(extrude(blade, 0.008, 0.004), M.silver, s, [0, -0.45, 0]);
  mesh(new THREE.BoxGeometry(0.18, 0.025, 0.035), M.iron, s, [0, -0.46, 0]);
  mesh(new THREE.CylinderGeometry(0.016, 0.018, 0.1, 10), M.leather, s, [0, -0.52, 0]);
  mesh(new THREE.SphereGeometry(0.035, 12, 8), M.brass, s, [0, -0.59, 0], null, [1.4, 0.8, 0.7]);
  mesh(new THREE.BoxGeometry(0.9, 0.04, 0.3), std({ color: 0x5a1f22, roughness: 0.9 }), g, [0, 0.02, 0]);
  return { root, parts };
}
function hoard(M) {
  const { root, parts } = newModel(1); const g = parts[0];
  const coin = new THREE.CylinderGeometry(0.022, 0.022, 0.004, 14);
  let seed = 3; const r = () => (seed = (seed * 9301 + 49297) % 233280) / 233280;
  for (let i = 0; i < 140; i++) { const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 0.2, y = 0.004 + (0.2 - d) * 0.35 * r(); mesh(coin, M.silver, g, [Math.cos(a) * d, y, Math.sin(a) * d], [r() - 0.5, 0, r() - 0.5]); }
  for (let i = 0; i < 3; i++) mesh(new THREE.TorusGeometry(0.07, 0.008, 8, 24), M.silver, g, [-0.2 + i * 0.09, 0.03, 0.2], [Math.PI / 2 - 0.3, 0, i]);
  mesh(new THREE.TorusGeometry(0.05, 0.012, 8, 20), M.silver, g, [0.2, 0.02, -0.15], [Math.PI / 2, 0, 0]);
  return { root, parts };
}

/* ============ Havets sal ============ */
function whale(M) {
  const { root, parts } = newModel(6); const [skull, jaws, spineF, spineB, ribs, fins] = parts;
  const Y = 4.2, k = 0.92;
  // skallen sedd ovanifrån: lång nos och bred bakdel
  const sk = shapeOf(smooth([[0, -1.6], [2.2, -1.1], [4.8, -0.45], [6.0, 0], [4.8, 0.45], [2.2, 1.1], [0, 1.6], [-0.7, 0.9], [-0.7, -0.9]]));
  const skg = extrude(sk, 0.35, 0.12); skg.rotateX(Math.PI / 2);
  mesh(skg, M.bone, skull, [6, Y + 0.25, 0]);
  mesh(new THREE.SphereGeometry(1, 20, 14), M.bone, skull, [6.2, Y + 0.45, 0], null, [1.0, 0.55, 1.3]);
  for (const s of [-1, 1]) taperTube(jaws, [V(6.3, Y - 0.2, s * 1.3), V(8.5, Y - 0.55, s * 1.25), V(10.5, Y - 0.45, s * 0.75), V(12, Y - 0.15, s * 0.12)], t => 0.17 * (1 - t * 0.5), M.bone, 40, 10);
  const spine = new THREE.CatmullRomCurve3([V(-12.5, Y - 0.3, 0), V(-9, Y + 0.25, 0), V(-4, Y + 0.6, 0), V(1, Y + 0.6, 0), V(5.6, Y + 0.35, 0)]);
  vertebrae(spineF, spine, 16, 0.5, 1, 0.33, f => 0.45 - f * 0.2, 0, M);
  vertebrae(spineB, spine, 22, 0, 0.5, f => 0.12 + f * 0.22, f => f * 0.45, f => f * 0.3, M);
  for (let i = 0; i < 13; i++) {
    const t = 0.58 + i * 0.03, p = spine.getPointAt(t), L = 1.3 + Math.sin(i / 13 * Math.PI) * 1.1;
    for (const s of [-1, 1]) taperTube(ribs, [V(p.x, p.y, s * 0.3), V(p.x - 0.1, p.y - 0.3, s * 1.0), V(p.x - 0.3, p.y - L * 0.8, s * 1.25), V(p.x - 0.45, p.y - L * 1.15, s * 0.8)], t => 0.09 * (1 - t * 0.5), M.bone, 14, 6);
  }
  for (const s of [-1, 1]) {
    const sh = V(3.6, Y - 0.9, s * 1.1), el = V(3.3, Y - 1.6, s * 1.9), wr = V(2.9, Y - 2.0, s * 2.4);
    bone(fins, sh, el, 0.16, M.bone); bone(fins, el, wr, 0.12, M.bone);
    for (let f = 0; f < 4; f++) bone(fins, wr, wr.clone().add(V(-0.35 - f * 0.12, -0.45 - f * 0.05, s * (0.5 - f * 0.12))), 0.05, M.bone);
  }
  // vajrar upp mot taket (syns alltid)
  for (const x of [-8, -2, 4, 9]) { const p = new THREE.Vector3(x, Y + 0.6, 0); bone(root, p, V(x, 7.9, 0), 0.012, M.steel); }
  root.scale.setScalar(k);
  return { root, parts };
}
function narwhal(M) {
  const { root, parts } = newModel(1); const g = parts[0];
  const tex = canvasTex(64, 512, (c, w, h) => { c.fillStyle = '#efe4cc'; c.fillRect(0, 0, w, h); c.strokeStyle = 'rgba(120,95,60,.45)'; c.lineWidth = 6; for (let y = -h; y < h * 2; y += 28) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y + 40); c.stroke(); } });
  const t = mesh(new THREE.ConeGeometry(0.05, 2.4, 16, 1, true), std({ map: tex, roughness: 0.5 }), g, [0, 0.22, 0], [0, 0, Math.PI / 2]);
  for (const x of [-0.8, 0.6]) mesh(new THREE.BoxGeometry(0.06, 0.2, 0.12), M.darkWood, g, [x, 0.1, 0]);
  t.rotation.y = 0.05;
  return { root, parts };
}
function megalodon(M) {
  const { root, parts } = newModel(1); const g = parts[0];
  const tooth = shapeOf(smooth([[-0.1, 0], [-0.075, 0.08], [-0.01, 0.22], [0.01, 0.22], [0.075, 0.08], [0.1, 0], [0.04, -0.035], [-0.04, -0.035]]));
  mesh(extrude(tooth, 0.03, 0.012), std({ color: 0x5c5a58, roughness: 0.4 }), g, [0, 0.12, 0], [-0.3, 0, 0]);
  mesh(new THREE.BoxGeometry(0.3, 0.06, 0.2), M.darkWood, g, [0, 0.03, -0.02]);
  mesh(extrude(shapeOf([[-0.015, 0], [0, 0.045], [0.015, 0]]), 0.006, 0.003), M.ivory, g, [0.14, 0.07, 0.05]); // vithajtand som jämförelse
  return { root, parts };
}
function nautilus(M) {
  const { root, parts } = newModel(1); const g = parts[0];
  const tex = canvasTex(512, 64, (c, w, h) => { c.fillStyle = '#f2e6d4'; c.fillRect(0, 0, w, h); c.fillStyle = '#b5652e'; for (let x = 0; x < w * 0.75; x += 22) { c.beginPath(); c.moveTo(x, 0); c.quadraticCurveTo(x + 10, h * 0.5, x - 4, h); c.lineTo(x + 8, h); c.quadraticCurveTo(x + 20, h * 0.5, x + 10, 0); c.fill(); } });
  const s = new THREE.Group(); s.position.y = 0.3; g.add(s);
  spiralShell(s, std({ map: tex, roughness: 0.35 }), 1.25, 0.006, 0.42, 0.75);
  mesh(new THREE.BoxGeometry(0.25, 0.04, 0.12), M.darkWood, g, [0, 0.02, 0]);
  return { root, parts };
}

const BUILDERS = { trex, moai, globe, sarcophagus, canopic, pyramid, scarab, obelisk, triceratops, ammonite, trilobite, tusk, amber, meteorite, ship, runestone, helmet, sword, hoard, whale, narwhal, megalodon, nautilus };
export function buildModel(name) {
  const m = materials(); const out = BUILDERS[name](m);
  out.root.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.userData.mat = o.material; } });
  return out;
}
// Visa en del som hittad (riktigt material) eller ej hittad (genomskinligt spöke).
export function setFound(part, found) {
  part.traverse(o => { if (o.isMesh) { o.material = found ? o.userData.mat : M.ghost; o.castShadow = found; } });
}
export { canvasTex, speckle, std };
