// Primestone · ambiances SVG des gabarits : lumière, atmosphère, matière, mise en scène des personnages.
// Briques déterministes (graine fixe) : le même gabarit produit toujours le même SVG. Chaque brique porte ses propres
// définitions (dégradés, motifs, filtres) sous un identifiant fourni par l'appelant, pour rester unique dans le document.
// Aucune brique ne modifie l'apparence d'un personnage : lumière de contour, ombres et halo sont posés autour ou par-dessus.
const r1 = (n) => Math.round(n * 10) / 10;
export function alea(graine = 1) { let a = graine >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const stops = (l) => l.map(([o, c, a = 1]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('');

// Dégradé linéaire plein cadre (angle en degrés, 0 = de gauche à droite)
export function degrade(id, W, H, liste, angle = 90, extra = '') {
  const a = (angle * Math.PI) / 180, x = Math.cos(a) / 2, y = Math.sin(a) / 2;
  return `<linearGradient id="${id}" x1="${r1(0.5 - x)}" y1="${r1(0.5 - y)}" x2="${r1(0.5 + x)}" y2="${r1(0.5 + y)}">${stops(liste)}</linearGradient><rect width="${W}" height="${H}" fill="url(#${id})"${extra}/>`;
}
// Halo de lumière (radial) ; forme = 'ellipse' étire horizontalement
export function halo(id, cx, cy, r, couleur, op = 0.85, { ry = r, blend } = {}) {
  return `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(r)}" gradientTransform="translate(${r1(cx)} ${r1(cy)}) scale(1 ${r1(ry / r * 100) / 100}) translate(${r1(-cx)} ${r1(-cy)})">${stops([[0, couleur, op], [0.45, couleur, op * 0.45], [1, couleur, 0]])}</radialGradient><ellipse cx="${r1(cx)}" cy="${r1(cy)}" rx="${r1(r)}" ry="${r1(ry)}" fill="url(#${id})"${blend ? ` style="mix-blend-mode:${blend}"` : ''}/>`;
}
// Vignettage : assombrit les bords, concentre le regard
export const vignette = (id, W, H, force = 0.7, cx = W / 2, cy = H / 2) => `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${r1(cx)}" cy="${r1(cy)}" r="${r1(Math.hypot(W, H) * 0.62)}">${stops([[0.45, '#000', 0], [1, '#000', force]])}</radialGradient><rect width="${W}" height="${H}" fill="url(#${id})"/>`;
// Rayons de lumière depuis un point (faisceaux qui s'estompent)
export function rayons(id, cx, cy, { n = 14, longueur = 1400, couleur = '#FFF', op = 0.35, ouverture = 0.5, graine = 3, debut = 0, fin = Math.PI * 2 } = {}) {
  const r = alea(graine); let p = '';
  for (let i = 0; i < n; i++) { const a = debut + ((fin - debut) * (i + r() * 0.6)) / n, w = (ouverture * (0.4 + r())) / n * Math.PI;
    p += `M${r1(cx)} ${r1(cy)}L${r1(cx + Math.cos(a - w) * longueur)} ${r1(cy + Math.sin(a - w) * longueur)}L${r1(cx + Math.cos(a + w) * longueur)} ${r1(cy + Math.sin(a + w) * longueur)}Z`; }
  return `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${r1(cx)}" cy="${r1(cy)}" r="${longueur}">${stops([[0, couleur, op], [0.7, couleur, op * 0.25], [1, couleur, 0]])}</radialGradient><path d="${p}" fill="url(#${id})"/>`;
}
// Lignes de vitesse (comics) convergeant vers un point, hors d'un disque central
export function vitesse(cx, cy, { n = 60, r0 = 260, r1: rr = 1100, couleur = '#000', op = 0.5, epaisseur = 7, graine = 5 } = {}) {
  const r = alea(graine); let p = '';
  for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2 + r() * 0.05, d0 = r0 * (0.9 + r() * 0.5), e = (epaisseur * (0.4 + r())) / d0;
    p += `M${r1(cx + Math.cos(a - e) * rr)} ${r1(cy + Math.sin(a - e) * rr)}L${r1(cx + Math.cos(a) * d0)} ${r1(cy + Math.sin(a) * d0)}L${r1(cx + Math.cos(a + e) * rr)} ${r1(cy + Math.sin(a + e) * rr)}Z`; }
  return `<path d="${p}" fill="${couleur}" opacity="${op}"/>`;
}
// Trame de points (Ben-Day) qui s'estompe selon un dégradé
export function trame(id, x, y, w, h, { couleur = '#000', pas = 16, rayon = 4.2, angle = 0, op = 0.5, fondu = 'gauche' } = {}) {
  const g = { gauche: [0, 0, 1, 0], droite: [1, 0, 0, 0], haut: [0, 0, 0, 1], bas: [0, 1, 0, 0], centre: null }[fondu];
  const masque = g ? `<linearGradient id="${id}-g" x1="${g[0]}" y1="${g[1]}" x2="${g[2]}" y2="${g[3]}">${stops([[0, '#fff', 1], [1, '#fff', 0]])}</linearGradient>` : `<radialGradient id="${id}-g">${stops([[0, '#fff', 0], [1, '#fff', 1]])}</radialGradient>`;
  return `<pattern id="${id}-p" width="${pas}" height="${pas}" patternUnits="userSpaceOnUse" patternTransform="rotate(${angle})"><circle cx="${pas / 2}" cy="${pas / 2}" r="${rayon}" fill="${couleur}"/></pattern>${masque}<mask id="${id}-m"><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id}-g)"/></mask><rect x="${x}" y="${y}" width="${w}" height="${h}" fill="url(#${id}-p)" mask="url(#${id}-m)" opacity="${op}"/>`;
}
// Grain photographique (bruit fractal), très léger
export const grain = (id, W, H, op = 0.08, graine = 7) => `<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="${graine}" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 0 0.5  0 0 0 1.6 -0.3"/></filter><rect width="${W}" height="${H}" filter="url(#${id})" opacity="${op}" style="mix-blend-mode:overlay"/>`;
// Champ d'étoiles (tailles et éclats variés)
export function etoiles(x, y, w, h, { n = 140, couleur = '#FFF', graine = 11, eclats = 5 } = {}) {
  const r = alea(graine); let s = '';
  for (let i = 0; i < n; i++) { const px = x + r() * w, py = y + r() * h, t = r() ** 3 * 2.4 + 0.5; s += `<circle cx="${r1(px)}" cy="${r1(py)}" r="${r1(t)}" fill="${couleur}" opacity="${r1(0.35 + r() * 0.65)}"/>`; }
  for (let i = 0; i < eclats; i++) { const px = x + r() * w, py = y + r() * h, l = 10 + r() * 16; s += `<path d="M${r1(px - l)} ${r1(py)}L${r1(px + l)} ${r1(py)}M${r1(px)} ${r1(py - l)}L${r1(px)} ${r1(py + l)}" stroke="${couleur}" stroke-width="1.6" opacity="0.8"/><circle cx="${r1(px)}" cy="${r1(py)}" r="2.6" fill="${couleur}"/>`; }
  return s;
}
// Nébuleuse : nuages flous superposés
export function nebuleuse(id, nuages, flou = 70) {
  return `<filter id="${id}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="${flou}"/></filter><g filter="url(#${id})">${nuages.map(([cx, cy, rx, ry, c, op]) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${c}" opacity="${op}"/>`).join('')}</g>`;
}
// Silhouette de ville (deux plans de profondeur), fenêtres éclairées
export function ville(base, W, { couleur = '#05060A', couleur2 = '#0E1220', fenetres = '#FFD66B', graine = 13, hauteur = 260, densite = 0.18 } = {}) {
  const r = alea(graine), plan = (c, hmax, wmin, wmax, fen) => { let x = -20, s = '';
    while (x < W + 20) { const w = wmin + r() * (wmax - wmin), h = hmax * (0.35 + r() * 0.65); s += `<rect x="${r1(x)}" y="${r1(base - h)}" width="${r1(w)}" height="${r1(h + 4)}" fill="${c}"/>`;
      if (r() < 0.25) s += `<rect x="${r1(x + w * 0.4)}" y="${r1(base - h - 30)}" width="3" height="30" fill="${c}"/>`;
      if (fen) for (let fy = base - h + 14; fy < base - 10; fy += 18) for (let fx = x + 8; fx < x + w - 10; fx += 14) if (r() < densite) s += `<rect x="${r1(fx)}" y="${r1(fy)}" width="5" height="8" fill="${fenetres}" opacity="${r1(0.5 + r() * 0.5)}"/>`;
      x += w + r() * 6; } return s; };
  return plan(couleur2, hauteur * 1.25, 50, 120, false) + plan(couleur, hauteur, 40, 110, true);
}
// Sol technologique en perspective
export function grilleTech(id, W, H, horizon, { couleur = '#00C2FF', op = 0.5, lignes = 16 } = {}) {
  let p = ''; const cx = W / 2;
  for (let i = -lignes; i <= lignes; i++) p += `M${r1(cx + i * 18)} ${horizon}L${r1(cx + i * (W / lignes) * 1.6)} ${H}`;
  for (let k = 1; k < 10; k++) { const y = horizon + (H - horizon) * (k / 10) ** 1.9; p += `M0 ${r1(y)}L${W} ${r1(y)}`; }
  return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops([[0, couleur, 0], [1, couleur, op]])}</linearGradient><path d="${p}" stroke="url(#${id})" stroke-width="1.6" fill="none"/>`;
}
// Ombre de contact au sol, sous un personnage
export const ombreSol = (id, cx, y, w, op = 0.6, couleur = '#000') => `<radialGradient id="${id}">${stops([[0, couleur, op], [1, couleur, 0]])}</radialGradient><ellipse cx="${r1(cx)}" cy="${r1(y)}" rx="${r1(w / 2)}" ry="${r1(w / 9)}" fill="url(#${id})"/>`;
// Faisceau (cône de lumière) depuis le haut
export function faisceau(id, xHaut, largeurHaut, xBas, largeurBas, H, { couleur = '#FFF', op = 0.28 } = {}) {
  return `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops([[0, couleur, op], [1, couleur, 0]])}</linearGradient><polygon points="${r1(xHaut - largeurHaut / 2)},0 ${r1(xHaut + largeurHaut / 2)},0 ${r1(xBas + largeurBas / 2)},${H} ${r1(xBas - largeurBas / 2)},${H}" fill="url(#${id})"/>`;
}
// Brume : bandes floues à mi-hauteur
export function brume(id, W, y, { couleur = '#AEB8D6', op = 0.35, graine = 17 } = {}) {
  const r = alea(graine); const n = Array.from({ length: 7 }, (_, i) => [r1((i / 6) * W + (r() - 0.5) * 160), r1(y + (r() - 0.5) * 70), r1(220 + r() * 220), r1(40 + r() * 50), couleur, r1(op * (0.5 + r() * 0.5))]);
  return nebuleuse(id, n, 34);
}
// Étincelles / particules montantes
export function etincelles(x, y, w, h, { n = 40, couleur = '#FFE500', graine = 19 } = {}) {
  const r = alea(graine); let s = '';
  for (let i = 0; i < n; i++) { const px = x + r() * w, py = y + r() * h, t = 1 + r() * 3.2; s += `<circle cx="${r1(px)}" cy="${r1(py)}" r="${r1(t)}" fill="${couleur}" opacity="${r1(0.3 + r() * 0.7)}"/>`; }
  return s;
}
// Choc d'énergie : noyau lumineux, éclats et onde
export function choc(id, cx, cy, r, { couleur = '#FFE500', coeur = '#FFFFFF', graine = 23 } = {}) {
  return halo(`${id}-h`, cx, cy, r * 2.2, couleur, 0.75) + rayons(`${id}-r`, cx, cy, { n: 22, longueur: r * 3.2, couleur: coeur, op: 0.55, ouverture: 0.35, graine }) + halo(`${id}-c`, cx, cy, r * 0.55, coeur, 1);
}

// Traitement d'un personnage détouré (filtre SVG) : contour d'encre, ombre portée, aura, lumière de contour
// (bord tourné vers la source) et modelé discret du côté opposé. L'image elle-même n'est jamais déformée.
export function filtreHeros(id, { encre = '#111', epaisseur = 7, contour = '#FFE500', aura = null, auraOp = 0.6, ombre = 0.55, lumiere = [-1, -1], modele = 0.28 } = {}) {
  const [lx, ly] = lumiere, d = 9, ddx = r1(-lx * d), ddy = r1(-ly * d), sdx = r1(lx * 26), sdy = r1(ly * 26);
  return `<filter id="${id}" x="-25%" y="-25%" width="150%" height="150%" color-interpolation-filters="sRGB">
<feMorphology in="SourceAlpha" operator="dilate" radius="${epaisseur}" result="dil"/>
<feFlood flood-color="${encre}"/><feComposite in2="dil" operator="in" result="trait"/>
<feOffset in="dil" dx="${r1(-lx * 22)}" dy="${r1(-ly * 18 + 8)}" result="o"/><feGaussianBlur in="o" stdDeviation="16" result="ob"/><feFlood flood-color="#000" flood-opacity="${ombre}"/><feComposite in2="ob" operator="in" result="ombre"/>
${aura ? `<feGaussianBlur in="dil" stdDeviation="26" result="ab"/><feFlood flood-color="${aura}" flood-opacity="${auraOp}"/><feComposite in2="ab" operator="in" result="aura"/>` : ''}
<feOffset in="SourceAlpha" dx="${ddx}" dy="${ddy}" result="dec"/><feComposite in="SourceAlpha" in2="dec" operator="out" result="bord"/><feGaussianBlur in="bord" stdDeviation="1.6" result="bf"/><feFlood flood-color="${contour}"/><feComposite in2="bf" operator="in" result="bc"/><feComposite in="bc" in2="SourceAlpha" operator="in" result="rim"/>
<feOffset in="SourceAlpha" dx="${sdx}" dy="${sdy}" result="dec2"/><feComposite in="SourceAlpha" in2="dec2" operator="out" result="cote"/><feGaussianBlur in="cote" stdDeviation="14" result="cf"/><feFlood flood-color="#000" flood-opacity="${modele}"/><feComposite in2="cf" operator="in" result="cc"/><feComposite in="cc" in2="SourceAlpha" operator="in" result="modele"/>
<feMerge><feMergeNode in="ombre"/>${aura ? '<feMergeNode in="aura"/>' : ''}<feMergeNode in="trait"/><feMergeNode in="SourceGraphic"/><feMergeNode in="modele"/><feMergeNode in="rim"/></feMerge></filter>`;
}
// Titre avec lueur douce (lisibilité sur fond chargé)
export const filtreLueur = (id, couleur = '#000', flou = 10, op = 0.75) => `<filter id="${id}" x="-10%" y="-30%" width="120%" height="160%"><feGaussianBlur in="SourceAlpha" stdDeviation="${flou}" result="b"/><feFlood flood-color="${couleur}" flood-opacity="${op}"/><feComposite in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`;
