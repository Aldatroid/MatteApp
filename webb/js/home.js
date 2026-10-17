/* ============ Startsidan och Utforska ============ */
import { $, $$, esc, dayKey, show, onShow } from './util.js';
import { S } from './store.js';
import { leveledAreas, passAreas } from './curriculum.js';
import { ALL_FACTS, hardestFacts, countGood } from './areas/mul.js';
import { startRun } from './engine.js';
import { startSandbox } from './sandbox.js';
import { totalFound } from './museum/museum.js';
import { TOTAL_PARTS, byId } from './museum/catalog.js';
import { expedition, expChosen, nextFind } from './museum/finds.js';

function renderHome() {
  $('#hello').textContent = S.name ? `Hej ${S.name}!` : 'Hej!';
  $('#passLen').textContent = `ca ${S.settings.passMin} minuter`;
  // Visa de områden som får störst del av dagens pass.
  const names = passAreas().sort((a, b) => b.w - a.w).map(x => x.area.short);
  $('#passAreas').textContent = names.length > 3 ? `${names.slice(0, 3).join(', ')} med mera.` : names.join(', ').replace(/, ([^,]*)$/, ' och $1') + '.';
  const good = countGood(); const t = S.days[dayKey()];
  $('#homeStatus').innerHTML = `<span class="pill"><span class="dot"></span><b>${good} av 100</b> gångertal sitter</span>` + (t?.pass ? `<span class="pill">Dagens pass är gjort</span><span class="pill"><b>${t.passes || 1} pass</b> idag</span>` : '')
  ;
  // Museet: innan barnet har valt expedition lockar rutan till att välja, sedan visas nästa fynd.
  const n = nextFind(), chosen = expChosen();
  $('#startMuseum').classList.toggle('new', !chosen);
  $('#museumKicker').textContent = chosen ? `${totalFound()} av ${TOTAL_PARTS} fynd · ${expedition().name}` : 'Samla föremål';
  $('#museumText').textContent = !chosen ? 'Bygg ditt eget museum. Välj om du vill leta dinosaurier, mumier, vikingaskatter eller havsjättar!'
    : n ? `Nästa fynd: ${byId[n].parts.length > 1 ? 'en del av ' + byId[n].name : byId[n].name}. Gör Dagens pass för att hitta det!` : 'Museet är komplett. Bra jobbat!';
}
let tableSel = new Set(['all']);
function renderFree() {
  const tc = $('#tableChips');
  tc.innerHTML = ['all', 2, 3, 4, 5, 6, 7, 8, 9, 10, 'hard'].map(v => `<button class="chip${tableSel.has(String(v)) ? ' on' : ''}" data-t="${v}">${v === 'all' ? 'Alla' : v === 'hard' ? 'Svåraste' : v}</button>`).join('');
  tc.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => {
    const v = c.dataset.t;
    if (v === 'all' || v === 'hard') tableSel = new Set([v]);
    else { tableSel.delete('all'); tableSel.delete('hard'); if (tableSel.has(v)) tableSel.delete(v); else tableSel.add(v); if (!tableSel.size) tableSel.add('all'); }
    renderFree();
  }));
  const gc = $('#geoChips');
  gc.innerHTML = [...leveledAreas().map(a => [a.id, a.short]), ['mix', 'Blandat']].map(([id, label]) => `<button class="chip" data-g="${id}">${esc(label)}</button>`).join('');
  gc.querySelectorAll('.chip').forEach(c => c.addEventListener('click', () => startRun('free', { area: c.dataset.g })));
}
onShow('home', renderHome);
onShow('free', renderFree);

$('#startTables').addEventListener('click', () => {
  let pool;
  if (tableSel.has('hard')) { pool = hardestFacts(12); if (pool.length < 4) pool = ALL_FACTS.filter(([a, b]) => a >= 6 && b >= 6); }
  else if (tableSel.has('all')) pool = ALL_FACTS;
  else { const m = new Map(); for (const t of tableSel) for (let b = 1; b <= 10; b++) { const n = Number(t); m.set(n + 'x' + b, [n, b]); m.set(b + 'x' + n, [b, n]); } pool = [...m.values()]; }
  startRun('free', { area: 'mul', pool });
});
$('#startPass').addEventListener('click', () => startRun('pass'));
$('#startFree').addEventListener('click', () => show('free'));
$('#startMuseum').addEventListener('click', () => show('museum'));
$$('[data-go]').forEach(b => b.addEventListener('click', () => show(b.dataset.go)));
$$('[data-sandbox]').forEach(b => b.addEventListener('click', () => startSandbox(b.dataset.sandbox)));
