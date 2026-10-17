/* ============ Fynd ============
   Ett fullt Dagens pass ger ett fynd: nästa del enligt den valda expeditionens ordning (EXPEDITIONS i catalog.js).
   När expeditionen är klar kommer fynden enligt ORDER, och därefter får föremål som ännu saknar delar
   sina delar i katalogens ordning. */
import { S, save } from '../store.js';
import { ARTIFACTS, ORDER, EXPEDITIONS, byId, expById } from './catalog.js';

const have = id => S.museum.found[id] || 0;
// Första id i listan vars del ännu inte är hittad (listan har ett id per del).
function nextIn(list) {
  const seen = {};
  for (const id of list) {
    if (!byId[id]) continue;
    seen[id] = (seen[id] || 0) + 1;
    if (seen[id] > have(id) && have(id) < byId[id].parts.length) return id;
  }
  return null;
}
export const expedition = () => expById[S.museum.expedition] || EXPEDITIONS[0];
export const nextFind = () => nextIn(expedition().order) || nextIn(ORDER) || ARTIFACTS.find(a => have(a.id) < a.parts.length)?.id || null;
// Hur långt en expedition har kommit: hittade delar av dess fynd.
export function expProgress(e) {
  const need = {}; for (const id of e.order) need[id] = (need[id] || 0) + 1;
  const total = e.order.length, done = Object.entries(need).reduce((s, [id, n]) => s + Math.min(n, have(id)), 0);
  return { done, total, complete: done >= total };
}
export function setExpedition(id) { if (expById[id]) { S.museum.expedition = id; save(); } }
// Ger nästa fynd och sparar det. Returnerar { id, part, def, exp, expDone } eller null när museet är komplett.
// expDone = true när just det här fyndet gjorde expeditionen klar.
export function grantFind() {
  const id = nextFind(); if (!id) return null;
  const e = expedition(), wasDone = expProgress(e).complete;
  const part = have(id);
  S.museum.found[id] = part + 1;
  S.museum.log.push({ t: Date.now(), id, part }); if (S.museum.log.length > 300) S.museum.log.shift();
  save();
  return { id, part, def: byId[id], exp: e, expDone: !wasDone && expProgress(e).complete };
}
