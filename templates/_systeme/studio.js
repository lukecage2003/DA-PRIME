// Primestone · Motion Studio · cœur du studio de composition libre (module ES sans dépendance, Node et navigateur).
// Document (version 2) : format, système graphique, fond, caméra, éléments (texte, image, forme, effet, groupe, vecteur).
// rendreScene(doc, t) -> liste d'affichage + boîtes de sélection + contrôles. Le même résultat alimente l'aperçu et tous les exports.
import { C, clamp, r1, placer, M, ease } from './motion-base.js';
import { SYSTEMES, palette, resoudre, format as fmt, FORMATS_STUDIO } from './studio-systemes.js';
import { forme, contour } from './studio-formes.js';
import { texteNoeuds, mesureMetriques, capRatio } from './studio-texte.js';
import { effetNoeuds, EFFETS_LIB } from './studio-effets.js';
import { etatAnim, camera, finEntrees, ANIM0 } from './studio-anim.js';
import { composer as composerV1, nouveauDoc as nouveauV1, normaliser as normaliserV1, FAMILLES_MOTION, DIRECTIONS as DIR_V1 } from './motion.js';
import { trame } from './motion-base.js';
import LOGO from './logo.js';
export { SYSTEMES, FORMATS_STUDIO, EFFETS_LIB, FAMILLES_MOTION };

export const VERSION = 2;
let compteur = 0;
export const nouvelId = (p = 'e') => `${p}${Date.now().toString(36)}${(compteur++).toString(36)}${Math.random().toString(36).slice(2, 5)}`;
const copie = (x) => JSON.parse(JSON.stringify(x));
const fusion = (base, o) => { const r = copie(base); for (const [k, v] of Object.entries(o || {})) if (v !== undefined) r[k] = v && typeof v === 'object' && !Array.isArray(v) && r[k] && typeof r[k] === 'object' && !Array.isArray(r[k]) ? fusion(r[k], v) : v; return r; };

// ---------- Document ----------
export function nouveauDocument({ format = '16:9', w, h, systeme = 'comics', palette: pal, nom = 'Nouvelle création' } = {}) {
  const sy = SYSTEMES[systeme] ? systeme : 'comics';
  return normaliserDoc({ v: VERSION, id: nouvelId('c'), nom, systeme: sy, palette: pal || Object.keys(SYSTEMES[sy].palettes)[0], format: fmt(format, w, h), elements: [] });
}
export function normaliserDoc(d) {
  const sy = SYSTEMES[d.systeme] ? d.systeme : 'comics', f = d.format?.w ? { ...fmt(d.format.id, d.format.w, d.format.h), ...(d.format.id === 'perso' ? {} : {}), w: Math.round(clamp(+d.format.w, 64, 8192)), h: Math.round(clamp(+d.format.h, 64, 8192)) } : fmt(d.format);
  return {
    v: VERSION, id: d.id || nouvelId('c'), nom: String(d.nom || 'Sans titre'), dossier: String(d.dossier || ''), systeme: sy, palette: SYSTEMES[sy].palettes[d.palette] ? d.palette : Object.keys(SYSTEMES[sy].palettes)[0],
    couleurs: { ...(d.couleurs || {}) }, format: f, fond: { type: 'couleur', c1: '@fond', c2: '@papier', angle: 90, ...(d.fond || {}) },
    duree: clamp(+d.duree || 6, 1, 60), boucle: d.boucle ?? true, camera: { type: 'aucune', intensite: 0.5, ...(d.camera || {}) },
    grille: { pas: 60, visible: false, aimant: true, ...(d.grille || {}) }, guides: { h: [...(d.guides?.h || [])], v: [...(d.guides?.v || [])] }, zonesSures: d.zonesSures ?? false,
    elements: (d.elements || []).map(normaliserEl), cree: d.cree || Date.now(), modifie: d.modifie, origine: d.origine,
    ...(Array.isArray(d.plans) && d.plans.length > 1 ? { plans: d.plans.map((p, i) => normaliserPlan(p, i)), planActif: Math.min(d.plans.length - 1, Math.max(0, d.planActif | 0)) } : {}),
  };
}
const BASE = { x: 0, y: 0, w: 400, h: 200, rot: 0, op: 1, visible: true, verrou: false, blend: 'normal', prof: 0, miroir: false };
const DEF = {
  texte: { contenu: 'Texte', role: 'titre', police: 'display', taille: 120, auto: true, interligne: 0.95, interlettre: 0, align: 'start', valign: 'haut', casse: 'upper', fill: '@texte', degrade: null, fond: 'none',
    contour: { c: '@encre', w: 0 }, contour2: { c: '@accent', w: 0 }, ombre: { c: '@encre', dx: 0, dy: 0, flou: 0, op: 0.85 }, lueur: { c: '@accent', b: 0 }, extrusion: { c: '@accent', profondeur: 0, angle: 45 }, deformation: { type: 'aucune', force: 0.4 } },
  image: { src: null, placeholder: 'pop', ajustement: 'couvrir', zoom: 1, dx: 0, dy: 0, masque: { forme: 'rect', pts: null }, contour: { c: '@encre', w: 0 }, ombre: null,
    traitement: { detourage: { actif: false, couleur: '#FFFFFF', tolerance: 40 }, nb: false, bichromie: { actif: false, c1: '@encre', c2: '@accent' }, contraste: 0, luminosite: 0, trame: { actif: false, cellule: 10 } } },
  forme: { type: 'rect', fill: '@accent', stroke: '@encre', lw: 6, rayon: 0, cotes: 5, branches: 12, creux: 0.55, angle: 12, queue: [0.25, 1.3], graine: 3, degrade: null, ombre: null, trame: { actif: false, couleur: '@encre', cellule: 14, intensite: 0.5 } },
};
export function normaliserEl(e) {
  const o = { ...BASE, ...e, id: e.id || nouvelId(), nom: e.nom || e.type, anim: fusion(ANIM0, e.anim) };
  for (const k of ['x', 'y', 'w', 'h', 'rot', 'op', 'prof']) o[k] = Number.isFinite(+o[k]) ? +o[k] : BASE[k];
  o.w = Math.max(1, o.w); o.h = Math.max(1, o.h);
  if (o.type === 'texte') o.texte = fusion(DEF.texte, e.texte);
  if (o.type === 'image') o.image = fusion(DEF.image, e.image);
  if (o.type === 'forme') o.forme = fusion(DEF.forme, e.forme);
  if (o.type === 'effet') o.effet = { type: 'trame', ...(e.effet || {}), params: { ...(EFFETS_LIB[e.effet?.type || 'trame']?.def || {}), ...(e.effet?.params || {}) } };
  if (o.type === 'groupe') o.enfants = (e.enfants || []).map(normaliserEl);
  return o;
}
// Styles de texte du système (hiérarchie) appliqués à un élément texte
export function styleTexte(systeme, role) {
  const s = (SYSTEMES[systeme] || SYSTEMES.comics).textes[role] || SYSTEMES.comics.textes.titre;
  return { role, police: s.police, taille: s.taille, casse: s.casse, interlettre: s.interlettre, interligne: s.interligne, fill: s.fill || '@texte', fond: s.fond || 'none',
    contour: { c: '@encre', w: s.contour || 0 }, extrusion: { c: '@accent', profondeur: s.extrusion || 0, angle: 45 }, lueur: { c: '@accent', b: s.lueur || 0 }, ombre: { c: '@accent', dx: s.ombre || 0, dy: s.ombre || 0, flou: 0, op: 1 },
    degrade: s.degrade ? { c2: '@accent' } : null, deformation: { type: s.deformation || 'aucune', force: 0.35 } };
}
// Fabrique d'éléments (valeurs adaptées au système et au format)
export function creerElement(type, doc, o = {}) {
  const { w: W, h: H } = doc.format, u = Math.min(W, H) / 1080, an = SYSTEMES[doc.systeme]?.animation || {};
  const anim = { entree: { type: an.entree || 'fondu', duree: an.duree || 0.6, courbe: an.ease || 'douce', delai: 0 } };
  let e;
  if (type === 'texte') { const role = o.role || 'titre', st = styleTexte(doc.systeme, role); st.taille = Math.round(st.taille * u);
    ['contour', 'extrusion', 'lueur', 'ombre'].forEach((k) => { for (const p of ['w', 'profondeur', 'b', 'dx', 'dy']) if (st[k][p]) st[k][p] = Math.round(st[k][p] * u); });
    const lw = role === 'corps' ? W * 0.4 : W * 0.6; e = { type, nom: o.nom || { titre: 'Titre', surtitre: 'Surtitre', accroche: 'Accroche', corps: 'Texte', legende: 'Légende', onomatopee: 'Onomatopée' }[role] || 'Texte', w: lw, h: st.taille * (role === 'corps' ? 5 : 1.5),
      texte: { ...st, contenu: o.contenu ?? { titre: 'Titre d\'impact', surtitre: 'Surtitre', accroche: 'Une accroche éditoriale', corps: 'Un texte courant sur plusieurs lignes, ajusté à la boîte.', legende: 'Légende · crédit', onomatopee: 'BOUM !' }[role] ?? 'Texte' }, anim: role === 'onomatopee' ? { entree: { type: 'tampon', duree: 0.45, courbe: 'rebond' }, boucle: { type: 'tremblement', amplitude: 0.4 } } : anim }; }
  else if (type === 'image') e = { type, nom: 'Illustration', w: W * 0.45, h: H * 0.6, image: { placeholder: o.placeholder || 'pop' }, anim };
  else if (type === 'forme') { const f = o.forme || 'rect', bul = ['bulle', 'cri', 'pensee', 'cartouche'].includes(f);
    e = { type, nom: o.nom || f, w: (bul ? 520 : f === 'ligne' ? 600 : 360) * u, h: (bul ? 300 : f === 'ligne' ? 12 : 360) * u, forme: { type: f, fill: bul ? '@papier' : f === 'case' || f === 'cadre' ? '@papier' : '@accent', stroke: '@encre', lw: Math.round((f === 'cadre' ? 10 : 6) * u), branches: f === 'explosion' ? 14 : 5 }, anim }; }
  else if (type === 'effet') { const ef = o.effet || 'trame'; e = { type, nom: EFFETS_LIB[ef]?.nom || ef, x: 0, y: 0, w: W, h: H, effet: { type: ef, params: { ...(EFFETS_LIB[ef]?.def || {}), ...(o.params || {}) } }, anim: { entree: { type: 'fondu', duree: 0.8 } } }; }
  else if (type === 'groupe') e = { type, nom: 'Groupe', enfants: [] };
  else e = { type, nom: o.nom || type };
  e = { ...e, ...o.props };
  if (e.x === undefined) { e.x = (W - e.w) / 2; e.y = (H - e.h) / 2; }
  return normaliserEl(e);
}
export const parcourir = (els, fn, parent = null) => { for (const e of els) { fn(e, parent); if (e.enfants) parcourir(e.enfants, fn, e); } };
export function trouverEl(doc, id) { let r = null; parcourir(doc.elements, (e, p) => { if (e.id === id) r = { el: e, parent: p, liste: p ? p.enfants : doc.elements }; }); return r; }

// ---------- Matrices (sélection, alignement, magnétisme) ----------
const mul = (a, b) => [a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1], a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3], a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5]];
export function matriceEl(e) { const r = ((e.rot || 0) * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r), f = e.miroir ? -1 : 1, cx = e.w / 2, cy = e.h / 2;
  let m = [1, 0, 0, 1, e.x + cx, e.y + cy]; m = mul(m, [c * f, s * f, -s, c, 0, 0]); return mul(m, [1, 0, 0, 1, -cx, -cy]); }
export const appliquer = (m, x, y) => [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
export function inverse(m) { const d = m[0] * m[3] - m[1] * m[2]; return [m[3] / d, -m[1] / d, -m[2] / d, m[0] / d, (m[2] * m[5] - m[3] * m[4]) / d, (m[1] * m[4] - m[0] * m[5]) / d]; }
export function boites(doc) { const out = {}; const vis = (els, pm) => els.forEach((e) => { const m = mul(pm, matriceEl(e)); const c = [[0, 0], [e.w, 0], [e.w, e.h], [0, e.h]].map(([x, y]) => appliquer(m, x, y));
  const xs = c.map((p) => p[0]), ys = c.map((p) => p[1]); out[e.id] = { m, w: e.w, h: e.h, coins: c, aabb: { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) } }; if (e.enfants) vis(e.enfants, m); });
  vis(doc.elements, [1, 0, 0, 1, 0, 0]); return out; }

// ---------- Rendu ----------
export function instantPose(doc) { return Math.min(doc.duree, finEntrees(doc.elements) + 0.05); }
// opts : final (composition complète), mesure, ressource(id) -> {href,w,h}, traitee(el) -> {href,w,h}|null, police(id) -> {fam,poids,style}, placeholder(nom) -> {href,w,h}, sansFond
export function rendreScene(doc, t = null, opts = {}) {
  const W = doc.format.w, H = doc.format.h, u = Math.min(W, H) / 1080, pal = palette(doc), col = (v) => resoudre(v, pal), D = doc.duree, alertes = [];
  const pose = instantPose(doc), tt = opts.final || t === null ? pose : clamp(t, 0, D), mesure = opts.mesure || mesureMetriques;
  const neutre = { dx: 0, dy: 0, s: 1, r: 0, op: 1, clip: null, texte: null };
  function contenu(e, a) {
    switch (e.type) {
      case 'texte': { const tx = e.texte, pol = tx.police.startsWith('f:') ? opts.police?.(tx.police.slice(2)) : null;
        const r = texteNoeuds(tx, e.w, e.h, col, { mesure, police: pol || undefined, anim: a.texte });
        if (r.mp.deborde) alertes.push({ niveau: 'erreur', id: e.id, message: `${e.nom} : le texte déborde de sa boîte. Agrandir la boîte, réduire la taille ou activer l'ajustement automatique.` });
        if (r.mp.vide) alertes.push({ niveau: 'attention', id: e.id, message: `${e.nom} : texte vide.` });
        else if (r.mp.taille * capRatio(tx.police) < Math.min(W, H) * 0.0095) alertes.push({ niveau: 'attention', id: e.id, message: `${e.nom} : capitales de ${Math.round(r.mp.taille * capRatio(tx.police))} px, peu lisibles à ce format.` });
        return r.nodes; }
      case 'image': return image(e);
      case 'forme': { const f = e.forme, tr = f.trame?.actif ? [trame({ x: 0, y: 0, w: e.w, h: e.h, cell: Math.max(4, (f.trame.cellule || 14) * u), angle: 15, f: () => f.trame.intensite ?? 0.5, fill: col(f.trame.couleur), cle: `ft-${e.id}-${Math.round(e.w)}x${Math.round(e.h)}-${f.trame.cellule}-${f.trame.intensite}-${col(f.trame.couleur)}` })] : null;
        return forme(f, e.w, e.h, col, { trame: tr }); }
      case 'effet': return effetNoeuds(e.effet.type, e.effet.params, e.w, e.h, tt, col, u);
      case 'groupe': return e.enfants.map((x) => element(x, false)).filter(Boolean);
      case 'vecteur': { const v = e.vecteur, sy = e.h / v.h0, sx = (e.w / v.w0) / sy; return [{ k: 'g', tr: { x: -v.x0 * sx * sy, y: -v.y0 * sy, s: sy, sx, r: 0, ox: 0, oy: 0 }, kids: v.nodes }]; }
      case 'sceau': { const s = Math.min(e.w, e.h), gh = s * 0.68, sc = gh / LOGO.P.h; return [{ k: 'rect', x: 0, y: 0, w: s, h: s, rx: r1(s * 0.22), fill: col(e.sceau?.fond || '@encre') }, { k: 'path', d: LOGO.P.d, regle: 'evenodd', statut: 'NON-OFFICIEL', fill: col(e.sceau?.lettre || '@accent'), tr: { x: r1((s - LOGO.P.w * sc) / 2), y: r1((s - gh) / 2), s: Math.round(sc * 10000) / 10000 } }]; }
      default: return [];
    }
  }
  function image(e) {
    const im = e.image, src = (im.src && (opts.traitee?.(e) || opts.ressource?.(im.src))) || (!im.src ? opts.placeholder?.(im.placeholder) : null);
    const msq = im.masque?.forme || 'rect', d = msq === 'aucun' ? null : contour(msq === 'polygone' && !im.masque.pts ? 'rect' : msq, e.w, e.h, { pts: im.masque.pts, angle: 12, graine: 5, branches: msq === 'etoile' ? 5 : 14 }), out = [];
    if (im.ombre) out.push({ k: 'path', d: d || contour('rect', e.w, e.h), fill: col(im.ombre.c || '@encre'), op: im.ombre.op ?? 0.45, tr: { x: (im.ombre.dx ?? 18) * u, y: (im.ombre.dy ?? 18) * u, s: 1 } });
    if (!src?.href) { if (im.src) alertes.push({ niveau: 'erreur', id: e.id, message: `${e.nom} : illustration introuvable dans les ressources.` }); return out; }
    if (!im.src) alertes.push({ niveau: 'info', id: e.id, message: `${e.nom} : image de substitution (PLACEHOLDER).` });
    const p = placer({ ...src, zoom: im.zoom, dx: im.dx, dy: im.dy }, { x: 0, y: 0, w: e.w, h: e.h, mode: im.ajustement === 'contenir' ? 'contenir' : 'couvrir' });
    if (im.src && p.echelle > 1.5) alertes.push({ niveau: 'attention', id: e.id, message: `${e.nom} : image agrandie ${p.echelle.toFixed(1)} fois, risque de flou à l'export.` });
    const n = { k: 'img', href: src.href, x: r1(p.x), y: r1(p.y), w: r1(p.w), h: r1(p.h) };
    if (im.contour?.w > 0 && (im.ajustement === 'contenir' || msq === 'aucun')) n.contour = { c: col(im.contour.c), w: r1(im.contour.w) };
    out.push(d ? { k: 'g', clip: d, kids: [n] } : n);
    if (im.contour?.w > 0 && d && im.ajustement !== 'contenir') out.push({ k: 'path', d, fill: 'none', stroke: col(im.contour.c), lw: im.contour.w });
    return out;
  }
  function element(e, haut) {
    if (e.visible === false) return null;
    const a = opts.final ? neutre : etatAnim(e.anim, tt, D, W, H, e.w, e.h, u), cam = haut && !opts.final ? camera(doc.camera, tt, D, W, H, e.prof, e.x + e.w / 2, e.y + e.h / 2) : { dx: 0, dy: 0, s: 1 };
    let kids; try { kids = contenu(e, a); } catch (err) { alertes.push({ niveau: 'erreur', id: e.id, message: `${e.nom} : élément illisible (${err.message}).` }); kids = []; }
    if (a.clip) kids = [{ k: 'g', clip: a.clip, kids }];
    const op = (e.op ?? 1) * a.op; if (op <= 0.001) return null;
    return { k: 'g', id: e.id, nom: e.nom, op: Math.round(op * 1000) / 1000, blend: e.blend && e.blend !== 'normal' ? e.blend : undefined,
      tr: { x: r1(e.x + a.dx + cam.dx), y: r1(e.y + a.dy + cam.dy), s: Math.round(a.s * cam.s * 10000) / 10000, sx: e.miroir ? -1 : undefined, r: r1((e.rot || 0) + a.r), ox: r1(e.w / 2), oy: r1(e.h / 2) }, kids };
  }
  const nodes = [];
  if (!opts.sansFond && doc.fond.type !== 'transparent') { const f = doc.fond, a = ((f.angle ?? 90) * Math.PI) / 180, dx = Math.cos(a) / 2, dy = Math.sin(a) / 2;
    nodes.push({ k: 'rect', id: 'fond-document', x: 0, y: 0, w: W, h: H, fill: f.type === 'degrade' ? { lin: [r1(W * (0.5 - dx)), r1(H * (0.5 - dy)), r1(W * (0.5 + dx)), r1(H * (0.5 + dy))], st: [[0, col(f.c1), 1], [1, col(f.c2), 1]] } : f.type === 'radial' ? { rad: [W / 2, H / 2, Math.hypot(W, H) * 0.6], st: [[0, col(f.c2), 1], [1, col(f.c1), 1]] } : col(f.c1) }); }
  for (const e of doc.elements) { const n = element(e, true); if (n) nodes.push(n); }
  // Contrôles de composition
  const bx = boites(doc);
  for (const e of doc.elements) { const b = bx[e.id]?.aabb; if (b && e.visible !== false && (b.x > W || b.y > H || b.x + b.w < 0 || b.y + b.h < 0)) alertes.push({ niveau: 'attention', id: e.id, message: `${e.nom} : hors de la scène.` }); }
  return { w: W, h: H, nodes, t: tt, duree: D, pose, alertes, boites: bx };
}

// ---------- Adaptation à un autre format ----------
// Échelle : moyenne géométrique des rapports (ni minuscule ni géante), limitée au cadre ; position : ancrage au bord le plus proche
// (marge mise à l'échelle) ou position relative au centre ; les éléments plein cadre sont étirés. Les corrections restent manuelles.
export function adapter(doc, nf) {
  const { w: W, h: H } = doc.format, kx = nf.w / W, ky = nf.h / H, s0 = Math.sqrt(kx * ky), d = copie(doc); d.format = nf;
  const ech = (e, k) => { if (e.type === 'texte') { const t = e.texte; t.taille = Math.max(4, Math.round(t.taille * k * 10) / 10); for (const [o, p] of [['contour', 'w'], ['contour2', 'w'], ['extrusion', 'profondeur'], ['lueur', 'b'], ['ombre', 'dx'], ['ombre', 'dy']]) if (t[o]?.[p]) t[o][p] = Math.round(t[o][p] * k * 10) / 10; }
    if (e.type === 'forme' && e.forme.lw) e.forme.lw = Math.max(1, Math.round(e.forme.lw * k * 10) / 10); if (e.type === 'image' && e.image.contour?.w) e.image.contour.w = Math.round(e.image.contour.w * k * 10) / 10;
    if (e.enfants) e.enfants.forEach((c) => { c.x *= k; c.y *= k; c.w *= k; c.h *= k; ech(c, k); }); if (e.type === 'texte' && !e.texte.auto) { e.w *= 1.02; e.h *= 1.02; } };
  const ancre = (v, L, N, taille, ntaille) => (v + taille / 2 < L / 3 ? v * s0 : v + taille / 2 > (2 * L) / 3 ? N - (L - v - taille) * s0 - ntaille : ((v + taille / 2) / L) * N - ntaille / 2);
  for (const e of d.elements) {
    if (e.w >= W * 0.97 && e.h >= H * 0.97 && Math.abs(e.x) < W * 0.03 && Math.abs(e.y) < H * 0.03) { e.x *= kx; e.y *= ky; e.w *= kx; e.h *= ky; if (e.type !== 'effet' && e.type !== 'vecteur') ech(e, Math.max(kx, ky)); continue; }
    const k = Math.min(s0, (nf.w * 0.96) / e.w, (nf.h * 0.96) / e.h), nw = e.w * k, nh = e.h * k;
    e.x = Math.min(Math.max(ancre(e.x, W, nf.w, e.w, nw), 0), Math.max(0, nf.w - nw)); e.y = Math.min(Math.max(ancre(e.y, H, nf.h, e.h, nh), 0), Math.max(0, nf.h - nh)); e.w = nw; e.h = nh; ech(e, k);
  }
  d.guides = { h: doc.guides.h.map((y) => (y / H) * nf.h), v: doc.guides.v.map((x) => (x / W) * nf.w) };
  return d;
}

// ---------- Modèles intégrés : les 8 familles du MVP, converties en compositions libres entièrement éditables ----------
const SYS_DIR = { une: ['editorial', 'papier'], pop: ['comics', 'jaune'], pulp: ['comics', 'jaune'], nuit: ['cinema', 'nuit'], noir: ['cinema', 'rouge'], cosmos: ['cosmique', 'nebuleuse'] };
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i += Math.max(1, Math.floor(s.length / 4000))) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36) + s.length.toString(36); };
export const idRessource = (href) => 'r' + hash(href);
// Convertit un document du MVP (version 1) ; ressources : objet rempli avec les images intégrées { id: { href, w, h, nom } }
export function convertirV1(v1, ressources = {}, { placeholder } = {}) {
  const d1 = normaliserV1(v1), sc = composerV1(d1, null, { final: true, imagesPH: (n) => placeholder?.(n) || { href: n, w: 1600, h: 900, placeholder: true } }), W = sc.w, H = sc.h, u = Math.min(W, H) / 1080;
  const [systeme, pal] = SYS_DIR[d1.direction] || ['comics', 'jaune'], dir = sc.dir;
  const doc = nouveauDocument({ format: 'perso', w: W, h: H, systeme, palette: pal, nom: d1.nom });
  const fid = Object.entries(FORMATS_STUDIO).find(([, f]) => f.w === W && f.h === H)?.[0]; if (fid) doc.format = fmt(fid);
  doc.couleurs = { fond: dir.fond, papier: dir.fond2, encre: dir.encre, texte: dir.texte, accent: dir.accent, accent2: dir.accent2 }; doc.duree = d1.duree; doc.origine = { modele: d1.famille, direction: d1.direction };
  const nSeq = Math.max(1, ...sc.couches.filter((c) => !['fond', 'effet', 'fixe'].includes(c.role)).map((c) => (FAMILLES_MOTION[d1.famille] ? c.seq ?? 0 : 0))) + 1;
  const E = (d1.duree * 0.6) / d1.vitesse, pas = E / nSeq, dur = clamp(pas * 1.7, 0.45, 1.5) / d1.vitesse;
  const animDe = (c, i = 0) => { if (d1.preset === 'statique') return {}; const role = c.role, seq = c.seq ?? 0, del = Math.round((((d1.preset === 'volets' ? 0.55 : 0) + seq * pas * 0.8) + i * 0.05) * 100) / 100;
    const T = { revelation: role === 'image' ? 'revelation' : role === 'titre' ? 'tampon' : 'fondu', apparition: 'fondu', volets: role === 'image' ? 'volet' : 'fondu', particules: 'zoom', deplacement: 'glisse', zoom: role === 'titre' ? 'zoom-arriere' : role === 'image' ? 'zoom' : 'fondu', parallaxe: 'fondu' }[d1.preset] || 'fondu';
    const en = { type: d1.lettres && role === 'titre' ? 'lettres' : T, duree: dur, delai: del, courbe: T === 'tampon' ? 'rebond' : 'douce', dir: seq % 2 ? 'droite' : 'gauche', force: 0.6 };
    return { entree: en, sortie: d1.sortie ? { type: 'fondu', duree: 0.5 } : undefined }; };
  const els = [], eff = sc.effets, f = sc.foyer, cx = r1(f[0] / W * 100) / 100, cy = r1(f[1] / H * 100) / 100;
  const effet = (type, params, op = 1, nom) => normaliserEl({ type: 'effet', nom: nom || EFFETS_LIB[type].nom, x: 0, y: 0, w: W, h: H, op, effet: { type, params: { ...EFFETS_LIB[type].def, cx, cy, ...params } }, anim: d1.preset === 'statique' ? {} : { entree: { type: 'fondu', duree: 0.6 } }, prof: 0.3 });
  const texteEl = (n, c, i) => { const lw = Math.max(...n.lignes.map((l) => mesureMetriques(l, n.police, n.taille, n.ls))), cap = capRatio(n.police) * n.taille, x = n.align === 'middle' ? n.x - lw / 2 : n.align === 'end' ? n.x - lw : n.x;
    const ct = n.stroke ? n.lw : 0;
    return normaliserEl({ type: 'texte', nom: c.nom, x: r1(x - n.taille * 0.02 - ct), y: r1(n.y - cap - ct), w: r1(lw + n.taille * 0.06 + 2 * ct), h: r1(cap + (n.lignes.length - 1) * n.pas + n.taille * 0.22 + 2 * ct), op: n.op ?? 1,
      texte: { contenu: n.lignes.join(' '), police: n.police, taille: n.taille, auto: false, casse: 'none', interligne: n.lignes.length > 1 ? n.pas / n.taille : 0.95, interlettre: n.ls || 0, align: n.align, fill: n.fill || '#000000', contour: { c: n.stroke || '@encre', w: ct }, lueur: { c: n.glow?.c || '@accent', b: n.glow?.b || 0 } }, anim: animDe(c, i) }); };
  const vecteur = (nodes, b, c, nom) => normaliserEl({ type: 'vecteur', nom: nom || c.nom, x: r1(b.x), y: r1(b.y), w: r1(Math.max(1, b.w)), h: r1(Math.max(1, b.h)), vecteur: { nodes, x0: r1(b.x), y0: r1(b.y), w0: r1(Math.max(1, b.w)), h0: r1(Math.max(1, b.h)) }, anim: c.role === 'fond' ? {} : animDe(c), verrou: c.role === 'fond', prof: c.role === 'fond' ? 0 : 0.2 });
  for (const c of sc.couches) {
    const g = sc.nodes.find((n) => n.id === c.id); if (!g) continue;
    const kids = g.kids, b = c.box || { x: 0, y: 0, w: W, h: H };
    if (c.role === 'effet' || c.id === 'grain') {
      const st = dir.style, enc = st === 'pop' || st === 'papier' ? dir.encre : C.w;
      if (c.id === 'trame') els.push(effet('trame', { mode: 'radial', couleur: st === 'pop' ? dir.accent : dir.encre, intensite: eff.trame }, st === 'pop' ? 0.85 : 0.22 + eff.trame * 0.25));
      if (c.id === 'vitesse') els.push(effet('vitesse', { couleur: enc, intensite: eff.vitesse, densite: eff.vitesse }, 0.25 + eff.vitesse * 0.55));
      if (c.id === 'lueur') els.push(effet('rayons', { couleur: st === 'pop' ? C.w : dir.accent, intensite: eff.lueur * 0.6, densite: 0.3 }), effet('lumiere', { couleur: st === 'pop' ? C.w : dir.accent, intensite: eff.lueur * 0.7, densite: 0.2 }));
      if (c.id === 'particules') els.push(effet('particules', { couleur: st === 'papier' || st === 'pop' ? dir.encre : dir.accent, intensite: eff.particules, densite: eff.particules * 0.7, mode: d1.preset === 'particules' ? 'explosion' : 'poussiere' }));
      if (c.id === 'cosmique') els.push(effet('etoiles', { intensite: 0.8, densite: eff.cosmique }), effet('crepitement', { couleur2: dir.accent2, intensite: eff.cosmique, densite: eff.cosmique * 0.6 }));
      if (c.id === 'grain') els.push(effet('grain', { intensite: eff.grain }));
      continue;
    }
    if (c.slot) {
      const im = d1.images[c.slot], z = c.zone, kid = kids.find((k) => k.k === 'g') || kids.find((k) => k.k === 'img'), clip = kid?.clip, imgNode = (kid?.k === 'g' ? kid.kids : [kid]).find((k) => k?.k === 'img');
      let src = null; if (im?.href) { src = idRessource(im.href); ressources[src] = { href: im.href, w: im.w, h: im.h, nom: im.nom, type: 'image' }; }
      const ink = kids.find((k) => k.k === 'poly' && k.fill === 'none'), ombre = kids.find((k) => k.k === 'poly' && k.op === 0.45);
      els.push(normaliserEl({ type: 'image', nom: c.nom, x: r1(z.x), y: r1(z.y), w: r1(z.w), h: r1(z.h), rot: c.rot || 0, op: c.op ?? 1, anim: animDe(c),
        image: { src, placeholder: FAMILLES_MOTION[d1.famille].images.find((s) => s.id === c.slot)?.placeholder || 'pop', ajustement: z.mode === 'contenir' ? 'contenir' : 'couvrir', zoom: im?.zoom ?? 1, dx: im?.dx ?? 0, dy: im?.dy ?? 0,
          masque: clip ? { forme: 'polygone', pts: clip.map((v, i) => r1(((i % 2 ? (v - z.y) / z.h : (v - z.x) / z.w)) * 10000) / 10000) } : { forme: z.mode === 'contenir' ? 'aucun' : 'rect' },
          contour: ink ? { c: ink.stroke, w: ink.lw } : imgNode?.contour ? { c: imgNode.contour.c, w: imgNode.contour.w } : { c: '@encre', w: 0 }, ombre: ombre ? { c: C.k0, dx: 18, dy: 18, op: 0.45 } : null } }));
      continue;
    }
    if (c.id === 'fond') { els.push(vecteur(kids, { x: 0, y: 0, w: W, h: H }, c, 'Fond du modèle')); continue; }
    // Calques composites : textes éditables + éléments vectoriels
    const textes = [], vect = [];
    for (const k of kids) { if (k.k === 'text') textes.push(k); else if (k.k === 'g' && k.kids?.length === 1 && k.kids[0].k === 'text' && !k.tr) textes.push(k.kids[0]); else vect.push(k); }
    if (c.id === 'marque') { const s = 64 * u; els.push(normaliserEl({ type: 'sceau', nom: 'Sceau P (non officiel)', x: r1(W - sc.w * 0 - Math.round(Math.min(W, H) * 0.055) - s), y: r1(H - Math.round(Math.min(W, H) * 0.055) - s), w: s, h: s, sceau: { fond: (C.k === dir.fond ? C.y : C.k), lettre: C.y }, anim: animDe(c) }));
      textes.forEach((n) => els.push(texteEl(n, { ...c, nom: 'Crédit' }, 0))); continue; }
    const parts = [...(vect.length ? [vecteur(vect, b, c, textes.length ? `${c.nom} · forme` : c.nom)] : []), ...textes.map((n, i) => texteEl(n, textes.length > 1 ? { ...c, nom: `${c.nom} ${i + 1}` } : c, i))];
    if (parts.length > 1) { const xs = parts.map((p) => p.x), ys = parts.map((p) => p.y), x0 = Math.min(...xs), y0 = Math.min(...ys), x1 = Math.max(...parts.map((p) => p.x + p.w)), y1 = Math.max(...parts.map((p) => p.y + p.h));
      parts.forEach((p) => { p.x = r1(p.x - x0); p.y = r1(p.y - y0); }); els.push(normaliserEl({ type: 'groupe', nom: c.nom, x: r1(x0), y: r1(y0), w: r1(x1 - x0), h: r1(y1 - y0), enfants: parts })); }
    else els.push(...parts);
  }
  doc.elements = els; doc.fond = { type: 'couleur', c1: dir.fond };
  return doc;
}
export const MODELES = Object.fromEntries(Object.entries(FAMILLES_MOTION).map(([id, f]) => [id, { nom: f.nom, description: f.description, directions: f.directions.map((d) => ({ id: d, nom: `${DIR_V1[d].genre} · ${DIR_V1[d].nom}` })) }]));
export function docDepuisModele(id, { direction, w = 1920, h = 1080, placeholder } = {}) {
  const v1 = nouveauV1(id, { direction }); v1.taille = { w, h }; const d = convertirV1(v1, {}, { placeholder });
  const fid = Object.entries(FORMATS_STUDIO).find(([, f]) => f.w === w && f.h === h)?.[0]; d.format = fid ? fmt(fid) : fmt('perso', w, h); d.nom = MODELES[id].nom; return d;
}
export const estV1 = (d) => !d?.v || d.v < 2;

// ---------- Plans : états visuels successifs d'une même création, enchaînés par des transitions ----------
// doc.elements et doc.duree sont toujours ceux du plan actif ; doc.plans garde les autres plans.
export const TRANSITIONS = { coupe: 'Coupe franche', fondu: 'Fondu enchaîné', volet: 'Volet diagonal', zoom: 'Zoom traversant', flash: 'Éclair blanc', glissement: 'Glissement', iris: 'Iris' };
function normaliserPlan(p, i) { return { id: p.id || nouvelId('p'), nom: String(p.nom || `Plan ${i + 1}`), duree: clamp(+p.duree || 4, 0.5, 60), transition: { type: TRANSITIONS[p.transition?.type] ? p.transition.type : i ? 'fondu' : 'coupe', duree: clamp(+p.transition?.duree || 0.6, 0.1, 3) }, elements: (p.elements || []).map(normaliserEl) }; }
export function plansDe(doc) {
  if (!doc.plans || doc.plans.length < 2) return [{ id: 'unique', nom: 'Plan 1', duree: doc.duree, transition: { type: 'coupe', duree: 0 }, elements: doc.elements }];
  return doc.plans.map((p, i) => (i === doc.planActif ? { ...p, elements: doc.elements, duree: doc.duree } : p));
}
export const dureeTotale = (doc) => plansDe(doc).reduce((s, p) => s + p.duree, 0);
export const debutPlan = (doc, i = doc.planActif || 0) => plansDe(doc).slice(0, i).reduce((s, p) => s + p.duree, 0);
export const planA = (doc, t) => { const ps = plansDe(doc); let d = 0; for (let i = 0; i < ps.length; i++) { if (t < d + ps[i].duree || i === ps.length - 1) return { i, debut: d }; d += ps[i].duree; } return { i: 0, debut: 0 }; };
// Écrit le plan actif dans doc.plans (avant enregistrement, changement de plan ou export)
export function synchroniserPlans(doc) { if (doc.plans?.length > 1) { const p = doc.plans[doc.planActif]; p.elements = doc.elements; p.duree = doc.duree; } return doc; }
export function changerPlan(doc, k) { if (!doc.plans || k === doc.planActif || !doc.plans[k]) return; synchroniserPlans(doc); doc.planActif = k; doc.elements = doc.plans[k].elements; doc.duree = doc.plans[k].duree; }
export function ajouterPlan(doc, { dupliquer = false } = {}) {
  if (!doc.plans || doc.plans.length < 2) doc.plans = [{ id: nouvelId('p'), nom: 'Plan 1', duree: doc.duree, transition: { type: 'coupe', duree: 0.6 }, elements: doc.elements }], doc.planActif = 0;
  synchroniserPlans(doc); const re = (e) => { e.id = nouvelId(); e.enfants?.forEach(re); return e; };
  const n = { id: nouvelId('p'), nom: `Plan ${doc.plans.length + 1}`, duree: dupliquer ? doc.duree : 4, transition: { type: 'fondu', duree: 0.6 }, elements: dupliquer ? JSON.parse(JSON.stringify(doc.elements)).map(re) : [] };
  doc.plans.splice(doc.planActif + 1, 0, n); changerPlan(doc, doc.planActif + 1); return n;
}
export function supprimerPlan(doc) {
  if (!doc.plans || doc.plans.length < 2) return; const k = doc.planActif; doc.plans.splice(k, 1); const j = Math.max(0, k - 1);
  doc.planActif = j; doc.elements = doc.plans[j].elements; doc.duree = doc.plans[j].duree; if (doc.plans.length < 2) { delete doc.plans; delete doc.planActif; }
}
// Rendu de toute la séquence à l'instant global t ; une transition occupe le début du plan qui arrive
export function rendreSequence(doc, t, opts = {}) {
  const ps = plansDe(doc); if (ps.length < 2 || opts.final || t === null) return rendreScene(doc, t, opts);
  const T = dureeTotale(doc), tg = clamp(t, 0, T), { i, debut } = planA(doc, tg), tl = tg - debut, p = ps[i], { w: W, h: H } = doc.format;
  const sc = rendreScene({ ...doc, elements: p.elements, duree: p.duree }, tl, opts), tr = p.transition;
  if (!i || tr.type === 'coupe' || tl >= tr.duree) return { ...sc, t: tg, duree: T, plan: i };
  const pr = ps[i - 1], av = rendreScene({ ...doc, elements: pr.elements, duree: pr.duree }, pr.duree, opts).nodes, q = ease.inOut(clamp(tl / tr.duree)), g = (kids, o = {}) => ({ k: 'g', kids, ...o });
  let nodes;
  switch (tr.type) {
    case 'fondu': nodes = [...av, g(sc.nodes, { op: q })]; break;
    case 'volet': { const o = H * 0.35, x = -o + (W + 2 * o) * q; nodes = [...av, g(sc.nodes, { clip: [-o - 2, -2, x + o, -2, x - o, H + 2, -o - 2, H + 2].map(r1) })]; break; }
    case 'iris': { const pts = []; for (let k = 0; k < 48; k++) { const a = (k / 48) * Math.PI * 2, R = Math.hypot(W, H) * 0.55 * q; pts.push(r1(W / 2 + Math.cos(a) * R), r1(H / 2 + Math.sin(a) * R)); } nodes = [...av, g(sc.nodes, { clip: pts })]; break; }
    case 'zoom': nodes = [g(av, { op: 1 - q, tr: { x: 0, y: 0, s: 1 + q * 0.35, r: 0, ox: W / 2, oy: H / 2 } }), g(sc.nodes, { op: q, tr: { x: 0, y: 0, s: 1.25 - 0.25 * q, r: 0, ox: W / 2, oy: H / 2 } })]; break;
    case 'flash': nodes = [...(q < 0.5 ? av : sc.nodes), { k: 'rect', x: 0, y: 0, w: W, h: H, fill: '#FFFFFF', op: r1((1 - Math.abs(q * 2 - 1)) * 100) / 100 }]; break;
    case 'glissement': nodes = [g(av, { tr: { x: r1(-q * W), y: 0, s: 1, r: 0, ox: 0, oy: 0 } }), g(sc.nodes, { tr: { x: r1((1 - q) * W), y: 0, s: 1, r: 0, ox: 0, oy: 0 } })]; break;
    default: nodes = sc.nodes;
  }
  return { ...sc, nodes, t: tg, duree: T, plan: i };
}
