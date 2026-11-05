// Primestone · génère les exports des design tokens à partir de brand/02_tokens/tokens.json (DTCG 2025.10).
// Usage : node tools/build-tokens.mjs        Aucune dépendance externe.
// Sorties (brand/02_tokens/build/) : tokens.css, tokens.flat.json (formats ouverts)
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'brand/02_tokens/tokens.json');
const OUT = join(ROOT, 'brand/02_tokens/build');
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

const flatOut = { version: meta.version, statut: meta.statut, tokens: Object.fromEntries(Object.entries(flat).map(([p, t]) => [p, { type: t.type, value: t.type === 'color' ? hexOf(t.resolved) : t.resolved, ...(t.description ? { description: t.description } : {}) }])) };
writeFileSync(join(OUT, 'tokens.flat.json'), JSON.stringify(flatOut, null, 2) + '\n');

console.log(`tokens v${meta.version} : ${Object.keys(flat).length} tokens -> tokens.css, tokens.flat.json`);
