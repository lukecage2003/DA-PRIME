// Primestone · tests de bout en bout de l'Atelier dans Chromium (Playwright). Appareils ÉMULÉS, pas physiques.
// Usage : node tools/test-atelier.mjs [dossier-captures]
import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = process.argv[2] || join(tmpdir(), 'primestone-tests'); mkdirSync(OUT, { recursive: true });
const { chromium } = createRequire(import.meta.url)('playwright');
const { demarrer } = await import(pathToFileURL(join(ROOT, 'tools/serve.mjs')));
const { FAMILLES, KIOSQUE, INFOGRAPHIES } = await import(pathToFileURL(join(ROOT, 'templates/_systeme/moteur.js')));
const PORT = 4198, URL0 = `http://localhost:${PORT}/atelier/`;
const srv = await demarrer(PORT);
const res = []; const ok = (c, m) => { res.push([c, m]); console.log(`  ${c ? 'ok' : 'KO'}  ${m}`); };
const browser = await chromium.launch();
const erreurs = (p) => { const e = []; p.on('pageerror', (x) => e.push(x.message)); p.on('console', (m) => m.type() === 'error' && e.push(m.text())); return e; };
const pngDims = (b) => [b.readUInt32BE(16), b.readUInt32BE(20)];
const jpgDims = (b) => { for (let i = 2; i < b.length;) { const m = b[i + 1], l = b.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xc3) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; i += 2 + l; } };
const etat = (p) => p.evaluate(() => JSON.parse(JSON.stringify(window.__atelier.etat, (k, v) => (k === 'href' && String(v).startsWith('data:') ? 'data:…' : v))));

// Image de test lourde (4000 × 3000) générée dans le navigateur, pour vérifier la réduction à l'import
async function grandeImage(p) {
  const b64 = await p.evaluate(async () => { const c = Object.assign(document.createElement('canvas'), { width: 4000, height: 3000 }); const g = c.getContext('2d');
    const gr = g.createLinearGradient(0, 0, 4000, 3000); gr.addColorStop(0, '#2255aa'); gr.addColorStop(1, '#aa3322'); g.fillStyle = gr; g.fillRect(0, 0, 4000, 3000);
    return (await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.9)).then((b) => b.arrayBuffer()).then((a) => btoa(String.fromCharCode(...new Uint8Array(a))))); });
  const f = join(OUT, 'grande-4000x3000.jpg'); writeFileSync(f, Buffer.from(b64, 'base64')); return f;
}

// ---------- 1. Bureau (Windows 1920 × 1080, souris) ----------
{
  const ctx = await browser.newContext({ viewport: { width: 1920, height: 1080 }, acceptDownloads: true });
  const p = await ctx.newPage(); const err = erreurs(p);
  await p.goto(URL0); await p.waitForSelector('#apercu svg');
  ok((await p.getAttribute('#apercu svg', 'viewBox')) === '0 0 1280 720', 'aperçu : SVG 1280 × 720');
  // Toutes les familles et variantes : rendu sans erreur bloquante avec les images de substitution
  let n = 0, bloq = [];
  for (const [fid, f] of Object.entries(FAMILLES)) {
    await p.getByRole('button', { name: `${fid.slice(0, 2)} · ${f.nom}` }).click();
    for (const v of Object.values(f.variantes)) {
      await p.locator('#variantes button', { hasText: v.nom }).click(); await p.waitForTimeout(40); n++;
      const e = await p.locator('#alertes li[data-niveau="erreur"]').allTextContents(); if (e.length) bloq.push(`${fid}/${v.nom} : ${e.join(' ; ')}`);
    }
  }
  ok(!bloq.length, `${n} variantes rendues sans erreur bloquante${bloq.length ? ' · ' + bloq.join(' | ') : ''}`);
  await p.locator('#familles button').first().click(); await p.locator('#variantes button').first().click();
  // Contrôles de lisibilité et de débordement
  await p.fill('#champ-titre', 'Pourquoi Superman reste le plus grand héros de tous les temps');
  await p.waitForTimeout(60); const al = (await p.locator('#alertes').innerText());
  ok(/mots/.test(al) && /(déborde|capitales de)/.test(al), 'titre trop long : alertes « mots » et débordement ou lisibilité affichées');
  await p.fill('#champ-titre', "L'Espoir"); await p.waitForTimeout(60);
  ok(!/(déborde|mots\.)/.test(await p.locator('#alertes').innerText()), 'titre court : plus d\'alerte de longueur');
  // Import : PNG transparent puis grande image réduite
  await p.setInputFiles('#fichier-personnage', join(ROOT, 'brand/99_tests/substitution/PLACEHOLDER_art-encre.png'));
  await p.waitForFunction(() => !window.__atelier.etat.donnees.personnage.placeholder);
  ok((await etat(p)).donnees.personnage.nom === 'PLACEHOLDER_art-encre.png', 'import d\'un PNG transparent');
  await p.setInputFiles('#fichier-personnage', await grandeImage(p));
  await p.waitForFunction(() => window.__atelier.etat.donnees.personnage.nom === 'grande-4000x3000.jpg');
  const g = (await etat(p)).donnees.personnage; ok(Math.max(g.w, g.h) === 3000, `grande image réduite à l'import : ${g.w} × ${g.h}`);
  await p.setInputFiles('#fichier-personnage', join(ROOT, 'brand/99_tests/substitution/PLACEHOLDER_art-encre.png'));
  await p.waitForFunction(() => window.__atelier.etat.donnees.personnage.nom === 'PLACEHOLDER_art-encre.png');
  // Recadrage souris : glisser et molette
  const bx = await p.locator('#apercu').boundingBox();
  await p.mouse.move(bx.x + bx.width * 0.7, bx.y + bx.height * 0.5); await p.mouse.down(); await p.mouse.move(bx.x + bx.width * 0.6, bx.y + bx.height * 0.45, { steps: 6 }); await p.mouse.up();
  let s = (await etat(p)).donnees.personnage; ok(s.dx < -0.05 && s.dy < 0, `glisser à la souris : déplacement (dx ${s.dx.toFixed(3)}, dy ${s.dy.toFixed(3)})`);
  await p.mouse.wheel(0, -300); await p.waitForTimeout(50);
  s = (await etat(p)).donnees.personnage; ok(s.zoom > 1.2, `molette : zoom ${s.zoom.toFixed(2)}`);
  // Exports
  const dl = async (type) => { const [d] = await Promise.all([p.waitForEvent('download'), p.click(`[data-export="${type}"]`)]); const f = join(OUT, d.suggestedFilename()); await d.saveAs(f); return f; };
  const pngF = await dl('png'); const png = readFileSync(pngF); ok(png[1] === 0x50 && pngDims(png).join('×') === '1280×720', `export PNG : ${pngDims(png).join(' × ')}, ${(png.length / 1024).toFixed(0)} Ko`);
  const jpgF = await dl('jpg'); const jpg = readFileSync(jpgF); ok(jpg[0] === 0xff && jpgDims(jpg).join('×') === '1280×720' && jpg.length <= 2 * 1024 * 1024, `export JPG : ${jpgDims(jpg).join(' × ')}, ${(jpg.length / 1024).toFixed(0)} Ko (≤ 2 Mo)`);
  const svgF = await dl('svg'); const svg = readFileSync(svgF, 'utf8');
  ok(svg.startsWith('<svg') && !/href="(?!data:)/.test(svg) && /@font-face/.test(svg), `export SVG autonome : aucune ressource externe, polices intégrées, ${(svg.length / 1024).toFixed(0)} Ko`);
  // Sauvegarde : textes, image importée et recadrage retrouvés après rechargement
  await p.fill('#champ-titre', 'Héritage'); await p.waitForTimeout(500);
  const avantR = (await etat(p)).donnees.personnage; await p.reload(); await p.waitForSelector('#apercu svg');
  const apresR = await etat(p);
  ok(apresR.donnees.titre === 'Héritage' && apresR.donnees.personnage.nom === avantR.nom && Math.abs(apresR.donnees.personnage.zoom - avantR.zoom) < 1e-9 && apresR.donnees.personnage.href === 'data:…',
    'brouillon retrouvé après rechargement (titre, image importée, zoom et position)');
  writeFileSync(join(OUT, 'fichiers-exportes.json'), JSON.stringify({ png: pngF, jpg: jpgF, svg: svgF }));
  await p.screenshot({ path: join(OUT, 'ecran-windows-1920.png') });
  ok(!err.length, `aucune erreur JavaScript${err.length ? ' · ' + err.join(' | ') : ''}`);
  // ---- Kiosque : édition individuelle des diapositives ----
  const vb = () => p.getAttribute('#apercu svg', 'viewBox');
  const erreursAffichees = () => p.locator('#alertes li[data-niveau="erreur"]').allTextContents();
  await p.getByRole('button', { name: 'Kiosque', exact: true }).click(); await p.waitForFunction(() => window.__atelier.etat.coll === 'kiosque');
  let kn = 0, kb = [];
  for (const [i, [id, g]] of Object.entries(KIOSQUE).entries()) {
    await p.locator('#familles button').nth(i).click(); await p.waitForFunction((x) => window.__atelier.etat.fam === x, id);
    for (const v of Object.values(g.variantes)) { await p.locator('#variantes button', { hasText: v.nom }).click(); await p.waitForTimeout(40); kn++;
      if ((await vb()) !== '0 0 1080 1350' || (await erreursAffichees()).length) kb.push(`${id}/${v.nom}`); }
  }
  ok(!kb.length, `Kiosque : ${kn} diapositives éditables, 1080 × 1350, sans erreur${kb.length ? ' · ' + kb.join(', ') : ''}`);
  const ap = await p.locator('#apercu').boundingBox(); ok(Math.abs(ap.width / ap.height - 0.8) < 0.01, `Kiosque : aperçu aux proportions 4:5 (${Math.round(ap.width)} × ${Math.round(ap.height)})`);
  await p.locator('#familles button').nth(2).click(); await p.waitForSelector('#champ-corps');
  ok((await p.evaluate(() => document.querySelector('#champ-corps').tagName)) === 'TEXTAREA', 'Kiosque : texte long saisi dans une zone multiligne');
  await p.fill('#champ-corps', 'Texte beaucoup trop long pour la diapositive. '.repeat(40)); await p.waitForTimeout(60);
  ok((await erreursAffichees()).some((t) => /déborde/.test(t)), 'Kiosque : débordement du texte long signalé');
  await p.locator('#familles button').nth(6).click(); await p.waitForSelector('#fichier-personnage', { state: 'attached' });
  await p.setInputFiles('#fichier-personnage', join(ROOT, 'brand/99_tests/substitution/PLACEHOLDER_art-encre.png'));
  await p.waitForFunction(() => window.__atelier.etat.donnees.personnage?.nom === 'PLACEHOLDER_art-encre.png');
  const kp = readFileSync(await dl('png')); ok(pngDims(kp).join('×') === '1080×1350', `Kiosque : fiche personnage avec image importée, export PNG ${pngDims(kp).join(' × ')}`);
  // ---- Infographies : données JSON validées ----
  await p.getByRole('button', { name: 'Infographies', exact: true }).click(); await p.waitForFunction(() => window.__atelier.etat.coll === 'infographies');
  await p.locator('#familles button').nth(0).click(); await p.waitForSelector('#champ-donnees');
  ok((await vb()) === '0 0 1920 1080' && !(await erreursAffichees()).length, 'Infographies : chronologie d’exemple, 1920 × 1080, sans erreur');
  await p.fill('#champ-donnees', '{ "type": "chronologie", '); await p.waitForFunction(() => /JSON invalide/.test(document.querySelector('#alertes').innerText), null, { timeout: 5000 }).catch(() => {});
  ok((await erreursAffichees()).some((t) => /JSON invalide/.test(t)) && /données invalides/i.test(await p.locator('#apercu').innerText()), 'Infographies : JSON mal formé signalé, aperçu d’erreur');
  const un = JSON.stringify({ type: 'chronologie', titre: 'Test', periodes: [{ nom: 'Seule', debut: 1990, fin: 1980 }], couleur: 'x' });
  await p.fill('#champ-donnees', un); await p.waitForTimeout(60); const eu = (await erreursAffichees()).join(' | ');
  ok(/periodes : 1 élément/.test(eu) && /couleur : champ inconnu/.test(eu), `Infographies : erreurs de structure localisées (${(await erreursAffichees()).length} erreurs)`);
  await p.setInputFiles('#fichier-donnees', join(ROOT, 'data/infographies/barres-records-ventes.json')); await p.waitForTimeout(80);
  ok((await erreursAffichees()).some((t) => /attend le type « chronologie »/.test(t)), 'Infographies : fichier d’un autre type refusé par le gabarit');
  await p.getByRole('button', { name: 'Exemple' }).click(); await p.waitForTimeout(60);
  ok(!(await erreursAffichees()).length, 'Infographies : retour à l’exemple valide');
  await p.locator('#familles button').nth(1).click(); await p.waitForSelector('#fichier-donnees', { state: 'attached' });
  await p.setInputFiles('#fichier-donnees', join(ROOT, 'data/infographies/barres-records-ventes.json')); await p.waitForTimeout(80);
  ok(!(await erreursAffichees()).length, 'Infographies : import d’un fichier .json valide (barres)');
  const ij = readFileSync(await dl('jpg')); ok(jpgDims(ij).join('×') === '1920×1080', `Infographies : export JPG ${jpgDims(ij).join(' × ')}`);
  const [dj] = await Promise.all([p.waitForEvent('download'), p.getByRole('button', { name: 'Exporter .json' }).click()]);
  const fj = join(OUT, dj.suggestedFilename()); await dj.saveAs(fj);
  ok(JSON.parse(readFileSync(fj, 'utf8')).barres.length === 3 && fj.endsWith('.json'), 'Infographies : export des données JSON');
  // Retour aux miniatures : la dernière création de la collection est retrouvée
  await p.getByRole('button', { name: 'Miniatures YouTube', exact: true }).click(); await p.waitForFunction(() => window.__atelier.etat.coll === 'miniatures');
  const rm = await etat(p); ok(rm.fam === '01-analyse-personnage' && rm.donnees.titre === 'Héritage' && (await vb()) === '0 0 1280 720', 'retour aux miniatures : brouillon et format 16:9 retrouvés');
  ok(!err.length, `aucune erreur JavaScript sur les trois supports${err.length ? ' · ' + err.join(' | ') : ''}`);
  // Hors ligne : après installation du service worker, l'Atelier se recharge sans réseau
  await p.evaluate(() => navigator.serviceWorker.ready); await p.reload(); await p.waitForSelector('#apercu svg');
  await ctx.setOffline(true); await p.reload(); await p.waitForSelector('#apercu svg', { timeout: 5000 }).catch(() => {});
  const off = await p.locator('#apercu svg').count(); ok(off === 1, 'hors ligne : l\'Atelier se recharge et rend la miniature');
  await ctx.setOffline(false); await ctx.close();
}

// ---------- 2. Tactile : Galaxy S25 et iPad Air M2 émulés ----------
for (const [nom, opt] of [
  ['galaxy-s25', { viewport: { width: 384, height: 832 }, deviceScaleFactor: 2.8125, isMobile: true, hasTouch: true }],
  ['ipad-m2-portrait', { viewport: { width: 820, height: 1180 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
  ['ipad-m2-paysage', { viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true }],
  ['windows-1366', { viewport: { width: 1366, height: 768 } }],
]) {
  const ctx = await browser.newContext(opt); const p = await ctx.newPage(); const err = erreurs(p);
  await p.goto(URL0); await p.waitForSelector('#apercu svg');
  const m = await p.evaluate(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth, ap: document.querySelector('#apercu').getBoundingClientRect().width, cibles: [...document.querySelectorAll('button, input[type=text]')].filter((e) => e.offsetParent && e.getBoundingClientRect().height < 44).length }));
  ok(m.sw <= m.iw && m.ap > 0, `${nom} : pas de défilement horizontal (${m.sw} ≤ ${m.iw} px), aperçu de ${Math.round(m.ap)} px`);
  ok(m.cibles === 0, `${nom} : cibles tactiles d'au moins 44 px`);
  const rz = await p.evaluate(() => { const r = document.querySelector('#resume').getBoundingClientRect(); return { b: r.bottom, ih: innerHeight, t: document.querySelector('#resume').textContent }; });
  ok(rz.b <= rz.ih, `${nom} : résumé des contrôles visible sans défiler (« ${rz.t} »)`);
  if (nom === 'galaxy-s25' || nom === 'ipad-m2-portrait') {
    await p.getByRole('button', { name: 'Kiosque', exact: true }).click(); await p.waitForFunction(() => window.__atelier.etat.coll === 'kiosque');
    const k = await p.evaluate(() => ({ h: document.querySelector('#apercu').getBoundingClientRect().height, ih: innerHeight, sw: document.documentElement.scrollWidth, iw: innerWidth }));
    ok(k.h <= k.ih * 0.5 + 1 && k.sw <= k.iw, `${nom} : diapositive Kiosque, aperçu limité à ${Math.round((k.h / k.ih) * 100)} % de la hauteur, sans défilement horizontal`);
    await p.getByRole('button', { name: 'Miniatures YouTube', exact: true }).click(); await p.waitForFunction(() => window.__atelier.etat.coll === 'miniatures');
  }
  if (nom === 'galaxy-s25') {
    // Photo de téléphone 600 × 400 avec orientation EXIF 6 (portrait) : doit arriver redressée en 400 × 600
    const f = join(OUT, 'photo-exif-6.jpg');
    spawnSync('python3', ['-c', `from PIL import Image; im=Image.new('RGB',(600,400),(200,40,40)); ex=im.getexif(); ex[274]=6; im.save(r'${f}', exif=ex)`]);
    await p.setInputFiles('#fichier-personnage', f); await p.waitForFunction(() => window.__atelier.etat.donnees.personnage.nom === 'photo-exif-6.jpg');
    const ph = (await etat(p)).donnees.personnage; ok(ph.w === 400 && ph.h === 600, `${nom} : photo avec orientation EXIF importée redressée (${ph.w} × ${ph.h})`);
  }
  if (opt.hasTouch) {
    const cdp = await ctx.newCDPSession(p); const b = await p.locator('#apercu').boundingBox();
    const t = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map(([x, y], i) => ({ x, y, id: i })) });
    const cx = b.x + b.width * 0.7, cy = b.y + b.height * 0.55;
    const avant = (await etat(p)).donnees.personnage;
    await t('touchStart', [[cx, cy]]); for (let i = 1; i <= 5; i++) await t('touchMove', [[cx - i * 8, cy - i * 3]]); await t('touchEnd', []);
    const apres = (await etat(p)).donnees.personnage;
    ok((apres.dx ?? 0) < (avant.dx ?? 0), `${nom} : glisser au doigt déplace l'image (dx ${(apres.dx ?? 0).toFixed(3)})`);
    await t('touchStart', [[cx - 30, cy], [cx + 30, cy]]); for (let i = 1; i <= 6; i++) await t('touchMove', [[cx - 30 - i * 8, cy], [cx + 30 + i * 8, cy]]); await t('touchEnd', []);
    const z = (await etat(p)).donnees.personnage.zoom; ok(z > 1.3, `${nom} : pincer zoome (×${z.toFixed(2)})`);
  }
  await p.screenshot({ path: join(OUT, `ecran-${nom}.png`), fullPage: false });
  ok(!err.length, `${nom} : aucune erreur JavaScript${err.length ? ' · ' + err.join(' | ') : ''}`);
  await ctx.close();
}
await browser.close(); srv.close();
const ko = res.filter(([c]) => !c).length;
console.log(ko ? `\n${ko} test(s) en échec sur ${res.length}.` : `\n${res.length} tests réussis (Chromium, appareils émulés).`);
process.exit(ko ? 1 : 0);
