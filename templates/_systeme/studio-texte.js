// Primestone · Motion Studio · moteur typographique : coupure, ajustement, effets (contours, ombre, extrusion, lueur),
// déformations (arc, onde, inclinaison, impact, perspective) et animations au caractère (lettres, mots, machine à écrire).
import { M, largeur, clamp, ease, r1 } from './motion-base.js';

export const POLICES = { display: 'Anton (titres)', textBold: 'Archivo gras', text: 'Archivo', serif: 'Instrument Serif italique', mono: 'JetBrains Mono gras' };
export const DEFORMATIONS = { aucune: 'Aucune', arc: 'Arc', onde: 'Onde', inclinaison: 'Inclinaison', impact: 'Impact (centre agrandi)', perspective: 'Perspective' };
// Mesure par défaut : métriques des polices de la marque (identique dans Node et le navigateur)
export const mesureMetriques = (t, police, taille, ls = 0) => (M[police] ? largeur(t, police, taille, ls) : [...t].length * taille * 0.55 + ls * Math.max(0, [...t].length - 1));
export const capRatio = (police) => (M[police] ? M[police].cap / M[police].upm : 0.72);

const typo = (s) => s.replace(/[ \t]+([?!:;»])/g, ' $1').replace(/«[ \t]+/g, '« ');
// Coupe le texte (retours à la ligne manuels respectés) et ajuste la taille si demandé.
export function miseEnPage(tx, w, h, mesure = mesureMetriques) {
  const brut = typo(tx.casse === 'upper' ? String(tx.contenu ?? '').toLocaleUpperCase('fr-FR') : String(tx.contenu ?? ''));
  const paras = brut.split(/\r?\n/), ls = tx.interlettre || 0, il = tx.interligne || 1;
  const couper = (taille) => paras.flatMap((p) => { const mots = p.split(/[ \t]+/).filter(Boolean); if (!mots.length) return ['']; const out = []; let cur = '';
    for (const m of mots) { const e = cur ? cur + ' ' + m : m; if (!cur || mesure(e, tx.police, taille, ls) <= w) cur = e; else { out.push(cur); cur = m; } } out.push(cur); return out; });
  const haut = (n, t) => t * (capRatio(tx.police) + (n - 1) * il) + t * 0.18;
  const tient = (l, t) => l.every((x) => mesure(x, tx.police, t, ls) <= w + 0.5) && haut(l.length, t) <= h + 0.5;
  let taille = Math.max(4, tx.taille || 60), lignes = couper(taille), deborde = !tient(lignes, taille);
  if (tx.auto && deborde) { const min = Math.max(6, taille * 0.15); for (let t = taille; t >= min; t -= Math.max(1, t * 0.03)) { const l = couper(t); if (tient(l, t)) { taille = t; lignes = l; deborde = false; break; } } if (deborde) { taille = min; lignes = couper(min); } }
  taille = Math.round(taille * 10) / 10;
  return { lignes, taille, pas: taille * il, deborde: !tient(lignes, taille), vide: !brut.trim(), hauteur: haut(lignes.length, taille), largeurs: lignes.map((l) => mesure(l, tx.police, taille, ls)) };
}

// Nœuds du texte dans la boîte (0, 0, w, h). col : couleurs ; police : { fam, poids, style } pour les polices importées ; anim : { mode, p }.
export function texteNoeuds(tx, w, h, col, { mesure = mesureMetriques, police, anim } = {}) {
  // Marges intérieures : contours et extrusion restent dans la boîte
  const ins = (tx.contour?.w || 0) + (tx.contour2?.w || 0), ext = tx.extrusion?.profondeur || 0, w0 = w, h0 = h;
  w = Math.max(1, w - 2 * ins - ext); h = Math.max(1, h - 2 * ins - ext);
  const mp = miseEnPage(tx, w, h, mesure); if (mp.vide) return { nodes: [], mp };
  const t = mp.taille, ls = tx.interlettre || 0, cap = capRatio(tx.police) * t, align = tx.align || 'start';
  const y0 = (tx.valign === 'milieu' ? (h - mp.hauteur) / 2 : tx.valign === 'bas' ? h - mp.hauteur : 0) + cap;
  const def = tx.deformation?.type || 'aucune', f = tx.deformation?.force ?? 0.4, parChar = (def !== 'aucune' && def !== 'inclinaison') || (anim && anim.p < 1 && ['lettres', 'mots', 'machine'].includes(anim.mode));
  // Tracés élémentaires : { s: texte, x, y (ligne de base), r, k (échelle), op }
  const runs = []; let total = 0; mp.lignes.forEach((l) => (total += [...l].length));
  let rang = 0, motRang = 0; const nMots = mp.lignes.join(' ').split(/\s+/).filter(Boolean).length;
  mp.lignes.forEach((ligne, i) => {
    const lw = mp.largeurs[i], x0 = align === 'middle' ? (w - lw) / 2 : align === 'end' ? w - lw : 0, yb = y0 + i * mp.pas;
    if (!parChar) { runs.push({ s: ligne, x: x0, y: yb, r: 0, k: 1, op: 1 }); return; }
    const chars = [...ligne], adv = chars.map((c) => mesure(c, tx.police, t) + ls);
    let ks = chars.map(() => 1);
    if (def === 'impact') ks = chars.map((_, j) => 1 + f * (1 - Math.abs((2 * (j + 0.5)) / chars.length - 1)));
    if (def === 'perspective') ks = chars.map((_, j) => 1 - f * 0.5 + (f * j) / Math.max(1, chars.length - 1));
    const lw2 = adv.reduce((s, a, j) => s + a * ks[j], 0); let x = align === 'middle' ? (w - lw2) / 2 : align === 'end' ? w - lw2 : 0;
    const R = def === 'arc' ? (w * 0.9) / (Math.max(0.05, Math.abs(f)) * Math.PI) : 0;
    chars.forEach((c, j) => {
      const a = adv[j] * ks[j], cx = x + a / 2; let px = x, py = yb, r = 0;
      if (def === 'arc') { const th = (cx - w / 2) / R, sg = Math.sign(f) || 1; px = w / 2 + Math.sin(th) * R - a / 2; py = yb + sg * (R - Math.cos(th) * R); r = (sg * th * 180) / Math.PI; }
      if (def === 'onde') { py = yb + Math.sin((cx / w) * Math.PI * 2) * f * t * 0.35; r = Math.cos((cx / w) * Math.PI * 2) * f * 12; }
      let op = 1, dy = 0, k = ks[j];
      if (anim && anim.p < 1) {
        if (anim.mode === 'machine') op = rang < Math.floor(anim.p * total + 0.001) ? 1 : 0;
        else if (anim.mode === 'mots') { const q = ease.out(clamp(anim.p * 1.6 - (motRang / Math.max(1, nMots)) * 0.6)); op = q; dy = (1 - q) * t * 0.4; }
        else { const q = ease.out(clamp(anim.p * 1.8 - (rang / Math.max(1, total)) * 0.8)); op = q; dy = (1 - q) * t * 0.35; k *= 1 + (1 - q) * 0.5; }
      }
      if (c === ' ') motRang++;
      runs.push({ s: c, x: px, y: py + dy, r, k, op }); x += a; rang++;
    });
    motRang++;
  });
  const base = { k: 'text', police: tx.police, taille: t, pas: 0, ls: parChar ? 0 : ls, align: 'start', ...(police || {}) };
  const noeud = (run, o) => { const n = { ...base, lignes: [run.s], x: r1(run.x), y: r1(run.y), ...o }; if (run.op < 1) n.op = r1(run.op * 100) / 100 * (o.op ?? 1);
    return run.r || run.k !== 1 ? { k: 'g', tr: { x: 0, y: 0, s: Math.round(run.k * 1000) / 1000, r: r1(run.r), ox: r1(run.x), oy: r1(run.y) }, kids: [n] } : n; };
  const couche = (o) => runs.filter((r) => r.op > 0 && r.s.trim()).map((r) => noeud(r, o));
  const nodes = [];
  const fill = tx.degrade ? { lin: [0, 0, 0, h], st: [[0, col(tx.fill)], [1, col(tx.degrade.c2 || '@accent')]].map(([o, c]) => [o, c, 1]) } : col(tx.fill);
  if (tx.extrusion?.profondeur > 0) { const p = tx.extrusion.profondeur, a = ((tx.extrusion.angle ?? 45) * Math.PI) / 180, n = Math.min(40, Math.ceil(p / Math.max(1, t * 0.02)));
    for (let i = n; i >= 1; i--) { const d = (p * i) / n; nodes.push({ k: 'g', tr: { x: r1(Math.cos(a) * d), y: r1(Math.sin(a) * d), s: 1, ox: 0, oy: 0, r: 0 }, kids: couche({ fill: col(tx.extrusion.c), stroke: tx.contour?.w ? col(tx.contour.c) : undefined, lw: tx.contour?.w || undefined }) }); } }
  if (tx.ombre && (tx.ombre.dx || tx.ombre.dy || tx.ombre.flou)) nodes.push({ k: 'g', tr: { x: tx.ombre.dx || 0, y: tx.ombre.dy || 0, s: 1, ox: 0, oy: 0, r: 0 }, flou: tx.ombre.flou || 0, op: tx.ombre.op ?? 0.85, kids: couche({ fill: col(tx.ombre.c), stroke: tx.contour?.w ? col(tx.ombre.c) : undefined, lw: tx.contour?.w || undefined }) });
  if (tx.contour2?.w > 0) nodes.push(...couche({ fill: col(tx.contour2.c), stroke: col(tx.contour2.c), lw: (tx.contour?.w || 0) + tx.contour2.w }));
  nodes.push(...couche({ fill, stroke: tx.contour?.w > 0 ? col(tx.contour.c) : undefined, lw: tx.contour?.w > 0 ? tx.contour.w : undefined, glow: tx.lueur?.b > 0 ? { c: col(tx.lueur.c), b: tx.lueur.b } : undefined }));
  if (tx.fond && tx.fond !== 'none') { const p = t * 0.3, xs = mp.lignes.map((_, i) => (align === 'middle' ? (w - mp.largeurs[i]) / 2 : align === 'end' ? w - mp.largeurs[i] : 0));
    const x0 = Math.min(...xs) - p, x1 = Math.max(...xs.map((x, i) => x + mp.largeurs[i])) + p, k = (mp.hauteur + p) * 0.14;
    nodes.unshift({ k: 'poly', pts: [x0, y0 + mp.hauteur - cap + p * 0.6, x1, y0 + mp.hauteur - cap + p * 0.6, x1 + k, y0 - cap - p * 0.6, x0 + k, y0 - cap - p * 0.6].map(r1), fill: col(tx.fond) }); }
  const dec = (ext > 0 ? Math.min(0, Math.cos(((tx.extrusion.angle ?? 45) * Math.PI) / 180)) * -ext : 0) + ins, decy = (ext > 0 ? Math.min(0, Math.sin(((tx.extrusion.angle ?? 45) * Math.PI) / 180)) * -ext : 0) + ins;
  const tout = def === 'inclinaison' ? [{ k: 'g', tr: { x: 0, y: 0, s: 1, r: 0, ox: w / 2, oy: h / 2, kx: -f * 0.6 }, kids: nodes }] : nodes;
  return { nodes: dec || decy ? [{ k: 'g', tr: { x: r1(dec), y: r1(decy), s: 1, r: 0, ox: 0, oy: 0 }, kids: tout }] : tout, mp, w0, h0 };
}
