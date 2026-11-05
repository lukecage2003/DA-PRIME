// Primestone · génère catalog/brand-manifest.json en parcourant les dossiers déclarés dans catalog/catalog.config.json.
// Usage : node tools/build-manifest.mjs [--check]   (--check : échoue si le manifeste committé n'est pas à jour)
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join, relative, extname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const cfg = JSON.parse(readFileSync(join(ROOT, 'catalog/catalog.config.json'), 'utf8'));
const fonts = JSON.parse(readFileSync(join(ROOT, 'brand/03_fonts/fonts.json'), 'utf8'));
const OUT = join(ROOT, 'catalog/brand-manifest.json');
const IGNORE = /(^|\/)(\.|README|.*\.md$|fonts\.json$|CHECKSUMS)/;

const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');
const dims = (p, buf) => {
  if (p.endsWith('.png')) return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  if (p.endsWith('.jpg')) { for (let i = 2; i < buf.length;) { const m = buf[i + 1], l = buf.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xc3) return { width: buf.readUInt16BE(i + 7), height: buf.readUInt16BE(i + 5) }; i += 2 + l; } }
  if (p.endsWith('.svg')) { const m = buf.toString('utf8', 0, 600).match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/); if (m) return { width: +m[1], height: +m[2] }; }
  return {};
};
const stemOf = (p) => basename(p, extname(p)).replace(/@\dx$/, '').replace(/_\d+px(?=_|$)/, '');
const slug = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const KIND = { LOGO: 'logo', EL: 'element', GRID: 'grille', MIN: 'gabarit-miniature' };
const title = (stem) => { const s = stem.replace(/^PS_[A-Z]+_/, '').replace(/_NON-OFFICIEL$/, '').replace(/[-_]/g, ' '); return s.charAt(0).toUpperCase() + s.slice(1); };

const assets = new Map();
for (const f of cfg.folders) {
  for (const abs of walk(join(ROOT, f.path))) {
    const rel = relative(ROOT, abs).split('\\').join('/');
    const inner = relative(join(ROOT, f.path), abs).split('\\').join('/');
    if (IGNORE.test(inner) || (f.exclude || []).some((e) => inner.startsWith(e))) continue;
    const buf = readFileSync(abs); const stem = stemOf(abs);
    let id, ttl, kind;
    if (f.groupBy === 'fontFamily') {
      if (!/\.(ttf|otf|woff2)$/.test(abs) && !/OFL\.txt$/.test(abs)) continue;
      const famOf = (x) => x.family.replace(/ Condensed$/, '');
      const key = /OFL\.txt$|\.woff2$/.test(abs) ? basename(abs).split('-')[0].toLowerCase() : famOf(fonts.find((x) => x.file === inner)).replace(/\s/g, '').toLowerCase();
      const fam = famOf(fonts.find((x) => x.family.replace(/\s/g, '').toLowerCase().startsWith(key)));
      id = `police-${slug(fam)}`; ttl = `Police ${fam}`; kind = 'police';
    } else if (f.groupAs === 'tokens') { id = 'tokens'; ttl = 'Design tokens'; kind = 'tokens'; }
    else { id = slug(stem.replace(/^PS_/, '')); ttl = title(stem); kind = KIND[stem.split('_')[1]] || 'fichier'; }
    const a = assets.get(id) ?? { id, title: ttl, category: f.category, kind, status: /NON-OFFICIEL/.test(rel) ? 'non-officiel' : f.status, version: cfg.release.version, tags: [...new Set(slug(stem.replace(/^PS_/, '')).split('-').filter((t) => t.length > 2))], usage: f.usage, preview: null, files: [] };
    const scale = (abs.match(/@(\d)x\.\w+$/) || [])[1];
    a.files.push({ path: rel, format: extname(abs).slice(1).toLowerCase(), bytes: buf.length, sha256: sha(abs), ...dims(abs, buf), ...(scale ? { scale: +scale } : {}) });
    assets.set(id, a);
  }
}
for (const a of assets.values()) {
  a.files.sort((x, y) => x.path.localeCompare(y.path));
  const pv = a.files.find((x) => x.format === 'jpg') || a.files.find((x) => x.format === 'png' && !x.scale && (x.width || 0) <= 1300) || a.files.find((x) => x.format === 'svg') || a.files.find((x) => x.format === 'png');
  a.preview = pv ? pv.path : null;
}
const tokensPath = 'brand/02_tokens/tokens.json';
const manifest = { $schema: '../schemas/brand-manifest.schema.json', schemaVersion: 1, name: 'primestone-brand', release: cfg.release,
  tokens: { path: tokensPath, format: 'json', bytes: statSync(join(ROOT, tokensPath)).size, sha256: sha(join(ROOT, tokensPath)) },
  assets: [...assets.values()].sort((x, y) => x.category.localeCompare(y.category) || x.id.localeCompare(y.id)) };

// Contrôles minimaux (le schéma complet est dans schemas/)
const errs = [];
const ids = new Set();
for (const a of manifest.assets) { if (ids.has(a.id)) errs.push(`id dupliqué ${a.id}`); ids.add(a.id); if (!/^[a-z0-9][a-z0-9-]*$/.test(a.id)) errs.push(`id invalide ${a.id}`); }
if (errs.length) { console.error(errs.join('\n')); process.exit(1); }

const json = JSON.stringify(manifest, null, 2) + '\n';
if (process.argv.includes('--check')) {
  const cur = (() => { try { return readFileSync(OUT, 'utf8'); } catch { return ''; } })();
  if (cur !== json) { console.error('catalog/brand-manifest.json n\'est pas à jour : lancer npm run build'); process.exit(1); }
  console.log('Manifeste à jour.'); process.exit(0);
}
writeFileSync(OUT, json);
const by = {}; for (const a of manifest.assets) by[a.category] = (by[a.category] || 0) + 1;
console.log(`manifest v${cfg.release.version} : ${manifest.assets.length} ressources, ${manifest.assets.reduce((n, a) => n + a.files.length, 0)} fichiers`, by);
