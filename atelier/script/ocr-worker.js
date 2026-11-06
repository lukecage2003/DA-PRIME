// DA-PRIME · enveloppe du worker Tesseract.js (script classique).
// 1. Les modèles de langue sont lus dans la base locale de l'appareil (magasin « modeles-ocr ») : jamais téléchargés ici.
// 2. Le cœur WebAssembly est chargé depuis les fichiers intégrés à DA-PRIME (atelier/vendor/tesseract/).
// 3. Toute requête vers une autre origine est refusée : aucune image ni aucun texte ne peut quitter l'appareil depuis ce worker.
'use strict';
const PREFIXE = 'https://modeles-ocr.invalid/fast/', VENDOR = new URL('../vendor/tesseract/', self.location.href).href, ORIGINE = self.location.origin;
const fetchLocal = self.fetch.bind(self), importLocal = self.importScripts.bind(self);
const lireModele = (code) => new Promise((ok, ko) => {
  const r = indexedDB.open('primestone-motion');
  r.onerror = () => ko(r.error);
  r.onsuccess = () => { const db = r.result; if (!db.objectStoreNames.contains('modeles-ocr')) { db.close(); return ok(null); }
    const q = db.transaction('modeles-ocr').objectStore('modeles-ocr').get(`${code}-fast`); q.onsuccess = () => { db.close(); ok(q.result || null); }; q.onerror = () => { db.close(); ko(q.error); }; };
});
self.fetch = async (entree, init) => {
  const url = new URL(typeof entree === 'string' ? entree : entree.url, self.location.href);
  if (url.href.startsWith(PREFIXE)) {
    const code = url.pathname.split('/').pop().replace(/\.traineddata(\.gz)?$/, ''), m = await lireModele(code);
    return m?.donnees ? new Response(m.donnees) : new Response('modèle absent', { status: 404 });
  }
  if (url.origin !== ORIGINE) throw new TypeError(`DA-PRIME : requête externe refusée par le moteur OCR (${url.origin})`);
  // Emscripten cherche le .wasm à côté du worker : redirigé vers les fichiers intégrés
  const wasm = url.pathname.match(/\/(tesseract-core-[\w-]+\.wasm)$/);
  return fetchLocal(wasm ? VENDOR + wasm[1] : url.href, init);
};
self.importScripts = (...urls) => { for (const u of urls) if (new URL(u, self.location.href).origin !== ORIGINE) throw new TypeError('DA-PRIME : script externe refusé par le moteur OCR'); return importLocal(...urls); };
self.importScripts(VENDOR + 'worker.min.js');
