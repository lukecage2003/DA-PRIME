// Script Studio · petits utilitaires d'interface partagés (sans dépendance)
export const $ = (s, r = document) => r.querySelector(s);
export const el = (tag, { dataset, style, ...p } = {}, ...k) => { const e = Object.assign(document.createElement(tag), p); if (dataset) Object.assign(e.dataset, dataset); if (style) e.style.cssText = style; for (const [a, v] of Object.entries(p)) if (a.startsWith('aria-') || a === 'role' || a === 'for') e.setAttribute(a, v); e.append(...k.flat().filter((x) => x !== null && x !== undefined && x !== false)); return e; };
export const bouton = (txt, fn, p = {}) => { const b = el('button', { type: 'button', textContent: txt, ...p }); b.addEventListener('click', fn); return b; };
export const champ = (label, input, aide) => el('label', { className: 'champ' }, el('span', { textContent: label }), input, aide ? el('small', { textContent: aide }) : null);
export const choix = (opts, val) => { const s = el('select', {}, ...Object.entries(opts).map(([v, t]) => el('option', { value: v, textContent: t }))); s.value = val ?? ''; return s; };
export const saisie = (val = '', p = {}) => el('input', { type: 'text', value: val ?? '', autocomplete: 'off', ...p });
export const zone = (val = '', p = {}) => el('textarea', { value: val ?? '', rows: 3, ...p });
export function info(m) { const e = $('#etat'); if (e) e.textContent = m; }
export const telecharger = (data, nom, type = 'text/plain;charset=utf-8') => { const a = el('a', { href: URL.createObjectURL(data instanceof Blob ? data : new Blob([data], { type })), download: nom }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); };
export const slug = (s) => String(s || 'script').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50) || 'script';
export const sans = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
export const PROVENANCES = { dialogue: 'Dialogue (texte présent)', visuel: 'Visible dans l\'illustration', interpretation: 'Interprétation / déduction', incertain: 'Incertain', source: 'Source complémentaire' };
// Champ de texte qui s'agrandit avec son contenu
export function autoTaille(t) { const f = () => { t.style.height = 'auto'; t.style.height = `${t.scrollHeight + 2}px`; }; t.addEventListener('input', f); requestAnimationFrame(f); return t; }
