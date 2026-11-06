// Script Studio · file de traitements en arrière-plan : progression, annulation, erreurs, reprise contrôlée.
// Les tâches sont enregistrées (magasin « taches ») : une page fermée pendant un traitement laisse une tâche « interrompue »
// que l'utilisateur peut reprendre là où elle s'était arrêtée (curseur), réessayer ou supprimer. Une tâche à la fois.
import { db } from '../motion/stockage.js';
export const ETATS = { attente: 'En attente', 'en-cours': 'En cours', termine: 'Terminé', erreur: 'Erreur', annule: 'Annulé', interrompu: 'Interrompu' };
const nid = () => `tc${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;

export function creerFile() {
  const types = {}, abonnes = new Set(); let courante = null, controleur = null, demarre = false, worker = null;
  const notifier = (t) => abonnes.forEach((f) => f(t));
  const sauver = async (t) => { t.modifie = Date.now(); await db.ecrire('taches', t); notifier(t); };
  // Exécution dans un Web Worker (traitements d'images) : messages de progression, annulation par drapeau puis par arrêt
  function viaWorker(t, { signal, progres }) {
    worker ||= new Worker(new URL('./worker-taches.js', import.meta.url), { type: 'module' });
    return new Promise((ok, ko) => {
      const fin = () => { worker.removeEventListener('message', m); signal.removeEventListener('abort', ab); };
      const m = (e) => { const d = e.data; if (d.id !== t.id) return; if (d.genre === 'progres') progres(d.progres, d.message, d.curseur); else if (d.genre === 'fin') { fin(); ok(d.resultat); } else if (d.genre === 'erreur') { fin(); ko(new Error(d.message)); } };
      const ab = () => { worker.postMessage({ genre: 'annuler', id: t.id }); setTimeout(() => { if (courante?.id === t.id) { worker.terminate(); worker = null; fin(); ko(Object.assign(new Error('annulé'), { name: 'AbortError' })); } }, 3000); };
      worker.addEventListener('message', m); signal.addEventListener('abort', ab, { once: true }); worker.postMessage({ genre: 'lancer', id: t.id, type: t.type, params: t.params, curseur: t.curseur || 0 });
    });
  }
  async function suivante() {
    if (courante) return; const toutes = (await db.tous('taches').catch(() => [])).filter((x) => x.etat === 'attente').sort((a, b) => a.cree - b.cree), t = toutes[0]; if (!t) return;
    const def = types[t.type]; if (!def) { t.etat = 'erreur'; t.erreur = `type de traitement inconnu : ${t.type}`; await sauver(t); return suivante(); }
    courante = t; controleur = new AbortController(); t.etat = 'en-cours'; t.debut ||= Date.now(); t.erreur = null; t.essais = (t.essais || 0) + 1; await sauver(t);
    let dernier = 0; const progres = (p, message, curseur) => { t.progres = Math.max(0, Math.min(1, p)); if (message) t.message = message; if (curseur !== undefined) t.curseur = curseur; notifier(t); if (Date.now() - dernier > 400) { dernier = Date.now(); db.ecrire('taches', { ...t }); } };
    try { t.resultat = def.worker ? await viaWorker(t, { signal: controleur.signal, progres }) : await def.executer(t, { signal: controleur.signal, progres }); t.etat = 'termine'; t.progres = 1; t.fin = Date.now(); if (def.apres) await def.apres(t); }
    catch (e) { if (e.name === 'AbortError' || controleur.signal.aborted) { t.etat = 'annule'; t.message = 'Annulé par l\'utilisateur.'; } else { t.etat = 'erreur'; t.erreur = e.message || String(e); } t.fin = Date.now(); }
    courante = null; controleur = null; await sauver(t); suivante();
  }
  return {
    types, abonner: (f) => { abonnes.add(f); return () => abonnes.delete(f); },
    enregistrer(type, def) { types[type] = def; },
    // Au chargement : une tâche restée « en cours » a été interrompue (page fermée, plantage) — rien n'est relancé sans l'utilisateur
    async demarrer() { if (demarre) return; demarre = true; for (const t of await db.tous('taches').catch(() => [])) if (t.etat === 'en-cours') { t.etat = 'interrompu'; t.message = `Interrompu à ${Math.round((t.progres || 0) * 100)} % (page fermée ou rechargée).`; await sauver(t); } suivante(); },
    async ajouter(type, params = {}, { nom } = {}) { if (!types[type]) throw new Error(`type de traitement inconnu : ${type}`); const t = { id: nid(), type, nom: nom || types[type].nom, params, etat: 'attente', progres: 0, curseur: 0, message: '', erreur: null, essais: 0, cree: Date.now() }; await sauver(t); suivante(); return t; },
    async annuler(id) { if (courante?.id === id) { controleur.abort(); return; } const t = await db.lire('taches', id); if (t && t.etat === 'attente') { t.etat = 'annule'; await sauver(t); } },
    // Reprise contrôlée : repart du curseur (pages déjà traitées conservées) ; « réessayer » repart de zéro
    async reprendre(id, { depuisZero = false } = {}) { const t = await db.lire('taches', id); if (!t || !['interrompu', 'erreur', 'annule'].includes(t.etat)) return; t.etat = 'attente'; t.erreur = null; if (depuisZero) { t.curseur = 0; t.progres = 0; } t.message = depuisZero ? 'Relancé depuis le début.' : `Reprise à l'élément ${(t.curseur || 0) + 1}.`; await sauver(t); suivante(); },
    async supprimer(id) { if (courante?.id === id) return; await db.suppr('taches', id); notifier({ id, supprime: true }); },
    lister: async () => (await db.tous('taches').catch(() => [])).sort((a, b) => b.cree - a.cree),
    courante: () => courante,
  };
}
