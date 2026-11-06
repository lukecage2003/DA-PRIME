// DA-PRIME · protocole de validation de Script Studio sur VOS comics (fichiers privés, jamais copiés dans le dépôt).
// Usage : node tools/valider-comics.mjs <dossier-de-comics> [dossier-rapport]
// Pour chaque fichier (CBZ, ZIP, PDF, images ; un dossier d'images = un numéro) : import, nombre de pages, doubles pages,
// doublons, durée, détection des cases (nombre, fiabilité, durée). Le rapport (Markdown + JSON) est écrit hors du dépôt par défaut.
// Les mesures sont automatiques ; l'exactitude (ordre, cases, doubles pages) se vérifie ensuite à l'œil avec la grille fournie.
import { readdirSync, statSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, extname, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'), SRC = process.argv[2];
if (!SRC) { console.error('Usage : node tools/valider-comics.mjs <dossier-de-comics> [dossier-rapport]'); process.exit(2); }
const OUT = process.argv[3] || join(tmpdir(), 'da-prime-validation-comics'); mkdirSync(OUT, { recursive: true });
if (OUT.startsWith(ROOT)) console.warn('Attention : le rapport est écrit dans le dépôt ; ne pas le committer s\'il contient des noms de fichiers privés.');
const IMG = /\.(jpe?g|png|webp|avif|gif)$/i, ARCH = /\.(cbz|zip|pdf|cbr|rar)$/i;
const entrees = readdirSync(SRC).sort().flatMap((n) => { const p = join(SRC, n), s = statSync(p);
  if (s.isDirectory()) { const imgs = readdirSync(p).filter((f) => IMG.test(f)).map((f) => join(p, f)); return imgs.length ? [{ nom: n, fichiers: imgs }] : []; }
  return ARCH.test(n) ? [{ nom: n, fichiers: [p] }] : []; });
if (!entrees.length) { console.error('Aucun comic trouvé (CBZ, ZIP, PDF, CBR, ou dossiers d\'images).'); process.exit(2); }
const { chromium } = createRequire(import.meta.url)('playwright'), { demarrer } = await import(pathToFileURL(join(ROOT, 'tools/serve.mjs')));
const srv = await demarrer(4199), b = await chromium.launch(), p = await b.newPage();
await p.goto('http://localhost:4199/atelier/script/'); await p.waitForFunction(() => window.__script, null, { timeout: 30000 });
await p.evaluate(() => { const i = Object.assign(document.createElement('input'), { type: 'file', multiple: true, id: 'validation-fichiers' }); document.body.append(i); });
const lignes = [];
for (const e of entrees) {
  process.stdout.write(`${e.nom}… `);
  await p.setInputFiles('#validation-fichiers', e.fichiers);
  const r = await p.evaluate(async () => {
    const C = await import('./comics.js'), fs = [...document.querySelector('#validation-fichiers').files], t0 = performance.now(), mem0 = performance.memory?.usedJSHeapSize || 0;
    try { const lots = await C.importerFichiers(fs), t1 = performance.now(), out = [];
      for (const l of lots) { const cases = []; let tc = 0;
        for (const pg of l.pages) { const bm = await createImageBitmap(pg.blob), a = performance.now(), d = C.detecterCases(bm); tc += performance.now() - a; cases.push({ n: d.cases.length, f: d.fiabilite }); bm.close?.(); }
        out.push({ pages: l.pages.length, doubles: l.pages.filter((x) => x.double).map((x, i) => i), doublons: l.pages.filter((x) => x.doublon).length, tailles: [...new Set(l.pages.map((x) => `${x.w}×${x.h}`))].slice(0, 3),
          cases, msCases: Math.round(tc), fiab: { bonne: cases.filter((c) => c.f === 'bonne').length, moyenne: cases.filter((c) => c.f === 'moyenne').length, faible: cases.filter((c) => c.f === 'faible').length } }); }
      return { ok: true, msImport: Math.round(t1 - t0), memMo: Math.round(((performance.memory?.usedJSHeapSize || 0) - mem0) / 1048576), lots: out };
    } catch (err) { return { ok: false, erreur: err.message }; } });
  console.log(r.ok ? `${r.lots.reduce((t, l) => t + l.pages, 0)} pages, ${r.msImport} ms` : `ÉCHEC : ${r.erreur}`);
  lignes.push({ fichier: e.nom, format: e.fichiers.length > 1 ? 'dossier d\'images' : extname(e.fichiers[0]).slice(1).toUpperCase(), ...r });
}
await b.close(); srv.close();
const md = ['# Validation Script Studio sur comics réels', '', `Date : ${new Date().toISOString()} · ${lignes.length} élément(s)`, '',
  '| Fichier | Format | Import | Pages | Doubles pages détectées | Doublons | Cases : bonne / moyenne / faible | Durée import | Durée cases |', '|---|---|---|---|---|---|---|---|---|',
  ...lignes.map((l) => l.ok ? `| ${l.fichier} | ${l.format} | ok | ${l.lots.map((x) => x.pages).join('+')} | ${l.lots.map((x) => x.doubles.length).join('+')} | ${l.lots.map((x) => x.doublons).join('+')} | ${l.lots.map((x) => `${x.fiab.bonne} / ${x.fiab.moyenne} / ${x.fiab.faible}`).join(' ; ')} | ${l.msImport} ms | ${l.lots.map((x) => x.msCases).join('+')} ms |` : `| ${l.fichier} | ${l.format} | **échec** : ${l.erreur} | | | | | | |`),
  '', '## Vérification humaine (à remplir)', '', 'Pour chaque numéro, ouvrir Script Studio › Comics et noter :', '', '- Ordre des pages correct (oui/non, pages fautives).', '- Doubles pages : réelles manquées, fausses détections.', '- Cases : pages où la découpe est juste ; pages « faible » à découper à la main ; erreurs non signalées (le plus grave).', '- Temps ressenti et fluidité du lecteur.', ''].join('\n');
writeFileSync(join(OUT, 'rapport.md'), md); writeFileSync(join(OUT, 'rapport.json'), JSON.stringify(lignes, null, 2));
console.log(`\nRapport : ${join(OUT, 'rapport.md')}`);
