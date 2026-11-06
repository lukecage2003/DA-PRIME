// Motion Studio · stockage durable sur l'appareil (IndexedDB) et fichiers de projet / de bibliothèque.
// Magasins : créations, ressources (images, polices), versions, modèles, composants, préréglages d'animation,
// campagnes, profils DA, visuels (fiches légères des images : vignette, catégorie, tags…), fiches de personnages,
// Script Studio : projets de scripts, profils rédactionnels, prompts personnels, comics (numéros, arcs, analyses) et pages (images).
import { parcourir, convertirV1, estV1, normaliserDoc, nouvelId, plansDe, synchroniserPlans } from '../../templates/_systeme/studio.js';

const BASE = 'primestone-motion', VERSION = 5, MAGASINS = ['creations', 'ressources', 'versions', 'modeles', 'composants', 'presets', 'campagnes', 'profils', 'visuels', 'personnages', 'scripts', 'redaction', 'prompts', 'comics', 'pages'];
let base = null;
const ouvrir = () => base || (base = new Promise((ok, ko) => {
  const r = indexedDB.open(BASE, VERSION);
  r.onupgradeneeded = () => { for (const m of MAGASINS) if (!r.result.objectStoreNames.contains(m)) r.result.createObjectStore(m, { keyPath: 'id' }); };
  r.onsuccess = () => ok(r.result); r.onerror = () => { base = null; ko(r.error); };
}));
const tx = async (mag, mode, fn) => { const db = await ouvrir(); return new Promise((ok, ko) => { const t = db.transaction(mag, mode), r = fn(t.objectStore(mag)); t.oncomplete = () => ok(r?.result); t.onerror = () => ko(t.error); t.onabort = () => ko(t.error); }); };
export const db = {
  tous: (m) => tx(m, 'readonly', (s) => s.getAll()).then((x) => x || []),
  cles: (m) => tx(m, 'readonly', (s) => s.getAllKeys()).then((x) => x || []),
  lire: (m, id) => tx(m, 'readonly', (s) => s.get(id)),
  ecrire: (m, o) => tx(m, 'readwrite', (s) => s.put(o)),
  suppr: (m, id) => tx(m, 'readwrite', (s) => s.delete(id)),
};
export async function persister() { try { if (await navigator.storage?.persisted?.()) return true; return !!(await navigator.storage?.persist?.()); } catch { return false; } }

// Ressources utilisées par une liste d'éléments
export function ressourcesUtilisees(elements) { const ids = new Set(); parcourir(elements, (e) => { if (e.image?.src) ids.add(e.image.src); if (e.texte?.police?.startsWith('f:')) ids.add(e.texte.police.slice(2)); }); return [...ids]; }

// Document du MVP (version 1) : conversion en composition libre ; ses images deviennent des ressources
export function migrer(d, placeholder) {
  if (!estV1(d)) return { doc: normaliserDoc(d), ressources: {} };
  const ressources = {}, doc = convertirV1(d, ressources, { placeholder }); doc.id = d.id || doc.id; doc.cree = d.cree || doc.cree; doc.nom = d.nom || doc.nom;
  return { doc, ressources };
}

// ---------- Fichiers ----------
export function paquetProjet(doc, ressources) {
  synchroniserPlans(doc); const r = Object.fromEntries([...ressourcesUtilisees(plansDe(doc).flatMap((p) => p.elements)), ...(doc.audio?.pistes || []).map((p) => p.ressource).filter(Boolean)].map((id) => [id, ressources.get(id)]).filter(([, v]) => v));
  return { format: 'primestone-motion', version: 2, exporte: new Date().toISOString(), creation: doc, ressources: r };
}
// Lit un fichier de projet (version 1 ou 2) ou une bibliothèque complète
export function lirePaquet(j, placeholder) {
  if (j?.format === 'primestone-motion-bibliotheque') return { bibliotheque: j };
  const c = j?.creation || j; if (!c || (!c.elements && !c.famille)) throw new Error('fichier non reconnu');
  const { doc, ressources } = migrer(c, placeholder); return { doc, ressources: { ...(j.ressources || {}), ...ressources } };
}
export async function paquetBibliotheque() {
  const M = ['creations', 'ressources', 'modeles', 'composants', 'presets', 'campagnes', 'profils', 'visuels', 'personnages', 'scripts', 'redaction', 'prompts'], v = await Promise.all(M.map((m) => db.tous(m)));
  return { format: 'primestone-motion-bibliotheque', version: 3, exporte: new Date().toISOString(), ...Object.fromEntries(M.map((m, i) => [m, v[i]])) };
}
// Importe une bibliothèque : les éléments existants (même identifiant) sont conservés, rien n'est écrasé
export async function importerBibliotheque(b) {
  let n = 0;
  for (const m of ['ressources', 'creations', 'modeles', 'composants', 'presets', 'campagnes', 'profils', 'visuels', 'personnages', 'scripts', 'redaction', 'prompts']) for (const o of b[m] || []) { if (!o?.id) continue; if (await db.lire(m, o.id)) continue; await db.ecrire(m, o); n++; }
  return n;
}
// Versions : instantanés datés d'une création (30 au plus par création, les plus anciennes automatiques sont supprimées)
export async function enregistrerVersion(doc, nom = 'Version', auto = false) {
  await db.ecrire('versions', { id: nouvelId('v'), creation: doc.id, date: Date.now(), nom, auto, doc: JSON.parse(JSON.stringify(doc)) });
  const vs = (await db.tous('versions')).filter((v) => v.creation === doc.id).sort((a, b) => a.date - b.date);
  for (const v of vs.slice(0, Math.max(0, vs.length - 30)).filter((x) => x.auto)) await db.suppr('versions', v.id);
}
export const versionsDe = async (id) => (await db.tous('versions')).filter((v) => v.creation === id).sort((a, b) => b.date - a.date);
