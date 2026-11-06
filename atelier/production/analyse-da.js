// Production · analyse locale d'une image de référence (aucun envoi) → profil de direction artistique réutilisable.
// Mesuré réellement : palette dominante, luminosité, contraste, saturation, température, densité de texture,
// masse et position du sujet, répartition des lumières. NON mesurable sans IA : polices exactes, intention, traitement
// précis des personnages — ces champs restent déclaratifs (choix de l'utilisateur) et sont signalés comme tels.
const hex = (r, g, b) => '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('').toUpperCase();
const lum = ([r, g, b]) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
const sat = ([r, g, b]) => { const M = Math.max(r, g, b), m = Math.min(r, g, b); return M ? (M - m) / M : 0; };
const teinte = ([r, g, b]) => { const M = Math.max(r, g, b), m = Math.min(r, g, b), d = M - m; if (!d) return 0; const h = M === r ? ((g - b) / d) % 6 : M === g ? (b - r) / d + 2 : (r - g) / d + 4; return (h * 60 + 360) % 360; };
const contrasteWCAG = (a, b) => { const l = (c) => { const v = c / 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }, L = (x) => 0.2126 * l(x[0]) + 0.7152 * l(x[1]) + 0.0722 * l(x[2]); const [x, y] = [L(a), L(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const versRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));

// Quantification « median cut » sur un échantillon de pixels
function medianCut(px, n) {
  let boites = [px];
  while (boites.length < n) {
    let bi = -1, be = -1, ax = 0;
    boites.forEach((b, i) => { if (b.length < 2) return; for (let c = 0; c < 3; c++) { let lo = 255, hi = 0; for (const p of b) { if (p[c] < lo) lo = p[c]; if (p[c] > hi) hi = p[c]; } if ((hi - lo) * Math.sqrt(b.length) > be) { be = (hi - lo) * Math.sqrt(b.length); bi = i; ax = c; } } });
    if (bi < 0) break; const b = boites[bi].sort((p, q) => p[ax] - q[ax]), m = b.length >> 1; boites.splice(bi, 1, b.slice(0, m), b.slice(m));
  }
  return boites.map((b) => { const s = [0, 0, 0]; for (const p of b) { s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; } return { rgb: s.map((v) => v / b.length), part: b.length / px.length }; }).sort((a, b) => b.part - a.part);
}

// data : RGBA (ImageData.data), w × h
export function analyserPixels(data, w, h) {
  const px = [], pas = Math.max(1, Math.floor(Math.sqrt((w * h) / 12000)));
  let sl = 0, sl2 = 0, ss = 0, chaud = 0, n = 0, bords = 0, mx = 0, my = 0, mp = 0, haut = 0, bas = 0;
  const L = (x, y) => { const i = (y * w + x) * 4; return (0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2]) / 255; };
  for (let y = 0; y < h; y += pas) for (let x = 0; x < w; x += pas) {
    const i = (y * w + x) * 4; if (data[i + 3] < 128) continue; const p = [data[i], data[i + 1], data[i + 2]], l = lum(p), s = sat(p);
    px.push(p); sl += l; sl2 += l * l; ss += s; n++; if (p[0] > p[2] + 12) chaud++; else if (p[2] > p[0] + 12) chaud--;
    if (x + pas < w && y + pas < h && Math.abs(L(x + pas, y) - l) + Math.abs(L(x, y + pas) - l) > 0.18) bords++;
    if (y < h / 2) haut += l; else bas += l;
  }
  if (!n) throw new Error('image vide ou transparente');
  const moy = sl / n, ecart = Math.sqrt(Math.max(0, sl2 / n - moy * moy));
  const boites = medianCut(px, 8), fondRgb = boites[0].rgb;
  // Sujet : pixels éloignés de la couleur dominante (le fond) → masse et centre
  for (let y = 0; y < h; y += pas) for (let x = 0; x < w; x += pas) { const i = (y * w + x) * 4; if (data[i + 3] < 128) continue; const dist = Math.hypot(data[i] - fondRgb[0], data[i + 1] - fondRgb[1], data[i + 2] - fondRgb[2]) / 441; if (dist > 0.22) { mx += x * dist; my += y * dist; mp += dist; } }
  const couleurs = boites.filter((c) => c.part > 0.01).map((c) => ({ hex: hex(...c.rgb), part: +c.part.toFixed(3), lum: +lum(c.rgb).toFixed(2), sat: +sat(c.rgb).toFixed(2), teinte: Math.round(teinte(c.rgb)) }));
  // Répartition des zones visuelles (grille 3 × 3) : luminosité et densité graphique de chaque zone
  const zones = Array.from({ length: 9 }, () => ({ l: 0, b: 0, n: 0 }));
  for (let y = 0; y < h - pas; y += pas) for (let x = 0; x < w - pas; x += pas) { const i = (y * w + x) * 4; if (data[i + 3] < 128) continue; const z = zones[Math.min(2, Math.floor((3 * y) / h)) * 3 + Math.min(2, Math.floor((3 * x) / w))], l = L(x, y);
    z.l += l; z.n++; if (Math.abs(L(x + pas, y) - l) + Math.abs(L(x, y + pas) - l) > 0.18) z.b++; }
  // Dominantes colorées : familles de teintes des pixels saturés
  const FAM = [['rouge', 345, 15], ['orange', 15, 45], ['jaune', 45, 70], ['vert', 70, 165], ['cyan', 165, 200], ['bleu', 200, 255], ['violet', 255, 300], ['magenta', 300, 345]], fam = Object.fromEntries(FAM.map(([n]) => [n, 0])); let ns = 0;
  for (const p of px) { if (sat(p) < 0.3 || lum(p) < 0.12) continue; const t = teinte(p), f = FAM.find(([, a, b]) => (a > b ? t >= a || t < b : t >= a && t < b)); fam[f[0]]++; ns++; }
  const dominantes = Object.entries(fam).filter(([, v]) => ns && v / ns > 0.12).sort((a, b) => b[1] - a[1]).map(([n, v]) => ({ famille: n, part: +(v / ns).toFixed(2) }));
  const total = Math.max(1, haut + bas);
  return {
    w, h, couleurs, luminosite: +moy.toFixed(2), contraste: +ecart.toFixed(2), saturation: +(ss / n).toFixed(2), temperature: +(chaud / n).toFixed(2), texture: +(bords / n).toFixed(2),
    sujet: mp ? { cx: +(mx / mp / w).toFixed(2), cy: +(my / mp / h).toFixed(2), masse: +Math.min(1, mp / n / 0.5).toFixed(2) } : null, lumiere: haut / total > 0.58 ? 'haute' : bas / total > 0.58 ? 'basse' : 'équilibrée',
    orientation: w / h > 1.2 ? 'paysage' : h / w > 1.2 ? 'portrait' : 'carré',
    zones: zones.map((z) => ({ lum: z.n ? +(z.l / z.n).toFixed(2) : 0, densite: z.n ? +(z.b / z.n).toFixed(2) : 0 })), dominantes, densite: +(bords / n).toFixed(2),
  };
}

// Profil proposé à partir de l'analyse : jetons de couleur + système graphique le plus proche ; tout reste modifiable
export function proposerProfil(a, { nom = 'Profil importé', niveau = 'marque' } = {}) {
  const C = a.couleurs.map((c) => ({ ...c, rgb: versRgb(c.hex) })), sombre = a.luminosite < 0.45;
  const parLum = [...C].sort((x, y) => x.lum - y.lum), fond = sombre ? parLum[0] : parLum[parLum.length - 1];
  const encre = parLum[0], papier = sombre ? (C.filter((c) => c !== fond && c.lum < 0.5).sort((x, y) => y.part - x.part)[0] || parLum[1] || fond) : parLum[parLum.length - 2] || fond;
  const vifs = C.filter((c) => c.sat > 0.25 && c.lum > 0.15).sort((x, y) => y.sat * Math.sqrt(y.part) - x.sat * Math.sqrt(x.part));
  const accent = vifs[0] || C.filter((c) => c !== fond).sort((x, y) => Math.abs(y.lum - fond.lum) - Math.abs(x.lum - fond.lum))[0] || C[0];
  const ecartT = (c) => Math.min(Math.abs(c.teinte - accent.teinte), 360 - Math.abs(c.teinte - accent.teinte));
  const accent2 = vifs.find((c) => c !== accent && ecartT(c) > 40) || C.find((c) => c !== accent && c !== fond && c !== encre) || accent;
  // Texte : la couleur claire ou sombre la plus lisible sur le fond (contraste WCAG ≥ 4,5 visé)
  const cands = [...C.map((c) => c.hex), '#FFFFFF', '#111111'], texte = cands.map((x) => ({ x, k: contrasteWCAG(versRgb(x), fond.rgb) })).sort((p, q) => q.k - p.k)[0];
  const systeme = a.saturation > 0.45 && a.contraste > 0.22 ? 'comics' : sombre && C.some((c) => c.teinte > 220 && c.teinte < 300 && c.sat > 0.3) ? 'cosmique' : sombre ? 'cinema' : a.saturation < 0.2 && a.texture < 0.12 ? (a.contraste > 0.3 ? 'minimal' : 'editorial') : a.texture > 0.25 ? 'experimental' : 'editorial';
  const alertes = [];
  if (texte.k < 4.5) alertes.push(`Contraste texte/fond limité (${texte.k.toFixed(1)}:1) : prévoir un aplat ou un contour.`);
  if (!vifs.length) alertes.push('Image peu saturée : l\'accent proposé est une valeur, pas une couleur vive.');
  return {
    nom, niveau, systeme, couleurs: { fond: fond.hex, papier: papier.hex, encre: encre.hex, texte: texte.x, accent: accent.hex, accent2: accent2.hex },
    mesures: { luminosite: a.luminosite, contraste: a.contraste, saturation: a.saturation, temperature: a.temperature, texture: a.texture, lumiere: a.lumiere, sujet: a.sujet, orientation: a.orientation, zones: a.zones, dominantes: a.dominantes, densite: a.densite },
    nuancier: a.couleurs.map((c) => c.hex),
    // Zone la plus calme (faible densité) : emplacement naturel du texte dans les compositions de ce profil
    zoneTexte: a.zones ? ['haut-gauche', 'haut', 'haut-droite', 'gauche', 'centre', 'droite', 'bas-gauche', 'bas', 'bas-droite'][a.zones.map((z, i) => [z.densite, i]).sort((x, y) => x[0] - y[0])[0][1]] : null,
    sobriete: a.densite < 0.08 ? 'épurée' : a.densite > 0.22 ? 'chargée' : 'équilibrée',
    composition: { sujet: a.sujet ? (a.sujet.cx < 0.4 ? 'gauche' : a.sujet.cx > 0.6 ? 'droite' : 'centre') : 'indéterminé', masse: a.sujet?.masse ?? 0, lumiere: a.lumiere },
    // Déclaratif : non déductible de façon fiable par une analyse locale
    typographie: { titres: 'display', texte: 'textBold', casse: 'upper', note: 'À confirmer : les polices ne se reconnaissent pas automatiquement.' },
    traitement: { personnages: 'détourés avec contour', effets: a.texture > 0.2 ? 'trame et grain' : 'lumière douce', note: 'Choix éditables.' },
    alertes,
  };
}
export { contrasteWCAG };
