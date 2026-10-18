/* ============ Fynd ============
   Ett fullt Dagens pass ger ett fynd: nästa del av ett slumpat föremål. Regler:
   - Högst DAILY fynd per dag, oavsett sal och expedition. Byter barnet expedition gäller samma tak.
   - Föremålet slumpas bland den valda expeditionens föremål. Har expeditionen inget att hitta just nu
     slumpas det bland alla.
   - Stora föremål byggs del för del, i delarnas ordning.
   - Bara föremål i öppna avdelningar kan hittas. Salens första avdelning är öppen från början. När 75 %
     av delarna i salens öppna avdelningar är hittade blir nästa avdelning klar, och den öppnar nästa dag. */
import { S, save } from '../store.js';
import { dayKey } from '../util.js';
import { ARTIFACTS, EXPEDITIONS, ROOMS, SECTIONS, byId, expById, sectionById } from './catalog.js';
import { roomOpen } from './rooms.js';

const have = id => S.museum.found[id] || 0;
const left = a => have(a.id) < a.parts.length && sectionOpen(a.section);

/* ---------- avdelningar ---------- */
const BUILD_SHARE = 0.75;
// Öppen: första avdelningen i salen, en som har öppnats, eller en där barnet redan har fynd (äldre sparad data).
export function sectionOpen(id) {
  const sec = sectionById[id]; if (!sec || !roomOpen(sec.room)) return false;
  return sec.start || S.museum.sections.includes(id) || ARTIFACTS.some(a => a.section === id && have(a.id) > 0);
}
const itemsIn = id => ARTIFACTS.filter(a => a.section === id);
// Hur mycket av salens öppna avdelningar som är hittat: { done, total }.
export function roomShare(roomId) {
  const items = ARTIFACTS.filter(a => a.room === roomId && sectionOpen(a.section));
  return { done: items.reduce((s, a) => s + Math.min(have(a.id), a.parts.length), 0), total: items.reduce((s, a) => s + a.parts.length, 0) };
}
// Nästa avdelning som kan byggas klart i salen (stängd och med föremål), eller null.
export const nextSection = roomId => SECTIONS.find(sec => sec.room === roomId && !sectionOpen(sec.id) && itemsIn(sec.id).length) || null;
// Hur många fler delar som behövs innan nästa avdelning i salen blir klar.
export function partsToBuild(roomId) { const { done, total } = roomShare(roomId); return Math.max(0, Math.ceil(total * BUILD_SHARE) - done); }
// Avdelningar som blir klara idag öppnar nästa dag. Returnerar avdelningarna som just blev klara.
export function updateSections() {
  const today = dayKey(), P = S.museum.pending, built = [];
  for (const [id, day] of Object.entries(P)) if (day < today) { delete P[id]; if (!S.museum.sections.includes(id)) S.museum.sections.push(id); S.museum.fresh.push(id); }
  for (const R of ROOMS) {
    if (!roomOpen(R.id)) continue;
    if (Object.keys(P).some(id => sectionById[id]?.room === R.id)) continue;
    const next = nextSection(R.id);
    if (next && partsToBuild(R.id) === 0) { P[next.id] = today; built.push(next); }
  }
  save();
  return built;
}
export const pendingIn = roomId => Object.keys(S.museum.pending).find(id => sectionById[id]?.room === roomId) || null;
// Avdelningar som har öppnat sedan barnet senast var i museet (för öppningen i museet).
export function takeFresh() { const f = S.museum.fresh.splice(0); save(); return f; }
// Innan barnet har valt en expedition kommer fynden som för Upptäckaren.
export const expChosen = () => !!expById[S.museum.expedition];
export const expedition = () => expById[S.museum.expedition] || EXPEDITIONS[0];
// Fynd per dag, och hur många som är kvar idag.
export const DAILY = 3;
const findsToday = () => { const today = dayKey(); return S.museum.log.filter(x => dayKey(x.t) === today).length; };
export const findsLeftToday = () => Math.max(0, DAILY - findsToday());
// Föremål som kan hittas (delar kvar i en öppen avdelning), i första hand expeditionens.
export function candidates() {
  updateSections();
  const open = ARTIFACTS.filter(left), mine = open.filter(a => expedition().items.includes(a.id));
  return mine.length ? mine : open;
}
// Finns något att hitta i de öppna avdelningarna?
export const canFind = () => ARTIFACTS.some(left);
export const museumComplete = () => !ARTIFACTS.some(a => have(a.id) < a.parts.length);
// Hur långt en expedition har kommit: hittade delar av dess föremål.
export function expProgress(e) {
  const items = e.items.map(id => byId[id]);
  const total = items.reduce((s, a) => s + a.parts.length, 0), done = items.reduce((s, a) => s + Math.min(have(a.id), a.parts.length), 0);
  return { done, total, complete: done >= total };
}
export function setExpedition(id) { if (expById[id]) { S.museum.expedition = id; save(); } }
// Ger ett slumpat fynd och sparar det. Returnerar { id, part, def, exp, expDone, built, other, left }
// (other: fyndet hör inte till expeditionen, left: fynd kvar idag), { none: 'today' } när dagens fynd är tagna, { none: 'building' } när allt i de öppna
// avdelningarna är hittat och nya avdelningar byggs, eller { none: 'complete' } när museet är fullt.
export function grantFind() {
  if (museumComplete()) return { none: 'complete' };
  if (!findsLeftToday()) return { none: 'today' };
  const list = candidates();
  if (!list.length) return { none: 'building' };
  const A = list[Math.floor(Math.random() * list.length)];
  const e = expedition(), wasDone = expProgress(e).complete, part = have(A.id);
  S.museum.found[A.id] = part + 1;
  S.museum.log.push({ t: Date.now(), id: A.id, part }); if (S.museum.log.length > 300) S.museum.log.shift();
  save();
  const built = updateSections();
  return { id: A.id, part, def: A, exp: e, expDone: !wasDone && expProgress(e).complete, built, other: !e.items.includes(A.id), left: findsLeftToday() };
}
