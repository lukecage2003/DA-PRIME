// Motion Studio · bibliothèque : créations (dossiers, recherche), modèles, composants, formes, typographies, effets,
// ressources locales (images, polices) et fichiers (projets, bibliothèque complète).
import { S, ajouter, nouvelElement } from './etat.js';
import { el, bouton } from './proprietes.js';
import { db } from './stockage.js';
import { MODELES, creerElement, normaliserEl, nouvelId, FORMATS_STUDIO } from '../../templates/_systeme/studio.js';
import { COMPOSANTS } from '../../templates/_systeme/studio-composants.js';
import { SYSTEMES, ROLES_TEXTE } from '../../templates/_systeme/studio-systemes.js';
import { FORMES } from '../../templates/_systeme/studio-formes.js';
import { EFFETS_LIB, CATEGORIES_EFFETS } from '../../templates/_systeme/studio-effets.js';

const ONGLETS = { creations: 'Mes créations', modeles: 'Modèles', composants: 'Composants', formes: 'Formes et bulles', textes: 'Typographie', effets: 'Effets', ressources: 'Ressources', fichiers: 'Fichiers' };
const ONOMATOPEES = ['BOUM !', 'KRAK', 'ZAP !', 'VLAN !', 'BAM !', 'SPLASH', 'WHAM !', 'CRAC !', 'FIOUU…', 'BZZZT'];

export function initBibliotheque(ctx) {
  const dlg = document.querySelector('#bibliotheque'), corps = document.querySelector('#contenu-biblio'), tabs = document.querySelector('#onglets-biblio');
  let courant = 'creations', filtre = { dossier: '', q: '' };
  tabs.replaceChildren(...Object.entries(ONGLETS).map(([k, v]) => { const b = bouton(v, () => afficher(k), { role: 'tab' }); b.dataset.onglet = k; return b; }));
  dlg.querySelector('[data-fermer]').addEventListener('click', () => dlg.close());
  const fermerApres = (fn) => (...a) => { fn(...a); dlg.close(); };
  const carte = (titre, sous, img, ...actions) => el('div', { className: 'carte' }, img, el('strong', { textContent: titre }), sous ? el('small', { textContent: sous }) : null, el('div', { className: 'rangee' }, ...actions));
  const vignette = (src) => (src ? el('img', { src, alt: '' }) : el('div', { style: 'aspect-ratio:16/9;background:#222' }));
  async function afficher(k = courant) {
    courant = k; for (const b of tabs.querySelectorAll('button')) b.setAttribute('aria-selected', String(b.dataset.onglet === k));
    corps.replaceChildren(el('p', { className: 'info', textContent: 'Chargement…' }));
    corps.replaceChildren(...(await ({ creations, modeles, composants, formes, textes, effets, ressources, fichiers })[k]()));
  }
  const nouveauBloc = () => { const f = el('select', { id: 'nouveau-format' }, ...Object.entries(FORMATS_STUDIO).map(([k, v]) => el('option', { value: k, textContent: `${v.nom} · ${v.w} × ${v.h}` }))), s = el('select', { id: 'nouveau-systeme' }, ...Object.entries(SYSTEMES).map(([k, v]) => el('option', { value: k, textContent: v.nom })));
    f.value = S.doc.format.id in FORMATS_STUDIO ? S.doc.format.id : '16:9'; s.value = S.doc.systeme; return { f, s, bloc: el('div', { className: 'grille3' }, el('label', { className: 'champ' }, 'Format', f), el('label', { className: 'champ' }, 'Système graphique', s)) }; };
  async function creations() {
    const toutes = (await db.tous('creations')).sort((a, b) => (b.modifie || 0) - (a.modifie || 0)), dossiers = [...new Set(toutes.map((c) => c.dossier || '').filter(Boolean))].sort();
    const n = nouveauBloc(), ds = el('select', { id: 'filtre-dossier' }, el('option', { value: '', textContent: 'Tous les dossiers' }), ...dossiers.map((d) => el('option', { value: d, textContent: d }))), q = el('input', { type: 'text', placeholder: 'Rechercher', value: filtre.q, id: 'filtre-nom' });
    ds.value = filtre.dossier; ds.addEventListener('change', () => { filtre.dossier = ds.value; afficher(); }); q.addEventListener('change', () => { filtre.q = q.value; afficher(); });
    const liste = toutes.filter((c) => (!filtre.dossier || c.dossier === filtre.dossier) && (!filtre.q || (c.nom || '').toLowerCase().includes(filtre.q.toLowerCase())));
    return [el('h3', { textContent: 'Nouvelle création' }), n.bloc, el('div', { className: 'rangee' }, bouton('Page blanche', fermerApres(() => ctx.nouvelle({ format: n.f.value, systeme: n.s.value })), { id: 'page-blanche' })),
      el('h3', { textContent: `Mes créations (${toutes.length})` }), el('div', { className: 'grille2' }, el('label', { className: 'champ' }, 'Dossier', ds), el('label', { className: 'champ' }, 'Recherche', q)),
      el('div', { className: 'cartes', id: 'liste-creations' }, ...liste.map((c) => carte(c.nom || 'Sans titre', `${c.dossier ? c.dossier + ' · ' : ''}${c.format?.w ? `${c.format.w} × ${c.format.h}` : 'MVP'} · ${new Date(c.modifie || 0).toLocaleDateString('fr-FR')}`, vignette(c.apercu),
        bouton('Ouvrir', fermerApres(() => ctx.ouvrir(c.id)), { className: 'ouvrir' }), bouton('Dupliquer', async () => { await ctx.dupliquerCreation(c.id); afficher(); }),
        bouton('Supprimer', async () => { if (confirm(`Supprimer « ${c.nom} » de cet appareil ?`)) { await ctx.supprimerCreation(c.id); afficher(); } }))))];
  }
  async function modeles() {
    const n = nouveauBloc(), perso = await db.tous('modeles');
    return [el('p', { className: 'info', textContent: 'Les modèles créent une nouvelle création entièrement éditable (textes, calques, animations) au format choisi.' }), n.bloc,
      el('h3', { textContent: 'Modèles intégrés' }), el('div', { className: 'cartes', id: 'modeles-integres' }, ...Object.entries(MODELES).map(([id, m]) => { const d = el('select', {}, ...m.directions.map((x) => el('option', { value: x.id, textContent: x.nom })));
        return carte(m.nom, m.description, null, el('label', { className: 'champ' }, 'Direction', d), bouton('Créer', fermerApres(() => ctx.depuisModele(id, d.value, n.f.value)), { dataset: { modele: id } })); })),
      el('h3', { textContent: `Mes modèles (${perso.length})` }), perso.length ? el('div', { className: 'cartes' }, ...perso.map((m) => carte(m.nom, `${m.doc.format.w} × ${m.doc.format.h}`, vignette(m.apercu), bouton('Créer', fermerApres(() => ctx.depuisModelePerso(m))), bouton('Supprimer', async () => { await db.suppr('modeles', m.id); afficher(); })))) : el('p', { className: 'info', textContent: 'Document > Organisation > « Enregistrer comme modèle ».' })];
  }
  async function composants() {
    const perso = await db.tous('composants'), cats = [...new Set(Object.values(COMPOSANTS).map((c) => c.cat))];
    return [...cats.flatMap((cat) => [el('h3', { textContent: cat }), el('div', { className: 'cartes' }, ...Object.entries(COMPOSANTS).filter(([, c]) => c.cat === cat).map(([id, c]) => carte(c.nom, null, null, bouton('Insérer', fermerApres(() => ajouter(c.creer(S.doc))), { dataset: { composant: id } }))))]),
      el('h3', { textContent: `Mes composants (${perso.length})` }), perso.length ? el('div', { className: 'cartes' }, ...perso.map((c) => carte(c.nom, `${c.elements.length} élément(s)`, vignette(c.apercu), bouton('Insérer', fermerApres(() => ctx.insererComposant(c))), bouton('Supprimer', async () => { await db.suppr('composants', c.id); afficher(); })))) : el('p', { className: 'info', textContent: 'Sélectionner des éléments puis « Enregistrer comme composant ».' })];
  }
  const formes = async () => [el('div', { className: 'cartes' }, ...Object.entries(FORMES).map(([k, v]) => carte(v, null, null, bouton('Insérer', fermerApres(() => nouvelElement('forme', { forme: k })), { dataset: { forme: k } }))))];
  const textes = async () => [el('h3', { textContent: `Hiérarchie (${SYSTEMES[S.doc.systeme].nom})` }), el('div', { className: 'cartes' }, ...Object.entries(ROLES_TEXTE).map(([k, v]) => carte(v, null, null, bouton('Insérer', fermerApres(() => nouvelElement('texte', { role: k })), { dataset: { role: k } })))),
    el('h3', { textContent: 'Onomatopées' }), el('div', { className: 'cartes' }, ...ONOMATOPEES.map((o) => carte(o, null, null, bouton('Insérer', fermerApres(() => nouvelElement('texte', { role: 'onomatopee', contenu: o }))))))];
  const effets = async () => CATEGORIES_EFFETS.flatMap((c) => [el('h3', { textContent: c }), el('div', { className: 'cartes' }, ...Object.entries(EFFETS_LIB).filter(([, e]) => e.cat === c).map(([k, e]) => carte(e.nom, null, null, bouton('Insérer', fermerApres(() => nouvelElement('effet', { effet: k })), { dataset: { effet: k } }))))]);
  async function ressources() {
    const r = [...S.ressources.values()], imgs = r.filter((x) => x.type === 'image'), pol = r.filter((x) => x.type === 'police');
    return [el('div', { className: 'rangee' }, bouton('Importer des illustrations…', () => ctx.importerImages()), bouton('Importer une police…', () => ctx.importerPolice())),
      el('p', { className: 'info', textContent: 'Les originaux sont conservés tels quels sur l\'appareil (au-delà de 4096 px de côté, une copie de travail réduite est créée). Les polices importées restent locales : vérifier leur licence avant toute diffusion.' }),
      el('h3', { textContent: `Illustrations (${imgs.length})` }), el('div', { className: 'cartes', id: 'liste-ressources' }, ...imgs.map((x) => carte(x.nom, `${x.w} × ${x.h}`, vignette(x.href), bouton('Insérer', fermerApres(() => ctx.insererImage(x.id)))))),
      el('h3', { textContent: `Polices importées (${pol.length})` }), el('div', { className: 'cartes' }, ...pol.map((x) => carte(x.nom, x.fam, null)))];
  }
  async function fichiers() {
    const p = await navigator.storage?.persisted?.().catch(() => false), est = await navigator.storage?.estimate?.().catch(() => null);
    return [el('h3', { textContent: 'Création ouverte' }), el('div', { className: 'rangee' }, bouton('Enregistrer le projet (.motion.json)', () => ctx.enregistrerProjet(), { id: 'enregistrer-projet' }), bouton('Ouvrir un projet…', () => ctx.ouvrirProjet(), { id: 'ouvrir-projet' })),
      el('p', { className: 'info', textContent: 'Le fichier de projet contient la composition, les illustrations et les polices importées : il se rouvre sur un autre appareil sans perte.' }),
      el('h3', { textContent: 'Toute la bibliothèque' }), el('div', { className: 'rangee' }, bouton('Exporter la bibliothèque', () => ctx.exporterBibliotheque(), { id: 'exporter-bibliotheque' }), bouton('Importer une bibliothèque…', () => ctx.ouvrirProjet())),
      el('p', { className: 'info', textContent: `Stockage de l'appareil : ${p ? 'persistant (protégé du nettoyage automatique)' : 'non garanti par le navigateur — exporter régulièrement'}${est ? ` · ${(est.usage / 1048576).toFixed(1)} Mo utilisés` : ''}.` })];
  }
  return { ouvrir(k) { dlg.showModal(); afficher(k || courant); }, afficher };
}
export { creerElement, normaliserEl, nouvelId };
