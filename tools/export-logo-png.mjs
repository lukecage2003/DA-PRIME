// Primestone · exporte la vectorisation NON OFFICIELLE du logo en PNG transparents de plusieurs largeurs.
// Usage : node tools/export-logo-png.mjs     Sortie : brand/01_logo/NON-OFFICIEL/png/
import { readdirSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const D = join(ROOT, 'brand/01_logo/NON-OFFICIEL'), OUT = join(D, 'png');
const WIDTHS = { 'PS_LOGO_logotype': [480, 960, 1920, 3840], 'PS_LOGO_icone-P': [64, 128, 256, 512] };
rmSync(OUT, { recursive: true, force: true }); mkdirSync(OUT, { recursive: true });
const { chromium } = createRequire(import.meta.url)('playwright');
const b = await chromium.launch(); const p = await b.newPage(); let n = 0;
for (const f of readdirSync(D).filter((x) => x.endsWith('.svg'))) {
  const src = readFileSync(join(D, f), 'utf8'); const [, vw, vh] = src.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
  for (const w of WIDTHS[Object.keys(WIDTHS).find((k) => f.startsWith(k))]) {
    const h = Math.round((w * vh) / vw);
    await p.setViewportSize({ width: w, height: h });
    await p.setContent(`<style>html,body{margin:0;background:transparent}svg{display:block;width:${w}px;height:${h}px}</style>${src}`);
    await p.locator('svg').screenshot({ path: join(OUT, `${basename(f, '.svg').replace('_NON-OFFICIEL', '')}_${w}px_NON-OFFICIEL.png`), omitBackground: true }); n++;
  }
}
await b.close(); console.log(`${n} PNG -> ${OUT}`);
