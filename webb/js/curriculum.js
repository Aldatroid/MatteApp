/* ============ Kursplan: alla övningsområden ============
   Här bestäms vilka områden appen har, i vilken ordning de visas för föräldern och hur dagens pass
   fördelas om föräldern inte har ändrat något.

   - Ordningen i listan = ordningen i föräldraläget och under Utforska.
   - topic   = rubrik enligt det centrala innehållet i Lgr22 (matematik).
   - grades  = årskurser området passar för (visas för föräldern, och används när årskursval byggs).
   - on      = med i dagens pass från början.
   - weight  = standardvikt: 1 = lite, 2 = normalt, 4 = mycket (se WEIGHTS i store.js).
   - book    = var området finns i läroboken (valfritt). Visas i föräldraläget så att det är lätt att
               välja det klassen arbetar med. Just nu: Koll på matematik 5A/5B (Sanoma).

   Svårighetsnivåerna inom varje område ligger i områdets egen fil under areas/ (listan `levels`).
   Ett nytt område läggs till genom att skapa en fil i areas/ och lägga in den i listan nedan. */
import { S } from './store.js';
import mul from './areas/mul.js';
import fractions from './areas/fractions.js';
import length from './areas/length.js';
import symmetry from './areas/symmetry.js';
import area from './areas/area.js';
import count from './areas/count.js';
import shapes from './areas/shapes.js';
import nets from './areas/nets.js';
// import volume from './areas/volume.js';  // pausad tills vidare

export const TOPICS = {
  tal: 'Taluppfattning och tals användning',
  algebra: 'Algebra',
  geometri: 'Geometri',
  statistik: 'Sannolikhet och statistik',
  samband: 'Samband och förändring',
};

export const CURRICULUM = [
  { area: mul, topic: 'tal', grades: [3, 4, 5], on: true, weight: 4 },
  { area: fractions, topic: 'tal', grades: [4, 5], on: true, weight: 2, book: '5A kap 3, 5B kap 8' },
  { area: length, topic: 'geometri', grades: [4, 5], on: true, weight: 2, book: '5A kap 2' },
  { area: area, topic: 'geometri', grades: [3, 4, 5], on: true, weight: 2, book: '5A kap 2' },
  { area: symmetry, topic: 'geometri', grades: [4, 5], on: true, weight: 2, book: '5A kap 2' },
  { area: count, topic: 'geometri', grades: [3, 4], on: true, weight: 1 },
  { area: shapes, topic: 'geometri', grades: [3, 4], on: true, weight: 1 },
  { area: nets, topic: 'geometri', grades: [4, 5], on: true, weight: 1 },
  // { area: volume, topic: 'geometri', grades: [5, 6], on: false, weight: 1 },
];

const byId = Object.fromEntries(CURRICULUM.map(e => [e.area.id, e]));
export const areaById = id => byId[id]?.area;
export const allAreas = () => CURRICULUM.map(e => e.area);
// Områden med nivåer (allt utom tabellerna); visas som uppdrag under Utforska.
export const leveledAreas = () => allAreas().filter(a => a.levels);
export const gradeText = g => g.length > 1 ? `åk ${g[0]}–${g[g.length - 1]}` : `åk ${g[0]}`;

// Förälderns val för ett område, med kursplanens standard som reserv.
export function areaSetting(id) {
  const e = byId[id], s = S.settings.areas[id];
  return { on: s ? s.on : e.on, w: s ? s.w : e.weight };
}
export function setAreaSetting(id, patch) { S.settings.areas[id] = { ...areaSetting(id), ...patch }; }
// Områdena som är med i dagens pass, med vikt. Är inget valt används standardvalet.
export function passAreas() {
  const list = CURRICULUM.map(e => ({ area: e.area, ...areaSetting(e.area.id) })).filter(x => x.on);
  return list.length ? list : CURRICULUM.filter(e => e.on).map(e => ({ area: e.area, on: true, w: e.weight }));
}
