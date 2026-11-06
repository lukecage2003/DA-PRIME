// Primestone · illustrations de substitution (PLACEHOLDER) : créations originales vectorielles, sans valeur de marque,
// rendues en JPG (1600 × 900) et en PNG transparent (1200 × 1200) par Chromium. Déterministes (aléas à graine fixe).
// Usage : node tools/gen-placeholders.mjs [dossier]   (par défaut brand/99_tests/substitution)
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'), OUT = process.argv[2] || join(ROOT, 'brand/99_tests/substitution');
const { chromium } = createRequire(import.meta.url)('playwright');
const alea = (g) => () => { g = (g + 0x6d2b79f5) >>> 0; let t = g; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const f = (n) => Math.round(n * 10) / 10;
const points = (w, h, cell, fn, col) => { let s = ''; for (let y = 0; y < h + cell; y += cell) for (let x = (y / cell) % 2 ? cell / 2 : 0; x < w + cell; x += cell) { const r = fn(x / w, y / h) * cell * 0.55; if (r > 0.4) s += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}"/>`; } return `<g fill="${col}">${s}</g>`; };
const rayons = (cx, cy, R, n, rot = 0) => { let d = ''; for (let i = 0; i < n; i++) { const a = rot + (i / n) * Math.PI * 2, b = a + Math.PI / n; d += `M${cx} ${cy}L${f(cx + Math.cos(a) * R)} ${f(cy + Math.sin(a) * R)}L${f(cx + Math.cos(b) * R)} ${f(cy + Math.sin(b) * R)}Z`; } return d; };

// 1. Pop : comète embrasée au-dessus d'une ville, explosion de trame Ben-Day, lignes de vitesse
function pop() {
  const W = 1600, H = 900, r = alea(11); let villes = '', fen = '', vit = '';
  for (let x = -20, i = 0; x < W; i++) { const w = 60 + r() * 110, h = 120 + r() * 260 * (Math.abs(x - 1050) < 400 ? 1.3 : 1); villes += `<rect x="${f(x)}" y="${f(H - h)}" width="${f(w)}" height="${f(h)}"/>`;
    for (let yy = H - h + 16; yy < H - 10; yy += 22) for (let xx = x + 10; xx < x + w - 12; xx += 18) if (r() < 0.32) fen += `<rect x="${f(xx)}" y="${f(yy)}" width="8" height="11"/>`; x += w + 4; }
  for (let i = 0; i < 70; i++) { const t = r(), x0 = 240 + t * 900, y0 = 120 + t * 420 + (r() - 0.5) * 200, l = 160 + r() * 420; vit += `<path d="M${f(x0)} ${f(y0)}L${f(x0 - l)} ${f(y0 - l * 0.46 - 4)}L${f(x0 - l)} ${f(y0 - l * 0.46 + 4)}Z"/>`; }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><radialGradient id="s" cx="72%" cy="58%" r="70%"><stop offset="0" stop-color="#FFF6B0"/><stop offset=".25" stop-color="#FFD12A"/><stop offset=".6" stop-color="#FF7A1A"/><stop offset="1" stop-color="#C8102E"/></radialGradient>
<linearGradient id="q" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".3" stop-color="#FFE45C"/><stop offset="1" stop-color="#FF5A1F" stop-opacity="0"/></linearGradient></defs>
<rect width="${W}" height="${H}" fill="url(#s)"/>
<path d="${rayons(1150, 520, 2200, 22, 0.1)}" fill="#FFFFFF" opacity=".16"/>
${points(W, H, 22, (x, y) => Math.min(1, Math.hypot(x - 0.72, y - 0.58) * 1.35), '#B3001E')}
<g fill="#FFF3C4" opacity=".28">${vit}</g>
<g transform="translate(1150 520) rotate(-25)"><ellipse rx="640" ry="70" cx="-420" fill="url(#q)"/><ellipse rx="300" ry="22" cx="-150" fill="#FFFFFF" opacity=".85"/>
<circle r="110" fill="#FFFFFF" opacity=".35"/><circle r="62" fill="#FFF8D6"/><circle r="34" cx="-8" cy="-8" fill="#FFFFFF"/></g>
<path d="${rayons(1150, 520, 150, 16, 0.2)}" fill="#FFFFFF" opacity=".55"/>
<g fill="#1A0006">${villes}</g><g fill="#FFC93C" opacity=".85">${fen}</g>
<rect y="${H - 26}" width="${W}" height="26" fill="#1A0006"/>
</svg>`;
}
// 2. Noir : ville sous la pluie, projecteurs, silhouette en imperméable sur un toit
function noir() {
  const W = 1600, H = 900, r = alea(23); let plans = '', pluie = '';
  for (const [k, c, base] of [[0.45, '#1B2338', 560], [0.75, '#121827', 640], [1, '#0A0E17', 720]]) { let s = ''; for (let x = -30; x < W;) { const w = (70 + r() * 130) * k + 30, h = (150 + r() * 330) * k; s += `<rect x="${f(x)}" y="${f(base - h)}" width="${f(w)}" height="${f(h + 400)}"/>`;
      let fen = ''; for (let y = base - h + 14; y < base; y += 20 * k + 6) for (let xx = x + 8; xx < x + w - 10; xx += 14 * k + 6) if (r() < 0.18 * k) fen += `<rect x="${f(xx)}" y="${f(y)}" width="${f(5 * k + 2)}" height="${f(7 * k + 2)}"/>`;
      s += `<g fill="#FFD27A" opacity="${0.35 + k * 0.5}">${fen}</g>`; x += w + 6 * k; } plans += `<g fill="${c}">${s}</g>`; }
  for (let i = 0; i < 420; i++) { const x = r() * W, y = r() * H, l = 18 + r() * 40; pluie += `<path d="M${f(x)} ${f(y)}l${f(-l * 0.18)} ${f(l)}"/>`; }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><linearGradient id="c" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#050812"/><stop offset=".7" stop-color="#1E2A47"/><stop offset="1" stop-color="#2D3A5E"/></linearGradient>
<linearGradient id="f" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#DDE6FF" stop-opacity=".55"/><stop offset="1" stop-color="#DDE6FF" stop-opacity="0"/></linearGradient>
<radialGradient id="l" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#F4F1E6"/><stop offset=".55" stop-color="#E9E3CF" stop-opacity=".25"/><stop offset="1" stop-color="#E9E3CF" stop-opacity="0"/></radialGradient></defs>
<rect width="${W}" height="${H}" fill="url(#c)"/>
<circle cx="1260" cy="210" r="260" fill="url(#l)"/><circle cx="1260" cy="210" r="92" fill="#F4F1E6"/>
<path d="M420 900L130 0L330 0Z" fill="url(#f)" opacity=".6"/><path d="M980 900L1180 0L1360 0Z" fill="url(#f)" opacity=".45"/>
${plans}
<g fill="#04060B"><path d="M1060 330H1600V900H1060z"/><path d="M1040 318h580v16H1040z"/><rect x="1460" y="250" width="60" height="80"/><path d="M1480 250v-60h6v60z"/></g>
<g fill="#04060B" transform="translate(1238 186) scale(1.06)"><path d="M18 0c18 0 30 10 32 26l-4 4c10 6 14 18 14 30l12 74H-12l12-74c0-12 4-24 14-30l-4-4C12 10 2 0 18 0z"/><path d="M-6 14h52l6 8H-12z"/><rect x="-2" y="134" width="14" height="0"/></g>
<g stroke="#9FB2E6" stroke-width="1.6" opacity=".35">${pluie}</g>
<rect y="${H - 40}" width="${W}" height="40" fill="#05070C" opacity=".8"/>
</svg>`;
}
// 3. Cosmos : nébuleuse, planète à anneaux, champ d'étoiles, filaments d'énergie
function cosmos() {
  const W = 1600, H = 900, r = alea(37); let et = '', filaments = '';
  for (let i = 0; i < 900; i++) { const x = r() * W, y = r() * H, s = r() ** 3 * 2.6 + 0.4; et += `<circle cx="${f(x)}" cy="${f(y)}" r="${f(s)}" opacity="${f(0.35 + r() * 0.65)}"/>`; }
  for (let i = 0; i < 9; i++) { let x = 300 + r() * 500, y = 200 + r() * 500, d = `M${f(x)} ${f(y)}`; for (let j = 0; j < 7; j++) { x += (r() - 0.3) * 140; y += (r() - 0.5) * 120; d += `L${f(x)} ${f(y)}`; } filaments += `<path d="${d}"/>`; }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><filter id="n" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".0045" numOctaves="5" seed="8"/><feColorMatrix values="0 0 0 0 .55  0 0 0 0 .2  0 0 0 0 .9  0 0 0 1.6 -.6"/></filter>
<filter id="n2" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".008" numOctaves="4" seed="3"/><feColorMatrix values="0 0 0 0 .1  0 0 0 0 .75  0 0 0 0 .95  0 0 0 1.8 -.95"/></filter>
<radialGradient id="p" cx="35%" cy="30%" r="75%"><stop offset="0" stop-color="#FFE7B3"/><stop offset=".45" stop-color="#E0743A"/><stop offset="1" stop-color="#3A0C2E"/></radialGradient>
<radialGradient id="g" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#FFFFFF"/><stop offset=".2" stop-color="#C9B6FF" stop-opacity=".7"/><stop offset="1" stop-color="#6A4BFF" stop-opacity="0"/></radialGradient>
<filter id="flou"><feGaussianBlur stdDeviation="6"/></filter></defs>
<rect width="${W}" height="${H}" fill="#04030F"/>
<rect width="${W}" height="${H}" filter="url(#n)" opacity=".95"/><rect width="${W}" height="${H}" filter="url(#n2)" opacity=".7"/>
<g fill="#FFFFFF">${et}</g>
<circle cx="520" cy="420" r="260" fill="url(#g)"/>
<circle cx="300" cy="700" r="200" fill="url(#g)" opacity=".45"/>
<g transform="translate(1180 560) rotate(-16)"><ellipse rx="430" ry="78" fill="none" stroke="#F3C98B" stroke-width="20" opacity=".55"/>
<circle r="250" fill="url(#p)"/>
<path d="M-430 0a430 78 0 0 0 860 0" fill="none" stroke="#FFE2B0" stroke-width="12" opacity=".9"/></g>
</svg>`;
}
// 4. Encre : buste blindé à visière lumineuse, détouré (fond transparent), encrage et ombres tramées
function encre() {
  const W = 1200, H = 1200;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<defs><linearGradient id="a" x1="0" x2="1" y1="0" y2="1"><stop offset="0" stop-color="#3B4A73"/><stop offset=".55" stop-color="#1A2140"/><stop offset="1" stop-color="#0B0F22"/></linearGradient>
<linearGradient id="v" x1="0" x2="1"><stop offset="0" stop-color="#7FF6FF"/><stop offset=".5" stop-color="#FFFFFF"/><stop offset="1" stop-color="#5BE3FF"/></linearGradient>
<pattern id="t" width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="rotate(30)"><circle cx="7" cy="7" r="3.4" fill="#05070F"/></pattern>
<clipPath id="corps"><path id="cp" d="M600 120c140 0 236 98 244 236 4 70-10 128-40 170 120 26 230 76 300 150 30 34 46 80 46 130V1200H50V806c0-50 16-96 46-130 70-74 180-124 300-150-30-42-44-100-40-170 8-138 104-236 244-236z"/></clipPath>
<filter id="lu" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="16"/></filter></defs>
<g stroke="#05070F" stroke-width="22" stroke-linejoin="round">
<path d="M600 120c140 0 236 98 244 236 4 70-10 128-40 170 120 26 230 76 300 150 30 34 46 80 46 130V1200H50V806c0-50 16-96 46-130 70-74 180-124 300-150-30-42-44-100-40-170 8-138 104-236 244-236z" fill="url(#a)"/></g>
<g clip-path="url(#corps)">
<path d="M600 120c-60 0-110 20-150 60l150 520 150-520c-40-40-90-60-150-60z" fill="#4D5E8F" opacity=".55"/>
<path d="M120 760c100-70 220-110 360-126l120 566H80z" fill="#2A3560"/><path d="M1080 760c-100-70-220-110-360-126l-120 566h560z" fill="#121735"/>
<rect x="600" y="0" width="700" height="1200" fill="url(#t)" opacity=".55"/>
<path d="M600 740l92 150-92 150-92-150z" fill="#FFD23F" stroke="#05070F" stroke-width="12"/>
<path d="M600 790l58 100-58 100-58-100z" fill="#FF6B1A"/>
</g>
<g stroke="#05070F" stroke-width="14" fill="none" stroke-linecap="round"><path d="M396 526c60 40 130 56 204 56s144-16 204-56"/><path d="M230 820c40 40 60 120 60 380M970 820c-40 40-60 120-60 380"/></g>
<rect x="400" y="318" width="400" height="74" rx="37" fill="#5BE3FF" filter="url(#lu)" opacity=".9"/>
<rect x="410" y="326" width="380" height="58" rx="29" fill="url(#v)" stroke="#05070F" stroke-width="12"/>
<path d="M440 160c40-26 92-40 160-40" stroke="#B9C6F0" stroke-width="10" fill="none" stroke-linecap="round" opacity=".8"/>
</svg>`;
}
const b = await chromium.launch(), p = await b.newPage();
for (const [nom, svg, w, h, png] of [['pop', pop(), 1600, 900], ['noir', noir(), 1600, 900], ['cosmos', cosmos(), 1600, 900], ['encre', encre(), 1200, 1200, true]]) {
  await p.setViewportSize({ width: w, height: h }); await p.setContent(`<html><body style="margin:0;background:transparent">${svg}</body></html>`);
  const fichier = join(OUT, `PLACEHOLDER_art-${nom}.${png ? 'png' : 'jpg'}`);
  await p.screenshot({ path: fichier, type: png ? 'png' : 'jpeg', quality: png ? undefined : 88, omitBackground: !!png, clip: { x: 0, y: 0, width: w, height: h } });
  console.log(fichier);
}
await b.close();
