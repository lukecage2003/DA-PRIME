// DA-PRIME · protocole de mesure de l'OCR local, INDÉPENDANT de la confiance Tesseract.
// Compare le texte reconnu à des transcriptions de référence corrigées à la main : exactitude des mots, WER, CER, temps, mémoire,
// par catégorie de lettrage, par prétraitement et par langue. Utilise le vrai moteur de DA-PRIME (Chromium, Tesseract.js, modèles fast).
// Les images et références restent dans VOTRE dossier (jamais dans le dépôt) ; le rapport y est écrit.
//
// Usage : node tools/mesurer-ocr.mjs <dossier-corpus> [--mode=zone|page] [--pretraitements=original,x2,x2-gris,x2-contraste,x2-binaire] [--langues=eng,fra,fra+eng] [--segmentation=bloc|epars|auto]
//   --mode=zone (défaut) : reconnaissance seule sur la zone délimitée ; --mode=page : page entière, détection comprise (réaliste)
// <dossier-corpus>/corpus.json :
//   { "echantillons": [ { "image": "pages/hulk1-p05.png", "zone": { "x": 0.12, "y": 0.05, "w": 0.3, "h": 0.1 },
//                         "categorie": "dialogue|narration|italique|stylise|onomatopee|petit", "langue": "eng", "reference": "TEXTE EXACT" } ] }
//   zone : fractions de la page (facultative : page entière). --langues absent : la langue de chaque échantillon.
// Modèles : .cache/tessdata (ou DA_PRIME_TESSDATA) ; à défaut, téléchargés une fois depuis tessdata_fast 4.1.0 et vérifiés.
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname, resolve, extname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'), DOS = process.argv[2] && resolve(process.argv[2]);
if (!DOS || !existsSync(join(DOS, 'corpus.json'))) { console.error('Usage : node tools/mesurer-ocr.mjs <dossier-corpus> (avec corpus.json)'); process.exit(2); }
if (DOS.startsWith(ROOT + '/')) console.warn('Attention : corpus dans le dépôt. Ne jamais committer d\'images de comics.');
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) || `=${d}`).split('=')[1];
const O = await import(pathToFileURL(join(ROOT, 'templates/_systeme/ocr.js')));
const PRE = arg('pretraitements', 'original,x2,x2-gris,x2-contraste,x2-binaire').split(',').filter((k) => O.PRETRAITEMENTS[k]), LANGS = arg('langues', '').split(',').filter(Boolean), MODE = arg('mode', 'zone'), SEG = arg('segmentation', MODE === 'page' ? 'epars' : 'bloc');
const corpus = JSON.parse(readFileSync(join(DOS, 'corpus.json'), 'utf8')).echantillons;
const TESS = process.env.DA_PRIME_TESSDATA || join(ROOT, '.cache/tessdata'); mkdirSync(TESS, { recursive: true });
for (const [code, m] of Object.entries(O.MODELES.langues)) { const f = join(TESS, `${code}.traineddata`); if (!existsSync(f)) execFileSync('curl', ['-sSfL', '-o', f, O.urlModele(code)]);
  if (createHash('sha256').update(readFileSync(f)).digest('hex') !== m.sha256) { console.error(`${f} : empreinte invalide`); process.exit(1); } }

// Mémoire : somme des RSS des processus du navigateur (Linux, /proc) ; ailleurs « non mesurée »
const rssArbre = (pid) => { try { const tous = readdirSync('/proc').filter((x) => /^\d+$/.test(x)), enfants = new Map();
  for (const x of tous) { try { const ppid = +readFileSync(`/proc/${x}/stat`, 'utf8').split(') ')[1].split(' ')[1]; if (!enfants.has(ppid)) enfants.set(ppid, []); enfants.get(ppid).push(+x); } catch { /* processus terminé */ } }
  let total = 0; const pile = [pid]; while (pile.length) { const q = pile.pop(); try { total += +(/VmRSS:\s+(\d+)/.exec(readFileSync(`/proc/${q}/status`, 'utf8'))?.[1] || 0); } catch { /* */ } pile.push(...(enfants.get(q) || [])); }
  return total / 1024; } catch { return null; } };

const { chromium } = createRequire(import.meta.url)('playwright'), { demarrer } = await import(pathToFileURL(join(ROOT, 'tools/serve.mjs')));
const PORT = 4231, srv = await demarrer(PORT), browser = await chromium.launch(), ctx = await browser.newContext(), p = await ctx.newPage(), externes = [];
ctx.on('request', (r) => { const u = r.url(); if (!u.startsWith(`http://localhost:${PORT}`) && !u.startsWith('http://corpus.invalid/') && !u.startsWith('https://raw.githubusercontent.com/') && !u.startsWith('blob:') && !u.startsWith('data:')) externes.push(u); });
await ctx.route('https://raw.githubusercontent.com/**', (r) => r.fulfill({ body: readFileSync(join(TESS, r.request().url().split('/').pop())) }));
await ctx.route('http://corpus.invalid/**', (r) => { const f = resolve(DOS, decodeURIComponent(new URL(r.request().url()).pathname.slice(1))); if (!f.startsWith(DOS)) return r.fulfill({ status: 403 }); r.fulfill({ body: readFileSync(f), contentType: { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp' }[extname(f).toLowerCase()] || 'application/octet-stream' }); });
await p.goto(`http://localhost:${PORT}/atelier/script/`); await p.waitForFunction(() => window.__script, null, { timeout: 30000 });
await p.evaluate(async () => { const M = await import('/atelier/script/ocr.js'); for (const c of ['eng', 'fra']) await M.telechargerModele(c); });
// Le navigateur est un processus enfant de ce script : mémoire = arbre des processus moins ce script
const nav = () => { const t = rssArbre(process.pid); return t === null ? null : t - process.memoryUsage().rss / 1048576; };
let pic = 0; const base = nav(), pid = base !== null, sonde = setInterval(() => { if (pid) pic = Math.max(pic, nav() || 0); }, 250);

const combis = [...new Set(LANGS.length ? LANGS : corpus.map((e) => e.langue || 'eng'))], lignes = [];
console.log(`${corpus.length} échantillon(s) × ${PRE.length} prétraitement(s) × ${LANGS.length ? combis.length : 1} langue(s) · segmentation ${SEG}`);
for (const comb of LANGS.length ? combis : [null]) {
  for (const pre of PRE) {
    const res = await p.evaluate(async ({ corpus, pre, comb, seg, mode }) => {
      const M = await import('/atelier/script/ocr.js'), O = await import('/templates/_systeme/ocr.js'), out = [], moteurs = {}, pages = {};
      try {
        // Mode « page » (réaliste) : la page entière est reconnue une fois ; chaque zone de référence reçoit les blocs dont le centre y tombe
        if (mode === 'page') { for (const e of corpus) { const lang = comb || e.langue || 'eng'; moteurs[lang] ||= await M.creerMoteur(lang).then(async (m) => { await m.parametrer(seg); return m; });
            const k = `${lang}|${e.image}`; if (!pages[k]) { const blob = await (await fetch(`http://corpus.invalid/${encodeURI(e.image)}`)).blob(), t0 = performance.now(); pages[k] = { r: await M.ocrPage(moteurs[lang], { blob, cases: [] }, { pretraitement: pre }), ms: performance.now() - t0, n: corpus.filter((x) => x.image === e.image).length }; }
            const z = e.zone || { x: 0, y: 0, w: 1, h: 1 }, m = 0.01, dans = pages[k].r.blocs.filter((b) => { const cx = b.zone.x + b.zone.w / 2, cy = b.zone.y + b.zone.h / 2; return cx >= z.x - m && cx <= z.x + z.w + m && cy >= z.y - m && cy <= z.y + z.h + m; }), texte = dans.map((b) => b.texte).join(' ');
            out.push({ ...e, langue: lang, pretraitement: pre, texte, ms: Math.round(pages[k].ms / pages[k].n), confiance: dans.length ? dans.reduce((s, b) => s + b.confiance, 0) / dans.length : 0, mesure: O.mesurer(e.reference, texte) }); }
          return out; }
        for (const e of corpus) { const lang = comb || e.langue || 'eng';
          moteurs[lang] ||= await M.creerMoteur(lang).then(async (m) => { await m.parametrer(seg); return m; });
          const blob = await (await fetch(`http://corpus.invalid/${encodeURI(e.image)}`)).blob(), bm = await createImageBitmap(blob), W = bm.width, H = bm.height, z = e.zone || { x: 0, y: 0, w: 1, h: 1 };
          const r = { x: Math.round(z.x * W), y: Math.round(z.y * H), w: Math.max(8, Math.round(z.w * W)), h: Math.max(8, Math.round(z.h * H)) };
          const t0 = performance.now(), pr = await M.pretraiter(bm, r, pre), d = await moteurs[lang].reconnaitre(pr.blob), t = performance.now() - t0; bm.close();
          const bl = O.ordreLecture(O.regrouperLignes(O.blocsDepuisTesseract(d, { echelle: pr.echelle, largeur: W, hauteur: H }).blocs)).blocs, texte = bl.map((b) => b.texte).join(' ');
          out.push({ ...e, langue: lang, pretraitement: pre, texte, ms: Math.round(t), confiance: bl.length ? bl.reduce((s, b) => s + b.confiance * b.mots, 0) / Math.max(1, bl.reduce((s, b) => s + b.mots, 0)) : 0, mesure: O.mesurer(e.reference, texte) });
        }
      } finally { for (const m of Object.values(moteurs)) await m.terminer(); }
      return out;
    }, { corpus, pre, comb, seg: SEG, mode: MODE });
    lignes.push(...res); process.stdout.write(`  ${pre}${comb ? ` · ${comb}` : ''} : ${Math.round(O.agreger(res.map((x) => x.mesure)).exactitude * 100)} % des mots\n`);
  }
}
clearInterval(sonde); await browser.close(); srv.close();

// ---------- Rapport ----------
const pc = (x) => (x === null || x === undefined ? '—' : `${(x * 100).toFixed(1)} %`), grp = (f) => { const m = new Map(); for (const l of lignes) { const k = f(l); if (!m.has(k)) m.set(k, []); m.get(k).push(l); } return m; };
const ligneAg = (ls) => { const a = O.agreger(ls.map((x) => x.mesure)); return `${a.echantillons} | ${a.mots} | ${pc(a.exactitude)} | ${pc(a.wer)} | ${pc(a.cer)} | ${Math.round(ls.reduce((s, x) => s + x.ms, 0) / ls.length)} ms | ${pc(ls.reduce((s, x) => s + x.confiance, 0) / ls.length)}`; };
let md = `# Mesure de l'OCR local DA-PRIME\n\n${new Date().toISOString().slice(0, 16).replace('T', ' ')} · Tesseract.js 7.0.0, modèles fast ${O.MODELES.version} · mode « ${MODE === 'page' ? 'page entière (détection + reconnaissance)' : 'zone délimitée (reconnaissance seule)'} » · segmentation « ${SEG} » · ${corpus.length} échantillon(s), ${new Set(corpus.map((e) => e.image)).size} page(s).\n\n`;
md += 'Exactitude des mots = mots de la référence correctement reconnus ÷ mots de la référence. WER = (substitutions + suppressions + insertions) ÷ mots de la référence. CER : même calcul en caractères. La confiance Tesseract est donnée à titre indicatif : ce n\'est pas un taux d\'exactitude.\n\n';
md += `Mémoire (somme des processus du navigateur) : ${base !== null && pic ? `${Math.round(base)} Mo au départ, pic ${Math.round(pic)} Mo` : 'non mesurée sur ce système'}. Requêtes externes pendant la mesure : ${externes.length}.\n\n`;
const lc = lignes.filter((l) => O.OBJECTIF.categories.includes(l.categorie)), parPre = grp((l) => l.pretraitement);
md += `## Objectif : ≥ ${O.OBJECTIF.exactitude * 100} % des mots sur le lettrage courant (dialogues et narration)\n\n| Prétraitement | Échantillons | Mots | Exactitude | WER | CER | Temps moyen | Confiance moyenne | Objectif |\n|---|---|---|---|---|---|---|---|---|\n`;
for (const [k, ls] of parPre) { const c = ls.filter((l) => O.OBJECTIF.categories.includes(l.categorie)), a = O.agreger(c.map((x) => x.mesure)); md += `| ${O.PRETRAITEMENTS[k].nom} | ${c.length ? ligneAg(c) : '0 | 0 | — | — | — | — | —'} | ${a.exactitude === null ? 'non mesuré' : a.exactitude >= O.OBJECTIF.exactitude ? 'atteint' : 'NON atteint'} |\n`; }
md += `\n${O.OBJECTIF.note}\n\n## Par catégorie de lettrage et prétraitement (aucune catégorie masquée)\n\n| Catégorie | Prétraitement | Échantillons | Mots | Exactitude | WER | CER | Temps moyen | Confiance moyenne |\n|---|---|---|---|---|---|---|---|---|\n`;
for (const [cat, nom] of Object.entries(O.CATEGORIES_MESURE)) { const ls = lignes.filter((l) => l.categorie === cat); if (!ls.length) { md += `| ${nom} | — | 0 | 0 | non mesuré (aucun échantillon) | | | | |\n`; continue; } for (const [k, x] of grp((l) => l.pretraitement)) { const y = x.filter((l) => l.categorie === cat); if (y.length) md += `| ${nom} | ${O.PRETRAITEMENTS[k].nom} | ${ligneAg(y)} |\n`; } }
md += '\n## Par langue\n\n| Langue | Échantillons | Mots | Exactitude | WER | CER | Temps moyen | Confiance moyenne |\n|---|---|---|---|---|---|---|---|\n';
for (const [k, ls] of grp((l) => l.langue)) md += `| ${O.COMBINAISONS[k] || k} | ${ligneAg(ls)} |\n`;
const meilleur = [...parPre].map(([k, ls]) => [k, O.agreger(ls.filter((l) => O.OBJECTIF.categories.includes(l.categorie)).map((x) => x.mesure)).exactitude ?? -1]).sort((a, b) => b[1] - a[1])[0];
md += `\n## Détail (toutes les lignes, du pire au meilleur, pour le meilleur prétraitement : ${O.PRETRAITEMENTS[meilleur[0]].nom})\n\n| Image | Catégorie | Exactitude | Référence | Reconnu |\n|---|---|---|---|---|\n`;
for (const l of lignes.filter((x) => x.pretraitement === meilleur[0]).sort((a, b) => (a.mesure.exactitude ?? 0) - (b.mesure.exactitude ?? 0))) md += `| ${l.image} | ${O.CATEGORIES_MESURE[l.categorie] || l.categorie} | ${pc(l.mesure.exactitude)} | ${l.reference.replace(/\|/g, '/')} | ${(l.texte || '(rien)').replace(/\|/g, '/')} |\n`;
const suf = MODE === 'page' ? '-page' : ''; writeFileSync(join(DOS, `rapport-ocr${suf}.md`), md); writeFileSync(join(DOS, `rapport-ocr${suf}.json`), JSON.stringify({ date: Date.now(), mode: MODE, segmentation: SEG, memoire: { base, pic }, externes, lignes }, null, 1));
console.log(`Lettrage courant, meilleur prétraitement (${O.PRETRAITEMENTS[meilleur[0]].nom}) : ${pc(meilleur[1])} des mots. Rapport : ${join(DOS, `rapport-ocr${MODE === 'page' ? '-page' : ''}.md`)}`);
console.log(externes.length ? `ATTENTION : ${externes.length} requête(s) externe(s).` : 'Aucune requête externe.');
