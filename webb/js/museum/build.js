/* ============ Museets byggnad ============
   Golv, väggar med valv och fönster, socklar, montrar, skyltar och dekor.
   Väggarna består av bitar (pieces) med en undre och övre höjd. setWallHeight() klipper bitarna
   så att en vägg kan sänkas till en låg mur (dockskåpsvy) och resas igen. */
import { THREE } from '../three/scene.js';
import { ROOMS, DOORS, ARTIFACTS, WALL_H } from './catalog.js';
import { buildModel, materials, canvasTex, speckle, std } from './models.js';

// STUB = höjden på en sänkt vägg: bara en mörk list vid golvet som visar planlösningen.
const T = 0.6, DOOR_H = 5.2, STUB = 0.12;
const box = new THREE.BoxGeometry(1, 1, 1);

/* ---------- golv ---------- */
function floorTex(kind) {
  const S = 512;
  return canvasTex(S, S, (g, w, h) => {
    if (kind === 'hall') { // schackrutig marmor
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#6e4a2e' : '#e6d6b8'; g.fillRect(x * w / 4, y * h / 4, w / 4, h / 4); }
      g.globalAlpha = 0.18; for (let i = 0; i < 60; i++) { g.strokeStyle = i % 2 ? '#fff' : '#3a2412'; g.lineWidth = 1 + Math.random() * 2; g.beginPath(); const x = Math.random() * w, y = Math.random() * h; g.moveTo(x, y); g.bezierCurveTo(x + 60, y + 20, x + 90, y - 30, x + 160, y + 10); g.stroke(); }
      g.globalAlpha = 1; g.strokeStyle = 'rgba(40,25,10,.5)'; g.lineWidth = 2; for (let i = 0; i <= 4; i++) { g.beginPath(); g.moveTo(i * w / 4, 0); g.lineTo(i * w / 4, h); g.moveTo(0, i * h / 4); g.lineTo(w, i * h / 4); g.stroke(); }
    } else if (kind === 'wood') { // fiskbensparkett
      g.fillStyle = '#5a3a20'; g.fillRect(0, 0, w, h);
      for (let y = -h; y < h * 2; y += 32) for (let x = 0; x < w; x += 64) for (const d of [0, 1]) {
        g.save(); g.translate(x + d * 32, y + (x / 64 % 2) * 16); g.rotate(d ? -Math.PI / 4 : Math.PI / 4);
        g.fillStyle = ['#7a4f2c', '#6a4325', '#865a33', '#71492a'][(x / 64 + y / 32 + d) & 3]; g.fillRect(0, 0, 90, 22); g.strokeStyle = 'rgba(20,10,0,.5)'; g.strokeRect(0, 0, 90, 22); g.restore();
      }
    } else if (kind === 'ocean') {
      g.fillStyle = '#0f2a2e'; g.fillRect(0, 0, w, h);
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) { g.fillStyle = (x + y) % 2 ? '#123439' : '#0d2427'; g.fillRect(x * w / 4 + 2, y * h / 4 + 2, w / 4 - 4, h / 4 - 4); }
      g.strokeStyle = 'rgba(90,220,200,.25)'; g.lineWidth = 3; for (let i = 0; i < 6; i++) { g.beginPath(); for (let x = 0; x <= w; x += 8) g.lineTo(x, i * 90 + 30 + Math.sin(x / 40 + i) * 14); g.stroke(); }
    } else {
      const base = kind === 'sand' ? ['#cfb487', '#bfa274'] : ['#a99a86', '#988a77'];
      for (let y = 0; y < 2; y++) for (let x = 0; x < 2; x++) { g.fillStyle = base[(x + y) % 2]; g.fillRect(x * w / 2, y * h / 2, w / 2, h / 2); }
      g.globalAlpha = 0.15; for (let i = 0; i < 1500; i++) { g.fillStyle = i % 2 ? '#fff' : '#000'; g.fillRect(Math.random() * w, Math.random() * h, 2, 2); }
      g.globalAlpha = 1; g.strokeStyle = 'rgba(50,35,20,.55)'; g.lineWidth = 3; g.strokeRect(1, 1, w / 2 - 2, h / 2 - 2); g.strokeRect(w / 2 + 1, 1, w / 2 - 2, h / 2 - 2); g.strokeRect(1, h / 2 + 1, w / 2 - 2, h / 2 - 2); g.strokeRect(w / 2 + 1, h / 2 + 1, w / 2 - 2, h / 2 - 2);
    }
  });
}
// rosett i mitten av stora hallen (som ett stjärnmönster i golvet)
function medallion() {
  return canvasTex(1024, 1024, (g, w, h) => {
    const c = w / 2; g.clearRect(0, 0, w, h);
    g.fillStyle = '#e8d8b6'; g.beginPath(); g.arc(c, c, c - 4, 0, 7); g.fill();
    g.strokeStyle = '#c9a45a'; g.lineWidth = 14; g.beginPath(); g.arc(c, c, c - 14, 0, 7); g.stroke();
    for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2; g.fillStyle = i % 2 ? '#7a3f22' : '#4e2a16'; g.beginPath(); g.moveTo(c, c); g.lineTo(c + Math.cos(a - 0.19) * c * 0.88, c + Math.sin(a - 0.19) * c * 0.88); g.lineTo(c + Math.cos(a) * c * 0.94, c + Math.sin(a) * c * 0.94); g.lineTo(c + Math.cos(a + 0.19) * c * 0.88, c + Math.sin(a + 0.19) * c * 0.88); g.fill(); }
    g.fillStyle = '#e8d8b6'; g.beginPath(); g.arc(c, c, c * 0.3, 0, 7); g.fill();
    g.strokeStyle = '#c9a45a'; g.lineWidth = 10; g.beginPath(); g.arc(c, c, c * 0.3, 0, 7); g.stroke();
  });
}

/* ---------- väggar ---------- */
// Varje vägg: axel ('x' = linjen x = at, 'z' = linjen z = at), spann, och vilka salar den vetter mot.
// n = åt vilket håll salens insida ligger (+1/-1 längs axeln).
const WALLS = [
  { axis: 'z', at: 10, from: -30, to: -14, sides: [['egypt', -1]] },
  { axis: 'z', at: 10, from: -14, to: 14, sides: [['hall', -1]], entrance: true },
  { axis: 'z', at: 10, from: 14, to: 30, sides: [['fossil', -1]] },
  { axis: 'z', at: -26, from: -30, to: 0, sides: [['viking', 1]] },
  { axis: 'z', at: -26, from: 0, to: 30, sides: [['ocean', 1]] },
  { axis: 'z', at: -10, from: -30, to: -14, sides: [['egypt', 1], ['viking', -1]] },
  { axis: 'z', at: -10, from: -14, to: 0, sides: [['hall', 1], ['viking', -1]] },
  { axis: 'z', at: -10, from: 0, to: 14, sides: [['hall', 1], ['ocean', -1]] },
  { axis: 'z', at: -10, from: 14, to: 30, sides: [['fossil', 1], ['ocean', -1]] },
  { axis: 'x', at: -30, from: -26, to: -10, sides: [['viking', 1]] },
  { axis: 'x', at: -30, from: -10, to: 10, sides: [['egypt', 1]] },
  { axis: 'x', at: 30, from: -26, to: -10, sides: [['ocean', -1]] },
  { axis: 'x', at: 30, from: -10, to: 10, sides: [['fossil', -1]] },
  { axis: 'x', at: -14, from: -10, to: 10, sides: [['egypt', -1], ['hall', 1]] },
  { axis: 'x', at: 14, from: -10, to: 10, sides: [['hall', -1], ['fossil', 1]] },
  { axis: 'x', at: 0, from: -26, to: -10, sides: [['viking', -1], ['ocean', 1]] },
];
function makeMats() {
  const M = materials();
  const wallTex = canvasTex(512, 512, (g, w, h) => {
    speckle(g, w, h, '#c9a77a', ['#9c7b52', '#e2c69c'], 1200, 4);
    g.strokeStyle = 'rgba(90,60,30,.35)'; g.lineWidth = 3;
    for (let y = 0; y < h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); for (let x = (y / 64 % 2) * 64; x < w; x += 128) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 64); g.stroke(); } }
  }, { repeat: [1, 1] });
  return {
    ...M,
    wall: std({ map: wallTex, roughness: 0.9 }),
    trim: std({ color: 0xe9d6b0, roughness: 0.7 }),
    panel: std({ color: 0x3b2414, roughness: 0.55 }),
    outside: std({ color: 0x2a2018, roughness: 1 }),
    window: new THREE.MeshBasicMaterial({ color: 0xffd38a }),
    mullion: std({ color: 0x2b1d12, roughness: 0.6 }),
    sconce: new THREE.MeshBasicMaterial({ color: 0xffb54a }),
    velvet: std({ color: 0x8a1626, roughness: 0.85 }),
    marble: std({ color: 0xe2d6c2, roughness: 0.35 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xcfe8ff, roughness: 0.05, transparent: true, opacity: 0.16, depthWrite: false }),
    plant: std({ color: 0x2f6b3a, roughness: 0.8 }),
    pot: std({ color: 0x9a5b34, roughness: 0.7 }),
    plaque: std({ color: 0x2a1a10, roughness: 0.5 }),
  };
}
function buildWall(W, BM, parent, i) {
  // Väggar längs x-linjer ligger 2 cm högre än väggar längs z-linjer: där två väggar möts överlappar de,
  // och då hamnar ovansidorna (vägg, list, panel) aldrig i samma plan (det ger flimmer).
  const g = new THREE.Group(); g.position.y = W.axis === 'x' ? 0.02 : 0; parent.add(g);
  const len = W.to - W.from, alongX = W.axis === 'z'; // en vägg på linjen z = at går längs x
  // punkt längs väggen (s) och ut från den (o) till världskoordinater
  const at = (s, o = 0) => alongX ? [s, W.at + o] : [W.at + o, s];
  const pieces = [];
  const piece = (s0, s1, y0, y1, thick, mat, off = 0, base = false) => {
    const m = new THREE.Mesh(box, mat); const [x, z] = at((s0 + s1) / 2, off);
    m.position.set(x, 0, z); m.scale.set(alongX ? s1 - s0 : thick, 1, alongX ? thick : s1 - s0);
    m.castShadow = m.receiveShadow = true; g.add(m); pieces.push({ m, y0, y1, base }); return m;
  };
  const doors = DOORS.filter(d => d.axis === W.axis && d.at === W.at && d.from >= W.from && d.to <= W.to).sort((a, b) => a.from - b.from);
  // massiva bitar mellan öppningarna
  let s = W.from; const solids = [];
  for (const d of doors) { solids.push([s, d.from]); s = d.to; } solids.push([s, W.to]);
  for (const [a, b] of solids) { piece(a, b, 0, WALL_H - 0.03, T, BM.wall); piece(a, b, 0, 1.1, T + 0.12, BM.panel, 0, true); piece(a, b, WALL_H - 0.45, WALL_H, T + 0.35, BM.trim); }
  for (const d of doors) {
    piece(d.from, d.to, DOOR_H, WALL_H - 0.03, T, BM.wall);
    piece(d.from, d.to, WALL_H - 0.45, WALL_H, T + 0.35, BM.trim);
    // valvbåge av ljus sten runt öppningen
    const r = (d.to - d.from) / 2, spring = DOOR_H - r, [x, z] = at((d.from + d.to) / 2);
    const arch = new THREE.Mesh(new THREE.TorusGeometry(r, 0.22, 8, 24, Math.PI), BM.trim);
    arch.position.set(x, spring, z); if (!alongX) arch.rotation.y = Math.PI / 2; arch.scale.z = 3.2;
    g.add(arch); pieces.push({ m: arch, y0: spring, y1: DOOR_H + 0.2, fixed: true });
    // fyllning mellan bågen och den raka överliggaren
    const sp = new THREE.Shape(); sp.moveTo(-r, 0); sp.lineTo(-r, r + 0.01); sp.lineTo(r, r + 0.01); sp.lineTo(r, 0); sp.absarc(0, 0, r, 0, Math.PI, false);
    const spg = new THREE.ExtrudeGeometry(sp, { depth: T, bevelEnabled: false, curveSegments: 24 }); spg.translate(0, 0, -T / 2);
    const spm = new THREE.Mesh(spg, BM.wall); spm.position.set(x, spring, z); if (!alongX) spm.rotation.y = Math.PI / 2; spm.castShadow = spm.receiveShadow = true;
    g.add(spm); pieces.push({ m: spm, y0: spring, y1: DOOR_H, fixed: true });
    for (const e of [d.from, d.to]) piece(e - 0.3, e + 0.3, 0, DOOR_H - (d.to - d.from) / 2 + 0.2, T + 0.3, BM.trim); // pelare vid öppningen
  }
  // pilastrar, fönster och lampetter på insidan mot varje sal
  for (const [room, n] of W.sides) {
    const face = n * (T / 2);
    const step = 4.2, count = Math.floor(len / step);
    for (let i = 1; i < count; i++) {
      const p = W.from + i * len / count; if (doors.some(d => p > d.from - 0.8 && p < d.to + 0.8)) continue;
      piece(p - 0.35, p + 0.35, 0, WALL_H - 0.45, 0.3, BM.trim, face + n * 0.15);
    }
    const outer = W.sides.length === 1;
    for (let i = 0; i < count; i++) {
      const p = W.from + (i + 0.5) * len / count; if (doors.some(d => p > d.from - 2 && p < d.to + 2)) continue;
      if (outer && !W.entrance) { // höga fönster i ytterväggarna
        piece(p - 0.9, p + 0.9, 2.4, 6.2, 0.06, BM.window, face + n * 0.04);
        for (const q of [-0.3, 0.3]) piece(p + q - 0.04, p + q + 0.04, 2.4, 6.2, 0.1, BM.mullion, face + n * 0.08);
        for (const y of [3.6, 4.9]) piece(p - 0.9, p + 0.9, y - 0.04, y + 0.04, 0.1, BM.mullion, face + n * 0.08);
        piece(p - 1.1, p + 1.1, 6.2, 6.5, 0.2, BM.trim, face + n * 0.1);
      } else if (i % 2 === 0) { // lampetter
        piece(p - 0.15, p + 0.15, 3.2, 3.6, 0.25, BM.sconce, face + n * 0.12);
        piece(p - 0.2, p + 0.2, 3.0, 3.2, 0.3, BM.brass, face + n * 0.15);
      } else { // tavelram
        piece(p - 0.9, p + 0.9, 2.4, 3.9, 0.08, BM.gold, face + n * 0.04);
        piece(p - 0.78, p + 0.78, 2.52, 3.78, 0.1, BM.panel, face + n * 0.06);
      }
    }
  }
  if (W.entrance) { // entrédörrar mot gatan
    piece(-2.2, 2.2, 0, 4.8, T + 0.1, BM.darkWood);
    piece(-2.6, 2.6, 4.8, 5.3, T + 0.3, BM.gold);
    piece(-0.04, 0.04, 0, 4.8, T + 0.14, BM.brass);
  }
  const wall = { ...W, group: g, pieces, h: WALL_H, near: {}, doors };
  setWallHeight(wall, WALL_H);
  return wall;
}
// En sänkt vägg visar bara sina basbitar (panelen och pelarfötterna), så att inga bitar slutar i
// samma höjd och flimrar mot varandra.
export function setWallHeight(w, h) {
  w.h = h; const low = h <= STUB + 0.001;
  for (const p of w.pieces) {
    if (p.fixed) { p.m.visible = h >= p.y1 - 0.05; continue; }
    const top = Math.min(p.y1, h), hh = top - p.y0;
    p.m.visible = hh > 0.01 && (!low || p.base);
    if (p.m.visible) { p.m.scale.y = hh; p.m.position.y = p.y0 + hh / 2; }
  }
}
export const STUB_H = STUB, DOOR_TOP = DOOR_H;

/* ---------- socklar, montrar och skyltar ---------- */
function stanchions(parent, w, d, BM) {
  const post = new THREE.CylinderGeometry(0.05, 0.05, 0.95, 10), foot = new THREE.CylinderGeometry(0.17, 0.2, 0.05, 16), knob = new THREE.SphereGeometry(0.08, 12, 8);
  const pts = []; const nx = Math.max(2, Math.round(w / 2.4)), nz = Math.max(2, Math.round(d / 2.4));
  for (let i = 0; i <= nx; i++) pts.push([-w / 2 + i * w / nx, -d / 2]);
  for (let i = 1; i <= nz; i++) pts.push([w / 2, -d / 2 + i * d / nz]);
  for (let i = nx - 1; i >= 0; i--) pts.push([-w / 2 + i * w / nx, d / 2]);
  for (let i = nz - 1; i >= 1; i--) pts.push([-w / 2, -d / 2 + i * d / nz]);
  pts.forEach(([x, z], i) => {
    const m = new THREE.Mesh(post, BM.brass); m.position.set(x, 0.475, z); parent.add(m);
    const f = new THREE.Mesh(foot, BM.brass); f.position.set(x, 0.025, z); parent.add(f);
    const k = new THREE.Mesh(knob, BM.brass); k.position.set(x, 0.97, z); parent.add(k);
    const [x2, z2] = pts[(i + 1) % pts.length];
    const curve = new THREE.QuadraticBezierCurve3(new THREE.Vector3(x, 0.9, z), new THREE.Vector3((x + x2) / 2, 0.68, (z + z2) / 2), new THREE.Vector3(x2, 0.9, z2));
    parent.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.03, 6), BM.velvet));
  });
}
function plaque(parent, x, z, rot, BM) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; parent.add(g);
  const p = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.9, 8), BM.brass); p.position.y = 0.45; g.add(p);
  const s = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.4, 0.04), BM.plaque); s.position.set(0, 0.95, 0); s.rotation.x = -0.7; g.add(s);
  const t = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.3, 0.03), [BM.brass, BM.brass, BM.brass, BM.brass, BM.brass, BM.brass]); t.position.set(0, 0.95, 0.025); t.rotation.x = -0.7; g.add(t);
  return t;
}
// Texten på skylten: föremålets namn när det är hittat, annars frågetecken.
const plaqueMat = {};
export function setPlaque(mesh, A, found) {
  const key = found ? A.id : '?';
  mesh.material[4] = plaqueMat[key] ||= new THREE.MeshStandardMaterial({ roughness: 0.4, metalness: 0.3, map: canvasTex(256, 154, (g, w, h) => {
    const grd = g.createLinearGradient(0, 0, 0, h); grd.addColorStop(0, '#e6c070'); grd.addColorStop(1, '#b8893a'); g.fillStyle = grd; g.fillRect(0, 0, w, h);
    g.strokeStyle = '#6b4a1a'; g.lineWidth = 6; g.strokeRect(8, 8, w - 16, h - 16);
    g.fillStyle = '#3b2405'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const words = (found ? A.name : '?').split(' '); const lines = []; let line = '';
    g.font = '600 30px Fredoka, sans-serif';
    for (const wd of words) { const t = line ? line + ' ' + wd : wd; if (g.measureText(t).width > w - 40 && line) { lines.push(line); line = wd; } else line = t; }
    lines.push(line);
    if (!found) g.font = '600 64px Fredoka, sans-serif';
    lines.forEach((l, i) => g.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * 34));
  }) });
}
function buildStand(A, BM, parent) {
  const [w, d] = A.size; let top = 0;
  if (A.stand === 'platform') {
    top = 0.4;
    const m = new THREE.Mesh(box, BM.marble); m.scale.set(w, 0.4, d); m.position.y = 0.2; parent.add(m);
    const b = new THREE.Mesh(box, BM.darkWood); b.scale.set(w + 0.15, 0.1, d + 0.15); b.position.y = 0.05; parent.add(b);
    const t = new THREE.Mesh(box, BM.brass); t.scale.set(w + 0.02, 0.04, d + 0.02); t.position.y = 0.4; parent.add(t);
    if (w * d > 6) stanchions(parent, w + 1.6, d + 1.6, BM);
  } else if (A.stand === 'pedestal' || A.stand === 'case') {
    top = A.stand === 'case' ? 1.0 : 0.85;
    const pw = Math.min(w, 3.4), pd = Math.min(d, 1.6);
    const m = new THREE.Mesh(box, BM.darkWood); m.scale.set(pw * 0.86, top - 0.1, pd * 0.86); m.position.y = (top - 0.1) / 2; parent.add(m);
    const c = new THREE.Mesh(box, BM.marble); c.scale.set(pw, 0.1, pd); c.position.y = top - 0.05; parent.add(c);
    const b = new THREE.Mesh(box, BM.marble); b.scale.set(pw, 0.12, pd); b.position.y = 0.06; parent.add(b);
    if (A.stand === 'case') {
      const gh = 0.85;
      const gl = new THREE.Mesh(box, BM.glass); gl.scale.set(pw * 0.92, gh - 0.03, pd * 0.92); gl.position.y = top + 0.01 + (gh - 0.03) / 2; gl.renderOrder = 5; gl.userData.glass = true; parent.add(gl);
      const lid = new THREE.Mesh(box, BM.darkWood); lid.scale.set(pw * 0.95, 0.06, pd * 0.95); lid.position.y = top + gh + 0.03; parent.add(lid);
    }
  } else if (A.stand === 'hang') {
    const r = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 0.03, 48), BM.velvet); r.scale.set(w * 0.42, 1, d * 0.42); r.position.y = 0.015; parent.add(r);
  }
  return top;
}

/* ---------- dekor ---------- */
function plantAt(parent, x, z, BM, s = 1) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.scale.setScalar(s); parent.add(g);
  const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.26, 0.6, 16), BM.pot); pot.position.y = 0.3; g.add(pot);
  const leaf = new THREE.SphereGeometry(0.5, 10, 6);
  for (let i = 0; i < 9; i++) { const a = i * 2.4, l = new THREE.Mesh(leaf, BM.plant); l.scale.set(0.18, 0.05, 0.9); l.position.set(Math.cos(a) * 0.35, 1.0 + (i % 3) * 0.25, Math.sin(a) * 0.35); l.rotation.set(0.6 - (i % 3) * 0.2, -a, 0); l.rotation.order = 'YXZ'; l.rotation.y = -a + Math.PI / 2; g.add(l); }
}
function bench(parent, x, z, rot, BM) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; parent.add(g);
  const s = new THREE.Mesh(box, BM.velvet); s.scale.set(2.2, 0.18, 0.7); s.position.y = 0.5; g.add(s);
  for (const dx of [-0.95, 0.95]) { const l = new THREE.Mesh(box, BM.darkWood); l.scale.set(0.18, 0.42, 0.62); l.position.set(dx, 0.21, 0); g.add(l); }
}
function desk(parent, x, z, rot, BM) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = rot; parent.add(g);
  const c = new THREE.Mesh(new THREE.CylinderGeometry(2.2, 2.2, 1.1, 32, 1, true, -Math.PI / 2, Math.PI), BM.darkWood); c.position.y = 0.55; g.add(c);
  const t = new THREE.Mesh(new THREE.RingGeometry(1.9, 2.3, 32, 1, -Math.PI / 2, Math.PI), BM.marble); t.rotation.x = -Math.PI / 2; t.position.y = 1.11; g.add(t);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(2.22, 2.22, 0.12, 32, 1, true, -Math.PI / 2, Math.PI), BM.brass); band.position.y = 0.8; g.add(band);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.18, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), BM.brass); lamp.position.set(0.6, 1.5, 2.0); g.add(lamp);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), BM.sconce); bulb.position.set(0.6, 1.47, 2.0); g.add(bulb);
}
const colGeo = new THREE.CylinderGeometry(0.42, 0.48, 1, 20);
function columnAt(parent, x, z, BM) {
  const add = (geo, sx, y0, y1) => { const m = new THREE.Mesh(geo, BM.trim); m.position.set(x, 0, z); m.scale.set(sx, 1, sx); m.castShadow = m.receiveShadow = true; parent.add(m); return { m, y0, y1 }; };
  const base = add(box, 1.2, 0, 0.45); base.base = true;
  return [add(colGeo, 1, 0.45, WALL_H - 0.45), base, add(box, 1.2, WALL_H - 0.45, WALL_H)];
}

/* ---------- allt ihop ---------- */
export function buildMuseum(scene) {
  const BM = makeMats();
  const root = new THREE.Group(); scene.add(root);
  // marken runt byggnaden
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(400, 400), BM.outside); ground.rotation.x = -Math.PI / 2; ground.position.y = -0.05; ground.receiveShadow = true; root.add(ground);
  // golv per sal
  for (const R of ROOMS) {
    const w = R.x[1] - R.x[0], d = R.z[1] - R.z[0];
    const tex = floorTex(R.floor); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(w / (R.floor === 'hall' ? 6 : 5), d / (R.floor === 'hall' ? 6 : 5));
    const f = new THREE.Mesh(new THREE.PlaneGeometry(w, d), std({ map: tex, roughness: R.floor === 'hall' || R.floor === 'ocean' ? 0.35 : 0.8 }));
    f.rotation.x = -Math.PI / 2; f.position.set((R.x[0] + R.x[1]) / 2, 0, (R.z[0] + R.z[1]) / 2); f.receiveShadow = true; root.add(f);
  }
  const med = new THREE.Mesh(new THREE.CircleGeometry(5.2, 64), std({ map: medallion(), transparent: true, roughness: 0.35 })); med.rotation.x = -Math.PI / 2; med.position.set(0, 0.012, -1); med.receiveShadow = true; root.add(med);
  // röd matta från entrén
  const rug = new THREE.Mesh(box, BM.velvet); rug.scale.set(3.4, 0.02, 4.4); rug.position.set(0, 0.012, 7.8); rug.receiveShadow = true; root.add(rug);
  // trappa utanför entrén
  const landing = new THREE.Mesh(box, BM.marble); landing.scale.set(9, 0.1, 2.2); landing.position.set(0, -0.02, 11.4); root.add(landing);
  const walls = WALLS.map((W, i) => buildWall(W, BM, root, i));
  // pelare i hallen: de räknas som bitar av närmaste vägg och sänks tillsammans med den
  for (const [x, z] of [[-11, -7], [11, -7], [-11, 7], [11, 7]]) {
    const w = walls.find(W => W.axis === 'z' && W.at === (z > 0 ? 10 : -10) && x >= W.from && x <= W.to);
    w.pieces.push(...columnAt(root, x, z, BM)); setWallHeight(w, WALL_H);
  }
  // dekor
  desk(root, 9, 6.2, Math.PI * 1.1, BM);
  bench(root, -7.5, 4.5, 0.2, BM); bench(root, 7.5, 1.5, -0.2, BM); bench(root, -22, 6.5, 0, BM); bench(root, 22, 0.5, Math.PI / 2, BM); bench(root, -15, -12.5, 0, BM); bench(root, 15, -23.5, 0, BM);
  for (const [x, z, s] of [[-13, 9, 1.3], [13, 9, 1.3], [-13, -9, 1.1], [13, -9, 1.1], [-29, 9, 1], [29, 9, 1], [-29, -25, 1], [29, -25, 1], [-1, -25, 1], [1, -11, 1]]) plantAt(root, x, z, BM, s);
  // föremålen
  const artifacts = ARTIFACTS.map(A => {
    const g = new THREE.Group(); g.position.set(A.pos[0], 0, A.pos[1]); g.rotation.y = A.rot; root.add(g);
    const top = buildStand(A, BM, g);
    const model = buildModel(A.model); model.root.position.y = top; g.add(model.root);
    const sign = A.stand !== 'hang' ? plaque(g, A.size[0] * 0.3, A.size[1] / 2 + (A.stand === 'platform' && A.size[0] * A.size[1] > 6 ? 1.35 : 0.55), 0, BM) : null;
    g.updateMatrixWorld(true);
    const bb = new THREE.Box3().setFromObject(model.root); bb.expandByScalar(0.15);
    bb.min.y = Math.min(bb.min.y, 0);
    const sphere = bb.getBoundingSphere(new THREE.Sphere());
    // osynlig träffyta som är lätt att trycka på med fingret
    const hit = new THREE.Mesh(box, new THREE.MeshBasicMaterial()); hit.visible = false;
    bb.getCenter(hit.position); bb.getSize(hit.scale); hit.scale.max(new THREE.Vector3(1.2, 1.2, 1.2)); root.add(hit);
    hit.userData.id = A.id;
    g.traverse(o => { if (o.isMesh && !o.userData.glass) { o.castShadow = true; o.receiveShadow = true; } });
    return { def: A, group: g, parts: model.parts, hit, sign, center: sphere.center, radius: sphere.radius };
  });
  return { root, walls, artifacts, BM };
}
