/* ============ Uppgifter: volym ============
   Pausad tills vidare (för tidigt för volym). Lägg till den i curriculum.js för att slå på den. */
import { rnd } from '../util.js';
import { has3D, content, C, setView, addLabel, anchorAt, removeLabels } from '../three/scene.js';
import { boxPoly, polyObject, buildBlock, explodeLayers } from '../three/solids.js';
import { kicker } from '../levels.js';

// Nivåer i ordning. step: 1 små rätblock, 2–3 större, 4 volym i cm³ utifrån mått.
const levels = [
  { step: 1, text: 'Räkna små kuber' },
  { step: 2, text: 'Lager gånger höjd' },
  { step: 3, text: 'Större rätblock' },
  { step: 4, text: 'Volym i cm³ från mått' },
];

const area = {
  id: 'volume', name: 'Volym', short: 'Volym', levels, gen: (L, n) => genVolume(L, n),
  tags: {
    'ett-lager': 'Räknar bara ett lager kuber när volymen ska räknas ut.',
    'adderar': 'Adderar sidornas längder i stället för att multiplicera när volymen ska räknas ut.',
  },
};
export default area;

function genVolume(Lv, num) {
  const level = Lv.step;
  let l, w, h;
  if (level === 1) { do { l = rnd(1, 3); w = rnd(1, 3); h = rnd(1, 3); } while (l * w * h < 4); }
  // Ett lager (l · w) ska vara högst 10 eller ett jämnt tiotal, så att lager · höjd håller sig inom tabellerna.
  const okLayer = () => l * w <= 10 || (l * w) % 10 === 0;
  if (level === 2) { do { l = rnd(2, 4); w = rnd(2, 3); } while (!okLayer()); h = rnd(2, 3); }
  else if (level === 3) { do { l = rnd(3, 6); w = rnd(2, 4); } while (!okLayer()); h = rnd(2, 4); }
  else if (level === 4) { do { l = rnd(3, 8); w = rnd(2, 5); } while (!okLayer()); h = rnd(2, 4); }
  const V = l * w * h, solid = level === 4;
  let B = null, box = null, labs = [];
  const s = solid ? 4.2 / Math.max(l, w, h) : 1;
  const showCubes = () => { if (box) { box.group.visible = false; removeLabels(labs); } if (!B) B = buildBlock(l, w, h, s); };
  return {
    skill: 'volume', level: num, kicker: kicker(area, num),
    text: solid ? 'Vad är rätblockets volym?' : 'Hur många små kuber är rätblocket byggt av?',
    sub: solid ? 'Måtten står vid kanterna.' : 'Snurra för att se alla sidor.',
    input: 'num', answer: V, unit: solid ? 'cm³' : 'kuber', describe: solid ? `Volym ${l}×${w}×${h} cm` : `Kuber ${l}×${w}×${h}`,
    remake: () => genVolume(Lv, num),
    build() {
      if (!has3D) return;
      const size = solid ? 4.2 : Math.max(l, w, h);
      setView({ dist: size * 1.9 + 5, elev: 0.55, rotY: 0.6, rotX: 0, clampX: [-0.5, 0.6] });
      if (solid) {
        box = polyObject(boxPoly(l * s, h * s, w * s), C.solid, content);
        const X = l * s / 2, Y = h * s / 2, Z = w * s / 2;
        labs = [addLabel(`${l} cm`, anchorAt(content, 0, -Y - 0.3, Z + 0.3)), addLabel(`${w} cm`, anchorAt(content, X + 0.4, -Y - 0.3, 0)), addLabel(`${h} cm`, anchorAt(content, X + 0.45, 0, Z + 0.3))];
      } else B = buildBlock(l, w, h);
    },
    hint() {
      this._hinted = true;
      if (has3D) { showCubes(); explodeLayers(B, l, w, true); }
      return level === 1 ? 'Räkna kuberna i ett lager. Hur många lager finns det?' : `Ett lager har ${l} · ${w} = ${l * w} kuber. Hur många lager är det?`;
    },
    reveal(ok) {
      if (has3D && !this._hinted) { showCubes(); explodeLayers(B, l, w, !ok || level > 1); }
      const u = solid ? ' cm³' : ' kuber';
      return { text: `Varje lager har ${l} · ${w} = ${l * w}. Det är ${h} lager: ${h} · ${l * w} = <b>${V}</b>${u}.`, auto: ok ? 3000 : 0 };
    },
    tag(g) { g = Number(g); if (g === l * w && h > 1) return 'ett-lager'; if (g === l + w + h) return 'adderar'; return null; },
  };
}
