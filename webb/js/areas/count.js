/* ============ Uppgifter: ytor, kanter och hörn ============ */
import { pick, cap } from '../util.js';
import { view } from '../three/scene.js';
import { SOLIDS, POLY_IDS, WHAT, buildSolid, solidView, highlightSolid, countSequence } from '../three/solids.js';
import { kicker } from '../levels.js';

// Nivåer i ordning. pool = kroppar, ask = vad som kan efterfrågas (f = sidoytor, e = kanter, v = hörn).
// Kuben är lätt, så den blandas med fler kroppar redan från början.
const levels = [
  { text: 'Kub, rätblock och pyramid; ytor och hörn', pool: ['kub', 'ratblock', 'pyramid'], ask: ['f', 'v'] },
  { text: 'Även tresidigt prisma; ytor, kanter och hörn', pool: ['kub', 'ratblock', 'pyramid', 'triprisma'], ask: ['f', 'e', 'v'] },
  { text: 'Prismor och pyramider', pool: ['ratblock', 'pyramid', 'triprisma', 'tripyr', 'hexprisma'], ask: ['f', 'e', 'v'] },
  { text: 'Alla kroppar med plana ytor', pool: POLY_IDS, ask: ['f', 'e', 'v'] },
];

let lastCount = '';
const area = {
  id: 'count', name: 'Ytor, kanter och hörn', short: 'Ytor, kanter, hörn', levels,
  gen(L, lvl) {
    // samma fråga kommer aldrig två gånger i rad
    let id, what;
    do { id = pick(L.pool); what = pick(L.ask); } while (id + what === lastCount && L.pool.length * L.ask.length > 1);
    lastCount = id + what; const def = SOLIDS[id];
    const n = def[what]; let obj;
    return {
      skill: 'count', level: lvl, kicker: kicker(area, lvl), text: `Hur många ${WHAT[what]} har ${def.art} ${def.name}?`, sub: 'Snurra på kroppen så att du ser baksidan också.',
      input: 'num', answer: n, unit: WHAT[what], describe: `${cap(WHAT[what])}: ${def.name}`,
      remake: () => area.gen(L, lvl),
      build() { solidView(true); obj = buildSolid(id); },
      hint() { if (obj) { highlightSolid(obj, what); view.autoSpin = true; } return `Jag har färgat alla ${WHAT[what]}. Snurra och räkna. Glöm inte baksidan!`; },
      reveal(ok) {
        if (obj) { if (ok) highlightSolid(obj, what); else { view.autoSpin = true; countSequence(obj, what); } }
        return { text: `${cap(def.art)} ${def.name} har <b>${n}</b> ${WHAT[what]}.`, auto: ok ? 2600 : 0 };
      },
      tag(g) {
        g = Number(g);
        if ((what === 'e' && g === def.v) || (what === 'v' && g === def.e)) return 'kant-hörn';
        if (g > 0 && g < n) return 'synliga';
        return null;
      },
    };
  },
  tags: {
    'kant-hörn': 'Blandar ihop kanter och hörn.',
    'synliga': 'Räknar ofta bara det som syns och glömmer baksidan av kroppen.',
  },
};
export default area;
