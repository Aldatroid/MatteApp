/* ============ Fynd ============
   Ett fullt Dagens pass ger ett fynd: nästa del enligt fyndordningen (ORDER i catalog.js).
   Är ordningen slut får föremål som ännu saknar delar sina delar i katalogens ordning. */
import { S, save } from '../store.js';
import { ARTIFACTS, ORDER, byId } from './catalog.js';

export function nextFind() {
  const found = S.museum.found, seen = {};
  for (const id of ORDER) {
    if (!byId[id]) continue;
    seen[id] = (seen[id] || 0) + 1;
    if (seen[id] > (found[id] || 0) && (found[id] || 0) < byId[id].parts.length) return id;
  }
  return ARTIFACTS.find(a => (found[a.id] || 0) < a.parts.length)?.id || null;
}
// Ger nästa fynd och sparar det. Returnerar { id, part, def } eller null när museet är komplett.
export function grantFind() {
  const id = nextFind(); if (!id) return null;
  const part = S.museum.found[id] || 0;
  S.museum.found[id] = part + 1;
  S.museum.log.push({ t: Date.now(), id, part }); if (S.museum.log.length > 300) S.museum.log.shift();
  save();
  return { id, part, def: byId[id] };
}
