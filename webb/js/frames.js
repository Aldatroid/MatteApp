/* ============ Bildramar utan skarvar ============
   CSS border-image ritar nio separata bitar, som glipar när ett element skalas (t.ex. vid tryck).
   Här ritas varje ram ihop till EN canvas i elementets storlek, på hela skärmpixlar och med lite överlapp,
   och läggs bakom innehållet. Ritas om när storleken ändras. */
const FRAMES = [
  { sel: '#panel,.card,.section,.gate-box,.stat,.tile-free', src: 'assets/panel.png', slice: [80, 80, 80, 80], width: [20, 20, 20, 20] },
  { sel: '.q-kicker,.card-kicker', src: 'assets/header.png', slice: [44, 280, 44, 240], width: [11, 70, 11, 60] },
  { sel: '.topbar', src: 'assets/topbar.png', slice: [60, 240, 60, 240], width: [15, 60, 15, 60] },
];
FRAMES.forEach(f => { f.img = new Image(); f.img.src = f.src; f.ready = f.img.decode().then(() => true, () => false); });
const frameOf = new WeakMap();
const frameRO = new ResizeObserver(entries => entries.forEach(e => drawFrame(e.target)));
function drawFrame(el) {
  const f = frameOf.get(el); const cv = el.querySelector(':scope > .frame-cv');
  if (!f || !cv || !f.img.naturalWidth) return;
  const dpr = Math.min(3, window.devicePixelRatio || 1);
  const W = el.offsetWidth, H = el.offsetHeight; if (!W || !H) return;
  const w = Math.round(W * dpr), h = Math.round(H * dpr);
  if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
  const ctx = cv.getContext('2d'); ctx.clearRect(0, 0, w, h); ctx.imageSmoothingQuality = 'high';
  const img = f.img, iw = img.naturalWidth, ih = img.naturalHeight;
  const [st, sr, sb, sl] = f.slice; let [dt, dr, db, dl] = f.width.map(v => Math.round(v * dpr));
  const k = Math.min(1, w / (dl + dr), h / (dt + db)); if (k < 1) { dt = Math.floor(dt * k); db = Math.floor(db * k); dl = Math.floor(dl * k); dr = Math.floor(dr * k); }
  const sx = [0, sl, iw - sr, iw], sy = [0, st, ih - sb, ih], dx = [0, dl, w - dr, w], dy = [0, dt, h - db, h];
  // ordning: mitt, kanter, hörn – varje bit 1 px större inåt så att grannarna överlappar
  const order = [[1, 1], [1, 0], [1, 2], [0, 1], [2, 1], [0, 0], [2, 0], [0, 2], [2, 2]];
  for (const [i, j] of order) {
    const pw = dx[i + 1] - dx[i], ph = dy[j + 1] - dy[j]; if (pw <= 0 || ph <= 0) continue;
    const ox0 = i > 0 ? 1 : 0, ox1 = i < 2 ? 1 : 0, oy0 = j > 0 ? 1 : 0, oy1 = j < 2 ? 1 : 0;
    ctx.drawImage(img, sx[i], sy[j], sx[i + 1] - sx[i], sy[j + 1] - sy[j], dx[i] - ox0, dy[j] - oy0, pw + ox0 + ox1, ph + oy0 + oy1);
  }
}
function bakeFrame(el, f) {
  if (!el.querySelector(':scope > .frame-cv')) { const cv = document.createElement('canvas'); cv.className = 'frame-cv'; cv.setAttribute('aria-hidden', 'true'); el.prepend(cv); }
  if (frameOf.get(el) !== f) { frameOf.set(el, f); frameRO.observe(el); }
  el.classList.add('baked');
  f.ready.then(ok => ok && drawFrame(el));
}
function bakeFrames(root = document) {
  for (const f of FRAMES) {
    if (root.nodeType === 1 && root.matches(f.sel)) bakeFrame(root, f);
    root.querySelectorAll?.(f.sel).forEach(el => bakeFrame(el, f));
  }
}
new MutationObserver(muts => { for (const m of muts) { bakeFrames(m.target); m.addedNodes.forEach(n => n.nodeType === 1 && bakeFrames(n)); } })
  .observe(document.getElementById('app'), { childList: true, subtree: true });
bakeFrames();
