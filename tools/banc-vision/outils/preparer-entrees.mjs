// Banc Comic Vision — préparation des entrées : OCR RÉEL de DA-PRIME (Tesseract local, réglages par défaut 0.11.1 + texte clair)
// et cases. Les cases viennent de l'annotation humaine validée si elle existe (annotations/<page>.json), sinon de la détection
// géométrique de DA-PRIME (marquées « proposition » : à corriger dans l'annotation, jamais vérité de terrain).
// Tout reste local (Chromium sans réseau externe ; modèles OCR depuis le cache du dépôt). Aucun fichier n'est écrit dans le dépôt.
// Usage : node outils/preparer-entrees.mjs --depot <chemin DA-PRIME> --corpus <dossier avec pages/*.png> [--langue eng]
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const BROUILLON = process.argv.includes('--cases-brouillon'); // cases corrigées des brouillons NON validés (entrée du modèle, pas vérité terrain)
const DEPOT = resolve(arg('depot', join(dirname(fileURLToPath(import.meta.url)), '../../..'))), CORPUS = resolve(arg('corpus', '')), LANGUE = arg('langue', 'eng');
if (!existsSync(join(DEPOT, 'atelier/script/ocr.js')) || !existsSync(join(CORPUS, 'pages'))) { console.error('Usage : --depot <DA-PRIME> --corpus <dossier contenant pages/>'); process.exit(2); }
if (CORPUS.startsWith(DEPOT + '/') || CORPUS.startsWith(DEPOT + '\\')) { console.error('Refus : le corpus ne doit pas être dans le dépôt (comics privés).'); process.exit(2); }
const TESS = process.env.DA_PRIME_TESSDATA || join(DEPOT, '.cache/tessdata');
if (!existsSync(join(TESS, `${LANGUE}.traineddata`))) { console.error(`Modèle OCR absent : ${TESS}/${LANGUE}.traineddata (le placer à la main ; ce script ne télécharge rien).`); process.exit(2); }
const { chromium } = createRequire(join(DEPOT, 'package.json'))('playwright'), { demarrer } = await import(pathToFileURL(join(DEPOT, 'tools/serve.mjs')));
const PORT = 4233, srv = await demarrer(PORT), nav = await chromium.launch(), ctx = await nav.newContext(), p = await ctx.newPage(), externes = [];
await ctx.route('**/*', (r) => { const u = r.request().url();
  if (u.startsWith(`http://localhost:${PORT}/`) || u.startsWith('blob:') || u.startsWith('data:')) return r.continue();
  if (u.startsWith('https://raw.githubusercontent.com/')) return r.fulfill({ body: readFileSync(join(TESS, u.split('/').pop())) }); // servi depuis le cache local
  if (u.startsWith('http://corpus.invalid/')) { const f = resolve(CORPUS, decodeURIComponent(new URL(u).pathname.slice(1))); return f.startsWith(CORPUS) ? r.fulfill({ body: readFileSync(f), contentType: 'image/png' }) : r.fulfill({ status: 403 }); }
  externes.push(u); return r.abort(); });
await p.goto(`http://localhost:${PORT}/atelier/script/`); await p.waitForFunction(() => window.__script, null, { timeout: 30000 });
await p.evaluate(async (l) => { const M = await import('/atelier/script/ocr.js'); await M.telechargerModele(l); }, LANGUE);
mkdirSync(join(CORPUS, 'entrees'), { recursive: true });
const pages = readdirSync(join(CORPUS, 'pages')).filter((f) => /\.png$/i.test(f)).sort();
for (const page of pages) {
  const nom = page.replace(/\.png$/i, ''), fa = join(CORPUS, 'annotations', `${nom}.json`), fb = join(CORPUS, 'annotations-a-faire', `${nom}.json`);
  const ann = existsSync(fa) ? JSON.parse(readFileSync(fa, 'utf8')) : BROUILLON && existsSync(fb) ? JSON.parse(readFileSync(fb, 'utf8')) : null, valide = ann && (ann.valide_par || BROUILLON);
  const r = await p.evaluate(async ({ page, langue, casesAnn, BROUILLON_JS }) => {
    const M = await import('/atelier/script/ocr.js'), O = await import('/templates/_systeme/ocr.js'), C = await import('/atelier/script/comics.js');
    const blob = await (await fetch(`http://corpus.invalid/pages/${encodeURIComponent(page)}`)).blob(), bm = await createImageBitmap(blob), det = C.detecterCases(bm); bm.close();
    const cases = casesAnn || det.cases.map((c) => ({ id: `C${c.n}`, ordre: c.n, zone: { x: c.x, y: c.y, w: c.w, h: c.h } }));
    const R = O.REGLAGES_OCR0, mot = await M.creerMoteur(langue); await mot.parametrer(R.segmentation);
    try { const o = await M.ocrPage(mot, { blob, cases: [] }, { pretraitement: R.pretraitement, zone: 'page', texteClair: R.texteClair ? O.SEUIL_TEXTE_CLAIR : null });
      return { cases, source: casesAnn ? (BROUILLON_JS ? 'brouillon-non-valide' : 'annotation') : `proposition-detection (${det.fiabilite})`, blocs: o.blocs, duree: o.duree }; } finally { await mot.terminer(); }
  }, { page, langue: LANGUE, BROUILLON_JS: BROUILLON && !(ann && ann.valide_par), casesAnn: valide ? ann.cases.map(({ id, ordre, zone }) => ({ id, ordre, zone })) : null });
  // Rattachement de chaque bloc OCR à la case qui contient son centre (sinon null : texte hors case)
  const dans = (b, z) => { const cx = b.zone.x + b.zone.w / 2, cy = b.zone.y + b.zone.h / 2; return cx >= z.x && cx <= z.x + z.w && cy >= z.y && cy <= z.y + z.h; };
  const ocr = r.blocs.map((b, i) => ({ id: `O${i + 1}`, case: (r.cases.find((c) => dans(b, c.zone)) || {}).id || null, zone: b.zone, texte: b.texte, confiance: +b.confiance.toFixed(2), nature: null }));
  writeFileSync(join(CORPUS, 'entrees', `${nom}.json`), JSON.stringify({ page, nature_page: ann?.nature_page || '', cases_source: r.source, ocr_reglages: 'DA-PRIME 0.11.1 défauts (x2-contraste, épars, texte clair)', cases: r.cases, ocr }, null, 1));
  console.log(`${nom} : ${r.cases.length} case(s) [${r.source}] · ${ocr.length} bloc(s) OCR · ${(r.duree / 1000).toFixed(1)} s`);
}
await nav.close(); srv.close();
console.log(externes.length ? `ALERTE : ${externes.length} requête(s) externe(s) bloquée(s) : ${externes.slice(0, 3).join(', ')}` : 'Aucune requête externe.');
