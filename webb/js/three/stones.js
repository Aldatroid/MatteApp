/* ============ Stenklossar: texturer ur konceptets sten-ark (tools/stones.ps1) ============ */
import * as THREE from '../../assets/lib/three.module.js';
import { clamp } from '../util.js';
import { G } from './scene.js';

const STONE = { cubes: [], tiles: [], mats: new Map() };
// Kub med avfasade kanter: BoxGeometry med 3 segment där de inre rutnätslinjerna flyttas ut till kanten (0.5 - r)
// och kantpunkterna dras in längs en båge. UV följer med så att texturens kant hamnar på fasen.
// Låda med avfasade kanter i verkliga mått (w,h,d), så att fasen r blir lika stor åt alla håll även för platta former.
function bevelBoxGeometry(w, h, d, r) {
  const g = new THREE.BoxGeometry(w, h, d, 3, 3, 3);
  const pos = g.attributes.position, nor = g.attributes.normal, uv = g.attributes.uv;
  const size = [w, h, d], inner = size.map(s => s / 2 - r), near = (t, x) => Math.abs(t - x) < 1e-5;
  // BoxGeometry bygger sidorna i ordningen +x,-x,+y,-y,+z,-z med 16 hörn var; u/v följer dessa axlar
  const faceAxes = [[2, 1], [2, 1], [0, 2], [0, 2], [0, 1], [0, 1]];
  const remapUV = (t, s) => near(t, 1 / 3) ? r / s : near(t, 2 / 3) ? 1 - r / s : t;
  const p = [0, 0, 0], c = new THREE.Vector3(), o = new THREE.Vector3(), v = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    p[0] = pos.getX(i); p[1] = pos.getY(i); p[2] = pos.getZ(i);
    for (let k = 0; k < 3; k++) if (near(Math.abs(p[k]), size[k] / 6)) p[k] = Math.sign(p[k]) * inner[k];
    v.set(p[0], p[1], p[2]);
    c.set(clamp(v.x, -inner[0], inner[0]), clamp(v.y, -inner[1], inner[1]), clamp(v.z, -inner[2], inner[2]));
    o.subVectors(v, c);
    if (o.lengthSq() > 1e-12) { o.normalize(); v.copy(c).addScaledVector(o, r); nor.setXYZ(i, o.x, o.y, o.z); }
    pos.setXYZ(i, v.x, v.y, v.z);
    const [au, av] = faceAxes[Math.floor(i / 16)];
    uv.setXY(i, remapUV(uv.getX(i), size[au]), remapUV(uv.getY(i), size[av]));
  }
  pos.needsUpdate = nor.needsUpdate = uv.needsUpdate = true;
  return g;
}
const bevelCubeGeometry = (r = 0.1) => bevelBoxGeometry(1, 1, 1, r);
// Gråskalekopia (ljusad) av en textur – används för guldmarkerade stenar, så att guldtonen inte blandas med stenens blå
function grayTexture(src, an) {
  const cv = document.createElement('canvas'); cv.width = cv.height = 512;
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = an;
  const draw = () => {
    const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.drawImage(src.image, 0, 0, 512, 512);
    const d = ctx.getImageData(0, 0, 512, 512), p = d.data;
    for (let i = 0; i < p.length; i += 4) { const l = Math.min(255, (p[i] * 0.3 + p[i + 1] * 0.59 + p[i + 2] * 0.11) * 2.1); p[i] = p[i + 1] = p[i + 2] = l; }
    ctx.putImageData(d, 0, 0); t.needsUpdate = true;
  };
  (src.userData.onLoad ||= []).push(draw);
  return t;
}
// Normal map räknad ur texturens ljushet: mörka sprickor blir fördjupningar, så att 3D-ljuset ger dem skugga och högdager.
function normalTexture(src, an, strength = 3.2) {
  const N = 512, cv = document.createElement('canvas'); cv.width = cv.height = N;
  const t = new THREE.CanvasTexture(cv); t.colorSpace = THREE.NoColorSpace; t.anisotropy = an;
  const draw = () => {
    const ctx = cv.getContext('2d', { willReadFrequently: true }); ctx.drawImage(src.image, 0, 0, N, N);
    const d = ctx.getImageData(0, 0, N, N), p = d.data, H = new Float32Array(N * N), B = new Float32Array(N * N);
    for (let i = 0; i < N * N; i++) H[i] = (p[i * 4] * 0.3 + p[i * 4 + 1] * 0.59 + p[i * 4 + 2] * 0.11) / 255;
    // lätt utjämning så att JPEG-brus inte blir gropigt
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      let s = 0, n = 0; for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) { const xx = Math.min(N - 1, Math.max(0, x + i)), yy = Math.min(N - 1, Math.max(0, y + j)); s += H[yy * N + xx]; n++; }
      B[y * N + x] = s / n;
    }
    const h = (x, y) => B[Math.min(N - 1, Math.max(0, y)) * N + Math.min(N - 1, Math.max(0, x))];
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const dx = (h(x + 1, y - 1) + 2 * h(x + 1, y) + h(x + 1, y + 1)) - (h(x - 1, y - 1) + 2 * h(x - 1, y) + h(x - 1, y + 1));
      const dy = (h(x - 1, y + 1) + 2 * h(x, y + 1) + h(x + 1, y + 1)) - (h(x - 1, y - 1) + 2 * h(x, y - 1) + h(x + 1, y - 1));
      let nx = -dx * strength, ny = dy * strength, nz = 1; const l = Math.hypot(nx, ny, nz); nx /= l; ny /= l; nz /= l;
      const i = (y * N + x) * 4; p[i] = (nx * 0.5 + 0.5) * 255; p[i + 1] = (ny * 0.5 + 0.5) * 255; p[i + 2] = (nz * 0.5 + 0.5) * 255; p[i + 3] = 255;
    }
    ctx.putImageData(d, 0, 0); t.needsUpdate = true;
  };
  (src.userData.onLoad ||= []).push(draw);
  return t;
}
export function loadStones(renderer) {
  const L = new THREE.TextureLoader(), an = renderer.capabilities.getMaxAnisotropy();
  const tex = p => { const t = L.load(p, tt => (tt.userData.onLoad || []).forEach(f => f())); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = an; return t; };
  for (let i = 1; i <= 6; i++) {
    const c = { top: tex(`assets/stone/cube${i}_top.jpg`), left: tex(`assets/stone/cube${i}_left.jpg`), right: tex(`assets/stone/cube${i}_right.jpg`) };
    c.gray = { top: grayTexture(c.top, an), left: grayTexture(c.left, an), right: grayTexture(c.right, an) };
    c.normal = { top: normalTexture(c.top, an), left: normalTexture(c.left, an), right: normalTexture(c.right, an) };
    STONE.cubes.push(c);
  }
  for (let i = 1; i <= 6; i++) { const t = tex(`assets/stone/tile${i}.jpg`); STONE.tiles.push({ map: t, normal: normalTexture(t, an) }); }
  G.stoneCube = bevelCubeGeometry(0.1);
  // plattor: smal fas, annars pressas fasen ihop till en synlig ram när kuben plattas till
  G.stoneTile = bevelBoxGeometry(0.92, 0.14, 0.92, 0.045);
}
// Toner: base/alt = vanliga stenar (alt lite mörkare för varannan rad), gold = markerad del (glöd i stenens mönster), ghost = tom plats
const STONE_TINT = {
  base: { color: '#ffffff' }, alt: { color: '#cdd7ee' },
  gold: { color: '#ffa20f', emissive: '#8a4500', ei: 0.75, gray: true }, gold2: { color: '#ffb52e', emissive: '#985000', ei: 0.75, gray: true },
  ghost: { color: '#b4bfdb' },
};
function stoneMats(kind, v, tint) {
  const key = kind + v + tint; if (STONE.mats.has(key)) return STONE.mats.get(key);
  const T = STONE_TINT[tint] || STONE_TINT.base;
  const mk = (map, normalMap) => new THREE.MeshStandardMaterial({ map, normalMap, normalScale: new THREE.Vector2(1, 1), roughness: 0.78, metalness: 0, color: T.color, emissive: T.emissive || '#000000', emissiveMap: T.emissive ? map : null, emissiveIntensity: T.ei || 1 });
  let mats;
  if (kind === 'cube') { const c = STONE.cubes[v], t = T.gray ? c.gray : c, n = c.normal; const top = mk(t.top, n.top), left = mk(t.left, n.left), right = mk(t.right, n.right); mats = [right, left, top, top, left, right]; }
  else { const s = STONE.tiles[v], top = mk(s.map, s.normal), side = new THREE.MeshStandardMaterial({ color: '#3a4768', roughness: 0.85 }); mats = [side, side, top, top, side, side]; }
  STONE.mats.set(key, mats); return mats;
}
export const stoneSeed = (...n) => Math.abs(n.reduce((h, x) => (h * 31 + x * 17 + 7) | 0, 11)) % 6;
export const stoneCube = (seed, tint = 'base') => new THREE.Mesh(G.stoneCube, stoneMats('cube', seed, tint));
export const stoneTile = (seed, tint = 'ghost') => new THREE.Mesh(G.stoneTile, stoneMats('tile', seed, tint));
