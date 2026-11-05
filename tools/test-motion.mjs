// Primestone · tests de Motion Studio : moteur (Node) puis interface de bout en bout (Chromium, appareils ÉMULÉS).
// Usage : node tools/test-motion.mjs [--moteur] [dossier-captures]
import { mkdirSync, readFileSync } from 'node:fs';
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
console.log('Moteur Motion Studio');
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
if (process.argv.includes('--moteur')) fin();

// ---------- 2. Interface (Chromium) ----------
console.log('Interface Motion Studio (Chromium)');
const OUT = process.argv.slice(2).find((a) => !a.startsWith('--')) || join(tmpdir(), 'primestone-tests-motion'); mkdirSync(OUT, { recursive: true });
const { chromium } = createRequire(import.meta.url)('playwright');
const { demarrer } = await imp('tools/serve.mjs');
const PORT = 4197, URL0 = `http://localhost:${PORT}/atelier/`, srv = await demarrer(PORT), browser = await chromium.launch();
const erreurs = (p) => { const e = []; p.on('pageerror', (x) => e.push(x.message)); p.on('console', (m) => m.type() === 'error' && e.push(m.text())); return e; };
const pngDims = (b) => [b.readUInt32BE(16), b.readUInt32BE(20)];
const jpgDims = (b) => { for (let i = 2; i < b.length;) { const m = b[i + 1], l = b.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xc3) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; i += 2 + l; } };
const docJ = (p) => p.evaluate(() => JSON.parse(JSON.stringify(window.__motion.doc, (k, v) => (k === 'href' && String(v).startsWith('data:') ? 'data:…' : v))));
{
  const ctx = await browser.newContext({ viewport: { width: 1600, height: 1000 }, acceptDownloads: true }), p = await ctx.newPage(), err = erreurs(p);
  await p.goto(URL0); await p.waitForSelector('#apercu svg');
  await p.getByRole('link', { name: /Motion Studio/ }).click(); await p.waitForFunction(() => window.__motion?.scene);
  ok(p.url().endsWith('/atelier/motion/'), 'accès depuis l\'Atelier : lien Motion Studio');
  const fams = await p.locator('#familles button').count(); let rendus = 0; const pb = [];
  for (let i = 0; i < fams; i++) { await p.locator('#familles button').nth(i).click(); await p.waitForTimeout(80); const d = await docJ(p); if ((await p.locator('#alertes li[data-niveau="erreur"]').count()) === 0 && d.famille === Object.keys(FAMILLES_MOTION)[i]) rendus++; else pb.push(d.famille); }
  ok(fams === 8 && rendus === 8, `8 familles sélectionnables et rendues sans erreur${pb.length ? ' · ' + pb.join(', ') : ''}`);
  await p.locator('#familles button').first().click();
  await p.fill('#champ-titre', 'Les Gardiens'); await p.waitForTimeout(80);
  ok((await docJ(p)).textes.titre === 'Les Gardiens' && (await p.evaluate(() => window.__motion.scene.nodes.find((g) => g.id === 'titre').kids.at(-1).lignes.join(' '))) === 'LES GARDIENS', 'texte modifié : aperçu mis à jour immédiatement');
  await p.fill('#champ-titre', 'Anticonstitutionnellementissimes et les autres héros de la galaxie'); await p.waitForTimeout(80);
  ok(/déborde/.test(await p.locator('#alertes').innerText()) && (await p.getAttribute('#champ-titre', 'aria-invalid')) === 'true', 'titre trop long : erreur affichée et champ signalé');
  await p.fill('#champ-titre', 'Les Gardiens');
  await p.locator('#directions button').nth(2).click(); await p.locator('#formats button', { hasText: '9:16' }).click(); await p.waitForTimeout(150);
  const r = await p.evaluate(() => { const c = document.querySelector('#apercu'); return { d: window.__motion.doc.direction, f: window.__motion.doc.format, r: c.width / c.height }; });
  ok(r.d === 'nuit' && r.f === '9:16' && Math.abs(r.r - 1080 / 1920) < 0.01, `direction et format changés : ${r.d}, ${r.f}, aperçu ${r.r.toFixed(3)}`);
  await p.locator('#formats button', { hasText: '16:9' }).click();
  // Illustration : import, recadrage au glisser, zoom à la molette
  await p.setInputFiles('#fichier-visuel', join(ROOT, 'brand/99_tests/substitution/PLACEHOLDER_art-pop.jpg')); await p.waitForFunction(() => window.__motion.doc.images.visuel);
  ok((await docJ(p)).images.visuel.nom === 'PLACEHOLDER_art-pop.jpg', 'importation d\'une illustration');
  const bb = await p.locator('#apercu').boundingBox(), ix = bb.x + bb.width * 0.8, iy = bb.y + bb.height * 0.5;
  await p.mouse.move(ix, iy); await p.mouse.down(); await p.mouse.move(ix - 60, iy - 20, { steps: 5 }); await p.mouse.up();
  await p.mouse.move(ix, iy); await p.mouse.wheel(0, -300); await p.waitForTimeout(100);
  const im = (await docJ(p)).images.visuel; ok(im.dx < 0 && im.zoom > 1.2, `recadrage : glisser (dx ${im.dx.toFixed(3)}) et molette (zoom ×${im.zoom.toFixed(2)})`);
  // Calques : sélection dans l'aperçu, déplacement, masquage, ordre
  await p.mouse.click(bb.x + bb.width * 0.12, bb.y + bb.height * 0.25); await p.waitForTimeout(80);
  const s1 = await p.evaluate(() => document.querySelector('#calques li[data-actif="true"]')?.dataset.id);
  await p.mouse.move(bb.x + bb.width * 0.12, bb.y + bb.height * 0.25); await p.mouse.down(); await p.mouse.move(bb.x + bb.width * 0.12 + 50, bb.y + bb.height * 0.25, { steps: 4 }); await p.mouse.up();
  const cal = (await docJ(p)).calques[s1] || {};
  ok(!!s1 && cal.x > 0, `calque sélectionné dans l'aperçu (${s1}) et déplacé au glisser (x +${((cal.x || 0) * 100).toFixed(1)} %)`);
  await p.locator('#calques li[data-id="lueur"] .oeil').click(); await p.waitForTimeout(80);
  ok(!(await p.evaluate(() => window.__motion.scene.nodes.some((g) => g.id === 'lueur'))), 'calque masqué (lueur)');
  await p.locator('#calques li[data-id="visuel"] button', { hasText: '↑' }).click(); await p.waitForTimeout(80);
  ok((await docJ(p)).ordre?.indexOf('visuel') > (await docJ(p)).ordre?.indexOf('lueur'), 'ordre des calques modifié');
  // Effets et couleurs
  await p.locator('#effet-particules').fill('60'); await p.waitForTimeout(60);
  await p.locator('#couleur-accent').evaluate((e) => { e.value = '#ff3b30'; e.dispatchEvent(new Event('input')); }); await p.waitForTimeout(60);
  const de = await docJ(p); ok(de.effets.particules === 60 && de.couleurs.accent === '#FF3B30' && (await p.evaluate(() => window.__motion.scene.couches.some((c) => c.id === 'particules'))), 'effets et couleurs réglables (particules 60, accent rouge)');
  // Animation : presets, lecture, curseur
  await p.locator('#presets button', { hasText: 'Zoom' }).click(); await p.waitForTimeout(500);
  const t1 = await p.evaluate(() => window.__motion.t); await p.waitForTimeout(400); const t2 = await p.evaluate(() => window.__motion.t);
  ok((await docJ(p)).preset === 'zoom' && t2 > t1, `preset choisi et prévisualisé en lecture (t ${t1.toFixed(2)} → ${t2.toFixed(2)} s)`);
  await p.locator('#lecture').click(); await p.evaluate(() => { const r = document.querySelector('#temps'); r.value = 0.1; r.dispatchEvent(new Event('input')); }); await p.waitForTimeout(80);
  ok(Math.abs((await p.evaluate(() => window.__motion.t)) - 0.1) < 0.01 && (await p.locator('#lecture').getAttribute('aria-pressed')) === 'false', 'pause et positionnement au curseur');
  await p.selectOption('#duree', '4'); await p.fill('#nom', 'Annonce test'); await p.waitForTimeout(500);
  // Sauvegarde locale et réouverture
  const id0 = (await docJ(p)).id; await p.reload(); await p.waitForFunction(() => window.__motion?.scene);
  const rd = await docJ(p); ok(rd.id === id0 && rd.nom === 'Annonce test' && rd.textes.titre === 'Les Gardiens' && rd.images.visuel?.nom === 'PLACEHOLDER_art-pop.jpg' && rd.preset === 'zoom' && rd.calques.lueur?.visible === false, 'sauvegarde locale : création retrouvée après rechargement (textes, image, calques, animation)');
  await p.locator('#nouvelle').click(); await p.locator('#familles button').nth(6).click(); await p.waitForTimeout(500);
  await p.locator('#mes-creations summary').click(); const nb = +(await p.locator('#nb-creations').innerText());
  await p.locator('#liste-creations li', { hasText: 'Annonce test' }).locator('.nom').click(); await p.waitForTimeout(100);
  ok(nb >= 2 && (await docJ(p)).id === id0, `Mes créations : ${nb} créations, réouverture de la précédente`);
  const dl = async (sel) => { const [d] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), p.locator(sel).click()]); const f = join(OUT, d.suggestedFilename()); await d.saveAs(f); return f; };
  const fj = await dl('#enregistrer-fichier'); const j = JSON.parse(readFileSync(fj, 'utf8'));
  ok(j.format === 'primestone-motion' && j.creation.images.visuel.href.startsWith('data:image/'), 'enregistrement en fichier .json (illustrations intégrées)');
  await p.setInputFiles('#fichier-projet', fj); await p.waitForTimeout(300);
  const ro = await docJ(p); ok(ro.id !== id0 && ro.nom === 'Annonce test' && ro.images.visuel?.nom === 'PLACEHOLDER_art-pop.jpg', 'ouverture d\'un fichier .json (nouvelle copie locale)');
  // Exports
  const png = readFileSync(await dl('[data-export="png"]')); ok(pngDims(png).join('×') === '1920×1080', `export PNG ${pngDims(png).join(' × ')}`);
  const jpg = readFileSync(await dl('[data-export="jpg"]')); ok(jpgDims(jpg).join('×') === '1920×1080' && jpg.length < 2 * 1048576, `export JPG ${jpgDims(jpg).join(' × ')}, ${(jpg.length / 1048576).toFixed(2)} Mo`);
  const svg = readFileSync(await dl('[data-export="svg"]'), 'utf8');
  ok(svg.includes('viewBox="0 0 1920 1080"') && !/href="(?!data:)/.test(svg) && svg.includes('@font-face') && svg.includes('inkscape:label="Titre"'), 'export SVG autonome (images et polices intégrées, calques nommés)');
  const sv = await p.evaluate(async (s) => { const im = new Image(); im.src = URL.createObjectURL(new Blob([s], { type: 'image/svg+xml' })); try { await im.decode(); return im.naturalWidth; } catch { return 0; } }, svg);
  ok(sv === 1920, 'SVG exporté lisible par le navigateur');
  const gif = readFileSync(await dl('[data-export="gif"]')); ok(gif.toString('latin1', 0, 6) === 'GIF89a' && gif.readUInt16LE(6) === 480 && gif.readUInt16LE(8) === 270, `export GIF 480 × 270, ${(gif.length / 1048576).toFixed(2)} Mo`);
  const mime = await p.evaluate(() => window.__motion.MIME_VIDEO); await p.selectOption('#video-def', '0.5');
  const vid = readFileSync(await dl('[data-export="video"]')), mp4 = vid.toString('latin1', 4, 8) === 'ftyp', webm = vid.readUInt32BE(0) === 0x1a45dfa3;
  ok((mime.includes('mp4') ? mp4 : webm) && vid.length > 20000, `export vidéo ${mime.includes('mp4') ? 'MP4' : 'WebM'} (${mime}), ${(vid.length / 1024).toFixed(0)} Ko`);
  ok(!err.length, `aucune erreur JavaScript${err.length ? ' · ' + err.join(' | ') : ''}`);
  // Hors ligne : Motion Studio est dans le précache de l'Atelier
  await p.evaluate(() => navigator.serviceWorker.ready); await p.reload(); await p.waitForFunction(() => window.__motion?.scene);
  await ctx.setOffline(true); await p.reload(); const off = await p.waitForFunction(() => window.__motion?.scene, null, { timeout: 8000 }).then(() => true).catch(() => false);
  ok(off, 'hors ligne : Motion Studio se recharge et rend la création'); await ctx.setOffline(false); await ctx.close();
}
// Appareils émulés : mise en page et gestes tactiles
for (const [nom, opt] of [
  ['galaxy-s25', { viewport: { width: 384, height: 832 }, deviceScaleFactor: 2.8125, isMobile: true, hasTouch: true }],
  ['ipad-m2-portrait', { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
  ['windows-1366', { viewport: { width: 1366, height: 768 } }],
]) {
  const ctx = await browser.newContext(opt), p = await ctx.newPage(), err = erreurs(p);
  await p.goto(URL0 + 'motion/'); await p.waitForFunction(() => window.__motion?.scene);
  const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight, ap: document.querySelector('#apercu').getBoundingClientRect(), cibles: [...document.querySelectorAll('button, input[type=text], select, summary')].filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44).map((e) => e.textContent.slice(0, 20)) }));
  ok(m.sw <= m.iw && m.ap.width > 0 && m.ap.bottom <= m.ih, `${nom} : pas de défilement horizontal (${m.sw} ≤ ${m.iw} px), aperçu visible (${Math.round(m.ap.width)} × ${Math.round(m.ap.height)} px)`);
  ok(!m.cibles.length, `${nom} : cibles tactiles d'au moins 44 px${m.cibles.length ? ' · ' + m.cibles.join(', ') : ''}`);
  if (opt.hasTouch) {
    await p.setInputFiles('#fichier-visuel', join(ROOT, 'brand/99_tests/substitution/PLACEHOLDER_art-pop.jpg')); await p.waitForFunction(() => window.__motion.doc.images.visuel);
    const cdp = await ctx.newCDPSession(p), b = await p.locator('#apercu').boundingBox(), t = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
    const cx = b.x + b.width * 0.8, cy = b.y + b.height * 0.5;
    await t('touchStart', [[cx, cy]]); for (let i = 1; i <= 5; i++) await t('touchMove', [[cx - i * 6, cy]]); await t('touchEnd', []);
    await t('touchStart', [[cx - 25, cy], [cx + 25, cy]]); for (let i = 1; i <= 6; i++) await t('touchMove', [[cx - 25 - i * 6, cy], [cx + 25 + i * 6, cy]]); await t('touchEnd', []);
    const im = await p.evaluate(() => window.__motion.doc.images.visuel);
    ok(im.dx < 0 && im.zoom > 1.2, `${nom} : glisser au doigt recadre l'illustration (dx ${im.dx.toFixed(3)}), pincer zoome (×${im.zoom.toFixed(2)})`);
  }
  await p.screenshot({ path: join(OUT, `motion-${nom}.png`) });
  ok(!err.length, `${nom} : aucune erreur JavaScript${err.length ? ' · ' + err.join(' | ') : ''}`);
  await ctx.close();
}
await browser.close(); srv.close();
fin();
function fin() { const ko = res.filter((c) => !c).length; console.log(ko ? `\n${ko} test(s) en échec sur ${res.length}.` : `\n${res.length} tests Motion Studio réussis.`); process.exit(ko ? 1 : 0); }
