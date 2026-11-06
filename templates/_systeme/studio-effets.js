// Primestone · Motion Studio · bibliothèque d'effets comics, lumière et cosmos. Chaque effet dessine dans sa boîte (0, 0, w, h)
// à l'instant t, avec des paramètres communs : intensite, echelle, angle, densite, couleur, couleur2, cx, cy (foyer), graine, anime, vitesse.
import { hasard, r1, clamp, trame, faisceau, filets } from './motion-base.js';

const P0 = { intensite: 0.6, echelle: 1, angle: 0, densite: 0.5, couleur: '@encre', couleur2: '@accent', cx: 0.5, cy: 0.5, graine: 1, anime: true, vitesse: 1, mode: '' };
const p = (o) => ({ ...P0, ...o });
export const EFFETS_LIB = {
  trame: { nom: 'Trame halftone', cat: 'Impression', def: p({ couleur: '@encre', mode: 'radial', intensite: 0.5, anime: false }), modes: { radial: 'Radiale', lineaire: 'Linéaire', uniforme: 'Uniforme (Ben-Day)', inverse: 'Radiale inversée' } },
  papier: { nom: 'Texture papier', cat: 'Impression', def: p({ couleur: '@papier', couleur2: '@encre', intensite: 0.5, anime: false }) },
  grain: { nom: 'Grain d\'impression', cat: 'Impression', def: p({ intensite: 0.4, anime: false }) },
  motif: { nom: 'Motif', cat: 'Impression', def: p({ couleur: '@encre', mode: 'rayures', intensite: 0.25, angle: 45, anime: false }), modes: { rayures: 'Rayures', quadrillage: 'Quadrillage', pois: 'Pois', zigzag: 'Zigzag' } },
  vitesse: { nom: 'Lignes de vitesse', cat: 'Mouvement', def: p({ couleur: '@encre', intensite: 0.6 }) },
  mouvement: { nom: 'Lignes de mouvement', cat: 'Mouvement', def: p({ couleur: '@encre', intensite: 0.5, angle: -12 }) },
  explosion: { nom: 'Explosion', cat: 'Impact', def: p({ couleur: '@accent', couleur2: '@papier', intensite: 0.8, densite: 0.6 }) },
  impact: { nom: 'Impact', cat: 'Impact', def: p({ couleur: '@encre', couleur2: '@accent', intensite: 0.7 }) },
  eclairs: { nom: 'Éclairs', cat: 'Énergie', def: p({ couleur: '@accent2', couleur2: '#FFFFFF', intensite: 0.7, densite: 0.4 }) },
  energie: { nom: 'Aura d\'énergie', cat: 'Énergie', def: p({ couleur: '@accent', couleur2: '@accent2', intensite: 0.7 }) },
  rayons: { nom: 'Rayons lumineux', cat: 'Lumière', def: p({ couleur: '@accent', intensite: 0.5, densite: 0.4 }) },
  lumiere: { nom: 'Lumière', cat: 'Lumière', def: p({ couleur: '@accent', intensite: 0.6, mode: 'halo' }), modes: { halo: 'Halo', projecteur: 'Projecteur', reflet: 'Reflets d\'objectif' } },
  degrade: { nom: 'Dégradé', cat: 'Lumière', def: p({ couleur: '@fond', couleur2: '@papier', intensite: 1, angle: 90, anime: false }) },
  vignette: { nom: 'Vignettage', cat: 'Lumière', def: p({ couleur: '#000000', intensite: 0.6, anime: false }) },
  particules: { nom: 'Particules', cat: 'Particules', def: p({ couleur: '@accent', couleur2: '#FFFFFF', intensite: 0.6, densite: 0.5, mode: 'poussiere' }), modes: { poussiere: 'Poussière', etincelles: 'Étincelles montantes', neige: 'Chute', explosion: 'Éclatement' } },
  etoiles: { nom: 'Champ d\'étoiles', cat: 'Cosmos', def: p({ couleur: '#FFFFFF', intensite: 0.6, densite: 0.5 }) },
  nebuleuse: { nom: 'Nébuleuse', cat: 'Cosmos', def: p({ couleur: '@accent2', couleur2: '@papier', intensite: 0.6, densite: 0.5 }) },
  brume: { nom: 'Brume', cat: 'Lumière', def: p({ couleur: '#C9CCD6', intensite: 0.5, densite: 0.5, vitesse: 0.5 }) },
  scope: { nom: 'Bandes cinémascope', cat: 'Lumière', def: p({ couleur: '#000000', intensite: 0.5, anime: true }) },
  decalage: { nom: 'Impression décalée (CMJ)', cat: 'Impression', def: p({ intensite: 0.5, echelle: 1, anime: false }) },
  crepitement: { nom: 'Crépitement cosmique', cat: 'Cosmos', def: p({ couleur: '#000000', couleur2: '@accent2', intensite: 0.6, densite: 0.5 }) },
};
export const CATEGORIES_EFFETS = [...new Set(Object.values(EFFETS_LIB).map((e) => e.cat))];

const circ = (x, y, r, fill, op) => ({ k: 'circ', x: r1(x), y: r1(y), r: r1(Math.max(0, r)), fill, op });
const halo = (x, y, r, c, a) => circ(x, y, r, { rad: [r1(x), r1(y), r1(Math.max(1, r))], st: [[0, c, a], [1, c, 0]] });
// Éclair : déplacement aléatoire du point milieu
function eclair(x0, y0, x1, y1, rnd, n = 5, amp = 0.25) {
  let pts = [[x0, y0], [x1, y1]];
  for (let k = 0; k < n; k++) { const out = [pts[0]]; for (let i = 1; i < pts.length; i++) { const [a, b] = [pts[i - 1], pts[i]], l = Math.hypot(b[0] - a[0], b[1] - a[1]), nx = -(b[1] - a[1]) / (l || 1), ny = (b[0] - a[0]) / (l || 1), o = (rnd() - 0.5) * l * amp;
    out.push([(a[0] + b[0]) / 2 + nx * o, (a[1] + b[1]) / 2 + ny * o], b); } pts = out; }
  return 'M' + pts.map(([x, y]) => `${r1(x)} ${r1(y)}`).join('L');
}

// Nœuds d'un effet. u : unité d'échelle du format (1 = 1080 px de petit côté).
export function effetNoeuds(type, prm, w, h, t, col, u = 1) {
  const e = { ...(EFFETS_LIB[type]?.def || P0), ...prm }, I = clamp(e.intensite), D = clamp(e.densite), S = Math.max(0.1, e.echelle || 1), c1 = col(e.couleur), c2 = col(e.couleur2);
  const fx = e.cx * w, fy = e.cy * h, R = Math.hypot(w, h), tt = e.anime ? t * (e.vitesse || 1) : 0, pas = (n) => Math.floor(tt * n), g = e.graine || 1;
  switch (type) {
    case 'trame': {
      const a = (e.angle * Math.PI) / 180, f = { uniforme: () => I, radial: (x, y) => Math.hypot(x - e.cx, y - e.cy) * 1.4 * (0.3 + I), inverse: (x, y) => (1 - Math.hypot(x - e.cx, y - e.cy) * 1.4) * (0.3 + I),
        lineaire: (x, y) => ((x - 0.5) * Math.cos(a) + (y - 0.5) * Math.sin(a) + 0.5) * (0.3 + I) * 1.3 }[e.mode] || (() => I);
      return [trame({ x: 0, y: 0, w, h, cell: Math.max(4, 20 * u * S), angle: 15 + e.angle, f, fill: c1, cle: `t-${w}x${h}-${e.mode}-${I}-${S}-${e.angle}-${e.cx}-${e.cy}-${c1}` })];
    }
    case 'papier': return [{ k: 'rect', x: 0, y: 0, w, h, fill: c1, op: r1(I * 0.55 * 100) / 100, blend: 'multiply' }, { k: 'grain', x: 0, y: 0, w, h, op: r1((0.08 + I * 0.25) * 100) / 100 }, { k: 'rect', x: 0, y: 0, w, h, fill: { rad: [w / 2, h / 2, R * 0.6], st: [[0.5, c2, 0], [1, c2, 0.25 * I]] } }];
    case 'grain': return [{ k: 'grain', x: 0, y: 0, w, h, op: r1((0.05 + I * 0.3) * 100) / 100 }];
    case 'motif': {
      const s = 28 * u * S, a = e.angle, lw = Math.max(1, s * (0.15 + I * 0.4)); let d = '';
      if (e.mode === 'pois') return [trame({ x: 0, y: 0, w, h, cell: s, angle: a, f: () => 0.3 + I * 0.6, fill: c1, cle: `m-${w}x${h}-${s}-${a}-${I}-${c1}` })];
      const L = R * 1.5; for (let i = -L; i < L; i += s) { d += `M${r1(i)} ${r1(-L)}L${r1(i)} ${r1(L)}`; if (e.mode === 'quadrillage') d += `M${r1(-L)} ${r1(i)}L${r1(L)} ${r1(i)}`; }
      if (e.mode === 'zigzag') { d = ''; for (let j = -L; j < L; j += s) { d += `M${r1(-L)} ${r1(j)}`; for (let i = -L; i < L; i += s) d += `L${r1(i + s / 2)} ${r1(j - s / 2)}L${r1(i + s)} ${r1(j)}`; } }
      return [{ k: 'g', clip: [0, 0, w, 0, w, h, 0, h], kids: [{ k: 'g', tr: { x: w / 2, y: h / 2, s: 1, r: a, ox: 0, oy: 0 }, kids: [{ k: 'path', d, fill: 'none', stroke: c1, lw: r1(lw) }] }] }];
    }
    case 'vitesse': return [{ k: 'path', d: faisceau({ cx: fx, cy: fy, rIn: Math.min(w, h) * (0.45 - I * 0.3), rOut: R, n: Math.round(20 + D * 100), larg: 0.006 + I * 0.012, graine: g + pas(12) }), fill: c1 }];
    case 'mouvement': { const o = e.anime ? ((tt * 600 * u) % (w * 0.5)) : 0; return [{ k: 'g', clip: [0, 0, w, 0, w, h, 0, h], kids: [{ k: 'g', tr: { x: r1(o - w * 0.25), y: 0, s: 1, r: 0, ox: 0, oy: 0 }, kids: [{ k: 'path', d: filets({ x: 0, y: 0, w: w * 1.5, h, n: Math.round(10 + D * 60), angle: e.angle, graine: g }), fill: c1, op: r1(0.3 + I * 0.7) }] }] }]; }
    case 'explosion': case 'impact': {
      const rnd = hasard(g), pul = e.anime ? 1 + Math.sin(tt * 9) * 0.03 * I : 1, n = Math.round(10 + D * 14), out = [];
      const etoile = (k, jit, creux) => { let d = ''; for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, r = (i % 2 ? creux : 1) * (1 - jit * rnd()) * k * pul; d += `${i ? 'L' : 'M'}${r1(fx + Math.cos(a) * (w / 2) * r)} ${r1(fy + Math.sin(a) * (h / 2) * r)}`; } return d + 'Z'; };
      if (type === 'explosion') { out.push({ k: 'path', d: etoile(1, 0.3, 0.6), fill: col('@encre') }, { k: 'path', d: etoile(0.94, 0.3, 0.6), fill: c1 }, { k: 'path', d: etoile(0.55 + I * 0.2, 0.25, 0.62), fill: c2 }); return out; }
      out.push({ k: 'path', d: faisceau({ cx: fx, cy: fy, rIn: Math.min(w, h) * 0.12, rOut: Math.min(w, h) * (0.35 + I * 0.25), n: n * 2, larg: 0.03, graine: g + pas(10) }), fill: c1 }, { k: 'path', d: etoile(0.3 + I * 0.1, 0.5, 0.35), fill: c2 });
      return out;
    }
    case 'eclairs': {
      const rnd = hasard(g + pas(14)), n = Math.round(2 + D * 8), out = [];
      for (let i = 0; i < n; i++) { const a = rnd() * Math.PI * 2, l = Math.min(w, h) * (0.25 + rnd() * 0.3 * (0.5 + I)), d = eclair(fx, fy, fx + Math.cos(a) * l, fy + Math.sin(a) * l, rnd);
        out.push({ k: 'path', d, fill: 'none', stroke: c1, lw: r1((6 + I * 14) * u), op: 0.45 }, { k: 'path', d, fill: 'none', stroke: c2, lw: r1((2 + I * 3) * u) }); }
      out.unshift(halo(fx, fy, Math.min(w, h) * 0.4, c1, 0.5 * I)); return out;
    }
    case 'energie': {
      const rnd = hasard(g + pas(10)), out = [halo(fx, fy, Math.min(w, h) * 0.55, c1, 0.6 * I)], rot = tt * 0.6;
      for (let k = 0; k < 3; k++) { const r0 = Math.min(w, h) * (0.22 + k * 0.08) * (1 + (e.anime ? Math.sin(tt * 4 + k) * 0.03 : 0)); let d = '';
        for (let i = 0; i <= 40; i++) { const a = rot * (k % 2 ? -1 : 1) + (i / 40) * Math.PI * 2, r = r0 * (1 + (rnd() - 0.5) * 0.18 * I); d += `${i ? 'L' : 'M'}${r1(fx + Math.cos(a) * r)} ${r1(fy + Math.sin(a) * r * (h / w > 0 ? 1 : 1))}`; }
        out.push({ k: 'path', d: d + 'Z', fill: 'none', stroke: k === 1 ? c2 : c1, lw: r1((3 + I * 6) * u), op: 0.8 - k * 0.2 }); }
      return out;
    }
    case 'rayons': return [{ k: 'path', d: faisceau({ cx: fx, cy: fy, rIn: 0, rOut: R, n: Math.round(8 + D * 24), plein: true, rot: tt * 0.08 + (e.angle * Math.PI) / 180 }), fill: { rad: [r1(fx), r1(fy), r1(R * 0.7)], st: [[0, c1, 0.6 * I], [1, c1, 0]] } }];
    case 'lumiere': {
      if (e.mode === 'projecteur') { const a = (e.angle * Math.PI) / 180 + Math.PI / 2, l = R, ou = 0.25 + D * 0.3; return [{ k: 'poly', pts: [fx, fy, fx + Math.cos(a - ou) * l, fy + Math.sin(a - ou) * l, fx + Math.cos(a + ou) * l, fy + Math.sin(a + ou) * l].map(r1), fill: { rad: [r1(fx), r1(fy), r1(l * 0.9)], st: [[0, c1, 0.7 * I], [1, c1, 0]] } }]; }
      const out = [halo(fx, fy, Math.min(w, h) * (0.3 + D * 0.5), c1, 0.8 * I), halo(fx, fy, Math.min(w, h) * 0.08, '#FFFFFF', 0.9 * I)];
      if (e.mode === 'reflet') for (let i = 1; i <= 4; i++) { const k = i * 0.35; out.push(halo(fx + (w / 2 - fx) * k * 2, fy + (h / 2 - fy) * k * 2, Math.min(w, h) * (0.03 + i * 0.015), c1, 0.35 * I)); }
      return out;
    }
    case 'degrade': { const a = (e.angle * Math.PI) / 180, dx = Math.cos(a) / 2, dy = Math.sin(a) / 2; return [{ k: 'rect', x: 0, y: 0, w, h, fill: { lin: [r1(w * (0.5 - dx)), r1(h * (0.5 - dy)), r1(w * (0.5 + dx)), r1(h * (0.5 + dy))], st: e.fondu ? [[0, c1, 0], [0.55, c2, I * 0.75], [1, c2, I]] : [[0, c1, I], [1, c2, I]] } }]; }
    case 'vignette': return [{ k: 'rect', x: 0, y: 0, w, h, fill: { rad: [w / 2, h / 2, R * 0.6], st: [[0.45 + (1 - I) * 0.3, c1, 0], [1, c1, 0.9 * I]] } }];
    case 'particules': {
      const rnd = hasard(g), n = Math.round(15 + D * 160), out = [], m = e.mode;
      for (let i = 0; i < n; i++) {
        const x0 = rnd() * w, y0 = rnd() * h, v = (10 + rnd() * 60) * u * S, a = rnd() * Math.PI * 2, r = (1.2 + rnd() * rnd() * 7) * u * S, ph = rnd() * 6.28, c = rnd() < 0.3 ? c2 : c1;
        let x = x0, y = y0;
        if (m === 'etincelles') { y = (((y0 - v * 2 * tt) % h) + h) % h; x = x0 + Math.sin(tt * 2 + ph) * 12 * u; }
        else if (m === 'neige') { y = (((y0 + v * tt) % h) + h) % h; x = x0 + Math.sin(tt + ph) * 20 * u; }
        else if (m === 'explosion') { const k = Math.min(1, tt / 1.2), d = (0.05 + rnd() * 0.6) * Math.hypot(w, h) * (1 - (1 - k) ** 3); x = fx + Math.cos(a) * d; y = fy + Math.sin(a) * d; }
        else { x = (((x0 + Math.cos(a) * v * tt * 0.4) % w) + w) % w; y = (((y0 + Math.sin(a) * v * tt * 0.4 - v * 0.3 * tt) % h) + h) % h; }
        const al = (0.35 + 0.65 * Math.abs(Math.sin(ph + tt * 2.3))) * (0.4 + I * 0.6);
        out.push(halo(x, y, r * 3.2, c, 0.45 * al), circ(x, y, r, c, r1(al * 100) / 100));
      }
      return out;
    }
    case 'etoiles': { const rnd = hasard(g), out = []; for (let i = 0, n = Math.round(40 + D * 400); i < n; i++) { const x = rnd() * w, y = rnd() * h, r = (0.5 + rnd() * rnd() * 2.8) * u * S, ph = rnd() * 6.28; out.push(circ(x, y, r, c1, r1((0.25 + 0.75 * Math.abs(Math.sin(ph + tt * 1.7))) * I * 100) / 100)); } return out; }
    case 'nebuleuse': { const rnd = hasard(g), out = []; for (let i = 0, n = Math.round(3 + D * 7); i < n; i++) { const x = rnd() * w + Math.sin(tt * 0.2 + i) * 20 * u, y = rnd() * h, r = Math.min(w, h) * (0.2 + rnd() * 0.4) * S; out.push(halo(x, y, r, i % 2 ? c2 : c1, (0.25 + 0.35 * rnd()) * I)); } return out; }
    case 'brume': { const rnd = hasard(g), out = []; for (let i = 0, n = Math.round(4 + D * 10); i < n; i++) { const y = h * (0.35 + rnd() * 0.7), x = ((rnd() * w * 1.4 + tt * (20 + rnd() * 30) * u) % (w * 1.4)) - w * 0.2, rx = w * (0.25 + rnd() * 0.3) * S, ry = h * (0.06 + rnd() * 0.08) * S;
      out.push({ k: 'g', tr: { x: r1(x), y: r1(y), s: 1, sx: rx / ry, r: 0, ox: 0, oy: 0 }, kids: [halo(0, 0, ry, c1, (0.25 + rnd() * 0.3) * I)] }); } return out; }
    case 'scope': { const b = h * (0.06 + I * 0.1) * (e.anime ? Math.min(1, 1 - (1 - Math.min(1, tt / 0.8)) ** 3) : 1); return [{ k: 'rect', x: 0, y: 0, w, h: r1(b), fill: c1 }, { k: 'rect', x: 0, y: r1(h - b), w, h: r1(b) + 1, fill: c1 }]; }
    case 'decalage': { const cell = Math.max(5, 16 * u * S), o = cell * 0.35 * (0.5 + I);
      return [['#00B7EB', -o, 0], ['#EC008C', o, o * 0.4], ['#FFE500', 0, -o]].map(([c, dx, dy], i) => ({ ...trame({ x: dx, y: dy, w, h, cell, angle: [15, 75, 0][i], f: (x, y) => (0.25 + 0.5 * Math.abs(Math.sin((x * 3 + y * 2 + i) * 2.1))) * (0.4 + I * 0.6), fill: c, cle: `cmj-${w}x${h}-${i}-${I}-${S}` }), op: 0.55, blend: 'multiply' })); }
    case 'crepitement': {
      const rnd = hasard(g), out = [];
      for (let i = 0, n = Math.round(3 + D * 12); i < n; i++) { const cx = rnd() * w, cy = rnd() * h, s = (16 + rnd() * 40) * u * S * (0.6 + I), pu = e.anime ? 1 + Math.sin(tt * 3 + i) * 0.08 : 1;
        out.push(halo(cx, cy, s * 2.6, c2, 0.55 * I)); for (let j = 0; j < 8; j++) { const b = rnd() * 6.28, d = rnd() * s * 1.3 * pu; out.push(circ(cx + Math.cos(b) * d, cy + Math.sin(b) * d, s * (0.15 + rnd() * 0.45), c1)); } out.push(circ(cx, cy, s * 0.5 * pu, c1)); }
      return out;
    }
    default: return [];
  }
}
