// Primestone · visuels de la page d'accueil : compositions de Motion Studio rendues par son propre moteur (JPG, accueil/).
// Usage : node tools/gen-accueil.mjs
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'), OUT = join(ROOT, 'accueil');
const { chromium } = createRequire(import.meta.url)('playwright');
const { demarrer } = await import(join(ROOT, 'tools/serve.mjs'));
mkdirSync(OUT, { recursive: true });
const srv = await demarrer(4321), b = await chromium.launch(), p = await b.newPage({ viewport: { width: 1400, height: 900 } });
await p.goto('http://localhost:4321/atelier/motion/'); await p.waitForFunction(() => window.__studio?.S?.derniere);
for (const [nom, modele, direction, w, h] of [['motion-personnage', 'personnage', 'noir', 1600, 900], ['motion-evenement', 'evenement', 'cosmos', 1600, 900], ['motion-equipe', 'equipe', 'pop', 1600, 900], ['motion-annonce', 'annonce', 'nuit', 1080, 1350]]) {
  const b64 = await p.evaluate(async ([modele, direction, w, h]) => {
    const S = await import('../../templates/_systeme/studio.js'), PH = (await import('../../templates/_systeme/placeholders.js')).default;
    const placeholder = (n) => (PH[n] ? { href: '../../' + PH[n].src, w: PH[n].w, h: PH[n].h } : null);
    await window.__studio.charger(S.docDepuisModele(modele, { direction, w, h, placeholder }));
    const sc = await window.__studio.scenePrete(null, { final: true }), c = Object.assign(document.createElement('canvas'), { width: w, height: h });
    await window.__studio.ctx.rendu.precharger(sc); window.__studio.ctx.rendu.dessiner(c.getContext('2d'), sc, w / sc.w);
    return c.toDataURL('image/jpeg', 0.84).split(',')[1];
  }, [modele, direction, w, h]);
  writeFileSync(join(OUT, `${nom}.jpg`), Buffer.from(b64, 'base64')); console.log(`accueil/${nom}.jpg`);
}
await b.close(); srv.close();
