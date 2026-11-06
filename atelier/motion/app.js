// Motion Studio · application : rendu de l'aperçu, lecture, sauvegarde automatique et versions, imports (illustrations, polices,
// projets), composants et modèles personnels, raccourcis clavier. Tout reste sur l'appareil : aucun serveur, aucune API externe.
import { S, ecouter, notifier, modifier, charger, selectionner, selection, premier, ajouter, supprimer, dupliquer, grouper, degrouper, copier, coller, annuler, retablir, deplacer, nouvelElement } from './etat.js';
import { rendreScene, rendreSequence, dureeTotale, debutPlan, planA, changerPlan, synchroniserPlans, ajouterPlan, supprimerPlan, plansDe, TRANSITIONS, instantPose, docDepuisModele, nouveauDocument, normaliserDoc, normaliserEl, creerElement, adapter, idRessource, nouvelId, parcourir } from '../../templates/_systeme/studio.js';
import { palette, resoudre } from '../../templates/_systeme/studio-systemes.js';
import { mesureMetriques } from '../../templates/_systeme/studio-texte.js';
import PH from '../../templates/_systeme/placeholders.js';
import M from '../../templates/_systeme/metrics.js';
import T from '../../templates/_systeme/tokens.js';
import { creerRendu } from './rendu-canvas.js';
import { initScene } from './scene.js';
import { initPanneaux, el, bouton } from './proprietes.js';
import { initSequenceur } from './sequenceur.js';
import { initBibliotheque } from './bibliotheque.js';
import { initExports, MIME_TEMPS_REEL } from './exports.js';
import { db, persister, migrer, paquetProjet, lirePaquet, paquetBibliotheque, importerBibliotheque, enregistrerVersion, versionsDe, ressourcesUtilisees } from './stockage.js';
import * as TR from './traitements.js';
import { icone, poserIcones } from './icones.js';
poserIcones();

const $ = (s) => document.querySelector(s), DERNIERE = 'primestone-motion-derniere', MAX_COTE_SOURCE = 4096;
const rendu = creerRendu(), cv = $('#apercu'), g = cv.getContext('2d');
const placeholder = (n) => (PH[n] ? { href: '../../' + PH[n].src, w: PH[n].w, h: PH[n].h } : null);
const mc = document.createElement('canvas').getContext('2d');
const mesure = (t, police, taille, ls = 0) => { if (!police.startsWith('f:')) return mesureMetriques(t, police, taille, ls); const r = S.ressources.get(police.slice(2)); mc.font = `${taille}px "${r?.fam || 'sans-serif'}"`; return mc.measureText(t).width + ls * Math.max(0, [...t].length - 1); };
const col = (v) => resoudre(v, palette(S.doc));
const traitee = (e) => { const t = e.image.traitement, res = S.ressources.get(e.image.src); if (!TR.actif(t) || !res) return null; const r = TR.lire(e.image.src, t, col); if (r) return r; TR.preparer(res, e.image.src, t, col, () => dessiner()).catch(() => {}); return null; };
const opts = (o = {}) => ({ mesure, traitee, police: (id) => { const r = S.ressources.get(id); return r ? { fam: r.fam } : null; }, ressource: (id) => S.ressources.get(id), placeholder, ...o });
const scene = (t, o) => rendreScene(S.doc, t, opts(o));
const sequence = (t, o) => rendreSequence(S.doc, t, opts(o));
const total = () => dureeTotale(S.doc), debut = () => debutPlan(S.doc);
// Scène prête pour l'export : traitements d'images calculés avant le rendu
async function scenePrete(t, o) { const p = []; parcourir(S.doc.elements, (e) => { if (e.type === 'image' && e.image.src && TR.actif(e.image.traitement)) { const r = S.ressources.get(e.image.src); if (r) p.push(TR.preparer(r, e.image.src, e.image.traitement, col)); } }); await Promise.all(p); return t === null || o?.final ? scene(t, o) : sequence(t, o); }

// ---------- Contexte partagé avec les modules ----------
const ctx = {
  rendu, scenePrete, dessiner: () => dessiner(), arreter: () => arreter(), jouer: (t) => jouer(t), positionner: (t) => { arreter(); S.auto = false; S.t = Math.max(0, Math.min(total(), t)); const k = planA(S.doc, S.t).i; if (S.doc.plans && k !== S.doc.planActif) allerAuPlan(k, false); dessiner(); },
  duree: total, debut, local: () => S.t - debut(), vignette: (d) => vignette(d),
  editerTexte: () => { panneaux.onglet('proprietes'); setTimeout(() => { const z = $('#champ-contenu'); z?.focus(); z?.select(); }, 30); },
  apresGeste: () => panneaux.rafraichir(), telecharger, importerImages: () => { cible = null; $('#fichier-image').click(); }, importerPolice, remplacerImage: (e) => { cible = e.id; $('#fichier-image').removeAttribute('multiple'); $('#fichier-image').click(); },
  insererImage: (id) => { const r = S.ressources.get(id); ajouter(elementImage(r, id)); }, enregistrerComposant, insererComposant, enregistrerModele, depuisModelePerso, enregistrerPreset, presets: () => presets,
  enregistrerVersion: async () => { const n = prompt('Nom de la version', `Version du ${new Date().toLocaleString('fr-FR')}`); if (n === null) return; await sauverMaintenant(); await enregistrerVersion(S.doc, n || 'Version'); ctx.listerVersions(); info('Version enregistrée.'); },
  listerVersions, declinaison, nouvelle, ouvrir, depuisModele, depuisSignature, dupliquerCreation, supprimerCreation, enregistrerProjet, ouvrirProjet: () => $('#fichier-projet').click(), exporterBibliotheque,
};
let presets = [], cible = null;
const vue = initScene(ctx), panneaux = initPanneaux(ctx), seq = initSequenceur(ctx), biblio = initBibliotheque(ctx), exp = initExports(ctx);

// ---------- Rendu de l'aperçu ----------
let planifie = false;
function dessiner() {
  if (planifie || !S.doc) return; planifie = true;
  requestAnimationFrame(async () => {
    planifie = false; const e = vue.dimensionner();
    if (S.auto && !S.lecture) S.t = debut() + instantPose(S.doc);
    const sc = S.lecture ? sequence(S.t) : scene(Math.max(0, S.t - debut())); await rendu.precharger(sc); rendu.dessiner(g, sc, e); S.derniere = sc;
    vue.dessiner(); seq.tete();
    $('#temps').max = total(); $('#temps').value = S.t; $('#temps-lu').textContent = `${S.t.toFixed(1).replace('.', ',')} s / ${String(Math.round(total() * 10) / 10).replace('.', ',')} s`;
    if (!S.lecture) alertes(sc.alertes);
  });
}
function alertes(al) {
  const NIV = { erreur: 'Erreur', attention: 'Attention', info: 'Info' }, o = { erreur: 0, attention: 1, info: 2 }, l = [...al].sort((a, b) => o[a.niveau] - o[b.niveau]);
  $('#alertes').replaceChildren(...(l.length ? l.map((a) => { const li = el('li', { dataset: { niveau: a.niveau } }, el('b', { textContent: NIV[a.niveau] }), a.message); if (a.id) li.addEventListener('click', () => selectionner(a.id)); return li; }) : [el('li', { textContent: 'Aucun problème détecté.' })]));
  const n = (x) => al.filter((a) => a.niveau === x).length, er = n('erreur'), at = n('attention'), r = $('#resume');
  r.dataset.niveau = er ? 'erreur' : at ? 'attention' : 'ok'; r.textContent = er || at ? [er && `${er} erreur${er > 1 ? 's' : ''}`, at && `${at} point${at > 1 ? 's' : ''} d'attention`].filter(Boolean).join(' · ') : 'Contrôles OK';
}
const info = (t) => { $('#aide').textContent = t; };

// ---------- Lecture ----------
function jouer(depuis = S.t >= total() - 0.01 ? 0 : S.t) {
  arreter(); S.auto = false; const t0 = performance.now() - depuis * 1000; S.lecture = { id: 0 }; $('#lecture').innerHTML = `${icone('pause', 16)}<span>Pause</span>`; $('#lecture').setAttribute('aria-pressed', 'true'); vue.dessiner();
  const pas = (now) => { if (!S.lecture) return; S.t = (now - t0) / 1000; if (S.t >= total()) { if (S.doc.boucle) return jouer(0); S.t = total(); arreter(); return dessiner(); } const k = planA(S.doc, S.t).i; if (S.doc.plans && k !== S.doc.planActif) allerAuPlan(k, false); dessiner(); S.lecture.id = requestAnimationFrame(pas); };
  S.lecture.id = requestAnimationFrame(pas);
}
function arreter() { if (S.lecture) cancelAnimationFrame(S.lecture.id); S.lecture = null; $('#lecture').innerHTML = `${icone('lecture', 16)}<span>Lecture</span>`; $('#lecture').setAttribute('aria-pressed', 'false'); }
$('#lecture').addEventListener('click', () => (S.lecture ? (arreter(), dessiner()) : jouer()));
$('#rejouer').addEventListener('click', () => jouer(0));
$('#temps').addEventListener('input', () => ctx.positionner(+$('#temps').value));

// ---------- Événements de l'état ----------
ecouter((q) => {
  if (q === 'charge' || q === 'sel') { panneaux.reconstruire(q); seq.construire(); $('#nom').value = S.doc.nom; }
  if (q !== 'sel') plans();
  if (q === 'doc') { panneaux.rafraichir(); seq.construire(); sauver(); }
  $('#annuler').disabled = !S.hist.length; $('#retablir').disabled = !S.futur.length;
  dessiner();
});
$('#nom').addEventListener('input', () => modifier((d) => { d.nom = $('#nom').value; }, 'nom'));
$('#annuler').addEventListener('click', annuler); $('#retablir').addEventListener('click', retablir);
$('#ouvrir-bibliotheque').addEventListener('click', () => biblio.ouvrir());
$('#ouvrir-export').addEventListener('click', () => exp.ouvrir());
for (const b of document.querySelectorAll('[data-ajout]')) b.addEventListener('click', () => { const t = b.dataset.ajout;
  if (t === 'texte') nouvelElement('texte', { role: 'titre' }); else if (t === 'image') ctx.importerImages(); else biblio.ouvrir({ forme: 'formes', effet: 'effets', composant: 'composants' }[t]); });

// ---------- Plans : états successifs de la création, enchaînés par des transitions ----------
function allerAuPlan(k, auto = true) { changerPlan(S.doc, k); S.sel = []; if (auto) { S.auto = true; } notifier('doc'); notifier('sel'); }
function plans() {
  const z = $('#plans'); if (!z || !S.doc) return; const ps = plansDe(S.doc), a = S.doc.planActif || 0, multi = ps.length > 1;
  const b = (txt, fn, p = {}) => bouton(txt, fn, p);
  const puces = ps.map((p, i) => { const x = b(`${i + 1} · ${p.nom} · ${String(p.duree).replace('.', ',')} s`, () => { arreter(); allerAuPlan(i); }, { ariaPressed: String(i === a), className: 'plan', dataset: { plan: String(i) } });
    x.addEventListener('dblclick', () => { const n = prompt('Nom du plan', p.nom); if (n && multi) modifier((d) => { synchroniserPlans(d); d.plans[i].nom = n; }); }); return x; });
  const ajout = b('+ Plan', () => { arreter(); modifier((d) => ajouterPlan(d)); S.sel = []; notifier('sel'); }, { id: 'plan-ajouter', title: 'Ajouter un plan vide après le plan actif' });
  const dup = b('Dupliquer le plan', () => { arreter(); modifier((d) => ajouterPlan(d, { dupliquer: true })); S.sel = []; notifier('sel'); }, { id: 'plan-dupliquer' });
  const parts = [el('span', { className: 'etiquette', textContent: 'Plans' }), ...puces, ajout, dup];
  if (multi) {
    const tr = S.doc.plans[a].transition, sel = el('select', { id: 'plan-transition', disabled: a === 0 }, ...Object.entries(TRANSITIONS).map(([k, v]) => el('option', { value: k, textContent: v }))); sel.value = a ? tr.type : 'coupe';
    sel.addEventListener('change', () => modifier((d) => { d.plans[a].transition.type = sel.value; }));
    const du = el('input', { type: 'number', id: 'plan-transition-duree', min: 0.1, max: 3, step: 0.1, value: tr.duree, disabled: a === 0 }); du.addEventListener('input', () => +du.value > 0 && modifier((d) => { d.plans[a].transition.duree = Math.min(3, +du.value); }, 'trd'));
    parts.push(el('label', { className: 'champ en-ligne' }, 'Transition d\'entrée', sel), el('label', { className: 'champ en-ligne' }, 'Durée', du), b('Supprimer le plan', () => { if (confirm('Supprimer ce plan et ses calques ?')) { arreter(); modifier((d) => supprimerPlan(d)); S.sel = []; notifier('sel'); } }, { id: 'plan-supprimer' }));
  }
  z.replaceChildren(...parts);
}

// ---------- Stockage ----------
let minuterie = null, derniereVersion = Date.now();
function sauver() { clearTimeout(minuterie); minuterie = setTimeout(() => sauverMaintenant(true), 500); }
async function sauverMaintenant(apercu = false) {
  clearTimeout(minuterie); if (!S.doc) return; S.doc.modifie = Date.now();
  try {
    synchroniserPlans(S.doc); const o = JSON.parse(JSON.stringify(S.doc)); if (apercu) o.apercu = await vignette(); else o.apercu = (await db.lire('creations', S.doc.id))?.apercu;
    await db.ecrire('creations', o); localStorage.setItem(DERNIERE, S.doc.id);
    if (Date.now() - derniereVersion > 10 * 60 * 1000) { derniereVersion = Date.now(); await enregistrerVersion(S.doc, 'Automatique', true); }
    $('#sauvegarde').textContent = `Enregistré à ${new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`;
  } catch (e) { $('#sauvegarde').textContent = 'Sauvegarde locale indisponible : enregistrer le projet en fichier.'; }
}
async function vignette(doc = S.doc) {
  const sc = rendreScene(doc, null, opts({ final: true })), e = Math.min(1, 320 / Math.max(sc.w, sc.h)), c = Object.assign(document.createElement('canvas'), { width: Math.round(sc.w * e), height: Math.round(sc.h * e) });
  await rendu.precharger(sc); rendu.dessiner(c.getContext('2d'), sc, e); return c.toDataURL('image/jpeg', 0.7);
}
addEventListener('pagehide', () => sauverMaintenant());
document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && sauverMaintenant());
async function ouvrirDoc(doc, ressources = {}) {
  for (const [id, r] of Object.entries(ressources)) if (r && !S.ressources.has(id)) { const o = { ...r, id }; S.ressources.set(id, o); await db.ecrire('ressources', o).catch(() => {}); await enregistrerPolice(o); }
  arreter(); charger(doc); S.auto = true; derniereVersion = Date.now(); await sauverMaintenant(true); info(''); vue.dessiner();
}
async function ouvrir(id) { await sauverMaintenant(); const d = await db.lire('creations', id); if (!d) return info('Création introuvable.'); try { const { doc, ressources } = migrer(d, placeholder); await ouvrirDoc(doc, ressources); } catch (e) { info(`Création illisible (${e.message}). Ses versions restent disponibles.`); } }
async function nouvelle({ format = '16:9', systeme = 'comics' } = {}) { await sauverMaintenant(); await ouvrirDoc(nouveauDocument({ format, systeme })); }
async function depuisSignature(id, format) { await sauverMaintenant(); const { docDepuisSignature } = await import('../../templates/_systeme/studio-signatures.js'); await ouvrirDoc(docDepuisSignature(id, { format })); }
async function depuisModele(id, direction, format) { await sauverMaintenant(); const f = format && (await import('../../templates/_systeme/studio-systemes.js')).format(format); await ouvrirDoc(docDepuisModele(id, { direction, w: f?.w || 1920, h: f?.h || 1080, placeholder })); }
async function dupliquerCreation(id) { const d = await db.lire('creations', id); if (!d) return; await db.ecrire('creations', { ...JSON.parse(JSON.stringify(d)), id: nouvelId('c'), nom: `${d.nom} (copie)`, modifie: Date.now() }); }
async function supprimerCreation(id) { await db.suppr('creations', id); for (const v of await versionsDe(id)) await db.suppr('versions', v.id); if (id === S.doc.id) await nouvelle({ format: S.doc.format.id, systeme: S.doc.systeme }); }
async function declinaison(nf) { await sauverMaintenant(); const d = adapter(S.doc, nf); d.id = nouvelId('c'); d.nom = `${S.doc.nom} · ${nf.nom}`; d.cree = Date.now(); await ouvrirDoc(normaliserDoc(d)); info(`Déclinaison ${nf.w} × ${nf.h} créée : corriger les placements si besoin.`); }
async function listerVersions() {
  const ul = $('#liste-versions'); if (!ul) return; const vs = await versionsDe(S.doc.id).catch(() => []);
  ul.replaceChildren(...vs.slice(0, 30).map((v) => el('li', {}, el('span', { className: 'nom-calque', textContent: `${v.nom} · ${new Date(v.date).toLocaleString('fr-FR')}` }), bouton('Restaurer', async () => { if (!confirm('Restaurer cette version ? L\'état actuel est d\'abord enregistré comme version.')) return; await enregistrerVersion(S.doc, 'Avant restauration', true); await ouvrirDoc({ ...v.doc, id: S.doc.id }); }))));
  const p = $('#etat-persistance'); if (p) p.textContent = (await navigator.storage?.persisted?.().catch(() => false)) ? 'Stockage persistant accordé par le navigateur.' : 'Stockage non garanti par le navigateur : enregistrer régulièrement le projet en fichier (Bibliothèque > Fichiers).';
}

// ---------- Illustrations et polices ----------
function elementImage(r, id) { const { w: W, h: H } = S.doc.format, k = Math.min((W * 0.6) / r.w, (H * 0.7) / r.h); const e = creerElement('image', S.doc); Object.assign(e, { w: r.w * k, h: r.h * k, x: (W - r.w * k) / 2, y: (H - r.h * k) / 2, nom: r.nom.replace(/\.[a-z0-9]+$/i, '') }); e.image.src = id; e.image.placeholder = null; return e; }
async function lireImage(f) {
  const href = await new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(f); });
  const im = new Image(); im.src = href; await im.decode(); let w = im.naturalWidth, h = im.naturalHeight, src = href;
  if (Math.max(w, h) > MAX_COTE_SOURCE) { const k = MAX_COTE_SOURCE / Math.max(w, h); w = Math.round(w * k); h = Math.round(h * k); const c = Object.assign(document.createElement('canvas'), { width: w, height: h }); c.getContext('2d').drawImage(im, 0, 0, w, h); src = c.toDataURL(/png|webp|gif|avif/.test(f.type) ? 'image/png' : 'image/jpeg', 0.92); }
  const id = idRessource(src), r = { id, type: 'image', href: src, w, h, nom: f.name, taille: f.size, reduite: src !== href };
  S.ressources.set(id, r); await db.ecrire('ressources', r).catch(() => {}); return r;
}
$('#fichier-image').addEventListener('change', async () => {
  const fs = [...($('#fichier-image').files || [])]; $('#fichier-image').value = ''; $('#fichier-image').setAttribute('multiple', ''); const ids = [];
  for (const [i, f] of fs.entries()) {
    try { const r = await lireImage(f);
      if (cible) { const t = cible; modifier((d) => { const x = (function cherche(l) { for (const e of l) { if (e.id === t) return e; if (e.enfants) { const c = cherche(e.enfants); if (c) return c; } } })(d.elements); if (x) { x.image.src = r.id; x.image.placeholder = null; } }); cible = null; info(`Illustration remplacée par « ${f.name} » : réglages et animations conservés.`); }
      else { const e = elementImage(r, r.id); e.x += i * 30; e.y += i * 30; modifier((d) => d.elements.push(normaliserEl(e))); ids.push(e.id); }
      if (r.reduite) info(`« ${f.name} » dépasse 4096 px : copie de travail réduite à ${r.w} × ${r.h}.`);
    } catch { info(`Impossible de lire « ${f.name} ». Formats acceptés : PNG, JPG, WebP, AVIF, GIF. Convertir les photos HEIC/HEIF en JPG.`); }
  }
  if (ids.length) selectionner(ids);
});
const fichierPolice = el('input', { type: 'file', accept: '.ttf,.otf,.woff,.woff2,font/*', hidden: true, id: 'fichier-police' }); document.body.append(fichierPolice);
function importerPolice() { fichierPolice.click(); }
async function enregistrerPolice(r) { if (r.type !== 'police' || [...document.fonts].some((f) => f.family === r.fam)) return; try { const f = new FontFace(r.fam, `url(${r.href})`); await f.load(); document.fonts.add(f); } catch { /* police illisible */ } }
fichierPolice.addEventListener('change', async () => {
  const f = fichierPolice.files?.[0]; fichierPolice.value = ''; if (!f) return;
  try { const href = await new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(f); }), nom = f.name.replace(/\.[a-z0-9]+$/i, ''), id = idRessource(href), r = { id, type: 'police', href, nom, fam: 'PS-' + nom.replace(/[^\w-]+/g, '-'), taille: f.size };
    const ff = new FontFace(r.fam, `url(${href})`); await ff.load(); document.fonts.add(ff); S.ressources.set(id, r); await db.ecrire('ressources', r).catch(() => {});
    const s = premier(); if (s?.type === 'texte') modifier(() => { s.texte.police = 'f:' + id; }); else notifier('sel'); info(`Police « ${nom} » importée (locale à cet appareil et à ses projets).`);
  } catch { info(`Police illisible : « ${f.name} ». Formats acceptés : TTF, OTF, WOFF, WOFF2.`); }
});

// ---------- Composants, modèles, préréglages ----------
async function enregistrerComposant() {
  const s = selection(); if (!s.length) return; const nom = prompt('Nom du composant', s.length === 1 ? s[0].el.nom : 'Composant'); if (!nom) return;
  const els = s.map((x) => JSON.parse(JSON.stringify(x.el))), x0 = Math.min(...els.map((e) => e.x)), y0 = Math.min(...els.map((e) => e.y)); els.forEach((e) => { e.x -= x0; e.y -= y0; });
  const d = { ...S.doc, elements: els, fond: { type: 'transparent' } };
  await db.ecrire('composants', { id: nouvelId('k'), nom, elements: els, w: Math.max(...els.map((e) => e.x + e.w)), h: Math.max(...els.map((e) => e.y + e.h)), ressources: ressourcesUtilisees(els), apercu: await vignette(normaliserDoc(d)) }); info(`Composant « ${nom} » enregistré dans la bibliothèque.`);
}
function insererComposant(c) {
  const { w: W, h: H } = S.doc.format, re = (e) => { e.id = nouvelId(); e.enfants?.forEach(re); return e; }, els = c.elements.map((e) => re(JSON.parse(JSON.stringify(e)))), dx = (W - c.w) / 2, dy = (H - c.h) / 2;
  modifier((d) => els.forEach((e) => { e.x += dx; e.y += dy; d.elements.push(normaliserEl(e)); })); selectionner(els.map((e) => e.id));
}
async function enregistrerModele() { const nom = prompt('Nom du modèle', S.doc.nom); if (!nom) return; await db.ecrire('modeles', { id: nouvelId('m'), nom, doc: JSON.parse(JSON.stringify(S.doc)), apercu: await vignette() }); info(`Modèle « ${nom} » enregistré.`); }
async function depuisModelePerso(m) { await sauverMaintenant(); const d = JSON.parse(JSON.stringify(m.doc)); d.id = nouvelId('c'); d.nom = m.nom; d.cree = Date.now(); await ouvrirDoc(d); }
async function enregistrerPreset(a) { const nom = prompt('Nom du préréglage d\'animation'); if (!nom) return; const p = { id: nouvelId('p'), nom, anim: JSON.parse(JSON.stringify(a)) }; await db.ecrire('presets', p); presets.push(p); panneaux.animation(); info(`Préréglage « ${nom} » enregistré.`); }

// ---------- Fichiers ----------
function telecharger(blob, ext) {
  const slug = (S.doc.nom || 'creation').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'creation';
  const a = el('a', { href: URL.createObjectURL(blob), download: ext.startsWith('.') ? `${slug}${ext}` : `primestone_motion_${slug}_${S.doc.format.w}x${S.doc.format.h}.${ext}` }); document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}
function enregistrerProjet() { telecharger(new Blob([JSON.stringify(paquetProjet(S.doc, S.ressources))], { type: 'application/json' }), '.motion.json'); info('Projet enregistré en fichier (illustrations et polices incluses).'); }
async function exporterBibliotheque() { telecharger(new Blob([JSON.stringify(await paquetBibliotheque())], { type: 'application/json' }), `.bibliotheque-${new Date().toISOString().slice(0, 10)}.motion.json`); info('Bibliothèque exportée.'); }
const fichierProjet = el('input', { type: 'file', accept: '.json,application/json', hidden: true, id: 'fichier-projet' }); document.body.append(fichierProjet);
fichierProjet.addEventListener('change', async () => {
  const f = fichierProjet.files?.[0]; fichierProjet.value = ''; if (!f) return;
  try { const p = lirePaquet(JSON.parse(await f.text()), placeholder);
    if (p.bibliotheque) { const n = await importerBibliotheque(p.bibliotheque); await chargerRessources(); presets = await db.tous('presets'); biblio.afficher('creations'); return info(`Bibliothèque importée : ${n} élément(s) ajouté(s), aucun écrasé.`); }
    await sauverMaintenant(); if (await db.lire('creations', p.doc.id)) p.doc.id = nouvelId('c'); await ouvrirDoc(p.doc, p.ressources); $('#bibliotheque').open && $('#bibliotheque').close(); info(`Projet « ${f.name} » ouvert.`);
  } catch (e) { info(`« ${f.name} » n'est pas un projet Motion Studio lisible (${e.message}).`); }
});
async function chargerRessources() { for (const r of await db.tous('ressources').catch(() => [])) { S.ressources.set(r.id, r); await enregistrerPolice(r); } }

// ---------- Clavier ----------
document.addEventListener('keydown', (ev) => {
  const champ = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName) || document.querySelector('dialog[open]'), k = ev.key.toLowerCase(), mod = ev.ctrlKey || ev.metaKey;
  if (ev.key === 'Escape') { if (S.recadrage) { S.recadrage = false; notifier('sel'); } else if (!champ) selectionner([]); return; }
  if (champ) return;
  if (mod && k === 'z') { ev.preventDefault(); return ev.shiftKey ? retablir() : annuler(); }
  if (mod && k === 'y') { ev.preventDefault(); return retablir(); }
  if (mod && k === 'd') { ev.preventDefault(); return dupliquer(); }
  if (mod && k === 'g') { ev.preventDefault(); return ev.shiftKey ? degrouper() : grouper(); }
  if (mod && k === 'c') return copier(); if (mod && k === 'v') return coller(); if (mod && k === 'a') { ev.preventDefault(); return selectionner(S.doc.elements.filter((e) => !e.verrou).map((e) => e.id)); }
  if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); return supprimer(); }
  if (ev.key === ' ') { ev.preventDefault(); return S.lecture ? (arreter(), dessiner()) : jouer(); }
  if (ev.key.startsWith('Arrow') && S.sel.length) { ev.preventDefault(); const p = ev.shiftKey ? 10 : 1, d = { ArrowLeft: [-p, 0], ArrowRight: [p, 0], ArrowUp: [0, -p], ArrowDown: [0, p] }[ev.key]; return modifier(() => selection().filter((x) => !x.el.verrou).forEach((x) => deplacer(x, ...d)), 'fleches'); }
  if (!mod && k === 't') return nouvelElement('texte', { role: 'titre' }); if (!mod && k === 'r') return nouvelElement('forme', { forme: 'rect' }); if (!mod && k === 'i') return ctx.importerImages();
});

// ---------- Démarrage ----------
$('#ouvrir-export').disabled = false;
await Promise.all(Object.values(M).map((m) => document.fonts.load(`${m.style === 'italic' ? 'italic ' : ''}${m.weight} 40px "${m.family}"`).catch(() => {})));
await chargerRessources(); presets = await db.tous('presets').catch(() => []);
let premierDoc = null; try { const id = localStorage.getItem(DERNIERE); if (id) premierDoc = await db.lire('creations', id); } catch { /* stockage indisponible */ }
try { if (premierDoc) { const { doc, ressources } = migrer(premierDoc, placeholder); await ouvrirDoc(doc, ressources); } else throw 0; }
catch { await ouvrirDoc(docDepuisModele('annonce', { direction: 'pop', placeholder })); }
persister();
if (location.hash === '#modeles') biblio.ouvrir('modeles');
document.documentElement.dataset.version = T.$version;
if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('../sw.js').catch(() => {});
window.__studio = { S, scene, sequence, opts, total, scenePrete, exp, MIME_TEMPS_REEL, ctx, charger: ouvrirDoc, sauver: sauverMaintenant };   // utilisé par les tests automatisés
