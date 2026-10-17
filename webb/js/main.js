/* ============ Start ============
   Appen är uppdelad i moduler:
   util.js, store.js        hjälpare och lagring
   three/                   3D-scen och 2D-figurer som uppgifterna ritar med
   areas/                   ett övningsområde per fil (uppgifter, nivåer, vanliga fel)
   curriculum.js            vilka områden som finns, ordning, årskurs och standardvikt
   levels.js                nivålogik för områden med nivåer
   themes.js                teman (t.ex. Halloween) som byter bilder och färger
   engine.js                spelmotorn: dagens pass, Utforska, svar och återkoppling
   home.js, sandbox.js, parent.js   skärmarna
   museum/                  museet i 3D: salar, föremål och infotexter (se docs/museum.md) */
import { applyTheme } from './themes.js';
import './frames.js';
import { show } from './util.js';
import { THREE, initThree, view, cam, renderer, scene } from './three/scene.js';
import './engine.js';
import './home.js';
import './parent.js';
import './museum/museum.js';

applyTheme();
initThree();
// Utvecklarkrok (bara med ?debug i adressen): styr kameran vid granskning av 3D
if (/[?&]debug/.test(location.search)) window.__dbg = { view, get renderer() { return renderer; }, get scene() { return scene; }, THREE, cam: (dist, elev, rx, ry) => { if (dist != null) view.dist = dist; if (elev != null) view.elev = elev; if (rx != null) cam.rotTX = rx; if (ry != null) cam.rotTY = ry; view.autoSpin = false; } };
show(/[?&]museum/.test(location.search) ? 'museum' : 'home');
