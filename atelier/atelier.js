// Atelier Primestone · saisie des miniatures sur les gabarits du moteur (aucun serveur, aucun compte).
import { rendre, placer, FAMILLES, W, H, T } from '../templates/_systeme/moteur.js';
import PH from '../templates/_systeme/placeholders.js';
import M from '../templates/_systeme/metrics.js';

const $ = (s) => document.querySelector(s);
const CLE = 'primestone-atelier-brouillon-v1';
const MAX_SOURCE = 3000;   // côté maximal d'une image importée (px), pour la mémoire des tablettes
const JPG_MAX = 2 * 1024 * 1024;

const etat = { fam: Object.keys(FAMILLES)[0], vari: null, donnees: {}, actif: null };

// ---------- Données ----------
const champsImages = () => FAMILLES[etat.fam].champs.filter((c) => c.type === 'image' && (!c.variantes || c.variantes.includes(etat.vari)));
const imagePlaceholder = (c) => { const p = PH[c.placeholder]; return { href: '../' + p.src, w: p.w, h: p.h, placeholder: true, nom: 'PLACEHOLDER ' + c.placeholder }; };
function initFamille(fam, garder = {}) {
  etat.fam = fam; const f = FAMILLES[fam];
  etat.vari = f.variantes[garder.vari] ? garder.vari : Object.keys(f.variantes)[0];
  const d = {};
  for (const c of f.champs) {
    if (c.type === 'image') d[c.id] = imagePlaceholder(c);
    else d[c.id] = garder.textes?.[c.id] ?? c.defaut ?? '';
  }
  etat.donnees = d; etat.actif = champsImages()[0]?.id ?? null;
}
function sauver() {
  const textes = Object.fromEntries(FAMILLES[etat.fam].champs.filter((c) => c.type !== 'image').map((c) => [c.id, etat.donnees[c.id]]));
  try { localStorage.setItem(CLE, JSON.stringify({ fam: etat.fam, vari: etat.vari, textes })); } catch { /* stockage indisponible : sans conséquence */ }
}
function charger() {
  try { const b = JSON.parse(localStorage.getItem(CLE) || 'null'); if (b && FAMILLES[b.fam]) return initFamille(b.fam, b); } catch { /* brouillon illisible : on repart du défaut */ }
  initFamille(etat.fam);
}

// ---------- Rendu ----------
let rendu = null, planifie = false;
function dessiner() {
  if (planifie) return; planifie = true;
  requestAnimationFrame(() => {
    planifie = false;
    rendu = rendre(etat.fam, etat.vari, etat.donnees, { guides: $('#guides').checked });
    $('#apercu').innerHTML = rendu.svg;
    $('#mini').innerHTML = rendre(etat.fam, etat.vari, etat.donnees).svg;
    afficherAlertes(rendu.alertes);
  });
}
function afficherAlertes(al) {
  const NIV = { erreur: 'Erreur', attention: 'Attention', info: 'Info' };
  const ul = $('#alertes'); ul.replaceChildren();
  const ordre = { erreur: 0, attention: 1, info: 2 };
  for (const a of [...al].sort((x, y) => ordre[x.niveau] - ordre[y.niveau])) {
    const li = document.createElement('li'); li.dataset.niveau = a.niveau;
    const b = document.createElement('b'); b.textContent = NIV[a.niveau]; li.append(b, a.message); ul.append(li);
  }
  if (!al.length) { const li = document.createElement('li'); li.textContent = 'Aucun problème détecté.'; ul.append(li); }
  for (const i of document.querySelectorAll('#champs input, #champs select')) i.setAttribute('aria-invalid', al.some((a) => a.champ === i.dataset.champ && a.niveau === 'erreur'));
}

// ---------- Panneau ----------
function puces(conteneur, items, actif, choisir) {
  conteneur.replaceChildren(...items.map(([id, nom]) => {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = nom; b.setAttribute('aria-pressed', id === actif);
    b.addEventListener('click', () => choisir(id)); return b;
  }));
}
function construirePanneau() {
  const f = FAMILLES[etat.fam];
  puces($('#familles'), Object.entries(FAMILLES).map(([id, x]) => [id, `${id.slice(0, 2)} · ${x.nom}`]), etat.fam, (id) => {
    const textes = {}; initFamille(id, { textes }); sauver(); construirePanneau(); dessiner();
  });
  puces($('#variantes'), Object.entries(f.variantes).map(([id, v]) => [id, v.nom]), etat.vari, (id) => { etat.vari = id; if (!champsImages().some((c) => c.id === etat.actif)) etat.actif = champsImages()[0]?.id ?? null; sauver(); construirePanneau(); dessiner(); });
  $('#champs').replaceChildren(...f.champs.filter((c) => c.type !== 'image').map((c) => {
    const l = document.createElement('label'); l.textContent = c.label + (c.conseil ? ` (${c.conseil})` : '');
    let i;
    if (c.type === 'choix') { i = document.createElement('select'); i.append(...c.options.map((o) => Object.assign(document.createElement('option'), { value: o, textContent: o }))); }
    else { i = document.createElement('input'); i.type = 'text'; i.autocomplete = 'off'; }
    i.id = `champ-${c.id}`; i.dataset.champ = c.id; i.value = etat.donnees[c.id] ?? '';
    i.addEventListener('input', () => { etat.donnees[c.id] = i.value; sauver(); dessiner(); });
    l.append(i); return l;
  }));
  $('#images').replaceChildren(...champsImages().map((c) => blocImage(c)));
}
function blocImage(c) {
  const img = etat.donnees[c.id];
  const box = document.createElement('div'); box.className = 'image'; box.dataset.actif = etat.actif === c.id;
  const vign = document.createElement('img'); vign.src = img.href; vign.alt = '';
  const col = document.createElement('div'); col.className = 'rangee';
  const titre = document.createElement('div'); titre.style.cssText = 'width:100%;font-size:13px'; titre.textContent = `${c.label} · ${img.placeholder ? 'image de substitution' : img.nom}`;
  const fichier = document.createElement('input'); fichier.type = 'file'; fichier.accept = 'image/png,image/jpeg,image/webp,image/avif'; fichier.hidden = true; fichier.id = `fichier-${c.id}`;
  fichier.addEventListener('change', async () => {
    const f = fichier.files?.[0]; if (!f) return;
    try { etat.donnees[c.id] = await importer(f); etat.actif = c.id; construirePanneau(); dessiner(); }
    catch { $('#export-info').textContent = `Impossible de lire « ${f.name} ». Formats acceptés : PNG, JPG, WebP, AVIF.`; }
  });
  const btn = (txt, fn) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = txt; b.addEventListener('click', fn); return b; };
  const zoom = document.createElement('input'); zoom.type = 'range'; zoom.min = '0.3'; zoom.max = '4'; zoom.step = '0.01'; zoom.value = img.zoom ?? 1; zoom.id = `zoom-${c.id}`;
  zoom.setAttribute('aria-label', `Zoom ${c.label}`);
  zoom.addEventListener('input', () => { etat.donnees[c.id].zoom = +zoom.value; etat.actif = c.id; dessiner(); });
  col.append(titre, btn('Importer', () => fichier.click()), btn('Recentrer', () => { Object.assign(etat.donnees[c.id], { zoom: 1, dx: 0, dy: 0 }); zoom.value = 1; dessiner(); }),
    btn('Substitution', () => { etat.donnees[c.id] = imagePlaceholder(c); construirePanneau(); dessiner(); }), btn(etat.actif === c.id ? 'Recadrage actif' : 'Recadrer', () => { etat.actif = c.id; construirePanneau(); }), zoom, fichier);
  box.append(vign, col); return box;
}

// Lecture d'un fichier image, réduite si nécessaire ; garde la transparence des PNG/WebP
async function importer(file) {
  const url = URL.createObjectURL(file);
  try {
    const im = new Image(); im.src = url; await im.decode();
    let w = im.naturalWidth, h = im.naturalHeight, href;
    const k = Math.min(1, MAX_SOURCE / Math.max(w, h));
    if (k < 1 || !/^image\/(png|jpeg|webp)$/.test(file.type)) {
      w = Math.round(w * k); h = Math.round(h * k);
      const cv = Object.assign(document.createElement('canvas'), { width: w, height: h }); cv.getContext('2d').drawImage(im, 0, 0, w, h);
      href = cv.toDataURL(file.type === 'image/jpeg' ? 'image/jpeg' : 'image/png', 0.92);
    } else href = await new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(file); });
    return { href, w, h, nom: file.name, zoom: 1, dx: 0, dy: 0 };
  } finally { URL.revokeObjectURL(url); }
}

// ---------- Recadrage : glisser (souris, doigt, stylet), pincer, molette ----------
const pointeurs = new Map(); let geste = null;
const echelleEcran = () => $('#apercu').getBoundingClientRect().width / W;
function zoneSous(e) {
  const r = $('#apercu').getBoundingClientRect(), x = (e.clientX - r.left) / echelleEcran(), y = (e.clientY - r.top) / echelleEcran();
  const ids = Object.keys(rendu?.zones || {});
  return ids.reverse().find((id) => { const z = rendu.zones[id]; return x >= z.x && x <= z.x + z.w && y >= z.y && y <= z.y + z.h; }) || etat.actif;
}
$('#apercu').addEventListener('pointerdown', (e) => {
  if (!etat.actif) return;
  $('#apercu').setPointerCapture(e.pointerId); pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  if (pointeurs.size === 1) { const id = zoneSous(e); if (id !== etat.actif) { etat.actif = id; construirePanneau(); } }
  geste = null;
});
$('#apercu').addEventListener('pointermove', (e) => {
  if (!pointeurs.has(e.pointerId) || !etat.actif) return;
  const prec = pointeurs.get(e.pointerId); pointeurs.set(e.pointerId, { x: e.clientX, y: e.clientY });
  const img = etat.donnees[etat.actif], z = rendu.zones[etat.actif]; if (!img || !z) return;
  if (pointeurs.size === 1) {
    const s = echelleEcran(); img.dx = (img.dx ?? 0) + (e.clientX - prec.x) / s / z.w; img.dy = (img.dy ?? 0) + (e.clientY - prec.y) / s / z.h;
  } else if (pointeurs.size === 2) {
    const [a, b] = [...pointeurs.values()], dist = Math.hypot(a.x - b.x, a.y - b.y);
    if (geste) img.zoom = Math.min(4, Math.max(0.3, (img.zoom ?? 1) * (dist / geste)));
    geste = dist; const r = $(`#zoom-${etat.actif}`); if (r) r.value = img.zoom;
  }
  dessiner();
});
const fin = (e) => { pointeurs.delete(e.pointerId); if (pointeurs.size < 2) geste = null; };
for (const t of ['pointerup', 'pointercancel', 'lostpointercapture']) $('#apercu').addEventListener(t, fin);
$('#apercu').addEventListener('wheel', (e) => {
  if (!etat.actif) return; e.preventDefault();
  const img = etat.donnees[etat.actif]; img.zoom = Math.min(4, Math.max(0.3, (img.zoom ?? 1) * Math.exp(-e.deltaY * 0.0015)));
  const r = $(`#zoom-${etat.actif}`); if (r) r.value = img.zoom; dessiner();
}, { passive: false });

// ---------- Exports ----------
const enDataURL = async (url) => { const b = await (await fetch(url)).blob(); return new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(b); }); };
async function svgAutonome() {
  let svg = rendre(etat.fam, etat.vari, etat.donnees).svg;
  // Images : toute référence externe devient une donnée intégrée
  const refs = [...new Set([...svg.matchAll(/href="(?!data:)([^"]+)"/g)].map((m) => m[1]))];
  for (const r of refs) { const d = await enDataURL(new URL(r.replace(/&amp;/g, '&'), location.href)); svg = svg.split(`"${r}"`).join(`"${d}"`); }
  // Polices : seules celles réellement utilisées sont intégrées (OFL : intégration autorisée)
  const faces = [];
  for (const m of Object.values(M)) {
    if (!svg.includes(`font-family="${m.family}" font-weight="${m.weight}"${m.style !== 'normal' ? ` font-style="${m.style}"` : ''}`)) continue;
    faces.push(`@font-face{font-family:"${m.family}";font-weight:${m.weight};font-style:${m.style};src:url(${await enDataURL(new URL(`../brand/03_fonts/web/${m.file}`, location.href))}) format("woff2")}`);
  }
  return svg.replace('<defs>', `<defs><style>${faces.join('')}</style>`);
}
async function versCanvas(svg) {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml' }));
  try {
    const im = new Image(); im.width = W; im.height = H; im.src = url; await im.decode();
    const cv = Object.assign(document.createElement('canvas'), { width: W, height: H });
    cv.getContext('2d').drawImage(im, 0, 0, W, H); return cv;
  } finally { URL.revokeObjectURL(url); }
}
const versBlob = (cv, type, q) => new Promise((ok) => cv.toBlob(ok, type, q));
function telecharger(blob, ext) {
  const slug = (etat.donnees.titre || 'miniature').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'miniature';
  const a = Object.assign(document.createElement('a'), { href: URL.createObjectURL(blob), download: `primestone_${etat.fam.slice(0, 2)}-${etat.vari}_${slug}.${ext}` });
  document.body.append(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}
async function exporter(type) {
  const info = $('#export-info'); info.textContent = 'Export en cours…';
  try {
    const svg = await svgAutonome();
    if (type === 'svg') { telecharger(new Blob([svg], { type: 'image/svg+xml' }), 'svg'); info.textContent = 'SVG exporté (images et polices intégrées).'; return; }
    const cv = await versCanvas(svg);
    if (type === 'png') { const b = await versBlob(cv, 'image/png'); telecharger(b, 'png'); info.textContent = `PNG exporté · ${W} × ${H} · ${(b.size / 1048576).toFixed(2)} Mo${b.size > JPG_MAX ? ' · au-delà de 2 Mo, préférer le JPG pour YouTube' : ''}.`; return; }
    let q = 0.9, b = await versBlob(cv, 'image/jpeg', q);
    while (b.size > JPG_MAX && q > 0.6) { q = Math.round((q - 0.1) * 10) / 10; b = await versBlob(cv, 'image/jpeg', q); }
    telecharger(b, 'jpg');
    info.textContent = `JPG exporté · ${W} × ${H} · qualité ${Math.round(q * 100)} · ${(b.size / 1048576).toFixed(2)} Mo${b.size > JPG_MAX ? ' · toujours au-delà de 2 Mo' : ''}.`;
  } catch (e) { info.textContent = `Export impossible : ${e.message || e}.`; }
}
for (const b of document.querySelectorAll('[data-export]')) b.addEventListener('click', () => exporter(b.dataset.export));
$('#guides').addEventListener('change', dessiner);
$('#reinit').addEventListener('click', () => { try { localStorage.removeItem(CLE); } catch { /* rien */ } initFamille(etat.fam); construirePanneau(); dessiner(); });

// ---------- Démarrage ----------
charger(); construirePanneau();
document.fonts.ready.then(dessiner);
document.documentElement.dataset.version = T.$version;
if ('serviceWorker' in navigator && window.isSecureContext) navigator.serviceWorker.register('sw.js').catch(() => {});
window.__atelier = { etat, exporter, svgAutonome };   // utilisé par les tests automatisés
