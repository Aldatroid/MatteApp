/* ============ Three.js-scen ============ */
import * as THREE from '../../assets/lib/three.module.js';  // three@0.160.0, MIT
import { $, clamp, reducedMotion } from '../util.js';
import { loadStones } from './stones.js';

export { THREE };
const canvas = $('#scene'), stage = $('#stage'), labelLayer = $('#labels');
export let has3D = true, renderer, scene, camera, world, content;
const VIEW_DEFAULT = { dist: 10, elev: 0.5, rotY: 0.6, rotX: 0, allowRotate: true, autoSpin: false, clampX: [-0.6, 0.9], y: 0 };
export const view = { ...VIEW_DEFAULT };
// Kamerans rotation: mål (rotTY/rotTX) och fart. Ett objekt så att andra moduler kan ändra värdena.
export const cam = { rotTY: 0, rotTX: 0, velY: 0 };
let dragging = false, lastInteract = 0, px = 0, py = 0;
let disposables = [], labels = [], tweens = [];
export const G = {};
export const C = { blue: '#4f7fd6', blue2: '#6c96e6', sun: '#f6b93b', sun2: '#ffcf66', coral: '#FF7A59', mint: '#3CC8A0', solid: '#86A4F7', tile: '#8FAAF6', red: '#E5484D' };
export const FACE_COLORS = ['#5B8CFF', '#FFC531', '#FF7A59', '#3CC8A0', '#B27CFF', '#FF6FAE', '#48C1F0', '#9BD13F'];
let glow = null;

export function initThree() {
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  } catch (e) { has3D = false; $('#no3d').hidden = false; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1.7;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(35, 1, 0.1, 300);
  // Ljussättning: varmt huvudljus uppe till vänster (kastar skuggor), svagt fyllnadsljus, kantljus bakifrån,
  // och en varm glöd underifrån (punktljus + varm markreflex) så att skuggsidorna inte blir kalla och mörka
  scene.add(new THREE.HemisphereLight(0xc4d2ff, 0xb8622a, 0.45));
  const d1 = new THREE.DirectionalLight(0xfff0dc, 4.0); d1.position.set(-7, 10, 3); d1.castShadow = true;
  const sc = d1.shadow.camera; sc.left = -9; sc.right = 9; sc.top = 9; sc.bottom = -9; sc.near = 1; sc.far = 40;
  d1.shadow.mapSize.set(2048, 2048); d1.shadow.bias = -0.0004; d1.shadow.normalBias = 0.02; d1.shadow.radius = 3; scene.add(d1);
  const d2 = new THREE.DirectionalLight(0x9fb2ff, 0.25); d2.position.set(6, 2, 6); scene.add(d2);
  glow = new THREE.PointLight(0xff8a2a, 30, 0, 2); scene.add(glow);
  const d3 = new THREE.DirectionalLight(0xa9c0ff, 1.5); d3.position.set(2, 6, -8); scene.add(d3);
  world = new THREE.Group(); scene.add(world);
  content = new THREE.Group(); world.add(content);
  G.box = new THREE.BoxGeometry(1, 1, 1);
  G.rod = new THREE.CylinderGeometry(1, 1, 1, 12);
  G.ball = new THREE.SphereGeometry(1, 20, 14);
  loadStones(renderer);
  new ResizeObserver(resize).observe(stage);
  resize();
  canvas.addEventListener('pointerdown', e => {
    if (!view.allowRotate) return;
    dragging = true; px = e.clientX; py = e.clientY; cam.velY = 0; lastInteract = performance.now();
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    $('#stageHint').style.opacity = 0;
  });
  canvas.addEventListener('pointermove', e => {
    if (!dragging) return;
    const dx = e.clientX - px, dy = e.clientY - py; px = e.clientX; py = e.clientY;
    cam.rotTY += dx * 0.012; cam.velY = dx * 0.012;
    cam.rotTX = clamp(cam.rotTX + dy * 0.008, view.clampX[0], view.clampX[1]);
    lastInteract = performance.now();
  });
  const up = () => { dragging = false; lastInteract = performance.now(); };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  document.addEventListener('gesturestart', e => e.preventDefault());
}
export function resize() {
  if (!has3D) return;
  const w = stage.clientWidth, h = stage.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  camera.aspect = w / h; camera.updateProjectionMatrix();
}
export function setView(v) {
  Object.assign(view, VIEW_DEFAULT, v);
  cam.rotTY = view.rotY; cam.rotTX = view.rotX; cam.velY = 0;
  if (world) world.rotation.set(cam.rotTX, cam.rotTY - 0.5, 0);
  $('#stageHint').style.opacity = view.allowRotate ? 1 : 0;
  lastInteract = performance.now();
}
function placeCamera() {
  const k = camera.aspect < 1.1 ? 1.1 / camera.aspect : 1;
  const d = view.dist * k;
  camera.position.set(0, Math.sin(view.elev) * d + view.y, Math.cos(view.elev) * d);
  camera.lookAt(0, view.y, 0);
  // glöden underifrån: större scen => ljuset längre ner (jämnare över hela rutnätet), styrkan kompenseras för avståndet
  if (glow) { const depth = 1.5 + Math.max(0, view.dist - 9.5) * 0.25; glow.position.set(0.5, -depth, 2 + view.dist * 0.1); glow.intensity = 30 * (depth / 1.5) ** 2; }
}
// Moduler som ritar annat än 3D (t.ex. 2D-figurer) registrerar hur de städas när scenen töms.
const clearHooks = [];
export const onClear = fn => clearHooks.push(fn);
export function clearScene() {
  tweens.length = 0;
  labels.forEach(l => l.el.remove()); labels = [];
  clearHooks.forEach(f => f());
  if (!has3D) return;
  for (const o of [...content.children]) content.remove(o);
  disposables.forEach(d => d.dispose()); disposables = [];
}
export function track(d) { disposables.push(d); return d; }
export function stdMat(color, extra = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.02, ...extra });
  disposables.push(m); return m;
}
export const v3 = p => new THREE.Vector3(p[0], p[1], p[2]);
export function anchorAt(parent, x, y, z) { const o = new THREE.Object3D(); o.position.set(x, y, z); parent.add(o); return o; }
export function addLabel(html, anchor, { cls = '', normal = null, hideBack = false } = {}) {
  const el = document.createElement('div'); el.className = 'lbl ' + cls; el.innerHTML = html; el.style.opacity = 0;
  labelLayer.appendChild(el);
  const L = { el, anchor, normal: normal ? normal.clone().normalize() : null, hideBack }; labels.push(L); return L;
}
export function removeLabels(list) { list.forEach(L => { L.el.remove(); const i = labels.indexOf(L); if (i >= 0) labels.splice(i, 1); }); }
const _v = new THREE.Vector3(), _n = new THREE.Vector3(), _c = new THREE.Vector3();
function updateLabels() {
  const w = stage.clientWidth, h = stage.clientHeight;
  for (const L of labels) {
    if (!L.anchor.parent) { L.el.style.opacity = 0; continue; }
    L.anchor.getWorldPosition(_v);
    let facing = 1;
    if (L.normal) { _n.copy(L.normal).transformDirection(L.anchor.matrixWorld); _c.copy(camera.position).sub(_v).normalize(); facing = _n.dot(_c); }
    _v.project(camera);
    const x = (_v.x * 0.5 + 0.5) * w, y = (-_v.y * 0.5 + 0.5) * h;
    L.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%)`;
    L.el.style.opacity = _v.z > 1 ? 0 : facing < 0 ? (L.hideBack ? 0 : 0.3) : 1;
  }
}
export const ease = {
  out: p => 1 - Math.pow(1 - p, 3),
  inOut: p => p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2,
  back: p => { const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2); },
};
export function tween(dur, fn, { delay = 0, e = ease.out, done = null } = {}) {
  const t = { start: performance.now() + delay, dur: Math.max(1, dur), fn, e, done }; tweens.push(t); return t;
}
export const later = (ms, fn) => tween(1, () => {}, { delay: ms, done: fn });
function runTweens(now) {
  for (const t of [...tweens]) {
    if (now < t.start) continue;
    const p = clamp((now - t.start) / t.dur, 0, 1);
    t.fn(t.e(p));
    if (p >= 1) { const i = tweens.indexOf(t); if (i >= 0) tweens.splice(i, 1); t.done && t.done(); }
  }
}
let rafOn = false, lastT = 0;
function loop(t) {
  if (!rafOn) return;
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0); lastT = t;
  runTweens(t);
  content.traverse(o => { if (o.isMesh && !o.userData.shadowSet) { o.castShadow = o.receiveShadow = true; o.userData.shadowSet = true; } });
  if (!dragging) {
    if (view.autoSpin && !reducedMotion && t - lastInteract > 1800) cam.rotTY += dt * 0.35;
    else { cam.rotTY += cam.velY; cam.velY *= 0.9; }
  }
  world.rotation.y += (cam.rotTY - world.rotation.y) * 0.2;
  world.rotation.x += (cam.rotTX - world.rotation.x) * 0.2;
  placeCamera();
  renderer.render(scene, camera);
  updateLabels();
}
export function startLoop() { if (rafOn || !has3D) return; rafOn = true; lastT = performance.now(); requestAnimationFrame(loop); }
export function stopLoop() { rafOn = false; }
export function popIn(mesh, s, delay, dur = 260) {
  mesh.scale.setScalar(0.0001);
  tween(dur, p => mesh.scale.set(s[0] * p, s[1] * p, s[2] * p), { delay, e: ease.back });
}
