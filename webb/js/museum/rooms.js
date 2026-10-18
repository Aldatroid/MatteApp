/* ============ Salar som öppnar med mål i matten ============
   Salar med start: true är öppna från början. De andra öppnar när barnet når salens mål (goal), till exempel
   nivå 3 i Bråk, eller reservvägen (backup), ett antal hittade delar, så att ingen fastnar om föräldern har
   tagit bort området ur Dagens pass. En öppnad sal stängs aldrig igen, även om nivån går ner.
   Mål: { type: 'level', area, level } | { type: 'facts', n } (gångertal som sitter) | { type: 'finds', n }. */
import { S, save } from '../store.js';
import { areaById, passAreas } from '../curriculum.js';
import { countGood } from '../areas/mul.js';
import { ROOMS, ARTIFACTS, roomById } from './catalog.js';

const found = () => ARTIFACTS.reduce((s, a) => s + Math.min(S.museum.found[a.id] || 0, a.parts.length), 0);
// Öppen: från början, öppnad, eller en sal där barnet redan har fynd (äldre sparad data).
export function roomOpen(id) {
  const R = roomById[id]; if (!R) return false;
  return !!R.start || S.museum.rooms.includes(id) || ARTIFACTS.some(a => a.room === id && (S.museum.found[a.id] || 0) > 0);
}
// Hur långt barnet har kommit mot ett mål: { text, now, target, done }.
export function goalState(g) {
  if (g.type === 'level') {
    const A = areaById(g.area), now = S.geo[g.area]?.level || 1;
    // mätaren går från nivå 1 (där alla börjar) till målnivån
    return { text: `Nivå ${g.level} i ${A?.name || g.area}`, now: Math.min(now, g.level), target: g.level, done: now >= g.level, area: g.area, share: (Math.min(now, g.level) - 1) / Math.max(1, g.level - 1) };
  }
  if (g.type === 'facts') { const now = countGood(); return { text: `${g.n} gångertal som sitter`, now: Math.min(now, g.n), target: g.n, done: now >= g.n, share: Math.min(1, now / g.n) }; }
  const now = found(); return { text: `${g.n} hittade fynd`, now: Math.min(now, g.n), target: g.n, done: now >= g.n, share: Math.min(1, now / g.n) };
}
// Målen som visas för en stängd sal. Ett mål i ett område som inte är med i Dagens pass visas inte;
// då återstår reservvägen.
export function roomGoals(R) {
  const list = [];
  if (R.goal) { const st = goalState(R.goal); if (R.goal.type !== 'level' || passAreas().some(x => x.area.id === R.goal.area)) list.push(st); }
  if (R.backup) list.push({ ...goalState(R.backup), backup: true });
  return list;
}
// Öppnar salar vars mål är nådda. Returnerar salarna som just öppnade.
export function checkRooms() {
  const opened = [];
  for (const R of ROOMS) {
    if (roomOpen(R.id)) continue;
    if ((R.goal && goalState(R.goal).done) || (R.backup && goalState(R.backup).done)) {
      S.museum.rooms.push(R.id); S.museum.freshRooms.push(R.id); opened.push(R);
    }
  }
  if (opened.length) save();
  return opened;
}
// Salar som har öppnat sedan barnet senast var i museet (för öppningen i museet).
export function takeFreshRooms() { const f = S.museum.freshRooms.splice(0); save(); return f; }
