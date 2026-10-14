/* ============ Teman ============
   Ett tema byter appens bilder (och vid behov några färger) under en säsong, t.ex. Halloween eller jul.

   Så lägger du till ett tema:
   1. Lägg bilderna i en egen mapp under assets/themes/, med samma filnamn och pixelmått som originalen i
      assets/ (t.ex. panel.png, bg.jpg, levels/door.jpg). Bilder som saknas i mappen tas från assets/.
   2. Lägg till temat i THEMES nedan: namn, mapp, vilka bilder som finns och när det gäller.
   3. season = [från, till] som 'MM-DD'. Med inställningen "Automatiskt" används temat under den perioden.
      Perioden får gå över nyår, t.ex. ['12-01', '01-06'].

   Valfritt per tema:
   - frames: andra skärningar för ramarna (se FRAMES i frames.js), om dekorationer i hörnen är större
     än originalets hörn. slice = pixlar i bilden, width = bredd på skärmen (samma skala som originalet).
   - colors: CSS-variabler som skrivs över, t.ex. knapparnas färger (se :root i css/app.css). */
import { S } from './store.js';

const ALL = ['bg.jpg', 'bg_blur.jpg', 'btn_pass.png', 'bubble.png', 'dino.png', 'dino_ring.png', 'gear.png', 'glowframe.png', 'header.png', 'hintbar.png',
  'icon-180.png', 'icon-192.png', 'icon-32.png', 'icon-512.png', 'icon_back.png', 'icon_bulb.png', 'icon_chev.png', 'icon_foot.png', 'icon_mountain.png',
  'key.png', 'key_back.png', 'key_dark.png', 'key_light.png', 'key_ok.png', 'key_wide.png', 'panel.png', 'topbar.png',
  'levels/door.jpg', 'levels/final.jpg', 'levels/progress1.jpg', 'levels/progress2.jpg', 'levels/progress3.jpg'];

export const THEMES = {
  standard: { name: 'Dinoäventyr' },
  halloween: {
    name: 'Halloween', dir: 'assets/themes/halloween/', files: ALL, season: ['10-10', '11-02'],
    // Spindelnätet och spindeln i panelens övre högra hörn är större än originalets hörn på 80 px.
    frames: { panel: { slice: [170, 170, 80, 80], width: [42.5, 42.5, 20, 20] } },
    colors: {
      '--btn-top': '#4a3566', '--btn-mid': '#3a2852', '--btn-bot': '#271a3a', '--btn-border': '#6b4a8c', '--btn-shine': 'rgba(220,190,255,.30)',
      '--btn-on-top': '#a0623a', '--btn-on-mid': '#8a4f2c', '--btn-on-bot': '#733f22', '--btn-on-border': '#e39a5a',
      '--gold': 'linear-gradient(180deg,#ffc27a 0%,#f59a3c 55%,#d9711c 100%)', '--accent': '#f5a04a', '--sun': '#f5a04a',
      '--bubble-top': '#3a2852', '--bubble-bot': '#261a38', '--bubble-border': '#7a5a9c',
      '--shade': '14,8,22', '--paper': '#100a18',
    },
  },
};

const md = d => String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
const inSeason = ([from, to], d = new Date()) => { const x = md(d); return from <= to ? x >= from && x <= to : x >= from || x <= to; };
// Vilket tema som gäller nu: förälderns val, eller säsongens tema om valet är "Automatiskt".
export function activeThemeId() {
  const pick = S.settings.theme;
  if (pick && pick !== 'auto' && THEMES[pick]) return pick;
  return Object.keys(THEMES).find(id => THEMES[id].season && inSeason(THEMES[id].season)) || 'standard';
}
export const activeTheme = () => THEMES[activeThemeId()];
// Sökväg till en bild i aktuellt tema, eller originalet i assets/ om temat inte har bilden.
export function asset(file, theme = activeTheme()) { return theme.dir && theme.files?.includes(file) ? theme.dir + file : 'assets/' + file; }
const abs = p => new URL(p, document.baseURI).href;

// Bilder som CSS använder, som variabler (--img-bg osv., se :root i app.css). Sätts alltid här, som
// absoluta adresser, så att bara aktuellt temas bilder laddas och adresserna fungerar i alla CSS-filer.
const CSS_IMAGES = ['bg.jpg', 'bg_blur.jpg', 'btn_pass.png', 'panel.png', 'header.png', 'topbar.png', 'icon_back.png', 'icon_bulb.png', 'icon_foot.png', 'icon_mountain.png'];
const cssVar = file => '--img-' + file.replace(/\.\w+$/, '').replace(/_/g, '-');
const listeners = [];
export const onTheme = fn => listeners.push(fn);
let applied = {};
export function applyTheme() {
  const id = activeThemeId(), t = THEMES[id], root = document.documentElement.style;
  CSS_IMAGES.forEach(f => root.setProperty(cssVar(f), `url("${abs(asset(f, t))}")`));
  Object.keys(applied).forEach(k => root.removeProperty(k));
  applied = t.colors || {};
  Object.entries(applied).forEach(([k, v]) => root.setProperty(k, v));
  document.querySelectorAll('img[data-asset]').forEach(img => { img.src = asset(img.dataset.asset, t); });
  document.querySelectorAll('link[data-asset]').forEach(l => { l.href = asset(l.dataset.asset, t); });
  document.documentElement.dataset.theme = id;
  listeners.forEach(f => f(t));
}
