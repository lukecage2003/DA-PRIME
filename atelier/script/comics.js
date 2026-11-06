// Script Studio · bibliothèque de comics : import (CBZ, ZIP, PDF, images), pages, empreintes, détection géométrique des cases.
// Tout reste sur l'appareil : les fichiers d'origine ne sont jamais modifiés (seules des copies des pages sont stockées).
// CBR (RAR) : non pris en charge sans bibliothèque supplémentaire — l'utilisateur est invité à convertir en CBZ.

export const FORMATS_ACCEPTES = '.cbz,.zip,.pdf,.cbr,.rar,image/jpeg,image/png,image/webp,image/avif,image/gif';
const IMG = /\.(jpe?g|png|webp|avif|gif|bmp)$/i, MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif', gif: 'image/gif', bmp: 'image/bmp' };
const naturel = new Intl.Collator('fr', { numeric: true, sensitivity: 'base' });
export async function empreinte(buf) { const h = await crypto.subtle.digest('SHA-256', buf); return [...new Uint8Array(h)].map((b) => b.toString(16).padStart(2, '0')).join(''); }

// Lecteur ZIP minimal (répertoire central, méthodes « stockée » et « deflate ») ; décompression native du navigateur
export async function lireZip(buf) {
  const v = new DataView(buf), u8 = new Uint8Array(buf); let e = -1;
  for (let i = buf.byteLength - 22; i >= Math.max(0, buf.byteLength - 66000); i--) if (v.getUint32(i, true) === 0x06054b50) { e = i; break; }
  if (e < 0) throw new Error('archive ZIP illisible');
  const n = v.getUint16(e + 10, true), dec = new TextDecoder(); let p = v.getUint32(e + 16, true); const out = [];
  for (let k = 0; k < n; k++) {
    if (v.getUint32(p, true) !== 0x02014b50) throw new Error('répertoire ZIP corrompu');
    const meth = v.getUint16(p + 10, true), taille = v.getUint32(p + 20, true), ln = v.getUint16(p + 28, true), le = v.getUint16(p + 30, true), lc = v.getUint16(p + 32, true), loc = v.getUint32(p + 42, true);
    const nom = dec.decode(u8.subarray(p + 46, p + 46 + ln)); p += 46 + ln + le + lc;
    if (nom.endsWith('/') || /(^|\/)(__MACOSX|\.)/.test(nom)) continue;
    const debut = loc + 30 + v.getUint16(loc + 26, true) + v.getUint16(loc + 28, true), brut = u8.subarray(debut, debut + taille);   // taille compressée (répertoire central, fiable même avec descripteur de données)
    out.push({ nom, meth, brut, lire: async () => (meth === 0 ? brut.slice() : meth === 8 ? new Uint8Array(await new Response(new Blob([brut]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()) : Promise.reject(new Error(`compression ${meth} non prise en charge`))) });
  }
  return out;
}
async function dims(blob) { const b = await createImageBitmap(blob); const r = { w: b.width, h: b.height, bitmap: b }; return r; }
export async function vignetteDe(bitmap, max = 260) { const k = Math.min(1, max / Math.max(bitmap.width, bitmap.height)), c = Object.assign(document.createElement('canvas'), { width: Math.round(bitmap.width * k), height: Math.round(bitmap.height * k) }); c.getContext('2d').drawImage(bitmap, 0, 0, c.width, c.height); return c.toDataURL('image/jpeg', 0.72); }

// PDF : rendu des pages par pdf.js (Apache-2.0), chargé uniquement à ce moment
async function pagesPDF(buf, progres) {
  const pdfjs = await import('../vendor/pdfjs/pdf.min.mjs'); pdfjs.GlobalWorkerOptions.workerSrc = new URL('../vendor/pdfjs/pdf.worker.min.mjs', import.meta.url).href;
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf), isEvalSupported: false }).promise, out = [];
  for (let i = 1; i <= doc.numPages; i++) { const pg = await doc.getPage(i), v0 = pg.getViewport({ scale: 1 }), k = Math.min(3, 2400 / Math.max(v0.width, v0.height)), vp = pg.getViewport({ scale: k });
    const c = Object.assign(document.createElement('canvas'), { width: Math.round(vp.width), height: Math.round(vp.height) }); await pg.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise;
    out.push({ nom: `page-${String(i).padStart(3, '0')}.jpg`, blob: await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.92)) }); progres?.(i / doc.numPages); }
  await (doc.destroy?.() ?? doc.cleanup?.()); return out;
}
// Import d'un fichier (archive, PDF) ou d'un lot d'images → un numéro { nom, hash, pages: [{ nom, blob, w, h, vignette, double }] }
export async function importerFichiers(fichiers, { progres } = {}) {
  const lots = [], images = fichiers.filter((f) => IMG.test(f.name) || f.type.startsWith('image/'));
  for (const f of fichiers.filter((x) => !images.includes(x))) {
    if (/\.(cbr|rar)$/i.test(f.name)) throw new Error(`« ${f.name} » : format CBR (RAR) non pris en charge localement. Convertir en CBZ (archive ZIP) avec un outil d'archivage, puis réimporter.`);
    const buf = await f.arrayBuffer(), hash = await empreinte(buf); let brutes;
    if (/\.pdf$/i.test(f.name) || f.type === 'application/pdf') brutes = await pagesPDF(buf, progres);
    else if (/\.(cbz|zip)$/i.test(f.name)) { const es = (await lireZip(buf)).filter((x) => IMG.test(x.nom)).sort((a, b) => naturel.compare(a.nom, b.nom)); brutes = []; for (const x of es) brutes.push({ nom: x.nom.split('/').pop(), blob: new Blob([await x.lire()], { type: MIME[x.nom.split('.').pop().toLowerCase()] || 'image/jpeg' }) }); }
    else throw new Error(`« ${f.name} » : format non reconnu.`);
    if (!brutes.length) throw new Error(`« ${f.name} » : aucune image de page trouvée.`);
    lots.push({ nom: f.name.replace(/\.[^.]+$/, ''), hash, source: f.name, pages: brutes });
  }
  if (images.length) { const tri = [...images].sort((a, b) => naturel.compare(a.name, b.name)), h = await empreinte(new TextEncoder().encode(tri.map((f) => `${f.name}:${f.size}`).join('|')).buffer); lots.push({ nom: tri[0].name.replace(/[-_ ]*\d*\.[^.]+$/, '') || 'Pages', hash: h, source: `${tri.length} image(s)`, pages: tri.map((f) => ({ nom: f.name, blob: f })) }); }
  for (const l of lots) { const ratios = [];
    for (const [i, pg] of l.pages.entries()) { const d = await dims(pg.blob); Object.assign(pg, { w: d.w, h: d.h, vignette: await vignetteDe(d.bitmap), hash: await empreinte(await pg.blob.arrayBuffer()) }); d.bitmap.close?.(); ratios.push(d.w / d.h); progres?.((i + 1) / l.pages.length); }
    const med = [...ratios].sort((a, b) => a - b)[Math.floor(ratios.length / 2)] || 0.66;
    l.pages.forEach((pg, i) => { pg.double = ratios[i] > med * 1.6 && ratios[i] > 1.05; });   // double page : nettement plus large que la page type
    const vus = new Map(); l.pages.forEach((pg) => { pg.doublon = vus.has(pg.hash) ? vus.get(pg.hash) : null; vus.set(pg.hash, pg.nom); });
  }
  return lots;
}

// Détection GÉOMÉTRIQUE des cases (découpe XY récursive sur les gouttières) — déterministe, sans IA.
// Fiable sur des grilles à gouttières nettes ; les cases inclinées, débordantes ou sans gouttière sont signalées pour découpe manuelle.
export function detecterCases(bitmap, { sens = 'gd' } = {}) {
  const k = Math.min(1, 700 / Math.max(bitmap.width, bitmap.height)), W = Math.max(1, Math.round(bitmap.width * k)), H = Math.max(1, Math.round(bitmap.height * k));
  const c = typeof document !== 'undefined' ? Object.assign(document.createElement('canvas'), { width: W, height: H }) : new OffscreenCanvas(W, H), g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(bitmap, 0, 0, W, H);   // OffscreenCanvas dans un Web Worker
  const d = g.getImageData(0, 0, W, H).data, L = new Float32Array(W * H); for (let i = 0; i < W * H; i++) L[i] = (d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11) / 255;
  // Couleur de gouttière : la luminosité dominante du bord de page
  const bord = []; for (let x = 0; x < W; x++) bord.push(L[x], L[(H - 1) * W + x]); for (let y = 0; y < H; y++) bord.push(L[y * W], L[y * W + W - 1]); bord.sort((a, b) => a - b); const fond = bord[Math.floor(bord.length / 2)];
  const estFond = (i) => Math.abs(L[i] - fond) < 0.09, gapMin = Math.max(3, Math.round(Math.min(W, H) * 0.008));
  const ligneVide = (y, x0, x1) => { let n = 0; for (let x = x0; x < x1; x++) if (!estFond(y * W + x)) n++; return n <= (x1 - x0) * 0.02; };
  const colVide = (x, y0, y1) => { let n = 0; for (let y = y0; y < y1; y++) if (!estFond(y * W + x)) n++; return n <= (y1 - y0) * 0.02; };
  const bandes = (a, b, vide) => { const out = []; let deb = null, trou = 0; for (let i = a; i < b; i++) { if (vide(i)) { trou++; if (deb !== null && trou >= gapMin) { out.push([deb, i - trou + 1]); deb = null; } } else { if (deb === null) deb = i; trou = 0; } } if (deb !== null) out.push([deb, b]); return out.filter(([x, y]) => y - x > gapMin * 3); };
  const cases = [];
  const couper = (x0, y0, x1, y1, prof, horiz) => {
    const bs = horiz ? bandes(y0, y1, (y) => ligneVide(y, x0, x1)) : bandes(x0, x1, (x) => colVide(x, y0, y1));
    if (bs.length > 1 && prof < 6) { const ord = !horiz && sens === 'dg' ? [...bs].reverse() : bs; for (const [a, b] of ord) horiz ? couper(x0, a, x1, b, prof + 1, false) : couper(a, y0, b, y1, prof + 1, true); return; }
    if (prof === 0 || bs.length <= 1) { const autre = horiz ? bandes(x0, x1, (x) => colVide(x, y0, y1)) : bandes(y0, y1, (y) => ligneVide(y, x0, x1)); if (autre.length > 1 && prof < 6) { const ord = horiz && sens === 'dg' ? [...autre].reverse() : autre; for (const [a, b] of ord) horiz ? couper(a, y0, b, y1, prof + 1, true) : couper(x0, a, x1, b, prof + 1, false); return; } }
    // Rogne la case à son contenu
    let a = x0, b = x1, cc = y0, dd = y1; while (a < b && colVide(a, cc, dd)) a++; while (b > a && colVide(b - 1, cc, dd)) b--; while (cc < dd && ligneVide(cc, a, b)) cc++; while (dd > cc && ligneVide(dd - 1, a, b)) dd--;
    if ((b - a) * (dd - cc) > W * H * 0.01) cases.push({ x: +(a / W).toFixed(4), y: +(cc / H).toFixed(4), w: +((b - a) / W).toFixed(4), h: +((dd - cc) / H).toFixed(4) });
  };
  couper(0, 0, W, H, 0, true);
  const couverture = cases.reduce((t, x) => t + x.w * x.h, 0);
  return { cases: cases.map((x, i) => ({ ...x, n: i + 1 })), fiabilite: cases.length <= 1 ? 'faible' : couverture < 0.45 ? 'moyenne' : 'bonne', note: cases.length <= 1 ? 'Aucune gouttière nette : page pleine, cases inclinées ou débordantes. Découper à la main si besoin.' : 'Découpe géométrique : vérifier l\'ordre et les cases fusionnées.' };
}

// OCR : aucun moteur n'est embarqué. Point d'extension : un moteur local (ex. Tesseract.js, Apache-2.0) déposé dans atelier/vendor/
// peut être branché ici ; tant qu'il est absent, la transcription est manuelle et l'interface le dit.
export const MOTEURS = {
  ocr: { disponible: false, nom: 'OCR local', note: 'Non installé : transcription manuelle des bulles et cartouches. Voir docs/SCRIPT_STUDIO.md pour ajouter un moteur local.' },
  vision: { disponible: false, nom: 'Compréhension des images', note: 'Aucun modèle multimodal local installé : les actions visibles sont décrites par vous (provenance « visuel »).' },
};
