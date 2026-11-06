// DA-PRIME · bibliothèque visuelle locale : import, analyse et organisation des images (personnages, couvertures, décors…).
// Les pixels restent dans le magasin « ressources » (une seule copie par image, identifiant = empreinte du contenu) ;
// le magasin « visuels » garde une fiche légère (vignette, dimensions, transparence, catégorie, tags, collections, favori)
// pour parcourir des milliers d'images sans charger les originaux. Rien ne quitte l'appareil.
import { db } from './stockage.js';
import { idRessource } from '../../templates/_systeme/studio.js';

export const CATEGORIES = { personnage: 'Personnage', illustration: 'Illustration', couverture: 'Couverture de comic', logo: 'Logo', fond: 'Arrière-plan', texture: 'Texture', effet: 'Effet graphique', transparente: 'Ressource transparente', promo: 'Image promotionnelle' };
export const ROLES = { portrait: 'Portrait', silhouette: 'Silhouette complète', action: 'Illustration en action', 'gros-plan': 'Gros plan', alternative: 'Version alternative', transparente: 'Illustration transparente', reference: 'Image de référence' };
export const MAX_COTE = 4096, COTE_VIGNETTE = 360;

const charger = (src) => new Promise((ok, ko) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => ko(new Error('image illisible')); im.src = src; });
const lireFichier = (f) => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(f); });
// Transparence réelle (pixels alpha) et boîte englobante du sujet, mesurées sur une copie réduite
export function analyserAlpha(im) {
  const k = Math.min(1, 256 / Math.max(im.naturalWidth, im.naturalHeight)), w = Math.max(1, Math.round(im.naturalWidth * k)), h = Math.max(1, Math.round(im.naturalHeight * k));
  const c = Object.assign(document.createElement('canvas'), { width: w, height: h }), g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(im, 0, 0, w, h);
  const d = g.getImageData(0, 0, w, h).data; let tr = 0, x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const a = d[(y * w + x) * 4 + 3]; if (a < 250) tr++; if (a > 24) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } }
  const alpha = tr / (w * h) > 0.02;
  return { alpha, boite: alpha && x1 >= 0 ? { x: +(x0 / w).toFixed(3), y: +(y0 / h).toFixed(3), w: +((x1 - x0 + 1) / w).toFixed(3), h: +((y1 - y0 + 1) / h).toFixed(3) } : null };
}
function vignetteDe(im, alpha) {
  const k = Math.min(1, COTE_VIGNETTE / Math.max(im.naturalWidth, im.naturalHeight)), c = Object.assign(document.createElement('canvas'), { width: Math.max(1, Math.round(im.naturalWidth * k)), height: Math.max(1, Math.round(im.naturalHeight * k)) });
  c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); return alpha ? c.toDataURL('image/webp', 0.8) : c.toDataURL('image/jpeg', 0.78);
}
const orientation = (w, h) => (w / h > 1.15 ? 'paysage' : h / w > 1.15 ? 'portrait' : 'carré');
// Catégorie suggérée (modifiable) : uniquement d'après des faits mesurés, jamais d'après une supposition d'identité
const suggerer = (a, w, h) => (a.alpha ? (a.boite && a.boite.h > 0.6 ? 'personnage' : 'transparente') : h / w > 1.45 && h / w < 1.62 ? 'couverture' : w / h > 1.5 ? 'fond' : 'illustration');
export function ficheDe(r, im, a, meta = {}) {
  return { id: r.id, nom: meta.nom || r.nom, w: r.w, h: r.h, taille: r.taille || Math.round(r.href.length * 0.75), alpha: a.alpha, boite: a.boite, orientation: orientation(r.w, r.h), reduite: !!r.reduite,
    vignette: vignetteDe(im, a.alpha), categorie: meta.categorie || suggerer(a, r.w, r.h), tags: meta.tags || [], collections: meta.collections || [], favori: false, ajoute: Date.now(), source: meta.source || 'import' };
}
// Import d'un fichier : copie de travail ≤ 4096 px (original intact sinon), transparence conservée, doublons détectés par empreinte
export async function importerVisuel(f, meta = {}) {
  const href = await lireFichier(f), im = await charger(href); let w = im.naturalWidth, h = im.naturalHeight, src = href, cible = im;
  const a = analyserAlpha(im);
  if (Math.max(w, h) > MAX_COTE) { const k = MAX_COTE / Math.max(w, h); w = Math.round(w * k); h = Math.round(h * k); const c = Object.assign(document.createElement('canvas'), { width: w, height: h }); c.getContext('2d').drawImage(im, 0, 0, w, h); src = c.toDataURL(a.alpha || /png|webp|gif|avif/.test(f.type) ? 'image/png' : 'image/jpeg', 0.92); cible = await charger(src); }
  const id = idRessource(src), existe = await db.lire('ressources', id), r = existe || { id, type: 'image', href: src, w, h, nom: f.name, taille: f.size, reduite: src !== href };
  if (!existe) await db.ecrire('ressources', r);
  let v = await db.lire('visuels', id);
  if (!v) { v = ficheDe(r, cible, a, { nom: f.name.replace(/\.[a-z0-9]+$/i, ''), ...meta }); await db.ecrire('visuels', v); }
  else if (meta.tags?.length || meta.collections?.length) { v.tags = [...new Set([...v.tags, ...(meta.tags || [])])]; v.collections = [...new Set([...v.collections, ...(meta.collections || [])])]; await db.ecrire('visuels', v); }
  return { ressource: r, visuel: v, doublon: !!existe };
}
// Fiches manquantes pour les images importées avant la bibliothèque (Motion Studio 0.6 à 0.9) : créées une seule fois
export async function synchroniser() {
  const [rc, vc] = await Promise.all([db.cles('ressources'), db.cles('visuels')]), connus = new Set(vc); let n = 0;
  for (const id of rc) { if (connus.has(id)) continue; const r = await db.lire('ressources', id); if (r?.type !== 'image') continue;
    try { const im = await charger(r.href); await db.ecrire('visuels', ficheDe(r, im, analyserAlpha(im), { source: 'motion' })); n++; } catch { /* image illisible : ignorée */ } }
  return n;
}
// Suppression : la fiche, l'original et les références d'une fiche de personnage (les créations gardent leur copie de projet)
export async function supprimerVisuel(id) {
  await db.suppr('visuels', id); await db.suppr('ressources', id);
  for (const p of await db.tous('personnages')) { const avant = JSON.stringify(p.images); for (const k of Object.keys(p.images || {})) if (p.images[k] === id) delete p.images[k]; if (JSON.stringify(p.images) !== avant) await db.ecrire('personnages', p); }
}
export async function utilisations(id) { return (await db.tous('creations')).filter((c) => JSON.stringify(c.plans || c.elements).includes(`"src":"${id}"`)).map((c) => c.nom); }
// Image la plus adaptée d'une fiche de personnage selon la mise en scène
const PREFERENCES = { duel: ['transparente', 'silhouette', 'action', 'portrait'], equipes: ['transparente', 'silhouette', 'portrait'], heros: ['transparente', 'silhouette', 'portrait', 'action'], 'heros-repere': ['transparente', 'portrait', 'silhouette'],
  monumental: ['silhouette', 'transparente', 'action'], une: ['portrait', 'gros-plan', 'action', 'alternative'], annonce: ['action', 'transparente', 'silhouette'], evenement: ['action', 'silhouette', 'transparente'], liste: ['portrait', 'gros-plan', 'transparente'], question: ['portrait', 'transparente'], citation: ['portrait', 'gros-plan', 'transparente'] };
export function choisirImage(fiche, mise = 'heros') {
  const im = fiche?.images || {}; for (const r of [...(PREFERENCES[mise] || PREFERENCES.heros), ...Object.keys(ROLES)]) if (im[r] && r !== 'reference') return { id: im[r], role: r };
  return null;
}
// Caractéristiques transmises au compositeur (dimensions, transparence, rôle, catégorie)
export const infoImage = (v, role) => (v ? { w: v.w, h: v.h, alpha: v.alpha, boite: v.boite, role: role || null, categorie: v.categorie, orientation: v.orientation } : null);
export async function etatStockage() {
  const est = await navigator.storage?.estimate?.().catch(() => null), persistant = await navigator.storage?.persisted?.().catch(() => false);
  return { utilise: est?.usage || 0, quota: est?.quota || 0, persistant: !!persistant };
}
