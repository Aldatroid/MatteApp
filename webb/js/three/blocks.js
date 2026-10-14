/* ============ Byggstenar: multiplikation ============ */
import { THREE, has3D, content, setView, addLabel, anchorAt, popIn, later, onClear } from './scene.js';
import { stoneSeed, stoneCube, stoneTile } from './stones.js';
import { playRoll } from '../sound.js';

export function mulOrigin(a, cols) { return { ox: -(cols - 1) / 2, oz: -(a - 1) / 2 }; }
export function mulBase(a, b, cols, fmt) {
  if (!has3D) return;
  const s = Math.max(a, cols, 3);
  setView({ dist: s * 1.55 + 5, elev: 1.0, rotY: 0, rotX: 0, clampX: [-0.45, 0.35] });
  const { ox, oz } = mulOrigin(a, cols);
  const n = fmt === 'prod' ? b : 1;
  mulGhosts = new THREE.Group(); content.add(mulGhosts);
  for (let i = 0; i < a; i++) for (let j = 0; j < n; j++) {
    const t = stoneTile(stoneSeed(i, j)); t.position.set(ox + j, 0.07, oz + i); mulGhosts.add(t); mulGhosts.userData[i + "," + j] = t;
  }
  if (fmt !== 'prod') {
    addLabel(`${a} rader`, anchorAt(content, ox - 1.4, 0.2, 0));
    addLabel('? i varje', anchorAt(content, ox + 2.2, 0.2, oz));
  }
}
export const GAP = 0.9;
let mulGhosts = null;
onClear(() => { mulGhosts = null; });
export function buildGrid(a, b, ox, oz, { anim = 'fast', split = null, rowLabels = false } = {}) {
  const grp = new THREE.Group(); content.add(grp);
  if (split && mulGhosts) mulGhosts.visible = false;
  const per = Math.min(14, 700 / (a * b)), pops = [];
  for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) {
    const part = split ? (split.axis === 'col' ? (j < split.at ? 0 : 1) : (i < split.at ? 0 : 1)) : 0;
    const gx = part && split.axis === 'col' ? GAP : 0, gz = part && split.axis === 'row' ? GAP : 0;
    const m = stoneCube(stoneSeed(i, j, 3), part ? (i % 2 ? 'gold2' : 'gold') : (i % 2 ? 'alt' : 'base')); m.position.set(ox + j + gx, 0.59, oz + i + gz); grp.add(m);
    const s = [0.9, 0.9, 0.9];
    // plattan under kuben göms när kuben dyker upp
    const tile = mulGhosts?.userData[i + "," + j], delay = anim === 'rows' ? 250 + i * 420 + j * 18 : (i * b + j) * per;
    if (anim === 'none') { m.scale.set(...s); if (tile) tile.visible = false; }
    else { popIn(m, s, delay); pops.push(delay); if (tile) later(delay + 120, () => { tile.visible = false; }); }
  }
  playRoll(pops);
  if (rowLabels) for (let i = 0; i < a; i++) later(250 + i * 420 + b * 18, () => addLabel(String(b * (i + 1)), anchorAt(grp, ox + b + 0.4, 0.5, oz + i), { cls: 'num' }));
  return grp;
}
