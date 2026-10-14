/* ============ Lagring ============ */
import { clamp, dayKey } from './util.js';

const KEY = 'mattelabbet.v1';
export const FAST_MS = 5000;
// Vikter som föräldern kan välja per område i dagens pass.
export const WEIGHTS = [[1, 'Lite'], [2, 'Normalt'], [4, 'Mycket']];
let storageOK = true;
export const storageWorks = () => storageOK;
// settings.areas: { [områdes-id]: { on: bool, w: vikt } }. Saknas ett område gäller standardvärdet i curriculum.js.
// settings.sound: volym 0-100 och på/av för effekter och musik. Musiken är avstängd från början.
export function defaults() { return { v: 1, created: Date.now(), name: '', settings: { passMin: 7, areas: {}, theme: 'auto', sound: { fx: 80, music: 50, fxOn: true, musicOn: false } }, facts: {}, geo: {}, days: {}, sessions: [], log: [], tags: {} }; }
// Sparad och importerad data tvättas fält för fält: bara kända nycklar, och siffror blir siffror.
// Då kan en manipulerad säkerhetskopia aldrig smyga in HTML i vyerna.
const num = v => { const n = Number(v); return Number.isFinite(n) ? n : 0; };
const str = (v, max = 200) => v == null ? '' : String(v).slice(0, max);
const obj = v => v && typeof v === 'object' && !Array.isArray(v) ? v : {};
const arr = v => Array.isArray(v) ? v : [];
const nums = (o, keys) => Object.fromEntries(keys.map(k => [k, num(o[k])]));
const mapObj = (o, keyRe, f) => Object.fromEntries(Object.entries(obj(o)).filter(([k]) => keyRe.test(k)).map(([k, v]) => [k, f(obj(v))]));
const WEIGHT_VALUES = WEIGHTS.map(w => w[0]);
const vol = (v, d) => Number.isFinite(v) ? clamp(Math.round(v), 0, 100) : d;
const sound = (o, d) => ({ fx: vol(o.fx, d.fx), music: vol(o.music, d.music), fxOn: typeof o.fxOn === 'boolean' ? o.fxOn : d.fxOn, musicOn: o.musicOn === true });
export function migrate(d) {
  d = obj(d); const b = defaults(); const st = obj(d.settings);
  return {
    v: 1, created: num(d.created) || b.created, name: str(d.name, 20),
    settings: {
      passMin: [5, 7, 10].includes(st.passMin) ? st.passMin : b.settings.passMin,
      theme: /^[a-z]{1,20}$/.test(st.theme) ? st.theme : 'auto',
      sound: sound(obj(st.sound), b.settings.sound),
      areas: mapObj(st.areas, /^[a-z]{1,20}$/, a => ({ on: a.on !== false, w: WEIGHT_VALUES.includes(a.w) ? a.w : 2 })),
    },
    facts: mapObj(d.facts, /^\d{1,2}x\d{1,2}$/, f => nums(f, ['box', 'n', 'r', 'ms', 'last'])),
    geo: mapObj(d.geo, /^[a-z]{1,20}$/, g => ({ ...nums(g, ['seen', 'right', 'last']), level: clamp(Math.round(num(g.level)) || 1, 1, 20), recent: arr(g.recent).slice(-5).map(num) })),
    days: mapObj(d.days, /^\d{4}-\d{2}-\d{2}$/, x => ({ ...nums(x, ['ms', 'n', 'right']), ...(x.pass ? { pass: true } : {}) })),
    sessions: arr(d.sessions).slice(-200).map(obj).map(x => ({ ...nums(x, ['start', 'ms', 'n', 'right']), mode: str(x.mode, 20), kind: str(x.kind, 20) })),
    log: arr(d.log).slice(-300).map(obj).map(x => ({ ...nums(x, ['t', 'ms', 'h']), s: str(x.s, 20), q: str(x.q), g: str(x.g, 40), a: str(x.a, 40), ok: x.ok === true, ...(x.g1 != null ? { g1: str(x.g1, 40) } : {}) })),
    tags: mapObj(d.tags, /^[\w-]{1,40}$/, x => nums(x, ['n', 'last'])),
  };
}
function load() {
  try { const raw = localStorage.getItem(KEY); return raw ? migrate(JSON.parse(raw)) : defaults(); }
  catch (e) { storageOK = false; return defaults(); }
}
export function save() { try { localStorage.setItem(KEY, JSON.stringify(S)); storageOK = true; } catch (e) { storageOK = false; } }
// S är samma objekt under hela körningen; replaceData byter innehållet (vid import och nollställning).
export const S = load();
export function replaceData(d) { for (const k of Object.keys(S)) delete S[k]; Object.assign(S, d); }
export const today = () => (S.days[dayKey()] ||= { ms: 0, n: 0, right: 0 });
