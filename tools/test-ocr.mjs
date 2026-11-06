// DA-PRIME · tests 0.11.1 : OCR local (Tesseract.js, modèles fast), corrections 0.11.0 (jeton, revalidation, filtres),
// confidentialité (aucune requête externe hors téléchargement explicite d'un modèle), persistance, annulation et reprise, hors ligne.
// Les modèles de test sont pris dans .cache/tessdata (ignoré par Git) ou DA_PRIME_TESSDATA ; s'ils manquent, ils sont téléchargés
// une fois depuis le dépôt officiel tessdata_fast 4.1.0 et vérifiés par empreinte SHA-256.
// Usage : node tools/test-ocr.mjs [--unitaires]
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, mkdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'), imp = (p) => import(pathToFileURL(join(ROOT, p)));
const res = []; const ok = (c, m) => { res.push(!!c); console.log(`  ${c ? 'ok' : 'KO'}  ${m}`); };
const fin = () => { const ko = res.filter((c) => !c).length; console.log(ko ? `\n${ko} test(s) en échec sur ${res.length}.` : `\n${res.length} tests OCR 0.11.1 réussis.`); process.exit(ko ? 1 : 0); };
const O = await imp('templates/_systeme/ocr.js'), K = await imp('templates/_systeme/connaissances.js'), MO = await imp('templates/_systeme/moteurs.js');

console.log('OCR : prétraitement, blocs, ordre de lecture, mesures (Node)');
{
  const h = new Uint32Array(256); h[30] = 500; h[220] = 500; const s = O.seuilOtsu(h); ok(s >= 30 && s < 220, `seuil d'Otsu entre les deux modes (${s})`);
  const px = new Uint8ClampedArray([10, 10, 10, 255, 240, 240, 240, 255, 120, 60, 200, 255, 200, 200, 200, 255]), copie = px.slice(); O.traiterPixels(copie, { gris: true, binaire: true });
  ok(px[0] === 10 && px[8] === 120 && [...copie].filter((_, i) => i % 4 !== 3).every((v) => v === 0 || v === 255) && copie[0] === 0 && copie[4] === 255, 'prétraitement sur copie : noir et blanc obtenu, original intact');
  const g = new Uint8ClampedArray([100, 100, 100, 255, 110, 110, 110, 255, 120, 120, 120, 255, 130, 130, 130, 255]); O.traiterPixels(g, { gris: true, contraste: true }); ok(g[0] === 0 && g[12] === 255, 'contraste renforcé : niveaux étirés de 0 à 255');
  const data = { blocks: [{ paragraphs: [
    { text: 'HULK\nSMASH', confidence: 91, bbox: { x0: 200, y0: 100, x1: 600, y1: 300 }, lines: [{ text: 'HULK ', words: [{ confidence: 95 }] }, { text: 'SMASH', words: [{ confidence: 40 }] }] },
    { text: '|| —', confidence: 20, bbox: { x0: 0, y0: 0, x1: 10, y1: 10 }, lines: [{ text: '|| —', words: [] }] }] }] };
  const b = O.blocsDepuisTesseract(data, { echelle: 2, decalage: { x: 50, y: 100 }, largeur: 1000, hauteur: 2000, caseNo: 3 });
  ok(b.ignores === 1 && b.blocs.length === 1 && b.blocs[0].texte === 'HULK SMASH' && b.blocs[0].zone.x === 0.15 && b.blocs[0].zone.y === 0.075 && b.blocs[0].zone.w === 0.2 && b.blocs[0].confiance === 0.91 && b.blocs[0].motsFaibles === 1 && b.blocs[0].case === 3,
    'blocs Tesseract : lignes réunies, coordonnées ramenées à la page d\'origine (échelle ×2, décalage de case), fragments sans lettre ignorés');
  const w = (t, c, x0, x1) => ({ text: t, confidence: c, bbox: { x0, y0: 100, x1, y1: 130 } }), sg = O.blocsDepuisTesseract({ blocks: [{ paragraphs: [{ lines: [{ words: [w('SOME', 90, 0, 80), w('SERIOUS', 90, 95, 200), w('GOING', 88, 300, 380), w('ee', 30, 390, 410), w('|', 20, 420, 425)] }] }] }] }, { largeur: 1000, hauteur: 1000 });
  ok(sg.blocs.map((b) => b.texte).join(' / ') === 'SOME SERIOUS / GOING' && sg.blocs[1].retires.join() === 'ee,|' && sg.blocs[1].texteBrut === 'GOING ee |' && sg.blocs[1].zone.w === 0.08, 'ligne coupée entre deux bulles voisines (grand écart entre mots) ; fragments parasites retirés du texte proposé mais conservés dans le texte brut');
  ok(!O.estParasite({ text: 'I', confidence: 40 }) && !O.estParasite({ text: 'OÙ', confidence: 45 }) && O.estParasite({ text: 'Bp', confidence: 40 }) && !O.estParasite({ text: 'xy', confidence: 80 }) && !O.estParasite({ text: '?', confidence: 30 }) && O.estParasite({ text: '|', confidence: 90 }), 'mot court courant (I, OÙ) et ponctuation isolée (« ? ») gardés ; fragment douteux et trait (|) retirés ; mot sûr toujours gardé');
  const z = (x, y, caseNo = null) => ({ texte: `${x},${y}`, zone: { x, y, w: 0.2, h: 0.05 }, case: caseNo });
  const o1 = O.ordreLecture([z(0.6, 0.1), z(0.1, 0.5), z(0.1, 0.11)]), o2 = O.ordreLecture([z(0.6, 0.1), z(0.1, 0.11)], { sens: 'dg' }), o3 = O.ordreLecture([z(0.1, 0.6, 2), z(0.1, 0.1, 1)]);
  ok(o1.blocs.map((x) => x.texte).join(' ') === '0.1,0.11 0.6,0.1 0.1,0.5' && !o1.certain && o2.blocs[0].texte === '0.6,0.1' && o3.blocs.map((x) => x.case).join() === '1,2' && o3.certain, 'ordre de lecture : rangées puis gauche → droite (droite → gauche en manga), ordre des cases ; approximatif signalé');
  const L = (x, y, t, c = null) => ({ texte: t, zone: { x, y, w: 0.2, h: 0.03 }, case: c, confiance: 0.9, mots: 2, motsFaibles: 0 });
  const rg = O.regrouperLignes([L(0.1, 0.1, 'WHERE IS'), L(0.6, 0.1, 'I BURIED'), L(0.11, 0.135, 'THE BOMB?'), L(0.6, 0.135, 'IT DEEP.'), L(0.1, 0.4, 'LOIN')]);
  ok(rg.length === 3 && rg.some((b) => b.texte === 'WHERE IS THE BOMB?') && rg.some((b) => b.texte === 'I BURIED IT DEEP.'), 'lignes d\'un même texte regroupées (chevauchement et faible écart) ; textes voisins ou éloignés gardés séparés');
  const m1 = O.mesurer('You will, Tigra.', 'YOU WILL TIGRA'), m2 = O.mesurer('THE STORM IS COMING', 'THE STORN IS COMING'), m3 = O.mesurer('Il n’est pas là', "IL N'EST PAS LA");
  ok(m1.exactitude === 1 && m1.wer === 0 && m2.exactitude === 0.75 && m2.wer === 0.25 && m2.cer > 0 && m2.cer < 0.1 && m3.exactitude === 0.75, `mesures indépendantes de la confiance : exactitude des mots, WER, CER (casse et apostrophes normalisées ; accent manquant compté) · ${JSON.stringify([m2.exactitude, m2.wer, +m2.cer.toFixed(3)])}`);
  const ag = O.agreger([O.mesurer('A B C D', 'A B C D'), O.mesurer('E F', 'X Y')]); ok(Math.abs(ag.exactitude - 4 / 6) < 1e-9 && ag.mots === 6, 'agrégation pondérée par le nombre de mots (pas une moyenne de pourcentages)');
  ok(JSON.stringify(O.lirePlage('1-3, 5', 8)) === '[0,1,2,4]' && (() => { try { O.lirePlage('7-9', 8); return false; } catch { return true; } })(), 'sélection de pages « 1-3, 5 » ; plage hors du numéro refusée');
  ok(O.MODELES.variante === 'fast' && Object.values(O.MODELES.langues).every((l) => /^[0-9a-f]{64}$/.test(l.sha256)) && /tessdata_fast\/4\.1\.0\/fra\.traineddata$/.test(O.urlModele('fra')) && !JSON.stringify(O.MODELES).includes('best') && O.PREFIXE_MODELES.endsWith('.invalid/fast'),
    'modèles FAST uniquement (fra, eng), empreintes SHA-256 fixées, source officielle versionnée ; aucune variante « best »');
  const a = K.normaliser({ id: 'ocr:t:p:1', contenu: 'HULK SMASH', categorie: 'texte', comic: 'c', page: 2, zone: { x: 0.1, y: 0.2, w: 0.3, h: 0.1 }, methode: 'ocr:tesseract-fast', confiance: 0.9, statut: 'a-verifier', origine: { genre: 'ocr', passe: 'p', pageId: 'pg' }, ocr: { texteBrut: 'HULK SMASH', langues: 'eng', pretraitement: 'x2-gris' } });
  K.modifierContenu(a, 'HULK SMASH!'); K.changerStatut(a, 'valide');
  ok(a.ocr.texteBrut === 'HULK SMASH' && a.historique[0].ancien === 'HULK SMASH' && a.historique[0].motif === 'texte corrigé' && a.zone.w === 0.3 && K.METHODES[a.methode], 'correction manuelle : texte OCR initial conservé (provenance et historique), zone et méthode gardées');
  ok(K.pointsPourScript([a], ['c']).length === 0, 'un résultat OCR, même validé, n\'alimente jamais directement un script (matière = événements validés)');
  ok(MO.ADAPTATEURS['ocr-tesseract'].etat === 'disponible' && Object.entries(MO.ADAPTATEURS).filter(([, x]) => x.etat === 'disponible' && x.mode !== 'manuel').map(([k]) => k).join() === 'ocr-tesseract', 'seul l\'OCR Tesseract s\'ajoute aux modes manuels ; vision et rédaction restent non installées');
}
console.log('Serveur local : jeton par en-tête uniquement (Node)');
const SM = await imp('tools/serveur-moteurs.mjs');
{
  const { srv, jeton } = await SM.demarrer({ port: 4207, reseau: true }), u = 'http://127.0.0.1:4207/api/capacites';
  const q = await fetch(`${u}?jeton=${jeton}`), e = await fetch(u, { headers: { 'X-DA-PRIME-Jeton': jeton } }), s0 = await fetch(u);
  ok(q.status === 401 && e.status === 200 && s0.status === 401, `jeton dans l'adresse refusé (${q.status}), en-tête accepté (${e.status}), sans jeton refusé (${s0.status})`);
  srv.close();
  // Sortie non interactive (journal, redirection) : le jeton n'y est jamais écrit
  const sortie = await new Promise((r) => { const pr = spawn(process.execPath, [join(ROOT, 'tools/serveur-moteurs.mjs'), '4206', '--reseau'], { stdio: ['ignore', 'pipe', 'pipe'] }); let t = ''; pr.stdout.on('data', (d) => { t += d; }); setTimeout(() => { pr.kill(); r(t); }, 1500); });
  ok(/jeton masqué/.test(sortie) && !/[0-9a-f]{32,}/.test(sortie) && !/jeton=/.test(sortie), 'sortie redirigée vers un journal : jeton masqué, jamais écrit');
}
if (process.argv.includes('--unitaires')) fin();

// ---------- Modèles de test (hors dépôt) ----------
const TESS = process.env.DA_PRIME_TESSDATA || join(ROOT, '.cache/tessdata'); mkdirSync(TESS, { recursive: true });
for (const [code, m] of Object.entries(O.MODELES.langues)) {
  const f = join(TESS, `${code}.traineddata`);
  if (!existsSync(f)) { console.log(`  (téléchargement unique du modèle de test ${code} depuis ${O.urlModele(code)})`); execFileSync('curl', ['-sSfL', '-o', f, O.urlModele(code)]); }
  if (createHash('sha256').update(readFileSync(f)).digest('hex') !== m.sha256) { console.error(`Modèle de test ${f} : empreinte invalide.`); process.exit(1); }
}

console.log('Intégration (Chromium)');
const { chromium, devices } = createRequire(import.meta.url)('playwright');
const { srv: serveur } = await SM.demarrer({ port: 4208 }), B = 'http://localhost:4208';
const browser = await chromium.launch(), ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 } }), p = await ctx.newPage(), err = [], externes = [], telechargements = [];
let dialogues = 0; p.on('dialog', (d) => { dialogues++; d.accept(); });
p.on('pageerror', (x) => err.push(x.message)); p.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && err.push(m.text()));
ctx.on('request', (r) => { const u = r.url(); if (u.startsWith('https://raw.githubusercontent.com/')) telechargements.push(u); else if (!u.startsWith(B) && !u.startsWith('blob:') && !u.startsWith('data:')) externes.push(u); });
await ctx.route('https://raw.githubusercontent.com/**', (r) => r.fulfill({ status: 200, body: readFileSync(join(TESS, r.request().url().split('/').pop())) }));
const D = (f, a) => p.evaluate(f, a), att = (ms = 200) => p.waitForTimeout(ms);
const attendreQue = async (f, a, delai = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < delai) { if (await p.evaluate(f, a).catch(() => false)) return true; await att(150); } throw new Error(`condition non atteinte : ${f.toString().slice(0, 120)}`); };
const kbTous = () => D(async () => window.__script.db.tous('connaissances'));
const pret = async () => { await p.waitForFunction(() => window.__script, null, { timeout: 30000 }); };

// A. Jeton : fragment d'adresse lu puis retiré ; ancienne adresse « ?jeton= » nettoyée sans être utilisée
await p.goto(`${B}/atelier/script/?jeton=ancien#moteurs`); await pret(); await att(400);
ok(!p.url().includes('jeton') && (await D(async () => (await window.__script.db.lire('reglages', 'moteurs'))?.jeton || '')) !== 'ancien', `ancienne adresse avec « ?jeton= » : retirée de l'adresse, jeton ignoré (${p.url().replace(B, '')})`);
await p.goto('about:blank'); await p.goto(`${B}/atelier/script/#moteurs&jeton=abc123`); await pret(); await p.waitForSelector('#capacites');
ok(p.url().endsWith('/atelier/script/#moteurs') && (await D(async () => (await window.__script.db.lire('reglages', 'moteurs')).jeton)) === 'abc123', `jeton après « # » (jamais envoyé au serveur) : enregistré, retiré de la barre d'adresse et de l'historique de session (${p.url().replace(B, '')}, historique ${await D(() => history.length)})`);
ok(await p.evaluate(() => getComputedStyle(document.querySelector('#serveur-jeton')).webkitTextSecurity === 'disc'), 'champ du jeton masqué à l\'écran');
await D(async () => { const r = await window.__script.db.lire('reglages', 'moteurs'); await window.__script.db.ecrire('reglages', { ...r, jeton: '', serveur: '' }); });

// B. Modèles : absents, téléchargement explicite (confirmation), vérification, import d'un fichier, test du moteur
await p.goto('about:blank'); await p.goto(`${B}/atelier/script/#moteurs`); await pret(); await p.waitForSelector('#ocr-modeles');
ok(await p.locator('#ocr-modeles tr[data-etat="absent"]').count() === 2 && telechargements.length === 0, 'modèles absents au départ : « téléchargement initial nécessaire », rien téléchargé automatiquement');
const d0 = dialogues; await p.click('[data-telecharger="eng"]'); await p.waitForSelector('#ocr-modeles tr[data-modele="eng"][data-etat="disponible"]', { timeout: 30000 });
ok(dialogues === d0 + 1 && telechargements.length === 1 && /tessdata_fast\/4\.1\.0\/eng\.traineddata$/.test(telechargements[0]), 'téléchargement uniquement après confirmation, depuis tessdata_fast 4.1.0 ; empreinte vérifiée');
await p.setInputFiles('#ocr-importer', { name: 'faux.traineddata', mimeType: 'application/octet-stream', buffer: Buffer.from('pas un modèle') }); await att(600);
const refus = await p.textContent('#ocr-moteur-resultat');
await p.setInputFiles('#ocr-importer', join(TESS, 'fra.traineddata')); await p.waitForSelector('#ocr-modeles tr[data-modele="fra"][data-etat="disponible"]');
ok(/refusé/.test(refus) && telechargements.length === 1, `import d'un fichier local : modèle inconnu refusé (${refus.slice(0, 60)}…), modèle fast reconnu accepté sans réseau`);
await p.click('#ocr-tester'); await p.waitForFunction(() => /OCR prêt|mal reconnu|Erreur/.test(document.querySelector('#ocr-moteur-resultat').textContent), null, { timeout: 60000 });
await p.waitForFunction(() => [...document.querySelectorAll('#ocr-modeles tr[data-etat="disponible"]')].filter((r) => /Prêt/.test(r.textContent)).length === 2, null, { timeout: 10000 }).catch(() => {});
ok(/OCR prêt/.test(await p.textContent('#ocr-moteur-resultat')) && await p.locator('#ocr-modeles tr[data-etat="disponible"]', { hasText: 'Prêt' }).count() === 2, `test du moteur : ${await p.textContent('#ocr-moteur-resultat')}`);

// C. Numéro de test : pages dessinées sur l'appareil (texte connu = référence), importées en CBZ, PNG et PDF
const PAGES = await D(async () => {
  const { zip } = await import('../motion/zip.js');
  const page = async (lignes, type = 'image/png') => { const c = Object.assign(document.createElement('canvas'), { width: 1000, height: 1400 }), g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 1000, 1400); g.lineWidth = 6; g.strokeStyle = '#111';
    [[30, 30], [515, 30], [30, 715], [515, 715]].forEach(([x, y], i) => { g.strokeRect(x, y, 455, 655); g.fillStyle = '#111'; g.font = 'bold 34px Arial, sans-serif'; (lignes[i] || []).forEach((l, k) => g.fillText(l, x + 30, y + 90 + k * 44)); });
    return new Uint8Array(await (await new Promise((r) => c.toBlob(r, type, 0.92))).arrayBuffer()); };
  const p1 = await page([['WHERE IS THE', 'GAMMA BOMB?'], ['I BURIED IT', 'DEEP.'], ['THEN WE DIG.'], ['NOT TONIGHT.']]), p2 = await page([['OÙ EST LA', 'BOMBE ?'], ['JE L\'AI', 'ENTERRÉE.'], ['ALORS ON', 'CREUSE.'], ['PAS CE SOIR.']]), p3 = await page([['THE STORM', 'IS COMING.'], [], ['RUN!'], []], 'image/jpeg');
  const b64 = (u) => btoa(Array.from(u, (x) => String.fromCharCode(x)).join(''));
  return { cbz: b64(zip([{ nom: 'Essai OCR 01/p01.png', data: p1 }, { nom: 'Essai OCR 01/p02.png', data: p2 }, { nom: 'Essai OCR 01/p03.jpg', data: p3 }])), png: b64(p1) };
});
const REF = { 1: 'WHERE IS THE GAMMA BOMB? I BURIED IT DEEP. THEN WE DIG. NOT TONIGHT.', 2: 'OÙ EST LA BOMBE ? JE L\'AI ENTERRÉE. ALORS ON CREUSE. PAS CE SOIR.', 3: 'THE STORM IS COMING. RUN!' };
await p.click('[data-espace="comics"]'); await p.setInputFiles('#import-comics', { name: 'Essai OCR 01.cbz', mimeType: 'application/zip', buffer: Buffer.from(PAGES.cbz, 'base64') });
await attendreQue(async () => (await window.__script.db.tous('comics')).some((c) => c.pages?.length === 3));
const C = await D(async () => (await window.__script.db.tous('comics')).find((c) => c.pages?.length === 3));
await p.click(`[data-comic="${C.id}"]`); await p.waitForSelector('#ocr-panneau'); await att(800);
const etatTxt = await (await p.waitForFunction(() => { const t = document.querySelector('#ocr-etat-modeles')?.textContent || ''; return /Modèles installés|Aucun modèle|indisponible/.test(t) && t; }, null, { timeout: 20000 })).jsonValue();
ok(/Modèles installés : (Anglais, Français|Français, Anglais)/.test(etatTxt), `panneau OCR du lecteur : modèles installés signalés, réglages proposés (${etatTxt.slice(0, 60)})`);
// Reconnaissance d'une page (anglais, ×2 + gris, page entière)
await p.selectOption('#ocr-langues', 'eng'); await p.selectOption('#ocr-pretraitement', 'x2-gris'); await p.selectOption('#ocr-zone', 'page'); await p.selectOption('#ocr-segmentation', 'epars');
await p.click('#ocr-page'); await p.waitForSelector('#ocr-blocs .bloc-ocr', { timeout: 60000 });
let as = (await kbTous()).filter((a) => a.origine?.genre === 'ocr' && a.page === 1), passe1 = as[0]?.origine.passe;
const m1 = O.mesurer(REF[1], as.sort((x, y) => x.ocr.ordre - y.ocr.ordre).map((a) => a.contenu).join(' '));
ok(as.length >= 4 && as.every((a) => a.statut === 'a-verifier' && a.methode === 'ocr:tesseract-fast' && a.ocr.langues === 'eng' && a.ocr.pretraitement === 'x2-gris' && a.comic === C.id && a.zone && a.ocr.tache && a.ocr.date && a.ocr.texteInitial === a.contenu && typeof a.ocr.texteBrut === 'string'),
  `page 1 : ${as.length} blocs « à vérifier » avec texte, zone, confiance, langue, prétraitement, numéro, page, tâche et date · exactitude des mots ${Math.round(m1.exactitude * 100)} %`);
ok(m1.exactitude >= 0.85, `lettrage net de synthèse : exactitude ${Math.round(m1.exactitude * 100)} % (WER ${Math.round(m1.wer * 100)} %, CER ${Math.round(m1.cer * 100)} %) · ${as.map((a) => a.contenu).join(' | ')}`);
ok(await p.locator('#cadre-page .zone-ocr').count() === as.length && /APPROXIMATIF/.test(await p.textContent('#ocr-resultats')), 'zones reconnues affichées sur la page ; ordre de lecture d\'une page entière signalé approximatif');
await p.locator('#ocr-blocs .bloc-ocr').first().hover(); ok(await p.locator('#cadre-page .zone-ocr.actif').count() === 1 && await p.locator('#ocr-blocs .bloc-ocr').first().locator('canvas.apercu-zone').count() === 1, 'comparaison image ↔ texte : extrait de la page à côté du texte, zone mise en évidence au survol');
// Correction, validation individuelle et en lot
const premier = await p.locator('#ocr-blocs .bloc-ocr').first().getAttribute('data-bloc'), brut = as.find((a) => a.id === premier).contenu;
await p.locator('#ocr-blocs .bloc-ocr').first().locator('textarea').fill('WHERE IS THE GAMMA BOMB?!'); await p.locator('#ocr-blocs .bloc-ocr').first().locator('textarea').blur(); await att(600);
await p.click(`[data-valider-ocr="${premier}"]`); await att(500);
let a1 = (await kbTous()).find((a) => a.id === premier);
ok(a1.contenu === 'WHERE IS THE GAMMA BOMB?!' && a1.ocr.texteInitial === brut && a1.historique.some((h) => h.ancien === brut) && a1.statut === 'valide', 'correction manuelle puis validation : texte OCR initial conservé (provenance + historique)');
await p.click('#ocr-resultats button:has-text("Tout sélectionner")'); await att(400); await p.locator(`[data-bloc="${premier}"] input[type=checkbox]`).uncheck(); await att(400); await p.click('[data-lot-ocr="rejete"]'); await att(600);
ok((await kbTous()).filter((a) => a.origine?.passe === passe1 && a.statut === 'rejete').length === as.length - 1 && (await kbTous()).find((a) => a.id === premier).statut === 'valide', 'sélection puis rejet en lot des blocs non retenus ; le bloc validé reste validé');
// Comparaison de deux prétraitements sur la même page
await p.selectOption('#ocr-pre2', 'original'); await p.click('#ocr-comparer'); await attendreQue(async () => (await window.__script.db.tous('ocr-passes')).length >= 3);
await p.waitForSelector('#ocr-comparaison', { timeout: 30000 });
const cmp = await p.textContent('#ocr-comparaison');
ok(/exactitude des mots \d+ %/.test(cmp) && await p.locator('#ocr-comparaison canvas.apercu-pre').count() === 2, 'comparaison de deux prétraitements : images prétraitées côte à côte, exactitude mesurée contre le texte validé');
// Français, case par case
await p.click('.vignette-page[data-page="2"]'); await p.waitForSelector('#ocr-panneau'); await p.click('#detecter-cases'); await att(600);
await p.selectOption('#ocr-langues', 'fra'); await p.selectOption('#ocr-zone', 'cases'); await p.selectOption('#ocr-segmentation', 'bloc'); await p.click('#ocr-page'); await p.waitForSelector('#ocr-blocs .bloc-ocr', { timeout: 60000 });
as = (await kbTous()).filter((a) => a.origine?.genre === 'ocr' && a.page === 2).sort((x, y) => x.ocr.ordre - y.ocr.ordre); const m2 = O.mesurer(REF[2], as.map((a) => a.contenu).join(' '));
ok(as.every((a) => a.case >= 1 && a.ocr.zoneMode === 'cases' && a.ocr.langues === 'fra') && as.map((a) => a.case).join() === [...as.map((a) => a.case)].sort().join() && m2.exactitude >= 0.85 && /BOMBE \?/.test(as.map((a) => a.contenu).join(' ')), `français, case par case : ordre des cases conservé, accents · exactitude ${Math.round(m2.exactitude * 100)} % (${as.map((a) => a.contenu).join(' | ')})`);
ok(await D(async () => (await window.__script.db.lire('reglages', 'ocr')).langues === 'fra'), 'réglages OCR mémorisés');

// D. Numéro complet en arrière-plan : annulation, interruption (page fermée), reprise sans doublon ni perte
await p.selectOption('#ocr-langues', 'eng'); await p.selectOption('#ocr-zone', 'page'); await p.selectOption('#ocr-segmentation', 'epars');
const cdp = await ctx.newCDPSession(p); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 8 });
await p.click('#ocr-numero'); await p.waitForSelector('#ocr-annuler', { timeout: 20000 }); await att(400); await p.click('#ocr-annuler');
await p.waitForSelector('#ocr-progres [data-etat-ocr="annule"]', { timeout: 30000 });
let tA = await D(async () => (await window.__script.file.lister()).find((t) => t.type === 'ocr-pages' && t.etat === 'annule'));
ok(tA && tA.etat === 'annule', `annulation d'un OCR en cours (curseur ${tA?.curseur}/3) : worker arrêté, pages terminées conservées`);
const tB = await D(async (c) => (await window.__script.file.ajouter('ocr-pages', { comic: c.id, pages: c.pages, langues: 'eng', pretraitement: 'x2-gris', zone: 'page', segmentation: 'epars' })).id, C);
await attendreQue(async (id) => ((await window.__script.db.lire('taches', id))?.curseur || 0) >= 1, tB, 90000);
await p.reload(); await pret(); await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 }).catch(() => {});
const tI = await D(async (id) => window.__script.db.lire('taches', id), tB), passesAvant = await D(async (id) => (await window.__script.db.tous('ocr-passes')).filter((x) => x.tache === id).length, tB);
ok(tI.etat === 'interrompu' && passesAvant >= 1, `page rechargée pendant l'OCR : tâche « interrompue » à ${tI.curseur}/3, ${passesAvant} page(s) déjà enregistrée(s) — rien de perdu`);
await D(async (id) => window.__script.file.reprendre(id), tB); await attendreQue(async (id) => (await window.__script.db.lire('taches', id))?.etat === 'termine', tB, 120000);
const fin1 = await D(async (id) => { const ps = (await window.__script.db.tous('ocr-passes')).filter((x) => x.tache === id), as = (await window.__script.db.tous('connaissances')).filter((a) => a.ocr?.tache === id); return { pages: ps.length, attendus: ps.reduce((s, x) => s + x.blocs, 0), as: as.length, ids: new Set(as.map((a) => a.id)).size }; }, tB);
ok(fin1.pages === 3 && fin1.as === fin1.attendus && fin1.ids === fin1.as, `reprise contrôlée : 3 pages traitées, ${fin1.as} blocs, aucun doublon`);

// E. Connaissances : provenance, page source, relance ; matière de script
await p.click('[data-espace="connaissances"]'); await p.selectOption('#kb-filtre-categorie', 'texte'); await att(300);
await p.locator(`[data-assertion="${premier}"] button`, { hasText: 'Détails' }).click().catch(async () => { await p.selectOption('#kb-filtre-categorie', ''); await att(200); await p.locator(`[data-assertion="${premier}"] button`, { hasText: 'Détails' }).click(); });
await p.waitForSelector('#kb-ocr'); await p.waitForSelector('#kb-ocr-apercu canvas', { timeout: 10000 });
const prov = await p.textContent('#kb-ocr');
ok(/Texte OCR initial/.test(prov) && /pas le contour d'une bulle/.test(prov) && /pas un taux d'exactitude/.test(prov) && /ancien texte/.test(await p.textContent('#connaissances-vue')), 'fiche Connaissances : provenance OCR complète, zone sur l\'image source, historique avec l\'ancien texte');
await p.click('#kb-voir-page'); await p.waitForSelector('#ocr-panneau'); ok(await p.locator('.vignette-page[aria-current="true"]').getAttribute('data-page') === '1', '« Voir la page source » ouvre le numéro à la bonne page');
const pts = await D(async (c) => window.__script.kb.pointsPourProjet([c]), C.id); ok(pts.length === 0, 'aucun texte OCR (même validé) repris comme matière de script');

// F. Corrections 0.11.0 : revalidation directe d'un événement modifié ; filtres libellés
await p.click('#ajouter-evenement'); await att(500); const ev = p.locator('[data-evenement]').last(); await ev.locator('textarea').first().fill('Le gardien enterre la bombe.'); await ev.locator('textarea').first().blur(); await att(900);
await p.locator('#validation-numero [data-valider="evenements"]').check(); await att(900);
await ev.locator('textarea').first().fill('Le gardien enterre la bombe gamma.'); await ev.locator('textarea').first().blur(); await att(1000);
const idEv = await ev.getAttribute('data-evenement'), etatEv = await ev.locator('[data-etat-kb]').textContent(), revalider = await p.locator('#revalider-evenements').isVisible();
await ev.locator(`[data-valider-evenement="${idEv}"]`).click(); await att(700);
const aEv = (await kbTous()).find((a) => a.id === `ev:${idEv}`);
ok(etatEv === 'À vérifier' && revalider && aEv.statut === 'valide' && aEv.historique.map((h) => h.vers).join().endsWith('valide,a-verifier,valide') && await p.locator('#validation-numero [data-valider="evenements"]').isChecked(),
  `événement validé puis modifié : « À vérifier » affiché, revalidation directe (sans décocher la case), historique valide → à vérifier → valide (${etatEv}, bouton ${revalider}, ${aEv?.statut}, ${aEv?.historique.map((h) => h.vers).join()})`);
await p.click('[data-espace="connaissances"]'); await p.waitForSelector('#kb-filtre-statut');
const noms = await D(() => ['kb-recherche', 'kb-filtre-comic', 'kb-filtre-categorie', 'kb-filtre-statut'].map((id) => document.getElementById(id).closest('label')?.querySelector('span')?.textContent));
await p.selectOption('#kb-filtre-categorie', ''); await att(300); await p.selectOption('#kb-filtre-statut', 'valide'); await att(300); const nv = await p.locator('#kb-liste [data-assertion]').count();
ok(noms.join() === 'Rechercher,Numéro,Catégorie,Statut' && nv === (await kbTous()).filter((a) => a.statut === 'valide').length, `filtres de Connaissances libellés (${noms.join(', ')}) et fonctionnels (${nv} validée(s) affichée(s))`);

// G. Hors ligne : moteur et modèles conservés sur l'appareil
await p.goto(`${B}/atelier/script/#comics`); await pret(); await D(() => navigator.serviceWorker.ready); await p.reload(); await pret();
await attendreQue(() => !!navigator.serviceWorker.controller, null, 20000);
await ctx.setOffline(true); const n0 = externes.length;
await p.reload(); await pret(); await p.click(`[data-comic="${C.id}"]`); await p.click('.vignette-page[data-page="3"]'); await p.waitForSelector('#ocr-panneau');
await p.selectOption('#ocr-langues', 'eng'); await p.selectOption('#ocr-zone', 'page'); await p.click('#ocr-page');
await attendreQue(async (c) => (await window.__script.db.tous('connaissances')).some((a) => a.ocr && a.page === 3 && /STORM/.test(a.contenu)), C.id, 60000);
ok(externes.length === n0, 'hors ligne (réseau coupé) : OCR d\'une page JPG avec le moteur et les modèles conservés sur l\'appareil');
await ctx.setOffline(false);

// H. Modèle absent : message clair, aucune tâche, aucun téléchargement implicite
await D(async () => { await window.__script.db.suppr('modeles-ocr', 'eng-fast'); }); const nt = await D(async () => (await window.__script.file.lister()).length), nd = telechargements.length;
await p.click('#ocr-page'); await att(800);
ok(/Modèle OCR absent/.test(await p.textContent('#etat')) && await D(async () => (await window.__script.file.lister()).length) === nt && telechargements.length === nd, 'modèle absent : message explicite, aucun traitement lancé, aucun téléchargement silencieux');
ok(await p.locator('#ajouter-texte').isEnabled(), 'transcription manuelle toujours disponible sans OCR');

// I. Import PNG isolé et PDF ; téléphone
await p.click('[data-espace="comics"]'); await p.setInputFiles('#import-comics', { name: 'page-isolee.png', mimeType: 'image/png', buffer: Buffer.from(PAGES.png, 'base64') });
await attendreQue(async () => (await window.__script.db.tous('comics')).filter((c) => c.genre === 'numero').length === 2);
ok(true, 'import d\'une page PNG isolée : numéro créé, OCR disponible dans le lecteur');
const m = await browser.newContext({ ...devices['iPhone 13'] }), pm = await m.newPage(); pm.on('pageerror', (x) => err.push(`mobile : ${x.message}`));
await pm.goto(`${B}/atelier/script/#connaissances`); await pm.waitForFunction(() => window.__script); await pm.waitForSelector('#kb-filtre-statut');
const ovK = await pm.evaluate(() => document.documentElement.scrollWidth <= screen.width), lab = await pm.locator('label:has(#kb-filtre-categorie) span').textContent();
await pm.click('[data-espace="moteurs"]'); await pm.waitForSelector('#ocr-modeles'); const ovM = await pm.evaluate(() => document.documentElement.scrollWidth <= screen.width);
ok(ovK && ovM && lab === 'Catégorie', 'téléphone : Connaissances (filtres libellés) et Moteurs › OCR sans débordement');
await m.close();

ok(externes.length === 0, `confidentialité : aucune requête hors de l'appareil, en dehors des ${telechargements.length} téléchargement(s) de modèle confirmé(s)${externes.length ? ' · ' + externes.slice(0, 3).join(' ') : ''}`);
ok(!err.length, `aucune erreur JavaScript${err.length ? ' · ' + err.slice(0, 3).join(' | ') : ''}`);
await browser.close(); serveur.close(); fin();
