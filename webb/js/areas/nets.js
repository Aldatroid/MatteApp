/* ============ Uppgifter: utfällningar ============ */
import { pick, shuffle } from '../util.js';
import { has3D, cam, addLabel, anchorAt, later } from '../three/scene.js';
import { OPP, netInfo, normCells, transformNet, buildNet, foldNet, netView, markCollisions, NETS_VALID, NETS_EASY_VALID, NETS_EASY_INVALID, NETS_INVALID } from '../three/nets.js';
import { kicker } from '../levels.js';

// Nivåer i ordning. step: 1 = blir det en kub? (raka, tydliga utfällningar), 2 = samma fråga med vridna
// och speglade utfällningar, 3 = vilken bokstav hamnar mittemot A?
const levels = [
  { step: 1, text: 'Blir det en kub? Tydliga utfällningar' },
  { step: 2, text: 'Blir det en kub? Vridna och speglade' },
  { step: 3, text: 'Vilken sida hamnar mittemot?' },
];

const area = { id: 'nets', name: 'Utfällningar', short: 'Utfällningar', levels, gen: (L, n) => genNets(L, n) };
export default area;

function genNets(L, num) {
  const level = L.step;
  let net = null;
  if (level === 3) {
    const cells = transformNet(pick(NETS_VALID));
    const letters = shuffle(['A', 'B', 'C', 'D', 'E', 'F']); const map = {};
    cells.forEach((c, i) => map[c[0] + ',' + c[1]] = letters[i]);
    const NI = netInfo(cells);
    let faceA, ans;
    for (const ni of NI.info.values()) if (map[NI.key(...ni.cell)] === 'A') faceA = ni.o.D;
    for (const ni of NI.info.values()) if (ni.o.D === OPP[faceA]) ans = map[NI.key(...ni.cell)];
    return {
      skill: 'nets', level: num, kicker: kicker(area, num), text: 'Vik ihop i tanken. Vilken bokstav hamnar mittemot A?', sub: 'Mittemot betyder på andra sidan kuben.',
      input: 'choice', choices: ['B', 'C', 'D', 'E', 'F'].map(x => ({ label: x, value: x })), answer: ans, describe: 'Mittemot A',
      remake: () => genNets(L, num),
      build() { if (!has3D) return; net = buildNet(cells, { letters: map }); netView(net.span); },
      hint() { return 'Två rutor med precis en ruta emellan, på rak linje, hamnar mittemot varandra.'; },
      reveal(ok) {
        if (net) { foldNet(net, 1); later(1700, () => { cam.rotTY += Math.PI; }); }
        return { text: `<b>${ans}</b> hamnar mittemot A. Snurra på kuben och kolla!`, auto: 0 };
      },
    };
  }
  const wantValid = Math.random() < 0.5;
  let cells = level === 1 ? pick(wantValid ? NETS_EASY_VALID : NETS_EASY_INVALID) : transformNet(pick(wantValid ? NETS_VALID : NETS_INVALID));
  cells = normCells(cells);
  const valid = netInfo(cells).valid;
  return {
    skill: 'nets', level: num, kicker: kicker(area, num), text: 'Går det att vika ihop den här till en kub?', sub: 'Tänk dig att du viker längs linjerna.',
    input: 'choice', choices: [{ label: 'Ja', value: 'ja' }, { label: 'Nej', value: 'nej' }], answer: valid ? 'ja' : 'nej', describe: 'Utfällning blir kub?',
    remake: () => genNets(L, num),
    build() { if (!has3D) return; net = buildNet(cells); netView(net.span); },
    hint() {
      if (net) { net.rootInfo.mat.color.set('#FFFFFF'); addLabel('botten', anchorAt(net.rootInfo.node, 0, 0.1, 0), { cls: 'sun' }); }
      return 'Tänk att den vita rutan är botten. Vilka rutor blir väggar och vilken blir lock? Krockar två rutor?';
    },
    reveal(ok) {
      if (net) { foldNet(net, 1); later(1750, () => { if (!valid) markCollisions(net); }); }
      return { text: valid ? 'Den blir en kub!' : 'Två sidor hamnar på samma ställe (röda), så det blir ingen kub.', auto: 0 };
    },
  };
}
