// Primestone · Motion Studio · composition et animation (module ES sans dépendance, Node et navigateur).
// composer(doc, t) -> { w, h, nodes, couches, alertes, pose, duree } : liste d'affichage de l'instant t (secondes).
// Le document (doc) est la création sauvegardée : famille, direction, format, textes, images, effets, calques, animation.
import { C, DIRECTIONS, FORMATS_MOTION, EFFETS, PRESETS, LOGO, M, T, clamp, ease, hasard, r1, bloc, placer, trame, faisceau, filets, lame, mouvement, instantPose, melange, clair, lignes, largeur } from './motion-base.js';
import FAMILLES_MOTION from './motion-familles.js';
export { DIRECTIONS, FORMATS_MOTION, EFFETS, PRESETS, FAMILLES_MOTION, placer };

export const VERSION_DOC = 1;
const ANGLE = T['motif.incision-angle'];

// ---------- Document ----------
export function nouveauDoc(famille = Object.keys(FAMILLES_MOTION)[0], { format = '16:9', direction } = {}) {
  const f = FAMILLES_MOTION[famille];
  return normaliser({ v: VERSION_DOC, nom: f.nom, famille, direction: direction || f.directions[0], format, preset: f.preset || 'revelation' });
}
// Complète un document (anciens fichiers, champs manquants) sans perdre les valeurs saisies.
export function normaliser(d) {
  const f = FAMILLES_MOTION[d.famille] || FAMILLES_MOTION[Object.keys(FAMILLES_MOTION)[0]];
  const out = {
    v: VERSION_DOC, id: d.id, nom: d.nom || f.nom, famille: FAMILLES_MOTION[d.famille] ? d.famille : Object.keys(FAMILLES_MOTION)[0],
    direction: DIRECTIONS[d.direction] ? d.direction : f.directions[0], format: FORMATS_MOTION[d.format] ? d.format : '16:9',
    textes: {}, images: {}, couleurs: { ...(d.couleurs || {}) }, effets: { ...(d.effets || {}) }, calques: { ...(d.calques || {}) }, ordre: Array.isArray(d.ordre) ? d.ordre : null,
    preset: PRESETS[d.preset] ? d.preset : (f.preset || 'revelation'), duree: clamp(+d.duree || 6, 2, 15), vitesse: clamp(+d.vitesse || 1, 0.5, 2),
    lettres: d.lettres ?? false, sortie: d.sortie ?? false, sceau: d.sceau ?? true, trameImage: d.trameImage ?? false, cree: d.cree, modifie: d.modifie,
  };
  for (const c of f.champs) out.textes[c.id] = d.textes?.[c.id] ?? c.defaut ?? '';
  for (const s of f.images) out.images[s.id] = d.images?.[s.id] ?? null;  // null : image de substitution
  return out;
}

// ---------- Boîte à outils des familles ----------
function kit(doc, W, H, imagesPH) {
  const base = DIRECTIONS[doc.direction], dir = { ...base, ...Object.fromEntries(Object.entries(doc.couleurs || {}).filter(([, v]) => /^#[0-9a-f]{6}$/i.test(v))) };
  if (doc.couleurs?.accent && !doc.couleurs.surAccent) dir.surAccent = clair(dir.accent) ? C.k : C.w;
  const fam = FAMILLES_MOTION[doc.famille];
  const k = {
    W, H, dir, doc, m: Math.round(Math.min(W, H) * 0.055), port: H > W * 1.05, carre: Math.abs(W - H) < W * 0.05, couches: [], alertes: [],
    tan: Math.tan((ANGLE * Math.PI) / 180), u: Math.min(W, H) / 1080,
    eff: (n) => clamp((doc.effets?.[n] ?? base.effets[n] ?? 0) / 100),
    txt: (id) => doc.textes?.[id] ?? '',
    alerte: (niveau, champ, message) => k.alertes.push({ niveau, champ, message }),
    img(id) { const s = fam.images.find((x) => x.id === id); return doc.images?.[id] || (s ? imagesPH(s.placeholder) : null); },
    couche(id, nom, role, seq, kids, o = {}) { const c = { id, nom, role, seq, kids: kids.filter(Boolean), ...o }; k.couches.push(c); return c; },
    texte(id, label, o, { seq = 1, role = 'texte', nom = label, bande, requis } = {}) {
      const b = bloc(k, id, label, k.txt(id), { requis, ...o });
      if (!b.node) return b.box;
      const kids = [];
      if (bande) { const p = bande.pad ?? Math.round(b.f.taille * 0.35); kids.push({ k: 'poly', pts: lame(b.box.x - p, b.box.y - p * 0.8, b.box.w + 2 * p, b.box.h + p * 1.6, bande.angle ?? ANGLE), fill: bande.fill }); }
      kids.push(b.node);
      k.couche(id, nom, role, seq, kids, { box: b.box, champ: id });
      return b.box;
    },
    // Liste : une ligne par entrée, même taille pour toutes (la plus grande qui convient à chacune)
    liste(id, label, items, { x, y, l, hLigne, police = 'text', tMax, casse = 'none', fill, seq = 2, align = 'start', ls = 0 }) {
      if (!items.length) return { x, y, w: 0, h: 0 };
      let taille = tMax;
      for (const s of items) { const f = bloc({ alerte() {} }, id, label, s, { police, x, y, l, h: hLigne, maxL: 1, tMax, tMin: Math.round(tMax * 0.45), casse, ls }); taille = Math.min(taille, f.f.taille); if (f.f.deborde) k.alerte('attention', id, `${label} : « ${s.slice(0, 30)} » est trop long pour la ligne et sera réduit.`); }
      const nodes = items.map((s, i) => bloc({ alerte() {} }, id, label, s, { police, x, y: y + i * hLigne, l, h: hLigne, maxL: 1, tMax: taille, tMin: Math.round(tMax * 0.3), casse, fill, align, ls }).node);
      const box = { x, y, w: l, h: items.length * hLigne };
      k.couche(id, label, 'texte', seq, nodes, { box, champ: id }); return box;
    },
    // Illustration : zone (x, y, w, h, mode), découpe optionnelle (polygone), encrage, trame optionnelle sur l'image
    illustration(id, label, zone, { clip, seq = 0, op = 1, ombre = false, rot = 0, nom = label, contour = true } = {}) {
      const img = k.img(id); const kids = []; const ink = k.eff('encrage');
      const pts = clip || [zone.x, zone.y, zone.x + zone.w, zone.y, zone.x + zone.w, zone.y + zone.h, zone.x, zone.y + zone.h];
      if (ombre) kids.push({ k: 'poly', pts: pts.map((v) => v + 18 * k.u), fill: C.k0, op: 0.45 });
      if (img?.href) {
        const p = placer(img, zone);
        if (p.echelle > 1.5 && !img.placeholder) k.alerte('attention', id, `${label} : image agrandie ${p.echelle.toFixed(1)} fois, risque de flou. Utiliser une source plus grande.`);
        if (img.placeholder) k.alerte('info', id, `${label} : image de substitution (PLACEHOLDER).`);
        const im = { k: 'img', href: img.href, x: r1(p.x), y: r1(p.y), w: r1(p.w), h: r1(p.h) };
        if (zone.mode === 'contenir' && ink > 0 && contour) im.contour = { c: k.dir.encre, w: r1(2 + ink * 7 * k.u) };
        const g = { k: 'g', clip: zone.mode === 'contenir' ? null : pts, kids: [im] };
        if (doc.trameImage && k.eff('trame') > 0) g.kids.push({ ...trame({ x: zone.x, y: zone.y, w: zone.w, h: zone.h, cell: 14 * k.u, angle: 45, f: () => 0.45, fill: C.k0, cle: `ti-${id}-${W}` }), op: 0.35 * k.eff('trame'), blend: 'multiply' });
        kids.push(g);
      } else if (fam.images.find((s) => s.id === id)?.requis) k.alerte('erreur', id, `${label} : aucune image.`);
      if (zone.mode !== 'contenir' && ink > 0 && contour) kids.push({ k: 'poly', pts, fill: 'none', stroke: k.dir.encre, lw: r1((3 + ink * 9) * k.u) });
      const box = { x: Math.min(...pts.filter((_, i) => !(i % 2))), y: Math.min(...pts.filter((_, i) => i % 2)) }; box.w = Math.max(...pts.filter((_, i) => !(i % 2))) - box.x; box.h = Math.max(...pts.filter((_, i) => i % 2)) - box.y;
      return k.couche(id, nom, 'image', seq, kids, { box: zone.mode === 'contenir' ? { x: zone.x, y: zone.y, w: zone.w, h: zone.h } : box, slot: id, zone, op, rot });
    },
    bande(id, nom, pts, fill, seq = 0, o = {}) { return k.couche(id, nom, o.role || 'forme', seq, [{ k: 'poly', pts, fill, op: o.op }], { box: bornes(pts) }); },
  };
  return k;
}
const bornes = (pts) => { const xs = pts.filter((_, i) => !(i % 2)), ys = pts.filter((_, i) => i % 2); return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }; };

// ---------- Fond et effets communs ----------
function fond(k) {
  const { W, H, dir } = k, kids = [{ k: 'rect', x: 0, y: 0, w: W, h: H, fill: dir.fond }];
  if (dir.style === 'papier') kids.push({ k: 'rect', x: 0, y: 0, w: W, h: H, fill: { rad: [W / 2, H / 2, Math.hypot(W, H) * 0.62], st: [[0.55, dir.fond2, 0], [1, dir.fond2, 0.8]] } });
  if (dir.style === 'pop') kids.push({ k: 'path', d: faisceau({ cx: W * 0.62, cy: H * 0.45, rIn: 0, rOut: Math.hypot(W, H), n: 18, plein: true }), fill: melange(dir.fond, C.w, 0.35), op: 0.6 });
  if (dir.style === 'nuit') kids.push({ k: 'rect', x: 0, y: 0, w: W, h: H, fill: { lin: [0, 0, 0, H], st: [[0, dir.fond2, 1], [0.75, dir.fond, 1]] } });
  if (dir.style === 'noir') kids.push({ k: 'rect', x: 0, y: 0, w: W, h: H, fill: { rad: [W * 0.7, H * 0.35, Math.max(W, H) * 0.8], st: [[0, dir.fond2, 1], [1, dir.fond, 1]] } });
  if (dir.style === 'cosmos') kids.push({ k: 'rect', x: 0, y: 0, w: W, h: H, fill: { rad: [W * 0.65, H * 0.4, Math.max(W, H) * 0.75], st: [[0, dir.fond2, 1], [0.6, melange(dir.fond2, dir.fond, 0.6), 1], [1, dir.fond, 1]] } },
    { k: 'circ', x: W * 0.2, y: H * 0.8, r: Math.max(W, H) * 0.35, fill: { rad: [W * 0.2, H * 0.8, Math.max(W, H) * 0.35], st: [[0, dir.accent2, 0.35], [1, dir.accent2, 0]] } });
  k.couche('fond', 'Fond', 'fond', 0, kids, { box: { x: 0, y: 0, w: W, h: H }, verrou: true });
}
// Effets d'arrière-plan centrés sur le point focal (sujet principal)
function effetsFond(k, [fx, fy]) {
  const { W, H, dir, u } = k, R = Math.hypot(W, H);
  const c = k.eff('cosmique');
  if (c > 0) {
    const rnd = hasard(11), etoiles = [];
    for (let i = 0; i < 40 + c * 160; i++) etoiles.push({ x: rnd() * W, y: rnd() * H, r: (0.6 + rnd() * rnd() * 2.6) * u, ph: rnd() * 6.28 });
    const amas = []; const rn2 = hasard(5);
    for (let i = 0; i < 3 + Math.round(c * 7); i++) {
      const a = rn2() * 6.28, d = R * (0.22 + rn2() * 0.3), cx = fx + Math.cos(a) * d, cy = fy + Math.sin(a) * d, s = (18 + rn2() * 40) * u * (0.6 + c);
      amas.push({ k: 'circ', x: r1(cx), y: r1(cy), r: r1(s * 2.4), fill: { rad: [r1(cx), r1(cy), r1(s * 2.4)], st: [[0, dir.accent2, 0.55 * c], [1, dir.accent2, 0]] } });
      for (let j = 0; j < 7; j++) { const b = rn2() * 6.28, e = rn2() * s * 1.3; amas.push({ k: 'circ', x: r1(cx + Math.cos(b) * e), y: r1(cy + Math.sin(b) * e), r: r1(s * (0.18 + rn2() * 0.5)), fill: C.k0 }); }
      amas.push({ k: 'circ', x: r1(cx), y: r1(cy), r: r1(s * 0.5), fill: C.k0 });
    }
    k.couche('cosmique', 'Effets cosmiques', 'effet', 0, [], { box: { x: 0, y: 0, w: W, h: H }, prof: 0.2,
      dyn: (t) => [...amas, ...etoiles.map((e) => ({ k: 'circ', x: r1(e.x), y: r1(e.y), r: e.r, fill: C.w, op: r1(0.35 + 0.65 * Math.abs(Math.sin(e.ph + t * 1.7)) * c) }))] });
  }
  const l = k.eff('lueur');
  if (l > 0) {
    const coul = dir.style === 'noir' ? dir.accent : dir.style === 'pop' ? C.w : dir.accent;
    k.couche('lueur', 'Lumière et rayons', 'effet', 0, [], { box: { x: 0, y: 0, w: W, h: H }, prof: 0.4, dyn: (t) => [
      { k: 'path', d: faisceau({ cx: fx, cy: fy, rIn: 0, rOut: R, n: 14, plein: true, rot: t * 0.05 }), fill: { rad: [fx, fy, R * 0.6], st: [[0, coul, 0.32 * l], [1, coul, 0]] } },
      { k: 'circ', x: fx, y: fy, r: R * 0.32, fill: { rad: [fx, fy, R * 0.32], st: [[0, coul, 0.55 * l], [1, coul, 0]] } }] });
  }
  const tr = k.eff('trame');
  if (tr > 0) k.couche('trame', 'Trame (halftone)', 'effet', 0, [trame({ x: 0, y: 0, w: W, h: H, cell: Math.round(22 * u), angle: 15, f: (a, b) => Math.hypot(a - fx / W, b - fy / H) * 1.3 * (0.4 + tr * 0.8), fill: dir.style === 'pop' ? dir.accent : dir.encre, op: dir.style === 'pop' ? 0.85 : 0.22 + tr * 0.25, cle: `trame-${doc_cle(k)}` })], { box: { x: 0, y: 0, w: W, h: H }, prof: 0.3 });
  const v = k.eff('vitesse');
  if (v > 0) k.couche('vitesse', 'Lignes de vitesse', 'effet', 0, [{ k: 'path', d: faisceau({ cx: fx, cy: fy, rIn: Math.min(W, H) * 0.3, rOut: R, n: Math.round(30 + v * 60), larg: 0.012 }), fill: dir.style === 'pop' || dir.style === 'papier' ? dir.encre : C.w, op: r1(0.25 + v * 0.55) }], { box: { x: 0, y: 0, w: W, h: H }, prof: 0.6 });
}
const doc_cle = (k) => `${k.W}x${k.H}-${k.dir.style}-${Math.round(k.eff('trame') * 100)}-${k.dir.encre}-${k.dir.accent}-${k.foyer}`;
function effetsAvant(k) {
  const { W, H, dir, u, doc } = k;
  const p = Math.max(k.eff('particules'), doc.preset === 'particules' ? 0.6 : 0);
  if (p > 0) {
    const rnd = hasard(23), parts = [], n = Math.round(20 + p * 110), coul = dir.style === 'papier' || dir.style === 'pop' ? dir.encre : dir.accent;
    for (let i = 0; i < n; i++) parts.push({ x: rnd() * W, y: rnd() * H, vx: (rnd() - 0.5) * 30 * u, vy: -(10 + rnd() * 60) * u, r: (1.5 + rnd() * rnd() * 7) * u, ph: rnd() * 6.28, c: rnd() < 0.3 ? C.w : coul });
    const [fx, fy] = k.foyerXY;
    k.couche('particules', 'Particules', 'effet', 0, [], { box: { x: 0, y: 0, w: W, h: H }, prof: 1.4, dyn: (t) => parts.flatMap((q) => {
      let x = ((q.x + q.vx * t) % W + W) % W, y = ((q.y + q.vy * t) % H + H) % H;
      if (doc.preset === 'particules' && t < 1.4) { const e = ease.out(t / 1.4); x = fx + (x - fx) * e; y = fy + (y - fy) * e; }
      const a = r1((0.35 + 0.65 * Math.abs(Math.sin(q.ph + t * 2.3))) * Math.min(1, 0.4 + p));
      return [{ k: 'circ', x: r1(x), y: r1(y), r: r1(q.r * 3), fill: { rad: [r1(x), r1(y), r1(q.r * 3)], st: [[0, q.c, 0.45 * a], [1, q.c, 0]] } }, { k: 'circ', x: r1(x), y: r1(y), r: r1(q.r), fill: q.c, op: a }];
    }) });
  }
}
function marque(k) {
  const { W, H, dir, u, doc } = k, s = Math.round(64 * u), x = W - k.m - s, y = H - k.m - s;
  const kids = [];
  if (doc.sceau) { const gh = s * 0.68, sc = gh / LOGO.P.h, fondS = clair(dir.fond) ? C.k : C.y, lettre = clair(dir.fond) ? C.y : C.k;
    kids.push({ k: 'rect', x, y, w: s, h: s, rx: r1(s * T['motif.seal-radius-ratio']), fill: fondS }, { k: 'path', d: LOGO.P.d, fill: lettre, tr: { x: r1(x + (s - LOGO.P.w * sc) / 2), y: r1(y + (s - gh) / 2), s: Math.round(sc * 10000) / 10000 }, statut: 'NON-OFFICIEL' }); }
  const cr = k.txt('credit');
  if (cr) kids.push({ k: 'text', lignes: [cr.toLocaleUpperCase('fr-FR')], police: 'mono', taille: Math.round(15 * u), pas: 0, ls: 1.5, align: 'end', x: doc.sceau ? x - 14 * u : W - k.m, y: H - k.m - 4 * u, fill: dir.texte, op: 0.75 });
  if (kids.length) k.couche('marque', 'Marque et crédit', 'texte', 99, kids, { box: { x: W - k.m - 420 * u, y: y, w: 420 * u, h: s } });
  const g = k.eff('grain');
  if (g > 0) k.couche('grain', 'Grain d\'impression', 'fixe', 0, [{ k: 'grain', x: 0, y: 0, w: W, h: H, op: r1(0.05 + g * 0.2) }], { box: { x: 0, y: 0, w: W, h: H } });
}

// ---------- Composition à l'instant t ----------
export function composer(docIn, t = null, { final = false, imagesPH = () => null } = {}) {
  const doc = normaliser(docIn), F = FORMATS_MOTION[doc.format], W = F.w, H = F.h;
  const fam = FAMILLES_MOTION[doc.famille], k = kit(doc, W, H, imagesPH);
  k.foyerXY = fam.foyer(k); k.foyer = k.foyerXY.map(Math.round).join(',');
  fond(k); effetsFond(k, k.foyerXY);
  fam.composer(k);
  effetsAvant(k); marque(k);
  const mx = Math.max(0, ...k.couches.filter((c) => c.id !== 'marque' && !['fond', 'effet', 'fixe'].includes(c.role)).map((c) => c.seq)), mq = k.couches.find((c) => c.id === 'marque'); if (mq) mq.seq = mx + 1;
  if (!String(k.txt('credit')).trim() && fam.images.length) k.alerte('attention', 'credit', 'Crédit de l\'illustration manquant.');

  // Ordre des calques (réglage utilisateur), visibilité, transformations
  let rang = -1; const rangs = new Map();
  for (const c of k.couches) { const i = doc.ordre ? doc.ordre.indexOf(c.id) : -1; rang = i >= 0 ? i : rang + 0.001; rangs.set(c, rang); }
  const couches = doc.ordre ? [...k.couches].sort((a, b) => rangs.get(a) - rangs.get(b)) : k.couches;
  const D = doc.duree, sortie = doc.sortie && doc.preset !== 'statique' ? Math.min(0.8, D * 0.15) : 0;
  const nSeq = Math.max(...couches.map((c) => (c.role === 'fond' || c.role === 'effet' || c.role === 'fixe' ? 0 : c.seq))) + 1;
  const pose = instantPose(doc.preset, D - sortie, nSeq, doc.vitesse);
  const tt = final || t === null ? pose : clamp(t, 0, D);
  const nodes = [];
  for (const c of couches) {
    const reg = doc.calques[c.id] || {};
    if (reg.visible === false) continue;
    const m = final ? { op: 1, dx: 0, dy: 0, s: 1, rev: 1, p: 1 } : mouvement(doc.preset, c, tt, D - sortie, nSeq, W, H, doc.vitesse);
    let kids = c.dyn ? c.dyn(tt) : c.prog ? c.prog(m.p) : c.kids;
    if (doc.lettres && c.role === 'titre' && m.p < 1 && doc.preset !== 'statique') kids = kids.map((n) => (n.k === 'text' ? lettres(n, m.p) : n));
    const b = c.box || { x: 0, y: 0, w: W, h: H }, ox = b.x + b.w / 2, oy = b.y + b.h / 2;
    const s = m.s * (reg.s ?? 1), op = m.op * (reg.o ?? 1) * (c.op ?? 1);
    if (op <= 0.001) continue;
    let g = { k: 'g', id: c.id, nom: c.nom, kids, op: r1(op * 1000) / 1000, tr: { x: r1(m.dx + (reg.x ?? 0) * W), y: r1(m.dy + (reg.y ?? 0) * H), s: Math.round(s * 10000) / 10000, ox: r1(ox), oy: r1(oy), r: c.rot || 0 } };
    if (m.rev < 1) { const o = b.h * k.tan * 2, x1 = b.x - o + (b.w + 2 * o) * m.rev; g = { ...g, clip: [b.x - o, b.y, x1 + o, b.y, x1 - o, b.y + b.h, b.x - o, b.y + b.h] }; }
    nodes.push(g);
  }
  // Volets d'ouverture (preset) et de sortie (option)
  const volets = (p, entree) => { const n = 5, o = H * k.tan, w = W / n + o + 4, kids = [];
    for (let i = 0; i < n; i++) { const e = ease.inOut(clamp(p * 1.6 - i * 0.12)), dx = entree ? e * (W + w) : (e - 1) * (W + w);
      kids.push({ k: 'poly', pts: lame((i * W) / n - o + dx, 0, w, H).map(r1), fill: i % 2 ? k.dir.accent : k.dir.encre }); }
    return { k: 'g', id: 'volets', kids }; };
  if (doc.preset === 'volets' && !final && tt < 1.4) nodes.push(volets(clamp(tt / 1.2), true));
  if (sortie && !final && tt > D - sortie) nodes.push(volets(clamp((tt - (D - sortie)) / sortie), false));
  return { w: W, h: H, nodes, alertes: k.alertes, pose, duree: D, t: tt, couches: couches.map((c) => ({ id: c.id, nom: c.nom, role: c.role, box: c.box, slot: c.slot, zone: c.zone, champ: c.champ, verrou: !!c.verrou, visible: doc.calques[c.id]?.visible !== false })) };
}
// Animation lettre à lettre d'un texte : chaque caractère arrive en décalé
function lettres(n, p) {
  const out = [];
  n.lignes.forEach((ligne, li) => {
    const chars = [...ligne], tot = largeur(ligne, n.police, n.taille, n.ls);
    let x = n.align === 'middle' ? n.x - tot / 2 : n.align === 'end' ? n.x - tot : n.x;
    chars.forEach((ch, j) => {
      const w = largeur(ch, n.police, n.taille), q = ease.out(clamp(p * 1.8 - (j / Math.max(1, chars.length)) * 0.8)), y = n.y + li * n.pas;
      if (q > 0 && ch.trim()) out.push({ k: 'g', op: r1(q * 100) / 100, tr: { x: 0, y: r1((1 - q) * n.taille * 0.35), s: 1 + (1 - q) * 0.5, ox: r1(x + w / 2), oy: r1(y - n.taille * 0.35), r: 0 }, kids: [{ ...n, lignes: [ch], align: 'start', x: r1(x), y: r1(y) }] });
      x += w + n.ls;
    });
  });
  return { k: 'g', kids: out };
}
