// Motion Studio · compositions et animations comics, sur l'appareil (aucun serveur, aucun compte, aucune API externe).
import { composer, nouveauDoc, normaliser, FAMILLES_MOTION, DIRECTIONS, FORMATS_MOTION, EFFETS, PRESETS, placer } from '../../templates/_systeme/motion.js';
import { versSVG } from '../../templates/_systeme/motion-svg.js';
import PH from '../../templates/_systeme/placeholders.js';
import M from '../../templates/_systeme/metrics.js';
import T from '../../templates/_systeme/tokens.js';
import { creerRendu } from './rendu-canvas.js';
import { palette, creerGIF } from './gif.js';

const $ = (s) => document.querySelector(s);
const el = (tag, { dataset, ...props } = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); if (dataset) Object.assign(e.dataset, dataset); e.append(...kids.filter((k) => k !== null && k !== undefined)); return e; };
const bouton = (txt, fn, props = {}) => { const { 'aria-label': al, 'aria-pressed': ap, ...rest } = props; const b = el('button', { type: 'button', textContent: txt, ...rest }); if (al) b.setAttribute('aria-label', al); if (ap !== undefined) b.setAttribute('aria-pressed', ap); b.addEventListener('click', fn); return b; };
const MAX_SOURCE = 3000, JPG_MAX = 2 * 1024 * 1024;
const imagesPH = (n) => (PH[n] ? { href: '../../' + PH[n].src, w: PH[n].w, h: PH[n].h, placeholder: true, nom: 'PLACEHOLDER ' + n } : null);
const rendu = creerRendu();
let doc, scene, sel = null, t = 0, lecture = null;
const fam = () => FAMILLES_MOTION[doc.famille];
const sc = (tt = t, o = {}) => composer(doc, tt, { imagesPH, ...o });

// ---------- Stockage local (IndexedDB, sur l'appareil) ----------
const BASE = 'primestone-motion', MAG = 'creations', DERNIERE = 'primestone-motion-derniere';
const ouvrirBase = () => new Promise((ok, ko) => { const r = indexedDB.open(BASE, 1); r.onupgradeneeded = () => r.result.createObjectStore(MAG, { keyPath: 'id' }); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
const idb = async (mode, fn) => { const db = await ouvrirBase(); return new Promise((ok, ko) => { const tr = db.transaction(MAG, mode); const r = fn(tr.objectStore(MAG)); tr.oncomplete = () => { db.close(); ok(r?.result); }; tr.onerror = () => ko(tr.error); }); };
const nouvelId = () => 'c' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
let minuterie = null;
function sauver() {
  clearTimeout(minuterie);
  minuterie = setTimeout(async () => {
    doc.modifie = Date.now();
    try { await idb('readwrite', (s) => s.put(JSON.parse(JSON.stringify(doc)))); localStorage.setItem(DERNIERE, doc.id); $('#sauvegarde').textContent = `Enregistré sur cet appareil à ${new Date(doc.modifie).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}.`; listerCreations(); }
    catch { $('#sauvegarde').textContent = 'Sauvegarde locale indisponible dans ce navigateur (navigation privée ?). Utiliser « Enregistrer en fichier ».'; }
  }, 350);
}
async function listerCreations() {
  let toutes = []; try { toutes = (await idb('readonly', (s) => s.getAll())) || []; } catch { /* rien */ }
  toutes.sort((a, b) => (b.modifie || 0) - (a.modifie || 0));
  $('#nb-creations').textContent = toutes.length;
  $('#liste-creations').replaceChildren(...toutes.map((c) => el('li', { dataset: { id: c.id } },
    bouton(`${c.nom || 'Sans titre'}`, () => ouvrirCreation(c), { className: 'nom', title: `${FAMILLES_MOTION[c.famille]?.nom || ''} · ${c.format}` }),
    el('small', { textContent: new Date(c.modifie || 0).toLocaleDateString('fr-FR') }),
    bouton('Supprimer', async () => { if (!confirm(`Supprimer « ${c.nom} » de cet appareil ?`)) return; await idb('readwrite', (s) => s.delete(c.id)); if (c.id === doc.id) { creer(doc.famille); } listerCreations(); }, { 'aria-label': `Supprimer ${c.nom}` }))));
}
function ouvrirCreation(c) { doc = normaliser(c); doc.id = c.id; sel = null; arreter(); t = sc(0).pose; construire(); dessiner(); localStorage.setItem(DERNIERE, doc.id); }
function creer(famille, format = doc?.format) { doc = nouveauDoc(famille, { format }); doc.id = nouvelId(); doc.cree = Date.now(); sel = null; arreter(); t = sc(0).pose; construire(); dessiner(); sauver(); }

// ---------- Rendu de l'aperçu ----------
const cv = $('#apercu'), g = cv.getContext('2d');
let planifie = false;
function dessiner() {
  if (planifie) return; planifie = true;
  requestAnimationFrame(async () => {
    planifie = false; scene = sc(t);
    const W = scene.w, H = scene.h, larg = cv.getBoundingClientRect().width || 600, e = Math.min(1, (larg * Math.min(2, devicePixelRatio || 1)) / W);
    if (cv.width !== Math.round(W * e) || cv.height !== Math.round(H * e)) { cv.width = Math.round(W * e); cv.height = Math.round(H * e); }
    cv.style.setProperty('--r', (W / H).toFixed(4));
    await rendu.precharger(scene); rendu.dessiner(g, scene, e);
    const c = scene.couches.find((x) => x.id === sel);
    if (c && !lecture) { const reg = doc.calques[c.id] || {}, b = c.box, s = reg.s ?? 1, cx = b.x + b.w / 2 + (reg.x ?? 0) * W, cy = b.y + b.h / 2 + (reg.y ?? 0) * H;
      g.save(); g.setLineDash([10 / e, 6 / e]); g.lineWidth = 2 / e; g.strokeStyle = '#00C2FF'; g.strokeRect(cx - (b.w * s) / 2, cy - (b.h * s) / 2, b.w * s, b.h * s); g.restore(); }
    $('#temps').max = doc.duree; $('#temps').value = t; $('#temps-lu').textContent = `${t.toFixed(1).replace('.', ',')} s / ${doc.duree} s`;
    alertes(scene.alertes); if (!lecture) calques();
  });
}
function alertes(al) {
  const NIV = { erreur: 'Erreur', attention: 'Attention', info: 'Info' }, ordre = { erreur: 0, attention: 1, info: 2 };
  $('#alertes').replaceChildren(...(al.length ? [...al].sort((a, b) => ordre[a.niveau] - ordre[b.niveau]).map((a) => el('li', { dataset: { niveau: a.niveau } }, el('b', { textContent: NIV[a.niveau] }), a.message)) : [el('li', { textContent: 'Aucun problème détecté.' })]));
  const n = (x) => al.filter((a) => a.niveau === x).length, e = n('erreur'), at = n('attention'), r = $('#resume');
  r.dataset.niveau = e ? 'erreur' : at ? 'attention' : 'ok';
  r.textContent = e || at ? [e && `${e} erreur${e > 1 ? 's' : ''}`, at && `${at} point${at > 1 ? 's' : ''} d'attention`].filter(Boolean).join(' · ') : 'Contrôles OK';
  for (const i of document.querySelectorAll('#champs [data-champ]')) i.setAttribute('aria-invalid', al.some((a) => a.champ === i.dataset.champ && a.niveau === 'erreur'));
}

// ---------- Lecture ----------
function jouer(depuis = t >= doc.duree - 0.01 ? 0 : t) {
  arreter(); const t0 = performance.now() - depuis * 1000; lecture = { id: 0 };
  $('#lecture').textContent = '❚❚ Pause'; $('#lecture').setAttribute('aria-pressed', 'true');
  const pas = (now) => {
    if (!lecture) return; t = (now - t0) / 1000;
    if (t >= doc.duree) { if ($('#boucle').checked) { jouer(0); return; } t = doc.duree; dessiner(); arreter(); return; }
    dessiner(); lecture.id = requestAnimationFrame(pas);
  };
  lecture.id = requestAnimationFrame(pas);
}
function arreter() { if (lecture) cancelAnimationFrame(lecture.id); lecture = null; $('#lecture').textContent = '▶ Lecture'; $('#lecture').setAttribute('aria-pressed', 'false'); }
$('#lecture').addEventListener('click', () => (lecture ? (arreter(), dessiner()) : jouer()));
$('#rejouer').addEventListener('click', () => jouer(0));
$('#temps').addEventListener('input', () => { arreter(); t = +$('#temps').value; dessiner(); });

// ---------- Panneau ----------
function puces(c, items, actif, choisir) { c.replaceChildren(...items.map(([id, nom, titre]) => bouton(nom, () => choisir(id), { 'aria-pressed': String(id === actif), title: titre || '' }))); }
const modifier = (fn, { reconstruire = false, pose = false } = {}) => { fn(); if (pose) { arreter(); t = sc(0).pose; } if (reconstruire) construire(); dessiner(); sauver(); };
function construire() {
  const f = fam();
  $('#nom').value = doc.nom;
  puces($('#familles'), Object.entries(FAMILLES_MOTION).map(([id, x], i) => [id, `${i + 1} · ${x.nom}`, x.description]), doc.famille, (id) => modifier(() => { const keep = doc, avant = Object.fromEntries(fam().champs.map((c) => [c.id, c.defaut])); doc = normaliser({ ...keep, textes: Object.fromEntries(Object.entries(keep.textes).filter(([k, v]) => v !== avant[k])), famille: id, direction: FAMILLES_MOTION[id].directions[0], preset: FAMILLES_MOTION[id].preset, calques: {}, ordre: null, nom: keep.nom === FAMILLES_MOTION[keep.famille].nom ? FAMILLES_MOTION[id].nom : keep.nom }); doc.id = keep.id; doc.cree = keep.cree; sel = null; }, { reconstruire: true, pose: true }));
  $('#famille-desc').textContent = f.description;
  puces($('#directions'), f.directions.map((id) => [id, `${DIRECTIONS[id].genre} · ${DIRECTIONS[id].nom}`]), doc.direction, (id) => modifier(() => { doc.direction = id; doc.effets = {}; doc.couleurs = {}; }, { reconstruire: true }));
  puces($('#formats'), Object.entries(FORMATS_MOTION).map(([id, x]) => [id, `${x.nom} · ${x.w} × ${x.h}`, x.usage]), doc.format, (id) => modifier(() => { doc.format = id; }, { reconstruire: true }));
  puces($('#presets'), Object.entries(PRESETS).map(([id, n]) => [id, n]), doc.preset, (id) => { modifier(() => { doc.preset = id; }, { reconstruire: true }); jouer(0); });
  // Textes
  $('#champs').replaceChildren(...f.champs.map((c) => {
    let i;
    if (c.type === 'choix') i = el('select', {}, ...c.options.map((o) => el('option', { value: o, textContent: o })));
    else if (c.type === 'texte-long') i = el('textarea', { rows: 5 });
    else i = el('input', { type: 'text', autocomplete: 'off' });
    Object.assign(i, { id: `champ-${c.id}`, value: doc.textes[c.id] ?? '' }); i.dataset.champ = c.id;
    i.addEventListener('input', () => modifier(() => { doc.textes[c.id] = i.value; }));
    return el('label', { textContent: c.label + (c.conseil ? ` (${c.conseil})` : '') }, i);
  }));
  // Illustrations
  $('#images').replaceChildren(...f.images.map(blocImage));
  // Animation
  $('#duree').value = String(doc.duree); $('#vitesse').value = doc.vitesse; $('#lettres').checked = doc.lettres; $('#sortie').checked = doc.sortie;
  // Effets
  const dir = DIRECTIONS[doc.direction];
  $('#effets').replaceChildren(...Object.entries(EFFETS).map(([id, nom]) => {
    const v = doc.effets[id] ?? dir.effets[id] ?? 0, r = el('input', { type: 'range', min: 0, max: 100, step: 5, value: v, id: `effet-${id}` }), o = el('span', { textContent: v ? ` ${v}` : ' désactivé' });
    r.addEventListener('input', () => { o.textContent = +r.value ? ` ${r.value}` : ' désactivé'; modifier(() => { doc.effets[id] = +r.value; }); });
    return el('label', {}, el('span', {}, nom, o), r);
  }));
  $('#trame-image').checked = doc.trameImage; $('#sceau').checked = doc.sceau;
  // Couleurs
  const coul = { fond: 'Fond', accent: 'Accent', texte: 'Texte', encre: 'Encre' };
  $('#couleurs').replaceChildren(...Object.entries(coul).map(([id, nom]) => { const i = el('input', { type: 'color', value: (doc.couleurs[id] || dir[id]).slice(0, 7), id: `couleur-${id}` }); i.addEventListener('input', () => modifier(() => { doc.couleurs[id] = i.value.toUpperCase(); })); return el('label', {}, i, nom); }));
}
function blocImage(s) {
  const img = doc.images[s.id], vue = img || imagesPH(s.placeholder), utilise = scene ? scene.couches.some((c) => c.slot === s.id) : true;
  const f = el('input', { type: 'file', accept: 'image/*', hidden: true, id: `fichier-${s.id}` });
  f.addEventListener('change', async () => {
    const x = f.files?.[0]; if (!x) return;
    try { const im = await importer(x); modifier(() => { doc.images[s.id] = im; sel = s.id; }, { reconstruire: true }); }
    catch { $('#export-info').textContent = `Impossible de lire « ${x.name} ». Formats acceptés : PNG, JPG, WebP, AVIF. Les photos HEIC/HEIF sont à convertir en JPG.`; }
    f.value = '';
  });
  const zoom = el('input', { type: 'range', min: 0.3, max: 4, step: 0.01, value: img?.zoom ?? 1, id: `zoom-${s.id}`, disabled: !img });
  zoom.setAttribute('aria-label', `Zoom ${s.label}`);
  zoom.addEventListener('input', () => modifier(() => { doc.images[s.id].zoom = +zoom.value; sel = s.id; }));
  return el('div', { className: 'image', dataset: { actif: String(sel === s.id) } }, el('img', { src: vue.href, alt: '' }),
    el('div', { className: 'rangee' }, el('div', { style: 'width:100%;font-size:13px', textContent: `${s.label} · ${img ? img.nom : 'image de substitution'}` }), !utilise ? el('div', { className: 'absent', textContent: 'Non utilisée dans la composition actuelle.' }) : null,
      bouton('Importer', () => f.click()), bouton('Recentrer', () => img && modifier(() => Object.assign(doc.images[s.id], { zoom: 1, dx: 0, dy: 0 }), { reconstruire: true })),
      bouton('Substitution', () => modifier(() => { doc.images[s.id] = null; }, { reconstruire: true })), zoom, f));
}
async function importer(file) {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    const k = Math.min(1, MAX_SOURCE / Math.max(im.naturalWidth, im.naturalHeight)), w = Math.round(im.naturalWidth * k), h = Math.round(im.naturalHeight * k);
    const c = el('canvas', { width: w, height: h }); c.getContext('2d').drawImage(im, 0, 0, w, h);
    return { href: c.toDataURL(/^image\/(png|webp|avif|gif)$/.test(file.type) ? 'image/png' : 'image/jpeg', 0.92), w, h, nom: file.name, zoom: 1, dx: 0, dy: 0 };
  } finally { URL.revokeObjectURL(url); }
}
// Calques : du premier plan à l'arrière-plan ; visibilité, ordre, position, échelle, opacité
function calques() {
  const cs = [...scene.couches].reverse();
  $('#calques').replaceChildren(...cs.map((c, i) => {
    const vis = doc.calques[c.id]?.visible !== false;
    return el('li', { dataset: { id: c.id, actif: String(c.id === sel), visible: String(vis) } },
      bouton(c.nom, () => { sel = c.id; dessiner(); }, { className: 'nom' }),
      bouton(vis ? '👁' : '—', () => modifier(() => { doc.calques[c.id] = { ...doc.calques[c.id], visible: !vis }; }), { className: 'oeil', 'aria-label': `${vis ? 'Masquer' : 'Afficher'} ${c.nom}`, 'aria-pressed': String(vis) }),
      bouton('↑', () => deplacerCalque(c.id, 1), { 'aria-label': `Monter ${c.nom}`, disabled: i === 0 }),
      bouton('↓', () => deplacerCalque(c.id, -1), { 'aria-label': `Descendre ${c.nom}`, disabled: i === cs.length - 1 }));
  }));
  const c = scene.couches.find((x) => x.id === sel); $('#calque-actif').textContent = c ? `Sélection : ${c.nom}` : 'Toucher un élément de l\'aperçu pour le sélectionner.';
  const r = $('#reglage-calque');
  if (!c) { r.replaceChildren(); return; }
  if (r.dataset.id === c.id && r.childElementCount) return;
  r.dataset.id = c.id; const reg = () => (doc.calques[c.id] ||= {});
  const curseur = (nom, cle, min, max, pas, def) => { const i = el('input', { type: 'range', min, max, step: pas, value: doc.calques[c.id]?.[cle] ?? def, id: `calque-${cle}` }); i.addEventListener('input', () => modifier(() => { reg()[cle] = +i.value; })); return el('label', {}, nom, i); };
  r.replaceChildren(el('strong', { textContent: c.nom }), curseur('Position horizontale', 'x', -0.5, 0.5, 0.005, 0), curseur('Position verticale', 'y', -0.5, 0.5, 0.005, 0), curseur('Échelle', 's', 0.3, 2.5, 0.01, 1), curseur('Opacité', 'o', 0, 1, 0.05, 1),
    bouton('Réinitialiser ce calque', () => { r.dataset.id = ''; modifier(() => { delete doc.calques[c.id]; }); }, { className: 'discret' }));
}
function deplacerCalque(id, sens) {
  const ids = scene.couches.map((c) => c.id), i = ids.indexOf(id), j = i + sens; if (j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]]; modifier(() => { doc.ordre = ids; });
}

// Réglages simples
$('#nom').addEventListener('input', () => { doc.nom = $('#nom').value; sauver(); });
$('#duree').addEventListener('change', () => modifier(() => { doc.duree = +$('#duree').value; }, { pose: true }));
$('#vitesse').addEventListener('input', () => modifier(() => { doc.vitesse = +$('#vitesse').value; }, { pose: true }));
for (const [id, cle] of [['lettres', 'lettres'], ['sortie', 'sortie'], ['trame-image', 'trameImage'], ['sceau', 'sceau']]) $('#' + id).addEventListener('change', () => modifier(() => { doc[cle] = $('#' + id).checked; }));
$('#effets-defaut').addEventListener('click', () => modifier(() => { doc.effets = {}; }, { reconstruire: true }));
$('#couleurs-defaut').addEventListener('click', () => modifier(() => { doc.couleurs = {}; }, { reconstruire: true }));
$('#nouvelle').addEventListener('click', () => creer(doc.famille));
$('#dupliquer').addEventListener('click', () => { const c = JSON.parse(JSON.stringify(doc)); doc = normaliser({ ...c, nom: `${c.nom} (copie)` }); doc.id = nouvelId(); doc.cree = Date.now(); construire(); dessiner(); sauver(); });
$('#enregistrer-fichier').addEventListener('click', () => telecharger(new Blob([JSON.stringify({ format: 'primestone-motion', version: 1, creation: doc })], { type: 'application/json' }), 'motion.json'));
$('#ouvrir-fichier').addEventListener('click', () => $('#fichier-projet').click());
$('#fichier-projet').addEventListener('change', async () => {
  const f = $('#fichier-projet').files?.[0]; if (!f) return; $('#fichier-projet').value = '';
  try { const j = JSON.parse(await f.text()); const c = j.creation || j; if (!FAMILLES_MOTION[c.famille]) throw 0; doc = normaliser(c); doc.id = nouvelId(); doc.cree = Date.now(); sel = null; t = sc(0).pose; construire(); dessiner(); sauver(); $('#sauvegarde').textContent = `Fichier « ${f.name} » ouvert.`; }
  catch { $('#sauvegarde').textContent = `« ${f.name} » n'est pas une création Motion Studio lisible.`; }
});

// ---------- Interaction dans l'aperçu : sélection, déplacement, recadrage, zoom ----------
const pointeurs = new Map(); let pince = null;
const versScene = (e) => { const r = cv.getBoundingClientRect(); return [((e.clientX - r.left) / r.width) * scene.w, ((e.clientY - r.top) / r.height) * scene.h]; };
const echelleEcran = () => cv.getBoundingClientRect().width / scene.w;
function sous([x, y]) {
  const cs = [...scene.couches].reverse().filter((c) => c.visible && !c.verrou && c.role !== 'effet' && c.role !== 'fixe');
  return cs.find((c) => { const reg = doc.calques[c.id] || {}, b = c.box, s = reg.s ?? 1, cx = b.x + b.w / 2 + (reg.x ?? 0) * scene.w, cy = b.y + b.h / 2 + (reg.y ?? 0) * scene.h; return Math.abs(x - cx) <= (b.w * s) / 2 && Math.abs(y - cy) <= (b.h * s) / 2; });
}
const recadre = (c) => c?.slot && !$('#deplacer-images').checked;
cv.addEventListener('pointerdown', (e) => {
  cv.setPointerCapture(e.pointerId); pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointeurs.size === 1) { arreter(); const c = sous(versScene(e)); sel = c?.id ?? null; $('#reglage-calque').dataset.id = ''; dessiner(); }
  pince = null;
});
cv.addEventListener('pointermove', (e) => {
  if (!pointeurs.has(e.pointerId) || !sel) return;
  const prec = pointeurs.get(e.pointerId); pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const c = scene.couches.find((x) => x.id === sel); if (!c) return; const s = echelleEcran(), dx = (e.clientX - prec.x) / s, dy = (e.clientY - prec.y) / s;
  if (pointeurs.size === 1) {
    if (recadre(c)) { const img = doc.images[c.slot]; if (!img) return; img.dx = (img.dx ?? 0) + dx / c.zone.w; img.dy = (img.dy ?? 0) + dy / c.zone.h; }
    else { const r = (doc.calques[c.id] ||= {}); r.x = (r.x ?? 0) + dx / scene.w; r.y = (r.y ?? 0) + dy / scene.h; }
  } else if (pointeurs.size === 2) {
    const [a, b] = [...pointeurs.values()], d = Math.hypot(a.x - b.x, a.y - b.y); if (pince) agrandir(c, d / pince); pince = d;
  }
  $('#reglage-calque').dataset.id = ''; dessiner(); sauver();
});
const fin = (e) => { pointeurs.delete(e.pointerId); if (pointeurs.size < 2) pince = null; };
for (const ev of ['pointerup', 'pointercancel', 'lostpointercapture']) cv.addEventListener(ev, fin);
cv.addEventListener('wheel', (e) => { const c = scene?.couches.find((x) => x.id === sel); if (!c) return; e.preventDefault(); agrandir(c, Math.exp(-e.deltaY * 0.0015)); $('#reglage-calque').dataset.id = ''; dessiner(); sauver(); }, { passive: false });
function agrandir(c, f) {
  if (recadre(c)) { const img = doc.images[c.slot]; if (!img) return; img.zoom = Math.min(4, Math.max(0.3, (img.zoom ?? 1) * f)); const z = $(`#zoom-${c.slot}`); if (z) z.value = img.zoom; }
  else { const r = (doc.calques[c.id] ||= {}); r.s = Math.min(2.5, Math.max(0.3, (r.s ?? 1) * f)); }
}

// ---------- Exports ----------
function nomFichier(ext) {
  const slug = (doc.nom || 'creation').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'creation';
  return `primestone_motion_${doc.famille}-${doc.format.replace(':', 'x')}_${slug}.${ext}`;
}
function telecharger(blob, ext) {
  const a = el('a', { href: URL.createObjectURL(blob), download: ext.includes('.') ? nomFichier('').replace(/\.$/, '') + '.' + ext : nomFichier(ext) });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 8000);
}
const enDataURL = async (url) => { const b = await (await fetch(url)).blob(); return new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(b); }); };
async function svgAutonome() {
  const s = sc(null, { final: true }); let svg = versSVG(s, { titre: `Primestone · Motion Studio · ${doc.nom}` });
  for (const r of new Set([...svg.matchAll(/href="(?!data:)([^"]+)"/g)].map((m) => m[1]))) svg = svg.split(`"${r}"`).join(`"${await enDataURL(new URL(r.replace(/&amp;/g, '&'), location.href))}"`);
  const faces = [];
  for (const m of Object.values(M)) if (svg.includes(`font-family="${m.family}" font-weight="${m.weight}"${m.style !== 'normal' ? ` font-style="${m.style}"` : ''}`))
    faces.push(`@font-face{font-family:"${m.family}";font-weight:${m.weight};font-style:${m.style};src:url(${await enDataURL(new URL(`../../brand/03_fonts/web/${m.file}`, location.href))}) format("woff2")}`);
  return svg.replace('<defs>', `<defs><style>${faces.join('')}</style>`);
}
async function rendreCanvas(s, e = 1) { const c = el('canvas', { width: Math.round(s.w * e), height: Math.round(s.h * e) }); await rendu.precharger(s); rendu.dessiner(c.getContext('2d'), s, e); return c; }
const versBlob = (c, type, q) => new Promise((ok) => c.toBlob(ok, type, q));
const MIME_VIDEO = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'].find((x) => window.MediaRecorder?.isTypeSupported?.(x) && HTMLCanvasElement.prototype.captureStream);
$('#export-video').textContent = MIME_VIDEO ? `Vidéo ${MIME_VIDEO.includes('mp4') ? 'MP4' : 'WebM'}` : 'Vidéo indisponible';
$('#export-video').disabled = !MIME_VIDEO;
let occupe = false;
async function exporter(type) {
  if (occupe) return; occupe = true; arreter(); const info = $('#export-info'); info.textContent = 'Export en cours…';
  document.querySelectorAll('[data-export]').forEach((b) => (b.disabled = true));
  try {
    if (type === 'svg') { telecharger(new Blob([await svgAutonome()], { type: 'image/svg+xml' }), 'svg'); info.textContent = 'SVG exporté (images et polices intégrées, effets vectoriels).'; return; }
    if (type === 'png' || type === 'jpg') {
      const s = sc(null, { final: true }), c = await rendreCanvas(s);
      if (type === 'png') { const b = await versBlob(c, 'image/png'); telecharger(b, 'png'); info.textContent = `PNG exporté · ${s.w} × ${s.h} · ${(b.size / 1048576).toFixed(2)} Mo.`; return; }
      let q = 0.9, b = await versBlob(c, 'image/jpeg', q); while (b.size > JPG_MAX && q > 0.6) { q = Math.round((q - 0.1) * 10) / 10; b = await versBlob(c, 'image/jpeg', q); }
      telecharger(b, 'jpg'); info.textContent = `JPG exporté · ${s.w} × ${s.h} · qualité ${Math.round(q * 100)} · ${(b.size / 1048576).toFixed(2)} Mo.`; return;
    }
    if (type === 'video') return await exporterVideo(info);
    if (type === 'gif') return await exporterGIF(info);
  } catch (e) { info.textContent = `Export impossible : ${e.message || e}.`; }
  finally { occupe = false; document.querySelectorAll('[data-export]').forEach((b) => (b.disabled = b.id === 'export-video' && !MIME_VIDEO)); }
}
// Vidéo : enregistrement en temps réel du canvas (MediaRecorder). L'onglet doit rester visible pendant l'export.
async function exporterVideo(info) {
  const e = +$('#video-def').value, s0 = sc(0), c = el('canvas', { width: Math.round(s0.w * e) & ~1, height: Math.round(s0.h * e) & ~1 }), gg = c.getContext('2d');
  await rendu.precharger(s0); rendu.dessiner(gg, s0, c.width / s0.w);
  const rec = new MediaRecorder(c.captureStream(30), { mimeType: MIME_VIDEO, videoBitsPerSecond: Math.round(12e6 * e * e) }), morceaux = [];
  rec.ondataavailable = (x) => x.data.size && morceaux.push(x.data);
  const fini = new Promise((ok) => (rec.onstop = ok));
  rec.start(250); const t0 = performance.now();
  await new Promise((ok) => { const pas = async (now) => { const tt = Math.min(doc.duree, (now - t0) / 1000), s = sc(tt); await rendu.precharger(s); rendu.dessiner(gg, s, c.width / s.w); t = tt; dessiner();
    info.textContent = `Enregistrement de la vidéo… ${Math.round((tt / doc.duree) * 100)} % (garder l'onglet visible)`; if (tt >= doc.duree) ok(); else requestAnimationFrame(pas); }; requestAnimationFrame(pas); });
  await new Promise((r) => setTimeout(r, 200)); rec.stop(); await fini;
  const ext = MIME_VIDEO.includes('mp4') ? 'mp4' : 'webm', b = new Blob(morceaux, { type: MIME_VIDEO.split(';')[0] });
  telecharger(b, ext); info.textContent = `Vidéo ${ext.toUpperCase()} exportée · ${c.width} × ${c.height} · ${doc.duree} s · ${(b.size / 1048576).toFixed(2)} Mo.`;
}
// GIF : rendu image par image (durée exacte), palette commune de 256 couleurs
async function exporterGIF(info) {
  const lw = +$('#gif-def').value, fps = lw > 600 ? 15 : 12, s0 = sc(0), e = Math.min(1, lw / s0.w), w = Math.round(s0.w * e), h = Math.round(s0.h * e), n = Math.max(2, Math.round(doc.duree * fps));
  const c = el('canvas', { width: w, height: h }), gg = c.getContext('2d', { willReadFrequently: true }), image = async (i) => { const s = sc((i / fps)); await rendu.precharger(s); rendu.dessiner(gg, s, e); return gg.getImageData(0, 0, w, h).data; };
  const ech = []; for (let i = 0; i < 6; i++) ech.push(await image(Math.round((i / 5) * (n - 1))));
  const gif = creerGIF(w, h, palette(ech), Math.round(100 / fps));
  for (let i = 0; i < n; i++) { gif.ajouter(await image(i)); if (i % 3 === 0) { info.textContent = `Calcul du GIF… ${Math.round((i / n) * 100)} %`; await new Promise((r) => setTimeout(r)); } }
  const b = new Blob([gif.fin()], { type: 'image/gif' }); telecharger(b, 'gif');
  info.textContent = `GIF exporté · ${w} × ${h} · ${n} images à ${fps} i/s · ${(b.size / 1048576).toFixed(2)} Mo.`;
}
for (const b of document.querySelectorAll('[data-export]')) b.addEventListener('click', () => exporter(b.dataset.export));

// ---------- Démarrage ----------
await Promise.all(Object.values(M).map((m) => document.fonts.load(`${m.style === 'italic' ? 'italic ' : ''}${m.weight} 40px "${m.family}"`).catch(() => {})));
let initial = null;
try { const id = localStorage.getItem(DERNIERE); if (id) initial = await idb('readonly', (s) => s.get(id)); } catch { /* pas de stockage */ }
if (initial) ouvrirCreation(initial); else creer(Object.keys(FAMILLES_MOTION)[0], '16:9');
listerCreations();
addEventListener('resize', dessiner);
document.documentElement.dataset.version = T.$version;
if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('../sw.js').catch(() => {});
window.__motion = { get doc() { return doc; }, get scene() { return scene; }, get t() { return t; }, exporter, svgAutonome, placer, MIME_VIDEO };   // utilisé par les tests automatisés
