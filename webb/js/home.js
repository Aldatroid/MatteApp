/* ============ Startsidan och Utforska ============ */
import { $, $$, esc, dayKey, show, onShow } from './util.js';
import { S } from './store.js';
import { leveledAreas, passAreas } from './curriculum.js';
import { ALL_FACTS, hardestFacts, countGood } from './areas/mul.js';
import { startRun } from './engine.js';
import { startSandbox } from './sandbox.js';
import { totalFound } from './museum/museum.js';
import { TOTAL_PARTS } from './museum/catalog.js';
import { expedition, expChosen, findsLeftToday, canFind, DAILY, museumComplete, updateSections } from './museum/finds.js';
import { checkRooms } from './museum/rooms.js';
import { roomById } from './museum/catalog.js';

function renderHome() {
  $('#hello').textContent = S.name ? `Hej ${S.name}!` : 'Hej!';
  $('#passLen').textContent = `ca ${S.settings.passMin} minuter`;
  // Visa de områden som får störst del av dagens pass.
  const names = passAreas().sort((a, b) => b.w - a.w).map(x => x.area.short);
  $('#passAreas').textContent = names.length > 3 ? `${names.slice(0, 3).join(', ')} med mera.` : names.join(', ').replace(/, ([^,]*)$/, ' och $1') + '.';
  const good = countGood(); const t = S.days[dayKey()];
  $('#homeStatus').innerHTML = `<span class="pill"><span class="dot"></span><b>${good} av 100</b> gångertal sitter</span>` + (t?.pass ? `<span class="pill">Dagens pass är gjort</span><span class="pill"><b>${t.passes || 1} pass</b> idag</span>` : '')
  ;
  // Museet: innan barnet har valt expedition lockar rutan till att välja, sedan visas hur många salar som kan få fynd idag.
  checkRooms(); updateSections();
  const left = findsLeftToday(), chosen = expChosen(), building = Object.keys(S.museum.pending).length, opened = S.museum.fresh.length;
  $('#startMuseum').classList.toggle('new', !chosen);
  $('#museumKicker').textContent = chosen ? `${totalFound()} av ${TOTAL_PARTS} fynd · ${expedition().name}` : 'Samla föremål';
  $('#museumText').textContent = !chosen ? 'Bygg ditt eget museum. Välj om du vill leta dinosaurier, mumier, vikingaskatter eller havsjättar!'
    : S.museum.freshRooms.length ? `${S.museum.freshRooms.map(id => roomById[id].name).join(' och ')} har öppnat! Gå och titta!`
    : opened ? 'En ny avdelning har öppnat i museet. Gå och titta!'
    : museumComplete() ? 'Museet är komplett. Bra jobbat!'
    : !left ? `Du har hittat ${DAILY} saker idag. Kom tillbaka i morgon!`
    : canFind() ? `Gör Dagens pass för att hitta något nytt. Du kan hitta ${left === 1 ? '1 sak' : left + ' saker'} till idag.`
    : building ? 'Museet bygger en ny avdelning. Den öppnar i morgon!'
    : 'Allt i de öppna salarna är hittat. Nå målen i matten för att öppna nya salar!';
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
