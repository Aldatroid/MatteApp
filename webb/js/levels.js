/* ============ Nivåer ============
   Områden med nivåer (allt utom tabellerna) har en lista `levels` i sin modul. Barnet börjar på nivå 1
   och flyttas upp efter 4 rätt av 5, och ned efter 2 fel i rad. Nivånumret sparas, så om listan
   ändras gäller nya ordningen direkt. */
import { clamp } from './util.js';
import { S } from './store.js';

export function levelState(area) {
  const g = S.geo[area.id] ||= { level: 1, recent: [], seen: 0, right: 0, last: 0 };
  g.level = clamp(g.level, 1, area.levels.length);
  return g;
}
// Nivån som nästa uppgift ska ha: { L: nivåobjektet, n: nivånumret (1, 2, …) }.
export function currentLevel(area) { const n = levelState(area).level; return { L: area.levels[n - 1], n }; }
export const kicker = (area, n) => `${area.name} · nivå ${n}`;
// score: 1 = rätt direkt, 0.5 = rätt med tips eller på andra försöket, 0 = fel. Returnerar +1/-1 vid nivåbyte.
export function updateLevel(area, score) {
  const g = levelState(area); g.seen++; if (score === 1) g.right++; g.last = Date.now();
  g.recent.push(score); if (g.recent.length > 5) g.recent.shift();
  const sum = g.recent.reduce((a, b) => a + b, 0);
  if (g.recent.length >= 5 && sum >= 4 && g.level < area.levels.length) { g.level++; g.recent = []; return 1; }
  const l2 = g.recent.slice(-2);
  if (l2.length === 2 && l2[0] === 0 && l2[1] === 0 && g.level > 1) { g.level--; g.recent = []; return -1; }
  return 0;
}
