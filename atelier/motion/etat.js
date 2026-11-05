// Motion Studio · état de l'éditeur : document, sélection, historique (annuler, rétablir), opérations sur les calques.
import { normaliserDoc, normaliserEl, trouverEl, parcourir, boites, inverse, nouvelId, creerElement } from '../../templates/_systeme/studio.js';

export const S = { doc: null, sel: [], t: 0, lecture: null, ressources: new Map(), hist: [], futur: [], cle: null, heure: 0, presse: null, recadrage: false, boites: {} };
const ecouteurs = new Set();
export const ecouter = (fn) => ecouteurs.add(fn);
export const notifier = (quoi) => { if (quoi === 'doc' || quoi === 'charge') S.boites = boites(S.doc); ecouteurs.forEach((f) => f(quoi)); };
const photo = () => JSON.stringify(S.doc);
// Toute modification passe ici : un instantané par geste (les réglages continus d'un même champ sont regroupés)
export function modifier(fn, cle = null) {
  const n = Date.now();
  if (!(cle && cle === S.cle && n - S.heure < 1000)) { S.hist.push(photo()); if (S.hist.length > 120) S.hist.shift(); S.futur = []; }
  S.cle = cle; S.heure = n; fn(S.doc); notifier('doc');
}
export function annuler() { if (!S.hist.length) return false; S.futur.push(photo()); S.doc = JSON.parse(S.hist.pop()); S.cle = null; nettoyer(); notifier('doc'); notifier('sel'); return true; }
export function retablir() { if (!S.futur.length) return false; S.hist.push(photo()); S.doc = JSON.parse(S.futur.pop()); S.cle = null; nettoyer(); notifier('doc'); notifier('sel'); return true; }
export function charger(doc) { S.doc = normaliserDoc(doc); S.hist = []; S.futur = []; S.sel = []; S.recadrage = false; notifier('charge'); notifier('sel'); }
const nettoyer = () => { S.sel = S.sel.filter((id) => trouverEl(S.doc, id)); };

// ---------- Sélection ----------
export function selectionner(ids, ajout = false) { const l = [].concat(ids).filter(Boolean); if (ajout && l.length === 1) S.sel = S.sel.includes(l[0]) ? S.sel.filter((i) => i !== l[0]) : [...S.sel, l[0]]; else S.sel = ajout ? [...new Set([...S.sel, ...l])] : l; S.recadrage = false; notifier('sel'); }
export const selection = () => S.sel.map((id) => trouverEl(S.doc, id)).filter(Boolean);
export const premier = () => selection()[0]?.el || null;
// Sélection « racine » : ignore les éléments dont un parent est aussi sélectionné
const racines = () => { const s = selection(); return s.filter((x) => { let p = x.parent; while (p) { if (S.sel.includes(p.id)) return false; p = trouverEl(S.doc, p.id)?.parent; } return true; }); };

// ---------- Opérations ----------
const nouveauxIds = (e) => { e.id = nouvelId(); e.enfants?.forEach(nouveauxIds); return e; };
export function ajouter(el, { selectionner: sel = true } = {}) { const e = normaliserEl(el); modifier((d) => d.elements.push(e)); if (sel) selectionner(e.id); return e; }
export function supprimer() { const r = racines(); if (!r.length) return; modifier(() => r.forEach(({ el, liste }) => { const i = liste.indexOf(el); if (i >= 0 && !el.verrou) liste.splice(i, 1); })); selectionner([]); }
export function dupliquer() {
  const r = racines(), u = Math.min(S.doc.format.w, S.doc.format.h) / 1080, ids = [];
  modifier(() => r.forEach(({ el, liste }) => { const c = nouveauxIds(JSON.parse(JSON.stringify(el))); c.x += 24 * u; c.y += 24 * u; c.nom = `${el.nom} (copie)`; c.verrou = false; liste.splice(liste.indexOf(el) + 1, 0, c); ids.push(c.id); }));
  selectionner(ids);
}
export function copier() { S.presse = racines().map(({ el }) => JSON.parse(JSON.stringify(el))); }
export function coller() { if (!S.presse?.length) return; const ids = []; modifier((d) => S.presse.forEach((e) => { const c = nouveauxIds(JSON.parse(JSON.stringify(e))); c.x += 30; c.y += 30; d.elements.push(c); ids.push(c.id); })); selectionner(ids); }
// Déplacement exprimé dans le repère de la scène, converti dans le repère du parent
export function deplacer(entree, dx, dy) {
  const p = entree.parent; let lx = dx, ly = dy;
  if (p) { const m = inverse(S.boites[p.id].m); lx = m[0] * dx + m[2] * dy; ly = m[1] * dx + m[3] * dy; }
  entree.el.x += lx; entree.el.y += ly;
}
export function redimensionner(e, nw, nh) {
  if (e.type === 'groupe' && e.w > 0 && e.h > 0) { const kx = nw / e.w, ky = nh / e.h, k = Math.sqrt(kx * ky);
    const ech = (c) => { c.x *= kx; c.y *= ky; c.w *= kx; c.h *= ky; if (c.texte) c.texte.taille = Math.max(4, c.texte.taille * k); if (c.enfants) c.enfants.forEach(ech); }; e.enfants.forEach(ech); }
  e.w = Math.max(1, nw); e.h = Math.max(1, nh);
}
export function grouper() {
  const r = racines(); if (r.length < 2) return;
  const liste = r[0].liste, memes = r.filter((x) => x.liste === liste), els = memes.map((x) => x.el);
  const xs = els.flatMap((e) => [e.x, e.x + e.w]), ys = els.flatMap((e) => [e.y, e.y + e.h]), x0 = Math.min(...xs), y0 = Math.min(...ys);
  const g = normaliserEl({ type: 'groupe', nom: 'Groupe', x: x0, y: y0, w: Math.max(...xs) - x0, h: Math.max(...ys) - y0, enfants: [] });
  modifier(() => { const pos = Math.max(...els.map((e) => liste.indexOf(e))); liste.splice(pos + 1, 0, g); for (const e of [...els].sort((a, b) => liste.indexOf(a) - liste.indexOf(b))) { liste.splice(liste.indexOf(e), 1); e.x -= x0; e.y -= y0; g.enfants.push(e); } });
  selectionner(g.id);
}
export function degrouper() {
  const s = premier(); if (!s || s.type !== 'groupe') return; const { liste } = trouverEl(S.doc, s.id), m = S.boites[s.id].m, pm = trouverEl(S.doc, s.id).parent ? S.boites[trouverEl(S.doc, s.id).parent.id].m : null, ids = [];
  modifier(() => { const i = liste.indexOf(s); liste.splice(i, 1, ...s.enfants.map((c) => {
    // Centre de l'enfant ramené dans le repère du parent du groupe
    const cx = m[0] * (c.x + c.w / 2) + m[2] * (c.y + c.h / 2) + m[4], cy = m[1] * (c.x + c.w / 2) + m[3] * (c.y + c.h / 2) + m[5];
    let px = cx, py = cy; if (pm) { const iv = inverse(pm); px = iv[0] * cx + iv[2] * cy + iv[4]; py = iv[1] * cx + iv[3] * cy + iv[5]; }
    c.x = px - c.w / 2; c.y = py - c.h / 2; c.rot = (c.rot || 0) + (s.rot || 0); c.op = (c.op ?? 1) * (s.op ?? 1); ids.push(c.id); return c; })); });
  selectionner(ids);
}
export function ordre(sens) {
  const r = racines(); if (!r.length) return;
  modifier(() => { const l = sens === 'avant' || sens === 'premier' ? [...r].reverse() : r; for (const { el, liste } of l) { const i = liste.indexOf(el); liste.splice(i, 1);
    const j = sens === 'premier' ? liste.length : sens === 'dernier' ? 0 : sens === 'avant' ? Math.min(liste.length, i + 1) : Math.max(0, i - 1); liste.splice(j, 0, el); } });
}
// Alignement : sur la scène (un élément) ou sur l'ensemble de la sélection
export function aligner(mode) {
  const r = racines(); if (!r.length) return; const { w: W, h: H } = S.doc.format, ab = (x) => S.boites[x.el.id].aabb;
  const ref = r.length === 1 ? { x: 0, y: 0, w: W, h: H } : (() => { const b = r.map(ab), x = Math.min(...b.map((v) => v.x)), y = Math.min(...b.map((v) => v.y)); return { x, y, w: Math.max(...b.map((v) => v.x + v.w)) - x, h: Math.max(...b.map((v) => v.y + v.h)) - y }; })();
  modifier(() => r.forEach((x) => { const b = ab(x); const dx = { gauche: ref.x - b.x, centre: ref.x + ref.w / 2 - (b.x + b.w / 2), droite: ref.x + ref.w - (b.x + b.w) }[mode] ?? 0, dy = { haut: ref.y - b.y, milieu: ref.y + ref.h / 2 - (b.y + b.h / 2), bas: ref.y + ref.h - (b.y + b.h) }[mode] ?? 0; deplacer(x, dx, dy); }));
}
export function distribuer(axe) {
  const r = racines(); if (r.length < 3) return; const k = axe === 'h' ? 'x' : 'y', L = axe === 'h' ? 'w' : 'h', ab = (x) => S.boites[x.el.id].aabb, tri = [...r].sort((a, b) => ab(a)[k] - ab(b)[k]);
  const debut = ab(tri[0])[k], fin = ab(tri.at(-1))[k] + ab(tri.at(-1))[L], total = tri.reduce((s, x) => s + ab(x)[L], 0), esp = (fin - debut - total) / (tri.length - 1);
  modifier(() => { let pos = debut; for (const x of tri) { const d = pos - ab(x)[k]; deplacer(x, axe === 'h' ? d : 0, axe === 'h' ? 0 : d); pos += ab(x)[L] + esp; } });
}
export const nouvelElement = (type, o) => ajouter(creerElement(type, S.doc, o));
export { parcourir, trouverEl };
