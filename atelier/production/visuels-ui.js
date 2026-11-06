// Production › Visuels : bibliothèque visuelle locale (images, fiches de personnages, collections) et comparaison des traitements.
// Parcours rapide : vignettes légères, pagination, filtres combinables ; les originaux ne sont lus qu'à l'ouverture d'une fiche.
import { db } from '../motion/stockage.js';
import { CATEGORIES, ROLES, importerVisuel, synchroniser, supprimerVisuel, utilisations, choisirImage, infoImage, etatStockage } from '../motion/visuels.js';
import { composer, TRAITEMENTS } from '../../templates/_systeme/studio-compositeur.js';
import { UNIVERS } from '../../templates/_systeme/studio-personnages.js';

const PAGE = 60, sansA = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const mo = (o) => (o > 1048576 ? `${(o / 1048576).toFixed(1)} Mo` : `${Math.max(1, Math.round(o / 1024))} Ko`);
const liste = (s) => [...new Set(String(s || '').split(/[,;]+/).map((x) => x.trim()).filter(Boolean))];

export function initVisuels({ el, bouton, champ, choix, info, image, enregistrer, ouvrirStudio, rafraichirVisuels }) {
  const $ = (s) => document.querySelector(s);
  let visuels = [], fiches = [], choisis = new Set(), page = 1, filtreCollection = '', pret = false;
  $('#import-categorie').append(el('option', { value: '', textContent: 'Catégorie : automatique' }), ...Object.entries(CATEGORIES).map(([v, t]) => el('option', { value: v, textContent: t })));
  $('#v-categorie').append(...Object.entries(CATEGORIES).map(([v, t]) => el('option', { value: v, textContent: t })));

  async function charger() { [visuels, fiches] = await Promise.all([db.tous('visuels'), db.tous('personnages')]); await rafraichirVisuels(); }
  async function afficher() {
    if (!pret) { pret = true; const n = await synchroniser().catch(() => 0); if (n) info(`${n} image(s) de Motion Studio ajoutée(s) à la bibliothèque.`); }
    await charger(); collections(); personnages(); grille(); stockage();
  }
  // ---------- Import ----------
  $('#visuel-fichiers').addEventListener('change', async (ev) => {
    const fs = [...ev.target.files]; ev.target.value = ''; let ok = 0, dbl = 0, red = 0; const cat = $('#import-categorie').value, col = filtreCollection;
    for (const [i, f] of fs.entries()) { info(`Import ${i + 1}/${fs.length} : ${f.name}…`);
      try { const r = await importerVisuel(f, { ...(cat ? { categorie: cat } : {}), ...(col ? { collections: [col] } : {}) }); ok++; if (r.doublon) dbl++; if (r.ressource.reduite) red++; }
      catch { info(`« ${f.name} » illisible (formats : PNG, JPG, WebP, AVIF, GIF ; convertir les photos HEIC en JPG).`); } }
    await charger(); page = 1; grille(); collections(); stockage();
    info(`${ok} image(s) importée(s)${dbl ? ` · ${dbl} déjà présente(s), non dupliquée(s)` : ''}${red ? ` · ${red} copie(s) de travail réduite(s) à 4096 px` : ''}.`);
  });
  // ---------- Filtres et grille ----------
  const filtres = () => { const q = sansA($('#v-recherche').value).trim(), cat = $('#v-categorie').value, fav = $('#v-favoris').checked, tr = $('#v-transparents').checked, tri = $('#v-tri').value;
    const r = visuels.filter((v) => (!q || sansA([v.nom, ...v.tags, ...v.collections, CATEGORIES[v.categorie]].join(' ')).includes(q) || fiches.some((f) => sansA(f.nom).includes(q) && Object.values(f.images || {}).includes(v.id)))
      && (!cat || v.categorie === cat) && (!fav || v.favori) && (!tr || v.alpha) && (!filtreCollection || v.collections.includes(filtreCollection)));
    return r.sort(tri === 'nom' ? (a, b) => a.nom.localeCompare(b.nom) : tri === 'taille' ? (a, b) => b.taille - a.taille : (a, b) => b.ajoute - a.ajoute); };
  ['#v-recherche', '#v-categorie', '#v-favoris', '#v-transparents', '#v-tri'].forEach((s) => $(s).addEventListener('input', () => { page = 1; grille(); }));
  function grille() {
    const r = filtres(), vis = r.slice(0, page * PAGE);
    $('#v-resume').textContent = `${r.length} image(s) sur ${visuels.length}${filtreCollection ? ` · collection « ${filtreCollection} »` : ''}${choisis.size ? ` · ${choisis.size} sélectionnée(s)` : ''}.`;
    $('#barre-visuels').hidden = !choisis.size;
    $('#grille-visuels').replaceChildren(...vis.map(carte), ...(r.length > vis.length ? [el('li', { className: 'plus' }, bouton(`Afficher ${Math.min(PAGE, r.length - vis.length)} de plus`, () => { page++; grille(); }))] : []));
    if (!visuels.length) $('#grille-visuels').replaceChildren(el('li', { className: 'vide', textContent: 'Bibliothèque vide : importer des personnages, couvertures, décors ou textures (sélection multiple possible).' }));
  }
  function carte(v) {
    const cb = el('input', { type: 'checkbox', checked: choisis.has(v.id), 'aria-label': `Sélectionner ${v.nom}` }); cb.addEventListener('change', () => { cb.checked ? choisis.add(v.id) : choisis.delete(v.id); grille(); });
    const fav = bouton(v.favori ? '★' : '☆', async () => { v.favori = !v.favori; await db.ecrire('visuels', v); grille(); }, { className: 'favori', 'aria-pressed': String(!!v.favori), 'aria-label': 'Favori' });
    const perso = fiches.find((f) => Object.values(f.images || {}).includes(v.id));
    const li = el('li', { className: 'carte-visuel', dataset: { visuel: v.id, alpha: v.alpha ? '1' : '0' } }, el('div', { className: 'tete-carte' }, cb, fav),
      el('button', { type: 'button', className: 'vignette-visuel', 'aria-label': `Ouvrir la fiche de ${v.nom}` }, el('img', { src: v.vignette, alt: '', loading: 'lazy', decoding: 'async' })),
      el('div', { className: 'infos' }, el('b', { textContent: v.nom }), el('span', { textContent: `${CATEGORIES[v.categorie] || v.categorie} · ${v.w}×${v.h}${v.alpha ? ' · transparent' : ''}` }), perso ? el('span', { className: 'lien-perso', textContent: `${perso.nom} · ${ROLES[Object.entries(perso.images).find(([, x]) => x === v.id)[0]]}` }) : null));
    li.querySelector('.vignette-visuel').addEventListener('click', () => ficheVisuel(v));
    return li;
  }
  // Actions par lot
  $('#v-tout').addEventListener('click', () => { const r = filtres(); choisis = choisis.size === r.length ? new Set() : new Set(r.map((v) => v.id)); grille(); });
  const lot = async (fn, msg) => { for (const v of visuels.filter((x) => choisis.has(x.id))) { fn(v); await db.ecrire('visuels', v); } await charger(); grille(); collections(); info(msg); };
  $('#lot-tag').addEventListener('click', () => { const t = liste($('#lot-tag-valeur').value); if (t.length) lot((v) => { v.tags = [...new Set([...v.tags, ...t])]; }, `Tags ajoutés à ${choisis.size} image(s).`); });
  $('#lot-collection').addEventListener('click', () => { const c = $('#lot-tag-valeur').value.trim(); if (c) lot((v) => { v.collections = [...new Set([...v.collections, c])]; }, `${choisis.size} image(s) ajoutée(s) à « ${c} ».`); });
  $('#lot-categorie').addEventListener('change', () => { const c = $('#lot-categorie').value; if (c) lot((v) => { v.categorie = c; }, 'Catégorie modifiée.'); $('#lot-categorie').value = ''; });
  $('#lot-supprimer').addEventListener('click', async () => { if (!confirm(`Supprimer définitivement ${choisis.size} image(s) de la bibliothèque ? Les créations enregistrées qui les utilisent les perdront à la prochaine ouverture si elles n'ont pas été exportées en projet.`)) return;
    for (const id of choisis) await supprimerVisuel(id); choisis.clear(); await charger(); grille(); collections(); personnages(); stockage(); info('Images supprimées.'); });
  $('#lot-categorie').append(el('option', { value: '', textContent: 'Catégorie…' }), ...Object.entries(CATEGORIES).map(([v, t]) => el('option', { value: v, textContent: t })));
  // Collections
  function collections() {
    const cs = [...new Set(visuels.flatMap((v) => v.collections))].sort();
    $('#liste-collections').replaceChildren(el('li', {}, bouton('Toutes les images', () => { filtreCollection = ''; page = 1; collections(); grille(); }, { 'aria-pressed': String(!filtreCollection) })),
      ...cs.map((c) => el('li', {}, bouton(`${c} (${visuels.filter((v) => v.collections.includes(c)).length})`, () => { filtreCollection = c; page = 1; collections(); grille(); }, { 'aria-pressed': String(filtreCollection === c) }))));
  }
  async function stockage() { const s = await etatStockage(); $('#stockage').textContent = `${visuels.length} image(s) · ${mo(visuels.reduce((t, v) => t + (v.taille || 0), 0))} d'originaux · stockage utilisé ${mo(s.utilise)}${s.quota ? ` sur ${mo(s.quota)} disponibles` : ''} · ${s.persistant ? 'persistant' : 'non garanti : exporter la bibliothèque régulièrement'}.`; }

  // ---------- Fiche d'une image ----------
  async function ficheVisuel(v) {
    const dlg = $('#dialogue-visuel'), f = $('#form-visuel'), nom = el('input', { type: 'text', value: v.nom, id: 'fv-nom' }), cat = choix(CATEGORIES, v.categorie), tags = el('input', { type: 'text', value: v.tags.join(', '), id: 'fv-tags' }), cols = el('input', { type: 'text', value: v.collections.join(', '), id: 'fv-collections' });
    const apercu = el('img', { className: 'apercu-visuel', src: v.vignette, alt: v.nom, dataset: { fond: v.alpha ? 'damier' : '' } });
    db.lire('ressources', v.id).then((r) => { if (r) apercu.src = r.href; });
    const fsel = choix({ '': 'Aucune fiche', ...Object.fromEntries(fiches.map((x) => [x.id, x.nom])) }, fiches.find((x) => Object.values(x.images || {}).includes(v.id))?.id || ''), rsel = choix(ROLES, v.alpha ? 'transparente' : v.orientation === 'portrait' ? 'portrait' : 'action');
    const sauver = async () => { Object.assign(v, { nom: nom.value.trim() || v.nom, categorie: cat.value, tags: liste(tags.value), collections: liste(cols.value) }); await db.ecrire('visuels', v);
      if (fsel.value) { const p = fiches.find((x) => x.id === fsel.value); p.images = { ...(p.images || {}), [rsel.value]: v.id }; await db.ecrire('personnages', p); } };
    const util = await utilisations(v.id);
    f.replaceChildren(el('h2', { className: 'titre-section', textContent: 'Image' }), apercu,
      el('p', { className: 'note', textContent: `${v.w} × ${v.h} px · ${v.orientation} · ${mo(v.taille)}${v.alpha ? ' · transparence réelle détectée' : ' · opaque'}${v.reduite ? ' · copie de travail réduite (original > 4096 px)' : ''}${util.length ? ` · utilisée dans ${util.length} création(s)` : ''}.` }),
      el('div', { className: 'grille2' }, champ('Nom', nom), champ('Catégorie', cat)), el('div', { className: 'grille2' }, champ('Tags (virgules)', tags), champ('Collections (virgules)', cols)),
      el('h3', { textContent: 'Associer à une fiche de personnage' }), el('div', { className: 'grille2' }, champ('Fiche', fsel), champ('Rôle de l\'image', rsel)),
      el('p', { className: 'note', textContent: 'L\'identité d\'un personnage n\'est jamais déduite de l\'image : l\'association est toujours la vôtre.' }),
      el('div', { className: 'rangee' }, bouton('Enregistrer', async () => { await sauver(); dlg.close(); await charger(); grille(); personnages(); info('Fiche enregistrée.'); }, { className: 'accent', id: 'fv-enregistrer' }),
        bouton('Comparer les traitements', async () => { await sauver(); dlg.close(); await charger(); const p = fiches.find((x) => x.id === fsel.value); comparer(p ? { nom: p.nom, univers: p.univers, image: v.id, role: rsel.value, imageInfo: infoImage(v, rsel.value) } : { nom: '', image: v.id, role: rsel.value, imageInfo: infoImage(v, rsel.value) }, p?.nom || v.nom); }, { id: 'fv-comparer' }),
        bouton('Supprimer', async () => { if (!confirm(`Supprimer « ${v.nom} » ?${util.length ? ` Elle est utilisée dans ${util.length} création(s) : ${util.slice(0, 3).join(', ')}.` : ''}`)) return; await supprimerVisuel(v.id); dlg.close(); await charger(); grille(); personnages(); stockage(); info('Image supprimée.'); }, { className: 'danger' }),
        bouton('Fermer', () => dlg.close())));
    dlg.showModal();
  }

  // ---------- Fiches de personnages ----------
  function personnages() {
    $('#liste-personnages').replaceChildren(...fiches.sort((a, b) => a.nom.localeCompare(b.nom)).map((p) => { const c = choisirImage(p, 'une'), v = c && visuels.find((x) => x.id === c.id);
      return el('li', {}, bouton('', () => fichePersonnage(p), { className: 'perso', dataset: { fiche: p.id } }, )); }));
    [...$('#liste-personnages').querySelectorAll('button')].forEach((b, i) => { const p = fiches[i], c = choisirImage(p, 'une'), v = c && visuels.find((x) => x.id === c.id); b.append(v ? el('img', { src: v.vignette, alt: '' }) : el('span', { className: 'sans-image' }), el('span', { textContent: p.nom }), el('small', { textContent: `${Object.keys(p.images || {}).length} image(s)` })); });
  }
  $('#nouvelle-fiche').addEventListener('click', () => fichePersonnage({ id: `pf${Date.now().toString(36)}`, nom: '', univers: '', version: '', description: '', tags: [], images: {}, nouveau: true }));
  function fichePersonnage(p0) {
    const p = JSON.parse(JSON.stringify(p0)), dlg = $('#dialogue-visuel'), f = $('#form-visuel');
    const nom = el('input', { type: 'text', value: p.nom, id: 'fp-nom', required: true, placeholder: 'Nom choisi par vous' }), univ = choix({ '': 'Non précisé', ...UNIVERS }, p.univers), version = el('input', { type: 'text', value: p.version || '', placeholder: 'Ex. : version classique, 2020…' });
    const desc = el('textarea', { rows: 2, value: p.description || '' }), tags = el('input', { type: 'text', value: (p.tags || []).join(', ') });
    const candidates = visuels.filter((v) => ['personnage', 'transparente', 'illustration', 'promo', 'couverture'].includes(v.categorie));
    const emplacements = Object.entries(ROLES).map(([r, n]) => { const v = visuels.find((x) => x.id === p.images?.[r]), sel = choix({ '': '—', ...Object.fromEntries(candidates.map((x) => [x.id, x.nom])) }, p.images?.[r] || ''), img = el('img', { src: v?.vignette || '', alt: '', hidden: !v });
      sel.dataset.role = r; sel.addEventListener('change', () => { if (sel.value) p.images[r] = sel.value; else delete p.images[r]; const w = visuels.find((x) => x.id === sel.value); img.src = w?.vignette || ''; img.hidden = !w; });
      const fic = el('input', { type: 'file', accept: 'image/*', className: 'masque', id: `fp-fichier-${r}` }); fic.addEventListener('change', async () => { const x = fic.files[0]; fic.value = ''; if (!x) return; const res = await importerVisuel(x, { categorie: r === 'transparente' ? 'transparente' : 'personnage' }); p.images[r] = res.visuel.id; await charger(); sel.append(el('option', { value: res.visuel.id, textContent: res.visuel.nom })); sel.value = res.visuel.id; img.src = res.visuel.vignette; img.hidden = false; });
      return el('div', { className: 'emplacement' }, img, champ(n, sel), el('label', { className: 'bouton petit', htmlFor: fic.id, textContent: 'Importer…' }), fic); });
    const sauver = async () => { if (!nom.value.trim()) { nom.focus(); info('Donner un nom à la fiche.'); return false; } Object.assign(p, { nom: nom.value.trim(), univers: univ.value, version: version.value, description: desc.value, tags: liste(tags.value) }); delete p.nouveau; await db.ecrire('personnages', p); await charger(); personnages(); grille(); return true; };
    f.replaceChildren(el('h2', { className: 'titre-section', textContent: 'Fiche de personnage' }),
      el('div', { className: 'grille2' }, champ('Nom', nom), champ('Ambiance d\'univers', univ), champ('Version', version), champ('Tags', tags)), champ('Description (facultative, vos informations)', desc),
      el('h3', { textContent: 'Images du personnage' }), el('div', { className: 'emplacements' }, ...emplacements),
      el('p', { className: 'note', textContent: 'Le compositeur choisit l\'image adaptée à chaque mise en scène : transparente ou silhouette pour un duel, portrait pour une une éditoriale, action pour une annonce.' }),
      el('div', { className: 'rangee' }, bouton('Enregistrer', async () => { if (await sauver()) { dlg.close(); info(`Fiche « ${p.nom} » enregistrée.`); } }, { className: 'accent', id: 'fp-enregistrer' }),
        bouton('Comparer les traitements', async () => { if (!(await sauver())) return; dlg.close(); const c = choisirImage(p, 'heros'), v = c && visuels.find((x) => x.id === c.id); comparer({ nom: p.nom, univers: p.univers || null, ...(v ? { image: v.id, role: c.role, imageInfo: infoImage(v, c.role) } : {}) }, p.nom); }, { id: 'fp-comparer' }),
        p.nouveau ? null : bouton('Supprimer la fiche', async () => { if (!confirm(`Supprimer la fiche « ${p.nom} » ? Ses images restent dans la bibliothèque.`)) return; await db.suppr('personnages', p.id); dlg.close(); await charger(); personnages(); grille(); }, { className: 'danger' }),
        bouton('Fermer', () => dlg.close())));
    dlg.showModal();
  }

  // ---------- Comparaison des traitements ----------
  const FORMATS_COMP = { miniature: 'Miniature', '1:1': 'Carré', '9:16': 'Story' };
  async function comparer(perso, titre) {
    const dlg = $('#dialogue-comparer'), z = $('#grille-comparer'), brief = { type: 'portrait', titre: titre || 'Titre', personnages: [perso] };
    $('#comparer-titre').textContent = `Comparer les traitements · ${titre || 'image'}`; z.replaceChildren(); dlg.showModal();
    for (const [t, tr] of Object.entries(TRAITEMENTS)) { const ligne = el('div', { className: 'ligne-comparer' }, el('h3', { textContent: tr.nom })); z.append(ligne);
      for (const [f, n] of Object.entries(FORMATS_COMP)) { const d = composer(brief, f, { traitement: t }), cv = await image(d, 300);
        const fig = el('figure', { dataset: { traitement: t, format: f } }, cv, el('figcaption', {}, `${n}`, bouton('Créer', async () => { d.nom = `${titre || 'Création'} · ${tr.nom} · ${n}`; ouvrirStudio((await enregistrer(d, { dossier: titre || 'Visuels', origine: 'visuels' })).id); }, { className: 'accent petit' })));
        ligne.append(fig); } }
    info('Quatre traitements, trois formats : choisir puis « Créer » pour ouvrir dans Motion Studio.');
  }
  $('#fermer-comparer').addEventListener('click', () => $('#dialogue-comparer').close());
  return { afficher, comparer };
}
