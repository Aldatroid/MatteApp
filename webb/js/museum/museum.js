/* ============ Museet ============
   Egen 3D-scen (egen canvas) med en kamera som tittar snett ovanifrån, som på ett dockskåp.
   Dra = panorera, nyp/scrolla = zooma, vrid med två fingrar eller högerdra = vrid. Tryck på ett föremål
   för att flyga dit och läsa om det. Väggar som står i vägen sänks automatiskt.
   Med ?alla i adressen visas alla föremål som hittade (för granskning). */
import { THREE } from '../three/scene.js';
import { $, esc, clamp, show, onShow, reducedMotion } from '../util.js';
import { S } from '../store.js';
import { ROOMS, ARTIFACTS, EXPEDITIONS, byId, roomById, TOTAL_PARTS, WALL_H } from './catalog.js';
import { expedition, expChosen, expProgress, setExpedition, roomsLeftToday } from './finds.js';
import { buildMuseum, setWallHeight, setPlaque, STUB_H, DOOR_TOP } from './build.js';
import { setFound, materials } from './models.js';

const PREVIEW_ALL = /[?&]alla\b/.test(location.search);
export const foundCount = id => PREVIEW_ALL ? byId[id].parts.length : clamp(S.museum?.found?.[id] || 0, 0, byId[id].parts.length);
export const totalFound = () => ARTIFACTS.reduce((s, a) => s + foundCount(a.id), 0);

const BOUNDS = { x: [-31, 31], z: [-27, 12] }, DIST = [5, 72];
const OVERVIEW = { x: 0, z: -7, y: 0, dist: 62, yaw: 0 };
let renderer = null, scene, camera, MU, canvas, stage, failed = false, running = false;
const cur = { ...OVERVIEW, pitch: 1 }, goal = { ...OVERVIEW, pitch: 1 };
let focus = null, beforeFocus = null, lastT = 0, labels = [], shift = { x: 0, y: 0, k: 1 }, reveal = null, anims = [];
const autoPitch = d => 0.5 + clamp((d - 8) / (65 - 8), 0, 1) * 0.5;
goal.pitch = cur.pitch = autoPitch(OVERVIEW.dist);

function init() {
  canvas = $('#mCanvas'); stage = $('#mStage');
  try { renderer = new THREE.WebGLRenderer({ canvas, antialias: true }); }
  catch (e) { failed = true; $('#mNo3d').hidden = false; return; }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.15;
  scene = new THREE.Scene(); scene.background = new THREE.Color(0x0b0907); scene.fog = new THREE.Fog(0x0b0907, 95, 170);
  camera = new THREE.PerspectiveCamera(38, 1, 0.3, 400);
  // ljus: varmt sken från fönstren, ett punktljus per sal och en svag himmelsreflex
  scene.add(new THREE.HemisphereLight(0xffe3b8, 0x3a2414, 0.85));
  const sun = new THREE.DirectionalLight(0xffd29a, 2.3); sun.position.set(-28, 48, 30); sun.target.position.set(0, 0, -8);
  sun.castShadow = true; const sc = sun.shadow.camera; sc.left = -42; sc.right = 42; sc.top = 32; sc.bottom = -32; sc.near = 10; sc.far = 120;
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.04; scene.add(sun, sun.target);
  for (const R of ROOMS) {
    const w = R.x[1] - R.x[0], d = R.z[1] - R.z[0];
    const p = new THREE.PointLight(R.light, w * d * 0.16, 0, 1.6); p.position.set((R.x[0] + R.x[1]) / 2, 6.2, (R.z[0] + R.z[1]) / 2); scene.add(p);
  }
  // ljuset som blixtrar till när ett nytt fynd sätts på plats (finns från början så att inga shaders byggs om)
  flash = new THREE.PointLight(0xffd27a, 0, 0, 2); scene.add(flash);
  MU = buildMuseum(scene);
  buildLabels(); buildRoomNav(); bindInput();
  new ResizeObserver(resize).observe(stage); resize();
}
function resize() {
  if (!renderer) return;
  const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
  renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix();
}
function applyFound() {
  for (const a of MU.artifacts) { const n = foundCount(a.def.id); a.parts.forEach((p, i) => setFound(p, i < n)); if (a.sign) setPlaque(a.sign, a.def, n > 0); }
  $('#mCount').innerHTML = `<b>${totalFound()} av ${TOTAL_PARTS}</b> fynd`;
  $('#mExp').innerHTML = expChosen() ? `<span class="m-exp-pre">Expedition: </span><b>${esc(expedition().name)}</b> ▾` : '<b>Välj expedition</b> ▾';
}

/* ---------- expeditioner: barnet väljer vilken sorts fynd som kommer härnäst ---------- */
function openExpeditions() {
  closeFocus(false);
  const chosen = expChosen(), active = chosen ? expedition() : null, rooms = roomsLeftToday();
  const el = $('#mExpPanel');
  el.innerHTML = `<div class="m-exp-box">
    <button class="ghost-btn m-close" id="mExpClose">Stäng</button>
    <span class="m-kicker">Expedition</span>
    ${chosen ? '' : '<p class="m-exp-welcome">Välkommen till museet!</p>'}
    <h2>${chosen ? 'Vad vill du leta efter?' : 'Vad vill du bli?'}</h2>
    <p class="m-text">När du gör Dagens pass hittar du nya saker till museet, högst en per sal och dag. Välj vad du vill leta efter. Du kan byta när du vill.</p>
    <p class="m-exp-next">${rooms.length ? `Idag kan du hitta något i: <b>${rooms.map(r => esc(roomById[r].name)).join(', ')}</b>. Högst en sak per sal och dag.` : '<b>Alla salar har fått något nytt idag.</b> Kom tillbaka i morgon!'}</p>
    <div class="m-exp-grid">${EXPEDITIONS.map(e => { const p = expProgress(e); return `<button class="m-exp-card${e.id === active?.id ? ' on' : ''}" data-exp="${e.id}">
      <b>${esc(e.name)}</b><span>${esc(e.text)}</span>
      <span class="m-exp-bar"><i style="width:${Math.round(p.done / p.total * 100)}%"></i></span>
      <small>${p.complete ? 'Klar!' : `${p.done} av ${p.total} fynd`}</small></button>`; }).join('')}</div>
  </div>`;
  el.hidden = false;
  $('#mExpClose').addEventListener('click', () => { el.hidden = true; });
  el.querySelectorAll('[data-exp]').forEach(b => b.addEventListener('click', () => {
    setExpedition(b.dataset.exp); applyFound(); el.hidden = true;
    const R = roomById[byId[expedition().items[0]].room]; if (R && expedition().id !== 'explorer') flyToRoom(R);
  }));
}

/* ---------- kamera ---------- */
// På en smal (stående) skärm backar kameran så att lika mycket syns på bredden.
const fitDist = () => cur.dist * Math.max(1, 1.45 / camera.aspect);
function placeCamera() {
  // Med infopanelen öppen flyttas bilden så att föremålet hamnar bredvid (eller ovanför) panelen,
  // och kameran backar så att föremålet får plats i den yta som är kvar.
  const w = stage.clientWidth, h = stage.clientHeight, info = $('#mInfo'), open = focus && !info.hidden;
  const portrait = w < h, pw = open && !portrait ? info.offsetWidth + 16 : 0, ph = open && portrait ? info.offsetHeight + 8 : 0;
  const tk = open ? (portrait ? h / Math.max(160, h - ph - 130) : w / Math.max(200, w - pw)) : 1;
  shift.x += (pw / 2 - shift.x) * 0.15; shift.y += (ph / 2 - shift.y) * 0.15; shift.k += (tk - shift.k) * 0.15;
  const cp = Math.cos(cur.pitch), sp = Math.sin(cur.pitch), d = focus ? cur.dist * Math.max(1, 0.9 / camera.aspect) * shift.k : fitDist();
  camera.position.set(cur.x + Math.sin(cur.yaw) * cp * d, cur.y + sp * d, cur.z + Math.cos(cur.yaw) * cp * d);
  camera.lookAt(cur.x, cur.y, cur.z);
  // Närplanet följer avståndet: ju längre ut kameran är, desto längre bort kan det ligga.
  // Det ger djupbufferten mycket bättre precision i överblicken (mindre flimmer mellan ytor).
  const near = clamp(d * 0.12, 0.4, 8), far = d * 3 + 120;
  if (Math.abs(camera.near - near) > near * 0.05 || Math.abs(camera.far - far) > far * 0.05) { camera.near = near; camera.far = far; camera.updateProjectionMatrix(); }
  if (Math.abs(shift.x) + Math.abs(shift.y) > 0.5) camera.setViewOffset(w, h, shift.x, shift.y, w, h); else camera.clearViewOffset();
}
function clampGoal() {
  goal.x = clamp(goal.x, ...BOUNDS.x); goal.z = clamp(goal.z, ...BOUNDS.z);
  goal.dist = clamp(goal.dist, focus ? 2.5 : DIST[0], DIST[1]);
  if (!focus) goal.pitch = autoPitch(goal.dist); else goal.pitch = clamp(goal.pitch, 0.08, 1.2);
}
const roomAt = (x, z) => ROOMS.find(R => x >= R.x[0] && x <= R.x[1] && z >= R.z[0] && z <= R.z[1]);
function flyToRoom(R) {
  closeFocus(false);
  const w = R.x[1] - R.x[0], d = R.z[1] - R.z[0];
  Object.assign(goal, { x: (R.x[0] + R.x[1]) / 2, z: (R.z[0] + R.z[1]) / 2 + 1, y: 0, dist: Math.max(w * 0.95, d * 1.3) + 4 });
  clampGoal();
}
function overview() { closeFocus(false); Object.assign(goal, OVERVIEW); clampGoal(); }
function rotate(da) { goal.yaw += da; }

/* ---------- väggarna sänks när de står i vägen ----------
   Överblick: väggar som vetter bort från kameran står kvar, de som är vända mot den sänks.
   Inne i en sal: alla väggar står kvar utom de som skymmer salen. Det avgörs med siktlinjer från
   kameran till punkter i salen; en vägg som någon siktlinje går igenom (utanför dörröppningarna) sänks.
   En vägg byter läge på en gång, och en sänkt vägg reser sig först när den har varit ur vägen en stund. */
let viewRoom = null;
function currentRoom() {
  if (focus) return focus.def.room;
  if (cur.dist > (viewRoom ? 40 : 36)) return (viewRoom = null);
  const R = viewRoom && roomById[viewRoom], m = 1.5;
  if (R && cur.x > R.x[0] - m && cur.x < R.x[1] + m && cur.z > R.z[0] - m && cur.z < R.z[1] + m) return viewRoom;
  return (viewRoom = roomAt(cur.x, cur.z)?.id || null);
}
// Punkter i varje sal som ska synas: ett rutnät på golvet och i ögonhöjd, en bit in från väggarna.
const roomPts = Object.fromEntries(ROOMS.map(R => {
  const pts = [];
  for (let i = 0; i < 5; i++) for (let j = 0; j < 5; j++) for (const y of [0.3, 2.2]) {
    pts.push(new THREE.Vector3(R.x[0] + 1 + (R.x[1] - R.x[0] - 2) * i / 4, y, R.z[0] + 1 + (R.z[1] - R.z[0] - 2) * j / 4));
  }
  return [R.id, pts];
}));
// Går siktlinjen från C till P genom väggens massiva del?
function blocks(w, C, P) {
  const a = w.axis, b = a === 'z' ? 'x' : 'z';
  if ((C[a] - w.at) * (P[a] - w.at) >= 0) return false;
  const t = (w.at - C[a]) / (P[a] - C[a]), s = C[b] + t * (P[b] - C[b]), y = C.y + t * (P.y - C.y);
  if (s < w.from || s > w.to || y > WALL_H) return false;
  return !w.doors.some(d => s > d.from + 0.3 && s < d.to - 0.3 && y < DOOR_TOP - 0.6);
}
function updateWalls(now) {
  const room = currentRoom();
  const pts = room && (focus ? [...roomPts[room], focus.center] : roomPts[room]);
  const dx = -Math.sin(cur.yaw), dz = -Math.cos(cur.yaw);
  for (const w of MU.walls) {
    let full;
    if (room) {
      if (pts.some(P => blocks(w, camera.position, P))) w.clearSince = 0;
      else w.clearSince ||= now;
      full = w.clearSince && now - w.clearSince > 350;
    } else {
      // är väggen vänd mot kameran? (riktningen in i salen pekar då bort från kameran)
      for (const [r, n] of w.sides) { const d = w.axis === 'z' ? n * dz : n * dx; w.near[r] = w.near[r] ? d > 0.2 : d > 0.45; }
      full = w.sides.length === 1 && !w.sides.some(([r]) => w.near[r]);
      w.clearSince = full ? now - 1000 : 0;
    }
    const target = full ? WALL_H : STUB_H;
    if (target !== w.h) setWallHeight(w, target);
  }
}

/* ---------- etiketter för salarna ---------- */
function buildLabels() {
  const layer = $('#mLabels'); layer.innerHTML = '';
  labels = ROOMS.map(R => {
    const el = document.createElement('button'); el.className = 'm-room-lbl'; el.textContent = R.name;
    el.addEventListener('click', () => flyToRoom(R)); layer.appendChild(el);
    return { el, p: new THREE.Vector3((R.x[0] + R.x[1]) / 2, 0.3, (R.z[0] + R.z[1]) / 2 + 2) };
  });
}
const _v = new THREE.Vector3();
function updateLabels() {
  const w = stage.clientWidth, h = stage.clientHeight, show = !focus && cur.dist > 26;
  for (const L of labels) {
    _v.copy(L.p).project(camera);
    const x = (_v.x * 0.5 + 0.5) * w, y = (-_v.y * 0.5 + 0.5) * h;
    L.el.style.transform = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px) translate(-50%,-50%)`;
    L.el.classList.toggle('off', !show || _v.z > 1);
  }
}
function buildRoomNav() {
  const nav = $('#mRooms');
  nav.innerHTML = `<button class="chip" data-r="all">Hela museet</button>` + ROOMS.map(R => `<button class="chip" data-r="${R.id}">${esc(R.name)}</button>`).join('');
  nav.addEventListener('click', e => { const b = e.target.closest('[data-r]'); if (!b) return; b.dataset.r === 'all' ? overview() : flyToRoom(roomById[b.dataset.r]); });
}

/* ---------- föremål: fokus och infopanel ---------- */
function openFocus(a, newPart = -1) {
  if (!focus) beforeFocus = { ...goal };
  focus = a;
  Object.assign(goal, { x: a.center.x, z: a.center.z, y: a.center.y * 0.8, dist: Math.max(3, a.radius * 2.5), yaw: a.def.rot + 0.4, pitch: 0.34, ...a.def.view });
  $('#mHint').classList.add('off');
  clampGoal(); renderInfo(a.def, newPart);
}
function closeFocus(restore = true) {
  if (!focus) return;
  focus = null; $('#mInfo').hidden = true;
  if (restore && beforeFocus) Object.assign(goal, beforeFocus);
  beforeFocus = null; clampGoal();
}
function renderInfo(A, newPart = -1) {
  const n = foundCount(A.id), all = A.parts.length, R = roomById[A.room];
  const parts = all > 1 ? `<div class="m-parts"><span class="m-parts-n"><b>${n} av ${all}</b> delar hittade</span><div class="chips">${A.parts.map((p, i) => `<span class="m-part${i < n ? ' on' : ''}${i === newPart ? ' new' : ''}">${i === newPart ? 'Ny! ' : ''}${esc(p)}</span>`).join('')}</div></div>` : '';
  const body = n > 0
    ? `<p class="m-text">${esc(A.text)}</p><div class="m-fact"><b>Visste du?</b> ${esc(A.fact)}</div>`
    : `<p class="m-text m-locked">${all > 1 ? 'Delarna är inte hittade än.' : 'Det här föremålet är inte hittat än.'} Gör Dagens pass för att hitta ${all > 1 ? 'dem' : 'det'}!</p>`;
  const el = $('#mInfo');
  el.innerHTML = `<button class="ghost-btn m-close" aria-label="Stäng">Stäng</button>
    <span class="m-kicker">${esc(R.name)}</span>
    <h2>${esc(A.name)}</h2>
    <div class="m-meta"><span>${esc(A.era)}</span><span>${esc(A.place)}</span></div>
    ${parts}${body}`;
  el.hidden = false; el.scrollTop = 0;
  el.querySelector('.m-close').addEventListener('click', () => closeFocus());
}

/* ---------- pekare: dra, nyp, vrid och tryck ---------- */
function bindInput() {
  const pts = new Map(); let downAt = null, moved = 0, gesture = null, mouseRotate = false;
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const worldPerPx = () => 2 * fitDist() * Math.tan(camera.fov * Math.PI / 360) / stage.clientHeight;
  const pan = (dx, dy) => {
    const k = worldPerPx(), cy = Math.cos(cur.yaw), sy = Math.sin(cur.yaw), f = 1 / Math.max(0.55, Math.sin(cur.pitch));
    goal.x -= (dx * cy + dy * sy * f) * k; goal.z -= (-dx * sy + dy * cy * f) * k; clampGoal();
  };
  const two = () => { const [a, b] = [...pts.values()]; return { span: Math.hypot(a.x - b.x, a.y - b.y), ang: Math.atan2(b.y - a.y, b.x - a.x), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 }; };
  canvas.addEventListener('contextmenu', e => e.preventDefault());
  canvas.addEventListener('pointerdown', e => {
    try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
    mouseRotate = e.pointerType === 'mouse' && (e.button === 2 || e.shiftKey || e.ctrlKey);
    if (pts.size === 1) { downAt = { x: e.clientX, y: e.clientY, t: performance.now() }; moved = 0; }
    if (pts.size === 2) gesture = two();
    $('#mHint').classList.add('off');
  });
  canvas.addEventListener('pointermove', e => {
    const p = pts.get(e.pointerId); if (!p) return;
    const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    moved += Math.abs(dx) + Math.abs(dy);
    if (pts.size === 2 && gesture) {
      const g = two();
      goal.dist *= gesture.span / Math.max(1, g.span);
      goal.yaw -= g.ang - gesture.ang;
      if (!focus) pan(g.mx - gesture.mx, g.my - gesture.my);
      gesture = g; clampGoal(); return;
    }
    if (pts.size !== 1) return;
    if (focus || mouseRotate) { goal.yaw -= dx * 0.006; if (focus) goal.pitch += dy * 0.004; clampGoal(); }
    else pan(dx, dy);
  });
  const up = e => {
    if (!pts.has(e.pointerId)) return;
    pts.delete(e.pointerId); if (pts.size < 2) gesture = null;
    if (pts.size === 0 && downAt && moved < 10 && performance.now() - downAt.t < 600) tap(e.clientX, e.clientY);
    if (pts.size === 0) downAt = null;
  };
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', e => { e.preventDefault(); goal.dist *= Math.exp(e.deltaY * 0.0012); clampGoal(); }, { passive: false });
  function tap(x, y) {
    const r = canvas.getBoundingClientRect(); ndc.set((x - r.left) / r.width * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    const hit = ray.intersectObjects(MU.artifacts.map(a => a.hit), false)[0];
    if (hit) openFocus(MU.artifacts.find(a => a.hit === hit.object));
    else if (focus) closeFocus();
  }
  $('#mBack').addEventListener('click', () => show('home'));
  $('#mExp').addEventListener('click', openExpeditions);
  $('#mExpPanel').addEventListener('click', e => { if (e.target.id === 'mExpPanel') e.target.hidden = true; });
  $('#mHome').addEventListener('click', overview);
  $('#mRotL').addEventListener('click', () => rotate(-Math.PI / 4));
  $('#mRotR').addEventListener('click', () => rotate(Math.PI / 4));
  document.addEventListener('keydown', e => { if (running && e.key === 'Escape') { $('#mExpPanel').hidden = true; closeFocus(); } });
}

/* ---------- loopen ---------- */
function frame(t) {
  if (!running) return;
  requestAnimationFrame(frame);
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0); lastT = t;
  const k = reducedMotion ? 1 : Math.min(1, dt * 6);
  for (const key of ['x', 'z', 'y', 'dist', 'yaw', 'pitch']) cur[key] += (goal[key] - cur[key]) * k;
  materials().ghost.opacity = 0.27 + Math.sin(t / 700) * 0.07;
  for (const an of [...anims]) { const p = clamp((t - an.start) / an.dur, 0, 1); if (t < an.start) continue; an.fn(p); if (p >= 1) anims.splice(anims.indexOf(an), 1); }
  placeCamera(); camera.updateMatrixWorld(); updateWalls(t);
  renderer.render(scene, camera);
  updateLabels();
}
function enter() {
  if (!renderer && !failed) init();
  if (failed) return;
  applyFound(); resize();
  if (!running) { running = true; lastT = performance.now(); requestAnimationFrame(frame); }
  if (reveal) startReveal(reveal);
  else if (!expChosen()) openExpeditions(); // första besöket: välj en roll
  reveal = null;
}
/* ---------- nytt fynd: kameran flyger dit och delen sänks ner på sin plats ---------- */
export function revealFind(f) { reveal = f; show('museum'); }
let flash = null;
function startReveal(f) {
  const a = MU.artifacts.find(x => x.def.id === f.id); if (!a) return;
  const part = a.parts[f.part]; if (!part) return;
  setFound(part, false);
  flash.position.set(a.center.x, a.center.y + a.radius * 0.6, a.center.z);
  openFocus(a, f.part);
  const now = performance.now(), lift = Math.max(1.2, a.radius * 0.5), dur = reducedMotion ? 1 : 900, wait = reducedMotion ? 0 : 1300;
  anims.push({ start: now + wait, dur, fn: p => {
    if (!part.userData.shown) { setFound(part, true); part.userData.shown = true; }
    const e = 1 - Math.pow(1 - p, 3); part.position.y = lift * (1 - e);
    flash.intensity = Math.sin(p * Math.PI) * 60 * Math.max(1, a.radius);
    if (p >= 1) { part.position.y = 0; part.userData.shown = false; flash.intensity = 0; }
  } });
}
onShow('museum', enter);
onShow('*', id => { if (id !== 'museum') { running = false; closeFocus(false); $('#mExpPanel').hidden = true; } });
// Utvecklarkrok (bara med ?debug): styr kameran vid granskning
if (/[?&]debug/.test(location.search)) window.__museum = { goal, cur, get MU() { return MU; }, focusId: id => openFocus(MU.artifacts.find(a => a.def.id === id)), overview, flyToRoom: id => flyToRoom(roomById[id]) };
