// Production éditoriale · assistant local, campagnes et calendrier, profils de direction artistique, bibliothèque.
// Tout reste sur l'appareil (IndexedDB partagée avec Motion Studio) ; aucune IA externe, aucun envoi, aucune publication automatique.
import { db, persister } from '../motion/stockage.js';
import { zip } from '../motion/zip.js';
import { creerRendu } from '../motion/rendu-canvas.js';
import { rendreScene, instantPose, changerPlan, normaliserDoc, nouvelId, adapter, plansDe } from '../../templates/_systeme/studio.js';
import { SYSTEMES, JETONS, format as fmt } from '../../templates/_systeme/studio-systemes.js';
import { analyser, planifierCampagne, titresPour, TYPES, FORMATS_ASSISTANT } from '../../templates/_systeme/studio-assistant.js';
import { composer, FORMATS_COMPOSITEUR } from '../../templates/_systeme/studio-compositeur.js';
import { PERSONNAGES, UNIVERS, trouverPersonnage } from '../../templates/_systeme/studio-personnages.js';
import { analyserPixels, proposerProfil } from './analyse-da.js';
import PH from '../../templates/_systeme/placeholders.js';

const $ = (s, r = document) => r.querySelector(s);
const el = (tag, { dataset, ...p } = {}, ...k) => { const e = Object.assign(document.createElement(tag), p); if (dataset) Object.assign(e.dataset, dataset); e.append(...k.flat().filter((x) => x !== null && x !== undefined && x !== false)); return e; };
const bouton = (txt, fn, p = {}) => { const b = el('button', { type: 'button', textContent: txt, ...p }); b.addEventListener('click', fn); return b; };
const champ = (label, input) => el('label', { className: 'champ' }, label, input);
const choix = (opts, val) => { const s = el('select', {}, ...Object.entries(opts).map(([v, t]) => el('option', { value: v, textContent: t }))); s.value = val ?? ''; return s; };
const info = (m) => { $('#etat').textContent = m; };
const slug = (s) => String(s || 'sans-titre').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'sans-titre';
export const STATUTS = { idee: 'Idée', 'a-produire': 'À produire', 'en-cours': 'En cours', 'a-valider': 'À valider', valide: 'Validé', exporte: 'Exporté' };
const FORMATS = Object.fromEntries(Object.entries(FORMATS_ASSISTANT));
const NOMS_TYPES = Object.fromEntries(Object.entries(TYPES).map(([k, v]) => [k, v.nom]));
const EXEMPLES = ['Fais-moi un VS entre Black Panther et Batman.', 'Prépare une miniature YouTube sur les origines de Galactus.', 'Crée une publication Instagram sur le retour d\'un personnage Marvel.', 'Fais-moi une affiche cinématographique consacrée à Superman.',
  'Prépare une série de publications sur les événements cosmiques Marvel.', 'Transforme cette miniature en carrousel Instagram.', 'Prépare tout le mois de février avec un super-héros noir différent chaque jour.', 'Fais une campagne éditoriale autour de la prochaine grande série DC.'];

// ---------- Rendu (même moteur que Motion Studio) ----------
const rendu = creerRendu(), ressources = new Map();
const placeholder = (n) => (PH[n] ? { href: '../../' + PH[n].src, w: PH[n].w, h: PH[n].h } : null);
const opts = { placeholder, ressource: (id) => ressources.get(id), police: (id) => { const r = ressources.get(id); return r ? { fam: r.fam } : null; }, final: true };
// Image d'une création (plan k pour un carrousel), côté max en px
async function image(doc, max = 360, k = 0, type = 'image/jpeg') {
  let d = doc; if (k && doc.plans?.length > 1) { d = JSON.parse(JSON.stringify(doc)); changerPlan(d, k); }
  const sc = rendreScene(d, instantPose(d), opts), e = Math.min(1, max / Math.max(sc.w, sc.h)), c = Object.assign(document.createElement('canvas'), { width: Math.round(sc.w * e), height: Math.round(sc.h * e) });
  await rendu.precharger(sc); rendu.dessiner(c.getContext('2d'), sc, e); return c;
}
const vignette = async (doc) => (await image(doc, 320)).toDataURL('image/jpeg', 0.72);
const octets = (c) => new Promise((ok) => c.toBlob(async (b) => ok(new Uint8Array(await b.arrayBuffer())), 'image/png'));
const telecharger = (data, nom, type = 'application/zip') => { const a = el('a', { href: URL.createObjectURL(new Blob([data], { type })), download: nom }); document.body.append(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 2000); };
// PNG pleine définition d'une création (une image par diapositive pour un carrousel)
async function fichiersPNG(doc, base) {
  const n = doc.plans?.length > 1 ? doc.plans.length : 1, out = [];
  for (let k = 0; k < n; k++) out.push({ nom: `${base}${n > 1 ? `-${String(k + 1).padStart(2, '0')}` : ''}.png`, data: await octets(await image(doc, 8192, k, 'image/png')) });
  return out;
}

// ---------- Création et enregistrement ----------
const profilDoc = (p) => (p ? { id: p.id, systeme: p.systeme, palette: p.palette, couleurs: p.couleurs } : undefined);
function briefDe(o) {
  return { type: o.type, titre: o.titre, sousTitre: o.sousTitre || '', rubrique: o.rubrique || '', univers: o.univers || null, repere: o.repere || '', items: o.items || [], citation: o.citation || '',
    personnages: (o.personnages || (o.personnage ? [o.personnage] : [])).filter(Boolean).map((n) => ({ nom: n, univers: trouverPersonnage(n)?.univers || null })) };
}
async function enregistrer(doc, { dossier, origine } = {}) {
  const d = normaliserDoc(doc); d.dossier = dossier || d.dossier; d.origine = { ...(doc.origine || {}), source: origine || 'assistant' }; d.modifie = Date.now();
  const o = JSON.parse(JSON.stringify(d)); o.apercu = await vignette(d); await db.ecrire('creations', o); return o;
}
const ouvrirStudio = (id) => { location.href = `../motion/?creation=${encodeURIComponent(id)}`; };

// ---------- Onglets ----------
function onglet(nom) {
  for (const b of document.querySelectorAll('[data-onglet]')) { const actif = b.dataset.onglet === nom; b.setAttribute('aria-selected', actif); $(`#${b.dataset.onglet}`).hidden = !actif; }
  if (location.hash !== `#${nom}`) history.replaceState(null, '', `#${nom}`);
  ({ campagnes: listerCampagnes, profils: listerProfils, bibliotheque: listerCreations })[nom]?.();
}
document.querySelectorAll('[data-onglet]').forEach((b) => b.addEventListener('click', () => onglet(b.dataset.onglet)));

// ================= Assistant =================
let profils = [], prop = null, minuterie = 0;
$('#exemples').append(...EXEMPLES.map((x) => bouton(x, () => { $('#demande-texte').value = x; $('#demande').requestSubmit(); })));
$('#demande').addEventListener('submit', (ev) => { ev.preventDefault(); const t = $('#demande-texte').value.trim(); if (!t) return $('#demande-texte').focus(); proposer(analyser(t)); });

async function proposer(res) {
  profils = await db.tous('profils').catch(() => []);
  prop = { ...res, titre: res.titres[0] || '', profil: profils.find((p) => p.niveau === 'marque')?.id || '', repere: '', items: [] };
  const z = $('#proposition'); z.hidden = false;
  const formulaire = el('div', { className: 'pile' }), apercus = el('div', { className: 'apercus', id: 'apercus' });
  const m = [...res.manques.map((x) => el('li', { dataset: { niveau: 'manque' }, textContent: x })), ...res.verifier.map((x) => el('li', { dataset: { niveau: 'verifier' }, textContent: x }))];
  if (res.campagne) {
    const c = res.campagne;
    formulaire.append(el('h2', { className: 'titre-section', textContent: 'Campagne proposée' }), el('p', { textContent: `${c.publications.length} publications du ${dateFr(c.debut)} au ${dateFr(c.fin)}, ${new Set(c.publications.map((p) => p.personnage)).size} personnages différents, angles variés.` }),
      el('ul', { className: 'messages' }, ...c.manques.map((x) => el('li', { dataset: { niveau: 'manque' }, textContent: x })), el('li', { dataset: { niveau: 'verifier' }, textContent: 'Chaque publication est marquée « à vérifier » : les faits éditoriaux ne sont jamais inventés.' })),
      champ('Profil DA de la campagne', choixProfil(prop.profil, (v) => { prop.profil = v; })),
      el('div', { className: 'rangee' }, bouton('Créer la campagne', async () => { const camp = { ...c, id: nouvelId('k'), nom: c.nom, profil: prop.profil, statut: 'brouillon', cree: Date.now() }; await db.ecrire('campagnes', camp); courante = camp.id; onglet('campagnes'); info(`Campagne « ${camp.nom} » créée.`); }, { className: 'accent', id: 'creer-campagne' })));
    apercus.append(...c.publications.slice(0, 6).map((p) => el('figure', {}, el('canvas', { dataset: { pub: p.id } }), el('figcaption', { textContent: `${dateFr(p.date)} · ${p.personnage}` }))));
    z.replaceChildren(formulaire, el('div', {}, el('h3', { textContent: 'Premières publications' }), apercus));
    for (const p of c.publications.slice(0, 6)) { const cv = apercus.querySelector(`[data-pub="${p.id}"]`), src = await image(composer(briefDe(p), p.format, { profil: profilDe(prop.profil) }), 440); cv.replaceWith(src); }
    return;
  }
  if (res.declinaison) {
    const crea = (await db.tous('creations').catch(() => [])).sort((a, b) => (b.modifie || 0) - (a.modifie || 0)), sel = choix(Object.fromEntries(crea.map((c) => [c.id, `${c.nom} · ${c.format.w}×${c.format.h}`])), crea[0]?.id);
    formulaire.append(el('h2', { className: 'titre-section', textContent: 'Déclinaison' }), champ('Création source', sel), formatsCoches(), el('p', { className: 'note', textContent: 'Une création issue de l\'assistant est recomposée pour chaque support (carrousel : couverture et diapositives). Une création libre est adaptée par ancrages, à retoucher.' }),
      bouton('Décliner et ouvrir', async () => { const src = crea.find((c) => c.id === sel.value); if (!src) return info('Aucune création source.'); const ids = [];
        for (const f of prop.formats) { const d = src.brief ? composer(src.brief, f, { profil: { systeme: src.systeme, palette: src.palette, couleurs: src.couleurs, id: src.profil } }) : (() => { const nf = fmt(FORMATS_COMPOSITEUR[f] || f), a = adapter(normaliserDoc(src), nf); return { ...normaliserDoc(src), id: nouvelId('c'), elements: a.elements, format: nf }; })();
          d.nom = `${src.nom} · ${FORMATS[f] || f}`; ids.push((await enregistrer(d, { dossier: src.dossier || src.nom, origine: 'assistant' })).id); }
        ouvrirStudio(ids[0]); }, { className: 'accent', disabled: !crea.length }));
    z.replaceChildren(formulaire, el('div', {}, el('ul', { className: 'messages' }, ...(crea.length ? [] : [el('li', { dataset: { niveau: 'manque' }, textContent: 'Aucune création enregistrée sur cet appareil : en créer une d\'abord.' })]))));
    return;
  }
  const typeSel = choix(NOMS_TYPES, prop.type), persos = el('input', { type: 'text', value: prop.personnages.join(', '), id: 'p-personnages', autocomplete: 'off' }), univ = choix(UNIVERS, prop.univers);
  const titre = el('input', { type: 'text', value: prop.titre, id: 'p-titre', autocomplete: 'off' }), titres = el('datalist', { id: 'p-titres' }, ...res.titres.map((x) => el('option', { value: x }))); titre.setAttribute('list', 'p-titres');
  const sous = el('input', { type: 'text', value: prop.sousTitre, id: 'p-sous-titre', autocomplete: 'off' }), repere = el('input', { type: 'text', placeholder: 'Date, numéro… à vérifier', id: 'p-repere', autocomplete: 'off' });
  const items = el('textarea', { rows: 4, placeholder: 'Un élément par ligne (classement, chronologie, sélection…)', id: 'p-items' });
  const lier = (i, k, f = (v) => v) => i.addEventListener(i.tagName === 'SELECT' ? 'change' : 'input', () => { prop[k] = f(i.value); apercu(); });
  lier(typeSel, 'type'); lier(persos, 'personnages', (v) => v.split(/[,;]+/).map((x) => x.trim()).filter(Boolean)); lier(univ, 'univers'); lier(titre, 'titre'); lier(sous, 'sousTitre'); lier(repere, 'repere'); lier(items, 'items', (v) => v.split('\n').map((x) => x.trim()).filter(Boolean));
  typeSel.addEventListener('change', () => { const [A, B] = prop.personnages; titres.replaceChildren(...titresPour(prop.type, A, B).map((x) => el('option', { value: x }))); });
  formulaire.append(el('h2', { className: 'titre-section', textContent: 'Proposition' }), el('div', { className: 'grille2' }, champ('Type de contenu', typeSel), champ('Ambiance d\'univers', univ)), champ('Personnages (séparés par des virgules)', persos),
    champ('Titre', titre), titres, champ('Accroche', sous), el('div', { className: 'grille2' }, champ('Repère factuel (affiché tel quel)', repere), champ('Profil DA', choixProfil(prop.profil, (v) => { prop.profil = v; apercu(); }))), champ('Éléments de liste', items),
    el('h3', { textContent: 'Formats' }), formatsCoches(), el('ul', { className: 'messages', id: 'messages' }, ...m),
    el('div', { className: 'rangee' }, bouton('Créer et ouvrir dans Motion Studio', () => produire(true), { className: 'accent', id: 'creer-ouvrir' }), bouton('Enregistrer dans la bibliothèque', () => produire(false), { id: 'creer-enregistrer' })),
    el('p', { className: 'note', textContent: 'Les illustrations sont des emplacements : remplacez-les par vos visuels dans Motion Studio. Aucune image de personnage n\'est générée, aucun fait n\'est inventé.' }));
  z.replaceChildren(formulaire, el('div', {}, el('h3', { textContent: 'Aperçus par format' }), apercus));
  apercu();
}
function formatsCoches() {
  return el('div', { className: 'formats' }, ...Object.entries(FORMATS).map(([f, n]) => { const c = el('input', { type: 'checkbox', checked: prop.formats.includes(f), value: f });
    c.addEventListener('change', () => { prop.formats = Object.keys(FORMATS).filter((k) => (k === f ? c.checked : prop.formats.includes(k))); apercu(); }); return el('label', {}, c, n); }));
}
const profilDe = (id) => profilDoc(profils.find((p) => p.id === id));
function choixProfil(val, fn) { const s = choix({ '': 'Direction par défaut du type', ...Object.fromEntries(profils.map((p) => [p.id, `${p.nom} (${p.niveau})`])) }, val); s.addEventListener('change', () => fn(s.value)); return s; }
function apercu() {
  clearTimeout(minuterie); minuterie = setTimeout(async () => { const z = $('#apercus'); if (!z) return; const b = briefDe(prop), figs = [];
    for (const f of prop.formats) { const d = composer(b, f, { profil: profilDe(prop.profil) }), n = d.plans?.length || 1, cv = await image(d, 520);
      figs.push(el('figure', { dataset: { format: f } }, cv, el('figcaption', { textContent: `${FORMATS[f] || f} · ${d.format.w}×${d.format.h}${n > 1 ? ` · ${n} diapositives` : ''}` }))); }
    z.replaceChildren(...figs); }, 120);
}
async function produire(ouvrir) {
  if (!prop.formats.length) return info('Choisir au moins un format.');
  const b = briefDe(prop), ids = [];
  for (const f of prop.formats) { const d = composer(b, f, { profil: profilDe(prop.profil) }); d.nom = `${prop.titre || NOMS_TYPES[prop.type]} · ${FORMATS[f] || f}`; ids.push((await enregistrer(d, { dossier: prop.titre, origine: 'assistant' })).id); }
  info(`${ids.length} création(s) enregistrée(s).`); if (ouvrir) ouvrirStudio(ids[0]); else onglet('bibliotheque');
}

// ================= Campagnes =================
let courante = null, selectionPubs = new Set(), annulation = null, vue = 'calendrier';
const dateFr = (iso) => new Date(iso + 'T12:00:00Z').toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' });
const isoPlus = (iso, n) => new Date(Date.parse(iso + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);
$('#nc-debut').value = new Date().toISOString().slice(0, 10);
$('#nc-format').append(...Object.entries(FORMATS).map(([v, t]) => el('option', { value: v, textContent: t }))); $('#nc-format').value = '4:5';
$('#form-campagne').addEventListener('submit', async (ev) => { ev.preventDefault();
  const [k, v] = ($('#nc-filtre').value || ':').split(':'), c = planifierCampagne({ theme: $('#nc-nom').value, debut: $('#nc-debut').value, jours: Math.max(1, Math.min(62, +$('#nc-jours').value || 7)), filtre: k ? { [k]: v } : null, formats: [$('#nc-format').value] });
  const camp = { ...c, id: nouvelId('k'), nom: $('#nc-nom').value || c.nom, statut: 'brouillon', cree: Date.now() }; await db.ecrire('campagnes', camp); courante = camp.id; $('#nouvelle-campagne').open = false; listerCampagnes(); info(`Campagne « ${camp.nom} » planifiée : ${camp.publications.length} publications.`); });

async function listerCampagnes() {
  const cs = (await db.tous('campagnes').catch(() => [])).sort((a, b) => (b.cree || 0) - (a.cree || 0)); profils = await db.tous('profils').catch(() => []);
  $('#liste-campagnes').replaceChildren(...cs.map((c) => el('li', {}, bouton('', () => { courante = c.id; selectionPubs.clear(); listerCampagnes(); }, { 'aria-pressed': String(c.id === courante) }))));
  [...$('#liste-campagnes').querySelectorAll('button')].forEach((b, i) => b.append(el('span', { textContent: cs[i].nom }), el('small', { textContent: `${cs[i].publications.length} · ${cs[i].statut === 'validee' ? 'validée' : 'brouillon'}` })));
  if (!courante && cs.length) courante = cs[0].id;
  const c = cs.find((x) => x.id === courante); if (c) afficherCampagne(c);
}
const sauverCampagne = async (c, msg) => { c.modifie = Date.now(); c.publications.sort((a, b) => a.date.localeCompare(b.date)); c.fin = c.publications.at(-1)?.date || c.debut; c.debut = c.publications[0]?.date || c.debut; await db.ecrire('campagnes', c); if (msg) info(msg); afficherCampagne(c); };
// Opération par lot réversible : instantané de la campagne et des créations touchées
async function lot(c, nom, fn) { annulation = { nom, campagne: JSON.parse(JSON.stringify(c)), creations: [] }; await fn(annulation); await sauverCampagne(c, `${nom} : fait. « Annuler » rétablit l'état précédent.`); }

function afficherCampagne(c) {
  const z = $('#campagne'), compte = Object.fromEntries(Object.keys(STATUTS).map((s) => [s, c.publications.filter((p) => p.statut === s).length]));
  const nom = el('input', { type: 'text', value: c.nom, 'aria-label': 'Nom de la campagne' }); nom.addEventListener('change', () => { c.nom = nom.value; sauverCampagne(c); listerCampagnes(); });
  const prof = choixProfil(c.profil || '', (v) => lot(c, 'Profil appliqué à la campagne', async (a) => { c.profil = v; await reappliquerProfil(c, c.publications, a); }));
  const sel = c.publications.filter((p) => selectionPubs.has(p.id)), tout = el('input', { type: 'checkbox', checked: sel.length === c.publications.length && sel.length > 0, 'aria-label': 'Tout sélectionner' });
  tout.addEventListener('change', () => { selectionPubs = new Set(tout.checked ? c.publications.map((p) => p.id) : []); afficherCampagne(c); });
  const statutLot = choix({ '': 'Statut…', ...STATUTS }), formatLot = choix({ '': 'Format…', ...FORMATS }), profilLot = choix({ '': 'Profil DA…', ...Object.fromEntries(profils.map((p) => [p.id, p.nom])) }), decal = el('input', { type: 'number', value: 1, style: 'width:70px', 'aria-label': 'Décalage en jours' });
  statutLot.addEventListener('change', () => statutLot.value && lot(c, 'Statut modifié', async () => { sel.forEach((p) => { p.statut = statutLot.value; }); }));
  formatLot.addEventListener('change', () => formatLot.value && lot(c, 'Format modifié', async () => { sel.forEach((p) => { p.format = formatLot.value; p.creation = null; }); }));
  profilLot.addEventListener('change', () => profilLot.value && lot(c, 'Profil appliqué à la sélection', async (a) => { sel.forEach((p) => { p.profil = profilLot.value; }); await reappliquerProfil(c, sel, a); }));
  const barre = el('div', { className: 'barre-lot', role: 'toolbar', 'aria-label': 'Actions sur la sélection' }, el('label', { className: 'rangee' }, tout, el('span', { className: 'compte', textContent: `${sel.length} sélectionnée(s)` })),
    statutLot, formatLot, profilLot, el('span', { className: 'rangee' }, decal, bouton('Décaler', () => lot(c, 'Dates décalées', async () => { sel.forEach((p) => { p.date = isoPlus(p.date, +decal.value || 0); }); }), { disabled: !sel.length })),
    bouton('Produire', () => produireLot(c, sel), { disabled: !sel.length, id: 'lot-produire' }), bouton('Valider', () => lot(c, 'Publications validées', async () => { sel.forEach((p) => { p.statut = 'valide'; p.refus = false; }); }), { disabled: !sel.length }),
    bouton('Dupliquer', () => lot(c, 'Publications dupliquées', async () => { for (const p of sel) c.publications.push({ ...p, id: nouvelId('pub'), titre: `${p.titre} (variante)`, statut: 'idee', creation: null }); }), { disabled: !sel.length }),
    bouton('Exporter (ZIP)', () => exporterLot(c, sel), { disabled: !sel.length, id: 'lot-exporter', className: 'accent' }),
    bouton('Supprimer', () => confirm(`Supprimer ${sel.length} publication(s) ?`) && lot(c, 'Publications supprimées', async () => { c.publications = c.publications.filter((p) => !selectionPubs.has(p.id)); selectionPubs.clear(); }), { disabled: !sel.length, className: 'danger' }),
    bouton(annulation ? `Annuler : ${annulation.nom}` : 'Annuler', () => annuler(c), { disabled: !annulation || annulation.campagne.id !== c.id, id: 'lot-annuler' }));
  const contenu = vue === 'calendrier' ? calendrier(c) : el('div', { className: 'liste-pubs' }, ...c.publications.map((p) => cartePub(c, p)));
  z.replaceChildren(
    el('div', { className: 'entete-campagne' }, champ('Campagne', nom), champ('Profil DA', prof), champ('Période', el('output', { textContent: `${dateFr(c.debut)} → ${dateFr(c.fin)}` }))),
    el('div', { className: 'compteurs' }, ...Object.entries(STATUTS).map(([s, n]) => el('span', { dataset: { statut: s }, textContent: `${n} ${compte[s]}` })), el('span', { textContent: c.statut === 'validee' ? 'Campagne validée' : 'Brouillon' })),
    el('div', { className: 'rangee' }, bouton('Calendrier', () => { vue = 'calendrier'; afficherCampagne(c); }, { 'aria-pressed': String(vue === 'calendrier') }), bouton('Liste', () => { vue = 'liste'; afficherCampagne(c); }, { 'aria-pressed': String(vue === 'liste') }),
      bouton('Ajouter une publication', () => lot(c, 'Publication ajoutée', async () => { const d = c.publications.at(-1)?.date ? isoPlus(c.publications.at(-1).date, 1) : c.debut; c.publications.push({ id: nouvelId('pub'), date: d, personnage: '', univers: 'urbain', type: 'portrait', titre: 'À définir', format: c.publications[0]?.format || '4:5', statut: 'idee', verifier: true, note: '' }); }), { id: 'ajouter-pub' }),
      bouton(c.statut === 'validee' ? 'Rouvrir la campagne' : 'Valider la campagne', () => { const reste = c.publications.filter((p) => !['valide', 'exporte'].includes(p.statut)).length; if (c.statut !== 'validee' && reste && !confirm(`${reste} publication(s) ne sont pas validées. Valider quand même la campagne ?`)) return; c.statut = c.statut === 'validee' ? 'brouillon' : 'validee'; sauverCampagne(c, 'Statut de la campagne mis à jour.'); listerCampagnes(); }),
      bouton('Dupliquer la campagne', async () => { const n = { ...JSON.parse(JSON.stringify(c)), id: nouvelId('k'), nom: `${c.nom} (copie)`, statut: 'brouillon', cree: Date.now() }; n.publications.forEach((p) => { p.id = nouvelId('pub'); p.creation = null; p.statut = 'idee'; }); await db.ecrire('campagnes', n); courante = n.id; listerCampagnes(); }),
      bouton('Calendrier (CSV)', () => telecharger(csv(c), `${slug(c.nom)}-calendrier.csv`, 'text/csv')),
      bouton('Supprimer la campagne', async () => { if (!confirm(`Supprimer la campagne « ${c.nom} » ? Les créations produites restent dans la bibliothèque.`)) return; await db.suppr('campagnes', c.id); courante = null; $('#campagne').replaceChildren(el('p', { className: 'vide', textContent: 'Campagne supprimée.' })); listerCampagnes(); }, { className: 'danger' })),
    barre, contenu);
  vignettesPubs(c);
}
function calendrier(c) {
  const g = el('div', { className: 'calendrier', role: 'grid', 'aria-label': 'Calendrier éditorial' }), parJour = Object.groupBy ? Object.groupBy(c.publications, (p) => p.date) : c.publications.reduce((o, p) => ((o[p.date] ||= []).push(p), o), {});
  const d0 = new Date(c.debut + 'T00:00:00Z'), d1 = new Date(c.fin + 'T00:00:00Z');
  for (let m = new Date(Date.UTC(d0.getUTCFullYear(), d0.getUTCMonth(), 1)); m <= d1; m = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1))) {
    g.append(el('div', { className: 'mois', textContent: m.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric', timeZone: 'UTC' }) }), ...['lun', 'mar', 'mer', 'jeu', 'ven', 'sam', 'dim'].map((j) => el('div', { className: 'jour-sem', textContent: j })));
    const dec = (m.getUTCDay() + 6) % 7, n = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 0)).getUTCDate();
    for (let i = 0; i < dec; i++) g.append(el('div', { className: 'jour hors', 'aria-hidden': 'true' }));
    for (let j = 1; j <= n; j++) { const iso = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth(), j)).toISOString().slice(0, 10), pubs = parJour[iso] || [], hors = iso < c.debut || iso > c.fin;
      const cell = el('div', { className: `jour${hors && !pubs.length ? ' hors' : ''}`, role: 'gridcell', dataset: { date: iso } }, el('span', { className: 'num', textContent: `${j}`, dataset: { jour: dateFr(iso) } }), ...pubs.map((p) => cartePub(c, p)));
      // Glisser-déposer : changer la date d'une publication
      cell.addEventListener('dragover', (e) => e.preventDefault()); cell.addEventListener('drop', (e) => { e.preventDefault(); const id = e.dataTransfer.getData('text/plain'), p = c.publications.find((x) => x.id === id); if (p && p.date !== iso) lot(c, 'Date modifiée', async () => { p.date = iso; }); });
      g.append(cell); }
  }
  return g;
}
function cartePub(c, p) {
  const cb = el('input', { type: 'checkbox', checked: selectionPubs.has(p.id), 'aria-label': `Sélectionner ${p.titre}` });
  cb.addEventListener('click', (e) => e.stopPropagation()); cb.addEventListener('change', () => { cb.checked ? selectionPubs.add(p.id) : selectionPubs.delete(p.id); afficherCampagne(c); });
  const b = el('div', { className: 'carte-pub', role: 'button', tabIndex: 0, draggable: true, dataset: { statut: p.statut, pub: p.id } }, cb, el('img', { alt: '', dataset: { vignette: p.id } }), el('span', { className: 't', textContent: p.titre }),
    el('span', { className: 'p', textContent: `${vue === 'liste' ? dateFr(p.date) + ' · ' : ''}${p.personnage || 'personnage à choisir'} · ${FORMATS[p.format] || p.format}` }), el('span', { className: 'badge', dataset: { statut: p.statut }, textContent: STATUTS[p.statut] + (p.refus ? ' · refusée' : '') }));
  b.addEventListener('click', () => editerPub(c, p)); b.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); editerPub(c, p); } });
  b.addEventListener('dragstart', (e) => e.dataTransfer.setData('text/plain', p.id));
  return b;
}
// Document d'une publication : la création produite (avec les retouches faites dans Motion Studio), sinon une composition calculée
async function docPub(c, p) { if (p.creation) { const d = await db.lire('creations', p.creation); if (d) return d; } const d = composer(briefDe(p), p.format, { profil: profilDe(p.profil || c.profil) }); d.nom = p.titre; return d; }
let jeton = 0;
async function vignettesPubs(c) {
  const j = ++jeton;
  for (const p of c.publications) { if (j !== jeton) return; const img = document.querySelector(`[data-vignette="${p.id}"]`); if (!img) continue;
    const d = await docPub(c, p); img.src = d.apercu || (await image(d, 240)).toDataURL('image/jpeg', 0.7); }
}
async function reappliquerProfil(c, pubs, a) {
  // Les créations déjà produites gardent leur composition : seules les couleurs et le système changent
  for (const p of pubs) { if (!p.creation) continue; const d = await db.lire('creations', p.creation); if (!d) continue; a.creations.push(JSON.parse(JSON.stringify(d)));
    const pr = profils.find((x) => x.id === (p.profil || c.profil)); if (pr) { d.systeme = pr.systeme; if (pr.palette) d.palette = pr.palette; d.couleurs = { ...pr.couleurs }; d.profil = pr.id; } else { d.couleurs = {}; delete d.profil; }
    d.apercu = await vignette(normaliserDoc(d)); await db.ecrire('creations', d); }
}
async function annuler(c) {
  if (!annulation) return; const a = annulation; annulation = null; Object.keys(c).forEach((k) => delete c[k]); Object.assign(c, a.campagne);
  for (const d of a.creations) await db.ecrire('creations', d); await db.ecrire('campagnes', c); info(`Annulé : ${a.nom}.`); afficherCampagne(c);
}
async function produireLot(c, pubs) {
  await lot(c, `${pubs.length} publication(s) produite(s)`, async () => { let i = 0;
    for (const p of pubs) { info(`Production ${++i}/${pubs.length}…`); if (p.creation && await db.lire('creations', p.creation)) continue;
      const d = composer(briefDe(p), p.format, { profil: profilDe(p.profil || c.profil) }); d.nom = `${p.date} · ${p.titre}`; d.campagne = { id: c.id, pub: p.id };
      p.creation = (await enregistrer(d, { dossier: c.nom, origine: 'campagne' })).id; if (['idee', 'a-produire', 'en-cours'].includes(p.statut)) p.statut = 'a-valider'; } });
}
async function exporterLot(c, pubs) {
  const fichiers = [], refusees = pubs.filter((p) => p.refus); let i = 0;
  for (const p of pubs) { info(`Export ${++i}/${pubs.length}…`); const d = normaliserDoc(await docPub(c, p)); fichiers.push(...await fichiersPNG(d, `${p.date}_${slug(p.titre)}`)); }
  fichiers.push({ nom: 'calendrier.csv', data: csv({ ...c, publications: pubs }) });
  telecharger(zip(fichiers), `${slug(c.nom)}.zip`);
  await lot(c, `${pubs.length} publication(s) exportée(s)`, async () => { pubs.forEach((p) => { if (!p.refus) p.statut = 'exporte'; }); });
  if (refusees.length) info(`${refusees.length} publication(s) refusée(s) exportée(s) sans changer leur statut.`);
}
const csv = (c) => '﻿date;titre;personnage;type;format;statut;note\n' + c.publications.map((p) => [p.date, p.titre, p.personnage, NOMS_TYPES[p.type] || p.type, FORMATS[p.format] || p.format, STATUTS[p.statut], (p.note || '').replace(/\n/g, ' ')].map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`).join(';')).join('\n');

// Éditeur d'une publication
function editerPub(c, p) {
  const dlg = $('#editeur-pub'), f = $('#form-pub'), w = { ...p };
  const date = el('input', { type: 'date', value: p.date }), perso = el('input', { type: 'text', value: p.personnage, autocomplete: 'off' }), liste = el('datalist', { id: 'ep-persos' }, ...PERSONNAGES.map((x) => el('option', { value: x.nom }))); perso.setAttribute('list', 'ep-persos');
  const type = choix(NOMS_TYPES, p.type), titre = el('input', { type: 'text', value: p.titre }), sous = el('input', { type: 'text', value: p.sousTitre || '' }), format = choix(FORMATS, p.format), statut = choix(STATUTS, p.statut), note = el('textarea', { rows: 2, value: p.note || '' });
  const img = el('img', { className: 'apercu-pub', alt: 'Aperçu de la publication' });
  const maj = async () => { Object.assign(w, { date: date.value, personnage: perso.value.trim(), type: type.value, titre: titre.value, sousTitre: sous.value, format: format.value, statut: statut.value, note: note.value, univers: trouverPersonnage(perso.value)?.univers || p.univers });
    const d = p.creation && w.format === p.format ? await docPub(c, p) : composer(briefDe(w), w.format, { profil: profilDe(p.profil || c.profil) }); img.src = (await image(normaliserDoc(d), 640)).toDataURL('image/jpeg', 0.8); };
  for (const i of [date, perso, type, titre, sous, format]) i.addEventListener('change', maj);
  const remplacer = () => { const pris = new Set(c.publications.map((x) => x.personnage)), cand = PERSONNAGES.filter((x) => !pris.has(x.nom) && (!c.filtre?.tag || x.tags.includes(c.filtre.tag)) && (!c.filtre?.editeur || x.editeur === c.filtre.editeur));
    const n = cand[Math.floor(Math.random() * cand.length)]; if (!n) return info('Aucun autre personnage disponible pour ce thème.'); perso.value = n.nom; titre.value = titresPour(type.value, n.nom)[0]; maj(); };
  const enregistrerPub = async (extra = {}) => { const avant = p.creation, chang = w.format !== p.format || w.personnage !== p.personnage || w.type !== p.type; Object.assign(p, w, extra); if (chang && avant) p.creation = null; dlg.close(); await sauverCampagne(c, 'Publication enregistrée.'); };
  const deplacer = (k) => { const i = c.publications.indexOf(p), q = c.publications[i + k]; if (!q) return; [p.date, q.date] = [q.date, p.date]; dlg.close(); sauverCampagne(c, 'Ordre modifié.'); };
  f.replaceChildren(el('h2', { className: 'titre-section', id: 'ep-titre', textContent: 'Publication' }), img,
    el('div', { className: 'grille2' }, champ('Date', date), champ('Format', format), champ('Personnage', perso), champ('Type', type), champ('Statut', statut)), liste, champ('Titre', titre), champ('Accroche', sous), champ('Note de production', note),
    p.verifier ? el('p', { className: 'note', textContent: 'À vérifier : aucun fait n\'est ajouté automatiquement ; compléter les repères (dates, numéros) dans Motion Studio.' }) : null,
    el('div', { className: 'rangee' }, bouton('Enregistrer', () => enregistrerPub(), { className: 'accent' }), bouton('Valider', () => enregistrerPub({ statut: 'valide', refus: false })), bouton('Refuser', () => enregistrerPub({ statut: 'a-produire', refus: true })),
      bouton('Remplacer le personnage', remplacer), bouton('↑ Plus tôt', () => deplacer(-1)), bouton('↓ Plus tard', () => deplacer(1)),
      bouton('Ouvrir dans Motion Studio', async () => { Object.assign(p, w); if (!p.creation || !(await db.lire('creations', p.creation))) { const d = composer(briefDe(p), p.format, { profil: profilDe(p.profil || c.profil) }); d.nom = `${p.date} · ${p.titre}`; d.campagne = { id: c.id, pub: p.id }; p.creation = (await enregistrer(d, { dossier: c.nom, origine: 'campagne' })).id; }
        if (['idee', 'a-produire'].includes(p.statut)) p.statut = 'en-cours'; await db.ecrire('campagnes', c); ouvrirStudio(p.creation); }),
      bouton('Dupliquer', () => { c.publications.push({ ...w, id: nouvelId('pub'), titre: `${w.titre} (variante)`, statut: 'idee', creation: null }); dlg.close(); sauverCampagne(c, 'Publication dupliquée.'); }),
      bouton('Supprimer', () => { if (!confirm('Supprimer cette publication ?')) return; c.publications = c.publications.filter((x) => x !== p); dlg.close(); sauverCampagne(c, 'Publication supprimée.'); }, { className: 'danger' }),
      bouton('Fermer', () => dlg.close())));
  dlg.showModal(); maj();
}

// ================= Profils DA =================
let profilCourant = null;
async function listerProfils() {
  profils = await db.tous('profils').catch(() => []);
  $('#liste-profils').replaceChildren(...profils.sort((a, b) => (b.cree || 0) - (a.cree || 0)).map((p) => el('li', {}, bouton('', () => editerProfil(p), { 'aria-pressed': String(profilCourant?.id === p.id) }))));
  [...$('#liste-profils').querySelectorAll('button')].forEach((b, i) => b.append(el('span', { textContent: profils[i].nom }), el('span', { className: 'nuancier' }, ...Object.values(profils[i].couleurs).slice(0, 6).map((x) => el('span', { style: `background:${x};width:14px;height:14px` })))));
}
$('#profil-image').addEventListener('change', async (ev) => {
  const fic = ev.target.files[0]; ev.target.value = ''; if (!fic) return;
  try { const bm = await createImageBitmap(fic), k = Math.min(1, 480 / Math.max(bm.width, bm.height)), c = Object.assign(document.createElement('canvas'), { width: Math.round(bm.width * k), height: Math.round(bm.height * k) }), g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(bm, 0, 0, c.width, c.height); const a = analyserPixels(g.getImageData(0, 0, c.width, c.height).data, c.width, c.height), p = proposerProfil(a, { nom: fic.name.replace(/\.[^.]+$/, '') });
    const v = Math.min(1, 320 / Math.max(c.width, c.height)), r = Object.assign(document.createElement('canvas'), { width: Math.round(c.width * v), height: Math.round(c.height * v) }); r.getContext('2d').drawImage(c, 0, 0, r.width, r.height);
    editerProfil({ ...p, id: nouvelId('d'), reference: r.toDataURL('image/jpeg', 0.75), cree: Date.now(), nouveau: true }); info('Référence analysée sur l\'appareil. Vérifier puis enregistrer le profil.');
  } catch (e) { info(`Image illisible (${e.message}).`); }
});
$('#profil-vide').addEventListener('click', () => { const sy = SYSTEMES.comics, pal = Object.keys(sy.palettes)[0]; editerProfil({ id: nouvelId('d'), nom: 'Nouveau profil', niveau: 'marque', systeme: 'comics', palette: pal, couleurs: Object.fromEntries(Object.keys(JETONS).map((k) => [k, sy.palettes[pal][k]])), cree: Date.now(), nouveau: true }); });
function editerProfil(p0) {
  const p = JSON.parse(JSON.stringify(p0)); profilCourant = p; const z = $('#profil'), apercus = el('div', { className: 'apercus' });
  const nom = el('input', { type: 'text', value: p.nom, id: 'pr-nom' }), niveau = choix({ marque: 'Identité de marque', campagne: 'Direction de campagne', creation: 'Direction de création' }, p.niveau), sy = choix(Object.fromEntries(Object.entries(SYSTEMES).map(([k, v]) => [k, v.nom])), p.systeme);
  const couleurs = Object.entries(JETONS).map(([k, n]) => { const i = el('input', { type: 'color', value: p.couleurs[k] || '#000000' }); i.addEventListener('input', () => { p.couleurs[k] = i.value.toUpperCase(); rendreApercus(); }); return champ(n, i); });
  nom.addEventListener('input', () => { p.nom = nom.value; }); niveau.addEventListener('change', () => { p.niveau = niveau.value; }); sy.addEventListener('change', () => { p.systeme = sy.value; p.palette = Object.keys(SYSTEMES[sy.value].palettes)[0]; rendreApercus(); });
  const typo = el('textarea', { rows: 2, value: [p.typographie?.note, p.traitement?.note].filter(Boolean).join(' ') || '' }); typo.addEventListener('input', () => { p.notes = typo.value; });
  const m = p.mesures, jauge = (n, v, t) => [el('span', { textContent: n }), el('meter', { min: 0, max: 1, value: Math.abs(v) }), el('span', { textContent: t })];
  const rendreApercus = async () => { const pr = { systeme: p.systeme, palette: p.palette, couleurs: p.couleurs }, figs = [];
    for (const [b, f] of [[{ type: 'portrait', titre: 'Titre d\'impact', sousTitre: 'Une accroche éditoriale', personnages: [{ nom: 'Personnage' }] }, 'miniature'], [{ type: 'versus', personnages: [{ nom: 'Héros' }, { nom: 'Rival' }] }, '4:5'], [{ type: 'classement', titre: 'Le classement' }, '9:16']])
      figs.push(el('figure', {}, await image(composer(b, f, { profil: pr }), 420), el('figcaption', { textContent: `${NOMS_TYPES[b.type]} · ${FORMATS[f]}` })));
    apercus.replaceChildren(...figs); };
  z.replaceChildren(el('div', { className: 'profil-grille' },
    el('div', { className: 'pile' }, p.reference ? el('img', { className: 'reference', src: p.reference, alt: 'Image de référence' }) : null,
      p.nuancier ? el('div', {}, el('h3', { textContent: 'Palette mesurée' }), el('div', { className: 'nuancier' }, ...p.nuancier.map((x) => el('span', { style: `background:${x}`, title: x })))) : null,
      m ? el('div', {}, el('h3', { textContent: 'Mesures' }), el('div', { className: 'jauges' }, ...jauge('Luminosité', m.luminosite, Math.round(m.luminosite * 100) + ' %'), ...jauge('Contraste', m.contraste * 2, Math.round(m.contraste * 100) + ' %'), ...jauge('Saturation', m.saturation, Math.round(m.saturation * 100) + ' %'),
        ...jauge('Texture', Math.min(1, m.texture * 3), Math.round(m.texture * 100) + ' %'), ...jauge('Température', (m.temperature + 1) / 2, m.temperature > 0.1 ? 'chaude' : m.temperature < -0.1 ? 'froide' : 'neutre')),
        el('p', { className: 'note', textContent: `Lumière ${m.lumiere} · sujet ${p.composition?.sujet || 'indéterminé'} (masse ${Math.round((m.sujet?.masse || 0) * 100)} %) · ${m.orientation}.` })) : null,
      el('ul', { className: 'messages' }, ...(p.alertes || []).map((x) => el('li', { dataset: { niveau: 'manque' }, textContent: x })), el('li', { dataset: { niveau: 'verifier' }, textContent: 'Polices, traitement des personnages et intention ne se mesurent pas : ils restent vos choix (notes ci-contre).' }))),
    el('div', { className: 'pile' }, el('div', { className: 'grille2' }, champ('Nom du profil', nom), champ('Niveau', niveau), champ('Système graphique de base', sy)), el('h3', { textContent: 'Couleurs (jetons de la composition)' }), el('div', { className: 'grille2' }, ...couleurs),
      champ('Typographie et traitement (notes)', typo),
      el('div', { className: 'rangee' }, bouton('Enregistrer le profil', async () => { delete p.nouveau; p.modifie = Date.now(); await db.ecrire('profils', p); info(`Profil « ${p.nom} » enregistré.`); listerProfils(); }, { className: 'accent', id: 'pr-enregistrer' }),
        bouton('Dupliquer', async () => { const n = { ...JSON.parse(JSON.stringify(p)), id: nouvelId('d'), nom: `${p.nom} (copie)`, cree: Date.now() }; delete n.nouveau; await db.ecrire('profils', n); listerProfils(); editerProfil(n); }),
        bouton('Supprimer', async () => { if (!confirm(`Supprimer le profil « ${p.nom} » ? Les créations gardent leurs couleurs.`)) return; await db.suppr('profils', p.id); profilCourant = null; z.replaceChildren(el('p', { className: 'vide', textContent: 'Profil supprimé.' })); listerProfils(); }, { className: 'danger' })),
      el('h3', { textContent: 'Le profil appliqué à trois compositions' }), apercus)));
  rendreApercus(); listerProfils();
}

// ================= Bibliothèque =================
let creations = [], choixBiblio = new Set();
async function listerCreations() {
  creations = (await db.tous('creations').catch(() => [])).sort((a, b) => (b.modifie || b.cree || 0) - (a.modifie || a.cree || 0));
  const cs = await db.tous('campagnes').catch(() => []), fset = [...new Set(creations.map((c) => c.format?.id).filter(Boolean))];
  const ff = $('#filtre-format'), fc = $('#filtre-campagne'), vf = ff.value, vc = fc.value;
  ff.replaceChildren(el('option', { value: '', textContent: 'Tous les formats' }), ...fset.map((f) => el('option', { value: f, textContent: f }))); ff.value = vf;
  fc.replaceChildren(el('option', { value: '', textContent: 'Toutes campagnes' }), ...cs.map((c) => el('option', { value: c.id, textContent: c.nom }))); fc.value = vc;
  filtrer();
}
const texteDe = (c) => [c.nom, c.dossier, c.brief?.titre, ...(c.brief?.personnages || []).map((p) => p.nom)].join(' ').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
function filtrer() {
  const q = $('#recherche').value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim(), f = $('#filtre-format').value, o = $('#filtre-origine').value, k = $('#filtre-campagne').value;
  const vis = creations.filter((c) => (!q || texteDe(c).includes(q)) && (!f || c.format?.id === f) && (!k || c.campagne?.id === k) && (!o || (o === 'manuel' ? !c.origine?.source : c.origine?.source === o)));
  $('#biblio-resume').textContent = `${vis.length} création(s) sur ${creations.length}${choixBiblio.size ? ` · ${choixBiblio.size} sélectionnée(s)` : ''}.`;
  $('#biblio-export').disabled = !choixBiblio.size;
  $('#creations').replaceChildren(...vis.map((c) => { const cb = el('input', { type: 'checkbox', checked: choixBiblio.has(c.id) }); cb.addEventListener('change', () => { cb.checked ? choixBiblio.add(c.id) : choixBiblio.delete(c.id); filtrer(); });
    return el('li', { className: 'carte', dataset: { creation: c.id } }, el('label', { className: 'choix' }, cb, 'Sélectionner'), el('img', { src: c.apercu || '', alt: '' }),
      el('div', { className: 'infos' }, el('b', { textContent: c.nom }), el('span', { className: 'note', textContent: `${c.format?.w}×${c.format?.h}${c.plans?.length > 1 ? ` · ${c.plans.length} plans` : ''}${c.dossier ? ` · ${c.dossier}` : ''}` })),
      el('div', { className: 'actions' }, bouton('Ouvrir', () => ouvrirStudio(c.id), { className: 'accent' }), bouton('PNG', async () => { const fs = await fichiersPNG(normaliserDoc(c), slug(c.nom)); fs.length === 1 ? telecharger(fs[0].data, fs[0].nom, 'image/png') : telecharger(zip(fs), `${slug(c.nom)}.zip`); }),
        bouton('Dupliquer', async () => { await db.ecrire('creations', { ...JSON.parse(JSON.stringify(c)), id: nouvelId('c'), nom: `${c.nom} (copie)`, modifie: Date.now() }); listerCreations(); }),
        bouton('Supprimer', async () => { if (!confirm(`Supprimer « ${c.nom} » ? Cette action est définitive.`)) return; await db.suppr('creations', c.id); choixBiblio.delete(c.id); listerCreations(); }, { className: 'danger' }))); }));
}
['#recherche', '#filtre-format', '#filtre-origine', '#filtre-campagne'].forEach((s) => $(s).addEventListener('input', filtrer));
$('#biblio-export').addEventListener('click', async () => { const fs = []; let i = 0; for (const c of creations.filter((x) => choixBiblio.has(x.id))) { info(`Export ${++i}/${choixBiblio.size}…`); fs.push(...await fichiersPNG(normaliserDoc(c), slug(c.nom))); } telecharger(zip(fs), 'primestone-selection.zip'); info(`${fs.length} image(s) exportée(s).`); });

// ---------- Démarrage ----------
await Promise.all(['400 40px Anton', '700 40px "JetBrains Mono"', '700 40px Archivo', 'italic 400 40px "Instrument Serif"'].map((f) => document.fonts.load(f).catch(() => {})));
for (const r of await db.tous('ressources').catch(() => [])) ressources.set(r.id, r);
persister();
onglet(['campagnes', 'profils', 'bibliotheque'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'assistant');
if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('../sw.js').catch(() => {});
window.__production = { analyser, composer, planifierCampagne, db, zip, STATUTS };   // utilisé par les tests automatisés
