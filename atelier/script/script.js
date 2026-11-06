// Script Studio · projets éditoriaux, parcours en 8 étapes, éditeur de script, analyse critique, versions, exports.
// Local-first : IndexedDB de DA-PRIME (magasins scripts, redaction, prompts, comics, pages). Aucun envoi, aucune IA requise.
import { db, persister } from '../motion/stockage.js';
import * as SM from '../../templates/_systeme/script-moteur.js';
import { $, el, bouton, champ, choix, saisie, zone, info, telecharger, slug, sans, PROVENANCES, autoTaille } from './ui.js';
import { initComics } from './comics-ui.js';
import { initPrompts } from './prompts-ui.js';
import { creerFile } from './taches.js';
import { initConnaissances } from './connaissances-ui.js';
import { initMoteurs, lireJetonAdresse } from './moteurs-ui.js';
import { initOcr } from './ocr-ui.js';

const ETAPES = { projet: 'Projet', sources: 'Sources', analyse: 'Analyse', angle: 'Angle éditorial', plan: 'Plan', script: 'Script', critique: 'Analyse critique', export: 'Export' };
const PROFONDEURS = { decouverte: 'Découverte', intermediaire: 'Intermédiaire', expert: 'Expert' };
const GENRES_SOURCE = { document: 'Document', note: 'Note personnelle', recherche: 'Recherche fournie', comic: 'Comic importé', extrait: 'Extrait (son ou vidéo)' };
let projets = [], profils = [], P = null, etape = 'projet', hist = [], futur = [], minuterie = 0, derniereCle = '', derniereHeure = 0, critique = null;

// ---------- Persistance, historique ----------
const profilDe = (p) => profils.find((x) => x.id === p?.profil) || profils[0];
const instantane = () => JSON.stringify({ ...P, versions: undefined });
function modif(fn, cle = '', rerendre = true) {
  const now = Date.now(); if (cle !== derniereCle || now - derniereHeure > 1500) { hist.push(instantane()); if (hist.length > 120) hist.shift(); futur = []; } derniereCle = cle; derniereHeure = now;
  fn(P); P.modifie = now; sauverBientot(); if (rerendre) afficher(); else majMetriques();
}
function sauverBientot() { clearTimeout(minuterie); minuterie = setTimeout(sauver, 600); info('Modifications non enregistrées…'); }
async function sauver() { clearTimeout(minuterie); if (!P) return; await db.ecrire('scripts', JSON.parse(JSON.stringify(P))); info(`Enregistré à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}.`); const i = projets.findIndex((x) => x.id === P.id); if (i >= 0) projets[i] = JSON.parse(JSON.stringify(P)); lister(); }
function restaurer(json) { const v = P.versions; P = { ...JSON.parse(json), versions: v }; sauverBientot(); afficher(); }
const annuler = () => { if (!hist.length) return; futur.push(instantane()); restaurer(hist.pop()); info('Modification annulée.'); };
const retablir = () => { if (!futur.length) return; hist.push(instantane()); restaurer(futur.pop()); info('Modification rétablie.'); };
addEventListener('keydown', (e) => { if (!P || !(e.ctrlKey || e.metaKey) || $('#projets').hidden) return; if (e.key.toLowerCase() === 'z') { e.preventDefault(); e.shiftKey ? retablir() : annuler(); } if (e.key.toLowerCase() === 'y') { e.preventDefault(); retablir(); } if (e.key.toLowerCase() === 's') { e.preventDefault(); sauver(); } });
addEventListener('pagehide', () => { if (P) db.ecrire('scripts', JSON.parse(JSON.stringify(P))); });

// ---------- Espaces ----------
let comicsUI, promptsUI, kb, moteursUI, ocrUI; const file = creerFile(), jetonAdresse = lireJetonAdresse();   // avant toute lecture de l'adresse
function espace(nom) {
  for (const b of document.querySelectorAll('[data-espace]')) { const a = b.dataset.espace === nom; b.setAttribute('aria-selected', a); $(`#${b.dataset.espace}`).hidden = !a; }
  if (location.hash.slice(1) !== nom) history.replaceState(null, '', `#${nom}`);
  if (nom === 'comics') comicsUI.afficher(); if (nom === 'profils') listerProfils(); if (nom === 'prompts') promptsUI.afficher(P); if (nom === 'connaissances') kb.afficher(comicsUI.numeros()); if (nom === 'moteurs') moteursUI.afficher();
}
document.querySelectorAll('[data-espace]').forEach((b) => b.addEventListener('click', () => espace(b.dataset.espace)));

// ---------- Projets ----------
async function charger() { projets = (await db.tous('scripts').catch(() => [])).sort((a, b) => b.modifie - a.modifie); profils = await db.tous('redaction').catch(() => []); if (!profils.length) { profils = [{ ...SM.PROFIL0 }]; await db.ecrire('redaction', profils[0]); } }
function lister() {
  const q = sans($('#recherche-projets').value), arch = $('#voir-archives').checked;
  $('#liste-projets').replaceChildren(...projets.filter((p) => (arch || !p.archive) && (!q || sans(`${p.nom} ${p.sujet}`).includes(q))).map((p) => el('li', {}, bouton('', () => ouvrir(p.id), { 'aria-pressed': String(P?.id === p.id), dataset: { projet: p.id } }))));
  [...$('#liste-projets').querySelectorAll('button')].forEach((b) => { const p = projets.find((x) => x.id === b.dataset.projet); b.append(el('span', { textContent: `${p.archive ? '🗄 ' : ''}${p.nom}` }), el('small', { textContent: `${SM.PLATEFORMES[p.plateforme]?.nom || ''} · ${SM.formatDuree(p.duree)}` })); });
}
['#recherche-projets', '#voir-archives'].forEach((s) => $(s).addEventListener('input', lister));
$('#nouveau-projet').addEventListener('click', async () => { const p = SM.nouveauProjet({ profil: profils[0]?.id }); projets.unshift(p); await db.ecrire('scripts', p); ouvrir(p.id); info('Projet créé : commencer par le sujet, la durée et la plateforme.'); });
async function ouvrir(id, et) { if (P) await sauver(); P = JSON.parse(JSON.stringify(projets.find((x) => x.id === id))); hist = []; futur = []; critique = null; etape = et || 'projet'; history.replaceState(null, '', `?projet=${id}#projets`); lister(); afficher(); }

// État de chaque étape : fait / à valider / à faire
function etats() {
  const s2 = P.sequences.filter((s) => s.niveau === 2), ecrites = s2.filter((s) => s.texte.trim()).length, nc = comicsUI.etatValidation(P.comics);
  return {
    projet: P.sujet && P.duree ? 'fait' : 'afaire', sources: P.sources.length || P.points.length ? 'fait' : 'afaire',
    analyse: !P.comics.length ? 'fait' : nc.complets === P.comics.length ? 'fait' : 'valider', angle: P.angle && P.promesse ? 'fait' : P.suggestions.some((x) => x.statut === 'propose') ? 'valider' : 'afaire',
    plan: s2.length ? 'fait' : 'afaire', script: s2.length && ecrites === s2.length ? 'fait' : ecrites ? 'valider' : 'afaire',
    critique: P.etapes?.critique ? (critique?.problemes.some((x) => x.statut === 'ouvert' && x.gravite === 'haute') ? 'valider' : 'fait') : 'afaire', export: P.etapes?.export ? 'fait' : 'afaire',
  };
}
const LIB_ETAT = { fait: 'terminé', valider: 'à valider', afaire: 'à faire' };
function afficher() {
  const z = $('#projet'); if (!P) return; const e = etats(), m = SM.mesurerProjet(P, { profil: profilDe(P) });
  const nom = saisie(P.nom, { 'aria-label': 'Nom du projet', id: 'nom-projet' }); nom.addEventListener('input', () => modif((p) => { p.nom = nom.value; }, 'nom', false));
  z.replaceChildren(
    el('div', { className: 'titre-projet' }, nom, bouton('Annuler', annuler, { title: 'Ctrl+Z' }), bouton('Rétablir', retablir, { title: 'Ctrl+Maj+Z' })),
    el('div', { className: 'metriques', id: 'metriques' }),
    el('nav', { className: 'etapes', role: 'tablist', 'aria-label': 'Étapes du projet' }, ...Object.entries(ETAPES).map(([k, n]) => bouton('', () => { etape = k; afficher(); }, { role: 'tab', 'aria-selected': String(k === etape), dataset: { etape: k, etat: e[k] } }))),
    el('div', { className: 'panneau-etape', id: 'panneau-etape' }));
  z.querySelectorAll('.etapes button').forEach((b) => { b.append(el('b', { textContent: ETAPES[b.dataset.etape] }), el('small', { textContent: LIB_ETAT[e[b.dataset.etape]] })); b.setAttribute('aria-selected', String(b.dataset.etape === etape)); });
  majMetriques(m); ({ projet: vueProjet, sources: vueSources, analyse: vueAnalyse, angle: vueAngle, plan: vuePlan, script: vueScript, critique: vueCritique, export: vueExport })[etape]($('#panneau-etape'));
}
function majMetriques(m = SM.mesurerProjet(P, { profil: profilDe(P) })) {
  const z = $('#metriques'); if (!z) return; const ecart = m.mots ? Math.round(((m.total - P.duree) / P.duree) * 100) : null;
  z.replaceChildren(...[el('span', { textContent: SM.PLATEFORMES[P.plateforme]?.nom }), el('span', { textContent: `${SM.CLASSES[SM.classeDuree(P.duree)]} · cible ${SM.formatDuree(P.duree)}` }), el('span', { textContent: `${m.mots} / ${m.motsCibles} mots` }),
    el('span', { textContent: `estimé ${SM.formatDuree(m.mots ? m.total : 0)}`, dataset: { etat: ecart === null ? '' : Math.abs(ecart) > 15 ? 'alerte' : 'ok' } }), el('span', { textContent: `${m.wpm} mots/min` }), m.pauses + m.extraits + m.silences ? el('span', { textContent: `hors parole ${SM.formatDuree(m.pauses + m.extraits + m.silences)}` }) : null].filter(Boolean));
}

// ---------- 1. Projet ----------
function vueProjet(z) {
  const f = (k, input, ev = 'input', conv = (v) => v) => { input.addEventListener(ev, () => modif((p) => { p[k] = conv(input.value); }, k, ev === 'change')); return input; };
  const duree = saisie(SM.formatDuree(P.duree), { id: 'duree-projet', placeholder: 'Ex. : 30 s, 3 min, 1 h 30, 2:30' });
  duree.addEventListener('change', () => { const s = SM.lireDuree(duree.value); modif((p) => { p.duree = s; }, 'duree'); });
  z.append(el('div', { className: 'carte-bloc' }, el('h3', { textContent: 'Le projet' }),
    champ('Sujet', f('sujet', zone(P.sujet, { rows: 2, id: 'sujet-projet', placeholder: 'Ex. : les origines de Galactus ; la saga du Phénix noir ; un numéro précis…' }))),
    el('div', { className: 'grille2' }, champ('Type de contenu', f('type', choix(SM.TYPES, P.type), 'change')), champ('Plateforme', f('plateforme', choix(Object.fromEntries(Object.entries(SM.PLATEFORMES).map(([k, v]) => [k, v.nom])), P.plateforme), 'change')),
      champ('Durée (toute durée)', duree, `${SM.CLASSES[SM.classeDuree(P.duree)]} · ${SM.formatDuree(P.duree)}`), champ('Profil d\'écriture', f('profil', choix(Object.fromEntries(profils.map((x) => [x.id, x.nom])), P.profil || profils[0]?.id), 'change'))),
    el('div', { className: 'grille2' }, champ('Public cible', f('public', saisie(P.public))), champ('Objectif', f('objectif', saisie(P.objectif))), champ('Ton', f('ton', saisie(P.ton))), champ('Profondeur', f('profondeur', choix(PROFONDEURS, P.profondeur), 'change'))),
    champ('Notes', f('notes', autoTaille(zone(P.notes))))),
    el('div', { className: 'carte-bloc' }, el('h3', { textContent: 'Versions et organisation' }),
      el('div', { className: 'rangee' }, bouton('Enregistrer une version', enregistrerVersion, { id: 'enregistrer-version' }), bouton('Dupliquer le projet', dupliquer), bouton(P.archive ? 'Désarchiver' : 'Archiver', () => { modif((p) => { p.archive = !p.archive; }); lister(); }),
        bouton('Supprimer', async () => { if (!confirm(`Supprimer définitivement « ${P.nom} » et ses versions ?`)) return; await db.suppr('scripts', P.id); projets = projets.filter((x) => x.id !== P.id); P = null; $('#projet').replaceChildren(el('p', { className: 'vide', textContent: 'Projet supprimé.' })); lister(); }, { className: 'danger' })),
      versions()));
}
function enregistrerVersion() { const n = prompt('Nom de la version', `Version du ${new Date().toLocaleString('fr-FR')}`); if (n === null) return; P.versions = [...(P.versions || []), { id: `v${Date.now().toString(36)}`, nom: n, date: Date.now(), contenu: instantane() }].slice(-40); sauver(); afficher(); info(`Version « ${n} » enregistrée.`); }
async function dupliquer() { await sauver(); const c = { ...JSON.parse(JSON.stringify(P)), id: `sp${Date.now().toString(36)}`, nom: `${P.nom} (copie)`, versions: [], cree: Date.now(), modifie: Date.now(), archive: false }; projets.unshift(c); await db.ecrire('scripts', c); ouvrir(c.id); }
function versions() {
  const vs = [...(P.versions || [])].reverse(); if (!vs.length) return el('p', { className: 'note', textContent: 'Aucune version enregistrée. Une version est aussi créée automatiquement avant chaque restauration.' });
  const zoneDiff = el('div');
  return el('div', { className: 'liste-elements' }, ...vs.map((v) => el('div', { className: 'ligne-element', dataset: { version: v.id } }, el('span', { textContent: `${v.nom} · ${new Date(v.date).toLocaleString('fr-FR')}` }),
    el('div', { className: 'rangee' }, bouton('Comparer avec l\'actuel', () => { const a = SM.texteProjet(JSON.parse(v.contenu)), b = SM.texteProjet(P), d = SM.comparer(a, b);
      zoneDiff.replaceChildren(el('h3', { textContent: `Différences : « ${v.nom} » → version actuelle` }), el('div', { className: 'diff', id: 'diff' }, ...d.map((x) => (x.t === '=' ? document.createTextNode(x.s) : el(x.t === '+' ? 'ins' : 'del', { textContent: x.s }))))); }, { dataset: { comparer: v.id } }),
      bouton('Restaurer', () => { if (!confirm(`Restaurer « ${v.nom} » ? L'état actuel est d'abord enregistré comme version.`)) return; P.versions = [...P.versions, { id: `v${Date.now().toString(36)}`, nom: 'Avant restauration', date: Date.now(), contenu: instantane() }]; hist.push(instantane()); restaurer(v.contenu); info(`Version « ${v.nom} » restaurée.`); })))), zoneDiff);
}

// ---------- 2. Sources et matière ----------
function vueSources(z) {
  const ligneSource = (s, i) => { const t = saisie(s.titre, { placeholder: 'Titre ou description' }), r = saisie(s.reference || '', { placeholder: 'Référence précise (numéro, page, date, lien)' }), g = choix(GENRES_SOURCE, s.genre || 'document'), n = zone(s.note || '', { rows: 2, placeholder: 'Ce que dit la source (vos mots)' }), d = el('input', { type: 'number', min: 0, value: s.duree || 0, title: 'Durée (s) pour un extrait' });
    const maj = () => modif((p) => { Object.assign(p.sources[i], { titre: t.value, reference: r.value, genre: g.value, note: n.value, duree: +d.value || 0 }); }, `src${i}`, false); [t, r, n, d].forEach((x) => x.addEventListener('input', maj)); g.addEventListener('change', maj);
    return el('div', { className: 'ligne-element' }, el('div', { className: 'pile' }, el('div', { className: 'grille2' }, champ('Source', t), champ('Référence', r), champ('Nature', g), champ('Durée d\'extrait (s)', d)), champ('Contenu', n)), bouton('Retirer', () => modif((p) => { p.sources.splice(i, 1); }), { className: 'danger petit' })); };
  const lignePoint = (x, i) => { const t = zone(x.texte, { rows: 2, placeholder: 'Un fait, un événement, une idée à transmettre (vos mots)' }), imp = choix({ 3: 'Essentiel', 2: 'Important', 1: 'Secondaire' }, String(x.importance || 2)), pr = choix(PROVENANCES, x.provenance || 'source'), src = saisie(x.refTexte || x.source || '', { placeholder: 'Source ou référence' });
    const maj = () => modif((p) => { Object.assign(p.points[i], { texte: t.value, importance: +imp.value, provenance: pr.value, refTexte: src.value, source: src.value }); }, `pt${i}`, false); [t, src].forEach((y) => y.addEventListener('input', maj)); [imp, pr].forEach((y) => y.addEventListener('change', maj));
    return el('div', { className: 'ligne-element', dataset: { point: x.id } }, el('div', { className: 'pile' }, t, el('div', { className: 'grille2' }, champ('Importance', imp), champ('Provenance', pr), champ('Référence', src)), x.ref ? el('span', { className: 'note', textContent: `Lien comic : ${x.refTexte || ''}` }) : null),
      el('div', { className: 'pile' }, bouton('↑', () => i && modif((p) => { [p.points[i - 1], p.points[i]] = [p.points[i], p.points[i - 1]]; p.points.forEach((y, k) => { y.ordre = k; }); }), { className: 'petit', 'aria-label': 'Monter' }), bouton('Retirer', () => modif((p) => { p.points.splice(i, 1); }), { className: 'danger petit' }))); };
  const numeros = comicsUI.numeros(), sel = el('div', { className: 'validation' }, ...numeros.map((c) => { const cb = el('input', { type: 'checkbox', checked: P.comics.includes(c.id), dataset: { comic: c.id } }); cb.addEventListener('change', () => modif((p) => { p.comics = cb.checked ? [...new Set([...p.comics, c.id])] : p.comics.filter((x) => x !== c.id); })); return el('label', {}, cb, `${c.serie || 'Sans série'} #${c.numero || '?'} ${c.titre || ''}`); }));
  z.append(
    el('div', { className: 'carte-bloc' }, el('h3', { textContent: 'Matière du script' }), el('p', { className: 'note', textContent: 'Chaque point est une information à transmettre, avec sa provenance. Le plan ne s\'appuie que sur cette matière : rien n\'est inventé, rien n\'est ajouté pour remplir la durée.' }),
      el('div', { className: 'liste-elements', id: 'liste-points' }, ...P.points.map(lignePoint)), el('div', { className: 'rangee' }, bouton('Ajouter un point', () => modif((p) => { p.points.push({ id: `pt${Date.now().toString(36)}${p.points.length}`, texte: '', importance: 2, provenance: 'source', ordre: p.points.length }); }), { id: 'ajouter-point' }),
        P.comics.length ? bouton('Reprendre les événements validés des comics', reprendreComics, { id: 'reprendre-comics' }) : null)),
    el('div', { className: 'carte-bloc' }, el('h3', { textContent: 'Comics associés' }), numeros.length ? sel : el('p', { className: 'note', textContent: 'Aucun comic importé : utiliser l\'espace Comics.' })),
    el('div', { className: 'carte-bloc' }, el('h3', { textContent: 'Sources et contexte complémentaire' }), el('p', { className: 'note', textContent: 'Séparées des comics importés : publications liées, auteurs, contexte, recherches que vous fournissez. En mode hors ligne, aucune recherche externe n\'est faite.' }),
      el('div', { className: 'liste-elements' }, ...P.sources.map(ligneSource)), bouton('Ajouter une source', () => modif((p) => { p.sources.push({ titre: '', reference: '', genre: 'document', note: '' }); }), { id: 'ajouter-source' })));
}
async function reprendreComics() {
  const brut = await kb.pointsPourProjet(P.comics), libs = Object.fromEntries(comicsUI.numeros().map((c) => [c.id, c])), points = brut.map((x) => { const c = libs[x.ref.comic]; return { ...x, ref: { ...x.ref, pageId: c?.pages[(x.ref.page || 1) - 1] }, refTexte: `${c?.serie || ''} #${c?.numero || '?'} p. ${x.ref.page || '?'}${x.ref.case ? ` case ${x.ref.case}` : ''}` }; });
  const ignores = P.comics.filter((id) => !brut.some((x) => x.ref.comic === id)).length, existants = new Set(P.points.map((x) => x.cle).filter(Boolean)), nouveaux = points.filter((x) => !existants.has(x.cle));
  modif((p) => { p.points.push(...nouveaux); p.points.forEach((y, k) => { y.ordre = y.ordre ?? k; }); });
  info(`${nouveaux.length} événement(s) validé(s) repris avec leur référence (numéro, page, case).${ignores ? ` ${ignores} numéro(s) ignoré(s) : événements non validés.` : ''} Les informations à vérifier, rejetées, hypothèses et incertaines ne sont jamais reprises.`);
}

// ---------- 3. Analyse (comics) ----------
function vueAnalyse(z) {
  if (!P.comics.length) { z.append(el('div', { className: 'carte-bloc' }, el('h3', { textContent: 'Analyse' }), el('p', { className: 'note', textContent: 'Ce projet n\'utilise pas de comics importés. Associer des numéros dans l\'étape Sources pour bénéficier de l\'analyse par numéro, de la chronologie et des références de pages.' }))); return; }
  comicsUI.vueAnalyseProjet(z, P);
}

// ---------- 4. Angle éditorial ----------
function vueAngle(z) {
  const idee = zone(P.sujet, { rows: 2, id: 'idee-angle' }), CH = { question: 'Question centrale', promesse: 'Promesse', conflit: 'Conflit narratif', enjeu: 'Enjeu', pointDeVue: 'Point de vue', differenciation: 'Différenciation', titre: 'Titres possibles', miniature: 'Concepts de miniatures' };
  const appliquer = (s) => modif((p) => { const x = p.suggestions.find((y) => y.id === s.id); x.statut = 'accepte';
    if (x.genre === 'angle') { p.angle = x.titre; if (!p.question) p.question = ''; } else if (x.genre === 'titre') p.titres = [...new Set([...p.titres, x.texte])]; else if (x.genre === 'miniature') p.miniatures = [...new Set([...p.miniatures, x.texte])]; else if (x.genre in p) p[x.genre] = x.texte; });
  const carte = (s) => { const t = saisie(s.genre === 'angle' ? s.titre : s.texte, { 'aria-label': CH[s.genre] || 'Angle' }); t.addEventListener('input', () => modif((p) => { const x = p.suggestions.find((y) => y.id === s.id); if (x.genre === 'angle') x.titre = t.value; else x.texte = t.value; }, `sug${s.id}`, false));
    return el('div', { className: 'ligne-element suggestion', dataset: { statut: s.statut, suggestion: s.id } }, el('div', { className: 'pile' }, t, s.desc ? el('small', { className: 'note', textContent: s.desc }) : null),
      bouton(s.statut === 'accepte' ? 'Accepté ✓' : 'Accepter', () => appliquer(s), { className: s.statut === 'accepte' ? '' : 'accent petit', disabled: s.statut === 'accepte' }), bouton('Rejeter', () => modif((p) => { p.suggestions.find((y) => y.id === s.id).statut = 'rejete'; }), { className: 'petit' })); };
  const champs = ['angle', 'question', 'promesse', 'conflit', 'enjeu', 'pointDeVue'].map((k) => { const i = zone(P[k] || '', { rows: 1 }); i.addEventListener('input', () => modif((p) => { p[k] = i.value; }, k, false)); return champ({ angle: 'Angle retenu', question: 'Question centrale', promesse: 'Promesse au spectateur', conflit: 'Conflit', enjeu: 'Enjeu', pointDeVue: 'Point de vue' }[k], autoTaille(i)); });
  const groupes = Object.entries({ angle: 'Angles possibles', ...CH }).map(([g, n]) => { const l = P.suggestions.filter((s) => s.genre === g && s.statut !== 'rejete'); return l.length ? el('div', { className: 'carte-bloc' }, el('h3', { textContent: n }), ...l.map(carte)) : null; });
  z.append(el('div', { className: 'carte-bloc' }, el('h3', { textContent: 'Architecte éditorial' }), champ('Idée de départ', idee),
    el('div', { className: 'rangee' }, bouton('Proposer des angles', () => { const a = SM.architecte(idee.value, { type: P.type }); modif((p) => { p.sujet = p.sujet || idee.value; p.suggestions = [...p.suggestions.filter((x) => x.statut === 'accepte'), ...a.angles, ...a.suggestions]; }); info(`${a.angles.length} angles et ${a.suggestions.length} suggestions : accepter, modifier ou rejeter chacune.`); }, { className: 'accent', id: 'proposer-angles' })),
    el('p', { className: 'note', textContent: 'Suggestions construites par règles à partir de l\'idée (aucun modèle de langage) : des points de départ, à reformuler. Rien n\'est appliqué sans votre accord.' })),
    el('div', { className: 'carte-bloc' }, el('h3', { textContent: 'Décisions éditoriales' }), ...champs,
      P.titres.length ? el('div', {}, el('b', { textContent: 'Titres retenus' }), el('ul', {}, ...P.titres.map((t) => el('li', { textContent: t })))) : null,
      P.miniatures.length ? el('div', {}, el('b', { textContent: 'Miniatures' }), ...P.miniatures.map((t) => el('div', { className: 'rangee' }, el('span', { textContent: t }), el('a', { className: 'bouton petit', href: `../production/?idee=${encodeURIComponent(`Miniature YouTube : ${P.titres[0] || P.sujet}`)}#assistant`, textContent: 'Composer dans Production →' })))) : null),
    ...groupes.filter(Boolean));
}

// ---------- 5. Plan ----------
function vuePlan(z) {
  const plan = () => { const r = SM.construirePlan(P, { profil: profilDe(P) }); if (P.sequences.some((s) => s.texte.trim()) && !confirm('Reconstruire le plan ? Les textes déjà écrits seront conservés dans une version.')) return;
    if (P.sequences.some((s) => s.texte.trim())) P.versions = [...(P.versions || []), { id: `v${Date.now().toString(36)}`, nom: 'Avant reconstruction du plan', date: Date.now(), contenu: instantane() }];
    modif((p) => { p.sequences = r.sequences; p.planAlertes = r.alertes; }); info(`Plan construit : ${r.sequences.filter((s) => s.niveau === 2).length} séquences, ${r.motsTotal} mots à ${r.wpm} mots/min.`); };
  z.append(el('div', { className: 'carte-bloc' }, el('h3', { textContent: 'Plan narratif' }),
    el('p', { className: 'note', textContent: `${SM.CLASSES[SM.classeDuree(P.duree)]} : ${{ court: 'une idée forte, hook immédiat, progression rapide, chute nette.', intermediaire: 'plusieurs séquences, révélations et transitions.', long: 'chapitres, sous-intrigues, synthèses.', 'tres-long': 'parties, chapitres et séquences, rappels de contexte, respirations.' }[SM.classeDuree(P.duree)]} Budget calculé sur la vitesse du profil et de la plateforme ; la matière (Sources) est répartie par importance et dans l'ordre chronologique.` }),
    el('div', { className: 'rangee' }, bouton(P.sequences.length ? 'Reconstruire le plan' : 'Construire le plan', plan, { className: 'accent', id: 'construire-plan' }), bouton('Ajouter une séquence', () => modif((p) => { p.sequences.push(seqVide('progression')); })), bouton('Ajouter un chapitre', () => modif((p) => { p.sequences.push({ ...seqVide('chapitre'), niveau: 1, titre: 'Nouveau chapitre', budgetMots: 0 }); }))),
    ...(P.planAlertes || []).map((a) => el('p', { className: 'moteur-statut', textContent: a }))));
  z.append(el('div', { className: 'liste-elements', id: 'plan' }, ...P.sequences.map((s, i) => { const t = saisie(s.titre), f = choix({ ...SM.FONCTIONS, chapitre: 'Chapitre', partie: 'Partie' }, s.fonction), b = el('input', { type: 'number', min: 0, value: s.budgetMots, style: 'width:90px', 'aria-label': 'Budget de mots' }), it = el('input', { type: 'range', min: 0, max: 5, value: s.intensite, 'aria-label': 'Intensité' });
    t.addEventListener('input', () => modif((p) => { p.sequences[i].titre = t.value; }, `t${i}`, false)); f.addEventListener('change', () => modif((p) => { const x = p.sequences[i]; x.fonction = f.value; x.niveau = f.value === 'partie' ? 0 : f.value === 'chapitre' ? 1 : 2; }));
    b.addEventListener('change', () => modif((p) => { p.sequences[i].budgetMots = +b.value || 0; }, `b${i}`)); it.addEventListener('change', () => modif((p) => { p.sequences[i].intensite = +it.value; }, `i${i}`, false));
    return el('div', { className: 'sequence', dataset: { niveau: s.niveau, fonction: s.fonction } }, el('div', { className: 'tete-seq' }, t, f, s.niveau === 2 ? b : null, s.niveau === 2 ? el('label', { className: 'compteur' }, 'intensité ', it) : null,
      el('div', { className: 'outils-seq' }, bouton('↑', () => i && modif((p) => { [p.sequences[i - 1], p.sequences[i]] = [p.sequences[i], p.sequences[i - 1]]; }), { 'aria-label': 'Monter' }), bouton('↓', () => i < P.sequences.length - 1 && modif((p) => { [p.sequences[i + 1], p.sequences[i]] = [p.sequences[i], p.sequences[i + 1]]; }), { 'aria-label': 'Descendre' }), bouton('✕', () => (!s.texte.trim() || confirm('Supprimer cette séquence et son texte ?')) && modif((p) => { p.sequences.splice(i, 1); }), { 'aria-label': 'Supprimer' }))),
      s.niveau === 2 ? el('p', { className: 'consigne', textContent: s.objectif }) : null, s.points?.length ? el('ul', { className: 'points-seq' }, ...s.points.map((id) => P.points.find((x) => x.id === id)).filter(Boolean).map((x) => el('li', { textContent: `${x.texte}${x.refTexte ? ` — ${x.refTexte}` : ''}` }))) : null); })));
}
const seqVide = (f) => ({ id: `sq${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, niveau: 2, titre: SM.FONCTIONS[f] || 'Séquence', fonction: f, objectif: '', budgetMots: 120, intensite: 3, texte: '', sources: [], refs: [], notes: '', commentaires: [], points: [] });

// ---------- 6. Script ----------
function vueScript(z) {
  if (!P.sequences.length) { z.append(el('p', { className: 'vide', textContent: 'Construire d\'abord le plan (étape Plan), ou ajouter une séquence.' }), bouton('Ajouter une séquence', () => modif((p) => { p.sequences.push(seqVide('hook')); }))); return; }
  const m = SM.mesurerProjet(P, { profil: profilDe(P) }), jauge = el('div', { className: 'jauge', dataset: { depasse: m.mots > m.motsCibles * 1.1 ? '1' : '0' } }, el('i', { style: `width:${Math.min(100, (m.mots / Math.max(1, m.motsCibles)) * 100)}%` }));
  z.append(el('div', { className: 'barre-outils' }, jauge, el('span', { className: 'compteur', id: 'compteur-global', textContent: `${m.mots} / ${m.motsCibles} mots` }), bouton('Enregistrer une version', enregistrerVersion), bouton('Analyser', () => { etape = 'critique'; afficher(); }, { className: 'accent' })),
    el('p', { className: 'note', textContent: 'Repères non prononcés (non comptés) : [PAUSE 2s], [SILENCE 3s], [EXTRAIT 0:12], [VISUEL …], [MUSIQUE …], lignes commençant par //. Dialogues : lignes « — » ou « NOM : ».' }));
  const wpm = SM.wpmDe(P, profilDe(P));
  for (const [i, s] of P.sequences.entries()) {
    if (s.niveau < 2) { const t = saisie(s.titre); t.addEventListener('input', () => modif((p) => { p.sequences[i].titre = t.value; }, `t${i}`, false)); z.append(el('div', { className: 'sequence', dataset: { niveau: s.niveau } }, t)); continue; }
    const t = saisie(s.titre), tx = autoTaille(zone(s.texte, { className: 'texte', rows: 4, dataset: { seq: s.id }, placeholder: s.objectif, 'aria-label': `Texte de la séquence ${s.titre}` })), cpt = el('span', { className: 'compteur' }), notes = zone(s.notes || '', { rows: 2, placeholder: 'Notes de montage' }), refs = saisie(s.sources.join(' ; '), { placeholder: 'Sources de cette séquence' });
    const majCpt = () => { const c = SM.compter(tx.value, wpm), e = s.budgetMots ? (c.mots - s.budgetMots) / s.budgetMots : 0; cpt.textContent = `${c.mots} / ${s.budgetMots} mots · ${SM.formatDuree(c.total)}`; cpt.dataset.ecart = Math.abs(e) <= 0.2 ? 'ok' : e > 0.35 ? 'haut' : ''; };
    tx.addEventListener('input', () => { modif((p) => { p.sequences[i].texte = tx.value; }, `x${s.id}`, false); majCpt(); const g = SM.mesurerProjet(P, { profil: profilDe(P) }); $('#compteur-global').textContent = `${g.mots} / ${g.motsCibles} mots`; jauge.firstChild.style.width = `${Math.min(100, (g.mots / Math.max(1, g.motsCibles)) * 100)}%`; });
    t.addEventListener('input', () => modif((p) => { p.sequences[i].titre = t.value; }, `t${i}`, false)); notes.addEventListener('input', () => modif((p) => { p.sequences[i].notes = notes.value; }, `n${i}`, false)); refs.addEventListener('input', () => modif((p) => { p.sequences[i].sources = refs.value.split(';').map((x) => x.trim()).filter(Boolean); }, `r${i}`, false));
    majCpt();
    const com = saisie('', { placeholder: 'Ajouter un commentaire…' }); com.addEventListener('keydown', (e) => { if (e.key === 'Enter' && com.value.trim()) modif((p) => { p.sequences[i].commentaires.push({ texte: com.value.trim(), date: Date.now() }); }); });
    z.append(el('div', { className: 'sequence', dataset: { niveau: 2, fonction: s.fonction, sequence: s.id } },
      el('div', { className: 'tete-seq' }, t, el('span', { className: 'badge-prov', textContent: SM.FONCTIONS[s.fonction] || s.fonction }), cpt,
        el('div', { className: 'outils-seq' }, bouton('↑', () => { const j = prevSeq(i); if (j >= 0) modif((p) => { [p.sequences[j], p.sequences[i]] = [p.sequences[i], p.sequences[j]]; }); }, { 'aria-label': 'Monter la séquence' }), bouton('↓', () => { const j = nextSeq(i); if (j >= 0) modif((p) => { [p.sequences[j], p.sequences[i]] = [p.sequences[i], p.sequences[j]]; }); }, { 'aria-label': 'Descendre la séquence' }),
          bouton('+ après', () => modif((p) => { p.sequences.splice(i + 1, 0, seqVide('progression')); }), { 'aria-label': 'Insérer une séquence après' }))),
      el('p', { className: 'consigne', textContent: s.objectif }), s.points?.length ? el('ul', { className: 'points-seq' }, ...s.points.map((id) => P.points.find((x) => x.id === id)).filter(Boolean).map((x) => el('li', {}, `${x.texte} `, el('span', { className: 'badge-prov', dataset: { prov: x.provenance }, textContent: PROVENANCES[x.provenance] || '' }), x.refTexte ? ` ${x.refTexte}` : ''))) : null,
      tx, el('details', { className: 'meta-seq' }, el('summary', { textContent: `Métadonnées · ${s.commentaires.length} commentaire(s)` }), el('div', { className: 'grille2' }, champ('Sources', refs), champ('Notes de montage', notes)), comicsUI.miniaturesRefs(s.refs), ...s.commentaires.map((c, k) => el('div', { className: 'rangee' }, el('span', { className: 'note', textContent: `${new Date(c.date).toLocaleString('fr-FR')} : ${c.texte}` }), bouton('✕', () => modif((p) => { p.sequences[i].commentaires.splice(k, 1); }), { className: 'petit' }))), com)));
  }
}
const prevSeq = (i) => { for (let j = i - 1; j >= 0; j--) if (P.sequences[j].niveau === 2) return j; return -1; };
const nextSeq = (i) => { for (let j = i + 1; j < P.sequences.length; j++) if (P.sequences[j].niveau === 2) return j; return -1; };

// ---------- 7. Analyse critique ----------
function vueCritique(z) {
  const lancer = () => { critique = SM.analyserScript(P, { profil: profilDe(P) }); const anc = new Map((P.decisions || []).map((d) => [d.cle, d.statut])); critique.problemes.forEach((x) => { const s = anc.get(cle(x)); if (s) x.statut = s; }); P.etapes = { ...(P.etapes || {}), critique: Date.now() }; sauverBientot(); afficher(); };
  if (!critique) critique = SM.analyserScript(P, { profil: profilDe(P) });
  const m = critique.mesure, pb = critique.problemes, ouverts = pb.filter((x) => x.statut === 'ouvert');
  z.append(el('div', { className: 'carte-bloc' }, el('h3', { textContent: 'Analyse critique' }),
    el('p', { className: 'note', textContent: 'Analyse par règles explicites (aucun modèle de langage) : longueur, clichés, répétitions, densité, hook, promesse, conclusion, budget. Chaque correction proposée doit être acceptée : rien n\'est modifié en silence.' }),
    el('div', { className: 'metriques' }, el('span', { textContent: `${m.mots} mots prononcés` }), el('span', { textContent: `dont dialogues ${m.dialogue}` }), el('span', { textContent: `parole ${SM.formatDuree(m.parole)}` }), el('span', { textContent: `pauses ${SM.formatDuree(m.pauses)}` }), el('span', { textContent: `extraits ${SM.formatDuree(m.extraits)}` }), el('span', { textContent: `silences ${SM.formatDuree(m.silences)}` }), el('span', { textContent: `total ${SM.formatDuree(m.total)} / ${SM.formatDuree(P.duree)}` })),
    el('div', { className: 'rangee' }, bouton('Relancer l\'analyse', lancer, { className: 'accent', id: 'lancer-critique' }), el('span', { className: 'note', textContent: `${ouverts.length} point(s) ouvert(s) sur ${pb.length}` }))),
    el('div', { className: 'carte-bloc' }, el('h3', { textContent: 'Rythme (indicatif)' }), courbe(critique.rythme), el('p', { className: 'note', textContent: 'Intensité déclarée par séquence (barres) et densité d\'informations mesurée (ligne). Une estimation pour équilibrer tension et respiration, pas une prédiction de rétention.' })),
    el('div', { className: 'liste-elements', id: 'problemes' }, ...pb.map((x) => { const s = P.sequences.find((y) => y.id === x.seq);
      return el('div', { className: 'ligne-element probleme', dataset: { gravite: x.gravite, statut: x.statut, type: x.type } }, el('div', { className: 'pile' }, el('b', { textContent: `${s ? s.titre + ' · ' : ''}${x.explication}` }), x.passage ? el('blockquote', { textContent: x.passage }) : null,
        x.correction.mode === 'remplacer' ? el('p', {}, 'Proposition : ', el('del', { textContent: x.correction.avant }), ' → ', el('ins', { textContent: x.correction.apres || '(supprimer)' })) : el('p', { className: 'note', textContent: x.correction.texte })),
        x.statut === 'ouvert' ? el('div', { className: 'pile' }, bouton(x.correction.mode === 'remplacer' ? 'Appliquer' : 'Noter', () => decider(x, 'accepte'), { className: 'accent petit', dataset: { accepter: x.id } }), bouton('Refuser', () => decider(x, 'refuse'), { className: 'petit' }), s ? bouton('Voir', () => { etape = 'script'; afficher(); setTimeout(() => document.querySelector(`[data-sequence="${s.id}"] textarea`)?.focus(), 50); }, { className: 'petit' }) : null) : el('span', { className: 'note', textContent: x.statut === 'accepte' ? 'Accepté' : 'Refusé' })); })),
    adaptations());
}
const cle = (x) => `${x.type}|${x.seq}|${x.passage}`;
function decider(x, statut) {
  modif((p) => { if (statut === 'accepte') { if (x.correction.mode === 'remplacer') { if (!SM.appliquerCorrection(p, x)) info('Le passage a changé depuis l\'analyse : correction non appliquée.'); } else { const s = p.sequences.find((y) => y.id === x.seq); if (s) s.commentaires.push({ texte: `Analyse : ${x.explication} — ${x.correction.texte}`, date: Date.now() }); } }
    p.decisions = [...(p.decisions || []).filter((d) => d.cle !== cle(x)), { cle: cle(x), statut }]; });
  x.statut = statut; afficher();
}
function courbe(r) {
  const W = 900, H = 160, n = Math.max(1, r.length), bw = W / n, maxD = Math.max(1, ...r.map((x) => x.densite)), ns = 'http://www.w3.org/2000/svg', svg = document.createElementNS(ns, 'svg');
  svg.setAttribute('viewBox', `0 0 ${W} ${H}`); svg.setAttribute('class', 'rythme'); svg.setAttribute('role', 'img'); svg.setAttribute('aria-label', 'Courbe de rythme : intensité par séquence et densité d\'informations');
  svg.innerHTML = r.map((x, i) => `<rect x="${i * bw + 2}" y="${H - 20 - (x.intensite / 5) * (H - 40)}" width="${Math.max(2, bw - 4)}" height="${(x.intensite / 5) * (H - 40)}" fill="${x.intensite >= 4 ? '#FFE500' : x.intensite <= 1 ? '#00C2FF' : '#5c5c55'}"><title>${x.titre} · intensité ${x.intensite} · ${x.mots}/${x.budget} mots</title></rect>`).join('')
    + `<polyline fill="none" stroke="#FF5A45" stroke-width="2" points="${r.map((x, i) => `${i * bw + bw / 2},${H - 20 - (x.densite / maxD) * (H - 40)}`).join(' ')}"/>` + `<text x="4" y="${H - 4}" fill="#A3A196" font-size="11" font-family="JetBrains Mono">début</text><text x="${W - 4}" y="${H - 4}" fill="#A3A196" font-size="11" text-anchor="end" font-family="JetBrains Mono">fin</text>`;
  return svg;
}
function adaptations() {
  const pf = choix(Object.fromEntries(Object.entries(SM.PLATEFORMES).map(([k, v]) => [k, v.nom])), 'shorts'), d = saisie('60 s', { 'aria-label': 'Durée de l\'adaptation' });
  return el('div', { className: 'carte-bloc' }, el('h3', { textContent: 'Adapter à une autre plateforme' }), el('p', { className: 'note', textContent: 'Crée un projet indépendant : plan reconstruit (hook, promesse, progression, conclusion), matière triée par importance. Le texte d\'origine est fourni en note, jamais simplement coupé.' }),
    el('div', { className: 'grille2' }, champ('Plateforme', pf), champ('Durée', d)), bouton('Créer l\'adaptation', async () => { const r = SM.adapter(P, { plateforme: pf.value, duree: SM.lireDuree(d.value), profil: profilDe(P) }); await sauver(); projets.unshift(r.projet); await db.ecrire('scripts', r.projet); await ouvrir(r.projet.id, 'plan'); info(`Adaptation créée${r.alertes.length ? ' · ' + r.alertes.join(' ') : ''}.`); }, { id: 'creer-adaptation' }));
}

// ---------- 8. Export ----------
function vueExport(z) {
  const apercu = el('textarea', { className: 'apercu-export', readOnly: true, id: 'apercu-export' }), controle = el('div', { className: 'carte-bloc controle-export', id: 'controle-export' }); let fmt = 'complet', ctl = { problemes: [], bloquants: 0 };
  kb.controler(P).then((r) => { ctl = r; controle.replaceChildren(el('h3', { textContent: 'Contrôle des sources' }), r.problemes.length ? el('ul', {}, ...r.problemes.map((x) => el('li', { dataset: { gravite: x.gravite }, textContent: x.message }))) : el('p', { className: 'note', textContent: 'Toute la matière issue des comics renvoie à des informations validées.' }), ...(r.bloquants ? [el('p', { className: 'moteur-statut', textContent: `${r.bloquants} information(s) non validée(s) : l'export sera marqué BROUILLON.` })] : [])); });
  const voir = async (f) => { fmt = f; apercu.value = SM.exporter(P, f, { profil: profilDe(P), comics: await comicsUI.infosRefs() }); z.querySelectorAll('[data-format]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.format === f))); };
  z.append(el('div', { className: 'carte-bloc' }, el('h3', { textContent: 'Exports pour la production' }), el('p', { className: 'note', textContent: 'Fichiers texte ouverts (Markdown, CSV, SRT, JSON) importables dans un traitement de texte, un tableur ou un logiciel de montage (les sous-titres SRT s\'importent dans Premiere Pro, DaVinci Resolve, CapCut). Aucune intégration directe à un logiciel de montage n\'est revendiquée.' }),
    el('div', { className: 'rangee' }, ...Object.entries(SM.EXPORTS).map(([k, n]) => bouton(n, () => voir(k), { dataset: { format: k } }))),
    apercu, el('div', { className: 'rangee' }, bouton('Télécharger', () => { if (ctl.bloquants && !confirm(`${ctl.bloquants} information(s) du script ne sont pas validées. Exporter quand même en BROUILLON ?`)) return; const contenu = ctl.bloquants && !['json', 'srt', 'montage'].includes(fmt) ? `BROUILLON — ${ctl.bloquants} information(s) non validée(s) à vérifier avant diffusion.\n\n${apercu.value}` : apercu.value; telecharger(contenu, `${slug(P.nom)}-${fmt}${ctl.bloquants ? '-brouillon' : ''}.${SM.EXT[fmt]}`, fmt === 'montage' ? 'text/csv;charset=utf-8' : 'text/plain;charset=utf-8'); P.etapes = { ...(P.etapes || {}), export: Date.now() }; sauverBientot(); }, { className: 'accent', id: 'telecharger-export' }), bouton('Copier', async () => { await navigator.clipboard?.writeText(apercu.value).catch(() => {}); info('Copié dans le presse-papiers.'); }))),
    controle, el('div', { className: 'carte-bloc' }, el('h3', { textContent: 'Correspondance script ↔ pages de comics' }), comicsUI.correspondance(P)));
  voir('complet');
}

// ---------- Profils d'écriture ----------
let profilCourant = null;
function listerProfils() { $('#liste-profils').replaceChildren(...profils.map((p) => el('li', {}, bouton(p.nom, () => editerProfil(p), { 'aria-pressed': String(profilCourant === p.id) })))); if (!profilCourant && profils[0]) editerProfil(profils[0]); }
$('#nouveau-profil').addEventListener('click', async () => { const p = { ...SM.PROFIL0, id: `pr${Date.now().toString(36)}`, nom: 'Nouveau profil' }; profils.push(p); await db.ecrire('redaction', p); editerProfil(p); });
function editerProfil(p) {
  profilCourant = p.id; listerProfils();
  const ch = (k, lab, input) => { input.addEventListener('input', async () => { p[k] = input.type === 'number' ? +input.value : /preferees|aEviter/.test(k) ? input.value.split(';').map((x) => x.trim()).filter(Boolean) : input.value; await db.ecrire('redaction', p); info('Profil enregistré.'); if (k === 'nom') listerProfils(); }); return champ(lab, input); };
  $('#profil').replaceChildren(el('div', { className: 'carte-bloc' }, el('h3', { textContent: 'Profil d\'écriture' }), el('p', { className: 'note', textContent: 'Réutilisable par chaîne, format ou projet. La vitesse règle le budget de mots ; les expressions à éviter sont signalées par l\'analyse critique ; l\'ensemble est transmis aux prompts.' }),
    el('div', { className: 'grille2' }, ch('nom', 'Nom', saisie(p.nom, { id: 'profil-nom' })), ch('langue', 'Langue', choix({ fr: 'Français', en: 'Anglais' }, p.langue)), ch('ton', 'Ton', saisie(p.ton)), ch('style', 'Style oral', saisie(p.style)), ch('niveau', 'Niveau de langage', saisie(p.niveau)), ch('humour', 'Humour', saisie(p.humour)),
      ch('profondeur', 'Profondeur', choix(PROFONDEURS, p.profondeur)), ch('vulgarisation', 'Vulgarisation', saisie(p.vulgarisation)), ch('wpm', 'Vitesse (mots/min)', el('input', { type: 'number', min: 90, max: 220, value: p.wpm, id: 'profil-wpm' })), ch('complexite', 'Complexité', saisie(p.complexite))),
    ch('preferees', 'Expressions préférées (séparées par ;)', saisie((p.preferees || []).join(' ; '))), ch('aEviter', 'Expressions à éviter (séparées par ;)', saisie((p.aEviter || []).join(' ; '), { id: 'profil-eviter' })),
    p.id !== 'defaut' ? bouton('Supprimer ce profil', async () => { if (!confirm('Supprimer ce profil ?')) return; await db.suppr('redaction', p.id); profils = profils.filter((x) => x !== p); profilCourant = null; listerProfils(); }, { className: 'danger' }) : null));
}

// ---------- Démarrage ----------
await Promise.all(['400 40px Anton', '700 40px "JetBrains Mono"', '700 40px Archivo'].map((f) => document.fonts.load(f).catch(() => {})));
await charger();
kb = initConnaissances({ file, libelleComic: (c) => `${c.serie || 'Sans série'} #${c.numero || '?'}`, ocr: () => ocrUI, ouvrirPage: (c, i) => comicsUI.ouvrir(c, i) });
ocrUI = initOcr({ file, kb, ouvrirMoteurs: () => document.querySelector('[data-espace="moteurs"]').click(), ouvrirPage: (c, i) => comicsUI.ouvrir(c, i) });
moteursUI = initMoteurs({ file, jetonAdresse: jetonAdresse.jeton, ocr: ocrUI });
if (jetonAdresse.ancien) setTimeout(() => info('Ancienne adresse avec jeton ignorée : utiliser celle affichée par le serveur, ou saisir le jeton dans Moteurs.'), 0);
comicsUI = initComics({ rafraichirProjet: () => P && afficher(), projet: () => P, modif, kb, file, ocr: ocrUI });
// Traitements : diagnostic de la file (fil principal) et détection des cases d'un numéro entier (Web Worker)
file.enregistrer('diagnostic', { nom: 'Diagnostic de la file', async executer(t, { signal, progres }) { const n = t.params.etapes || 10; for (let i = t.curseur || 0; i < n; i++) { if (signal.aborted) throw Object.assign(new Error('annulé'), { name: 'AbortError' }); await new Promise((r) => setTimeout(r, t.params.pause ?? 200)); if (t.params.echouerA === i + 1) throw new Error(`échec volontaire à l'étape ${i + 1}`); progres((i + 1) / n, `Étape ${i + 1}/${n}`, i + 1); } return { etapes: n }; } });
file.enregistrer('cases-numero', { nom: 'Détection des cases d\'un numéro', worker: true, async apres() { await comicsUI.charger(); if (!$('#comics').hidden) comicsUI.afficher(); } });
promptsUI = initPrompts({ projets: () => projets, profilDe, critique: () => critique });
await comicsUI.charger(); await kb.charger();
lister(); persister(); await file.demarrer(); if (await kb.migrerSiNecessaire()) info('Reprise des analyses existantes dans la base de connaissances (traitement en arrière-plan).');
const qid = new URLSearchParams(location.search).get('projet'); if (qid && projets.some((x) => x.id === qid)) await ouvrir(qid);
espace(['comics', 'profils', 'prompts', 'connaissances', 'moteurs'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'projets');
if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('../sw.js').catch(() => {});
window.__script = { SM, db, projet: () => P, sauver, ouvrir, file, kb };   // utilisé par les tests automatisés
