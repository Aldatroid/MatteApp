/* ============ Hjälpare ============ */
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
export const rnd = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
export const pick = a => a[Math.floor(Math.random() * a.length)];
export const shuffle = arr => { const a = [...arr]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
export const dayKey = (t = Date.now()) => { const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
export const fmtMin = ms => { const m = Math.round(ms / 60000); if (m < 1) return 'under en minut'; if (m < 60) return m + ' min'; return Math.floor(m / 60) + ' h ' + (m % 60) + ' min'; };
export const cssVar = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim() || '#888888';
export const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
// Viktat slumpval: weights[i] >= 0. Returnerar index, eller -1 om alla vikter är 0.
export function weightedIndex(weights) {
  const total = weights.reduce((a, b) => a + b, 0); if (total <= 0) return -1;
  let r = Math.random() * total;
  for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) return i; }
  return weights.length - 1;
}

/* ============ Skärmar ============
   Varje skärm kan registrera vad som ska hända när den visas (onShow). */
const showHooks = {};
export const onShow = (id, fn) => (showHooks[id] ||= []).push(fn);
export function show(id) {
  $$('.screen').forEach(s => s.hidden = s.id !== id);
  (showHooks[id] || []).forEach(f => f());
  (showHooks['*'] || []).forEach(f => f(id));
}
