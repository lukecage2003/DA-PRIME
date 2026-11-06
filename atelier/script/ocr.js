// Script Studio · moteur OCR local (Tesseract.js 7, WebAssembly, dans le navigateur).
// - Modèles FAST téléchargés UNIQUEMENT sur action de l'utilisateur, vérifiés (SHA-256), conservés dans la base locale.
// - Reconnaissance dans un Web Worker isolé (ocr-worker.js) qui refuse tout accès réseau externe.
// - Prétraitement sur des copies temporaires ; les pages importées ne sont jamais modifiées.
import Tesseract from '../vendor/tesseract/tesseract.esm.min.js';
import * as O from '../../templates/_systeme/ocr.js';
import { db } from '../motion/stockage.js';

export const VERSION_MOTEUR = 'tesseract.js 7.0.0';
export const VENDOR = new URL('../vendor/tesseract/', import.meta.url).href;
const CACHE = 'da-prime-ocr-tesseract-7.0.0';
export const FICHIERS_MOTEUR = ['tesseract.esm.min.js', 'worker.min.js', 'tesseract-core-simd-lstm.js', 'tesseract-core-simd-lstm.wasm', 'tesseract-core-lstm.js', 'tesseract-core-lstm.wasm'].map((f) => VENDOR + f)
  .concat([new URL('./ocr-worker.js', import.meta.url).href]);
// Détection SIMD WebAssembly (même test que wasm-feature-detect) : choisit le cœur adapté au navigateur
const SIMD = (() => { try { return WebAssembly.validate(new Uint8Array([0, 97, 115, 109, 1, 0, 0, 0, 1, 5, 1, 96, 0, 1, 123, 3, 2, 1, 0, 10, 10, 1, 8, 0, 65, 0, 253, 15, 253, 98, 11])); } catch { return false; } })();
const erreurs = new Map();
const hex = (buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');

// ---------- Modèles ----------
// États : absent (téléchargement initial nécessaire) · disponible · erreur (dernier essai) ; « prêt » = moteur testé avec succès
export async function etatModeles() {
  const out = {};
  for (const [code, m] of Object.entries(O.MODELES.langues)) {
    const r = await db.lire('modeles-ocr', `${code}-fast`).catch(() => null);
    out[code] = r ? { etat: 'disponible', nom: m.nom, taille: r.taille, date: r.date, source: r.source, sha256: r.sha256, pret: !!r.pret } : { etat: erreurs.has(code) ? 'erreur' : 'absent', erreur: erreurs.get(code) || null, nom: m.nom, taille: m.taille };
  }
  return out;
}
async function enregistrerModele(code, octets, source) {
  const m = O.MODELES.langues[code], sha = hex(await crypto.subtle.digest('SHA-256', octets));
  if (sha !== m.sha256) throw new Error(`empreinte inattendue pour le modèle ${m.nom} : fichier corrompu ou modèle non « fast » (refusé)`);
  await db.ecrire('modeles-ocr', { id: `${code}-fast`, code, variante: 'fast', version: O.MODELES.version, licence: O.MODELES.licence, taille: octets.byteLength, sha256: sha, source, date: Date.now(), donnees: new Blob([octets]) });
  erreurs.delete(code);
}
// Téléchargement explicite (bouton), avec progression, annulable ; jamais déclenché par une reconnaissance
export async function telechargerModele(code, { progres = () => {}, signal } = {}) {
  const m = O.MODELES.langues[code]; if (!m) throw new Error(`langue inconnue : ${code}`);
  try {
    const r = await fetch(O.urlModele(code), { signal, cache: 'no-store', credentials: 'omit', referrerPolicy: 'no-referrer' });
    if (!r.ok) throw new Error(`téléchargement refusé (réponse ${r.status})`);
    const lecteur = r.body.getReader(), morceaux = []; let recu = 0;
    for (;;) { const { done, value } = await lecteur.read(); if (done) break; morceaux.push(value); recu += value.length; progres(Math.min(1, recu / m.taille)); }
    const octets = new Uint8Array(recu); let i = 0; for (const x of morceaux) { octets.set(x, i); i += x.length; }
    await enregistrerModele(code, octets.buffer, O.urlModele(code));
    await mettreEnCacheMoteur();
  } catch (e) { if (e.name !== 'AbortError') erreurs.set(code, e.message || String(e)); throw e; }
}
// Import d'un fichier .traineddata déjà présent sur l'appareil (aucun réseau) : seuls les modèles fast attendus sont acceptés
export async function importerModele(fichier) {
  if (fichier.size > 20 * 1048576) throw new Error('fichier trop volumineux pour un modèle fast (refusé)');
  const octets = await fichier.arrayBuffer(), sha = hex(await crypto.subtle.digest('SHA-256', octets));
  const code = Object.keys(O.MODELES.langues).find((c) => O.MODELES.langues[c].sha256 === sha);
  if (!code) throw new Error('fichier non reconnu : seuls les modèles tessdata_fast 4.1.0 français et anglais sont acceptés');
  await enregistrerModele(code, octets, `fichier local : ${fichier.name}`); await mettreEnCacheMoteur(); return code;
}
export const supprimerModele = (code) => db.suppr('modeles-ocr', `${code}-fast`);
// Mise en cache des fichiers du moteur pour le hors-ligne (cache dédié, conservé entre les mises à jour de l'application)
export async function mettreEnCacheMoteur() { if (!('caches' in self)) return false; try { const c = await caches.open(CACHE); await c.addAll(FICHIERS_MOTEUR); return true; } catch { return false; } }
export async function moteurEnCache() { if (!('caches' in self)) return null; try { const c = await caches.open(CACHE); return (await c.keys()).length >= FICHIERS_MOTEUR.length; } catch { return null; } }

// ---------- Moteur ----------
export async function creerMoteur(combinaison, { surProgres } = {}) {
  const langues = O.languesDe(combinaison); if (!langues.length) throw new Error('aucune langue choisie');
  const etats = await etatModeles(), manquants = langues.filter((c) => etats[c].etat !== 'disponible');
  if (manquants.length) throw new Error(`modèle absent : ${manquants.map((c) => O.MODELES.langues[c].nom).join(', ')} — à télécharger ou importer dans Moteurs › OCR`);
  let rappel = surProgres;
  const w = await Tesseract.createWorker(langues.join('+'), Tesseract.OEM.LSTM_ONLY, {
    workerPath: new URL('./ocr-worker.js', import.meta.url).href, workerBlobURL: false, corePath: VENDOR + (SIMD ? 'tesseract-core-simd-lstm.js' : 'tesseract-core-lstm.js'),
    langPath: O.PREFIXE_MODELES, cacheMethod: 'none', gzip: false, logger: (m) => { if (m.status === 'recognizing text') rappel?.(m.progress); },
    errorHandler: () => {},
  });
  let fini = false, enCours = null;
  return {
    langues: langues.join('+'), simd: SIMD,
    surProgres: (f) => { rappel = f; },
    parametrer: (segmentation) => w.setParameters({ tessedit_pageseg_mode: O.SEGMENTATIONS[segmentation]?.psm || '3', preserve_interword_spaces: '1', user_defined_dpi: '300', debug_file: '/dev/null' }),
    // Reconnaissance annulable : une annulation arrête le worker (la promesse Tesseract ne se résoudrait jamais)
    async reconnaitre(image, signal) {
      if (signal?.aborted) throw Object.assign(new Error('annulé'), { name: 'AbortError' });
      // L'annulation répond tout de suite ; le worker n'est arrêté qu'une fois la reconnaissance en cours terminée
      // (l'arrêter pendant un travail provoquait une erreur interne de Tesseract.js : postMessage sur un worker détruit)
      const job = w.recognize(image, {}, { text: true, blocks: true }); enCours = job.catch(() => {});
      let ab; const annule = new Promise((_, ko) => { ab = () => { ko(Object.assign(new Error('annulé'), { name: 'AbortError' })); this.terminer(); }; signal?.addEventListener('abort', ab, { once: true }); });
      try { return (await Promise.race([job, annule])).data; } finally { signal?.removeEventListener('abort', ab); }
    },
    async terminer() { if (fini) return; fini = true; await enCours; try { await w.terminate(); } catch { /* déjà arrêté */ } },
  };
}

// ---------- Prétraitement (copie temporaire) ----------
const MAX_COTE = 5000;   // limite mémoire : une zone agrandie ne dépasse pas 5000 px de côté
export async function pretraiter(bitmap, rect, preset, extra = {}) {
  const P = { ...(O.PRETRAITEMENTS[preset] || O.PRETRAITEMENTS.original), ...extra }, e = Math.max(1, Math.min(P.echelle || 1, MAX_COTE / Math.max(rect.w, rect.h)));
  const w = Math.max(1, Math.round(rect.w * e)), h = Math.max(1, Math.round(rect.h * e));
  const cv = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h }), g = cv.getContext('2d', { willReadFrequently: true });
  g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); g.imageSmoothingQuality = 'high'; g.drawImage(bitmap, rect.x, rect.y, rect.w, rect.h, 0, 0, w, h);
  if (P.gris || P.contraste || P.binaire || P.inverser || P.adaptatif) { const d = g.getImageData(0, 0, w, h); O.traiterPixels(d.data, { ...P, largeur: w, hauteur: h }); g.putImageData(d, 0, 0); }
  const blob = cv.convertToBlob ? await cv.convertToBlob({ type: 'image/png' }) : await new Promise((r) => cv.toBlob(r, 'image/png'));
  cv.width = cv.height = 1;   // libère la mémoire du canevas
  return { blob, echelle: e, w, h };
}
// Régions à reconnaître : page entière, ou chaque case (ordre des cases = ordre de lecture établi par la découpe)
export function regions(page, W, H, zone) {
  if (zone === 'cases' && page.cases?.length) return page.cases.map((k, i) => ({ x: Math.round(k.x * W), y: Math.round(k.y * H), w: Math.max(8, Math.round(k.w * W)), h: Math.max(8, Math.round(k.h * H)), caseNo: i + 1 }));
  return [{ x: 0, y: 0, w: W, h: H, caseNo: null }];
}
// OCR d'une page : blocs ordonnés, coordonnées dans la page d'origine
// texteClair : seuil de confiance du second passage sur l'image inversée (cartouches en texte clair), ou null pour ne pas le faire
export async function ocrPage(moteur, page, { pretraitement = 'x2-contraste', zone = 'page', sens = 'gd', signal, progres = () => {}, texteClair = null } = {}) {
  const t0 = performance.now(), bm = await createImageBitmap(page.blob), W = bm.width, H = bm.height, rs = regions(page, W, H, zone); let blocs = [], ignores = 0;
  try {
    for (const [i, r] of rs.entries()) {
      moteur.surProgres((p) => progres((i + p) / rs.length));
      const pre = await pretraiter(bm, r, pretraitement), data = await moteur.reconnaitre(pre.blob, signal);
      const res = O.blocsDepuisTesseract(data, { echelle: pre.echelle, decalage: { x: r.x, y: r.y }, largeur: W, hauteur: H, caseNo: r.caseNo }); blocs.push(...res.blocs); ignores += res.ignores;
      if (texteClair !== null && texteClair !== undefined) {
        const inv = await pretraiter(bm, r, pretraitement, { gris: true, inverser: true, adaptatif: true }), d2 = await moteur.reconnaitre(inv.blob, signal);
        blocs.push(...O.blocsTexteClair(res.blocs, O.blocsDepuisTesseract(d2, { echelle: inv.echelle, decalage: { x: r.x, y: r.y }, largeur: W, hauteur: H, caseNo: r.caseNo }).blocs, { seuil: texteClair }));
      }
    }
  } finally { bm.close?.(); }
  const o = O.ordreLecture(O.regrouperLignes(blocs), { sens });
  return { blocs: o.blocs, ordreCertain: zone === 'cases' && page.cases?.length ? o.certain : false, ignores, largeur: W, hauteur: H, regions: rs.length, duree: Math.round(performance.now() - t0) };
}
