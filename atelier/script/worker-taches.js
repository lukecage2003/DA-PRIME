// Script Studio · Web Worker des traitements lourds (hors du fil de l'interface). Lit et écrit directement dans IndexedDB.
// 0.11.0 : détection géométrique des cases d'un numéro entier, page par page, avec curseur de reprise et annulation.
import { detecterCases } from './comics.js';
const annules = new Set();
const base = () => new Promise((ok, ko) => { const r = indexedDB.open('primestone-motion'); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
const lire = (db, m, id) => new Promise((ok, ko) => { const r = db.transaction(m).objectStore(m).get(id); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
const ecrire = (db, m, o) => new Promise((ok, ko) => { const t = db.transaction(m, 'readwrite'); t.objectStore(m).put(o); t.oncomplete = () => ok(); t.onerror = () => ko(t.error); });
const TYPES = {
  async 'cases-numero'({ id, params, curseur }, post) {
    const db = await base(), c = await lire(db, 'comics', params.comic); if (!c) throw new Error('numéro introuvable');
    const ids = c.pages, stats = { bonne: 0, moyenne: 0, faible: 0, ignorees: 0 };
    for (let i = curseur; i < ids.length; i++) {
      if (annules.has(id)) { annules.delete(id); db.close(); return { annule: true }; }
      const p = await lire(db, 'pages', ids[i]); if (!p) continue;
      if (p.cases?.some((x) => x.manuel) && !params.ecraserManuel) { stats.ignorees++; post({ genre: 'progres', id, progres: (i + 1) / ids.length, curseur: i + 1, message: `Page ${i + 1} : cases tracées à la main conservées.` }); continue; }
      const bm = await createImageBitmap(p.blob), r = detecterCases(bm, { sens: c.sens || 'gd' }); bm.close?.();
      p.cases = r.cases; p.detection = { fiabilite: r.fiabilite, note: r.note, methode: 'geometrie', date: Date.now() }; await ecrire(db, 'pages', p); stats[r.fiabilite]++;
      post({ genre: 'progres', id, progres: (i + 1) / ids.length, curseur: i + 1, message: `Page ${i + 1}/${ids.length} : ${r.cases.length} case(s), fiabilité ${r.fiabilite}.` });
    }
    db.close(); return stats;
  },
};
self.onmessage = async (e) => {
  const d = e.data; if (d.genre === 'annuler') { annules.add(d.id); return; }
  if (d.genre !== 'lancer') return;
  try { const f = TYPES[d.type]; if (!f) throw new Error(`traitement inconnu dans le worker : ${d.type}`); const resultat = await f(d, (m) => self.postMessage(m));
    self.postMessage(resultat?.annule ? { genre: 'erreur', id: d.id, message: 'annulé' } : { genre: 'fin', id: d.id, resultat }); }
  catch (err) { self.postMessage({ genre: 'erreur', id: d.id, message: err.message || String(err) }); }
};
