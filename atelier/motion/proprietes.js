// Motion Studio · panneaux contextuels : propriétés de l'élément, animation, calques, document.
// Contrôles progressifs : réglages courants visibles, réglages avancés repliés.
import { S, modifier, selection, premier, selectionner, supprimer, dupliquer, grouper, degrouper, ordre, aligner, distribuer, redimensionner, notifier, trouverEl } from './etat.js';
import { styleTexte, adapter, normaliserEl, nouvelId, FORMATS_STUDIO } from '../../templates/_systeme/studio.js';
import { SYSTEMES, JETONS, ROLES_TEXTE, palette, format as fmt } from '../../templates/_systeme/studio-systemes.js';
import { POLICES, DEFORMATIONS } from '../../templates/_systeme/studio-texte.js';
import { FORMES, MASQUES } from '../../templates/_systeme/studio-formes.js';
import { icone } from './icones.js';
import { SONS } from '../../templates/_systeme/studio-sons.js';
import { EFFETS_LIB, CATEGORIES_EFFETS } from '../../templates/_systeme/studio-effets.js';
import { ENTREES, SORTIES, BOUCLES, COURBES, DIRECTIONS, CAMERAS, PRESETS_ANIM } from '../../templates/_systeme/studio-anim.js';

const el = (tag, { dataset, ...p } = {}, ...k) => { const e = Object.assign(document.createElement(tag), p); if (dataset) Object.assign(e.dataset, dataset); e.append(...k.flat().filter((x) => x !== null && x !== undefined && x !== false)); return e; };
const bouton = (txt, fn, p = {}) => { const { label, ...r } = p; const b = el('button', { type: 'button', textContent: txt, ...r }); if (label) b.setAttribute('aria-label', label); b.addEventListener('click', fn); return b; };
let maj = [];
// Bouton à icône (texte facultatif après l'icône)
const bIco = (nom, txt, fn, p = {}) => { const b = bouton('', fn, p); b.innerHTML = icone(nom) + (txt ? `<span>${txt}</span>` : ''); b.classList.add('a-icone'); return b; };
// Champ générique : get lit la valeur, set l'écrit dans le document (avec historique regroupé par champ)
function lier(input, get, set, cle, lire = (i) => i.value) {
  const ecrire = () => modifier(() => set(lire(input)), cle);
  input.addEventListener(input.tagName === 'SELECT' || input.type === 'checkbox' ? 'change' : 'input', ecrire);
  maj.push(() => { if (document.activeElement === input) return; const v = get(); if (input.type === 'checkbox') input.checked = !!v; else if (String(input.value) !== String(v ?? '')) input.value = v ?? ''; });
  return input;
}
const champ = (label, input, id) => { if (id) input.id = id; return el('label', { className: 'champ' }, label, input); };
const num = (label, get, set, o = {}) => champ(label, lier(el('input', { type: 'number', step: o.pas ?? 1, min: o.min ?? '', max: o.max ?? '', value: get() }), get, (v) => v !== '' && Number.isFinite(+v) && set(+v), `${label}${o.cle || ''}`), o.id);
const plage = (label, get, set, o = {}) => champ(label, lier(el('input', { type: 'range', min: o.min ?? 0, max: o.max ?? 1, step: o.pas ?? 0.01, value: get() }), get, (v) => set(+v), `${label}${o.cle || ''}`), o.id);
const choix = (label, options, get, set, o = {}) => champ(label, lier(el('select', {}, ...Object.entries(options).map(([v, t]) => (typeof t === 'object' ? el('optgroup', { label: v }, ...Object.entries(t).map(([v2, t2]) => el('option', { value: v2, textContent: t2 }))) : el('option', { value: v, textContent: t })))), get, set, `${label}${o.cle || ''}`), o.id);
const bascule = (label, get, set, o = {}) => { const i = lier(el('input', { type: 'checkbox', checked: !!get() }), get, set, `${label}${o.cle || ''}`, (x) => x.checked); if (o.id) i.id = o.id; return el('label', { className: 'bascule' }, i, label); };
const texte = (label, get, set, o = {}) => champ(label, lier(o.multi ? el('textarea', { rows: o.rows || 3, value: get() }) : el('input', { type: 'text', value: get(), autocomplete: 'off' }), get, set, `${label}${o.cle || ''}`), o.id);
// Couleur : jeton du système (recolorable) ou couleur libre
function couleur(label, get, set, o = {}) {
  const sel = el('select', {}, ...(o.aucune ? [el('option', { value: 'none', textContent: 'Aucune' })] : []), ...Object.entries(JETONS).map(([k, v]) => el('option', { value: '@' + k, textContent: v })), el('option', { value: 'libre', textContent: 'Libre' }));
  const pal = () => palette(S.doc), hex = () => { const v = get(); return v && v[0] === '@' ? pal()[v.slice(1)] : v && v !== 'none' ? v : '#000000'; };
  const pick = el('input', { type: 'color', value: hex().slice(0, 7) }); pick.setAttribute('aria-label', label);
  sel.addEventListener('change', () => { if (sel.value !== 'libre') modifier(() => set(sel.value), label); else modifier(() => set(pick.value.toUpperCase()), label); });
  pick.addEventListener('input', () => modifier(() => set(pick.value.toUpperCase()), label + 'p'));
  maj.push(() => { const v = get(); if (document.activeElement !== sel) sel.value = !v || v === 'none' ? (o.aucune ? 'none' : 'libre') : v[0] === '@' ? v : 'libre'; if (document.activeElement !== pick) pick.value = hex().slice(0, 7); });
  if (o.id) pick.id = o.id;
  return el('label', { className: 'champ' }, label, el('div', { className: 'couleur' }, sel, pick));
}
// Sections repliables : l'état ouvert ou fermé est mémorisé d'une sélection à l'autre
const ouverts = new Map();
const details = (titre, ouvert, ...k) => { const d = el('details', { open: ouverts.get(titre) ?? ouvert }, el('summary', { textContent: titre }), el('div', { className: 'corps' }, ...k)); d.addEventListener('toggle', () => ouverts.set(titre, d.open)); return d; };
const g2 = (...k) => el('div', { className: 'grille2' }, ...k), g3 = (...k) => el('div', { className: 'grille3' }, ...k);

export function initPanneaux(ctx) {
  const $ = (s) => document.querySelector(s);
  // ---------- Onglets ----------
  const onglet = (n) => { for (const b of document.querySelectorAll('.panneau .onglets [data-onglet]')) b.setAttribute('aria-selected', String(b.dataset.onglet === n)); for (const s of ['proprietes', 'animation', 'calques', 'document']) $(`#onglet-${s}`).hidden = s !== n; };
  for (const b of document.querySelectorAll('.panneau .onglets [data-onglet]')) b.addEventListener('click', () => onglet(b.dataset.onglet));

  // ---------- Propriétés ----------
  function proprietes() {
    const p = $('#onglet-proprietes'), s = selection();
    if (!s.length) { p.replaceChildren(el('p', { className: 'vide', textContent: 'Aucun élément sélectionné. Ajouter un élément avec la barre d\'outils, ou toucher un élément de la scène.' }),
      el('p', { className: 'info', textContent: 'Raccourcis : Ctrl+Z / Ctrl+Maj+Z annuler et rétablir · Suppr effacer · Ctrl+D dupliquer · Ctrl+G grouper · Ctrl+C / Ctrl+V copier, coller · flèches déplacer (Maj ×10) · Espace lecture · Échap désélectionner · double-clic : éditer le texte, recadrer l\'image, entrer dans un groupe.' })); return; }
    const alignes = el('div', { className: 'grille6' }, ...[['gauche', 'gauche', 'Gauche'], ['centre', 'centreH', 'Centre'], ['droite', 'droite', 'Droite'], ['haut', 'haut', 'Haut'], ['milieu', 'milieu', 'Milieu'], ['bas', 'bas', 'Bas']].map(([m, i, t]) => bIco(i, '', () => aligner(m), { label: `Aligner ${m}`, title: `Aligner : ${t}` })));
    const ordres = el('div', { className: 'grille4' }, bIco('premier', '', () => ordre('premier'), { label: 'Premier plan', title: 'Premier plan' }), bIco('avant', '', () => ordre('avant'), { label: 'Avancer', title: 'Avancer' }), bIco('arriere', '', () => ordre('arriere'), { label: 'Reculer', title: 'Reculer' }), bIco('dernier', '', () => ordre('dernier'), { label: 'Arrière-plan', title: 'Arrière-plan' }));
    if (s.length > 1) { p.replaceChildren(el('h3', { textContent: `${s.length} éléments sélectionnés` }), el('div', { className: 'rangee' }, bouton('Grouper', grouper), bouton('Dupliquer', dupliquer), bouton('Supprimer', supprimer), bouton('Enregistrer comme composant', () => ctx.enregistrerComposant())),
      el('h3', { textContent: 'Aligner' }), alignes, el('div', { className: 'rangee' }, bouton('Répartir horizontalement', () => distribuer('h')), bouton('Répartir verticalement', () => distribuer('v'))), el('h3', { textContent: 'Ordre' }), ordres); return; }
    const e = s[0].el, set = (f) => (v) => f(v), T = { texte: 'Texte', image: 'Illustration', forme: 'Forme', effet: 'Effet', groupe: 'Groupe', vecteur: 'Vectoriel (modèle)', sceau: 'Sceau P (non officiel)' }[e.type];
    const parties = [
      el('h3', { textContent: T }),
      texte('Nom du calque', () => e.nom, (v) => { e.nom = v; }, { id: 'prop-nom' }),
      el('div', { className: 'rangee' }, bouton('Dupliquer', dupliquer), bouton('Supprimer', supprimer), bouton(e.verrou ? 'Déverrouiller' : 'Verrouiller', () => { modifier(() => { e.verrou = !e.verrou; }); proprietes(); }), e.type === 'groupe' ? bouton('Dégrouper', degrouper) : null, bouton('Comme composant', () => ctx.enregistrerComposant(), { title: 'Enregistrer comme composant réutilisable' })),
      details('Disposition', true, g2(num('X', () => Math.round(e.x), (v) => { e.x = v; }, { id: 'prop-x' }), num('Y', () => Math.round(e.y), (v) => { e.y = v; }, { id: 'prop-y' }), num('Largeur', () => Math.round(e.w), (v) => redimensionner(e, Math.max(1, v), e.h), { min: 1, id: 'prop-w' }), num('Hauteur', () => Math.round(e.h), (v) => redimensionner(e, e.w, Math.max(1, v)), { min: 1, id: 'prop-h' })),
        g2(num('Rotation (°)', () => e.rot, (v) => { e.rot = v; }, { pas: 0.5, id: 'prop-rot' }), plage('Opacité', () => e.op, (v) => { e.op = v; }, { id: 'prop-op' })),
        el('div', { className: 'ligne-outils' }, el('span', { className: 'etiquette', textContent: 'Aligner' }), alignes), el('div', { className: 'ligne-outils' }, el('span', { className: 'etiquette', textContent: 'Ordre' }), ordres)),
      details('Fusion, miroir, profondeur', false, choix('Mode de fusion', { normal: 'Normal', multiply: 'Produit', screen: 'Superposition claire', overlay: 'Incrustation', darken: 'Assombrir', lighten: 'Éclaircir', 'color-dodge': 'Densité couleur −', 'hard-light': 'Lumière crue', difference: 'Différence' }, () => e.blend, (v) => { e.blend = v; }),
        bascule('Miroir horizontal', () => e.miroir, (v) => { e.miroir = v; }), plage('Profondeur (parallaxe de la caméra)', () => e.prof, (v) => { e.prof = v; }, { min: -1, max: 2 })),
    ];
    if (e.type === 'texte') parties.push(...panneauTexte(e));
    if (e.type === 'image') parties.push(...panneauImage(e));
    if (e.type === 'forme') parties.push(...panneauForme(e));
    if (e.type === 'effet') parties.push(...panneauEffet(e));
    if (e.type === 'groupe') parties.push(details('Contenu du groupe', true, el('div', { className: 'rangee' }, ...e.enfants.map((c) => bouton(c.nom, () => selectionner(c.id))))));
    if (e.type === 'vecteur') parties.push(el('p', { className: 'info', textContent: 'Élément vectoriel issu d\'un modèle : il se déplace, se redimensionne, s\'anime et se masque comme les autres calques.' }));
    if (e.type === 'sceau') parties.push(couleur('Fond', () => e.sceau?.fond, (v) => { e.sceau = { ...e.sceau, fond: v }; }), couleur('Lettre', () => e.sceau?.lettre, (v) => { e.sceau = { ...e.sceau, lettre: v }; }), el('p', { className: 'info', textContent: 'Vectorisation NON OFFICIELLE du P : forme non modifiable.' }));
    p.replaceChildren(...parties.filter(Boolean));
  }
  function panneauTexte(e) {
    const t = e.texte, polices = { ...POLICES, ...Object.fromEntries([...S.ressources.values()].filter((r) => r.type === 'police').map((r) => ['f:' + r.id, `${r.nom} (importée)`])) };
    const pol = choix('Police', polices, () => t.police, (v) => { t.police = v; }, { id: 'prop-police' });
    return [details('Texte', true,
      texte('Contenu', () => t.contenu, (v) => { t.contenu = v; }, { multi: true, rows: 3, id: 'champ-contenu' }),
      choix('Style hiérarchique du système', { '': '— appliquer un style —', ...ROLES_TEXTE }, () => '', (v) => { if (!v) return; const st = styleTexte(S.doc.systeme, v), u = Math.min(S.doc.format.w, S.doc.format.h) / 1080; st.taille = Math.round(st.taille * u); Object.assign(t, st); }, { id: 'prop-role' }),
      g2(pol, el('div', { className: 'champ' }, 'Police locale', bouton('Importer une police…', () => ctx.importerPolice()))),
      g2(num('Taille (px)', () => t.taille, (v) => { t.taille = Math.max(4, v); }, { pas: 1, id: 'prop-taille' }), bascule('Ajuster à la boîte', () => t.auto, (v) => { t.auto = v; }, { id: 'prop-auto' })),
      g3(choix('Alignement', { start: 'Gauche', middle: 'Centre', end: 'Droite' }, () => t.align, (v) => { t.align = v; }), choix('Vertical', { haut: 'Haut', milieu: 'Milieu', bas: 'Bas' }, () => t.valign, (v) => { t.valign = v; }), choix('Casse', { upper: 'Capitales', none: 'Telle quelle' }, () => t.casse, (v) => { t.casse = v; })),
      g2(plage('Interligne', () => t.interligne, (v) => { t.interligne = v; }, { min: 0.6, max: 2.2 }), num('Interlettrage', () => t.interlettre, (v) => { t.interlettre = v; }, { pas: 0.5 })),
      couleur('Couleur', () => t.fill, (v) => { t.fill = v; }, { id: 'prop-texte-couleur' }),
      bascule('Dégradé vertical', () => !!t.degrade, (v) => { t.degrade = v ? { c2: '@accent' } : null; proprietesDiffere(); }), t.degrade ? couleur('Couleur du bas', () => t.degrade.c2, (v) => { t.degrade.c2 = v; }) : null,
      couleur('Fond du texte (bandeau)', () => t.fond, (v) => { t.fond = v; }, { aucune: true })),
    details('Contours, ombre, lueur, extrusion', false,
      g2(couleur('Contour', () => t.contour.c, (v) => { t.contour.c = v; }), num('Épaisseur', () => t.contour.w, (v) => { t.contour.w = Math.max(0, v); }, { min: 0, id: 'prop-contour' })),
      g2(couleur('Second contour', () => t.contour2.c, (v) => { t.contour2.c = v; }), num('Épaisseur', () => t.contour2.w, (v) => { t.contour2.w = Math.max(0, v); }, { min: 0, cle: 2 })),
      g2(couleur('Ombre portée', () => t.ombre.c, (v) => { t.ombre.c = v; }), plage('Opacité', () => t.ombre.op, (v) => { t.ombre.op = v; }, { cle: 'o' })),
      g3(num('Décalage X', () => t.ombre.dx, (v) => { t.ombre.dx = v; }, { cle: 'ox', id: 'prop-ombre-x' }), num('Décalage Y', () => t.ombre.dy, (v) => { t.ombre.dy = v; }, { cle: 'oy' }), num('Flou', () => t.ombre.flou, (v) => { t.ombre.flou = Math.max(0, v); }, { min: 0 })),
      g2(couleur('Lueur', () => t.lueur.c, (v) => { t.lueur.c = v; }), num('Rayon', () => t.lueur.b, (v) => { t.lueur.b = Math.max(0, v); }, { min: 0, cle: 'l' })),
      g3(couleur('Extrusion', () => t.extrusion.c, (v) => { t.extrusion.c = v; }), num('Profondeur', () => t.extrusion.profondeur, (v) => { t.extrusion.profondeur = Math.max(0, v); }, { min: 0, id: 'prop-extrusion' }), num('Angle', () => t.extrusion.angle, (v) => { t.extrusion.angle = v; }, { cle: 'ea' }))),
    details('Déformation', t.deformation.type !== 'aucune', choix('Type', DEFORMATIONS, () => t.deformation.type, (v) => { t.deformation.type = v; }, { id: 'prop-deformation' }), plage('Force', () => t.deformation.force, (v) => { t.deformation.force = v; }, { min: -1, max: 1, cle: 'df' }))];
  }
  function panneauImage(e) {
    const im = e.image, images = ctx.visuels().length ? ctx.visuels() : [...S.ressources.values()].filter((r) => r.type === 'image'), tr = im.traitement;
    return [details('Illustration', true,
      el('div', { className: 'rangee' }, bouton('Remplacer l\'illustration…', () => ctx.remplacerImage(e)), bouton(S.recadrage ? 'Terminer le recadrage' : 'Recadrer dans la scène', () => { S.recadrage = !S.recadrage; notifier('sel'); }, { id: 'recadrer' }), bouton('Recentrer', () => modifier(() => Object.assign(im, { zoom: 1, dx: 0, dy: 0 })))),
      images.length ? choix('Image de la bibliothèque (réglages conservés)', { '': '— image de substitution —', ...Object.fromEntries(images.map((r) => [r.id, r.nom])) }, () => im.src || '', (v) => { im.src = v || null; if (v) { im.placeholder = null; ctx.chargerRessource(v); } ctx.majBriefImage?.(e, v); }, { id: 'prop-ressource' }) : null,
      !im.src ? choix('Image de substitution', { pop: 'Pop', noir: 'Ville de nuit', cosmos: 'Cosmos', encre: 'Personnage détouré' }, () => im.placeholder, (v) => { im.placeholder = v; }) : null,
      g2(choix('Ajustement', { couvrir: 'Remplir le cadre', contenir: 'Image entière' }, () => im.ajustement, (v) => { im.ajustement = v; }), choix('Masque', MASQUES, () => im.masque.forme, (v) => { im.masque.forme = v; }, { id: 'prop-masque' })),
      plage('Zoom', () => im.zoom, (v) => { im.zoom = v; }, { min: 0.2, max: 6, id: 'prop-zoom' }),
      el('div', { className: 'rangee' }, el('span', { className: 'info', textContent: 'Cadrer :' }), ...[['Haut (visage)', 0.35], ['Centre', 0], ['Bas', -0.35]].map(([n, v]) => bouton(n, () => modifier(() => { im.dy = v; im.dx = 0; }), { dataset: { cadrage: String(v) } })), bouton('Image entière', () => modifier(() => { im.zoom = 1; im.dx = 0; im.dy = 0; im.ajustement = 'contenir'; }))), g2(plage('Décalage X', () => im.dx, (v) => { im.dx = v; }, { min: -1, max: 1, cle: 'idx' }), plage('Décalage Y', () => im.dy, (v) => { im.dy = v; }, { min: -1, max: 1, cle: 'idy' })),
      g2(couleur('Contour', () => im.contour.c, (v) => { im.contour.c = v; }), num('Épaisseur', () => im.contour.w, (v) => { im.contour.w = Math.max(0, v); }, { min: 0, id: 'prop-image-contour' })),
      bascule('Ombre portée', () => !!im.ombre, (v) => { im.ombre = v ? { c: '@encre', dx: 18, dy: 18, op: 0.45 } : null; })),
    details('Mise en lumière du personnage', !!im.eclairage?.actif,
      bascule('Lumière de contour, ombre et aura', () => im.eclairage?.actif, (v) => { im.eclairage = { ...(im.eclairage || {}), actif: v }; }, { id: 'prop-eclairage' }),
      g2(couleur('Lumière de contour', () => im.eclairage?.contre || '#FFFFFF', (v) => { im.eclairage.contre = v; }), couleur('Aura', () => im.eclairage?.aura || 'none', (v) => { im.eclairage.aura = v === 'none' ? null : v; }, { aucune: true })),
      g2(plage('Direction de la lumière', () => im.eclairage?.dir ?? 225, (v) => { im.eclairage.dir = v; }, { min: 0, max: 359, pas: 1, cle: 'edir' }), plage('Ombre portée', () => im.eclairage?.ombre ?? 0.5, (v) => { im.eclairage.ombre = v; }, { cle: 'eomb' })),
      plage('Intensité de l\'aura', () => im.eclairage?.auraForce ?? 0.5, (v) => { im.eclairage.auraForce = v; }, { cle: 'eaura' }),
      el('p', { className: 'info', textContent: 'Pour un personnage détouré (ajustement « Image entière ») : l\'image n\'est jamais déformée, la lumière est posée sur ses bords.' })),
    details('Traitements (non destructifs)', false,
      bascule('Retirer un fond uni', () => tr.detourage.actif, (v) => { tr.detourage.actif = v; }, { id: 'prop-detourage' }), g2(couleur('Couleur du fond', () => tr.detourage.couleur, (v) => { tr.detourage.couleur = v; }), plage('Tolérance', () => tr.detourage.tolerance, (v) => { tr.detourage.tolerance = v; }, { min: 1, max: 120, pas: 1 })),
      bascule('Noir et blanc', () => tr.nb, (v) => { tr.nb = v; }), bascule('Bichromie', () => tr.bichromie.actif, (v) => { tr.bichromie.actif = v; }, { id: 'prop-bichromie' }), g2(couleur('Ombres', () => tr.bichromie.c1, (v) => { tr.bichromie.c1 = v; }), couleur('Lumières', () => tr.bichromie.c2, (v) => { tr.bichromie.c2 = v; })),
      g2(plage('Contraste', () => tr.contraste, (v) => { tr.contraste = v; }, { min: -0.8, max: 1.5 }), plage('Luminosité', () => tr.luminosite, (v) => { tr.luminosite = v; }, { min: -0.8, max: 0.8 })),
      bascule('Trame d\'impression en points', () => tr.trame.actif, (v) => { tr.trame.actif = v; }, { id: 'prop-trame-image' }), plage('Taille des points', () => tr.trame.cellule, (v) => { tr.trame.cellule = v; }, { min: 4, max: 40, pas: 1 }),
      el('p', { className: 'info', textContent: 'L\'original importé n\'est jamais modifié : les traitements sont recalculés à partir de lui.' }))];
  }
  function panneauForme(e) {
    const f = e.forme, bul = ['bulle', 'cri', 'pensee'].includes(f.type);
    return [details('Forme', true, choix('Type', FORMES, () => f.type, (v) => { f.type = v; proprietesDiffere(); }, { id: 'prop-forme' }),
      couleur('Remplissage', () => f.fill, (v) => { f.fill = v; }, { aucune: true, id: 'prop-forme-couleur' }), bascule('Dégradé', () => !!f.degrade, (v) => { f.degrade = v ? { c2: '@accent2', angle: 90 } : null; proprietesDiffere(); }),
      f.degrade ? g2(couleur('Couleur 2', () => f.degrade.c2, (v) => { f.degrade.c2 = v; }), num('Angle', () => f.degrade.angle, (v) => { f.degrade.angle = v; })) : null,
      g2(couleur('Contour', () => f.stroke, (v) => { f.stroke = v; }, { aucune: true }), num('Épaisseur', () => f.lw, (v) => { f.lw = Math.max(0, v); }, { min: 0 })),
      f.type === 'rect' || f.type === 'cartouche' ? num('Coins arrondis', () => f.rayon, (v) => { f.rayon = Math.max(0, v); }, { min: 0 }) : null,
      f.type === 'polygone' ? num('Côtés', () => f.cotes, (v) => { f.cotes = Math.max(3, Math.round(v)); }, { min: 3 }) : null,
      ['etoile', 'explosion', 'eclat'].includes(f.type) ? g2(num('Branches', () => f.branches, (v) => { f.branches = Math.max(3, Math.round(v)); }, { min: 3 }), plage('Creux', () => f.creux, (v) => { f.creux = v; }, { min: 0.1, max: 0.95 })) : null,
      ['explosion', 'eclat', 'cri'].includes(f.type) ? bouton('Varier la forme', () => modifier(() => { f.graine = (f.graine || 1) + 1; })) : null,
      f.type === 'lame' ? num('Angle d\'incision', () => f.angle, (v) => { f.angle = v; }) : null,
      bul ? g2(plage('Pointe X', () => f.queue[0], (v) => { f.queue = [v, f.queue[1]]; }, { min: -0.5, max: 1.5 }), plage('Pointe Y', () => f.queue[1], (v) => { f.queue = [f.queue[0], v]; }, { min: -0.6, max: 1.6 })) : null),
      details('Trame et ombre', false, bascule('Trame dans la forme', () => f.trame.actif, (v) => { f.trame.actif = v; }, { id: 'prop-forme-trame' }), g3(couleur('Couleur', () => f.trame.couleur, (v) => { f.trame.couleur = v; }), num('Cellule', () => f.trame.cellule, (v) => { f.trame.cellule = Math.max(3, v); }), plage('Densité', () => f.trame.intensite, (v) => { f.trame.intensite = v; })),
        bascule('Ombre portée', () => !!f.ombre, (v) => { f.ombre = v ? { c: '@encre', dx: 14, dy: 14, op: 1 } : null; }))];
  }
  function panneauEffet(e) {
    const ef = e.effet, pm = ef.params, lib = EFFETS_LIB[ef.type], groupes = Object.fromEntries(CATEGORIES_EFFETS.map((c) => [c, Object.fromEntries(Object.entries(EFFETS_LIB).filter(([, x]) => x.cat === c).map(([k, x]) => [k, x.nom]))]));
    return [details('Effet', true, choix('Type', groupes, () => ef.type, (v) => { ef.type = v; ef.params = { ...EFFETS_LIB[v].def, cx: pm.cx, cy: pm.cy }; e.nom = EFFETS_LIB[v].nom; proprietesDiffere(); }, { id: 'prop-effet' }),
      lib.modes ? choix('Variante', lib.modes, () => pm.mode, (v) => { pm.mode = v; }) : null,
      plage('Intensité', () => pm.intensite, (v) => { pm.intensite = v; }, { id: 'prop-intensite' }), g2(plage('Densité', () => pm.densite, (v) => { pm.densite = v; }), plage('Échelle', () => pm.echelle, (v) => { pm.echelle = v; }, { min: 0.25, max: 4 })),
      g2(num('Angle (°)', () => pm.angle, (v) => { pm.angle = v; }), bouton('Varier', () => modifier(() => { pm.graine = (pm.graine || 1) + 1; }))),
      g2(couleur('Couleur', () => pm.couleur, (v) => { pm.couleur = v; }), couleur('Couleur 2', () => pm.couleur2, (v) => { pm.couleur2 = v; })),
      g2(plage('Foyer X', () => pm.cx, (v) => { pm.cx = v; }, { min: -0.5, max: 1.5 }), plage('Foyer Y', () => pm.cy, (v) => { pm.cy = v; }, { min: -0.5, max: 1.5 })),
      g2(bascule('Animé', () => pm.anime, (v) => { pm.anime = v; }), plage('Vitesse', () => pm.vitesse, (v) => { pm.vitesse = v; }, { min: 0.1, max: 4 })),
      bouton('Couvrir toute la scène', () => modifier(() => Object.assign(e, { x: 0, y: 0, w: S.doc.format.w, h: S.doc.format.h, rot: 0 }))))];
  }
  let differe = null; const proprietesDiffere = () => { clearTimeout(differe); differe = setTimeout(proprietes, 0); };

  // ---------- Animation ----------
  function animation() {
    const p = $('#onglet-animation'), s = selection();
    if (!s.length) { p.replaceChildren(el('p', { className: 'vide', textContent: 'Sélectionner un ou plusieurs éléments pour régler leur animation. La caméra et la durée se règlent dans l\'onglet Document.' })); return; }
    const tous = (f) => (v) => s.forEach(({ el: e }) => f(e.anim, v)), a = s[0].el.anim, presets = { '': '— choisir —', ...Object.fromEntries(Object.entries(PRESETS_ANIM).map(([k, v]) => [k, v.nom])), ...Object.fromEntries(ctx.presets().map((x) => ['u:' + x.id, `${x.nom} (perso)`])) };
    const appliquerPreset = (v) => { if (!v) return; const pr = v.startsWith('u:') ? ctx.presets().find((x) => 'u:' + x.id === v)?.anim : PRESETS_ANIM[v]; if (!pr) return;
      s.forEach(({ el: e }) => { const d = e.anim.entree.delai; for (const k of ['entree', 'boucle', 'sortie']) e.anim[k] = { ...e.anim[k], type: 'aucune', ...(pr[k] || {}) }; e.anim.entree.delai = d; }); };
    const en = a.entree, bo = a.boucle, so = a.sortie, dirs = ['glisse', 'revelation', 'rebond'];
    p.replaceChildren(
      el('h3', { textContent: s.length > 1 ? `${s.length} éléments : réglages appliqués à tous` : s[0].el.nom }),
      choix('Préréglage', presets, () => '', appliquerPreset, { id: 'anim-preset' }),
      el('div', { className: 'rangee' }, bouton('Prévisualiser', () => ctx.jouer(0)), bouton('Enregistrer comme préréglage', () => ctx.enregistrerPreset(a))),
      details('Entrée', true, choix('Type', ENTREES, () => en.type, tous((x, v) => { x.entree.type = v; }), { id: 'anim-entree' }),
        dirs.includes(en.type) || en.type === 'revelation' ? choix('Direction', DIRECTIONS, () => en.dir, tous((x, v) => { x.entree.dir = v; })) : null,
        g2(num('Durée (s)', () => en.duree, tous((x, v) => { x.entree.duree = Math.max(0.05, v); }), { pas: 0.05, min: 0.05, id: 'anim-duree' }), num('Délai (s)', () => en.delai, tous((x, v) => { x.entree.delai = Math.max(0, v); }), { pas: 0.05, min: 0, id: 'anim-delai' })),
        choix('Courbe', Object.fromEntries(Object.entries(COURBES).map(([k, v]) => [k, v.nom])), () => en.courbe, tous((x, v) => { x.entree.courbe = v; if (v === 'perso' && !x.entree.points) x.entree.points = [0.2, 0.8, 0.2, 1]; }), { id: 'anim-courbe' }),
        en.courbe === 'perso' ? el('div', { className: 'grille4' }, ...[0, 1, 2, 3].map((i) => num(['x1', 'y1', 'x2', 'y2'][i], () => (en.points || [0.2, 0.8, 0.2, 1])[i], tous((x, v) => { x.entree.points = [...(x.entree.points || [0.2, 0.8, 0.2, 1])]; x.entree.points[i] = v; }), { pas: 0.05, cle: 'bz' + i }))) : null,
        plage('Amplitude', () => en.force ?? 1, tous((x, v) => { x.entree.force = v; }), { min: 0.1, max: 2 })),
      details('Boucle', bo.type !== 'aucune', choix('Type', BOUCLES, () => bo.type, tous((x, v) => { x.boucle.type = v; }), { id: 'anim-boucle' }),
        g3(plage('Amplitude', () => bo.amplitude, tous((x, v) => { x.boucle.amplitude = v; }), { min: -2, max: 3, cle: 'ba' }), num('Période (s)', () => bo.periode, tous((x, v) => { x.boucle.periode = Math.max(0.1, v); }), { pas: 0.1, min: 0.1 }), num('Début (s)', () => bo.delai, tous((x, v) => { x.boucle.delai = Math.max(0, v); }), { pas: 0.1, cle: 'bd' }))),
      details('Sortie', so.type !== 'aucune', choix('Type', SORTIES, () => so.type, tous((x, v) => { x.sortie.type = v; }), { id: 'anim-sortie' }),
        so.type === 'glisse' || so.type === 'revelation' ? choix('Direction', DIRECTIONS, () => so.dir, tous((x, v) => { x.sortie.dir = v; }), { cle: 'sd' }) : null,
        g2(num('Durée (s)', () => so.duree, tous((x, v) => { x.sortie.duree = Math.max(0.05, v); }), { pas: 0.05, cle: 'sdu' }), num('Avant la fin (s)', () => so.avance, tous((x, v) => { x.sortie.avance = Math.max(0, v); }), { pas: 0.05, cle: 'sa' })),
        choix('Courbe', Object.fromEntries(Object.entries(COURBES).filter(([k]) => k !== 'perso').map(([k, v]) => [k, v.nom])), () => so.courbe, tous((x, v) => { x.sortie.courbe = v; }), { cle: 'sc' })),
      s.length > 1 ? details('Enchaînement', true, el('p', { className: 'info', textContent: 'Décale les entrées dans l\'ordre des calques (du fond vers le premier plan).' }),
        el('div', { className: 'rangee' }, ...[0.1, 0.2, 0.35].map((d) => bouton(`Échelonner ${String(d).replace('.', ',')} s`, () => modifier(() => { const base = Math.min(...s.map((x) => x.el.anim.entree.delai || 0)); s.forEach((x, i) => { x.el.anim.entree.delai = Math.round((base + i * d) * 100) / 100; }); }), { id: d === 0.2 ? 'echelonner' : undefined })))) : null,
    );
  }
  // ---------- Calques ----------
  function calques() {
    $('#actions-calques').replaceChildren(bouton('Grouper', grouper), bouton('Dégrouper', degrouper), bouton('Dupliquer', dupliquer), bouton('Supprimer', supprimer));
    const lignes = []; const vis = (els, prof) => [...els].reverse().forEach((e) => { lignes.push(ligne(e, prof)); if (e.enfants && (prof < 1 || S.sel.some((id) => e.enfants.some((c) => c.id === id)))) vis(e.enfants, prof + 1); });
    vis(S.doc.elements, 0); $('#arbre').replaceChildren(...lignes);
    if (!lignes.length) $('#arbre').append(el('li', { className: 'vide', textContent: 'Aucun calque : page blanche.' }));
  }
  function ligne(e, prof) {
    const nom = bIco({ texte: 'texte', image: 'image', forme: 'forme', effet: 'effet', groupe: 'composant', vecteur: 'forme', sceau: 'composant' }[e.type] || 'forme', e.nom, (ev) => selectionner(e.id, ev.shiftKey || ev.ctrlKey || ev.metaKey), { className: 'nom-calque', title: e.nom });
    nom.style.paddingLeft = 8 + prof * 16 + 'px';
    nom.addEventListener('dblclick', () => { const n = prompt('Nom du calque', e.nom); if (n) modifier(() => { e.nom = n; }); });
    return el('li', { dataset: { id: e.id, actif: String(S.sel.includes(e.id)), visible: String(e.visible !== false) } }, nom,
      bIco(e.visible !== false ? 'oeil' : 'oeilFerme', '', () => modifier(() => { e.visible = e.visible === false; }), { className: 'ico oeil', label: `${e.visible !== false ? 'Masquer' : 'Afficher'} ${e.nom}` }),
      bIco(e.verrou ? 'cadenas' : 'cadenasOuvert', '', () => modifier(() => { e.verrou = !e.verrou; }), { className: 'ico verrou', label: `${e.verrou ? 'Déverrouiller' : 'Verrouiller'} ${e.nom}` }),
      bIco('monter', '', () => { selectionner(e.id); ordre('avant'); }, { className: 'ico', label: `Monter ${e.nom}` }), bIco('descendre', '', () => { selectionner(e.id); ordre('arriere'); }, { className: 'ico', label: `Descendre ${e.nom}` }));
  }
  // ---------- Document ----------
  // Son : effets synthétisés sur l'appareil (libres de droits) ou fichiers audio importés, placés sur la ligne de temps
  function sonP(d) {
    const a = d.audio || (d.audio = { volume: 0.9, muet: false, pistes: [] }), maj = () => setTimeout(documentP);
    const ligne = (p) => el('div', { className: 'piste-son', dataset: { piste: p.id } },
      p.source === 'fichier' ? el('span', { className: 'nom-son', textContent: `♪ ${p.nom}` }) : choix('Effet', Object.fromEntries(Object.entries(SONS).map(([k, v]) => [k, v.nom])), () => p.sfx, (v) => { p.sfx = v; p.nom = SONS[v].nom; p.auto = false; }, { cle: 'sfx' + p.id }),
      num('Début (s)', () => p.t, (v) => { p.t = Math.max(0, v); p.auto = false; }, { pas: 0.05, min: 0, cle: 't' + p.id }),
      plage('Volume', () => p.volume, (v) => { p.volume = v; }, { max: 1.5, cle: 'v' + p.id }),
      el('div', { className: 'rangee' }, bouton('▶ Écouter', () => ctx.ecouter(p.sfx, p.ressource), { label: `Écouter ${p.nom}` }), bouton('Placer à la tête de lecture', () => modifier(() => { p.t = Math.round(S.t * 100) / 100; p.auto = false; }) || maj()),
        bouton('Supprimer', () => { modifier(() => { a.pistes = a.pistes.filter((x) => x !== p); }); maj(); }, { className: 'danger' })));
    return details('Son', !!a.pistes.length,
      g2(bascule('Couper le son', () => a.muet, (v) => { a.muet = v; }, { id: 'son-muet' }), plage('Volume général', () => a.volume, (v) => { a.volume = v; }, { id: 'son-volume' })),
      el('div', { className: 'rangee' }, bouton('Sons automatiques', () => { modifier(() => { a.pistes = [...a.pistes.filter((p) => !p.auto), ...ctx.sonsAuto()]; }); maj(); }, { id: 'sons-auto', title: 'Place des effets synchronisés sur les apparitions, impacts et transitions' }),
        bouton('Ajouter un effet', () => { modifier(() => { a.pistes.push({ id: nouvelId('s'), source: 'sfx', sfx: 'whoosh', nom: SONS.whoosh.nom, t: Math.round(S.t * 100) / 100, volume: 0.8, fondu: 0 }); }); maj(); }, { id: 'son-ajouter' }),
        bouton('Importer une musique ou un son…', () => ctx.importerSon(), { id: 'son-importer' })),
      ...a.pistes.slice().sort((x, y) => x.t - y.t).map(ligne),
      el('p', { className: 'info', textContent: 'Effets synthétisés sur l\'appareil : libres de droits. Une musique importée reste locale ; vérifier vos droits avant diffusion. Le son est inclus dans les exports vidéo (WebM, MP4) ; le GIF est muet.' }));
  }
  // Profil de direction artistique : applique les couleurs et le système enregistrés (Production › Profils DA)
  function profilsDA(d) {
    const sel = el('select', { id: 'doc-profil' }, el('option', { value: '', textContent: 'Aucun profil' })), corps = details('Direction artistique', !!d.profil, champ('Profil enregistré', sel),
      bouton('Appliquer le profil', async () => { const p = (await ctx.profils()).find((x) => x.id === sel.value); if (p) ctx.appliquerProfil(p); }, { id: 'doc-appliquer-profil' }),
      el('p', { className: 'info', textContent: d.brief ? 'Création issue d\'une intention : « Décliner dans ce format » la recompose réellement pour le nouveau support, avec cette direction artistique.' : 'Les profils se créent dans Production › Profils DA, à partir d\'une image de référence.' }),
      el('a', { href: '../production/#profils', textContent: 'Gérer les profils →' }));
    ctx.profils().then((ps) => { sel.append(...ps.map((p) => el('option', { value: p.id, textContent: `${p.nom} · ${p.niveau === 'marque' ? 'marque' : p.niveau === 'campagne' ? 'campagne' : 'création'}` }))); sel.value = d.profil || ''; });
    return corps;
  }
  function documentP() {
    const d = S.doc, p = $('#onglet-document'), sy = SYSTEMES[d.systeme], groupes = {};
    for (const [id, f] of Object.entries(FORMATS_STUDIO)) (groupes[f.groupe] ||= {})[id] = `${f.nom} · ${f.w} × ${f.h}`;
    groupes.Autre = { perso: 'Personnalisé…' };
    const fmtSel = el('select', { id: 'doc-format' }, ...Object.entries(groupes).map(([g, o]) => el('optgroup', { label: g }, ...Object.entries(o).map(([v, t]) => el('option', { value: v, textContent: t })))));
    fmtSel.value = d.format.id; const lw = el('input', { type: 'number', value: d.format.w, min: 64, max: 8192, id: 'doc-largeur' }), lh = el('input', { type: 'number', value: d.format.h, min: 64, max: 8192, id: 'doc-hauteur' });
    const adapt = el('input', { type: 'checkbox', checked: true, id: 'doc-adapter' });
    const changerFormat = () => { const nf = fmt(fmtSel.value, lw.value, lh.value); if (nf.w === d.format.w && nf.h === d.format.h && nf.id === d.format.id) return; modifier(() => { if (adapt.checked) { const a = adapter(S.doc, nf); S.doc.elements = a.elements; S.doc.guides = a.guides; } S.doc.format = nf; }); ctx.dessiner(); documentP(); };
    fmtSel.addEventListener('change', () => { if (fmtSel.value !== 'perso') { const f = FORMATS_STUDIO[fmtSel.value]; lw.value = f.w; lh.value = f.h; changerFormat(); } else { lw.focus(); } });
    const palettes = Object.fromEntries(Object.entries(sy.palettes).map(([k, v]) => [k, v.nom]));
    p.replaceChildren(
      details('Format', true, champ('Format', fmtSel), g2(champ('Largeur (px)', lw), champ('Hauteur (px)', lh)), bouton('Appliquer les dimensions', changerFormat), el('label', { className: 'bascule' }, adapt, 'Adapter la composition (ancrages)'),
        bouton('Décliner dans ce format en copie', () => ctx.declinaison(fmt(fmtSel.value, lw.value, lh.value)), { id: 'doc-decliner' }), el('p', { className: 'info', textContent: `Au-delà de 8192 px de côté, l'export n'est pas proposé. Les formats d'impression sont en 300 dpi.` })),
      details('Système graphique', true, choix('Système', Object.fromEntries(Object.entries(SYSTEMES).map(([k, v]) => [k, v.nom])), () => d.systeme, (v) => { d.systeme = v; d.palette = Object.keys(SYSTEMES[v].palettes)[0]; d.couleurs = {}; setTimeout(documentP); }, { id: 'doc-systeme' }),
        el('p', { className: 'info', textContent: sy.principe }), choix('Palette', palettes, () => d.palette, (v) => { d.palette = v; d.couleurs = {}; setTimeout(documentP); }, { id: 'doc-palette' }),
        el('div', { className: 'grille3' }, ...Object.entries(JETONS).map(([k, n]) => { const i = el('input', { type: 'color', value: palette(d)[k] }); i.addEventListener('input', () => modifier(() => { d.couleurs[k] = i.value.toUpperCase(); d.couleursPropres = { ...(d.couleursPropres || {}), [k]: d.couleurs[k] }; }, 'pal' + k)); i.setAttribute('aria-label', n); return el('label', { className: 'champ' }, n, i); })),
        bouton('Couleurs de la palette', () => { modifier(() => { d.couleurs = {}; delete d.couleursPropres; }); documentP(); })),
      profilsDA(d),
      details('Fond', true, choix('Type', { couleur: 'Couleur unie', degrade: 'Dégradé linéaire', radial: 'Dégradé radial', transparent: 'Transparent' }, () => d.fond.type, (v) => { d.fond.type = v; }, { id: 'doc-fond' }), g2(couleur('Couleur 1', () => d.fond.c1, (v) => { d.fond.c1 = v; }), couleur('Couleur 2', () => d.fond.c2, (v) => { d.fond.c2 = v; })), num('Angle', () => d.fond.angle, (v) => { d.fond.angle = v; }, { cle: 'fa' })),
      details('Animation de la composition', true, g2(num('Durée (s)', () => d.duree, (v) => { d.duree = Math.min(60, Math.max(1, v)); }, { pas: 0.5, min: 1, max: 60, id: 'doc-duree' }), bascule('Lecture en boucle', () => d.boucle, (v) => { d.boucle = v; })),
        g2(choix('Caméra', CAMERAS, () => d.camera.type, (v) => { d.camera.type = v; }, { id: 'doc-camera' }), plage('Intensité', () => d.camera.intensite, (v) => { d.camera.intensite = v; }, { cle: 'ci' })),
        el('p', { className: 'info', textContent: 'La caméra déplace toute la scène ; la profondeur de chaque calque (Propriétés) règle sa parallaxe.' })),
      sonP(d),
      details('Grille et guides', false, g2(num('Pas de la grille (px)', () => d.grille.pas, (v) => { d.grille.pas = Math.max(4, v); }, { min: 4 }), bascule('Magnétisme de la grille', () => d.grille.aimant, (v) => { d.grille.aimant = v; })),
        el('div', { className: 'rangee' }, bouton('Guides au centre', () => modifier(() => { d.guides.v.push(d.format.w / 2); d.guides.h.push(d.format.h / 2); })), bouton('Guides des tiers', () => modifier(() => { d.guides.v.push(d.format.w / 3, (2 * d.format.w) / 3); d.guides.h.push(d.format.h / 3, (2 * d.format.h) / 3); })), bouton('Effacer les guides', () => modifier(() => { d.guides = { h: [], v: [] }; }))),
        el('p', { className: 'info', textContent: 'Glisser depuis une règle pour créer un guide ; le glisser hors de la scène pour le supprimer.' })),
      details('Organisation et versions', false, texte('Dossier (collection)', () => d.dossier, (v) => { d.dossier = v; }, { id: 'doc-dossier' }), el('div', { className: 'rangee' }, bouton('Enregistrer une version', () => ctx.enregistrerVersion(), { id: 'doc-version' }), bouton('Enregistrer comme modèle', () => ctx.enregistrerModele(), { id: 'doc-modele' })), el('ul', { id: 'liste-versions', className: 'arbre' }), el('p', { className: 'info', id: 'etat-persistance' })),
    );
    ctx.listerVersions();
  }
  return {
    reconstruire() { maj = []; proprietes(); animation(); calques(); documentP(); },
    rafraichir() { for (const f of maj) f(); calques(); },
    proprietes, animation, calques, documentP, onglet,
  };
}
export { el, bouton, trouverEl, normaliserEl, nouvelId };
