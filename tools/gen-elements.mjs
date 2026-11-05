// Primestone · génère les éléments graphiques (SVG) depuis les tokens, puis leurs PNG transparents.
// Usage : node tools/gen-elements.mjs [--no-png]
// Le rendu PNG utilise Playwright/Chromium et les polices de brand/03_fonts (aucune police système requise).
import { readFileSync, writeFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const T = JSON.parse(readFileSync(join(ROOT, 'brand/02_tokens/build/tokens.flat.json'), 'utf8')).tokens;
const v = (p) => T[p].value;
const Y = v('color.brand.yellow'), K = v('color.brand.black'), RED = v('color.editorial.news-red'), PAPER = v('color.editorial.paper');
const ANG = v('motif.incision-angle'), TAN = Math.tan((ANG * Math.PI) / 180);
const OUT = join(ROOT, 'brand/04_elements');
const SVG = join(OUT, 'svg'), PNG = join(OUT, 'png');
for (const d of [SVG, PNG]) { rmSync(d, { recursive: true, force: true }); mkdirSync(d, { recursive: true }); }

const r = (n) => Math.round(n * 100) / 100;
const svg = (w, h, body, note = '') => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}">\n<!-- Primestone · ${note || 'élément graphique'} · généré par tools/gen-elements.mjs depuis tokens v${JSON.parse(readFileSync(join(ROOT, 'brand/02_tokens/build/tokens.flat.json'))).version} -->\n${body}\n</svg>\n`;
// Parallélogramme incliné : bord haut décalé vers la droite de h·tan(8°)
const slab = (x, y, w, h, fill) => { const o = h * TAN; return `<polygon fill="${fill}" points="${r(x)},${r(y + h)} ${r(x + w)},${r(y + h)} ${r(x + w + o)},${r(y)} ${r(x + o)},${r(y)}"/>`; };
const files = {};
const put = (name, content) => { files[name] = content; writeFileSync(join(SVG, name), content); };

// 1. Incision (barre verticale) et filet
for (const [n, c] of [['jaune', Y], ['noir', K]]) {
  const h = 400, w = 28, o = h * TAN;
  put(`PS_EL_incision_${n}.svg`, svg(r(w + o), h, slab(0, 0, w, h, c), `incision ${ANG}°`));
  const fh = 14, fw = 256, fo = fh * TAN;
  put(`PS_EL_filet-incision_${n}.svg`, svg(r(fw + fo), fh, slab(0, 0, fw, fh, c), `filet sous titre, extrémités à ${ANG}°`));
}
// 2. Volet de transition (couvre 1920×1080 en passant)
{ const h = 1080, w = 760, o = h * TAN; put('PS_EL_volet-transition_jaune.svg', svg(r(w + o + 120), h, `${slab(0, 0, 120, h, K)}${slab(120, 0, w, h, Y)}`, 'volet de transition coupe incisée (bord noir + jaune)')); }

// 3. Sceau P (dépend de la vectorisation NON OFFICIELLE du P)
{
  const src = readFileSync(join(ROOT, 'brand/01_logo/NON-OFFICIEL/PS_LOGO_icone-P_noir_NON-OFFICIEL.svg'), 'utf8');
  const [, vw, vh] = src.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  const d = src.match(/ d="([^"]+)"/)[1];
  const S = 512, rad = S * v('motif.seal-radius-ratio'), gh = S * 0.68, sc = gh / +vh, gw = +vw * sc;
  for (const [n, bg, fg] of [['jaune', Y, K], ['noir', K, Y]]) {
    put(`PS_EL_sceau-P_${n}_NON-OFFICIEL.svg`, svg(S, S, `<rect width="${S}" height="${S}" rx="${r(rad)}" fill="${bg}"/>\n<path fill="${fg}" fill-rule="evenodd" transform="translate(${r((S - gw) / 2)} ${r((S - gh) / 2)}) scale(${r(sc * 1000) / 1000})" d="${d}"/>`, 'sceau P · NON OFFICIEL (P vectorisé provisoirement)'));
  }
}
// 4. Case-cadre (couverture 2:3) et trame Ben-Day
put('PS_EL_case-cadre_2x3.svg', svg(600, 900, `<rect x="9" y="9" width="582" height="882" fill="none" stroke="${K}" stroke-width="18"/>`, 'case-cadre couverture 2:3, bord 18 px à 600 px'));
{ const cell = r(1280 * v('motif.benday-cell-ratio')), rad = r(cell * 0.23);
  put('PS_EL_trame-benday_1280x720.svg', svg(1280, 720, `<defs><pattern id="d" width="${cell}" height="${cell}" patternUnits="userSpaceOnUse"><circle cx="${r(cell / 2)}" cy="${r(cell / 2)}" r="${rad}" fill="${K}"/></pattern></defs><rect width="1280" height="720" fill="url(#d)" opacity="${v('motif.benday-opacity')}"/>`, 'trame Ben-Day, mode Produit ou Normal')); }

// 5. Étiquettes de rubrique (texte vivant, JetBrains Mono Bold)
const RUB = [['analyse-personnage', 'ANALYSE · PERSONNAGE', K, Y], ['analyse-comic', 'ANALYSE · COMIC', K, Y], ['actu', 'ACTU', RED, '#FFFFFF'], ['theorie', 'THÉORIE', Y, K], ['guide', 'GUIDE DE LECTURE', K, Y], ['evenement', 'ÉVÉNEMENT', K, Y], ['histoire', 'HISTOIRE', K, Y], ['cosmique', 'DOSSIER COSMIQUE', Y, K]];
{ const fs = 27, ls = 3.8, px = 20, py = 15;
  for (const [id, label, bg, fg] of RUB) {
    const tw = label.length * fs * 0.6 + (label.length - 1) * ls, w = Math.ceil(tw + px * 2), h = fs + py * 2;
    put(`PS_EL_rubrique-${id}.svg`, svg(w, h, `<rect width="${w}" height="${h}" fill="${bg}"/>\n<text x="${px}" y="${r(py + fs * 0.78)}" fill="${fg}" font-family="JetBrains Mono" font-weight="700" font-size="${fs}" letter-spacing="${ls}">${label}</text>`, `rubrique ${label} (texte modifiable, police JetBrains Mono Bold)`));
  } }

// 6. Grilles de construction (calques guides)
{ const W = 1280, H = 720, m = v('layout.thumbnail.margin').value, s = v('layout.thumbnail.seal-size').value, dw = v('layout.thumbnail.dead-zone-width').value, dh = v('layout.thumbnail.dead-zone-height').value;
  const G = '#00C2FF';
  put('PS_GRID_miniature-1280x720.svg', svg(W, H, `<g fill="none" stroke="${G}" stroke-width="2"><rect x="${m}" y="${m}" width="${W - 2 * m}" height="${H - 2 * m}" stroke-dasharray="10 8"/><line x1="${W / 2}" y1="0" x2="${W / 2}" y2="${H}" opacity=".5"/><rect x="${m}" y="${H - m - s}" width="${s}" height="${s}"/><rect x="${m}" y="${m}" width="420" height="58"/></g>
<rect x="${W - dw - 16}" y="${H - dh - 16}" width="${dw}" height="${dh}" fill="${RED}" fill-opacity=".35" stroke="${RED}" stroke-width="2"/>
<g font-family="JetBrains Mono" font-size="16" fill="${G}"><text x="${m + 6}" y="${m + 82}">RUBRIQUE</text><text x="${m + s + 12}" y="${H - m - 8}">SCEAU ${s} px</text><text x="${m + 6}" y="${m - 14}">MARGE ${m} px</text><text x="${W - dw - 16}" y="${H - dh - 26}" fill="${RED}">ZONE DURÉE</text></g>`, 'grille miniature YouTube 1280×720 (guides)'));
  const CW = 1080, CH = 1350, cm = v('layout.carousel.margin').value;
  put('PS_GRID_carrousel-1080x1350.svg', svg(CW, CH, `<g fill="none" stroke="${G}" stroke-width="2"><rect x="${cm}" y="${cm}" width="${CW - 2 * cm}" height="${CH - 2 * cm}" stroke-dasharray="10 8"/><line x1="${cm}" y1="${cm + 70}" x2="${CW - cm}" y2="${cm + 70}"/><rect x="${CW - cm - 160}" y="${CH - cm - 40}" width="160" height="40"/></g><g font-family="JetBrains Mono" font-size="18" fill="${G}"><text x="${cm}" y="${cm + 100}">MASTHEAD</text><text x="${CW - cm - 160}" y="${CH - cm - 50}">PAGINATION</text></g>`, 'grille carrousel 1080×1350 (guides)')); }

console.log(`${Object.keys(files).length} SVG -> brand/04_elements/svg`);

// 7. PNG transparents 1x et 2x (polices locales embarquées par @font-face)
if (!process.argv.includes('--no-png')) {
  let chromium;
  try { ({ chromium } = createRequire(import.meta.url)('playwright')); } catch { console.warn('Playwright absent : PNG non générés (npm i -D playwright).'); process.exit(0); }
  const fontsDir = join(ROOT, 'brand/03_fonts');
  const ff = (fam, file, w) => `@font-face{font-family:"${fam}";src:url("${pathToFileURL(join(fontsDir, file))}");font-weight:${w}}`;
  const head = `<style>${ff('JetBrains Mono', 'JetBrainsMono-Regular.ttf', 400)}${ff('JetBrains Mono', 'JetBrainsMono-Bold.ttf', 700)}html,body{margin:0;background:transparent}svg{display:block}</style>`;
  const browser = await chromium.launch();
  for (const scale of [1, 2]) {
    const page = await browser.newPage({ deviceScaleFactor: scale });
    for (const [name, content] of Object.entries(files)) {
      const [, w, h] = content.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
      await page.setViewportSize({ width: Math.ceil(+w), height: Math.ceil(+h) });
      await page.setContent(head + content, { waitUntil: 'load' });
      await page.evaluate(() => document.fonts.ready);
      await page.locator('svg').screenshot({ path: join(PNG, basename(name, '.svg') + (scale === 1 ? '' : `@${scale}x`) + '.png'), omitBackground: true });
    }
    await page.close();
  }
  await browser.close();
  console.log(`${readdirSync(PNG).length} PNG -> brand/04_elements/png`);
}
