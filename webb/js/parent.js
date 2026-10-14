/* ============ Föräldraläge ============ */
import { $, rnd, esc, dayKey, fmtMin, show } from './util.js';
import { S, save, defaults, migrate, replaceData, storageWorks, WEIGHTS } from './store.js';
import { CURRICULUM, TOPICS, allAreas, areaById, leveledAreas, gradeText, areaSetting, setAreaSetting, passAreas } from './curriculum.js';
import { ALL_FACTS, hardestFacts, countGood, factStatus } from './areas/mul.js';
import { keypad } from './engine.js';

let gateAns = 0, gateIn = '';
$('#toParent').addEventListener('click', () => {
  const a = rnd(12, 29), b = rnd(3, 9); gateAns = a * b; gateIn = '';
  const q = () => $('#gateQ').innerHTML = `${a} · ${b} = <span class="slot${gateIn ? ' filled' : ''}">${gateIn || '?'}</span>`;
  q();
  keypad($('#gatePad'), d => { if (gateIn.length < 4) { gateIn += d; q(); } }, () => { gateIn = gateIn.slice(0, -1); q(); }, () => {
    if (Number(gateIn) === gateAns) { show('parent'); renderParent(); } else { gateIn = ''; q(); $('#gateQ').querySelector('.slot').classList.add('no'); }
  });
  show('gate');
});
// Texter för vanliga missförstånd; varje område beskriver sina egna (tags i områdets modul).
const tagText = k => allAreas().map(a => a.tags?.[k]).find(Boolean);
const STATUS_TXT = { none: 'Inte övad', learn: 'Övar', mid: 'På väg', good: 'Sitter' };
function lastDays(n) { const out = []; for (let i = n - 1; i >= 0; i--) out.push(dayKey(Date.now() - i * 86400e3)); return out; }

/* Dagens pass: alla områden, grupperade efter Lgr22. Föräldern bockar i vilka som ska vara med
   och väljer hur stor del av passet varje område ska få. */
function areaRow(e) {
  const a = e.area, s = areaSetting(a.id), cur = S.geo[a.id]?.level || 1;
  const levels = a.levels ? `<details><summary>${a.levels.length} nivåer, barnet är på nivå ${Math.min(cur, a.levels.length)}</summary><ol>${a.levels.map((L, i) => `<li class="${i + 1 === cur ? 'cur' : ''}">${esc(L.text)}</li>`).join('')}</ol></details>`
    : '<details><summary>Anpassas per gångertal</summary><p>Nya och felsvarade gångertal kommer oftare, de som sitter kommer mer sällan.</p></details>';
  return `<div class="area-row${s.on ? ' on' : ''}" data-area="${a.id}">
    <label class="area-check"><input type="checkbox"${s.on ? ' checked' : ''}><span><b>${esc(a.name)}</b><small>${gradeText(e.grades)} · <span class="share"></span></small></span></label>
    <div class="seg" role="group" aria-label="Hur mycket av passet">${WEIGHTS.map(([v, l]) => `<button data-v="${v}" class="${s.w === v ? 'on' : ''}"${s.on ? '' : ' disabled'}>${l}</button>`).join('')}</div>
    ${levels}
  </div>`;
}
function areaList() {
  return Object.entries(TOPICS).map(([k, title]) => [title, CURRICULUM.filter(e => e.topic === k)]).filter(([, l]) => l.length)
    .map(([title, list]) => `<div class="area-group"><h4>${esc(title)}</h4>${list.map(areaRow).join('')}</div>`).join('');
}
function updateShares(el) {
  const list = passAreas(), sum = list.reduce((s, x) => s + x.w, 0);
  el.querySelectorAll('.area-row').forEach(row => {
    const x = list.find(p => p.area.id === row.dataset.area);
    row.querySelector('.share').textContent = x ? `ca ${Math.round(x.w / sum * 100)} % av passet` : 'inte med';
  });
}
function wireAreas(el) {
  updateShares(el);
  el.querySelectorAll('.area-row').forEach(row => {
    const id = row.dataset.area, box = row.querySelector('input[type=checkbox]');
    box.addEventListener('change', () => {
      if (!box.checked && passAreas().length === 1 && areaSetting(id).on) { box.checked = true; $('#areaMsg').textContent = 'Minst ett område behöver vara med i dagens pass.'; return; }
      $('#areaMsg').textContent = '';
      setAreaSetting(id, { on: box.checked }); save();
      row.classList.toggle('on', box.checked);
      row.querySelectorAll('.seg button').forEach(b => b.disabled = !box.checked);
      updateShares(el);
    });
    row.querySelectorAll('.seg button').forEach(b => b.addEventListener('click', () => {
      setAreaSetting(id, { w: Number(b.dataset.v) }); save();
      row.querySelectorAll('.seg button').forEach(x => x.classList.toggle('on', x === b));
      updateShares(el);
    }));
  });
}

export function renderParent() {
  const el = $('#parentBody');
  const d7 = lastDays(7), d14 = lastDays(14);
  let ms7 = 0, n7 = 0, r7 = 0; d7.forEach(k => { const d = S.days[k]; if (d) { ms7 += d.ms; n7 += d.n; r7 += d.right; } });
  const good = countGood();
  const maxMs = Math.max(60000, ...d14.map(k => S.days[k]?.ms || 0));
  const WD = ['S', 'M', 'T', 'O', 'T', 'F', 'L'];
  const chart = d14.map((k, i) => { const ms = S.days[k]?.ms || 0; const m = Math.round(ms / 60000); const dt = new Date(k + 'T12:00'); return `<div class="col${i === 13 ? ' today' : ''}"><span class="v">${m || ''}</span><div class="barv${ms ? '' : ' zero'}" style="height:${Math.max(3, ms / maxMs * 100)}px" title="${m} min"></div><small>${WD[dt.getDay()]}</small></div>`; }).join('');
  let heat = '<div class="h"></div>' + [...Array(10).keys()].map(j => `<div class="h">${j + 1}</div>`).join('');
  for (let a = 1; a <= 10; a++) { heat += `<div class="h">${a}</div>`; for (let b = 1; b <= 10; b++) { const f = S.facts[a + 'x' + b]; heat += `<button class="st-${factStatus(f)}" data-f="${a}x${b}" aria-label="${a} gånger ${b}: ${STATUS_TXT[factStatus(f)]}">${a * b}</button>`; } }
  const hard = hardestFacts(8).filter(([a, b]) => factStatus(S.facts[a + 'x' + b]) !== 'good');
  const obs = [];
  const tblScore = [];
  for (let t = 2; t <= 9; t++) { const fs = []; for (let b = 1; b <= 10; b++) { [S.facts[t + 'x' + b], S.facts[b + 'x' + t]].forEach(f => { if (f?.n) fs.push(f); }); } if (fs.length >= 6) tblScore.push({ t, s: fs.reduce((x, f) => x + f.box, 0) / fs.length }); }
  tblScore.sort((x, y) => x.s - y.s);
  if (tblScore.length >= 3 && tblScore[0].s < 3.5) obs.push(`${tblScore[0].t}:ans${tblScore[1].s < 3.5 ? ` och ${tblScore[1].t}:ans` : ''} tabell behöver mest övning just nu.`);
  const slow = ALL_FACTS.filter(([a, b]) => { const f = S.facts[a + 'x' + b]; return f?.r >= 2 && f.ms > 7000; }).slice(0, 6);
  if (slow.length) obs.push(`Svarar rätt men långsamt på ${slow.map(([a, b]) => `${a} · ${b}`).join(', ')}. Kan dem, men behöver mer flyt.`);
  Object.entries(S.tags).filter(([, x]) => x.n >= 2).sort((a, b) => b[1].n - a[1].n).forEach(([k, x]) => { const txt = tagText(k); if (txt) obs.push(`${esc(txt)} <span class="sub">(${x.n} gånger)</span>`); });
  const levelRows = leveledAreas().map(a => { const g = S.geo[a.id]; const max = a.levels.length; const lv = Math.min(g?.level || 1, max); const pct = g?.seen ? Math.round(g.right / g.seen * 100) + ' %' : '–'; return `<tr><td>${esc(a.name)}</td><td><span class="pips">${[...Array(max).keys()].map(i => `<i class="${i < lv ? 'on' : ''}"></i>`).join('')}</span> ${lv} av ${max}</td><td>${g?.seen || 0}</td><td>${pct}</td></tr>`; }).join('');
  const recent = [...S.log].reverse().slice(0, 20).map(x => { const dt = new Date(x.t); return `<tr><td>${dt.toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })} ${dt.toLocaleTimeString('sv-SE', { hour: '2-digit', minute: '2-digit' })}</td><td>${esc(areaById(x.s)?.short || x.s)}</td><td>${esc(x.q)}</td><td>${x.g1 ? esc(x.g1) + ' → ' : ''}${esc(x.g)}${x.ok ? '' : ` <span class="sub">(${esc(x.a ?? '')})</span>`}</td><td class="${x.ok ? 'okc' : 'noc'}">${x.ok ? (x.g1 ? 'Rätt, 2:a försöket' : 'Rätt') : 'Fel'}${x.h ? ' · tips' : ''}</td><td>${(x.ms / 1000).toFixed(1).replace('.', ',')} s</td></tr>`; }).join('');
  const sess = [...S.sessions].reverse().slice(0, 6).map(x => { const dt = new Date(x.start); const typ = x.mode === 'pass' ? 'Dagens pass' : x.mode === 'sandbox' ? 'Fri lek (bygga/utforska)' : 'Fri lek'; return `<tr><td>${dt.toLocaleDateString('sv-SE', { weekday: 'short', day: 'numeric', month: 'short' })}</td><td>${typ}</td><td>${fmtMin(x.ms)}</td><td>${x.n ? `${x.right} av ${x.n} rätt` : '–'}</td></tr>`; }).join('');
  const seg = (name, opts, cur) => `<div class="seg" data-seg="${name}">${opts.map(([v, l]) => `<button data-v="${v}" class="${String(v) === String(cur) ? 'on' : ''}">${l}</button>`).join('')}</div>`;
  el.innerHTML = `
    <header class="bar"><h2>Så går det</h2><button class="btn" data-go="home">Stäng</button></header>
    ${storageWorks() ? '' : '<div class="warn">Webbläsaren sparar inte data just nu (till exempel i privat läge). Framstegen försvinner när fliken stängs.</div>'}
    <div class="kpis">
      <div class="stat"><b>${fmtMin(ms7)}</b><span>tid senaste 7 dagarna</span></div>
      <div class="stat"><b>${n7}</b><span>uppgifter senaste 7 dagarna</span></div>
      <div class="stat"><b>${n7 ? Math.round(r7 / n7 * 100) + ' %' : '–'}</b><span>rätt på första försöket, senaste 7 dagarna</span></div>
      <div class="stat"><b>${good} av 100</b><span>gångertal som sitter</span></div>
    </div>
    <div class="section"><h3>Att hålla koll på</h3>${obs.length ? `<ul class="obs">${obs.map(o => `<li>${o}</li>`).join('')}</ul>` : '<p class="sub">Inget särskilt mönster ännu. Här dyker det upp saker när barnet har övat några pass, till exempel om hen blandar ihop area och omkrets.</p>'}</div>
    <div class="section" id="passSection"><h3>Dagens pass</h3>
      <p class="sub">Välj vilka områden barnet ska öva på och hur stor del av passet varje område ska få, till exempel det som klassen arbetar med just nu. Svårighetsnivån inom varje område anpassas efter hur det går.</p>
      <div class="field">Längd på dagens pass ${seg('passMin', [[5, '5 min'], [7, '7 min'], [10, '10 min']], S.settings.passMin)}</div>
      <div class="areas">${areaList()}</div>
      <div class="row"><button class="btn small" id="areaReset">Återställ förval</button><span class="msg" id="areaMsg"></span></div>
    </div>
    <div class="two">
      <div class="section"><h3>Multiplikationstabellen</h3><p class="sub">Tryck på en ruta för detaljer. Rad = första talet, kolumn = andra talet. Ett gångertal räknas som att det sitter när det har besvarats rätt och snabbt (under 5 sekunder) flera gånger.</p>
        <div class="heat-wrap"><div class="heat" id="heat">${heat}</div></div>
        <div class="legend"><span><i class="st-none"></i>Inte övad</span><span><i class="st-learn"></i>Övar</span><span><i class="st-mid"></i>På väg</span><span><i class="st-good"></i>Sitter</span></div>
        <div class="detail" id="heatDetail">${hard.length ? `Svårast just nu: ${hard.map(([a, b]) => `${a} · ${b}`).join(', ')}` : ''}</div>
      </div>
      <div class="section"><h3>Aktivitet</h3><p class="sub">Minuter per dag, senaste 14 dagarna.</p><div class="chart">${chart}</div>
        <h3 style="margin-top:8px">Senaste passen</h3>${sess ? `<div class="tbl-wrap"><table><thead><tr><th>Dag</th><th>Typ</th><th>Tid</th><th>Resultat</th></tr></thead><tbody>${sess}</tbody></table></div>` : '<p class="sub">Inga pass ännu.</p>'}
      </div>
    </div>
    <div class="section"><h3>Nivåer</h3><p class="sub">Nivån höjs efter 4 rätt av 5 och sänks efter 2 fel i rad.</p><div class="tbl-wrap"><table><thead><tr><th>Område</th><th>Nivå</th><th>Uppgifter</th><th>Rätt</th></tr></thead><tbody>${levelRows}</tbody></table></div></div>
    <div class="section"><h3>Senaste svaren</h3>${recent ? `<div class="tbl-wrap"><table><thead><tr><th>När</th><th>Område</th><th>Uppgift</th><th>Svar (rätt svar)</th><th></th><th>Tid</th></tr></thead><tbody>${recent}</tbody></table></div>` : '<p class="sub">Inga svar ännu.</p>'}</div>
    <div class="section"><h3>Inställningar</h3>
      <label class="field">Barnets namn (visas på startsidan)<input id="childName" maxlength="20" value="${esc(S.name)}" placeholder="Valfritt"></label>
    </div>
    <div class="section"><h3>Integritet</h3><p class="sub">Mattelabbet samlar inte in några uppgifter. Namn, svar och framsteg sparas bara i webbläsaren på den här enheten och skickas aldrig någonstans. Appen använder inga kakor, ingen spårning och ingen reklam.</p>
      <p class="sub">Webbläsaren kan ibland rensa sparad data, till exempel om appen inte används på länge eller om webbplatsdata raderas. Ta gärna en säkerhetskopia då och då.</p>
    </div>
    <div class="section"><h3>Säkerhetskopia</h3><p class="sub">Kopiera texten och spara den någonstans om du vill flytta framstegen till en annan enhet eller webbläsare.</p>
      <textarea id="exportTxt" readonly>${esc(JSON.stringify(S))}</textarea>
      <div class="row"><button class="btn small" id="copyBtn">Kopiera</button><span class="msg" id="copyMsg"></span></div>
      <textarea id="importTxt" placeholder="Klistra in en säkerhetskopia här"></textarea>
      <div class="row"><button class="btn small" id="importBtn">Läs in</button><label class="btn small" for="importFile">Välj fil</label><input type="file" id="importFile" accept=".json,.txt,application/json,text/plain" hidden><span class="msg" id="importMsg"></span></div>
    </div>
    <div class="section"><h3>Nollställ</h3><p class="sub">Raderar framstegen på den här enheten. Det går inte att ångra, så ta en säkerhetskopia först om du vill spara något.</p>
      <div class="row"><button class="btn small" data-reset="mul">Nollställ tabeller</button><button class="btn small" data-reset="geo">Nollställ nivåer</button><button class="btn small" data-reset="all">Nollställ allt</button></div><span class="msg" id="resetMsg"></span>
    </div>`;
  el.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => show(b.dataset.go)));
  wireAreas($('#passSection'));
  $('#areaReset').addEventListener('click', () => { S.settings.areas = {}; save(); renderParent(); $('#passSection').scrollIntoView({ block: 'nearest' }); $('#areaMsg').textContent = 'Förvalet är återställt.'; });
  el.querySelectorAll('#heat button').forEach(b => b.addEventListener('click', () => {
    el.querySelectorAll('#heat button').forEach(x => x.classList.remove('sel')); b.classList.add('sel');
    const [a, c] = b.dataset.f.split('x'); const f = S.facts[b.dataset.f];
    $('#heatDetail').innerHTML = f?.n ? `<b>${a} · ${c} = ${a * c}</b>: ${f.n} försök, ${f.r} rätt${f.ms ? `, snittid ${(f.ms / 1000).toFixed(1).replace('.', ',')} s` : ''}. ${STATUS_TXT[factStatus(f)]}.` : `<b>${a} · ${c}</b>: inte övad ännu.`;
  }));
  $('#childName').addEventListener('input', e => { S.name = e.target.value.trim(); save(); });
  el.querySelectorAll('[data-seg]').forEach(sg => sg.querySelectorAll('button').forEach(b => b.addEventListener('click', () => {
    S.settings[sg.dataset.seg] = Number(b.dataset.v); save();
    sg.querySelectorAll('button').forEach(x => x.classList.toggle('on', x === b));
  })));
  $('#copyBtn').addEventListener('click', () => {
    const ta = $('#exportTxt');
    const fallback = () => { ta.focus(); ta.select(); $('#copyMsg').textContent = 'Texten är markerad. Kopiera den med Kopiera i menyn.'; };
    try { navigator.clipboard.writeText(ta.value).then(() => $('#copyMsg').textContent = 'Kopierat.', fallback); } catch (e) { fallback(); }
  });
  let importArmed = null;
  const doImport = txt => {
    let d; try { d = JSON.parse(txt); } catch (e) { $('#importMsg').textContent = 'Texten gick inte att läsa. Kontrollera att hela säkerhetskopian är med.'; return; }
    if (!d || d.v !== 1 || typeof d.facts !== 'object') { $('#importMsg').textContent = 'Det här ser inte ut som en säkerhetskopia från Mattelabbet.'; return; }
    if (importArmed !== txt) { importArmed = txt; $('#importMsg').textContent = 'Det här ersätter all nuvarande data. Tryck på Läs in igen för att fortsätta.'; return; }
    replaceData(migrate(d)); save(); renderParent(); $('#importMsg').textContent = 'Inläst.';
  };
  $('#importBtn').addEventListener('click', () => doImport($('#importTxt').value.trim()));
  $('#importFile').addEventListener('change', e => { const f = e.target.files[0]; if (!f) return; const r = new FileReader(); r.onload = () => { $('#importTxt').value = r.result; importArmed = null; doImport(String(r.result).trim()); }; r.readAsText(f); });
  el.querySelectorAll('[data-reset]').forEach(b => {
    const orig = b.textContent; let armed = false, timer;
    b.addEventListener('click', () => {
      if (!armed) { armed = true; b.textContent = 'Tryck igen för att radera'; b.classList.add('danger'); timer = setTimeout(() => { armed = false; b.textContent = orig; b.classList.remove('danger'); }, 4000); return; }
      clearTimeout(timer); const k = b.dataset.reset;
      if (k === 'mul' || k === 'all') { S.facts = {}; Object.keys(S.tags).filter(t => t.startsWith('tab-')).forEach(t => delete S.tags[t]); }
      if (k === 'geo' || k === 'all') { S.geo = {}; Object.keys(S.tags).filter(t => !t.startsWith('tab-')).forEach(t => delete S.tags[t]); }
      if (k === 'all') replaceData({ ...defaults(), name: S.name, settings: S.settings });
      save(); renderParent(); $('#resetMsg').textContent = k === 'all' ? 'Allt är nollställt.' : k === 'mul' ? 'Tabellerna är nollställda.' : 'Nivåerna är nollställda.';
    });
  });
}
