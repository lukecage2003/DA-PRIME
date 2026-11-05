// Primestone · Motion Studio · formes, cadres, bulles et masques. Chaque forme donne un contour (chemin SVG) dans la boîte (0, 0, w, h).
import { hasard, r1 } from './motion-base.js';

export const FORMES = {
  rect: 'Rectangle', ellipse: 'Ellipse', polygone: 'Polygone', etoile: 'Étoile', lame: 'Lame diagonale', explosion: 'Explosion', eclat: 'Éclat d\'impact',
  bulle: 'Bulle de dialogue', cri: 'Bulle de cri', pensee: 'Bulle de pensée', cartouche: 'Cartouche narratif', case: 'Case de comics', cadre: 'Cadre éditorial',
  ligne: 'Ligne', fleche: 'Flèche', bandeau: 'Bandeau', losange: 'Losange', hexagone: 'Hexagone',
};
export const MASQUES = { aucun: 'Aucun', rect: 'Rectangle', arrondi: 'Coins arrondis', ellipse: 'Ellipse', lame: 'Lame diagonale', losange: 'Losange', hexagone: 'Hexagone', etoile: 'Étoile', explosion: 'Explosion', polygone: 'Polygone libre' };

const poly = (pts) => { let d = ''; for (let i = 0; i < pts.length; i += 2) d += `${i ? 'L' : 'M'}${r1(pts[i])} ${r1(pts[i + 1])}`; return d + 'Z'; };
const ellipse = (cx, cy, rx, ry) => `M${r1(cx - rx)} ${r1(cy)}A${r1(rx)} ${r1(ry)} 0 1 0 ${r1(cx + rx)} ${r1(cy)}A${r1(rx)} ${r1(ry)} 0 1 0 ${r1(cx - rx)} ${r1(cy)}Z`;
const etoile = (w, h, n, creux, jit = 0, graine = 1) => { const rnd = hasard(graine), p = []; for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2 - Math.PI / 2, k = i % 2 ? creux * (1 - jit * 0.4 * rnd()) : 1 - jit * 0.35 * rnd(); p.push(w / 2 + Math.cos(a) * (w / 2) * k, h / 2 + Math.sin(a) * (h / 2) * k); } return p; };
const regulier = (w, h, n, rot = -Math.PI / 2) => { const p = []; for (let i = 0; i < n; i++) { const a = rot + (i / n) * Math.PI * 2; p.push(w / 2 + Math.cos(a) * w / 2, h / 2 + Math.sin(a) * h / 2); } return p; };
const arrondi = (w, h, r) => { r = Math.min(r, w / 2, h / 2); return `M${r1(r)} 0H${r1(w - r)}A${r1(r)} ${r1(r)} 0 0 1 ${r1(w)} ${r1(r)}V${r1(h - r)}A${r1(r)} ${r1(r)} 0 0 1 ${r1(w - r)} ${r1(h)}H${r1(r)}A${r1(r)} ${r1(r)} 0 0 1 0 ${r1(h - r)}V${r1(r)}A${r1(r)} ${r1(r)} 0 0 1 ${r1(r)} 0Z`; };
// Bulle : ellipse avec une pointe vers q (coordonnées relatives à la boîte, peuvent sortir de la boîte)
function bulle(w, h, q, cri, graine) {
  const cx = w / 2, cy = h / 2, a = Math.atan2(q[1] * h - cy, q[0] * w - cx), n = cri ? 26 : 72, rnd = hasard(graine), p = []; let pose = false;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * Math.PI * 2 - Math.PI, d = Math.atan2(Math.sin(t - a), Math.cos(t - a));
    if (Math.abs(d) < (cri ? 0.22 : 0.2)) { if (!pose) { p.push(q[0] * w, q[1] * h); pose = true; } continue; }
    const k = cri ? (i % 2 ? 0.84 + rnd() * 0.06 : 1.06 + rnd() * 0.08) : 1;
    p.push(cx + Math.cos(t) * (w / 2) * k * (cri ? 0.92 : 1), cy + Math.sin(t) * (h / 2) * k * (cri ? 0.92 : 1));
  }
  return poly(p);
}
// Contour d'une forme (ou d'un masque) : { d, extra } ; extra = nœuds supplémentaires (cadres, pensées)
export function contour(type, w, h, o = {}) {
  const g = o.graine ?? 3;
  switch (type) {
    case 'ellipse': return ellipse(w / 2, h / 2, w / 2, h / 2);
    case 'arrondi': return arrondi(w, h, Math.min(w, h) * 0.12);
    case 'rect': case 'cartouche': case 'case': case 'cadre': return o.rayon ? arrondi(w, h, o.rayon) : poly([0, 0, w, 0, w, h, 0, h]);
    case 'polygone': return o.pts?.length >= 6 ? poly(o.pts.map((v, i) => v * (i % 2 ? h : w))) : poly(regulier(w, h, Math.max(3, o.cotes ?? 5)));
    case 'hexagone': return poly(regulier(w, h, 6, 0));
    case 'losange': return poly([w / 2, 0, w, h / 2, w / 2, h, 0, h / 2]);
    case 'etoile': return poly(etoile(w, h, Math.max(3, o.branches ?? 5), o.creux ?? 0.45));
    case 'explosion': return poly(etoile(w, h, Math.max(5, o.branches ?? 14), o.creux ?? 0.62, 1, g));
    case 'eclat': return poly(etoile(w, h, Math.max(5, o.branches ?? 9), o.creux ?? 0.3, 1.4, g));
    case 'lame': { const k = Math.tan(((o.angle ?? 12) * Math.PI) / 180) * h; return poly([Math.max(0, k), 0, w, 0, Math.min(w, w - k), h, 0, h]); }
    case 'bandeau': { const k = Math.min(w * 0.08, h * 0.6); return poly([k, 0, w, 0, w - k, h, 0, h]); }
    case 'bulle': return bulle(w, h, o.queue || [0.25, 1.3], false, g);
    case 'cri': return bulle(w, h, o.queue || [0.25, 1.3], true, g);
    case 'pensee': return ellipse(w / 2, h / 2, w / 2, h / 2);
    case 'fleche': return poly([0, h * 0.32, w * 0.68, h * 0.32, w * 0.68, 0, w, h / 2, w * 0.68, h, w * 0.68, h * 0.68, 0, h * 0.68]);
    case 'ligne': return `M0 ${r1(h / 2)}L${r1(w)} ${r1(h / 2)}`;
    default: return poly([0, 0, w, 0, w, h, 0, h]);
  }
}
// Nœuds d'affichage d'une forme. col : résolution des couleurs ; trame : nœuds à découper dans la forme (facultatif).
export function forme(f, w, h, col, { trame } = {}) {
  const fill = col(f.fill), stroke = col(f.stroke), lw = f.lw || 0, d = contour(f.type, w, h, f), nodes = [];
  const remplissage = f.degrade ? { lin: [0, 0, w * Math.cos(((f.degrade.angle ?? 90) * Math.PI) / 180) || 0, h * Math.sin(((f.degrade.angle ?? 90) * Math.PI) / 180) || h], st: [[0, fill, 1], [1, col(f.degrade.c2), 1]] } : fill;
  if (f.ombre) nodes.push({ k: 'path', d, fill: col(f.ombre.c || '@encre'), tr: { x: f.ombre.dx ?? 12, y: f.ombre.dy ?? 12, s: 1 }, op: f.ombre.op ?? 1 });
  if (f.type === 'pensee') {
    // Nuage : cercles contourés puis remplis (contour unique), petites bulles vers la queue
    const n = 11, c = [], q = f.queue || [0.2, 1.25];
    for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2; c.push([w / 2 + Math.cos(a) * w * 0.38, h / 2 + Math.sin(a) * h * 0.36, Math.min(w, h) * 0.2]); }
    c.push([w / 2, h / 2, Math.min(w, h) * 0.36]);
    for (let i = 1; i <= 2; i++) { const k = 0.55 + i * 0.22; c.push([w / 2 + (q[0] * w - w / 2) * k, h / 2 + (q[1] * h - h / 2) * k, Math.min(w, h) * (0.07 - i * 0.02)]); }
    const cer = (e) => c.map(([x, y, r]) => ellipse(x, y, r + e, r + e)).join('');
    if (lw) nodes.push({ k: 'path', d: cer(lw), fill: stroke }); nodes.push({ k: 'path', d: cer(0), fill: remplissage });
    if (trame) nodes.push({ k: 'g', clip: cer(0), kids: trame }); return nodes;
  }
  if (f.type === 'ligne') { nodes.push({ k: 'path', d, fill: 'none', stroke: stroke === 'none' ? fill : stroke, lw: Math.max(1, lw || h) }); return nodes; }
  nodes.push({ k: 'path', d, fill: f.type === 'case' && !f.fill ? 'none' : remplissage });
  if (trame) nodes.push({ k: 'g', clip: d, kids: trame });
  if (lw && stroke !== 'none') nodes.push({ k: 'path', d, fill: 'none', stroke, lw });
  if (f.type === 'cadre' && lw) { const m = lw * 3; nodes.push({ k: 'path', d: poly([m, m, w - m, m, w - m, h - m, m, h - m]), fill: 'none', stroke, lw: Math.max(1, lw / 3) }); }
  return nodes;
}
