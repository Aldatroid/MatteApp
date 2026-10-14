/* ============ Uppgifter: känna igen kroppar ============ */
import { pick, shuffle, cap } from '../util.js';
import { SOLIDS, buildSolid, solidView } from '../three/solids.js';
import { kicker } from '../levels.js';

// Nivåer i ordning. pool = kroppar som kan komma, choices = antal svarsalternativ.
// Ändra ordning eller innehåll här; nivå 1 är den första i listan.
const levels = [
  { text: 'Vanliga kroppar, tre alternativ', pool: ['kub', 'klot', 'cylinder', 'kon'], choices: 3 },
  { text: 'Fler kroppar, fyra alternativ', pool: ['kub', 'ratblock', 'klot', 'cylinder', 'kon', 'pyramid'], choices: 4 },
  { text: 'Alla kroppar, även prismor', pool: Object.keys(SOLIDS), choices: 4 },
];
// Kroppar som är lätta att blanda ihop; de väljs först som felaktiga alternativ.
const CONF = { kub: ['ratblock'], ratblock: ['kub', 'triprisma'], pyramid: ['tripyr', 'kon'], tripyr: ['pyramid', 'triprisma'], triprisma: ['tripyr', 'hexprisma', 'ratblock'], hexprisma: ['triprisma', 'cylinder'], kon: ['pyramid', 'cylinder'], cylinder: ['hexprisma', 'kon'], klot: ['cylinder'] };

const area = {
  id: 'shapes', name: 'Känna igen kroppar', short: 'Kroppar', levels,
  gen(L, n) {
    const pool = L.pool; const id = pick(pool);
    const opts = [id, ...shuffle(CONF[id].filter(x => pool.includes(x)))].slice(0, L.choices);
    for (const x of shuffle(pool)) if (opts.length < L.choices && !opts.includes(x)) opts.push(x);
    const def = SOLIDS[id];
    return {
      skill: 'shapes', level: n, kicker: kicker(area, n), text: 'Vad heter kroppen?', sub: 'Snurra på den med fingret.',
      input: 'choice', choices: shuffle(opts).map(x => ({ label: cap(SOLIDS[x].name), value: x })), answer: id, describe: `Kropp: ${def.name}`,
      remake: () => area.gen(L, n),
      build() { solidView(true); buildSolid(id); },
      hint() { return def.clue; },
      reveal(ok) { return { text: `Det är ${def.art} ${def.name}. ${def.clue}`, auto: ok ? 2600 : 0 }; },
    };
  },
};
export default area;
