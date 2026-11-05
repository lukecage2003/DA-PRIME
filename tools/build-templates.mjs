// Primestone · génère les modules du moteur, les gabarits SVG des miniatures et leurs exemples.
// Usage : node tools/build-templates.mjs [--no-render]
// 1. templates/_systeme/{tokens,logo,placeholders}.js   2. templates/miniatures/<famille>/PS_MIN_*_NON-OFFICIEL.svg
// 3. templates/miniatures/catalogue.json                 4. exemples JPG + planche 168 px (Chromium, polices web)
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SYS = join(ROOT, 'templates/_systeme'), MIN = join(ROOT, 'templates/miniatures');
const gen = (f, body) => writeFileSync(join(SYS, f), `// GÉNÉRÉ par tools/build-templates.mjs · ne pas éditer\n${body}`);

// 1. Modules générés
const flat = JSON.parse(readFileSync(join(ROOT, 'brand/02_tokens/build/tokens.flat.json'), 'utf8'));
const tok = { $version: flat.version };
for (const [k, t] of Object.entries(flat.tokens)) tok[k] = t.type === 'dimension' || t.type === 'duration' ? t.value.value : t.value;
gen('tokens.js', `export default ${JSON.stringify(tok, null, 1)};\n`);
const svgP = (f) => { const s = readFileSync(join(ROOT, 'brand/01_logo/NON-OFFICIEL', f), 'utf8'); const [, w, h] = s.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/); return { w: +w, h: +h, d: s.match(/ d="([^"]+)"/)[1] }; };
gen('logo.js', `// VECTORISATION NON OFFICIELLE du logo (brand/01_logo/NON-OFFICIEL) : ne pas diffuser comme logo officiel.\nexport default ${JSON.stringify({ statut: 'NON-OFFICIEL', P: svgP('PS_LOGO_icone-P_noir_NON-OFFICIEL.svg'), logotype: svgP('PS_LOGO_logotype_noir_NON-OFFICIEL.svg') })};\n`);
const dims = (buf) => {
  if (buf[0] === 0x89) return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
  for (let i = 2; i < buf.length;) { const m = buf[i + 1], len = buf.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xc3) return [buf.readUInt16BE(i + 7), buf.readUInt16BE(i + 5)]; i += 2 + len; }
};
const PH = {};
for (const f of readdirSync(join(ROOT, 'brand/99_tests/substitution')).filter((x) => x.startsWith('PLACEHOLDER_'))) {
  const id = f.replace(/^PLACEHOLDER_art-|\.\w+$/g, ''); const [w, h] = dims(readFileSync(join(ROOT, 'brand/99_tests/substitution', f)));
  PH[id] = { src: `brand/99_tests/substitution/${f}`, w, h };
}
gen('placeholders.js', `// Images de substitution (PLACEHOLDER) : aucune valeur de marque. Chemins relatifs à la racine du dépôt.\nexport default ${JSON.stringify(PH, null, 1)};\n`);

// 2. Gabarits SVG
const { rendre, FAMILLES, KIOSQUE, FORMATS } = await import(pathToFileURL(join(SYS, 'moteur.js')) + `?t=${Date.now()}`);
const KIO = join(ROOT, 'templates/kiosque');
const rapports = [], collections = [];
for (const [racine, gabarits, nomColl] of [[MIN, FAMILLES, 'miniatures'], [KIO, KIOSQUE, 'kiosque']]) {
rmSync(racine, { recursive: true, force: true });
const fmt = FORMATS[Object.values(gabarits)[0].format || 'miniature'];
const catalogue = { version: flat.version, statut: 'provisoire · logo NON OFFICIEL · jaune non validé', format: { largeur: fmt.w, hauteur: fmt.h }, familles: [] };
collections.push({ racine, nomColl, catalogue });
for (const [fid, fam] of Object.entries(gabarits)) {
  const dir = join(racine, fid); mkdirSync(dir, { recursive: true });
  const donnees = { credit: 'Image de substitution · placeholder' };
  for (const c of fam.champs.filter((c) => c.type === 'image')) { const p = PH[c.placeholder]; donnees[c.id] = { href: relative(dir, join(ROOT, p.src)).split('\\').join('/'), w: p.w, h: p.h, placeholder: true }; }
  const vs = [];
  for (const vid of Object.keys(fam.variantes)) {
    const { svg, alertes } = rendre(fid, vid, donnees);
    const nom = `PS_${fam.prefixe || 'MIN'}_${fid}_${vid}_NON-OFFICIEL.svg`; writeFileSync(join(dir, nom), svg);
    vs.push({ id: vid, nom: fam.variantes[vid].nom, fichier: `${fid}/${nom}` });
    rapports.push({ fid, vid, alertes: alertes.filter((a) => a.niveau !== 'info') });
  }
  catalogue.familles.push({ id: fid, nom: fam.nom, description: fam.description, champs: fam.champs.map(({ id, type, label, conseil }) => ({ id, type, label, ...(conseil ? { conseil } : {}) })), variantes: vs });
}
writeFileSync(join(racine, 'catalogue.json'), JSON.stringify(catalogue, null, 2) + '\n');
const nbV = catalogue.familles.reduce((n, f) => n + f.variantes.length, 0);
console.log(`${catalogue.familles.length} gabarits, ${nbV} variantes -> templates/${nomColl}`);
}
const bad = rapports.filter((r) => r.alertes.length);
for (const r of bad) console.log(`  alerte ${r.fid}/${r.vid} : ${r.alertes.map((a) => a.message).join(' | ')}`);

// Précache hors ligne de l'Atelier (chemins relatifs à atelier/)
{
  const liste = ['./', 'index.html', 'atelier.css', 'polices.css', 'atelier.js', 'manifest.webmanifest',
    ...readdirSync(SYS).filter((f) => f.endsWith('.js')).sort().map((f) => `../templates/_systeme/${f}`),
    ...readdirSync(join(ROOT, 'brand/03_fonts/web')).map((f) => `../brand/03_fonts/web/${f}`),
    ...Object.values(PH).map((p) => `../${p.src}`),
    '../brand/04_elements/png/PS_EL_sceau-P_noir_NON-OFFICIEL.png', '../brand/04_elements/png/PS_EL_sceau-P_noir_NON-OFFICIEL@2x.png'];
  const { createHash } = await import('node:crypto');
  const h = createHash('sha256'); for (const f of liste.filter((x) => x !== './')) h.update(readFileSync(join(ROOT, 'atelier', f)));
  writeFileSync(join(ROOT, 'atelier/precache.json'), JSON.stringify({ version: `${flat.version}-${h.digest('hex').slice(0, 10)}`, fichiers: liste }, null, 1) + '\n');
}

// 3. Exemples rendus dans Chromium : le fichier SVG lui-même, inséré dans une page avec les polices web
if (!process.argv.includes('--no-render')) {
  const { chromium } = createRequire(import.meta.url)('playwright');
  const { demarrer } = await import(pathToFileURL(join(ROOT, 'tools/serve.mjs')));
  const srv = await demarrer(4199);
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  for (const { racine, nomColl, catalogue } of collections) {
    const fichiers = catalogue.familles.flatMap((f) => f.variantes.map((v) => v.fichier));
    await p.setViewportSize({ width: catalogue.format.largeur, height: catalogue.format.hauteur });
    for (const f of fichiers) {
      await p.goto(`http://127.0.0.1:4199/tools/rendu.html?f=${encodeURIComponent(`templates/${nomColl}/${f}`)}`);
      await p.waitForFunction(() => window.pret === true);
      const ex = join(racine, dirname(f), 'exemples'); mkdirSync(ex, { recursive: true });
      await p.locator('svg').screenshot({ path: join(ex, f.split('/')[1].replace('.svg', '.jpg')), type: 'jpeg', quality: 85 });
    }
    // Planche de lisibilité à la taille d'affichage réelle sur téléphone : 168 px (suggestions YouTube), 360 px (fil Instagram)
    const lp = nomColl === 'miniatures' ? 168 : 360;
    await p.setViewportSize({ width: 1280, height: 720 });
    await p.goto(`http://127.0.0.1:4199/tools/rendu.html?l=${lp}&planche=${encodeURIComponent(fichiers.map((f) => `templates/${nomColl}/${f}`).join(','))}`);
    await p.waitForFunction(() => window.pret === true);
    await p.locator('#planche').screenshot({ path: join(racine, `PS_${nomColl === 'miniatures' ? 'MIN' : 'CAR'}_planche-${lp}px_NON-OFFICIEL.png`) });
    console.log(`${fichiers.length} exemples JPG + planche ${lp} px (${nomColl})`);
  }
  await b.close(); srv.close();
}
if (bad.length) process.exitCode = 1;
