/* ============ Sandlådor ============ */
import { $, $$, pick, cap } from './util.js';
import { has3D, content, world, cam, clearScene, addLabel, anchorAt, later } from './three/scene.js';
import { mulOrigin, mulBase, buildGrid, GAP } from './three/blocks.js';
import { SOLIDS, WHAT, buildSolid, solidView, countSequence } from './three/solids.js';
import { netInfo, normCells, transformNet, buildNet, foldNet, netView, markCollisions, NETS_VALID, NETS_INVALID } from './three/nets.js';
import { tick, startSandboxRun } from './engine.js';

export function startSandbox(kind) {
  startSandboxRun(kind);
  ({ build: sbBuild, explore: sbExplore, fold: sbFold })[kind]();
}
function sbBuild() {
  let a = 4, b = 6, split = false;
  const body = $('#panelBody');
  body.innerHTML = `<div class="sb"><div class="q-kicker">Bygg gångertal</div><div class="sb-eq" id="sbEq"></div>
    <div class="steppers"><div class="stepper"><span>Rader</span><button data-st="a-" aria-label="Färre rader">−</button><b id="stA"></b><button data-st="a+" aria-label="Fler rader">+</button></div>
    <div class="stepper"><span>I varje rad</span><button data-st="b-" aria-label="Färre i varje rad">−</button><b id="stB"></b><button data-st="b+" aria-label="Fler i varje rad">+</button></div></div>
    <div class="row"><button class="btn" id="sbSwap">Byt plats</button><button class="btn" id="sbSplit">Dela upp</button><button class="btn" id="sbSkip">Hoppräkna</button></div>
    <div class="explain" id="sbNote"></div></div>`;
  function draw(anim = 'fast') {
    tick(); clearScene();
    $('#stA').textContent = a; $('#stB').textContent = b; $('#sbEq').textContent = `${a} · ${b} = ${a * b}`;
    const s = b > 5 ? 5 : Math.floor(b / 2), canSplit = split && b >= 2;
    const note = $('#sbNote');
    if (canSplit) note.innerHTML = `<p>Ett svårt gångertal kan delas upp i två lättare. Räkna ut båda delarna och lägg ihop dem.</p><div class="eqs"><div><i class="sw sw-a"></i>${a} · ${s} = ${a * s}</div><div><i class="sw sw-b"></i>${a} · ${b - s} = ${a * (b - s)}</div><div class="eq-sum">${a * s} + ${a * (b - s)} = ${a * b}</div></div>`;
    else if (split) note.innerHTML = '<p>Det behövs minst 2 klossar i varje rad för att kunna dela upp.</p>';
    else note.innerHTML = '<p>Vrid på klossarna med fingret. Tryck på Byt plats: det blir lika många klossar fast åt andra hållet.</p>';
    if (!has3D) return;
    const keepY = cam.rotTY;
    mulBase(a, b, b, 'prod'); cam.rotTY = keepY; world.rotation.y = keepY;
    const { ox, oz } = mulOrigin(a, b);
    buildGrid(a, b, ox, oz, { anim, split: canSplit ? { axis: 'col', at: s } : null, rowLabels: anim === 'rows' });
    if (canSplit) {
      addLabel(`${a} · ${s} = ${a * s}`, anchorAt(content, ox + (s - 1) / 2, 1.3, oz - 1), { cls: 'big' });
      addLabel(`${a} · ${b - s} = ${a * (b - s)}`, anchorAt(content, ox + s + GAP + (b - s - 1) / 2, 1.3, oz - 1), { cls: 'big sun' });
    }
  }
  body.querySelectorAll('[data-st]').forEach(btn => btn.addEventListener('click', () => {
    const s = btn.dataset.st; if (s === 'a-') a = Math.max(1, a - 1); if (s === 'a+') a = Math.min(10, a + 1); if (s === 'b-') b = Math.max(1, b - 1); if (s === 'b+') b = Math.min(10, b + 1); draw('none');
  }));
  $('#sbSwap').addEventListener('click', () => { [a, b] = [b, a]; draw('fast'); });
  $('#sbSplit').addEventListener('click', () => { split = !split; $('#sbSplit').classList.toggle('primary', split); draw('none'); });
  $('#sbSkip').addEventListener('click', () => draw('rows'));
  draw('fast');
}
function sbExplore() {
  let id = 'kub', what = null, obj = null;
  const body = $('#panelBody');
  body.innerHTML = `<div class="sb"><div class="q-kicker">Kroppar i 3D</div><div class="chips" id="exShapes">${Object.keys(SOLIDS).map(k => `<button class="chip" data-id="${k}">${cap(SOLIDS[k].name)}</button>`).join('')}</div>
    <div class="seg" id="exWhat"><button data-w="f">Ytor</button><button data-w="e">Kanter</button><button data-w="v">Hörn</button></div>
    <div class="facts" id="exFacts"></div><p class="q-sub" id="exClue"></p></div>`;
  function draw() {
    tick(); clearScene(); solidView(what === null); obj = buildSolid(id);
    const def = SOLIDS[id];
    $$('#exShapes .chip').forEach(c => c.classList.toggle('on', c.dataset.id === id));
    $$('#exWhat button').forEach(b => { b.classList.toggle('on', b.dataset.w === what); b.disabled = !!def.curved; });
    $('#exFacts').innerHTML = def.curved ? `<div class="fact">${cap(def.name)} har böjda ytor, så vi räknar inte kanter och hörn på samma sätt.</div>` : ['f', 'e', 'v'].map(w => `<div class="fact"><b>${def[w]}</b>${WHAT[w]}</div>`).join('');
    $('#exClue').textContent = def.clue;
    if (obj && !def.curved && what) countSequence(obj, what, 90, 100);
  }
  body.querySelectorAll('#exShapes .chip').forEach(c => c.addEventListener('click', () => { id = c.dataset.id; draw(); }));
  body.querySelectorAll('#exWhat button').forEach(b => b.addEventListener('click', () => { what = what === b.dataset.w ? null : b.dataset.w; draw(); }));
  draw();
}
function sbFold() {
  let sel = new Set(['2,0', '1,1', '2,1', '3,1', '2,2', '2,3']), net = null, folded = false;
  const body = $('#panelBody');
  body.innerHTML = `<div class="sb"><div class="q-kicker">Vik en kub</div><p class="q-sub">Tryck på rutorna och rita en utfällning med 6 rutor. Tryck sedan på Vik ihop.</p>
    <div class="netgrid" id="netGrid">${[...Array(25).keys()].map(i => `<button data-c="${i % 5},${Math.floor(i / 5)}" aria-label="Ruta ${i + 1}"></button>`).join('')}</div>
    <div class="row"><button class="btn primary" id="foldBtn">Vik ihop</button><button class="btn" data-p="random">Slumpa</button><button class="btn" data-p="clear">Rensa</button></div>
    <div class="feedback" id="foldMsg"></div></div>`;
  const cellsOf = () => [...sel].map(k => k.split(',').map(Number));
  function connected(cells) { return cells.length > 0 && netInfo(cells).connected; }
  function draw() {
    tick(); clearScene(); folded = false; net = null;
    $$('#netGrid button').forEach(b => b.classList.toggle('on', sel.has(b.dataset.c)));
    const cells = cellsOf(); const msg = $('#foldMsg'); msg.className = 'feedback'; msg.innerHTML = '';
    const ok = cells.length === 6 && connected(cells);
    $('#foldBtn').disabled = !ok; $('#foldBtn').textContent = 'Vik ihop';
    if (cells.length !== 6) { msg.className = 'feedback tip'; msg.textContent = `Välj 6 rutor. Du har ${cells.length}.`; }
    else if (!ok) { msg.className = 'feedback tip'; msg.textContent = 'Alla rutor måste sitta ihop med en hel sida.'; }
    if (!has3D || !cells.length) return;
    net = buildNet(normCells(cells)); netView(5);
  }
  $$('#netGrid button').forEach(b => b.addEventListener('click', () => { const c = b.dataset.c; if (sel.has(c)) sel.delete(c); else sel.add(c); draw(); }));
  $('#foldBtn').addEventListener('click', () => {
    if (!net) return; tick();
    folded = !folded; foldNet(net, folded ? 1 : 0);
    $('#foldBtn').textContent = folded ? 'Veckla ut' : 'Vik ihop';
    const msg = $('#foldMsg');
    if (folded) {
      const v = net.NI.valid; const n = net;
      later(1750, () => { if (net !== n || !folded) return; if (!v) markCollisions(n); msg.className = 'feedback ' + (v ? 'ok' : 'no'); msg.innerHTML = v ? '<strong>Det blev en kub!</strong> Snurra och titta på den.' : '<strong>Ingen kub.</strong> De röda rutorna hamnar på samma ställe.'; });
    } else { msg.className = 'feedback'; msg.innerHTML = ''; for (const ni of net.NI.info.values()) ni.mat.color.set(ni.color); }
  });
  body.querySelectorAll('[data-p]').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.p === 'clear') sel = new Set();
    else {
      let c; do { c = transformNet(pick([...NETS_VALID, ...NETS_INVALID])); } while (Math.max(...c.map(p => p[0])) > 4 || Math.max(...c.map(p => p[1])) > 4);
      sel = new Set(c.map(p => p[0] + ',' + p[1]));
    }
    draw();
  }));
  draw();
}
