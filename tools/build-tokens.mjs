// Primestone · génère les exports des design tokens à partir de brand/02_tokens/tokens.json (DTCG 2025.10).
// Usage : node tools/build-tokens.mjs        Aucune dépendance externe.
// Sorties (brand/02_tokens/build/) : tokens.css, tokens.flat.json, Primestone.ase
//          + templates/common/primestone-tokens.jsxinc (ExtendScript, compatible ES3)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'brand/02_tokens/tokens.json');
const OUT = join(ROOT, 'brand/02_tokens/build');
const JSX = join(ROOT, 'templates/common/primestone-tokens.jsxinc');
const tree = JSON.parse(readFileSync(SRC, 'utf8'));
const meta = tree.$extensions?.['media.primestone'] ?? {};

// 1. Aplatir : chemin -> { type, value, description }, avec héritage de $type
const flat = {};
(function walk(node, path, inheritedType) {
  const type = node.$type ?? inheritedType;
  if ('$value' in node) { flat[path.join('.')] = { type, value: node.$value, description: node.$description }; return; }
  for (const [k, v] of Object.entries(node)) if (!k.startsWith('$') && v && typeof v === 'object') walk(v, [...path, k], type);
})(tree, [], undefined);

// 2. Résoudre les alias {a.b.c}
const resolve = (v, seen = []) => {
  if (typeof v === 'string' && /^\{[^}]+\}$/.test(v)) {
    const ref = v.slice(1, -1);
    if (!flat[ref]) throw new Error(`Alias introuvable : ${v}`);
    if (seen.includes(ref)) throw new Error(`Alias circulaire : ${[...seen, ref].join(' -> ')}`);
    return resolve(flat[ref].value, [...seen, ref]);
  }
  if (Array.isArray(v)) return v.map((x) => resolve(x, seen));
  if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, resolve(x, seen)]));
  return v;
};
for (const t of Object.values(flat)) t.resolved = resolve(t.value);

// 3. Contrôles
const errors = [];
for (const [p, t] of Object.entries(flat)) {
  if (!t.type) errors.push(`${p} : $type manquant`);
  if (t.type === 'color') {
    const { components: c, hex } = t.resolved;
    const h = '#' + c.map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
    if (hex && h !== hex.toUpperCase()) errors.push(`${p} : composantes ${h} ≠ hex ${hex}`);
  }
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }

// 4. Formatage
const hexOf = (c) => c.hex.toUpperCase();
const cssVal = (t) => {
  const v = t.resolved;
  switch (t.type) {
    case 'color': return hexOf(v);
    case 'dimension': case 'duration': return `${v.value}${v.unit}`;
    case 'fontFamily': return v.map((f) => (/\s/.test(f) ? `"${f}"` : f)).join(', ');
    case 'cubicBezier': return `cubic-bezier(${v.join(', ')})`;
    case 'typography': return null;
    default: return String(v);
  }
};
const cssName = (p) => '--ps-' + p.replace(/\./g, '-');
mkdirSync(OUT, { recursive: true });

let css = `/* Primestone · design tokens v${meta.version} (${meta.statut}) · généré, ne pas éditer */\n:root {\n`;
for (const [p, t] of Object.entries(flat)) {
  if (t.type === 'typography') {
    const v = t.resolved;
    css += `  ${cssName(p)}-family: ${cssVal({ type: 'fontFamily', resolved: v.fontFamily })};\n  ${cssName(p)}-size: ${v.fontSize.value}${v.fontSize.unit};\n  ${cssName(p)}-weight: ${v.fontWeight};\n  ${cssName(p)}-line-height: ${v.lineHeight};\n  ${cssName(p)}-letter-spacing: ${v.letterSpacing.value}${v.letterSpacing.unit};\n`;
  } else css += `  ${cssName(p)}: ${cssVal(t)};\n`;
}
css += '}\n';
writeFileSync(join(OUT, 'tokens.css'), css);

const flatOut = { version: meta.version, statut: meta.statut, postscript: meta.postscript, tokens: Object.fromEntries(Object.entries(flat).map(([p, t]) => [p, { type: t.type, value: t.type === 'color' ? hexOf(t.resolved) : t.resolved, ...(t.description ? { description: t.description } : {}) }])) };
writeFileSync(join(OUT, 'tokens.flat.json'), JSON.stringify(flatOut, null, 2) + '\n');

// 5. ExtendScript (ES3 : pas de JSON natif dans Photoshop, littéral objet uniquement)
const rgb255 = (c) => c.components.map((x) => Math.round(x * 255));
const jsxColors = Object.entries(flat).filter(([, t]) => t.type === 'color').map(([p, t]) => `    "${p.replace(/^color\./, '')}": { hex: "${hexOf(t.resolved)}", rgb: [${rgb255(t.resolved).join(', ')}] }`);
const num = (p) => flat[p].resolved;
const dim = (p) => flat[p].resolved.value;
const jsx = `// Primestone · tokens pour scripts Adobe (Photoshop, Illustrator, After Effects)
// Version ${meta.version} (${meta.statut}) · GÉNÉRÉ par tools/build-tokens.mjs · ne pas éditer à la main.
// Inclusion :  #include "../../common/primestone-tokens.jsxinc"
var PRIMESTONE = {
  version: "${meta.version}",
  statut: "${meta.statut}",
  colors: {
${jsxColors.join(',\n')}
  },
  fonts: {
${Object.entries(meta.postscript).map(([k, v]) => `    "${k}": "${v}"`).join(',\n')}
  },
  motif: { incisionAngle: ${num('motif.incision-angle')}, sealRadiusRatio: ${num('motif.seal-radius-ratio')}, sealGlyphBox: ${num('motif.seal-glyph-box')}, inkOutlineRatio: ${num('motif.ink-outline-ratio')} },
  thumbnail: { width: ${dim('format.youtube-thumbnail.width')}, height: ${dim('format.youtube-thumbnail.height')}, margin: ${dim('layout.thumbnail.margin')}, seal: ${dim('layout.thumbnail.seal-size')}, deadZoneW: ${dim('layout.thumbnail.dead-zone-width')}, deadZoneH: ${dim('layout.thumbnail.dead-zone-height')} },
  carousel: { width: ${dim('format.carousel.width')}, height: ${dim('format.carousel.height')}, margin: ${dim('layout.carousel.margin')} },
  motion: { fps: ${num('motion.fps')}, fast: ${dim('motion.duration.fast')}, base: ${dim('motion.duration.base')}, slow: ${dim('motion.duration.slow')}, easing: [${num('motion.easing.primestone').join(', ')}] }
};
`;
mkdirSync(dirname(JSX), { recursive: true });
writeFileSync(JSX, jsx);

// 6. Adobe Swatch Exchange (.ase) : Photoshop, Illustrator, InDesign
const groups = {};
for (const [p, t] of Object.entries(flat)) {
  if (t.type !== 'color' || p.startsWith('color.data') || p.startsWith('color.legacy')) continue;
  const g = p.split('.')[1]; (groups[g] ??= []).push([`Primestone ${p.split('.').slice(2).join(' ')}`, t.resolved]);
}
const chunks = [];
const u16 = (n) => { const b = Buffer.alloc(2); b.writeUInt16BE(n); return b; };
const u32 = (n) => { const b = Buffer.alloc(4); b.writeUInt32BE(n); return b; };
const name = (s) => { const b = Buffer.alloc((s.length + 1) * 2); for (let i = 0; i < s.length; i++) b.writeUInt16BE(s.charCodeAt(i), i * 2); return Buffer.concat([u16(s.length + 1), b]); };
let blocks = 0;
for (const [g, list] of Object.entries(groups)) {
  const gn = name(`Primestone · ${g}`); chunks.push(u16(0xc001), u32(gn.length), gn); blocks++;
  for (const [n, c] of list) {
    const f = Buffer.alloc(12); c.components.forEach((x, i) => f.writeFloatBE(x, i * 4));
    const body = Buffer.concat([name(n), Buffer.from('RGB '), f, u16(0)]); // 0 = couleur globale
    chunks.push(u16(0x0001), u32(body.length), body); blocks++;
  }
  chunks.push(u16(0xc002), u32(0)); blocks++;
}
writeFileSync(join(OUT, 'Primestone.ase'), Buffer.concat([Buffer.from('ASEF'), u16(1), u16(0), u32(blocks), ...chunks]));

console.log(`tokens v${meta.version} : ${Object.keys(flat).length} tokens -> tokens.css, tokens.flat.json, Primestone.ase (${blocks} blocs), primestone-tokens.jsxinc`);
