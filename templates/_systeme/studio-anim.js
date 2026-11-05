// Primestone · Motion Studio · moteur d'animation par calque : entrée, boucle, sortie, courbes, masques animés,
// animations typographiques, caméra et parallaxe. Fonction pure du temps : même instant, même image.
import { clamp, hasard, r1 } from './motion-base.js';

// Courbe de Bézier cubique (comme CSS cubic-bezier) résolue par Newton puis dichotomie
export function bezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const X = (t) => ((ax * t + bx) * t + cx) * t, Y = (t) => ((ay * t + by) * t + cy) * t, dX = (t) => (3 * ax * t + 2 * bx) * t + cx;
  return (x) => { if (x <= 0) return 0; if (x >= 1) return 1; let t = x; for (let i = 0; i < 6; i++) { const d = dX(t); if (Math.abs(d) < 1e-6) break; t -= (X(t) - x) / d; }
    if (t < 0 || t > 1 || Math.abs(X(t) - x) > 1e-4) { let a = 0, b = 1; t = x; for (let i = 0; i < 30; i++) { if (X(t) < x) a = t; else b = t; t = (a + b) / 2; } } return Y(t); };
}
const rebondi = (p) => { const n = 7.5625, d = 2.75; if (p < 1 / d) return n * p * p; if (p < 2 / d) return n * (p -= 1.5 / d) * p + 0.75; if (p < 2.5 / d) return n * (p -= 2.25 / d) * p + 0.9375; return n * (p -= 2.625 / d) * p + 0.984375; };
export const COURBES = {
  lineaire: { nom: 'Linéaire', f: (p) => p }, douce: { nom: 'Décélération douce', f: (p) => 1 - (1 - p) ** 3 }, forte: { nom: 'Décélération forte', f: (p) => 1 - (1 - p) ** 5 },
  entree: { nom: 'Accélération', f: (p) => p ** 3 }, 'entree-sortie': { nom: 'Accélération puis décélération', f: (p) => (p < 0.5 ? 4 * p ** 3 : 1 - (-2 * p + 2) ** 3 / 2) },
  rebond: { nom: 'Dépassement', f: (p) => 1 + 2.70158 * (p - 1) ** 3 + 1.70158 * (p - 1) ** 2 }, elastique: { nom: 'Élastique', f: (p) => (p === 0 || p === 1 ? p : 2 ** (-10 * p) * Math.sin((p * 10 - 0.75) * ((2 * Math.PI) / 3)) + 1) },
  rebondi: { nom: 'Rebonds', f: rebondi }, pas: { nom: 'Saccadée (4 pas)', f: (p) => Math.min(1, Math.floor(p * 4 + 0.0001) / 4) }, perso: { nom: 'Courbe personnalisée', f: null },
};
export const courbe = (nom, pts) => (nom === 'perso' && Array.isArray(pts) && pts.length === 4 ? bezier(...pts) : (COURBES[nom]?.f || COURBES.douce.f));

export const ENTREES = { aucune: 'Aucune', fondu: 'Fondu', glisse: 'Glissement', zoom: 'Zoom avant', 'zoom-arriere': 'Zoom arrière', tampon: 'Tampon (impact)', rebond: 'Rebond', rotation: 'Rotation',
  revelation: 'Révélation (masque)', iris: 'Iris', volet: 'Volet diagonal', lettres: 'Lettre à lettre', mots: 'Mot à mot', machine: 'Machine à écrire' };
export const SORTIES = { aucune: 'Aucune', fondu: 'Fondu', glisse: 'Glissement', zoom: 'Zoom', tampon: 'Agrandissement', rotation: 'Rotation', revelation: 'Masquage', iris: 'Iris', volet: 'Volet diagonal' };
export const BOUCLES = { aucune: 'Aucune', flottement: 'Flottement', pulsation: 'Pulsation', battement: 'Battement', rotation: 'Rotation continue', balancement: 'Balancement', tremblement: 'Tremblement', scintillement: 'Scintillement', derive: 'Dérive' };
export const DIRECTIONS = { gauche: 'Depuis la gauche', droite: 'Depuis la droite', haut: 'Depuis le haut', bas: 'Depuis le bas' };
export const CAMERAS = { aucune: 'Fixe', poussee: 'Poussée (zoom lent)', recul: 'Recul', travelling: 'Travelling latéral', secousse: 'Secousse' };
export const ANIM0 = { entree: { type: 'aucune', duree: 0.6, delai: 0, courbe: 'douce', dir: 'gauche', force: 1 }, boucle: { type: 'aucune', amplitude: 1, periode: 2, delai: 0 }, sortie: { type: 'aucune', duree: 0.5, avance: 0, courbe: 'entree', dir: 'droite' } };

// Préréglages réutilisables (combinaisons entrée + boucle + sortie)
export const PRESETS_ANIM = {
  'impact': { nom: 'Impact comics', entree: { type: 'tampon', duree: 0.45, courbe: 'rebond' }, boucle: { type: 'tremblement', amplitude: 0.3 } },
  'revelation-douce': { nom: 'Révélation douce', entree: { type: 'revelation', duree: 1, courbe: 'entree-sortie', dir: 'gauche' } },
  'titre-cinema': { nom: 'Titre de cinéma', entree: { type: 'fondu', duree: 1.6, courbe: 'entree-sortie' }, boucle: { type: 'pulsation', amplitude: 0.2, periode: 4 } },
  'arrivee-laterale': { nom: 'Arrivée latérale', entree: { type: 'glisse', duree: 0.7, courbe: 'forte', dir: 'gauche' } },
  'chute-rebond': { nom: 'Chute avec rebonds', entree: { type: 'rebond', duree: 1, courbe: 'rebondi', dir: 'haut' } },
  'machine': { nom: 'Machine à écrire', entree: { type: 'machine', duree: 1.4, courbe: 'lineaire' } },
  'lettres': { nom: 'Lettres en cascade', entree: { type: 'lettres', duree: 1, courbe: 'douce' } },
  'iris-cosmique': { nom: 'Iris cosmique', entree: { type: 'iris', duree: 1.2, courbe: 'entree-sortie' }, boucle: { type: 'flottement', amplitude: 0.5, periode: 5 } },
  'volet-sortie': { nom: 'Volet aller-retour', entree: { type: 'volet', duree: 0.6, courbe: 'forte' }, sortie: { type: 'volet', duree: 0.6, courbe: 'entree' } },
  'flottement': { nom: 'Flottement', entree: { type: 'fondu', duree: 0.8 }, boucle: { type: 'flottement', amplitude: 1, periode: 3 } },
  'battement': { nom: 'Battement de cœur', entree: { type: 'zoom', duree: 0.5, courbe: 'rebond' }, boucle: { type: 'battement', amplitude: 1, periode: 1.2 } },
  'clignotant': { nom: 'Néon', entree: { type: 'fondu', duree: 0.3, courbe: 'pas' }, boucle: { type: 'scintillement', amplitude: 1, periode: 1 } },
};

const ellipsePts = (w, h, k) => { const p = []; for (let i = 0; i < 48; i++) { const a = (i / 48) * Math.PI * 2; p.push(r1(w / 2 + Math.cos(a) * w * 0.72 * k), r1(h / 2 + Math.sin(a) * h * 0.72 * k)); } return p; };
// Masque de révélation (coordonnées locales de l'élément) pour une progression p (0 caché, 1 visible)
function masque(type, dir, p, w, h) {
  if (type === 'iris') return ellipsePts(w, h, p);
  if (type === 'volet') { const o = h * 0.35, x = -o + (w + 2 * o) * p; return [-o - 2, -2, x + o, -2, x - o, h + 2, -o - 2, h + 2].map(r1); }
  const e = 2; if (dir === 'droite') return [w - w * p - e, -e, w + e, -e, w + e, h + e, w - w * p - e, h + e].map(r1);
  if (dir === 'haut') return [-e, -e, w + e, -e, w + e, h * p + e, -e, h * p + e].map(r1);
  if (dir === 'bas') return [-e, h - h * p - e, w + e, h - h * p - e, w + e, h + e, -e, h + e].map(r1);
  return [-e, -e, w * p + e, -e, w * p + e, h + e, -e, h + e].map(r1);
}
function phase(type, q, o, W, H, w, h, sortie) {
  // q : 0 = état caché, 1 = état final (pour une sortie, q va de 1 à 0)
  const r = { dx: 0, dy: 0, s: 1, r: 0, op: 1, clip: null, texte: null }, f = o.force ?? 1, sx = { gauche: -1, droite: 1, haut: 0, bas: 0 }[o.dir] ?? -1, sy = { haut: -1, bas: 1 }[o.dir] ?? 0;
  switch (type) {
    case 'fondu': r.op = q; break;
    case 'glisse': r.dx = sx * (1 - q) * W * 0.35 * f; r.dy = sy * (1 - q) * H * 0.35 * f; r.op = clamp(q * 2.5); break;
    case 'zoom': r.s = sortie ? 1 + (1 - q) * 0.6 * f : 0.25 + 0.75 * q; r.op = clamp(q * 2); break;
    case 'zoom-arriere': r.s = 1 + (1 - q) * 1.4 * f; r.op = clamp(q * 2); break;
    case 'tampon': r.s = 1 + (1 - q) * 1.6 * f; r.op = clamp(q * 4); break;
    case 'rebond': r.dy = (sy || -1) * (1 - q) * H * 0.5 * f; r.op = clamp(q * 5); break;
    case 'rotation': r.r = (sortie ? 1 : -1) * (1 - q) * 200 * f; r.s = 0.4 + 0.6 * q; r.op = clamp(q * 2); break;
    case 'revelation': case 'iris': case 'volet': if (q < 1) r.clip = masque(type, o.dir, Math.max(0, q), w, h); break;
    case 'lettres': case 'mots': case 'machine': r.texte = { mode: type, p: q }; break;
  }
  return r;
}
// État animé d'un élément à l'instant t. D : durée totale, W/H : scène, w/h : élément.
export function etatAnim(a, t, D, W, H, w, h, u = 1) {
  const res = { dx: 0, dy: 0, s: 1, r: 0, op: 1, clip: null, texte: null };
  if (!a) return res;
  const fusion = (x) => { res.dx += x.dx; res.dy += x.dy; res.s *= x.s; res.r += x.r; res.op *= x.op; if (x.clip) res.clip = x.clip; if (x.texte) res.texte = x.texte; };
  const en = a.entree; if (en && en.type !== 'aucune') { const p = clamp((t - (en.delai || 0)) / Math.max(0.01, en.duree || 0.6)); fusion(phase(en.type, courbe(en.courbe, en.points)(p), en, W, H, w, h, false)); }
  const so = a.sortie; if (so && so.type !== 'aucune') { const d0 = D - (so.avance || 0) - (so.duree || 0.5), p = clamp((t - d0) / Math.max(0.01, so.duree || 0.5)); if (p > 0) fusion(phase(so.type, 1 - courbe(so.courbe, so.points)(p), so, W, H, w, h, true)); }
  const b = a.boucle; if (b && b.type !== 'aucune' && t >= (b.delai || 0)) {
    const A = b.amplitude ?? 1, T = Math.max(0.1, b.periode || 2), x = ((t - (b.delai || 0)) / T) * Math.PI * 2;
    switch (b.type) {
      case 'flottement': res.dy += Math.sin(x) * 14 * u * A; break;
      case 'pulsation': res.s *= 1 + Math.sin(x) * 0.04 * A; break;
      case 'battement': res.s *= 1 + Math.max(0, Math.sin(x)) ** 8 * 0.12 * A; break;
      case 'rotation': res.r += ((t - (b.delai || 0)) / T) * 360 * Math.sign(A || 1); break;
      case 'balancement': res.r += Math.sin(x) * 7 * A; break;
      case 'tremblement': { const rnd = hasard(Math.floor(t * 24) + 7); res.dx += (rnd() - 0.5) * 10 * u * A; res.dy += (rnd() - 0.5) * 10 * u * A; break; }
      case 'scintillement': { const rnd = hasard(Math.floor((t * 12) / T) + 3); res.op *= Math.max(0, 1 - A * (0.2 * (1 - Math.sin(x * 2)) + (rnd() < 0.2 ? 0.5 : 0))); break; }
      case 'derive': res.dx += ((t - (b.delai || 0)) / T) * 30 * u * A; break;
    }
  }
  return res;
}
// Caméra : mouvement global, amplifié par la profondeur de chaque calque (parallaxe multicouche)
export function camera(c, t, D, W, H, prof, cx, cy) {
  const r = { dx: 0, dy: 0, s: 1 }; if (!c || c.type === 'aucune') return r;
  const I = c.intensite ?? 0.5, k = 1 + (prof || 0), p = clamp(t / D);
  if (c.type === 'poussee' || c.type === 'recul') { const s = 1 + 0.12 * I * (c.type === 'poussee' ? p : 1 - p) * k; r.s = s; r.dx = (cx - W / 2) * (s - 1); r.dy = (cy - H / 2) * (s - 1); }
  if (c.type === 'travelling') r.dx = -(p - 0.5) * W * 0.08 * I * k;
  if (c.type === 'secousse') { const rnd = hasard(Math.floor(t * 30) + 1), e = Math.max(0, 1 - ((t % 2) / 2)) * I; r.dx = (rnd() - 0.5) * 24 * e * k; r.dy = (rnd() - 0.5) * 24 * e * k; }
  return r;
}
// Fin de toutes les entrées : instant où la composition est complète
export function finEntrees(elements) { let m = 0; const vis = (l) => l.forEach((e) => { const en = e.anim?.entree; if (en && en.type !== 'aucune') m = Math.max(m, (en.delai || 0) + (en.duree || 0.6)); if (e.enfants) vis(e.enfants); }); vis(elements); return m; }
