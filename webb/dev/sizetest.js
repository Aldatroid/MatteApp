// Utvecklartest: kör igenom uppgifter och sandlådor och letar efter layout- och UX-fel i svarspanelen.
// Körs i webbläsarens konsol: await (await import('./dev/sizetest.js')).default()
export default async function sizeTest() {
  const errs = []; const onErr = e => errs.push(e.message); window.addEventListener('error', onErr);
  const s = ms => new Promise(r => setTimeout(r, ms));
  const $ = q => document.querySelector(q), $$ = q => [...document.querySelectorAll(q)];
  const rect = el => el.getBoundingClientRect();
  const hit = (a, b) => { const A = rect(a), B = rect(b); return A.left < B.right - 1 && B.left < A.right - 1 && A.top < B.bottom - 1 && B.top < A.bottom - 1; };
  const press = x => { const k = d => $('.key[data-k="' + d + '"]'); if (!k('ok')) return false; for (const ch of x) k(ch).click(); k('ok').click(); return true; };
  const solveMul = () => { const q = $('.q-text')?.innerText.replace(/\s+/g, ' '); const m = q && q.match(/^(\d+) · (\d+) = \?$/); return m ? m[1] * m[2] : null; };

  // Layout: ingen scroll, frågan överlappar inte knapparna
  const layout = label => {
    const out = []; const p = $('#panel');
    if (p.scrollHeight > p.clientHeight + 1) out.push(label + ': panelen scrollar ' + p.scrollHeight + '/' + p.clientHeight);
    const qa = $('.q-area'), ia = $('#inputArea');
    if (qa && ia && rect(qa).bottom > rect(ia).top + 1) out.push(label + ': frågan överlappar knapparna');
    return out;
  };
  // UX efter svar: Nästa lagom stor, svarsalternativ kvar och synliga, ingen glöd runt frågetexten vid flerval
  const afterReveal = (label, wasChoice) => {
    const out = [...layout(label)]; const nb = $('#nextBtn');
    if (!nb) return out;
    const h = rect(nb).height, keyH = $('.key') ? rect($('.key')).height : 80;
    if (h > Math.max(100, keyH * 1.4)) out.push(label + ': Nästa-knappen är ' + Math.round(h) + ' px hög (för stor)');
    if (wasChoice) {
      const ch = $$('.choice');
      if (!ch.length) out.push(label + ': svarsalternativen försvann efter svaret');
      else {
        if (!ch.some(c => c.classList.contains('ok'))) out.push(label + ': rätt alternativ markeras inte');
        if (ch.some(c => hit(c, nb))) out.push(label + ': Nästa täcker svarsalternativ');
      }
      if ($('.q-text.glow')) out.push(label + ': glödram runt frågan vid flerval');
    }
    return out;
  };
  const answerCurrent = async (label, res, wrongFirst) => {
    const isChoice = !!$('.choice');
    const a = solveMul();
    if (a != null && !wrongFirst) press(String(a));
    else if (isChoice) { $('.choice').click(); await s(300); const c = $$('.choice').find(b => !b.disabled && !b.classList.contains('no')); if (c && !$('#nextBtn')) c.click(); }
    else { press('1'); await s(400); res.push(...layout(label + ' nytt försök')); if (!$('#nextBtn')) press(a != null ? String(a) : '2'); }
    await s(1000);
    res.push(...afterReveal(label + ' facit', isChoice));
  };
  const goNext = async () => { const nb = $('#nextBtn'); if (nb) nb.click(); else await s(1500); await s(450); };
  const toFree = async () => { if (!$('#play').hidden) { $('#exitBtn').click(); await s(350); } if ($('#free').hidden) { $('[data-go="free"]')?.click(); await s(200); } if ($('#free').hidden) { $('#startFree').click(); await s(300); } };

  const res = []; let n = 0;
  // 1. Dagens pass
  if ($('#home').hidden) { $('[data-go="home"]')?.click(); await s(200); }
  $('#startPass').click(); await s(900);
  for (let i = 0; i < 8; i++) { res.push(...layout('pass ' + i)); n++; await answerCurrent('pass ' + i + ' (' + ($('.q-kicker')?.innerText || '') + ')', res, i % 3 === 0); await goNext(); }
  // 2. Flervalsuppgifter (kroppar och utfällningar), både rätt och fel
  for (const g of ['shapes', 'nets']) {
    await toFree(); $('[data-g="' + g + '"]').click(); await s(900);
    for (let i = 0; i < 3; i++) { n++; await answerCurrent(g + ' ' + i, res, i !== 1); await s(g === 'nets' ? 1800 : 200); res.push(...afterReveal(g + ' ' + i + ' efter animation', true)); await goNext(); }
  }
  // 3. Sandlådor
  for (const k of ['build', 'explore', 'fold']) {
    await toFree(); $('[data-sandbox="' + k + '"]').click(); await s(900);
    if (k === 'build') { $('#sbSplit').click(); await s(500); }
    res.push(...layout('sandlåda ' + k)); n++;
  }
  if (!$('#play').hidden) { $('#exitBtn').click(); await s(300); }
  window.removeEventListener('error', onErr);
  return { checked: n, errs, issues: [...new Set(res)] };
}
