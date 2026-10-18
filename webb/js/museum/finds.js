/* ============ Fynd ============
   Ett fullt Dagens pass ger ett fynd: nästa del av ett slumpat föremål. Regler:
   - Högst ett fynd per sal och dag. Fortsätter barnet göra pass samma dag kommer fynden från andra salar,
     och när alla salar med saker kvar har fått något den dagen blir det inga fler fynd förrän i morgon.
   - Föremålet slumpas, i första hand bland den valda expeditionens föremål, annars bland alla.
   - Stora föremål byggs del för del, i delarnas ordning. */
import { S, save } from '../store.js';
import { dayKey } from '../util.js';
import { ARTIFACTS, EXPEDITIONS, byId, expById } from './catalog.js';

const have = id => S.museum.found[id] || 0;
const left = a => have(a.id) < a.parts.length;
// Innan barnet har valt en expedition kommer fynden som för Upptäckaren.
export const expChosen = () => !!expById[S.museum.expedition];
export const expedition = () => expById[S.museum.expedition] || EXPEDITIONS[0];
// Salar som redan har fått ett fynd idag.
export function roomsToday() {
  const today = dayKey(), rooms = new Set();
  for (const x of S.museum.log) if (dayKey(x.t) === today && byId[x.id]) rooms.add(byId[x.id].room);
  return rooms;
}
// Föremål som kan hittas idag (salen har inte fått något idag och föremålet har delar kvar).
export function candidates() {
  const used = roomsToday(), open = ARTIFACTS.filter(a => left(a) && !used.has(a.room));
  const mine = open.filter(a => expedition().items.includes(a.id));
  return mine.length ? mine : open;
}
// Salar där något fortfarande kan hittas idag.
export const roomsLeftToday = () => [...new Set(ARTIFACTS.filter(a => left(a) && !roomsToday().has(a.room)).map(a => a.room))];
export const museumComplete = () => !ARTIFACTS.some(left);
// Hur långt en expedition har kommit: hittade delar av dess föremål.
export function expProgress(e) {
  const items = e.items.map(id => byId[id]);
  const total = items.reduce((s, a) => s + a.parts.length, 0), done = items.reduce((s, a) => s + Math.min(have(a.id), a.parts.length), 0);
  return { done, total, complete: done >= total };
}
export function setExpedition(id) { if (expById[id]) { S.museum.expedition = id; save(); } }
// Ger ett slumpat fynd och sparar det. Returnerar { id, part, def, exp, expDone },
// { none: 'today' } när alla salar redan har fått något idag, eller { none: 'complete' } när museet är fullt.
export function grantFind() {
  if (museumComplete()) return { none: 'complete' };
  const list = candidates(); if (!list.length) return { none: 'today' };
  const A = list[Math.floor(Math.random() * list.length)];
  const e = expedition(), wasDone = expProgress(e).complete, part = have(A.id);
  S.museum.found[A.id] = part + 1;
  S.museum.log.push({ t: Date.now(), id: A.id, part }); if (S.museum.log.length > 300) S.museum.log.shift();
  save();
  return { id: A.id, part, def: A, exp: e, expDone: !wasDone && expProgress(e).complete };
}
