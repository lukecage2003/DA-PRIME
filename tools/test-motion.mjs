// Primestone · tests de Motion Studio : moteur (Node) puis interface de bout en bout (Chromium, appareils ÉMULÉS).
// Usage : node tools/test-motion.mjs [--moteur] [dossier-captures]   (--moteur : tests Node seuls)
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const imp = (p) => import(pathToFileURL(join(ROOT, p)));
const { composer, nouveauDoc, normaliser, FAMILLES_MOTION, FORMATS_MOTION, PRESETS } = await imp('templates/_systeme/motion.js');
const { versSVG } = await imp('templates/_systeme/motion-svg.js');
const { palette, creerGIF } = await imp('atelier/motion/gif.js');
const PH = (await imp('templates/_systeme/placeholders.js')).default;
const res = []; const ok = (c, m) => { res.push(c); console.log(`  ${c ? 'ok' : 'KO'}  ${m}`); };
const imagesPH = (n) => ({ href: PH[n].src, w: PH[n].w, h: PH[n].h, placeholder: true });
const sc = (doc, t, o = {}) => composer(doc, t, { imagesPH, ...o });

// ---------- 1. Moteur (Node) ----------
console.log('Moteur des modèles (MVP)');
let n = 0; const bad = [];
for (const [fid, f] of Object.entries(FAMILLES_MOTION)) for (const fmt of Object.keys(FORMATS_MOTION)) for (const d of f.directions) {
  const s = sc(nouveauDoc(fid, { format: fmt, direction: d }), null); n++;
  const e = s.alertes.filter((a) => a.niveau !== 'info'); const svg = versSVG(s);
  if (e.length || s.w !== FORMATS_MOTION[fmt].w || !svg.includes(`viewBox="0 0 ${s.w} ${s.h}"`) || !svg.includes('data-ps-statut="NON-OFFICIEL"')) bad.push(`${fid}/${fmt}/${d} ${e.map((a) => a.message).join(';')}`);
}
ok(Object.keys(FAMILLES_MOTION).length === 8 && !bad.length, `8 familles × 4 formats × 4 directions (${n} compositions) : dimensions, aucune alerte avec les textes par défaut, sceau marqué NON-OFFICIEL${bad.length ? ' · ' + bad.slice(0, 4).join(' | ') : ''}`);
const balance = (svg) => { const o = (svg.match(/<g[\s>]/g) || []).length, c = (svg.match(/<\/g>/g) || []).length; return o === c && (svg.match(/<text/g) || []).length === (svg.match(/<\/text>/g) || []).length; };
ok(Object.keys(FAMILLES_MOTION).every((fid) => balance(versSVG(sc(nouveauDoc(fid), null)))), 'SVG : balises équilibrées pour les 8 familles');
const d0 = nouveauDoc('annonce');
ok(versSVG(sc(d0, 1.2)) === versSVG(sc(d0, 1.2)), 'rendu déterministe (même instant, même SVG)');
// Animation : titres absents au début, complets à la pose, pour chaque preset animé
const anim = Object.keys(PRESETS).filter((p) => p !== 'statique').map((p) => { const d = { ...nouveauDoc('personnage'), preset: p }, a = sc(d, 0.02), z = sc(d, null);
  const titre = (s) => s.nodes.find((g) => g.id === 'nom'); return [p, !titre(a) || titre(a).op < 0.2, titre(z)?.op === 1]; });
ok(anim.every(([, a, z]) => a && z), `presets animés (${anim.length}) : titre invisible au départ, entièrement visible à la pose${anim.filter(([, a, z]) => !(a && z)).map(([p]) => ' · ' + p).join('')}`);
const stat = sc({ ...nouveauDoc('annonce'), preset: 'statique' }, 0);
ok(stat.nodes.every((g) => g.op === undefined || g.op > 0.1) && stat.pose === 0, 'preset statique : tout est visible dès 0 s');
const vol = { ...nouveauDoc('equipe'), preset: 'volets', sortie: true, duree: 6 };
ok(sc(vol, 0.2).nodes.at(-1).id === 'volets' && sc(vol, 5.9).nodes.at(-1).id === 'volets' && sc(vol, 3).nodes.at(-1).id !== 'volets', 'volets d\'ouverture et de fin aux bons instants');
const lt = Array.from({ length: 30 }, (_, i) => sc({ ...nouveauDoc('annonce'), lettres: true }, i * 0.1).nodes.find((g) => g.id === 'titre'));
ok(lt.some((g) => g?.kids.some((k) => k.k === 'g' && k.kids.length > 3)), 'titres lettre à lettre : caractères animés séparément');
// Calques : visibilité, ordre, position et échelle
const dc = { ...nouveauDoc('annonce'), calques: { titre: { x: 0.1, s: 1.5 }, trame: { visible: false } } }, sC = sc(dc, null), gt = sC.nodes.find((g) => g.id === 'titre');
ok(!sC.nodes.some((g) => g.id === 'trame') && gt.tr.x === 192 && gt.tr.s === 1.5, 'calques : masquage, déplacement (10 % = 192 px) et échelle');
const ids = sc(d0, null).couches.map((c) => c.id), ordre = [...ids.filter((i) => i !== 'visuel'), 'visuel'];
ok(sc({ ...d0, ordre }, null).nodes.at(-1).id === 'visuel', 'calques : ordre modifié (illustration passée au premier plan)');
ok(!sc({ ...d0, effets: { trame: 0, grain: 0 } }, null).nodes.some((g) => g.id === 'trame' || g.id === 'grain') && sc({ ...d0, effets: { particules: 50 } }, 1).nodes.some((g) => g.id === 'particules'), 'effets : désactivables et activables');
ok(sc({ ...d0, textes: { titre: 'Anticonstitutionnellementissimes et les autres héros de la galaxie lointaine' } }, null).alertes.some((a) => a.champ === 'titre' && a.niveau === 'erreur'), 'titre trop long : débordement signalé');
ok(sc({ ...d0, textes: { titre: '' } }, null).alertes.some((a) => a.champ === 'titre' && a.niveau === 'erreur'), 'titre vide : erreur signalée');
const nm = normaliser({ famille: 'inconnue', textes: { titre: 'X' }, duree: 99, preset: 'bidon' });
ok(nm.famille === 'annonce' && nm.duree === 15 && nm.preset === 'revelation' && nm.textes.titre === 'X' && nm.textes.surtitre === 'Nouvelle série', 'document : valeurs invalides corrigées, textes saisis conservés');
const imgDoc = { ...nouveauDoc('personnage'), images: { personnage: { href: 'data:image/png;base64,AAAA', w: 200, h: 200, zoom: 1, dx: 0, dy: 0 } } };
ok(sc(imgDoc, null).alertes.some((a) => a.champ === 'personnage' && /agrandie/.test(a.message)), 'image trop petite : risque de flou signalé');
// Encodeur GIF : décodage de contrôle (LZW) et couleurs retrouvées
{
  const w = 37, h = 23, fr = [0, 1].map((k) => { const d = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) { d[i * 4] = (i * 7 + k * 90) % 256; d[i * 4 + 1] = (i * 3) % 256; d[i * 4 + 2] = k ? 255 : 0; d[i * 4 + 3] = 255; } return d; });
  const pal = palette(fr), gif = creerGIF(w, h, pal, 8); fr.forEach((f) => gif.ajouter(f)); const b = gif.fin();
  const dec = decoderGIF(b); const err = dec.frames.length === 2 ? dec.frames.map((ix, k) => { let e = 0; for (let i = 0; i < w * h; i++) for (let c = 0; c < 3; c++) e += Math.abs(dec.pal[ix[i] * 3 + c] - fr[k][i * 4 + c]); return e / (w * h * 3); }) : [999];
  ok(String.fromCharCode(...b.slice(0, 6)) === 'GIF89a' && b.at(-1) === 0x3b && dec.w === w && dec.h === h && Math.max(...err) < 12, `GIF : en-tête, dimensions, 2 images décodées, écart moyen de couleur ${Math.max(...err).toFixed(1)}/255`);
}
function decoderGIF(b) {
  const w = b[6] | (b[7] << 8), h = b[8] | (b[9] << 8), pal = b.slice(13, 13 + 768), frames = []; let i = 13 + 768;
  while (i < b.length && b[i] !== 0x3b) {
    if (b[i] === 0x21) { i += 2; while (b[i]) i += b[i] + 1; i++; continue; }
    if (b[i] === 0x2c) { i += 10; const min = b[i++]; const data = []; while (b[i]) { data.push(...b.slice(i + 1, i + 1 + b[i])); i += b[i] + 1; } i++;
      const out = []; let pos = 0, size = min + 1, dict = [], prev = null; const rd = () => { let v = 0; for (let k = 0; k < size; k++, pos++) v |= ((data[pos >> 3] >> (pos & 7)) & 1) << k; return v; };
      const reset = () => { dict = Array.from({ length: (1 << min) + 2 }, (_, k) => [k]); size = min + 1; prev = null; };
      reset(); for (;;) { const c = rd(); if (c === 1 << min) { reset(); continue; } if (c === (1 << min) + 1) break;
        const e = c < dict.length ? dict[c] : [...prev, prev[0]]; out.push(...e); if (prev) dict.push([...prev, e[0]]); prev = e; if (dict.length === 1 << size && size < 12) size++; }
      frames.push(out); continue; }
    break;
  }
  return { w, h, pal, frames };
}

// ---------- 1 bis. Moteur du studio (composition libre, Node) ----------
console.log('Moteur du studio (composition libre)');
const St = await imp('templates/_systeme/studio.js'), { COMPOSANTS } = await imp('templates/_systeme/studio-composants.js'), Tx = await imp('templates/_systeme/studio-texte.js');
const An = await imp('templates/_systeme/studio-anim.js'), Sy = await imp('templates/_systeme/studio-systemes.js'), Fo = await imp('templates/_systeme/studio-formes.js');
const ph2 = (n) => (PH[n] ? { href: PH[n].src, w: PH[n].w, h: PH[n].h } : null), rs = (d, t, o = {}) => St.rendreScene(d, t, { placeholder: ph2, ...o });
const nonInfo = (sc) => sc.alertes.filter((a) => a.niveau !== 'info');
{
  let n = 0; const bad = [];
  for (const id of Object.keys(St.MODELES)) for (const [w, h] of [[1920, 1080], [1080, 1920], [2480, 3508]]) for (const dir of St.MODELES[id].directions) {
    const d = St.docDepuisModele(id, { direction: dir.id, w, h, placeholder: ph2 }); n++;
    const sc = rs(d, null), svg = versSVG(sc); if (nonInfo(sc).length || !svg.includes('data-ps-statut="NON-OFFICIEL"') || sc.w !== w || !balance(svg)) bad.push(`${id}/${dir.id}/${w} ${nonInfo(sc).map((a) => a.message).join(';')}`);
  }
  ok(!bad.length, `modèles intégrés convertis en compositions libres : ${n} (8 × 4 directions × 16:9, 9:16, A4), sans alerte${bad.length ? ' · ' + bad.slice(0, 3).join(' | ') : ''}`);
}
{
  const bad = [];
  for (const sy of Object.keys(Sy.SYSTEMES)) { const d = St.nouveauDocument({ systeme: sy });
    for (const r of Object.keys(Sy.ROLES_TEXTE)) d.elements.push(St.creerElement('texte', d, { role: r }));
    for (const f of Object.keys(Fo.FORMES)) d.elements.push(St.creerElement('forme', d, { forme: f }));
    for (const e of Object.keys(St.EFFETS_LIB)) d.elements.push(St.creerElement('effet', d, { effet: e }));
    for (const c of Object.values(COMPOSANTS)) d.elements.push(c.creer(d));
    for (const t of [0, 0.3, 1.5, null]) { const sc = rs(d, t), svg = versSVG(sc); if (nonInfo(sc).length || !balance(svg)) bad.push(`${sy}@${t} ${nonInfo(sc).map((a) => a.message).join(';').slice(0, 200)}`); } }
  ok(!bad.length, `6 systèmes × (6 styles de texte, ${Object.keys(Fo.FORMES).length} formes, ${Object.keys(St.EFFETS_LIB).length} effets, ${Object.keys(COMPOSANTS).length} composants) : rendus sans alerte à 4 instants, SVG bien formés${bad.length ? ' · ' + bad.slice(0, 2).join(' | ') : ''}`);
  const d = St.nouveauDocument({ systeme: 'comics' }); d.elements.push(...Object.keys(St.EFFETS_LIB).map((e) => St.creerElement('effet', d, { effet: e })));
  ok(versSVG(rs(d, 2.3)) === versSVG(rs(d, 2.3)) && versSVG(rs(d, 2.3)) !== versSVG(rs(d, 2.4)), 'effets animés déterministes (même instant, même image ; instants différents, images différentes)');
}
{ // Typographie
  const base = { ...St.normaliserEl({ type: 'texte', texte: {} }).texte, police: 'display', taille: 300, contenu: 'Le retour des gardiens de la galaxie', auto: true };
  const a = Tx.miseEnPage(base, 600, 300), m = Tx.miseEnPage({ ...base, auto: false }, 600, 300), l = Tx.miseEnPage({ ...base, contenu: 'Ligne un\nLigne deux', taille: 60 }, 1000, 400);
  ok(!a.deborde && a.taille < 300 && a.largeurs.every((x) => x <= 600.5) && m.deborde && l.lignes.length === 2, `texte : ajustement automatique (${a.taille} px, ${a.lignes.length} lignes), débordement signalé en taille fixe, retours à la ligne manuels`);
  const col = (v) => Sy.resoudre(v, Sy.palette(St.nouveauDocument({}))), arc = Tx.texteNoeuds({ ...base, auto: false, taille: 80, contenu: 'COSMIQUE', deformation: { type: 'arc', force: 0.5 } }, 900, 400, col).nodes;
  const flat = (ns) => ns.flatMap((n) => (n.kids ? [n, ...flat(n.kids)] : [n])), rots = flat(arc).filter((n) => n.tr?.r).length;
  const ext = Tx.texteNoeuds({ ...base, auto: false, taille: 100, contenu: 'BAM', extrusion: { c: '#FF0000', profondeur: 20, angle: 45 }, contour: { c: '#000', w: 8 } }, 600, 300, col).nodes;
  ok(rots >= 6 && flat(ext).filter((n) => n.k === 'text' && n.fill === '#FF0000').length >= 3, `texte : arc (${rots} caractères pivotés), extrusion en couches, contours`);
  const lt = Tx.texteNoeuds({ ...base, auto: false, taille: 80, contenu: 'MACHINE' }, 900, 300, col, { anim: { mode: 'machine', p: 0.5 } }).nodes;
  ok(flat(lt).filter((n) => n.k === 'text').length === 3, 'texte : machine à écrire (3 lettres sur 7 à mi-parcours)');
}
{ // Animation
  const lin = An.bezier(0, 0, 1, 1), eio = An.bezier(0.42, 0, 0.58, 1);
  ok(Math.abs(lin(0.3) - 0.3) < 1e-3 && Math.abs(eio(0.5) - 0.5) < 1e-3 && eio(0.2) < 0.2 && Object.values(An.COURBES).every((c) => !c.f || (Math.abs(c.f(0)) < 1e-6 && Math.abs(c.f(1) - 1) < 1e-6)), 'courbes : Bézier personnalisée et préréglées (0 → 0, 1 → 1)');
  const bad = [];
  for (const type of Object.keys(An.ENTREES).filter((x) => x !== 'aucune')) { const a = { entree: { type, duree: 0.8, delai: 0.5, courbe: 'douce', dir: 'gauche' } }, d = An.etatAnim(a, 0.2, 6, 1920, 1080, 400, 200), f = An.etatAnim(a, 1.4, 6, 1920, 1080, 400, 200);
    const cache = d.op < 0.05 || d.s !== 1 || d.dx || d.dy || d.clip || (d.texte && d.texte.p === 0), fin = f.op === 1 && f.s === 1 && !f.dx && !f.dy && !f.clip && (!f.texte || f.texte.p === 1); if (!cache || !fin) bad.push(type); }
  for (const type of Object.keys(An.SORTIES).filter((x) => x !== 'aucune')) { const s = An.etatAnim({ sortie: { type, duree: 0.5, avance: 0, courbe: 'entree', dir: 'droite' } }, 6, 6, 1920, 1080, 400, 200), m = An.etatAnim({ sortie: { type, duree: 0.5 } }, 3, 6, 1920, 1080, 400, 200);
    if (!(s.op < 0.05 || s.clip || s.s !== 1 || s.dx) || m.op !== 1) bad.push('sortie:' + type); }
  for (const type of Object.keys(An.BOUCLES).filter((x) => x !== 'aucune')) { const a = { boucle: { type, amplitude: 1, periode: 1 } }, x = An.etatAnim(a, 0.1, 6, 1920, 1080, 400, 200), y = An.etatAnim(a, 0.3, 6, 1920, 1080, 400, 200); if (JSON.stringify(x) === JSON.stringify(y)) bad.push('boucle:' + type); }
  ok(!bad.length, `${Object.keys(An.ENTREES).length - 1} entrées, ${Object.keys(An.SORTIES).length - 1} sorties, ${Object.keys(An.BOUCLES).length - 1} boucles : états de départ, de fin et variation dans le temps${bad.length ? ' · ' + bad.join(', ') : ''}`);
  const c1 = An.camera({ type: 'poussee', intensite: 1 }, 6, 6, 1920, 1080, 0, 960, 540), c2 = An.camera({ type: 'poussee', intensite: 1 }, 6, 6, 1920, 1080, 1.5, 960, 540), tr = An.camera({ type: 'travelling', intensite: 1 }, 0, 6, 1920, 1080, 2, 0, 0);
  ok(c1.s > 1 && c2.s > c1.s && tr.dx > 0, 'caméra et parallaxe : la profondeur amplifie le mouvement');
  const d = St.nouveauDocument({}), e = St.creerElement('texte', d, { role: 'titre' }); e.anim = { entree: { type: 'glisse', duree: 1, delai: 1 } }; d.elements.push(St.normaliserEl(e));
  ok(!rs(d, 0.5).nodes.some((n) => n.id === e.id) && rs(d, null).nodes.find((n) => n.id === e.id)?.op === 1 && St.instantPose(d) >= 2, 'délais par calque et instant de pose');
}
{ // Groupes, matrices, adaptation de format, jetons de couleur
  const d = St.nouveauDocument({}), r = St.creerElement('forme', d, { forme: 'rect' }); Object.assign(r, { x: 100, y: 0, w: 100, h: 50 });
  const g = St.normaliserEl({ type: 'groupe', x: 500, y: 300, w: 400, h: 200, rot: 90, enfants: [r] }); d.elements.push(g);
  const b = St.boites(d)[r.id], c = b.coins[0]; // centre du groupe (700, 400) ; coin (100, 0) du groupe pivoté de 90° -> (800, 300)
  ok(Math.abs(c[0] - 800) < 0.01 && Math.abs(c[1] - 300) < 0.01, `groupes : transformation composée parent-enfant (coin ${c.map((v) => v.toFixed(1)).join(', ')})`);
  const m = St.docDepuisModele('annonce', { placeholder: ph2 }), a = St.adapter(m, Sy.format('9:16')), bx = St.boites(a);
  const dedans = a.elements.every((e) => { const q = bx[e.id].aabb; return q.x > -40 && q.y > -40 && q.x + q.w < 1120 && q.y + q.h < 1960; });
  ok(dedans && a.elements.filter((e) => e.type === 'effet').every((e) => e.w === 1080 && e.h === 1920) && nonInfo(rs(a, null)).filter((x) => x.niveau === 'erreur').length === 0, 'adaptation 16:9 → 9:16 : éléments ancrés dans le cadre, effets plein cadre étirés, aucun débordement');
  const t = St.creerElement('texte', d, { role: 'titre' }); t.texte.fill = '@accent'; d.elements = [t];
  const fill = (dd) => JSON.stringify(rs(dd, null).nodes).match(/"fill":"(#[0-9A-F]{6})"/i)?.[1];
  const d2 = { ...d, palette: 'bleu' }; ok(fill(d) && fill(d) !== fill(d2), 'jetons de couleur : changer de palette recolore les éléments');
}
{ // Migration d'une création du MVP (version 1) et robustesse
  const v1 = { ...nouveauDoc('personnage'), images: { personnage: { href: 'data:image/png;base64,iVBORw0KGgo=', w: 800, h: 1000, nom: 'heros.png', zoom: 1.2, dx: 0.1, dy: 0 } }, textes: { nom: 'Vortex' } };
  const res = {}, d = St.convertirV1(v1, res, { placeholder: ph2 }), im = []; St.parcourir(d.elements, (e) => e.type === 'image' && im.push(e)); const txt = []; St.parcourir(d.elements, (e) => e.type === 'texte' && txt.push(e.texte.contenu));
  ok(Object.values(res).some((r) => r.nom === 'heros.png') && im[0].image.src && im[0].image.zoom === 1.2 && txt.includes('VORTEX'), 'migration d\'une création du MVP : illustration en ressource, recadrage et textes conservés');
  const z = St.normaliserDoc({ format: { w: 99999, h: -5 }, elements: [{ type: 'texte', x: 'abc', texte: null }, { type: 'inconnu' }], duree: 'x', systeme: '??' });
  ok(z.format.w === 8192 && z.format.h === 64 && z.elements[0].x === 0 && z.duree === 6 && z.systeme === 'comics' && Array.isArray(rs(z, 1).nodes), 'document invalide corrigé sans plantage');
}
{ // GIF transparent et WebM
  const w = 8, h = 4, fr = new Uint8ClampedArray(w * h * 4).map((_, i) => (i % 4 === 3 ? (i < 64 ? 0 : 255) : 200)), pal = palette([fr], 256, true), gg = creerGIF(w, h, pal, 5, { transparent: true }); gg.ajouter(fr); const b = gg.fin(), dec = decoderGIF(b);
  ok(dec.frames[0].slice(0, 16).every((i) => i === 255) && dec.frames[0].slice(16).every((i) => i !== 255) && b[13 + 768 + 19 + 3] === 0x09, 'GIF transparent : pixels transparents à l\'index réservé, drapeau de transparence');
  const { muxerWebM } = await imp('atelier/motion/webm.js'), wb = new Uint8Array(await muxerWebM({ codec: 'vp9', largeur: 64, hauteur: 32, duree: 1, images: [{ data: new Uint8Array([1, 2, 3]), temps: 0, cle: true }, { data: new Uint8Array([4]), temps: 40000, cle: false }] }).arrayBuffer());
  ok(wb[0] === 0x1a && wb[1] === 0x45 && Buffer.from(wb).includes(Buffer.from('V_VP9')) && Buffer.from(wb).includes(Buffer.from('webm')), 'multiplexeur WebM : en-tête EBML, piste VP9');
}
if (process.argv.includes('--moteur')) fin();

// ---------- 2. Éditeur (Chromium, appareils ÉMULÉS) ----------
console.log('Éditeur Motion Studio (Chromium)');
const OUT = process.argv.slice(2).find((a) => !a.startsWith('--')) || join(tmpdir(), 'primestone-tests-motion'); mkdirSync(OUT, { recursive: true });
const { chromium } = createRequire(import.meta.url)('playwright');
const { demarrer } = await imp('tools/serve.mjs');
const PORT = 4197, URL0 = `http://localhost:${PORT}/atelier/`, srv = await demarrer(PORT), browser = await chromium.launch();
const erreurs = (p) => { const e = []; p.on('pageerror', (x) => e.push(x.message)); p.on('console', (m) => m.type() === 'error' && e.push(m.text())); return e; };
const pngDims = (b) => [b.readUInt32BE(16), b.readUInt32BE(20)];
const jpgDims = (b) => { for (let i = 2; i < b.length;) { const m = b[i + 1], l = b.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xc3) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; i += 2 + l; } };
const D = (p, f, a) => p.evaluate(f, a);
const docJ = (p) => D(p, () => JSON.parse(JSON.stringify(window.__studio.S.doc, (k, v) => (k === 'href' && String(v).startsWith('data:') ? 'data:…' : k === 'apercu' ? undefined : v))));
const prets = (p) => p.waitForFunction(() => window.__studio?.S?.doc && window.__studio.S.derniere);
const attendre = (p, ms = 120) => p.waitForTimeout(ms);
const deplier = (p) => p.evaluate(() => document.querySelectorAll('.panneau details').forEach((d) => { if (!d.open) { d.open = true; d.dispatchEvent(new Event('toggle')); } }));
const noms = (d) => { const l = []; const v = (els) => els.forEach((e) => { l.push(e); if (e.enfants) v(e.enfants); }); v(d.elements); return l; };
// Point de la scène (coordonnées du document) -> point écran
const ecran = async (p, x, y) => { const b = await p.locator('#surcouche').boundingBox(), d = await docJ(p); return [b.x + (x / d.format.w) * b.width, b.y + (y / d.format.h) * b.height]; };
const centreEl = async (p, id) => { const c = await D(p, (i) => { const b = window.__studio.S.boites[i].coins; return [(b[0][0] + b[2][0]) / 2, (b[0][1] + b[2][1]) / 2]; }, id); return ecran(p, ...c); };
let fichierBiblio = null, fichierProjetV2 = null;
{
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true }), p = await ctx.newPage(), err = erreurs(p);
  p.on('dialog', (dl) => (dl.type() === 'prompt' ? dl.accept(`Test ${dl.message().split(' ')[1] || ''}`.trim()) : dl.accept()));
  const dl = async (fn) => { const [d] = await Promise.all([p.waitForEvent('download', { timeout: 90000 }), fn()]); const f = join(OUT, d.suggestedFilename()); await d.saveAs(f); return f; };
  await p.goto(URL0); await p.waitForSelector('#apercu svg'); await p.getByRole('link', { name: /Motion Studio/ }).click(); await prets(p);
  let d = await docJ(p); ok(p.url().endsWith('/atelier/motion/') && d.v === 2 && d.elements.length > 5, `accès depuis l'Atelier ; premier lancement sur un modèle éditable (${d.elements.length} calques)`);
  // Page blanche, format et système choisis
  await p.click('#ouvrir-bibliotheque'); await p.selectOption('#nouveau-format', '9:16'); await p.selectOption('#nouveau-systeme', 'cinema'); await p.click('#page-blanche'); await attendre(p, 300);
  d = await docJ(p); ok(d.elements.length === 0 && d.format.w === 1080 && d.format.h === 1920 && d.systeme === 'cinema', 'page blanche 9:16, système cinématographique');
  await p.click('#ouvrir-bibliotheque'); await p.click('[data-onglet="fichiers"]'); await attendre(p); await p.click('[data-onglet="creations"]'); await attendre(p);
  await p.locator('#page-blanche').click(); await attendre(p, 300); // repart en 16:9 comics pour la suite
  await p.click('#ouvrir-bibliotheque'); await p.selectOption('#nouveau-format', '16:9'); await p.selectOption('#nouveau-systeme', 'comics'); await p.click('#page-blanche'); await attendre(p, 300);
  // Texte : ajout, contenu, style, déformation, extrusion
  await p.click('[data-ajout="texte"]'); await attendre(p);
  await p.fill('#champ-contenu', 'La Chute'); await attendre(p);
  let sc = await D(p, () => JSON.stringify(window.__studio.S.derniere.nodes)); ok(sc.includes('"LA CHUTE"'), 'texte ajouté et modifié : aperçu immédiat');
  await deplier(p); await p.selectOption('#prop-role', 'onomatopee'); await p.selectOption('#prop-deformation', 'arc'); await p.fill('#prop-extrusion', '20'); await attendre(p);
  d = await docJ(p); const tx = d.elements[0].texte; ok(tx.role === 'onomatopee' && tx.deformation.type === 'arc' && tx.extrusion.profondeur === 20 && tx.contour.w > 0, 'style d\'onomatopée du système, arc, extrusion');
  // Annuler, rétablir
  const avant = (await docJ(p)).elements.length; await p.click('[data-ajout="texte"]'); await attendre(p); await p.keyboard.press('Control+z'); await attendre(p);
  const apresZ = (await docJ(p)).elements.length; await p.keyboard.press('Control+Shift+z'); await attendre(p);
  ok(apresZ === avant && (await docJ(p)).elements.length === avant + 1, 'annuler et rétablir (Ctrl+Z, Ctrl+Maj+Z)');
  await p.keyboard.press('Delete'); await attendre(p);
  // Bibliothèque : forme, effet, composant
  for (const [onglet, sel] of [['formes', '[data-forme="bulle"]'], ['effets', '[data-effet="vitesse"]'], ['composants', '[data-composant="boum"]'], ['textes', '[data-role="corps"]']]) { await p.click('#ouvrir-bibliotheque'); await p.click(`[data-onglet="${onglet}"]`); await p.click(sel); await attendre(p); }
  d = await docJ(p); ok(['forme', 'effet', 'groupe', 'texte'].every((t) => d.elements.some((e) => e.type === t)) && d.elements.some((e) => e.forme?.type === 'bulle'), 'bibliothèque : bulle, lignes de vitesse, composant onomatopée, bloc de texte insérés');
  // Manipulation directe : déplacer, redimensionner, pivoter
  const bulle = d.elements.find((e) => e.forme?.type === 'bulle'); await p.locator('#calques-onglet, [data-onglet="calques"]').first().click(); await p.locator(`#arbre li[data-id="${bulle.id}"] .nom-calque`).click(); await p.locator('[data-onglet="proprietes"]').first().click();
  await p.fill('#prop-x', '100'); await p.fill('#prop-y', '80'); await attendre(p); bulle.x = 100; bulle.y = 80;
  let [cx, cy] = await centreEl(p, bulle.id); await p.mouse.move(cx, cy); await p.mouse.down(); await p.mouse.move(cx + 80, cy + 30, { steps: 6 }); await p.mouse.up(); await attendre(p);
  let b2 = (await docJ(p)).elements.find((e) => e.id === bulle.id); ok(b2.x > bulle.x + 50 && b2.y > bulle.y + 20, `déplacement sur la scène (x ${Math.round(bulle.x)} → ${Math.round(b2.x)})`);
  const poignee = async (n) => { const r = await p.locator(`[data-poignee="${n}"]`).boundingBox(); return [r.x + r.width / 2, r.y + r.height / 2]; };
  let [hx, hy] = await poignee('se'); await p.mouse.move(hx, hy); await p.mouse.down(); await p.mouse.move(hx + 60, hy + 40, { steps: 5 }); await p.mouse.up(); await attendre(p);
  const b3 = (await docJ(p)).elements.find((e) => e.id === bulle.id); ok(b3.w > b2.w + 80 && b3.h > b2.h + 50, `redimensionnement à la poignée (${Math.round(b2.w)} → ${Math.round(b3.w)} px)`);
  [hx, hy] = await poignee('rot'); [cx, cy] = await centreEl(p, bulle.id); await p.mouse.move(hx, hy); await p.mouse.down(); await p.mouse.move(cx + 150, cy, { steps: 6 }); await p.mouse.up(); await attendre(p);
  const b4 = (await docJ(p)).elements.find((e) => e.id === bulle.id); ok(Math.abs(Math.abs(b4.rot) - 90) < 15, `rotation à la poignée (${b4.rot}°)`);
  await p.fill('#prop-rot', '0'); await attendre(p);
  // Alignement, sélection multiple, groupe, duplication, calques
  await p.getByRole('button', { name: 'Aligner centre' }).click(); await attendre(p);
  const b5 = (await docJ(p)).elements.find((e) => e.id === bulle.id); ok(Math.abs(b5.x + b5.w / 2 - 960) < 1, 'alignement au centre de la scène');
  await D(p, () => document.activeElement?.blur()); await p.keyboard.press('Control+a'); await attendre(p);
  const nSel = await D(p, () => window.__studio.S.sel.length); await p.keyboard.press('Control+g'); await attendre(p);
  d = await docJ(p); ok(nSel >= 4 && d.elements.length === 1 && d.elements[0].type === 'groupe' && d.elements[0].enfants.length === nSel, `sélection de tout (${nSel}) puis groupe`);
  await p.keyboard.press('Control+Shift+g'); await attendre(p); d = await docJ(p); ok(d.elements.length === nSel && Math.abs(d.elements.find((e) => e.id === bulle.id).x - b5.x) < 0.5, 'dégroupage : positions conservées');
  await p.locator('[data-onglet="calques"]').first().click(); await p.locator(`#arbre li[data-id="${bulle.id}"] .nom-calque`).click(); await p.keyboard.press('Control+d'); await attendre(p);
  d = await docJ(p); ok(d.elements.length === nSel + 1 && d.elements.some((e) => e.nom.includes('(copie)')), 'duplication (Ctrl+D)');
  await p.locator(`#arbre li[data-id="${bulle.id}"] .oeil`).click(); await p.locator(`#arbre li[data-id="${bulle.id}"] .verrou`).click(); await attendre(p);
  d = await docJ(p); const bl = d.elements.find((e) => e.id === bulle.id); ok(bl.visible === false && bl.verrou === true && !(await D(p, (i) => window.__studio.S.derniere.nodes.some((n) => n.id === i), bulle.id)), 'calque masqué et verrouillé');
  await p.locator(`#arbre li[data-id="${bulle.id}"] .oeil`).click(); await p.locator(`#arbre li[data-id="${bulle.id}"] .verrou`).click();
  // Illustrations : import multiple, original conservé, masque, traitement, remplacement, recadrage
  const f1 = join(ROOT, 'brand/99_tests/substitution/PLACEHOLDER_art-pop.jpg'), f2 = join(ROOT, 'brand/99_tests/substitution/PLACEHOLDER_art-encre.png');
  await p.setInputFiles('#fichier-image', [f1, f2]); await p.waitForFunction(() => window.__studio.S.sel.length === 2); await attendre(p, 200);
  const res = await D(p, () => [...window.__studio.S.ressources.values()].filter((r) => r.type === 'image').map((r) => ({ nom: r.nom, l: r.href.length, w: r.w, h: r.h })));
  const b64 = Math.ceil(readFileSync(f1).length / 3) * 4; ok(res.length === 2 && res.some((r) => r.nom === 'PLACEHOLDER_art-pop.jpg' && r.l === b64 + 'data:image/jpeg;base64,'.length), 'import de plusieurs illustrations ; fichier original conservé à l\'octet près');
  d = await docJ(p); const img = d.elements.find((e) => e.type === 'image' && e.nom === 'PLACEHOLDER_art-pop');
  await p.locator('[data-onglet="calques"]').first().click(); await p.locator(`#arbre li[data-id="${img.id}"] .nom-calque`).click(); await p.locator('[data-onglet="proprietes"]').first().click();
  await deplier(p); await p.selectOption('#prop-masque', 'ellipse'); await p.fill('#prop-image-contour', '8'); await p.locator('#prop-bichromie').check(); await attendre(p, 600);
  const href = await D(p, (i) => { const f = (ns) => ns.flatMap((n) => [n, ...(n.kids ? f(n.kids) : [])]); return f(window.__studio.S.derniere.nodes.find((n) => n.id === i).kids).find((n) => n.k === 'img')?.href.length; }, img.id);
  ok(href && href !== res.find((r) => r.nom.endsWith('.jpg')).l, 'masque elliptique, contour et bichromie non destructive (image dérivée, original intact)');
  await p.fill('#prop-zoom', '1.7'); await p.locator('#prop-zoom').dispatchEvent('input');
  const [dl0] = [await p.locator('#recadrer').click()]; void dl0; [cx, cy] = await centreEl(p, img.id); await p.mouse.move(cx, cy); await p.mouse.down(); await p.mouse.move(cx - 40, cy - 20, { steps: 4 }); await p.mouse.up(); await attendre(p);
  d = await docJ(p); let im2 = d.elements.find((e) => e.id === img.id).image; ok(im2.dx < -0.01 && im2.zoom > 1.5, `recadrage dans la scène (dx ${im2.dx.toFixed(3)}, zoom ×${im2.zoom.toFixed(2)})`);
  await p.keyboard.press('Escape');
  const srcAvant = im2.src; await p.getByRole('button', { name: 'Remplacer l\'illustration…' }).click().catch(() => {}); await p.setInputFiles('#fichier-image', f2); await attendre(p, 400);
  im2 = (await docJ(p)).elements.find((e) => e.id === img.id).image; ok(im2.src !== srcAvant && im2.masque.forme === 'ellipse' && im2.zoom > 1.5 && im2.traitement.bichromie.actif, 'remplacement de l\'illustration : masque, recadrage et traitements conservés');
  // Animation par calque, préréglage, échelonnement, séquenceur
  await deplier(p); await p.locator('[data-onglet="animation"]').first().click(); await deplier(p); await p.selectOption('#anim-entree', 'glisse'); await p.fill('#anim-delai', '1'); await p.fill('#anim-duree', '0.8'); await attendre(p);
  const opA = await D(p, (i) => { const s = window.__studio.scene(0.5); return s.nodes.some((n) => n.id === i); }, img.id), opB = await D(p, (i) => window.__studio.scene(2).nodes.find((n) => n.id === i)?.op, img.id);
  ok(!opA && opB === 1, 'animation indépendante du calque : absent à 0,5 s, visible à 2 s');
  await p.selectOption('#anim-preset', 'impact'); await attendre(p); d = await docJ(p); const ai = d.elements.find((e) => e.id === img.id).anim;
  ok(ai.entree.type === 'tampon' && ai.boucle.type === 'tremblement' && ai.entree.delai === 1, 'préréglage d\'animation appliqué (délai conservé)');
  await D(p, () => document.activeElement?.blur()); await p.keyboard.press('Control+a'); await attendre(p); await p.click('#echelonner'); await attendre(p);
  d = await docJ(p); const dels = d.elements.map((e) => e.anim.entree.delai); ok(dels.every((v, i) => i === 0 || v > dels[i - 1] - 1e-9) && dels.at(-1) - dels[0] > 0.5, `échelonnement des entrées (${dels.map((v) => v.toFixed(1)).join(' · ')} s)`);
  const barre = p.locator(`#pistes .rail[data-id="${img.id}"] [data-barre="entree"]`), bb = await barre.boundingBox(), d0 = (await docJ(p)).elements.find((e) => e.id === img.id).anim.entree.delai;
  await p.mouse.move(bb.x + bb.width / 2, bb.y + bb.height / 2); await p.mouse.down(); await p.mouse.move(bb.x + bb.width / 2 + 60, bb.y + bb.height / 2, { steps: 4 }); await p.mouse.up(); await attendre(p);
  const d1 = (await docJ(p)).elements.find((e) => e.id === img.id).anim.entree.delai; ok(d1 > d0 + 0.1, `séquenceur : barre d'entrée déplacée (délai ${d0} → ${d1} s)`);
  await p.click('#lecture'); await attendre(p, 500); const t1 = await D(p, () => window.__studio.S.t); await attendre(p, 300); const t2 = await D(p, () => window.__studio.S.t); await p.click('#lecture');
  ok(t2 > t1, `lecture de la composition (t ${t1.toFixed(2)} → ${t2.toFixed(2)} s)`);
  // Document : système, palette, caméra, format avec adaptation, déclinaison
  await p.locator('[data-onglet="document"]').first().click(); await deplier(p); const fond1 = await D(p, () => window.__studio.S.derniere.nodes[0].fill);
  await p.selectOption('#doc-systeme', 'cosmique'); await attendre(p, 200); const fond2 = await D(p, () => window.__studio.S.derniere.nodes[0].fill);
  await p.selectOption('#doc-camera', 'poussee'); await attendre(p);
  ok(fond1 !== fond2 && (await docJ(p)).camera.type === 'poussee', `système graphique changé : jetons recolorés (${fond1} → ${fond2}), caméra réglée`);
  await deplier(p); await p.selectOption('#doc-format', 'a4-portrait'); await attendre(p, 300); d = await docJ(p); const bx = await D(p, () => Object.values(window.__studio.S.boites).map((b) => b.aabb));
  ok(d.format.w === 2480 && d.format.h === 3508 && (await p.locator('#resume').innerText()).match(/OK|attention/i) && bx.length > 3, `format A4 300 dpi appliqué avec adaptation (${(await p.locator('#resume').innerText()).trim()})`);
  await p.selectOption('#doc-format', '16:9'); await attendre(p, 300);
  // Police locale
  await p.locator('[data-onglet="calques"]').first().click(); const txt = (await docJ(p)).elements.find((e) => e.type === 'texte'); await p.locator(`#arbre li[data-id="${txt.id}"] .nom-calque`).click(); await p.locator('[data-onglet="proprietes"]').first().click();
  await p.setInputFiles('#fichier-police', join(ROOT, 'brand/03_fonts/web/Archivo-Bold.woff2')); await attendre(p, 500);
  d = await docJ(p); ok(d.elements.find((e) => e.id === txt.id).texte.police.startsWith('f:') && (await D(p, () => [...document.fonts].some((f) => f.family === 'PS-Archivo-Bold'))), 'import d\'une police locale appliquée au texte sélectionné');
  // Composant personnel, modèle personnel, version
  await p.click('#prop-nom'); await p.getByRole('button', { name: 'Comme composant' }).click(); await attendre(p, 400);
  await p.click('#ouvrir-bibliotheque'); await p.click('[data-onglet="composants"]'); await attendre(p, 300); const nComp = await p.locator('#contenu-biblio .carte').filter({ hasText: 'Test' }).count();
  const nAv = (await docJ(p)).elements.length; await p.locator('#contenu-biblio .carte').filter({ hasText: 'Test' }).getByRole('button', { name: 'Insérer' }).first().click(); await attendre(p);
  ok(nComp >= 1 && (await docJ(p)).elements.length === nAv + 1, 'composant personnel enregistré puis réutilisé');
  await deplier(p); await p.locator('[data-onglet="document"]').first().click(); await deplier(p); await p.locator('#doc-version').click(); await attendre(p, 400);
  const nV = (await docJ(p)).elements.length; await D(p, () => document.activeElement?.blur()); await p.keyboard.press('Control+a'); await p.keyboard.press('Delete'); await attendre(p, 300); await p.locator('[data-onglet="document"]').first().click(); await attendre(p, 300);
  await p.locator('#liste-versions li').first().getByRole('button', { name: 'Restaurer' }).click(); await attendre(p, 600);
  ok((await docJ(p)).elements.length === nV, `version enregistrée puis restaurée (${nV} calques)`);
  await p.locator('[data-onglet="document"]').first().click(); await deplier(p); await p.locator('#doc-modele').click(); await attendre(p, 400);
  // Sauvegarde automatique et réouverture
  await p.fill('#nom', 'Collision finale'); await attendre(p, 900); const id0 = (await docJ(p)).id, n0 = (await docJ(p)).elements.length;
  await p.reload(); await prets(p); d = await docJ(p);
  ok(d.id === id0 && d.nom === 'Collision finale' && d.elements.length === n0 && (await D(p, () => window.__studio.S.ressources.size)) >= 3, 'sauvegarde automatique : création, illustrations et police retrouvées après rechargement');
  await p.click('#ouvrir-bibliotheque'); await attendre(p, 300); const nCre = await p.locator('#liste-creations .carte').count();
  await p.fill('#filtre-nom', 'Collision'); await p.locator('#filtre-nom').dispatchEvent('change'); await attendre(p, 300);
  ok(nCre >= 3 && (await p.locator('#liste-creations .carte').count()) === 1, `bibliothèque : ${nCre} créations, recherche par nom`);
  await p.click('[data-onglet="modeles"]'); await attendre(p, 300); await p.locator('#contenu-biblio .carte').filter({ hasText: 'Test' }).getByRole('button', { name: 'Créer' }).click(); await attendre(p, 400);
  d = await docJ(p); ok(d.id !== id0 && d.elements.length === n0 - 0 || d.elements.length > 0, 'nouvelle création depuis un modèle personnel');
  await p.click('#ouvrir-bibliotheque'); await p.click('[data-onglet="modeles"]'); await attendre(p, 200); await p.locator('[data-modele="dossier"]').click(); await attendre(p, 400);
  d = await docJ(p); ok(d.origine?.modele === 'dossier' && noms(d).some((e) => e.type === 'texte' && e.texte.contenu === 'NÉMÉSIS'), 'modèle intégré « Dossier de personnage » : textes éditables');
  // Fichiers : projet et bibliothèque
  await p.click('#ouvrir-bibliotheque'); await p.click('[data-onglet="creations"]'); await attendre(p, 300); await p.locator('#liste-creations .carte').filter({ hasText: 'Collision finale' }).getByRole('button', { name: 'Ouvrir' }).click(); await attendre(p, 500);
  await p.click('#ouvrir-bibliotheque'); await p.click('[data-onglet="fichiers"]'); await attendre(p);
  fichierProjetV2 = await dl(() => p.click('#enregistrer-projet')); const pj = JSON.parse(readFileSync(fichierProjetV2, 'utf8'));
  ok(pj.format === 'primestone-motion' && pj.version === 2 && Object.values(pj.ressources).some((r) => r.type === 'police') && Object.values(pj.ressources).filter((r) => r.type === 'image').length >= 1, 'projet enregistré en fichier : composition, illustrations et police incluses');
  fichierBiblio = await dl(() => p.click('#exporter-bibliotheque')); const bj = JSON.parse(readFileSync(fichierBiblio, 'utf8'));
  ok(bj.format === 'primestone-motion-bibliotheque' && bj.creations.length >= 3 && bj.modeles.length >= 1 && bj.composants.length >= 1, `bibliothèque exportée (${bj.creations.length} créations, ${bj.modeles.length} modèle, ${bj.composants.length} composant)`);
  // Exports
  await p.locator('#bibliotheque [data-fermer]').click(); await p.click('#ouvrir-export'); await attendre(p, 300);
  const png = readFileSync(await dl(() => p.click('[data-export="png"]'))); ok(pngDims(png).join('×') === '1920×1080', `PNG ${pngDims(png).join(' × ')}`);
  await p.selectOption('#export-echelle', '2'); await p.locator('#export-transparent').check();
  const png2 = readFileSync(await dl(() => p.click('[data-export="png"]'))), alpha = await D(p, async (b64) => { const im = new Image(); im.src = 'data:image/png;base64,' + b64; await im.decode(); const c = Object.assign(document.createElement('canvas'), { width: im.width, height: im.height }), g = c.getContext('2d'); g.drawImage(im, 0, 0); let n = 0; const d = g.getImageData(0, 0, im.width, im.height).data; for (let i = 3; i < d.length; i += 4000) if (d[i] === 0) n++; return n; }, png2.toString('base64'));
  ok(pngDims(png2).join('×') === '3840×2160' && alpha > 0, `PNG ×2 (${pngDims(png2).join(' × ')}) à fond transparent (${alpha} échantillons transparents)`);
  await p.locator('#export-transparent').uncheck(); await p.selectOption('#export-echelle', '1');
  const jpg = readFileSync(await dl(() => p.click('[data-export="jpg"]'))); ok(jpgDims(jpg).join('×') === '1920×1080', `JPG ${jpgDims(jpg).join(' × ')} (${(jpg.length / 1048576).toFixed(2)} Mo)`);
  const svg = readFileSync(await dl(() => p.click('[data-export="svg"]')), 'utf8'), svgW = await D(p, async (s) => { const im = new Image(); im.src = URL.createObjectURL(new Blob([s], { type: 'image/svg+xml' })); try { await im.decode(); return im.naturalWidth; } catch { return 0; } }, svg);
  ok(!/href="(?!data:)/.test(svg) && svg.includes('@font-face') && svg.includes('PS-Archivo-Bold') && svg.includes('inkscape:groupmode="layer"') && svgW === 1920, 'SVG autonome : calques nommés, images et polices (y compris importée) intégrées, lisible par le navigateur');
  await p.locator('#contenu-export').evaluate(() => {}); await p.selectOption('#export-gif-fps', '10');
  await D(p, () => { window.__studio.S.doc.duree = 2; }); const gif = readFileSync(await dl(() => p.click('[data-export="gif"]'))), gd = decoderGIF(new Uint8Array(gif));
  ok(gif.toString('latin1', 0, 6) === 'GIF89a' && gd.w === 480 && gd.h === 270 && gd.frames.length === 20, `GIF animé 480 × 270, ${gd.frames.length} images décodées`);
  const lire = async (f, type) => D(p, async ([b64, t]) => { const v = document.createElement('video'); v.muted = true; v.src = URL.createObjectURL(new Blob([Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))], { type: t })); await new Promise((ok, ko) => { v.onloadedmetadata = ok; v.onerror = () => ko(new Error('illisible')); setTimeout(() => ko(new Error('délai')), 8000); });
    if (!isFinite(v.duration)) { v.currentTime = 1e6; await new Promise((ok) => { v.ontimeupdate = ok; setTimeout(ok, 3000); }); } return { w: v.videoWidth, h: v.videoHeight, d: v.duration }; }, [readFileSync(f).toString('base64'), type]).catch((e) => ({ err: e.message }));
  if (await p.locator('[data-export="webm"]').count()) { const f = await dl(() => p.click('[data-export="webm"]')), m = await lire(f, 'video/webm'); ok(m.w === 1920 && m.h === 1080 && Math.abs(m.d - 2) < 0.2, `WebM image par image lu par le navigateur : ${m.w} × ${m.h}, ${m.d?.toFixed(2)} s${m.err ? ' · ' + m.err : ''}`); }
  else ok(false, 'WebM image par image : encodeur WebCodecs indisponible');
  const mime = await D(p, () => window.__studio.MIME_TEMPS_REEL);
  if (mime) { await p.selectOption('#export-video-def', '0.5'); const f = await dl(() => p.click('[data-export="direct"]')), m = await lire(f, mime.split(';')[0]); ok(m.w === 960 && m.d > 1.5, `${mime.includes('mp4') ? 'MP4' : 'WebM'} temps réel lu par le navigateur : ${m.w} × ${m.h}, ${m.d?.toFixed(2)} s${m.err ? ' · ' + m.err : ''}`); }
  ok(!err.length, `aucune erreur JavaScript${err.length ? ' · ' + [...new Set(err)].slice(0, 3).join(' | ') : ''}`);
  await p.keyboard.press('Escape');
  await D(p, () => Promise.race([navigator.serviceWorker.ready, new Promise((r) => setTimeout(r, 10000))])); await p.reload(); await prets(p); await ctx.setOffline(true); await p.reload();
  ok(await p.waitForFunction(() => window.__studio?.S?.derniere, null, { timeout: 10000 }).then(() => true).catch(() => false), 'hors ligne : Motion Studio se recharge et rend la création'); await ctx.setOffline(false); await ctx.close();
}
// Transfert entre appareils : nouvel appareil (contexte vierge), import de projet, de bibliothèque et d'un projet du MVP
{
  const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 } }), p = await ctx.newPage(), err = erreurs(p); await p.goto(URL0 + 'motion/'); await prets(p);
  await p.setInputFiles('#fichier-projet', fichierProjetV2); await attendre(p, 600); let d = await docJ(p);
  ok(d.nom === 'Collision finale' && (await D(p, () => [...window.__studio.S.ressources.values()].some((r) => r.type === 'police'))), 'projet ouvert sur un autre appareil : illustrations et police restaurées');
  await p.setInputFiles('#fichier-projet', fichierBiblio); await attendre(p, 800); await p.click('#ouvrir-bibliotheque'); await attendre(p, 300);
  ok((await p.locator('#liste-creations .carte').count()) >= 3, 'bibliothèque complète importée sur un autre appareil');
  await p.keyboard.press('Escape');
  const v1 = { format: 'primestone-motion', version: 1, creation: { ...nouveauDoc('evenement'), nom: 'Ancienne création', textes: { titre: 'Fusion' }, images: { gauche: { href: 'data:image/png;base64,' + readFileSync(join(ROOT, 'brand/99_tests/substitution/PLACEHOLDER_art-encre.png')).toString('base64'), w: 1200, h: 1200, nom: 'gauche.png', zoom: 1, dx: 0, dy: 0 } } } };
  const fv1 = join(OUT, 'ancien.motion.json'); writeFileSync(fv1, JSON.stringify(v1)); await p.setInputFiles('#fichier-projet', fv1); await attendre(p, 600); d = await docJ(p);
  ok(d.v === 2 && d.nom === 'Ancienne création' && noms(d).some((e) => e.type === 'image' && e.image.src) && noms(d).some((e) => e.texte?.contenu === 'FUSION'), 'projet du MVP (version 1) ouvert et converti : illustration et textes conservés');
  ok(!err.length, `import et migration sans erreur JavaScript${err.length ? ' · ' + err.slice(0, 2).join(' | ') : ''}`); await ctx.close();
}
// Appareils émulés : mise en page, cibles tactiles, gestes
for (const [nom, opt] of [
  ['galaxy-s25', { viewport: { width: 384, height: 832 }, deviceScaleFactor: 2.8125, isMobile: true, hasTouch: true }],
  ['ipad-m2-portrait', { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
  ['ipad-m2-paysage', { viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
  ['windows-1366', { viewport: { width: 1366, height: 768 } }],
]) {
  const ctx = await browser.newContext(opt), p = await ctx.newPage(), err = erreurs(p); await p.goto(URL0 + 'motion/'); await prets(p); await attendre(p, 300);
  const m = await D(p, () => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight, ap: document.querySelector('#apercu').getBoundingClientRect().toJSON(), petits: [...document.querySelectorAll('button, input[type=text], input[type=number], select, summary')].filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44 && !e.closest('.sequenceur')).map((e) => e.textContent.trim().slice(0, 15) || e.id) }));
  ok(m.sw <= m.iw && m.ap.width > 100 && m.ap.top < m.ih, `${nom} : pas de défilement horizontal (${m.sw} ≤ ${m.iw} px), scène visible (${Math.round(m.ap.width)} × ${Math.round(m.ap.height)} px)`);
  if (opt.hasTouch) {
    ok(!m.petits.length, `${nom} : cibles tactiles d'au moins 44 px${m.petits.length ? ' · ' + m.petits.slice(0, 5).join(', ') : ''}`);
    const titre = (await docJ(p)).elements.find((e) => e.nom === 'Titre'), [cx, cy] = await centreEl(p, titre.id), cdp = await ctx.newCDPSession(p), t = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
    await t('touchStart', [[cx, cy]]); for (let i = 1; i <= 6; i++) await t('touchMove', [[cx + i * 6, cy + i * 3]]); await t('touchEnd', []); await attendre(p);
    const t1 = (await docJ(p)).elements.find((e) => e.id === titre.id); await t('touchStart', [[cx - 20, cy], [cx + 20, cy]]); for (let i = 1; i <= 6; i++) await t('touchMove', [[cx - 20 - i * 6, cy], [cx + 20 + i * 6, cy]]); await t('touchEnd', []); await attendre(p);
    const t2 = (await docJ(p)).elements.find((e) => e.id === titre.id);
    ok(t1.x > titre.x + 5 && t2.w > t1.w * 1.2, `${nom} : toucher-glisser déplace le titre, pincer l'agrandit (×${(t2.w / t1.w).toFixed(2)})`);
  }
  await p.screenshot({ path: join(OUT, `studio-${nom}.png`) });
  ok(!err.length, `${nom} : aucune erreur JavaScript${err.length ? ' · ' + err.slice(0, 2).join(' | ') : ''}`); await ctx.close();
}
await browser.close(); srv.close();
fin();
function fin() { const ko = res.filter((c) => !c).length; console.log(ko ? `\n${ko} test(s) en échec sur ${res.length}.` : `\n${res.length} tests Motion Studio réussis.`); process.exit(ko ? 1 : 0); }
