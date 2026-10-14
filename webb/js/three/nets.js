/* ============ Byggstenar: utfällningar ============ */
import { rnd } from '../util.js';
import { THREE, G, C, FACE_COLORS, content, view, cam, stdMat, addLabel, anchorAt, tween, ease, setView } from './scene.js';

export const DIRS = [['E', 1, 0], ['W', -1, 0], ['S', 0, 1], ['N', 0, -1]];
export function roll(o, d) {
  const { D, U, N, S: So, E, W } = o;
  if (d === 'E') return { D: E, E: U, U: W, W: D, N, S: So };
  if (d === 'W') return { D: W, W: U, U: E, E: D, N, S: So };
  if (d === 'S') return { D: So, S: U, U: N, N: D, E, W };
  return { D: N, N: U, U: So, S: D, E, W };
}
export const OPP = { 0: 1, 1: 0, 2: 3, 3: 2, 4: 5, 5: 4 };
export function netInfo(cells) {
  const key = (x, y) => x + ',' + y;
  const set = new Map(cells.map(c => [key(c[0], c[1]), c]));
  const nb = c => DIRS.map(([d, dx, dy]) => ({ d, c: set.get(key(c[0] + dx, c[1] + dy)) })).filter(o => o.c);
  let root = cells[0], best = -1;
  for (const c of cells) { const k = nb(c).length; if (k > best) { best = k; root = c; } }
  const info = new Map();
  info.set(key(...root), { cell: root, dir: null, o: { D: 0, U: 1, N: 2, S: 3, E: 4, W: 5 }, children: [] });
  const q = [root];
  while (q.length) {
    const c = q.shift(); const ci = info.get(key(...c));
    for (const { d, c: n } of nb(c)) {
      const k = key(...n); if (info.has(k)) continue;
      const ni = { cell: n, dir: d, o: roll(ci.o, d), children: [] }; info.set(k, ni); ci.children.push(ni); q.push(n);
    }
  }
  const counts = {}; for (const i of info.values()) counts[i.o.D] = (counts[i.o.D] || 0) + 1;
  const connected = info.size === cells.length;
  return { root, info, key, connected, counts, valid: connected && cells.length === 6 && Object.keys(counts).length === 6 };
}
export function normCells(cells) { const mx = Math.min(...cells.map(c => c[0])), my = Math.min(...cells.map(c => c[1])); return cells.map(([x, y]) => [x - mx, y - my]); }
export function transformNet(cells) {
  let c = cells.map(p => [...p]);
  if (Math.random() < 0.5) c = c.map(([x, y]) => [-x, y]);
  const k = rnd(0, 3); for (let i = 0; i < k; i++) c = c.map(([x, y]) => [-y, x]);
  return normCells(c);
}
export function buildNet(cells, { letters = null } = {}) {
  const NI = netInfo(cells);
  const xs = cells.map(c => c[0]), ys = cells.map(c => c[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  const group = new THREE.Group(); content.add(group);
  const hinges = []; let idx = 0;
  const OFF = { E: [1, 0], W: [-1, 0], S: [0, 1], N: [0, -1] };
  function makeNode(ni) {
    const node = new THREE.Group();
    ni.color = FACE_COLORS[idx % 6]; ni.mat = stdMat(ni.color);
    const tile = new THREE.Mesh(G.box, ni.mat); tile.scale.set(0.96, 0.06, 0.96); node.add(tile);
    ni.node = node; ni.idx = idx; idx++;
    if (letters) {
      const ch = letters[NI.key(...ni.cell)];
      if (ch) {
        addLabel(ch, anchorAt(node, 0, 0.05, 0), { cls: 'letter', normal: new THREE.Vector3(0, 1, 0), hideBack: true });
        addLabel(ch, anchorAt(node, 0, -0.05, 0), { cls: 'letter', normal: new THREE.Vector3(0, -1, 0), hideBack: true });
      }
    }
    for (const ch of ni.children) {
      const [dx, dz] = OFF[ch.dir];
      const hinge = new THREE.Group(); hinge.position.set(dx * 0.5, 0, dz * 0.5); node.add(hinge);
      const cn = makeNode(ch); cn.position.set(dx * 0.5, 0, dz * 0.5); hinge.add(cn);
      hinges.push({ hinge, dir: ch.dir });
    }
    return node;
  }
  const rootInfo = NI.info.get(NI.key(...NI.root));
  const rootNode = makeNode(rootInfo);
  const rx = NI.root[0] - cx, rz = NI.root[1] - cy;
  rootNode.position.set(rx, 0, rz); group.add(rootNode);
  function setFold(p) {
    const a = p * Math.PI / 2;
    for (const { hinge, dir } of hinges) {
      hinge.rotation.set(0, 0, 0);
      if (dir === 'E') hinge.rotation.z = a; else if (dir === 'W') hinge.rotation.z = -a;
      else if (dir === 'S') hinge.rotation.x = -a; else hinge.rotation.x = a;
    }
    group.position.set(-rx * p, -0.5 * p, -rz * p);
  }
  const span = Math.max(Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys)) + 1;
  return { NI, group, setFold, span, rootInfo, folded: 0 };
}
export function foldNet(net, to = 1, dur = 1700) {
  const from = net.folded; const d0 = view.dist; const d1 = to ? 7.5 : net.span * 1.5 + 5;
  tween(dur, p => { const f = from + (to - from) * p; net.setFold(f); net.folded = f; view.dist = d0 + (d1 - d0) * p; }, { e: ease.inOut, done: () => { if (to) { cam.rotTY += 0.75; cam.rotTX = 0.25; } } });
  return dur;
}
export function netView(span) { setView({ dist: span * 1.5 + 5, elev: 0.95, rotY: 0, rotX: 0, clampX: [-0.6, 0.6] }); }
export function markCollisions(net) {
  for (const ni of net.NI.info.values()) if (net.NI.counts[ni.o.D] > 1) ni.mat.color.set(C.red);
}
export const NETS_VALID = [
  [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [0, 2]], [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]],
  [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [2, 2]], [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [3, 2]],
  [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [1, 2]], [[1, 0], [0, 1], [1, 1], [2, 1], [3, 1], [2, 2]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [1, 2]], [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [2, 2]],
  [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [3, 2]], [[0, 0], [1, 0], [1, 1], [2, 1], [2, 2], [3, 2]],
  [[0, 0], [1, 0], [2, 0], [2, 1], [3, 1], [4, 1]],
];
export const NETS_EASY_VALID = NETS_VALID.slice(0, 6);
export const NETS_EASY_INVALID = [
  [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]], [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1]], [[0, 0], [0, 1], [1, 1], [2, 1], [3, 1], [4, 1]],
];
export const NETS_INVALID = [
  ...NETS_EASY_INVALID,
  [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [3, 2]], [[0, 0], [1, 0], [0, 1], [1, 1], [2, 1], [3, 1]],
  [[1, 0], [0, 1], [1, 1], [2, 1], [0, 2], [2, 2]], [[0, 0], [1, 0], [1, 1], [2, 1], [3, 1], [4, 1]],
  [[0, 1], [1, 1], [2, 1], [1, 0], [2, 0], [3, 1]],
];
