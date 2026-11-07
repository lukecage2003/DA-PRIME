// Primestone · Motion Studio · les huit familles de créations (mise en page adaptée aux quatre formats).
// Chaque famille : champs, emplacements d'images, directions recommandées, preset par défaut, point focal et composition.
import { C, clamp, r1, lame, lignes, melange, clair, largeur } from './motion-base.js';

const CREDIT = { id: 'credit', label: 'Crédit de l\'illustration', defaut: 'Illustration · Nom de l\'artiste', conseil: 'droits des artistes' };
// Style des titres selon la direction : contour encré (pop), lueur (cinéma), aplat (éditorial)
function titre(k) {
  const { dir, u } = k;
  if (dir.style === 'pop') return { fill: C.w, stroke: dir.encre, lw: r1((6 + 10 * k.eff('encrage')) * u) };
  if (dir.style === 'nuit' || dir.style === 'cosmos') return { fill: dir.texte, glow: k.eff('lueur') > 0 ? { c: dir.accent, b: r1((10 + 30 * k.eff('lueur')) * u) } : null };
  return { fill: dir.texte };
}
// Empile des textes dans une colonne ; h : part de la hauteur disponible. Renvoie le bas de la colonne utilisée.
function colonne(k, { x, y, l, h }, items) {
  const gap = k.m * 0.32; let cy = y;
  const total = items.reduce((s, it) => s + it.h, 0), dispo = h - gap * (items.length - 1);
  for (const it of items) {
    const hh = (it.h / total) * dispo;
    const o = { x: x + (it.dx || 0), y: cy + (it.bande ? hh * 0.12 : 0), l: l - (it.dx || 0), h: it.bande ? hh * 0.76 : hh, police: it.police, maxL: it.maxL ?? 2, tMax: it.tMax, casse: it.casse, ls: it.ls, align: it.align, requis: it.requis, ...it.style };
    const b = it.liste ? k.liste(it.id, it.label, lignes(k.txt(it.id)).slice(0, it.max || 6), { ...o, hLigne: Math.min(hh / Math.max(1, lignes(k.txt(it.id)).slice(0, it.max || 6).length), it.tMax * 1.45), fill: it.style?.fill, seq: it.seq })
      : k.texte(it.id, it.label, o, { seq: it.seq, role: it.role, bande: it.bande, requis: it.requis });
    cy += (it.compact && b.h ? b.h + (it.bande ? b.h * 0.9 : 0) : hh) + gap;
  }
  return cy;
}
const kicker = (k, id, label, seq = 1, h = 0.1) => ({ id, label, police: 'mono', h, maxL: 1, tMax: Math.round(30 * k.u), ls: 3, bande: { fill: k.dir.accent }, style: { fill: k.dir.surAccent }, seq, compact: true });
const voile = (k, op = 0.55) => k.couche('voile', 'Voile de lisibilité', 'forme', 0, [{ k: 'rect', x: 0, y: 0, w: k.W, h: k.H, fill: { rad: [k.W / 2, k.H / 2, Math.hypot(k.W, k.H) * 0.55], st: [[0, C.k0, op], [1, C.k0, op * 0.4]] } }], { box: { x: 0, y: 0, w: k.W, h: k.H } });
const split = (s) => { const m = String(s).split(/\s*(?:\||—|–|:|\s-\s)\s*/); return m.map((x) => x.trim()); };
const vertical = (k) => k.port || k.carre;

export default {
  'annonce': {
    nom: 'Annonce de série', description: 'Nouvelle série ou équipe créative', directions: ['primestone', 'une', 'pop', 'nuit', 'pulp'], preset: 'revelation',
    champs: [{ id: 'surtitre', label: 'Surtitre', defaut: 'Nouvelle série' }, { id: 'titre', label: 'Titre', defaut: 'Les Veilleurs' }, { id: 'soustitre', label: 'Accroche', defaut: 'Une saga cosmique en douze numéros' },
      { id: 'equipe', label: 'Équipe créative', type: 'texte-long', defaut: 'Scénario · Alix Martin\nDessin · Lou Diaz\nCouleurs · Kai Ito', conseil: 'une ligne par personne' }, { id: 'date', label: 'Date', defaut: 'Mars 2027' }, CREDIT],
    images: [{ id: 'visuel', label: 'Visuel', placeholder: 'cosmos', mode: 'couvrir' }],
    foyer: (k) => (vertical(k) ? [k.W / 2, k.H * 0.25] : [k.W * 0.72, k.H * 0.45]),
    composer(k) {
      const { W, H, m, tan, u, dir } = k; let col;
      if (vertical(k)) { const h0 = H * (k.port ? 0.48 : 0.44), o = W * tan * 0.8; k.illustration('visuel', 'Visuel', { x: 0, y: 0, w: W, h: h0 + o, mode: 'couvrir' }, { clip: [0, 0, W, 0, W, h0, 0, h0 + o] }); col = { x: m, y: h0 + o + m * 0.6, l: W - 2 * m, h: H - h0 - o - m * 2.6 }; }
      else { const x0 = W * 0.44, o = H * tan * 1.6; k.illustration('visuel', 'Visuel', { x: x0, y: 0, w: W - x0, h: H, mode: 'couvrir' }, { clip: [x0 + o, 0, W, 0, W, H, x0, H] }); col = { x: m, y: m, l: x0 - m * 1.4, h: H - 2 * m }; }
      colonne(k, col, [kicker(k, 'surtitre', 'Surtitre'),
        { id: 'titre', label: 'Titre', police: 'display', h: 0.34, maxL: 3, tMax: Math.round(180 * u), role: 'titre', requis: true, seq: 2, style: titre(k), compact: true },
        { id: 'soustitre', label: 'Accroche', police: 'serif', casse: 'none', h: 0.14, maxL: 2, tMax: Math.round(54 * u), style: { fill: dir.texte }, seq: 3, compact: true },
        { id: 'equipe', label: 'Équipe créative', liste: true, police: 'textBold', h: 0.24, tMax: Math.round(32 * u), style: { fill: dir.texte }, seq: 4, compact: true, max: 5 },
        { id: 'date', label: 'Date', police: 'display', h: 0.12, maxL: 1, tMax: Math.round(54 * u), bande: { fill: dir.encre }, style: { fill: clair(dir.encre) ? C.k : dir.accent === dir.encre ? C.w : dir.accent }, seq: 5, compact: true, dx: Math.round(14 * u) }]);
    },
  },
  'couverture': {
    nom: 'Révélation de couverture', description: 'Présenter une couverture inédite', directions: ['primestone', 'nuit', 'une', 'cosmos', 'noir'], preset: 'zoom',
    champs: [{ id: 'surtitre', label: 'Surtitre', defaut: 'Couverture dévoilée' }, { id: 'titre', label: 'Titre de la série', defaut: 'Les Veilleurs' }, { id: 'numero', label: 'Numéro', defaut: 'n°1' },
      { id: 'mention', label: 'Mention', defaut: 'Couverture variante' }, { id: 'artiste', label: 'Artiste', defaut: 'Couverture · Nom de l\'artiste' }, { id: 'date', label: 'Date', defaut: 'En librairie le 12 mars' }, CREDIT],
    images: [{ id: 'couverture', label: 'Couverture', placeholder: 'pop', mode: 'couvrir' }],
    foyer: (k) => { const z = zoneCouv(k); return [z.x + z.w / 2, z.y + z.h / 2]; },
    composer(k) {
      const { W, H, m, u, dir } = k, z = zoneCouv(k);
      k.illustration('couverture', 'Couverture', { ...z, mode: 'couvrir' }, { ombre: true, rot: k.port ? 0 : -3, seq: 0 });
      const col = k.port ? { x: m, y: z.y + z.h + m * 0.6, l: W - 2 * m, h: H - z.y - z.h - m * 2.4 } : { x: m, y: m, l: z.x - m * 2.2, h: H - 2 * m };
      const al = k.port ? 'middle' : 'start';
      colonne(k, col, [{ ...kicker(k, 'surtitre', 'Surtitre'), align: al },
        { id: 'titre', label: 'Titre', police: 'display', h: 0.3, maxL: 2, tMax: Math.round(150 * u), role: 'titre', requis: true, seq: 2, style: titre(k), align: al, compact: true },
        { id: 'numero', label: 'Numéro', police: 'display', h: 0.22, maxL: 1, tMax: Math.round(170 * u), style: { fill: dir.accent, stroke: dir.style === 'pop' ? dir.encre : undefined, lw: 8 * u }, role: 'titre', seq: 3, align: al, compact: true },
        { id: 'mention', label: 'Mention', police: 'serif', casse: 'none', h: 0.1, maxL: 1, tMax: Math.round(48 * u), style: { fill: dir.texte }, seq: 4, align: al, compact: true },
        { id: 'artiste', label: 'Artiste', police: 'textBold', casse: 'none', h: 0.08, maxL: 1, tMax: Math.round(30 * u), style: { fill: dir.texte }, seq: 4, align: al, compact: true },
        { id: 'date', label: 'Date', police: 'mono', h: 0.08, maxL: 1, tMax: Math.round(28 * u), ls: 2, style: { fill: dir.accent === dir.fond ? dir.texte : dir.accent }, seq: 5, align: al, compact: true }]);
    },
  },
  'personnage': {
    nom: 'Révélation de personnage', description: 'Héros, héroïne ou vilain', directions: ['primestone', 'noir', 'pop', 'nuit', 'cosmos'], preset: 'revelation',
    champs: [{ id: 'surtitre', label: 'Surtitre', defaut: 'Le vilain' }, { id: 'nom', label: 'Nom', defaut: 'Némésis' }, { id: 'accroche', label: 'Accroche', defaut: 'Elle a déjà gagné.' }, { id: 'premiere', label: 'Première apparition', defaut: 'Première apparition · n°4' }, CREDIT],
    images: [{ id: 'personnage', label: 'Personnage (détouré de préférence)', placeholder: 'encre', mode: 'contenir', requis: true }],
    foyer: (k) => (vertical(k) ? [k.W / 2, k.H * 0.36] : [k.W * 0.7, k.H * 0.5]),
    composer(k) {
      const { W, H, m, u, dir } = k;
      const echo = { police: 'display', maxL: 1, tMax: Math.round(H * 0.6), casse: 'upper' };
      const zone = vertical(k) ? { x: m * 0.5, y: H * 0.05, w: W - m, h: H * (k.port ? 0.6 : 0.56), mode: 'contenir' } : { x: W * 0.4, y: m * 0.6, w: W * 0.58, h: H - m * 0.6, mode: 'contenir' };
      // Écho du nom en fond, très grand et discret
      const nomE = (k.txt('nom') || '').toLocaleUpperCase('fr-FR'); if (nomE) {
        const t = Math.min(echo.tMax, (W * 1.05) / Math.max(1, largeur(nomE, 'display', 1)));
        k.couche('echo', 'Écho du nom', 'texte', 0, [{ k: 'text', lignes: [nomE], police: 'display', taille: Math.round(t), pas: 0, ls: 0, align: 'middle', x: W / 2, y: vertical(k) ? zone.y + zone.h * 0.62 : H * 0.72, fill: dir.style === 'pop' ? C.w : melange(dir.fond, dir.accent, 0.35), op: dir.style === 'pop' ? 0.5 : 0.35 }], { box: { x: 0, y: H * 0.3, w: W, h: t * 0.8 } });
      }
      k.illustration('personnage', 'Personnage', zone, { seq: 1 });
      const col = vertical(k) ? { x: m, y: zone.y + zone.h + m * 0.4, l: W - 2 * m, h: H - zone.y - zone.h - m * 2.4 } : { x: m, y: m * 1.4, l: W * 0.4, h: H - m * 3 };
      colonne(k, col, [kicker(k, 'surtitre', 'Surtitre', 2),
        { id: 'nom', label: 'Nom', police: 'display', h: 0.42, maxL: 2, tMax: Math.round(210 * u), role: 'titre', requis: true, seq: 3, style: titre(k), compact: true },
        { id: 'accroche', label: 'Accroche', police: 'serif', casse: 'none', h: 0.16, maxL: 2, tMax: Math.round(64 * u), style: { fill: dir.style === 'noir' ? dir.accent : dir.texte }, seq: 4, compact: true },
        { id: 'premiere', label: 'Première apparition', police: 'mono', h: 0.08, maxL: 1, tMax: Math.round(26 * u), ls: 2, style: { fill: dir.texte }, seq: 5, compact: true }]);
    },
  },
  'equipe': {
    nom: 'Révélation d\'équipe', description: 'Roster, équipe ou distribution', directions: ['primestone', 'pop', 'une', 'nuit', 'noir'], preset: 'volets',
    champs: [{ id: 'surtitre', label: 'Surtitre', defaut: 'L\'équipe est formée' }, { id: 'titre', label: 'Titre', defaut: 'L\'Escouade' },
      { id: 'membres', label: 'Membres', type: 'texte-long', defaut: 'Vega — la stratège\nBrasier — le colosse\nOmbre — l\'infiltrée\nÉclat — le prodige', conseil: '2 à 5 lignes · Nom — rôle' }, CREDIT],
    images: [1, 2, 3, 4, 5].map((i) => ({ id: `membre${i}`, label: `Membre ${i}`, placeholder: ['pop', 'noir', 'cosmos', 'pop', 'noir'][i - 1], mode: 'couvrir' })),
    foyer: (k) => [k.W / 2, k.H * 0.6],
    composer(k) {
      const { W, H, m, u, tan, dir } = k, mem = lignes(k.txt('membres')).slice(0, 5), N = Math.max(1, mem.length);
      if (mem.length < 2) k.alerte('attention', 'membres', 'Membres : indiquer au moins deux lignes.');
      if (lignes(k.txt('membres')).length > 5) k.alerte('attention', 'membres', 'Membres : cinq au maximum, les lignes suivantes sont ignorées.');
      const haut = vertical(k) ? H * 0.2 : H * 0.27;
      colonne(k, { x: m, y: m, l: W - 2 * m, h: haut - m }, [kicker(k, 'surtitre', 'Surtitre', 0, 0.3), { id: 'titre', label: 'Titre', police: 'display', h: 0.7, maxL: 1, tMax: Math.round(140 * u), role: 'titre', requis: true, seq: 1, style: titre(k), compact: true }]);
      const y0 = haut + m * 0.3, y1 = H - m * 2.2, gap = 14 * u;
      mem.forEach((ligne, i) => {
        const [nom, role] = split(ligne); let zone, pts, tb;
        if (vertical(k)) { const rh = (y1 - y0 - gap * (N - 1)) / N, y = y0 + i * (rh + gap), o = rh * tan; zone = { x: m, y, w: W - 2 * m, h: rh }; pts = [m + o, y, W - m, y, W - m - o, y + rh, m, y + rh]; tb = { x: m + o + 20 * u, y: y + rh * 0.52, l: (W - 2 * m) * 0.6, h: rh * 0.4 }; }
        else { const pw = (W - 2 * m - gap * (N - 1)) / N, x = m + i * (pw + gap), h = y1 - y0, o = h * tan * 0.6; zone = { x, y: y0, w: pw, h }; pts = lame(x, y0, pw - o, h, 8 * 0.6); tb = { x: x + 16 * u, y: y1 - h * 0.26, l: pw - o - 32 * u, h: h * 0.22 }; }
        k.illustration(`membre${i + 1}`, `Membre ${i + 1}`, { ...zone, mode: 'couvrir' }, { clip: pts.map(r1), seq: 2 + i });
        const fn = { police: 'display', x: tb.x, y: tb.y, l: tb.l, h: tb.h * 0.62, maxL: 1, tMax: Math.round(72 * u), valign: 'bas' };
        const kb = (o, txt, id) => ({ ...o, _t: txt, _id: id });
        const items = [kb({ ...fn, champ: 'membres', label: `Membre ${i + 1}` }, nom, 'nom'), kb({ champ: 'membres', label: `Rôle ${i + 1}`, police: 'mono', x: tb.x, y: tb.y + tb.h * 0.66, l: tb.l, h: tb.h * 0.3, maxL: 1, tMax: Math.round(26 * u), ls: 2 }, role || '', 'role')];
        const nodes = []; let bx = null;
        for (const it of items) { if (!it._t) continue; const { textes } = k.doc; void textes; const b = blocTxt(k, it._t, it); if (!b) continue; bx = bx ? unir(bx, b.box) : b.box; nodes.push(b); }
        if (bx) { const p = 12 * u; k.couche(`nom${i + 1}`, `Nom ${i + 1}`, 'texte', 2 + i, [{ k: 'poly', pts: lame(bx.x - p, bx.y - p, bx.w + 2 * p, bx.h + 2 * p).map(r1), fill: dir.encre, op: 0.88 }, ...nodes.map((b, j) => ({ ...b.node, fill: j ? dir.accent : C.w }))], { box: bx, champ: 'membres' }); }
      });
    },
  },
  'evenement': {
    nom: 'Crossover et événement', description: 'Deux camps, un événement', directions: ['primestone', 'cosmos', 'pop', 'noir', 'nuit'], preset: 'zoom',
    champs: [{ id: 'surtitre', label: 'Surtitre', defaut: 'Événement' }, { id: 'camp1', label: 'Premier camp', defaut: 'Les Veilleurs' }, { id: 'liaison', label: 'Liaison', defaut: 'contre' },
      { id: 'camp2', label: 'Second camp', defaut: 'La Ligue rouge' }, { id: 'titre', label: 'Nom de l\'événement', defaut: 'Collision' }, { id: 'date', label: 'Date', defaut: 'Été 2027' }, CREDIT],
    images: [{ id: 'gauche', label: 'Premier camp', placeholder: 'cosmos', mode: 'couvrir' }, { id: 'droite', label: 'Second camp', placeholder: 'noir', mode: 'couvrir' }],
    foyer: (k) => [k.W / 2, k.H / 2],
    composer(k) {
      const { W, H, m, u, tan, dir } = k, st = titre(k);
      if (vertical(k)) {
        const o = W * tan * 1.4, mid = H / 2;
        k.illustration('gauche', 'Premier camp', { x: 0, y: 0, w: W, h: mid + o, mode: 'couvrir' }, { clip: [0, 0, W, 0, W, mid - o, 0, mid + o], seq: 0 });
        k.illustration('droite', 'Second camp', { x: 0, y: mid - o, w: W, h: H - mid + o, mode: 'couvrir' }, { clip: [0, mid + o, W, mid - o, W, H, 0, H], seq: 1 });
        voile(k, 0.45); k.bande('seam', 'Séparation', [0, mid + o - 6 * u, W, mid - o - 6 * u, W, mid - o + 6 * u, 0, mid + o + 6 * u].map(r1), dir.accent, 1);
        colonne(k, { x: m, y: m, l: W - 2 * m, h: H * 0.2 }, [{ ...kicker(k, 'surtitre', 'Surtitre', 2, 0.3), align: 'middle' }, { id: 'camp1', label: 'Premier camp', police: 'display', h: 0.7, maxL: 2, tMax: Math.round(90 * u), style: st, seq: 2, align: 'middle', compact: true }]);
        k.texte('titre', 'Nom de l\'événement', { police: 'display', x: m, y: mid - H * 0.11, l: W - 2 * m, h: H * 0.16, maxL: 1, tMax: Math.round(230 * u), align: 'middle', valign: 'milieu', ...st, stroke: dir.encre, lw: r1(10 * u), requis: true }, { seq: 3, role: 'titre' });
        k.texte('liaison', 'Liaison', { police: 'serif', casse: 'none', x: m, y: mid + H * 0.06, l: W - 2 * m, h: H * 0.05, maxL: 1, tMax: Math.round(56 * u), align: 'middle', fill: C.w }, { seq: 4 });
        k.texte('camp2', 'Second camp', { police: 'display', x: m, y: H * 0.7, l: W - 2 * m, h: H * 0.1, maxL: 2, tMax: Math.round(90 * u), align: 'middle', ...st }, { seq: 4 });
        k.texte('date', 'Date', { police: 'mono', x: m, y: H * 0.83, l: W - 2 * m, h: H * 0.035, maxL: 1, tMax: Math.round(30 * u), ls: 3, align: 'middle', fill: dir.surAccent }, { seq: 5, bande: { fill: dir.accent } });
      } else {
        const o = H * tan * 1.4, mid = W / 2;
        k.illustration('gauche', 'Premier camp', { x: 0, y: 0, w: mid + o, h: H, mode: 'couvrir' }, { clip: [0, 0, mid + o, 0, mid - o, H, 0, H], seq: 0 });
        k.illustration('droite', 'Second camp', { x: mid - o, y: 0, w: W - mid + o, h: H, mode: 'couvrir' }, { clip: [mid + o, 0, W, 0, W, H, mid - o, H], seq: 1 });
        voile(k, 0.45); k.bande('seam', 'Séparation', [mid + o - 7 * u, 0, mid + o + 7 * u, 0, mid - o + 7 * u, H, mid - o - 7 * u, H].map(r1), dir.accent, 1);
        k.texte('surtitre', 'Surtitre', { police: 'mono', x: m, y: m * 1.1, l: W - 2 * m, h: 34 * u, maxL: 1, tMax: Math.round(30 * u), ls: 3, align: 'middle', fill: dir.surAccent }, { seq: 2, bande: { fill: dir.accent } });
        k.texte('camp1', 'Premier camp', { police: 'display', x: m, y: H * 0.66, l: W * 0.36, h: H * 0.2, maxL: 2, tMax: Math.round(96 * u), ...st }, { seq: 2 });
        k.texte('camp2', 'Second camp', { police: 'display', x: W * 0.62 - m, y: H * 0.14, l: W * 0.38, h: H * 0.2, maxL: 2, tMax: Math.round(96 * u), align: 'end', ...st }, { seq: 2 });
        k.texte('titre', 'Nom de l\'événement', { police: 'display', x: W * 0.12, y: H * 0.36, l: W * 0.76, h: H * 0.26, maxL: 1, tMax: Math.round(260 * u), align: 'middle', valign: 'milieu', ...st, stroke: dir.encre, lw: r1(12 * u), requis: true }, { seq: 3, role: 'titre' });
        k.texte('liaison', 'Liaison', { police: 'serif', casse: 'none', x: W * 0.3, y: H * 0.27, l: W * 0.4, h: H * 0.07, maxL: 1, tMax: Math.round(60 * u), align: 'middle', fill: C.w }, { seq: 4 });
        k.texte('date', 'Date', { police: 'mono', x: W * 0.3, y: H * 0.68, l: W * 0.4, h: 34 * u, maxL: 1, tMax: Math.round(30 * u), ls: 3, align: 'middle', fill: dir.surAccent }, { seq: 5, bande: { fill: dir.accent } });
      }
    },
  },
  'dossier': {
    nom: 'Dossier de personnage', description: 'Fiche, pouvoirs et statistiques', directions: ['primestone', 'une', 'pulp', 'nuit', 'noir'], preset: 'deplacement',
    champs: [{ id: 'surtitre', label: 'Surtitre', defaut: 'Dossier' }, { id: 'nom', label: 'Nom', defaut: 'Némésis' }, { id: 'alias', label: 'Alias', defaut: 'Ancienne gardienne déchue' },
      { id: 'fiche', label: 'Fiche', type: 'texte-long', defaut: 'Première apparition : n°4 (2019)\nCréateurs : A. Martin, L. Diaz\nAffiliation : La Ligue rouge', conseil: 'une information par ligne' },
      { id: 'stats', label: 'Statistiques', type: 'texte-long', defaut: 'Force : 8\nIntelligence : 9\nVitesse : 6\nRésistance : 7', conseil: 'Nom : valeur sur 10' }, CREDIT],
    images: [{ id: 'portrait', label: 'Portrait', placeholder: 'noir', mode: 'couvrir' }],
    foyer: (k) => (vertical(k) ? [k.W * 0.3, k.H * 0.22] : [k.W * 0.22, k.H * 0.5]),
    composer(k) {
      const { W, H, m, u, dir } = k; let z, col, bas;
      if (vertical(k)) { z = { x: m, y: m * 1.2, w: W * 0.46, h: H * (k.port ? 0.34 : 0.4) }; col = { x: z.x + z.w + m * 0.7, y: m * 1.2, l: W - z.x - z.w - m * 1.7, h: z.h }; bas = { x: m, y: z.y + z.h + m * 0.8, l: W - 2 * m, h: H - z.y - z.h - m * 3.4 }; }
      else { z = { x: m * 1.2, y: m * 1.2, w: W * 0.3, h: H - m * 2.6 }; const x = z.x + z.w + m * 1.2; col = { x, y: m, l: W - x - m, h: H * 0.36 }; bas = { x, y: m + H * 0.38, l: W - x - m, h: H - m * 2.6 - H * 0.38 }; }
      k.illustration('portrait', 'Portrait', { ...z, mode: 'couvrir' }, { ombre: true, rot: -2, seq: 0 });
      colonne(k, col, [kicker(k, 'surtitre', 'Surtitre', 1, 0.16), { id: 'nom', label: 'Nom', police: 'display', h: 0.54, maxL: 2, tMax: Math.round(150 * u), role: 'titre', requis: true, seq: 2, style: titre(k), compact: true },
        { id: 'alias', label: 'Alias', police: 'serif', casse: 'none', h: 0.3, maxL: 2, tMax: Math.round(50 * u), style: { fill: dir.texte }, seq: 3, compact: true }]);
      const fiche = lignes(k.txt('fiche')).slice(0, 5), stats = lignes(k.txt('stats')).slice(0, 6).map(split).map(([n, v]) => [n, clamp((parseFloat(String(v).replace(',', '.')) || 0) / (/%/.test(v) ? 100 : 10))]);
      const hf = bas.h * (fiche.length / Math.max(1, fiche.length + stats.length * 1.25));
      const yb = k.liste('fiche', 'Fiche', fiche, { x: bas.x, y: bas.y, l: bas.l, hLigne: Math.min(hf / Math.max(1, fiche.length), (k.port ? 76 : 54) * u), police: 'textBold', tMax: Math.round(30 * u), fill: dir.texte, seq: 4 });
      if (stats.length) {
        const y0 = bas.y + yb.h + m * 0.5, lh = Math.min((bas.y + bas.h - y0) / stats.length, (k.port ? 96 : 64) * u), lab = bas.l * 0.34, tw = bas.l - lab - 70 * u, bh = Math.max(10, lh * 0.38);
        const box = { x: bas.x, y: y0, w: bas.l, h: lh * stats.length };
        k.couche('stats', 'Statistiques', 'texte', 5, [], { box, champ: 'stats', prog: (p) => stats.flatMap(([n, v], i) => { const y = y0 + i * lh, q = clamp(p * 1.4 - i * 0.1);
          return [{ k: 'text', lignes: [String(n).toLocaleUpperCase('fr-FR')], police: 'mono', taille: Math.round(Math.min(24 * u, lh * 0.42)), pas: 0, ls: 1.5, align: 'start', x: bas.x, y: r1(y + lh * 0.55), fill: dir.texte },
            { k: 'rect', x: r1(bas.x + lab), y: r1(y + (lh - bh) / 2), w: r1(tw), h: r1(bh), fill: dir.texte, op: 0.15 },
            { k: 'poly', pts: lame(bas.x + lab, y + (lh - bh) / 2, Math.max(0.01, tw * v * q), bh).map(r1), fill: dir.accent },
            { k: 'text', lignes: [String(Math.round(v * 10 * q))], police: 'display', taille: Math.round(lh * 0.6), pas: 0, ls: 0, align: 'end', x: r1(bas.x + bas.l), y: r1(y + lh * 0.72), fill: dir.texte }]; }) });
        k.couches.at(-1).kids = k.couches.at(-1).prog(1);
      }
    },
  },
  'cosmique': {
    nom: 'Hiérarchie cosmique', description: 'Carte d\'univers, niveaux de puissance', directions: ['primestone', 'cosmos', 'nuit', 'une', 'pop'], preset: 'particules',
    champs: [{ id: 'titre', label: 'Titre', defaut: 'L\'ordre cosmique' }, { id: 'soustitre', label: 'Sous-titre', defaut: 'Hiérarchie des puissances de l\'univers' },
      { id: 'niveaux', label: 'Niveaux', type: 'texte-long', defaut: 'Les Éternels — au-delà du temps\nLes Architectes — ils façonnent les mondes\nLes Gardiens — ils veillent sur les galaxies\nLes Hérauts — ils portent la parole\nLes Mortels — et pourtant…', conseil: '3 à 7 lignes, du plus puissant au plus humble · Nom — description' },
      { id: 'disposition', label: 'Disposition', type: 'choix', options: ['Pyramide', 'Orbites'], defaut: 'Pyramide' }, CREDIT],
    images: [{ id: 'visuel', label: 'Fond illustré', placeholder: 'cosmos', mode: 'couvrir' }],
    foyer: (k) => (vertical(k) ? [k.W / 2, k.H * 0.45] : [k.W * 0.36, k.H * 0.55]),
    composer(k) {
      const { W, H, m, u, dir } = k, niv = lignes(k.txt('niveaux')).slice(0, 7).map(split), N = Math.max(1, niv.length);
      if (niv.length < 3) k.alerte('attention', 'niveaux', 'Niveaux : trois lignes au moins sont recommandées.');
      k.illustration('visuel', 'Fond illustré', { x: 0, y: 0, w: W, h: H, mode: 'couvrir' }, { seq: 0, op: 0.3, contour: false });
      const hT = vertical(k) ? H * 0.17 : H * 0.22;
      colonne(k, { x: m, y: m, l: W - 2 * m, h: hT - m * 0.5 }, [{ id: 'titre', label: 'Titre', police: 'display', h: 0.7, maxL: 1, tMax: Math.round(130 * u), role: 'titre', requis: true, seq: 1, style: titre(k), compact: true, align: vertical(k) ? 'middle' : 'start' },
        { id: 'soustitre', label: 'Sous-titre', police: 'serif', casse: 'none', h: 0.3, maxL: 1, tMax: Math.round(46 * u), style: { fill: dir.texte }, seq: 1, compact: true, align: vertical(k) ? 'middle' : 'start' }]);
      const y0 = hT + m * 0.2, y1 = H - m * 2.2, coul = (i) => melange(dir.accent, dir.accent2, N > 1 ? i / (N - 1) : 0);
      if (k.txt('disposition') === 'Orbites') {
        const cx = vertical(k) ? W / 2 : W * 0.33, cy = vertical(k) ? y0 + (H * 0.62 - y0) / 2 : (y0 + y1) / 2, R = vertical(k) ? W * 0.44 : Math.min(W * 0.3, (y1 - y0) * 0.95);
        const lx = vertical(k) ? m : W * 0.6, ly0 = vertical(k) ? H * 0.64 : y0 + m * 0.4, lh = ((vertical(k) ? y1 : y1) - ly0) / N;
        k.couche('coeur', 'Cœur', 'forme', 2, [{ k: 'circ', x: r1(cx), y: r1(cy), r: r1(R * 0.22), fill: { rad: [r1(cx), r1(cy), r1(R * 0.22)], st: [[0, C.w, 0.9], [0.4, dir.accent, 0.8], [1, dir.accent, 0]] } }], { box: { x: cx - R * 0.22, y: cy - R * 0.22, w: R * 0.44, h: R * 0.44 } });
        niv.forEach(([nom, desc], i) => {
          const rx = R * (0.16 + (0.84 * (i + 1)) / N), ry = rx * 0.38, a = -0.5 + i * 0.32, nx = cx + Math.cos(a) * rx, ny = cy + Math.sin(a) * ry, ty = ly0 + i * lh;
          const d = `M${r1(cx - rx)} ${r1(cy)}A${r1(rx)} ${r1(ry)} 0 1 0 ${r1(cx + rx)} ${r1(cy)}A${r1(rx)} ${r1(ry)} 0 1 0 ${r1(cx - rx)} ${r1(cy)}Z`;
          const lab = blocTxt(k, nom, { champ: 'niveaux', label: `Niveau ${i + 1}`, police: 'display', x: lx + 30 * u, y: ty, l: W - lx - m - 30 * u, h: lh * 0.5, maxL: 1, tMax: Math.round(52 * u) }), ds = desc ? blocTxt(k, desc, { police: 'text', casse: 'none', x: lx + 30 * u, y: ty + lh * 0.52, l: W - lx - m - 30 * u, h: lh * 0.32, maxL: 1, tMax: Math.round(26 * u) }) : null;
          const kids = [{ k: 'path', d, fill: 'none', stroke: coul(i), lw: r1(3 * u), op: 0.8 }, { k: 'path', d: `M${r1(nx)} ${r1(ny)}L${r1(lx + 10 * u)} ${r1(ty + lh * 0.25)}`, fill: 'none', stroke: coul(i), lw: r1(1.5 * u), op: 0.6 },
            { k: 'circ', x: r1(nx), y: r1(ny), r: r1(10 * u), fill: coul(i) }, lab && { ...lab.node, fill: coul(i) }, ds && { ...ds.node, fill: dir.texte }];
          k.couche(`niveau${i + 1}`, `Niveau ${i + 1}`, 'element', 3 + i, kids, { box: { x: cx - rx, y: Math.min(cy - ry, ty), w: W - (cx - rx) - m, h: Math.max(ry * 2, lh) }, champ: 'niveaux' });
        });
      } else {
        const A = vertical(k) ? W - 2 * m : W * 0.5, cx = vertical(k) ? W / 2 : m + A / 2, gap = 10 * u, th = (y1 - y0 - gap * (N - 1)) / N, w0 = vertical(k) ? 0.42 : 0.26;
        niv.forEach(([nom, desc], i) => {
          const y = y0 + i * (th + gap), wt = A * (w0 + ((1 - w0) * i) / N), wb = A * (w0 + ((1 - w0) * (i + 1)) / N), f = coul(i), tc = clair(f) ? C.k : C.w;
          const pts = [cx - wt / 2, y, cx + wt / 2, y, cx + wb / 2, y + th, cx - wb / 2, y + th].map(r1), kids = [{ k: 'poly', pts, fill: f, op: 0.92 }];
          if (vertical(k)) { const a = blocTxt(k, nom, { police: 'display', x: cx - wt / 2 + 10 * u, y: y + th * 0.08, l: wt - 20 * u, h: th * (desc ? 0.5 : 0.8), maxL: 1, tMax: Math.round(64 * u), align: 'middle', valign: 'milieu' }); a && kids.push({ ...a.node, fill: tc });
            const b = desc && blocTxt(k, desc, { police: 'text', casse: 'none', x: cx - wt / 2 + 10 * u, y: y + th * 0.6, l: wt - 20 * u, h: th * 0.32, maxL: 1, tMax: Math.round(26 * u), align: 'middle' }); b && kids.push({ ...b.node, fill: tc }); }
          else { const a = blocTxt(k, nom, { police: 'display', x: cx - wt / 2 + 10 * u, y: y + th * 0.15, l: wt - 20 * u, h: th * 0.7, maxL: 1, tMax: Math.round(60 * u), align: 'middle', valign: 'milieu' }); a && kids.push({ ...a.node, fill: tc });
            const lx = m + A + m * 0.8, b = desc && blocTxt(k, desc, { police: 'text', casse: 'none', x: lx, y: y + th * 0.2, l: W - lx - m, h: th * 0.6, maxL: 2, tMax: Math.round(34 * u), valign: 'milieu' });
            if (b) kids.push({ k: 'rect', x: r1(cx + wb / 2 + 12 * u), y: r1(y + th / 2 - 1.5 * u), w: r1(Math.max(4, lx - cx - wb / 2 - 24 * u)), h: r1(3 * u), fill: f }, { ...b.node, fill: dir.texte }); }
          k.couche(`niveau${i + 1}`, `Niveau ${i + 1}`, 'element', 2 + i, kids, { box: { x: m, y, w: W - 2 * m, h: th }, champ: 'niveaux' });
        });
      }
    },
  },
  'chronologie': {
    nom: 'Chronologie', description: 'Ordre de lecture, dates clés', directions: ['primestone', 'une', 'pulp', 'nuit', 'pop'], preset: 'apparition',
    champs: [{ id: 'titre', label: 'Titre', defaut: 'Ordre de lecture' }, { id: 'soustitre', label: 'Sous-titre', defaut: 'Par où commencer la saga' },
      { id: 'etapes', label: 'Étapes', type: 'texte-long', defaut: '2019 | Origines | n°1 à 6\n2020 | La Chute | n°7 à 12\n2021 | Collision | événement en 8 parties\n2023 | Renaissance | nouvelle série\n2025 | Le Dernier Gardien | conclusion', conseil: '3 à 7 lignes · Date | Titre | note' }, CREDIT],
    images: [{ id: 'visuel', label: 'Fond illustré', placeholder: 'noir', mode: 'couvrir' }],
    foyer: (k) => [k.W * 0.5, k.H * 0.55],
    composer(k) {
      const { W, H, m, u, dir, tan } = k, et = lignes(k.txt('etapes')).slice(0, 7).map(split), N = Math.max(1, et.length);
      if (et.length < 3) k.alerte('attention', 'etapes', 'Étapes : trois lignes au moins sont recommandées.');
      k.illustration('visuel', 'Fond illustré', { x: 0, y: 0, w: W, h: H, mode: 'couvrir' }, { seq: 0, op: 0.22, contour: false });
      const hT = vertical(k) ? H * 0.17 : H * 0.22;
      colonne(k, { x: m, y: m, l: W - 2 * m, h: hT - m * 0.4 }, [{ id: 'titre', label: 'Titre', police: 'display', h: 0.68, maxL: 1, tMax: Math.round(130 * u), role: 'titre', requis: true, seq: 1, style: titre(k), compact: true },
        { id: 'soustitre', label: 'Sous-titre', police: 'serif', casse: 'none', h: 0.32, maxL: 1, tMax: Math.round(46 * u), style: { fill: dir.texte }, seq: 1, compact: true }]);
      const pastille = (x, y, i) => [{ k: 'circ', x: r1(x), y: r1(y), r: r1(26 * u), fill: dir.accent, stroke: dir.encre, lw: r1(4 * u) }, { k: 'text', lignes: [String(i + 1)], police: 'display', taille: Math.round(30 * u), pas: 0, ls: 0, align: 'middle', x: r1(x), y: r1(y + 11 * u), fill: dir.surAccent }];
      if (vertical(k)) {
        const ax = m + 30 * u, y0 = hT + m * 0.4, y1 = H - m * 2.6, sp = (y1 - y0) / N;
        k.couche('axe', 'Axe', 'forme', 1, [], { box: { x: ax - 4, y: y0, w: 8, h: y1 - y0 }, prog: (p) => [{ k: 'rect', x: r1(ax - 3 * u), y: r1(y0), w: r1(6 * u), h: r1(Math.max(1, (y1 - y0) * p)), fill: dir.texte }] });
        et.forEach(([date, tit, note], i) => {
          const y = y0 + i * sp, x = ax + 60 * u, l = W - x - m, kids = [...pastille(ax, y + sp * 0.3, i)];
          const a = blocTxt(k, date, { police: 'display', x, y: y + sp * 0.06, l, h: sp * 0.36, maxL: 1, tMax: Math.round(64 * u) }), b = tit && blocTxt(k, tit, { police: 'textBold', casse: 'none', x, y: y + sp * 0.46, l, h: sp * 0.22, maxL: 1, tMax: Math.round(38 * u) }), c = note && blocTxt(k, note, { police: 'text', casse: 'none', x, y: y + sp * 0.7, l, h: sp * 0.18, maxL: 1, tMax: Math.round(28 * u) });
          a && kids.push({ ...a.node, fill: dir.style === 'papier' ? dir.texte : dir.accent }); b && kids.push({ ...b.node, fill: dir.texte }); c && kids.push({ ...c.node, fill: dir.texte, op: 0.8 });
          k.couche(`etape${i + 1}`, `Étape ${i + 1}`, 'element', 2 + i, kids, { box: { x: ax - 30 * u, y, w: W - ax - m, h: sp }, champ: 'etapes' });
        });
      } else {
        const x0 = m, x1 = W - m, yA = H * 0.6, pente = -H * 0.05, sp = (x1 - x0) / N, cw = Math.min(sp * 1.8, W * 0.32), ch = H * 0.2, yAt = (x) => yA + pente * ((x - x0) / (x1 - x0));
        k.couche('axe', 'Axe', 'forme', 1, [], { box: { x: x0, y: yA - 40, w: x1 - x0, h: 80 }, prog: (p) => { const xe = x0 + (x1 - x0) * p; return [{ k: 'poly', pts: [x0, yAt(x0) - 4 * u, xe, yAt(xe) - 4 * u, xe, yAt(xe) + 4 * u, x0, yAt(x0) + 4 * u].map(r1), fill: dir.texte }]; } });
        et.forEach(([date, tit, note], i) => {
          const x = x0 + sp * (i + 0.5), y = yAt(x), haut = i % 2 === 0, cy = haut ? y - 50 * u - ch : y + 50 * u, cx = clamp(x - cw / 2, m, W - m - cw), kids = [{ k: 'rect', x: r1(x - 1.5 * u), y: r1(haut ? cy + ch : y), w: r1(3 * u), h: r1(50 * u), fill: dir.texte, op: 0.6 }, ...pastille(x, y, i)];
          const a = blocTxt(k, date, { police: 'display', x: cx, y: cy, l: cw, h: ch * 0.42, maxL: 1, tMax: Math.round(70 * u), align: 'middle' }), b = tit && blocTxt(k, tit, { police: 'textBold', casse: 'none', x: cx, y: cy + ch * 0.5, l: cw, h: ch * 0.24, maxL: 1, tMax: Math.round(36 * u), align: 'middle' }), c = note && blocTxt(k, note, { police: 'text', casse: 'none', x: cx, y: cy + ch * 0.78, l: cw, h: ch * 0.2, maxL: 1, tMax: Math.round(26 * u), align: 'middle' });
          a && kids.push({ ...a.node, fill: dir.style === 'papier' ? dir.texte : dir.accent }); b && kids.push({ ...b.node, fill: dir.texte }); c && kids.push({ ...c.node, fill: dir.texte, op: 0.8 });
          void tan; k.couche(`etape${i + 1}`, `Étape ${i + 1}`, 'element', 2 + i, kids, { box: { x: cx, y: haut ? cy : y - 26 * u, w: cw, h: ch + 76 * u }, champ: 'etapes' });
        });
      }
    },
  },
};
// Zone de la couverture (proportions 2:3)
function zoneCouv(k) {
  const { W, H, m } = k;
  if (k.port) { const h = H * 0.5, w = h * 0.667; return { x: (W - w) / 2, y: m * 1.1, w, h }; }
  const h = H * (k.carre ? 0.7 : 0.8), w = h * 0.667; return { x: W - m * 2.4 - w, y: (H - h) / 2, w, h };
}
// Texte ajusté hors calque (assemblé ensuite dans un calque composite) ; les débordements sont signalés.
import { bloc } from './motion-base.js';
function blocTxt(k, txt, o) { const b = bloc({ alerte: (n, c, msg) => k.alerte('attention', c, msg) }, o.champ, o.label || 'Texte', txt, { casse: 'upper', ...o }); return b.node ? b : null; }
const unir = (a, b) => { const x = Math.min(a.x, b.x), y = Math.min(a.y, b.y); return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y }; };
