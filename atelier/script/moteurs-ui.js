// Script Studio › Moteurs : capacités mesurées, serveur local (PC ou réseau), profil de configuration, moteurs, traitements.
// Aucun modèle n'est téléchargé ni exécuté en 0.11.0 : cet écran prépare et vérifie l'environnement, sans rien supposer.
import { db } from '../motion/stockage.js';
import * as MO from '../../templates/_systeme/moteurs.js';
import { detecter } from './capacites.js';
import { ETATS } from './taches.js';
import { $, el, bouton, champ, choix, saisie, info } from './ui.js';

// Jeton transmis par l'adresse affichée par le serveur : après « # » (jamais envoyé sur le réseau), lu une fois au chargement
// puis retiré de la barre d'adresse et de l'historique de session. Une ancienne adresse « ?jeton= » est nettoyée sans être utilisée.
export function lireJetonAdresse() {
  const u = new URL(location.href), h = u.hash.slice(1), m = h.match(/(?:^|&)jeton=([^&]*)/), ancien = u.searchParams.has('jeton');
  if (!m && !ancien) return { jeton: null, ancien: false };
  u.searchParams.delete('jeton'); u.hash = m ? (h.replace(/(?:^|&)jeton=[^&]*/, '').replace(/^&/, '') || 'moteurs') : h; history.replaceState(null, '', u);
  return { jeton: m ? decodeURIComponent(m[1]) : null, ancien };
}
export function initMoteurs({ file, jetonAdresse = null, ocr = null }) {
  let reglages = null, caps = null, jetonRecu = jetonAdresse;
  const charger = async () => { reglages = { ...MO.REGLAGES0, ...(await db.lire('reglages', 'moteurs').catch(() => null)) };
    if (jetonRecu) { reglages.jeton = jetonRecu; reglages.serveur ||= location.origin; jetonRecu = null; await db.ecrire('reglages', reglages); }
    if (!reglages.serveur) { try { const r = await fetch('/api/sante', { signal: AbortSignal.timeout(1500), headers: reglages.jeton ? { 'X-DA-PRIME-Jeton': reglages.jeton } : {} }); if (r.ok && (await r.json()).application === 'DA-PRIME') { reglages.serveur = location.origin; await db.ecrire('reglages', reglages); } } catch { /* pas de serveur local : mode navigateur seul */ } }
    return reglages; };
  const sauver = () => db.ecrire('reglages', reglages);
  const v = (x, u = '') => (x === null || x === undefined ? el('em', { className: 'inconnu', textContent: 'inconnu' }) : `${x}${u}`);
  async function afficher() {
    await charger(); const z = $('#moteurs-vue'); z.replaceChildren(el('p', { className: 'note', textContent: 'Mesure des capacités…' }));
    caps = await detecter({ serveur: reglages.serveur || null, jeton: reglages.jeton });
    const reco = MO.profilRecommande(caps), profil = reglages.choisi && reglages.profil ? reglages.profil : reco.profil, S = caps.serveur && !caps.serveur.injoignable ? caps.serveur : null;
    const lignes = (rows) => el('table', { className: 'tableau-caps' }, el('tbody', {}, ...rows.map(([k, val, src]) => el('tr', {}, el('th', { textContent: k }), el('td', {}, val), el('td', { className: 'note', textContent: src || '' })))));
    const url = saisie(reglages.serveur, { placeholder: 'http://localhost:4180 ou http://192.168.1.20:4180', id: 'serveur-url' }), jet = saisie(reglages.jeton, { placeholder: 'Jeton affiché par le serveur (mode réseau)', id: 'serveur-jeton', type: 'text', autocomplete: 'off', spellcheck: false, className: 'masque-saisie' });
    const ol = saisie(reglages.ollama, { id: 'ollama-url' }), resOl = el('p', { className: 'note', id: 'ollama-resultat' });
    const choixProfil = choix(Object.fromEntries(Object.entries(MO.PROFILS).map(([k, p]) => [k, `${p.nom}${k === reco.profil ? ' (recommandé)' : ''}`])), profil); choixProfil.id = 'profil-config';
    choixProfil.addEventListener('change', async () => { reglages.profil = choixProfil.value; reglages.choisi = true; await sauver(); afficher(); });
    const P = MO.PROFILS[profil], besoin = MO.espaceProfil(profil), libre = S?.disque?.libreGo ?? null;
    z.replaceChildren(
      el('div', { className: 'carte-bloc', id: 'capacites' }, el('h3', { textContent: 'Cet appareil (mesuré par le navigateur)' }),
        lignes([['Plateforme', caps.plateforme, caps.mobile ? 'appareil mobile' : ''], ['Cœurs logiques', v(caps.coeurs), caps.sources.coeurs], ['Mémoire', caps.ramGo ? `${caps.ramPlafond ? '≥ ' : '≈ '}${caps.ramGo} Go` : v(null), caps.sources.ramGo],
          ['Carte graphique', v(caps.gpuNom), caps.gpuLogiciel ? 'rendu logiciel (pas de GPU utilisable)' : 'nom fourni par WebGL'], ['WebGPU', caps.webgpu ? `oui${caps.gpuWebGPU ? ` · ${caps.gpuWebGPU}` : ''}` : 'non', ''], ['Mémoire vidéo', v(null), caps.sources.vramGo],
          ['Stockage du site', caps.quotaGo !== null ? `${caps.utiliseMo} Mo utilisés sur ${caps.quotaGo} Go accordés` : v(null), `${caps.sources.quotaGo || ''}${caps.persistant ? ' · persistant' : ''}`]])),
      el('div', { className: 'carte-bloc', id: 'serveur' }, el('h3', { textContent: 'Serveur local (PC qui exécutera les moteurs)' }),
        el('p', { className: 'note', textContent: 'Facultatif. Lancé sur le PC, il mesure les vraies capacités (RAM, mémoire vidéo NVIDIA, disque) et accueillera les moteurs. En mode réseau, téléphones et tablettes utilisent DA-PRIME sans faire tourner de modèle : tout s\'exécute sur le PC. Adresses locales uniquement, jeton obligatoire sur le réseau.' }),
        el('pre', { className: 'commande', textContent: 'node tools/serveur-moteurs.mjs            (ce PC)\nnode tools/serveur-moteurs.mjs --reseau   (PC + appareils du réseau local)' }),
        el('div', { className: 'grille2' }, champ('Adresse du serveur', url), champ('Jeton', jet)),
        el('div', { className: 'rangee' }, bouton('Enregistrer et tester', async () => { if (url.value && !MO.adresseLocale(url.value).ok) return info(MO.adresseLocale(url.value).raison); reglages.serveur = url.value.trim(); reglages.jeton = jet.value.trim(); await sauver(); afficher(); }, { className: 'accent', id: 'tester-serveur' })),
        caps.serveur ? (caps.serveur.injoignable ? el('p', { className: 'moteur-statut', id: 'serveur-etat', textContent: `Serveur : ${caps.serveur.erreur}.` })
          : lignes([['Système', S.os], ['Processeur', `${v(S.cpu)} · ${S.coeurs} cœurs`], ['Mémoire', `${S.ramGo} Go (${S.ramLibreGo} Go libres)`], ['GPU', S.gpus.length ? S.gpus.map((g) => `${g.nom}${g.vramGo ? ` · ${g.vramGo} Go` : ''}`).join(' ; ') : 'aucun GPU détecté', S.gpus[0]?.source || 'nvidia-smi absent'], ['Mémoire vidéo', S.vramGo !== null ? `${S.vramGo} Go` : v(null)], ['Disque', S.disque ? `${S.disque.libreGo} Go libres sur ${S.disque.totalGo} Go` : v(null)]]))
          : el('p', { className: 'note', id: 'serveur-etat', textContent: 'Aucun serveur configuré : les mesures se limitent à ce que le navigateur expose.' })),
      el('div', { className: 'carte-bloc', id: 'profil-moteurs' }, el('h3', { textContent: 'Profil de configuration' }),
        el('p', { textContent: `Recommandé : ${MO.PROFILS[reco.profil].nom} (${reco.raisons.join(', ')}).` }), champ('Profil appliqué', choixProfil), el('p', { className: 'note', textContent: P.description }),
        P.modeles.length ? el('ul', {}, ...P.modeles.map(([t, n, go]) => el('li', { textContent: `${MO.TYPES_MOTEURS[t]} : ${n} — ≈ ${go} Go (non téléchargé ; prévu dans une version ultérieure)` }))) : el('p', { className: 'note', textContent: 'Aucun modèle sur cet appareil.' }),
        besoin ? el('p', { className: 'note', textContent: `Espace à prévoir : ≈ ${besoin.toFixed(1)} Go${libre !== null ? ` · disque libre du serveur : ${libre} Go${libre < besoin * 1.5 ? ' — insuffisant avec marge' : ''}` : ' · espace disque inconnu sans serveur local'}.` }) : null),
      ocr ? ocr.sectionMoteurs() : null,
      el('div', { className: 'carte-bloc', id: 'liste-moteurs' }, el('h3', { textContent: 'Moteurs' }),
        ...Object.entries(MO.TYPES_MOTEURS).map(([type, nom]) => { const s = choix(Object.fromEntries(Object.entries(MO.ADAPTATEURS).filter(([, a]) => a.type === type).map(([k, a]) => [k, `${a.nom} · ${MO.MODES[a.mode]}${a.etat === 'prevu' ? ' — non installé' : ''}`])), reglages.adaptateurs[type]); s.dataset.moteur = type;
          [...s.options].forEach((o) => { o.disabled = MO.ADAPTATEURS[o.value].etat !== 'disponible'; });
          s.addEventListener('change', async () => { reglages.adaptateurs[type] = s.value; await sauver(); });
          return el('div', { className: 'ligne-element' }, el('div', { className: 'pile' }, el('b', { textContent: nom }), s, el('span', { className: 'note', textContent: Object.values(MO.ADAPTATEURS).filter((a) => a.type === type && a.etat === 'prevu').map((a) => `${a.nom} : ${a.note || 'prévu'}`).join(' · ') }))); }),
        el('h3', { textContent: 'Connexion Ollama (préparation)' }), el('p', { className: 'note', textContent: 'Test de joignabilité seulement : liste les modèles déjà installés dans Ollama sur ce PC ou le réseau local, sans en exécuter aucun. Adresses publiques refusées.' }),
        el('div', { className: 'rangee' }, ol, bouton('Tester', async () => { const a = MO.adresseLocale(ol.value); if (!a.ok) { resOl.textContent = a.raison; return; } reglages.ollama = ol.value.trim(); await sauver();
          try { const r = await fetch(new URL('/api/tags', ol.value), { signal: AbortSignal.timeout(4000) }), j = await r.json(); resOl.textContent = `Joignable · ${j.models?.length || 0} modèle(s) installé(s)${j.models?.length ? ` : ${j.models.map((m) => m.name).slice(0, 8).join(', ')}` : ''}. Aucun n'est utilisé dans cette version.`; }
          catch (e) { resOl.textContent = `Injoignable (${e.name === 'TimeoutError' ? 'délai dépassé' : 'connexion refusée ou bloquée : Ollama lancé ? origine autorisée par OLLAMA_ORIGINS ?'}).`; } }, { id: 'tester-ollama' })), resOl),
      el('div', { className: 'carte-bloc', id: 'traitements' }, el('h3', { textContent: 'Traitements en arrière-plan' }), el('div', { className: 'rangee' }, bouton('Diagnostic de la file (10 étapes)', () => file.ajouter('diagnostic', { etapes: 10, pause: 250 }), { id: 'lancer-diagnostic' })), el('div', { className: 'liste-elements', id: 'liste-taches' })));
    listerTaches();
  }
  async function listerTaches() {
    const z = $('#liste-taches'); if (!z) return; const ts = await file.lister();
    z.replaceChildren(...(ts.length ? ts.slice(0, 30).map((t) => el('div', { className: 'ligne-element tache', dataset: { tache: t.id, etat: t.etat } }, el('div', { className: 'pile' }, el('b', { textContent: `${t.nom} · ${ETATS[t.etat]}` }),
      el('div', { className: 'jauge' }, el('i', { style: `width:${Math.round((t.progres || 0) * 100)}%` })), el('span', { className: 'note', textContent: `${Math.round((t.progres || 0) * 100)} %${t.message ? ` · ${t.message}` : ''}${t.erreur ? ` · erreur : ${t.erreur}` : ''}` })),
      el('div', { className: 'pile' }, ['attente', 'en-cours'].includes(t.etat) ? bouton('Annuler', () => file.annuler(t.id), { className: 'petit', dataset: { annuler: t.id } }) : null,
        t.etat === 'interrompu' || t.etat === 'annule' ? bouton('Reprendre', () => file.reprendre(t.id), { className: 'accent petit', dataset: { reprendre: t.id } }) : null,
        ['erreur', 'interrompu', 'annule'].includes(t.etat) ? bouton('Réessayer', () => file.reprendre(t.id, { depuisZero: true }), { className: 'petit' }) : null,
        t.etat !== 'en-cours' ? bouton('Retirer', () => file.supprimer(t.id), { className: 'petit' }) : null))) : [el('p', { className: 'note', textContent: 'Aucun traitement.' })]));
  }
  file.abonner(() => listerTaches());
  return { afficher, charger, reglages: () => reglages };
}
