// Primestone · Motion Studio · socle commun (module ES sans dépendance, identique dans Node et le navigateur).
// Formats, directions visuelles, effets graphiques, presets d'animation et aide au texte.
// Une scène est une liste d'affichage indépendante du rendu : nœuds g, rect, poly, circ, path, text, img, dots, grain.
// Deux rendus la consomment : canvas (aperçu, PNG, JPG, vidéo, GIF) et SVG (motion-svg.js).
import T from './tokens.js';
import M from './metrics.js';
import LOGO from './logo.js';
import { ajuster, largeur } from './briques.js';
export { T, M, LOGO, ajuster, largeur };

export const C = {
  y: T['color.brand.yellow'], k: T['color.brand.black'], k0: T['color.brand.black-pure'], w: T['color.brand.white'],
  red: T['color.editorial.news-red'], paper: T['color.editorial.paper'], warm1: T['color.editorial.warm-1'], warm2: T['color.editorial.warm-2'], warm3: T['color.editorial.warm-3'],
  night: T['color.cinematic.night'], nightBlue: T['color.cinematic.night-blue'], silver: T['color.cinematic.silver'],
};

export const FORMATS_MOTION = {
  '16:9': { nom: '16:9', w: T['format.video-hd.width'], h: T['format.video-hd.height'], usage: 'Vidéo, YouTube, écran' },
  '1:1': { nom: '1:1', w: 1080, h: 1080, usage: 'Publication carrée' },
  '4:5': { nom: '4:5', w: T['format.carousel.width'], h: T['format.carousel.height'], usage: 'Fil Instagram' },
  '9:16': { nom: '9:16', w: T['format.story.width'], h: T['format.story.height'], usage: 'Story, Reels, Shorts' },
};

// Effets réglables (0 = désactivé, 100 = maximal)
export const EFFETS = {
  trame: 'Trame (halftone)', encrage: 'Encrage', vitesse: 'Lignes de vitesse', lueur: 'Lumière et rayons',
  particules: 'Particules', cosmique: 'Effets cosmiques', grain: 'Grain d\'impression',
};
const E0 = { trame: 0, encrage: 0, vitesse: 0, lueur: 0, particules: 0, cosmique: 0, grain: 0 };

// Directions visuelles : chacune a sa palette, son fond, sa typographie d'appui et ses effets par défaut.
export const DIRECTIONS = {
  une: { nom: 'La Une', genre: 'Éditorial', fond: C.paper, fond2: C.warm3, encre: C.k, accent: C.y, accent2: C.red, texte: C.k, surAccent: C.k, style: 'papier', effets: { ...E0, trame: 30, encrage: 70, grain: 25 } },
  pop: { nom: 'Pop', genre: 'Éditorial', fond: C.y, fond2: C.w, encre: C.k, accent: C.red, accent2: C.w, texte: C.k, surAccent: C.w, style: 'pop', effets: { ...E0, trame: 70, encrage: 90, vitesse: 55, grain: 10 } },
  pulp: { nom: 'Pulp', genre: 'Éditorial', fond: C.warm1, fond2: C.warm2, encre: '#2B1A10', accent: C.red, accent2: C.k, texte: '#2B1A10', surAccent: C.warm1, style: 'papier', effets: { ...E0, trame: 45, encrage: 70, vitesse: 20, grain: 65 } },
  nuit: { nom: 'Nuit', genre: 'Cinéma', fond: C.night, fond2: C.nightBlue, encre: C.k0, accent: C.y, accent2: C.silver, texte: C.w, surAccent: C.k, style: 'nuit', effets: { ...E0, lueur: 65, particules: 40, grain: 20 } },
  noir: { nom: 'Noir et rouge', genre: 'Cinéma', fond: C.k0, fond2: '#3A0A06', encre: C.k0, accent: C.red, accent2: C.w, texte: C.w, surAccent: C.w, style: 'noir', effets: { ...E0, lueur: 40, vitesse: 30, trame: 15, grain: 55 } },
  cosmos: { nom: 'Cosmique', genre: 'Cinéma', fond: '#06051A', fond2: '#33206B', encre: C.k0, accent: C.y, accent2: '#9C7BFF', texte: C.w, surAccent: C.k, style: 'cosmos', effets: { ...E0, lueur: 55, particules: 55, cosmique: 70 } },
};

export const PRESETS = {
  revelation: 'Révélation', apparition: 'Apparition', deplacement: 'Déplacement', zoom: 'Zoom',
  parallaxe: 'Parallaxe', particules: 'Particules', volets: 'Volets', statique: 'Statique',
};

// ---------- Outils ----------
export const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const ease = { out: (p) => 1 - (1 - p) ** 3, inOut: (p) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2), back: (p) => 1 + 2.2 * (p - 1) ** 3 + 1.2 * (p - 1) ** 2 };
export function hasard(graine) { let a = graine >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export const r1 = (n) => Math.round(n * 10) / 10;
export const lignes = (s) => String(s ?? '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
// Mélange de deux couleurs #RRGGBB
export function melange(a, b, k) {
  const p = (h, i) => parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
  return '#' + [0, 1, 2].map((i) => Math.round(p(a, i) * (1 - k) + p(b, i) * k).toString(16).padStart(2, '0')).join('').toUpperCase();
}
export const clair = (hex) => { const p = (i) => parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255; return 0.2126 * p(0) + 0.7152 * p(1) + 0.0722 * p(2) > 0.5; };

// Emplacement d'une image : 'couvrir' remplit la zone (rognée), 'contenir' pose l'illustration détourée sur le bas de la zone.
export function placer(img, zone) {
  const z = img.zoom ?? 1, ox = img.dx ?? 0, oy = img.dy ?? 0;
  const s0 = zone.mode === 'contenir' ? Math.min(zone.w / img.w, zone.h / img.h) : Math.max(zone.w / img.w, zone.h / img.h);
  const s = s0 * z, w = img.w * s, h = img.h * s;
  const x = zone.x + (zone.w - w) / 2 + ox * zone.w;
  const y = zone.mode === 'contenir' ? zone.y + zone.h - h + oy * zone.h : zone.y + (zone.h - h) / 2 + oy * zone.h;
  return { x, y, w, h, echelle: s };
}

// ---------- Texte ----------
const cap = (police, taille) => (M[police].cap / M[police].upm) * taille;
// Ajuste un texte dans une boîte et renvoie un nœud texte positionné, sa boîte réelle et le résultat de l'ajustement.
// valign : 'haut' | 'milieu' | 'bas'. Les débordements alimentent les contrôles.
export function bloc(k, id, label, txt, o) {
  const { police = 'display', x, y, l, h, maxL = 2, tMax, tMin = Math.round(tMax * 0.4), interligne = 0.95, casse = 'upper', ls = 0, align = 'start', valign = 'haut', requis = false } = o;
  const f = ajuster(txt || '', { police, l, h, maxLignes: maxL, interligne, tMax, tMin, casse, interlettre: ls });
  if (f.vide) { if (requis) k.alerte('erreur', id, `${label} vide.`); return { node: null, box: { x, y, w: 0, h: 0 }, f }; }
  if (f.deborde) k.alerte('erreur', id, `${label} : le texte déborde de sa zone, même à la plus petite taille. Raccourcir.`);
  const pas = f.taille * interligne, haut = cap(police, f.taille) + (f.lignes.length - 1) * pas;
  const y0 = valign === 'bas' ? y + h - haut : valign === 'milieu' ? y + (h - haut) / 2 : y;
  const lw = Math.max(...f.lignes.map((s) => largeur(s, police, f.taille, ls)));
  const bx = align === 'middle' ? x + (l - lw) / 2 : align === 'end' ? x + l - lw : x;
  const node = { k: 'text', id, lignes: f.lignes, police, taille: f.taille, pas, ls, align, x: align === 'middle' ? x + l / 2 : align === 'end' ? x + l : x, y: y0 + cap(police, f.taille), fill: o.fill, stroke: o.stroke, lw: o.lw, glow: o.glow, op: o.op };
  return { node, box: { x: bx, y: y0, w: lw, h: haut }, f };
}

// ---------- Générateurs d'effets ----------
// Trame : points sur grille inclinée ; f(u, v) donne le rayon relatif (0..1) selon la position dans la zone.
export function trame({ x, y, w, h, cell, angle = 15, f = () => 0.5, fill, op = 1, cle }) {
  const pts = [], a = (angle * Math.PI) / 180, ca = Math.cos(a), sa = Math.sin(a), R = Math.hypot(w, h) / 2, cx = x + w / 2, cy = y + h / 2;
  for (let i = -R; i <= R; i += cell) for (let j = -R; j <= R; j += cell) {
    const px = cx + i * ca - j * sa, py = cy + i * sa + j * ca;
    if (px < x - cell || px > x + w + cell || py < y - cell || py > y + h + cell) continue;
    const r = clamp(f((px - x) / w, (py - y) / h)) * cell * 0.62; if (r > 0.6) pts.push(r1(px), r1(py), r1(r));
  }
  return { k: 'dots', pts, fill, op, cle };
}
// Faisceau de lignes (vitesse, rayons) : triangles partant d'un point focal, en un seul chemin.
export function faisceau({ cx, cy, rIn, rOut, n, larg = 0.012, graine = 7, rot = 0, plein = false }) {
  const rnd = hasard(graine); let d = '';
  for (let i = 0; i < n; i++) {
    const a = rot + (plein ? (i / n) * Math.PI * 2 : rnd() * Math.PI * 2), wa = plein ? Math.PI / n : larg * (0.4 + rnd() * 1.4), r0 = rIn * (0.7 + rnd() * 0.6);
    const p = (ang, r) => `${r1(cx + Math.cos(ang) * r)} ${r1(cy + Math.sin(ang) * r)}`;
    d += `M${p(a, r0)}L${p(a - wa, rOut)}L${p(a + wa, rOut)}Z`;
  }
  return d;
}
// Lignes de vitesse parallèles (diagonales), en un seul chemin
export function filets({ x, y, w, h, n, angle = -12, graine = 3 }) {
  const rnd = hasard(graine), t = Math.tan((angle * Math.PI) / 180); let d = '';
  for (let i = 0; i < n; i++) {
    const yy = y + rnd() * h, e = 1 + rnd() * 5, x0 = x + rnd() * w * 0.5, x1 = x0 + w * (0.3 + rnd() * 0.7);
    d += `M${r1(x0)} ${r1(yy)}L${r1(x1)} ${r1(yy + (x1 - x0) * t - e)}L${r1(x1)} ${r1(yy + (x1 - x0) * t + e)}Z`;
  }
  return d;
}
// Parallélogramme incliné (motif d'incision de la marque)
export const lame = (x, y, w, h, angle = T['motif.incision-angle']) => { const o = h * Math.tan((angle * Math.PI) / 180); return [x, y + h, x + w, y + h, x + w + o, y, x + o, y]; };

// ---------- Animation ----------
// Chaque calque a un rang d'entrée (seq) ; la fenêtre d'entrée occupe ~60 % de la durée, divisée par la vitesse.
// Retourne { op, dx, dy, s, rev } : opacité, décalage (px), échelle, révélation (0..1, découpe diagonale).
export function mouvement(preset, c, t, D, nSeq, W, H, vitesse = 1) {
  const neutre = { op: 1, dx: 0, dy: 0, s: 1, rev: 1, p: 1 };
  if (preset === 'statique' || c.role === 'fixe') return neutre;
  const E = (D * 0.6) / vitesse, pas = E / Math.max(1, nSeq), debut = (preset === 'volets' ? 0.55 : 0) + (c.seq ?? 0) * pas * 0.8;
  const duree = clamp(pas * 1.7, 0.45, 1.5) / vitesse, p = clamp((t - debut) / duree), e = ease.out(p);
  const texte = c.role === 'titre' || c.role === 'texte', img = c.role === 'image';
  const r = calc(); r.p = p; return r;
  function calc() {
  if (c.role === 'fond' || c.role === 'effet') {
    if (preset === 'zoom') return { ...neutre, s: 1.12 - 0.12 * ease.out(clamp(t / D)) };
    if (preset === 'parallaxe') return { ...neutre, dx: (0.5 - t / D) * W * 0.02 * (c.prof ?? 0.3) };
    return { ...neutre, op: c.role === 'effet' ? clamp(t / (0.6 / vitesse)) : 1 };
  }
  switch (preset) {
    case 'apparition': case 'volets': return { ...neutre, op: e, s: 0.95 + 0.05 * e };
    case 'particules': return { ...neutre, op: e, s: 1.06 - 0.06 * e };
    case 'revelation':
      if (texte) return { ...neutre, op: clamp(p * 3), s: 1 + 0.3 * (1 - ease.back(p)) };
      return { ...neutre, op: clamp(p * 4), rev: ease.inOut(p) };
    case 'deplacement': { const sens = (c.seq ?? 0) % 2 ? 1 : -1; return { ...neutre, op: clamp(p * 2), dx: sens * (1 - e) * W * 0.22 }; }
    case 'zoom': return { ...neutre, op: clamp(p * 2), s: (texte ? 1.6 - 0.6 * e : 1.3 - 0.3 * e) * (img ? 1 + 0.05 * clamp(t / D) : 1) };
    case 'parallaxe': return { ...neutre, op: e, dx: (0.5 - t / D) * W * 0.05 * (c.prof ?? (texte ? 1.6 : 1)), dy: (1 - e) * H * 0.06 };
    default: return neutre;
  }
  }
}
// Fin des entrées : instant où la composition est complète (utilisé pour l'image fixe et la vignette)
export function instantPose(preset, D, nSeq, vitesse = 1) {
  if (preset === 'statique') return 0;
  const E = (D * 0.6) / vitesse, pas = E / Math.max(1, nSeq);
  return Math.min(D, (preset === 'volets' ? 0.55 : 0) + (nSeq - 1) * pas * 0.8 + clamp(pas * 1.7, 0.45, 1.5) / vitesse + 0.05);
}
