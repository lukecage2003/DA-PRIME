// Primestone · les familles de miniatures et leurs variantes.
// Chaque variante renvoie ses calques { fond, illustration, graphisme, textes, marque } à partir des données saisies.
// Les briques graphiques viennent de briques.js ; lumière, atmosphère et traitement des personnages d'ambiances.js.
// Principe 0.9 : une famille = un usage éditorial et une mise en scène propre (lumière, profondeur, échelle du sujet).
import { W, H, C, G, M, esc, texte, zone, image, rubrique, sceau, credit, lame, largeur } from './briques.js';
import * as A from './ambiances.js';

const champsBase = (titre, rub, extra = []) => [
  { id: 'titre', type: 'texte', label: 'Titre', defaut: titre, conseil: '3 mots maximum' },
  ...extra,
  { id: 'rubrique', type: 'texte', label: 'Rubrique', defaut: rub },
  { id: 'credit', type: 'texte', label: 'Crédit artiste', defaut: '', conseil: 'Ex. : Art : Nom de l’artiste · Éditeur' },
];
const TITRE = { police: 'display', tMax: 170, tMin: 72, interligne: 0.88 };
// Titre posé par le haut de sa boîte : la première ligne de base = haut + hauteur de capitale
const titreHaut = (top, x, couleur, ancre = 'start', extra = {}) => (f) => ({ x, y: top + f.cap, couleur, ancre, ...extra });
const hauteurBloc = (f, il = 0.88) => f.cap + (f.lignes.length - 1) * f.taille * il;
const marque = (d, rubFond, rubTexte, sceauFond, sceauLettre, credCouleur) => rubrique(d.rubrique, rubFond, rubTexte).svg + sceau(sceauFond, sceauLettre) + credit(d.credit, credCouleur);

const fondPlein = (c) => `<rect width="${W}" height="${H}" fill="${c}"/>`;
const plein = { x: 0, y: 0, w: W, h: H, mode: 'couvrir' };
const avec = (filtre, svg) => (svg ? `<g filter="url(#${filtre})">${svg}</g>` : '');
const lueur = (id, svg, couleur = '#000', flou = 12, op = 0.8) => (svg ? A.filtreLueur(id, couleur, flou, op) + `<g filter="url(#${id})">${svg}</g>` : '');
// Personnage mis en scène : contour d'encre, ombre portée, lumière de contour, aura éventuelle
const heros = (id, d, z, f, interne) => avec(f, image(id, d[id], z, { filtre: interne, clip: false }));
// Étoiles vectorielles (aucune police Primestone ne contient ★)
const etoiles = (n, x, y, t, plein, vide) => Array.from({ length: 5 }, (_, i) => {
  const cx = x + i * t * 1.15 + t / 2, cy = y + t / 2, pts = Array.from({ length: 10 }, (_, k) => { const r = k % 2 ? t * 0.21 : t / 2, a = (Math.PI / 5) * k - Math.PI / 2; return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`; }).join(' ');
  return `<polygon points="${pts}" fill="${i < n ? plein : 'none'}" stroke="${i < n ? 'none' : vide}" stroke-width="${i < n ? 0 : 2.5}"/>`;
}).join('');
// Étiquette texte encadrée (éditeur)
const etiquette = (id, txt, x, y, couleur, droite = false) => {
  const fs = 27, ls = 3.8, t = String(txt || '').toLocaleUpperCase('fr-FR'); if (!t) return '';
  const w = Math.ceil(largeur(t, 'mono', fs, ls) + 40), h = fs + 30, x0 = droite ? x - w : x;
  return `<rect x="${x0 + 2}" y="${y + 2}" width="${w - 4}" height="${h - 4}" fill="none" stroke="${couleur}" stroke-width="4"/><text id="${id}" data-ps-champ="${id}" x="${x0 + 20}" y="${(y + 15 + fs * 0.76).toFixed(1)}" font-family="${M.mono.family}" font-weight="700" font-size="${fs}" letter-spacing="${ls}" fill="${couleur}">${esc(t)}</text>`;
};
// Couverture traitée comme un objet photographié : ombre douce, bord, reflet au sol facultatif, pivot autour du centre
const OMBRE_COUV = `<filter id="ombre-couv" x="-30%" y="-30%" width="160%" height="170%"><feDropShadow dx="14" dy="26" stdDeviation="18" flood-color="#000" flood-opacity="0.6"/></filter>`;
const couverture = (ctx, d, id, label, z, rot, bord, { ombre = 'douce', num, reflet = false, numFond = C.y, numTexte = C.k } = {}) => {
  zone(ctx, id, { ...z, mode: 'couvrir', label, requis: true });
  const cx = z.x + z.w / 2, cy = z.y + z.h / 2, img = image(id, d[id], { ...z, mode: 'couvrir' });
  const corps = `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" fill="${C.k}"/>${img}<rect x="${z.x + 3}" y="${z.y + 3}" width="${z.w - 6}" height="${z.h - 6}" fill="none" stroke="${bord}" stroke-width="6"/>`
    + `<linearGradient id="${id}-brillance" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.22"/><stop offset="0.35" stop-color="#fff" stop-opacity="0"/></linearGradient><rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" fill="url(#${id}-brillance)"/>`;
  const refl = reflet && d[id]?.href ? `<linearGradient id="${id}-rg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity="0.32"/><stop offset="0.5" stop-color="#fff" stop-opacity="0"/></linearGradient><mask id="${id}-rm"><rect x="${z.x}" y="${z.y + z.h}" width="${z.w}" height="${z.h}" fill="url(#${id}-rg)"/></mask><g mask="url(#${id}-rm)"><g transform="translate(0 ${2 * (z.y + z.h)}) scale(1 -1)">${img.split(`${id}-`).join(`${id}-r-`).replace(` id="${id}"`, '').replace(/ data-ps-champ="[^"]*"/g, '')}</g></g>` : '';
  const pastille = num ? `<circle cx="${z.x + 4}" cy="${z.y + z.h - 4}" r="34" fill="${numFond}" stroke="${C.k}" stroke-width="6"/><text x="${z.x + 4}" y="${z.y + z.h + 12}" text-anchor="middle" font-family="${M.display.family}" font-size="46" fill="${numTexte}">${num}</text>` : '';
  const sombre = ombre === 'dure' ? `<rect x="${z.x + 18}" y="${z.y + 18}" width="${z.w}" height="${z.h}" fill="${C.k}"/>${corps}` : `<g filter="url(#ombre-couv)">${corps}</g>`;
  return `<g transform="rotate(${rot} ${cx} ${cy})">${refl}${sombre}${pastille}</g>`;
};
const img = (id, label, placeholder, extra = {}) => ({ id, type: 'image', label, placeholder, ...extra });
const ENCRE_HEROS = (id, o) => A.filtreHeros(id, { encre: C.k, epaisseur: G.ink, ...o });

export default {
  // Portrait héroïque : le personnage domine, éclairé à contre-jour ; titre-concept en bloc, écho typographique en fond
  '01-analyse-personnage': {
    nom: 'Analyse de personnage',
    description: 'Portrait héroïque : personnage monumental à contre-jour, rayons, titre-concept en bloc.',
    champs: champsBase("L'Espoir", 'Analyse · Personnage', [{ id: 'personnage', type: 'image', label: 'Personnage détouré', placeholder: 'encre' }]),
    variantes: Object.fromEntries([
      ['jaune', 'Fond jaune', C.y, C.k, false],
      ['noir', 'Fond noir', C.k, C.y, false],
      ['miroir', 'Personnage à gauche', C.y, C.k, true],
    ].map(([id, nom, fond, encre, miroir]) => [id, { nom, rendre(d, ctx) {
      const sombre = fond === C.k, z = zone(ctx, 'personnage', miroir ? { x: -40, y: -20, w: 780, h: 770, mode: 'contenir', label: 'Personnage', requis: true } : { x: 540, y: -20, w: 780, h: 770, mode: 'contenir', label: 'Personnage', requis: true });
      const cx = z.x + z.w / 2, cy = 250, x = miroir ? W - G.m : G.m, ancre = miroir ? 'end' : 'start', top = 150;
      let fT; const t = texte(ctx, d, 'titre', 'Titre', { ...TITRE, tMax: 180, l: 540, h: 340, maxLignes: 2 }, (f) => { fT = f; return titreHaut(top, x, encre, ancre)(f); }, { titre: true, requis: true });
      const fy = top + (fT.vide ? 0 : hauteurBloc(fT)) + 34;
      const echo = String(d.titre || '').toLocaleUpperCase('fr-FR').replace(/^L['’]/, '');
      const fondSvg = sombre
        ? fondPlein('#070707') + A.halo('f1-h', cx, cy, 520, C.y, 0.5) + A.halo('f1-h2', cx, H + 60, 620, '#FF7A1A', 0.35, { ry: 260 }) + A.rayons('f1-r', cx, cy, { n: 16, couleur: C.y, op: 0.22, longueur: 1300, graine: 4 })
          + A.brume('f1-b', W, 600, { couleur: '#3A3020', op: 0.5 })
        : A.degrade('f1-d', W, H, [[0, '#FFF6A0'], [0.5, C.y], [1, '#F2B705']], miroir ? 180 : 0) + A.halo('f1-h', cx, cy, 560, '#FFFFFF', 0.75) + A.rayons('f1-r', cx, cy, { n: 18, couleur: '#FFFFFF', op: 0.5, longueur: 1300, graine: 4 })
          + A.trame('f1-t', 0, 0, W, H, { couleur: C.k, pas: 18, rayon: 4.5, angle: 20, op: 0.16, fondu: miroir ? 'droite' : 'gauche' });
      const echoSvg = echo ? `<text x="${miroir ? 40 : W - 40}" y="${H - 150}" text-anchor="${miroir ? 'start' : 'end'}" font-family="${M.display.family}" font-size="300" letter-spacing="-4" fill="none" stroke="${encre}" stroke-width="2.5" opacity="${sombre ? 0.22 : 0.18}">${esc(echo.slice(0, 9))}</text>` : '';
      return {
        fond: fondSvg + echoSvg,
        illustration: (sombre ? ENCRE_HEROS('f1-p', { contour: C.y, aura: C.y, auraOp: 0.35, ombre: 0.7, lumiere: [miroir ? 1 : -1, -1] }) : ENCRE_HEROS('f1-p', { contour: '#FFFFFF', ombre: 0.32, lumiere: [miroir ? 1 : -1, -1], modele: 0.22 }))
          + A.ombreSol('f1-s', cx, H - 6, z.w * 0.8, sombre ? 0.8 : 0.35) + heros('personnage', d, z, 'f1-p') + (sombre ? A.vignette('f1-v', W, H, 0.65, cx, cy) + A.grain('f1-g', W, H, 0.1) : A.grain('f1-g', W, H, 0.06)),
        graphisme: fT.vide ? '' : lame(miroir ? W - G.m - 240 : G.m, fy, 220, 16, encre),
        textes: t,
        marque: marque(d, encre, fond, encre, fond, encre),
      };
    } }])),
  },
  // Objet de collection : la couverture photographiée sous un projecteur, reflet au sol, note de la rédaction
  '02-analyse-comic': {
    nom: 'Analyse de comic',
    description: 'La couverture comme objet de collection : projecteur, ombre, reflet, note de la rédaction.',
    champs: champsBase('Sous-estimé ?', 'Analyse · Comic', [{ id: 'note', type: 'choix', label: 'Note', options: ['0', '1', '2', '3', '4', '5'], defaut: '4' }, img('couverture', 'Couverture', 'pop'), img('couverture2', 'Seconde couverture', 'noir', { variantes: ['duo'] })]),
    variantes: Object.fromEntries([['inclinee', 'Couverture inclinée', C.k, C.y], ['jaune', 'Fond jaune', C.y, C.k], ['duo', 'Deux couvertures', C.k, C.y]].map(([id, nom, fond, encre]) => [id, { nom, rendre(d, ctx) {
      const duo = id === 'duo', jaune = fond === C.y, top = 150; let fT;
      const t = texte(ctx, d, 'titre', 'Titre', { ...TITRE, tMax: 150, l: 600, h: 300, maxLignes: 2 }, (f) => { fT = f; return titreHaut(top, G.m, encre)(f); }, { titre: true, requis: true });
      const ny = top + (fT.vide ? 0 : hauteurBloc(fT)) + 38;
      const fondSvg = jaune
        ? A.degrade('f2-d', W, H, [[0, '#FFF2A0'], [1, '#F5C400']], 30) + A.vitesse(980, 340, { n: 70, r0: 330, couleur: C.k, op: 0.12, graine: 8 }) + A.trame('f2-t', 0, 0, W, H, { couleur: C.k, pas: 16, rayon: 4, op: 0.14, fondu: 'droite', angle: 15 })
        : fondPlein('#0A0A0A') + A.halo('f2-h', 970, 360, 480, '#FFD94A', 0.22) + A.faisceau('f2-f', 980, 120, 980, 760, H, { couleur: '#FFF6D0', op: 0.2 }) + A.ombreSol('f2-s', 980, 660, 620, 0.9) + `<rect y="640" width="${W}" height="${H - 640}" fill="#000" opacity="0.35"/>`;
      const cov = duo
        ? couverture(ctx, d, 'couverture2', 'Seconde couverture', { x: 720, y: 96, w: 290, h: 435 }, -7, C.k) + couverture(ctx, d, 'couverture', 'Couverture', { x: 930, y: 120, w: 300, h: 450 }, 5, encre, { reflet: true })
        : couverture(ctx, d, 'couverture', 'Couverture', { x: 790, y: 70, w: 370, h: 555 }, jaune ? 6 : 3, jaune ? C.k : C.k, { ombre: jaune ? 'dure' : 'douce', reflet: !jaune });
      const note = +d.note || 0;
      return {
        fond: fondSvg + OMBRE_COUV,
        illustration: cov + (jaune ? '' : A.vignette('f2-v', W, H, 0.6) + A.grain('f2-g', W, H, 0.08)),
        graphisme: `<g id="note" data-ps-champ="note">${etoiles(note, G.m, ny, 46, encre, encre)}</g><text x="${G.m + 5 * 46 * 1.15 + 16}" y="${ny + 38}" font-family="${M.mono.family}" font-weight="700" font-size="30" letter-spacing="2" fill="${encre}">${note}/5</text>`,
        textes: t,
        marque: marque(d, encre, fond, encre, fond, encre),
      };
    } }])),
  },
  // Flash d'actualité : sujet propulsé par des lignes de vitesse, bandeau incliné, filet rouge réservé à l'actu
  '03-actualites': {
    nom: 'Actualités Marvel et DC',
    description: 'Flash d’actualité : personnage propulsé, bandeau incliné à filet rouge, éditeur en haut à droite.',
    champs: champsBase('Il revient', 'Actu', [{ id: 'editeur', type: 'texte', label: 'Éditeur', defaut: 'Marvel' }, img('personnage', 'Personnage détouré', 'encre')]),
    variantes: Object.fromEntries([['bandeau-noir', 'Bandeau noir', C.y, C.k], ['bandeau-jaune', 'Bandeau jaune', C.k, C.y]].map(([id, nom, fond, bande]) => [id, { nom, rendre(d, ctx) {
      const encre = bande === C.k ? C.y : C.k, sombre = fond === C.k, z = zone(ctx, 'personnage', { x: 470, y: 0, w: 760, h: 560, mode: 'contenir', label: 'Personnage', requis: true }), cx = z.x + z.w / 2, cy = 210;
      const t = texte(ctx, d, 'titre', 'Titre', { ...TITRE, tMax: 140, tMin: 64, l: 850, h: 130, maxLignes: 1 }, (f) => ({ x: 200, y: 552 + f.cap, couleur: encre }), { titre: true, requis: true });
      if (String(d.editeur || '').length > 14) ctx.alertes.push({ niveau: 'attention', champ: 'editeur', message: 'Éditeur : 14 caractères maximum.' });
      const yb = 512, o = W * Math.tan((G.angle * Math.PI) / 180) * 0.22;
      return {
        fond: (sombre ? fondPlein('#080808') + A.halo('f3-h', cx, cy, 520, C.red, 0.35) + A.vitesse(cx, cy, { n: 80, r0: 300, couleur: C.y, op: 0.16, graine: 9 })
          : A.degrade('f3-d', W, H, [[0, '#FFF3A6'], [1, '#F7C600']], 90) + A.vitesse(cx, cy, { n: 80, r0: 300, couleur: C.k, op: 0.14, graine: 9 }) + A.halo('f3-h', cx, cy, 460, '#FFFFFF', 0.6)),
        illustration: ENCRE_HEROS('f3-p', { contour: sombre ? C.y : '#FFFFFF', aura: sombre ? C.red : null, auraOp: 0.45, ombre: sombre ? 0.7 : 0.3, lumiere: [1, -1] }) + heros('personnage', d, z, 'f3-p'),
        graphisme: `<polygon points="0,${yb + o} ${W},${yb - o} ${W},${H} 0,${H}" fill="${C.red}"/><polygon points="0,${yb + o + 12} ${W},${yb - o + 12} ${W},${H} 0,${H}" fill="${bande}"/>`
          + `<g opacity="${sombre ? 0.12 : 0.1}">${Array.from({ length: 9 }, (_, i) => `<polygon points="${960 + i * 34},${H} ${984 + i * 34},${H} ${1010 + i * 34},${yb + 40} ${986 + i * 34},${yb + 40}" fill="${encre}"/>`).join('')}</g>`,
        textes: t,
        marque: rubrique(d.rubrique, C.red, C.w).svg + `<circle cx="${G.m + rubrique(d.rubrique, C.red, C.w).w + 22}" cy="${G.m + 28}" r="9" fill="${C.red}"/>` + etiquette('editeur', d.editeur, W - G.m, G.m, sombre ? C.y : C.k, true) + sceau(encre, bande) + credit(d.credit, encre),
      };
    } }])),
  },
  // Enquête : image plongée dans la nuit, faisceau de lampe, brume, point d'interrogation lumineux
  '04-theories': {
    nom: 'Théories',
    description: 'Enquête nocturne : image assombrie et teintée, faisceau, brume, point d’interrogation lumineux.',
    champs: champsBase("C'était lui ?", 'Théorie', [img('decor', 'Image plein cadre', 'noir')]),
    variantes: {
      question: { nom: 'Point d’interrogation', rendre(d, ctx) {
        zone(ctx, 'decor', { ...plein, label: 'Image', requis: true });
        const t = texte(ctx, d, 'titre', 'Titre', { ...TITRE, tMax: 140, tMin: 64, l: 640, h: 380, maxLignes: 3 }, (f) => ({ x: W - G.m, y: 150 + f.cap, couleur: C.y, ancre: 'end' }), { titre: true, requis: true });
        return {
          fond: fondPlein(C.k0),
          illustration: image('decor', d.decor, plein, { filtre: 'assombri' }) + `<rect width="${W}" height="${H}" fill="#06122E" opacity="0.5" style="mix-blend-mode:multiply"/>` + A.faisceau('f4-f', 120, 60, 420, 640, H, { couleur: '#FFF3B0', op: 0.28 }) + A.brume('f4-b', W, 610, { couleur: '#8FA0C8', op: 0.4 }) + A.vignette('f4-v', W, H, 0.85, 420, 380),
          graphisme: A.halo('f4-h', 420, 470, 300, C.y, 0.45) + A.filtreLueur('f4-l', C.y, 22, 0.55) + `<linearGradient id="f4-q" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FFF7B8"/><stop offset="0.5" stop-color="${C.y}"/><stop offset="1" stop-color="#E0A800"/></linearGradient><text x="420" y="660" text-anchor="middle" font-family="${M.display.family}" font-size="500" fill="url(#f4-q)" filter="url(#f4-l)">?</text>` + A.grain('f4-g', W, H, 0.12),
          textes: lueur('f4-tl', t),
          marque: marque(d, C.y, C.k, C.y, C.k, C.w),
        };
      } },
      gauche: { nom: 'Titre à gauche', rendre(d, ctx) {
        zone(ctx, 'decor', { ...plein, label: 'Image', requis: true });
        const t = texte(ctx, d, 'titre', 'Titre', { ...TITRE, tMax: 140, tMin: 64, l: 620, h: 380, maxLignes: 3 }, (f) => ({ x: G.m, y: 150 + f.cap, couleur: C.y }), { titre: true, requis: true });
        // Loupe : tout est plongé dans l'ombre sauf un cercle de lumière sur l'indice
        return {
          fond: fondPlein(C.k0),
          illustration: image('decor', d.decor, plein) + `<rect width="${W}" height="${H}" fill="#0A1838" opacity="0.45" style="mix-blend-mode:multiply"/>`
            + `<radialGradient id="f4-o" gradientUnits="userSpaceOnUse" cx="930" cy="330" r="560"><stop offset="0.36" stop-color="#000" stop-opacity="0"/><stop offset="0.42" stop-color="#000" stop-opacity="0.72"/><stop offset="1" stop-color="#000" stop-opacity="0.9"/></radialGradient><rect width="${W}" height="${H}" fill="url(#f4-o)"/>`
            + `<rect width="${W}" height="${H}" fill="url(#voile-gauche)"/>` + A.grain('f4-g', W, H, 0.12),
          graphisme: `<circle cx="930" cy="330" r="218" fill="none" stroke="${C.y}" stroke-width="5" opacity="0.85"/><circle cx="930" cy="330" r="232" fill="none" stroke="${C.y}" stroke-width="1.5" opacity="0.45"/><line x1="1085" y1="485" x2="1180" y2="580" stroke="${C.y}" stroke-width="18" stroke-linecap="round" opacity="0.85"/>`,
          textes: lueur('f4-tl', t),
          marque: marque(d, C.y, C.k, C.y, C.k, C.w),
        };
      } },
    },
  },
  // Parcours de lecture : couvertures en escalier montant, chemin pointillé numéroté
  '05-guides': {
    nom: 'Guides de lecture',
    description: 'Parcours de lecture : couvertures en escalier montant, reliées par un chemin numéroté.',
    champs: champsBase('Par où commencer', 'Guide de lecture', [img('couv1', 'Couverture 1', 'noir'), img('couv2', 'Couverture 2', 'pop'), img('couv3', 'Couverture 3', 'cosmos', { variantes: ['trois', 'noir'] })]),
    variantes: Object.fromEntries([['trois', 'Trois couvertures', C.y, C.k, 3], ['deux', 'Deux couvertures', C.y, C.k, 2], ['noir', 'Fond noir', C.k, C.y, 3]].map(([id, nom, fond, encre, n]) => [id, { nom, rendre(d, ctx) {
      const sombre = fond === C.k;
      const t = texte(ctx, d, 'titre', 'Titre', { ...TITRE, tMax: 130, tMin: 64, l: n === 3 ? 500 : 540, h: 360, maxLignes: 3 }, (f) => ({ x: G.m, y: 150 + f.cap, couleur: encre }), { titre: true, requis: true });
      const pos = n === 3 ? [[620, 300, 160, 240], [810, 200, 190, 285], [1030, 90, 215, 322]] : [[690, 220, 210, 315], [960, 90, 250, 375]];
      const centres = pos.map(([x, y, w, h]) => [x + w / 2, y + h / 2]);
      let chemin = `M${centres[0][0] - 60} ${pos[0][1] + pos[0][3] + 60}`; centres.forEach(([x], i) => { const [px, py, pw, ph] = pos[i]; chemin += ` Q${px - 30} ${py + ph + 70} ${x} ${py + ph + 34}`; });
      const cov = pos.map(([x, y, w, h], i) => A.ombreSol(`f5-s${i}`, x + w / 2, y + h + 18, w * 1.3, sombre ? 0.9 : 0.35) + couverture(ctx, d, `couv${i + 1}`, `Couverture ${i + 1}`, { x, y, w, h }, i % 2 ? 2 : -2, sombre ? C.k : C.k, { num: i + 1, numFond: sombre ? C.y : C.k, numTexte: sombre ? C.k : C.y })).join('');
      return {
        fond: (sombre ? fondPlein('#0A0A0A') + centres.map(([x, y], i) => A.halo(`f5-h${i}`, x, y, 260, '#FFE9A0', 0.16)).join('') + A.grain('f5-g', W, H, 0.08)
          : A.degrade('f5-d', W, H, [[0, '#FFF19A'], [1, '#F8C800']], 20) + `<pattern id="f5-q" width="48" height="48" patternUnits="userSpaceOnUse"><path d="M48 0H0V48" fill="none" stroke="${C.k}" stroke-width="1" opacity="0.08"/></pattern><rect width="${W}" height="${H}" fill="url(#f5-q)"/>`) + OMBRE_COUV,
        illustration: `<path d="${chemin}" fill="none" stroke="${encre}" stroke-width="5" stroke-dasharray="2 16" stroke-linecap="round" opacity="0.8"/>` + cov,
        graphisme: '',
        textes: t,
        marque: marque(d, encre, fond, encre, fond, encre),
      };
    } }])),
  },
  // Choc de deux univers : lumière chaude contre lumière froide, collision d'énergie sur l'incision
  '06-evenements': {
    nom: 'Événements',
    description: 'Choc de deux univers : lumière chaude contre lumière froide, collision d’énergie sur l’incision à 8°.',
    champs: champsBase('Crise totale', 'Événement', [img('personnageA', 'Personnage univers A', 'encre'), img('personnageB', 'Personnage univers B', 'encre')]),
    variantes: Object.fromEntries([['titre-bas', 'Titre en bas'], ['titre-haut', 'Titre en haut']].map(([id, nom]) => [id, { nom, rendre(d, ctx) {
      const haut = id === 'titre-haut', o = H * Math.tan((G.angle * Math.PI) / 180), xb = 640, cyC = haut ? 430 : 300;
      const zA = zone(ctx, 'personnageA', { x: -20, y: haut ? 180 : 20, w: 660, h: haut ? 560 : 720, mode: 'contenir', label: 'Personnage A', requis: true });
      const zB = zone(ctx, 'personnageB', { x: 640, y: haut ? 180 : 20, w: 660, h: haut ? 560 : 720, mode: 'contenir', label: 'Personnage B', requis: true });
      const t = texte(ctx, d, 'titre', 'Titre', { ...TITRE, tMax: 150, tMin: 64, l: 880, h: 150, maxLignes: 1 }, (f) => ({ x: xb, y: (haut ? 130 : 545) + f.cap, couleur: C.w, ancre: 'middle', contour: { couleur: C.k, largeur: 12 } }), { titre: true, requis: true });
      const ptsA = `0,0 ${xb + o / 2},0 ${xb - o / 2},${H} 0,${H}`, ptsB = `${xb + o / 2},0 ${W},0 ${W},${H} ${xb - o / 2},${H}`;
      return {
        fond: `<clipPath id="f6-a"><polygon points="${ptsA}"/></clipPath><clipPath id="f6-b"><polygon points="${ptsB}"/></clipPath>`
          + `<g clip-path="url(#f6-a)">${A.degrade('f6-da', W, H, [[0, '#FFF0A0'], [0.55, C.y], [1, '#F08A00']], 0)}${A.rayons('f6-ra', xb, cyC, { n: 14, couleur: '#FFFFFF', op: 0.45, longueur: 1100, graine: 6, debut: Math.PI * 0.5, fin: Math.PI * 1.5 })}${A.trame('f6-t', 0, 0, W, H, { couleur: C.k, pas: 18, rayon: 4.4, op: 0.14, fondu: 'droite' })}</g>`
          + `<g clip-path="url(#f6-b)">${A.degrade('f6-db', W, H, [[0, '#1B2C6B'], [1, '#05081C']], 0)}${A.nebuleuse('f6-n', [[1050, 200, 260, 160, '#3D5BFF', 0.5], [880, 520, 220, 140, '#00C2FF', 0.3]], 60)}${A.etoiles(xb, 0, W - xb, H, { n: 90, graine: 6 })}</g>`,
        illustration: ENCRE_HEROS('f6-pa', { contour: '#FFFFFF', aura: '#FF8A00', auraOp: 0.35, ombre: 0.35, lumiere: [1, -1] }) + ENCRE_HEROS('f6-pb', { contour: '#9FE6FF', aura: '#2E6BFF', auraOp: 0.55, ombre: 0.6, lumiere: [-1, -1] })
          + heros('personnageA', d, zA, 'f6-pa') + heros('personnageB', d, zB, 'f6-pb'),
        graphisme: A.choc('f6-c', xb + (haut ? -o * 0.1 : o * 0.1), cyC, 90, { couleur: C.y, graine: 7 }) + lame(xb - o / 2 - 7, 0, 14, H, C.k) + `<polygon points="${xb + o / 2 - 2},0 ${xb + o / 2 + 2},0 ${xb - o / 2 + 2},${H} ${xb - o / 2 - 2},${H}" fill="#FFFFFF" opacity="0.9"/>` + A.etincelles(xb - 220, cyC - 200, 440, 400, { n: 50, couleur: '#FFF3A0', graine: 8 }),
        textes: lueur('f6-tl', t, '#000', 14, 0.7),
        marque: marque(d, C.k, C.y, C.k, C.y, C.w),
      };
    } }])),
  },
  // Archive : année monumentale derrière le personnage (profondeur), trame Ben-Day, papier vieilli, frise
  '07-histoire': {
    nom: 'Histoire des comics',
    description: 'Archive : année monumentale derrière le personnage, trame Ben-Day, papier vieilli, frise du temps.',
    champs: [{ id: 'annee', type: 'texte', label: 'Année ou décennie', defaut: '1938' }, { id: 'titre', type: 'texte', label: 'Sujet', defaut: 'Action Comics #1 · la naissance du super-héros', conseil: '3 lignes maximum' }, { id: 'rubrique', type: 'texte', label: 'Rubrique', defaut: 'Histoire' }, { id: 'credit', type: 'texte', label: 'Crédit artiste', defaut: '' }, img('personnage', 'Personnage détouré', 'encre')],
    variantes: Object.fromEntries([['bichromie', 'Bichromie', 'bichromie'], ['couleur', 'Image en couleur', null]].map(([id, nom, filtre]) => [id, { nom, rendre(d, ctx) {
      const z = zone(ctx, 'personnage', { x: 600, y: 10, w: 700, h: 720, mode: 'contenir', label: 'Personnage', requis: true });
      let fA; const a = texte(ctx, d, 'annee', 'Année', { police: 'display', tMax: 320, tMin: 150, l: 760, h: 300, maxLignes: 1, interligne: 0.9 }, (f) => { fA = f; return { x: G.m - 8, y: 140 + f.cap, couleur: C.k }; }, { titre: true, requis: true });
      const sy = 140 + (fA.vide ? 0 : fA.cap) + 40;
      const t = texte(ctx, d, 'titre', 'Sujet', { police: 'mono', tMax: 30, tMin: 20, l: 470, h: 150, maxLignes: 3, interligne: 1.25, interlettre: 2.5 }, (f) => ({ x: G.m, y: sy + f.cap, couleur: C.k }));
      const frise = Array.from({ length: 22 }, (_, i) => { const x = 210 + i * 38, fort = i % 5 === 0; return `<rect x="${x}" y="${fort ? 670 : 682}" width="${fort ? 4 : 2}" height="${fort ? 30 : 18}" fill="${C.k}" opacity="${fort ? 0.85 : 0.5}"/>`; }).join('');
      return {
        fond: A.degrade('f7-d', W, H, [[0, '#FFF3B0'], [1, '#EDBE1C']], 60) + A.trame('f7-t', 0, 0, W, H, { couleur: '#7A4A00', pas: 14, rayon: 3.6, angle: 45, op: 0.22, fondu: 'droite' }) + A.halo('f7-h', 940, 320, 480, '#FFFFFF', 0.45)
          + a.replace('<text ', '<text opacity="0.94" '),
        illustration: ENCRE_HEROS('f7-p', { contour: '#FFF6C8', ombre: 0.4, lumiere: [-1, -1] }) + heros('personnage', d, z, 'f7-p', filtre || undefined) + A.grain('f7-g', W, H, 0.16, 3)
          + `<radialGradient id="f7-v" cx="0.5" cy="0.5" r="0.75"><stop offset="0.55" stop-color="#5A3A00" stop-opacity="0"/><stop offset="1" stop-color="#5A3A00" stop-opacity="0.45"/></radialGradient><rect width="${W}" height="${H}" fill="url(#f7-v)"/>`,
        graphisme: frise + `<rect x="210" y="699" width="${21 * 38 + 4}" height="2" fill="${C.k}" opacity="0.6"/>`,
        textes: t,
        marque: marque(d, C.k, C.y, C.k, C.y, C.k),
      };
    } }])),
  },
  // Échelle cosmique : décor, nébuleuse et champ d'étoiles en profondeur, lumière dorée, titre lumineux
  '08-cosmique': {
    nom: 'Dossiers cosmiques et multiversels',
    description: 'Échelle cosmique : nébuleuse et étoiles en profondeur, lumière dorée, personnage monumental en surimpression.',
    champs: champsBase("L'Entité", 'Dossier cosmique', [{ id: 'soustitre', type: 'texte', label: 'Surtitre', defaut: 'Multivers · épisode 3' }, img('decor', 'Décor plein cadre', 'cosmos'), img('personnage', 'Personnage détouré', 'encre', { variantes: ['surimpression'] })]),
    variantes: Object.fromEntries([['decor', 'Décor seul'], ['surimpression', 'Personnage en surimpression']].map(([id, nom]) => [id, { nom, rendre(d, ctx) {
      zone(ctx, 'decor', { ...plein, label: 'Décor', requis: true });
      const sur = id === 'surimpression', zP = sur ? zone(ctx, 'personnage', { x: 600, y: 20, w: 700, h: 740, mode: 'contenir', label: 'Personnage', requis: true }) : null;
      const s = texte(ctx, d, 'soustitre', 'Surtitre', { police: 'text', tMax: 26, tMin: 18, l: 620, h: 30, maxLignes: 1, interlettre: 6 }, (f) => ({ x: G.m, y: 330 + f.cap, couleur: C.w }));
      const t = texte(ctx, d, 'titre', 'Titre', { ...TITRE, tMax: 160, tMin: 72, l: 640, h: 160, maxLignes: 1 }, (f) => ({ x: G.m, y: 396 + f.cap, couleur: C.y }), { titre: true, requis: true });
      const lx = sur ? 950 : 930, ly = sur ? 230 : 300;
      return {
        fond: fondPlein(C.night),
        illustration: image('decor', d.decor, plein) + `<g style="mix-blend-mode:screen">${A.nebuleuse('f8-n', [[980, 180, 340, 200, '#7B3DFF', 0.55], [1180, 520, 300, 180, '#FF3EA5', 0.32], [700, 600, 380, 140, '#1E6BFF', 0.4]], 80)}</g>`
          + A.etoiles(0, 0, W, H, { n: 170, graine: 21, eclats: 7 }) + A.halo('f8-h', lx, ly, 420, '#FFD86B', 0.5) + A.rayons('f8-r', lx, ly, { n: 20, couleur: '#FFE9A8', op: 0.25, longueur: 900, graine: 12 })
          + `<rect width="${W}" height="${H}" fill="url(#voile-gauche)"/>`
          + (zP ? ENCRE_HEROS('f8-p', { contour: '#FFE9A8', aura: '#9C7BFF', auraOp: 0.7, ombre: 0.4, lumiere: [1, -1] }) + heros('personnage', d, zP, 'f8-p') + A.halo('f8-hb', 950, H, 520, '#7B3DFF', 0.45, { ry: 160 }) : '')
          + A.vignette('f8-v', W, H, 0.55) + A.grain('f8-g', W, H, 0.08),
        graphisme: lame(G.m, 372, 230, 8, C.y),
        textes: s + lueur('f8-tl', t, C.y, 18, 0.35),
        marque: marque(d, C.y, C.k, C.y, C.k, C.w),
      };
    } }])),
  },
  '09-affiche-cinema': {
    nom: 'Affiche cinéma',
    description: 'Plein cadre cinématographique, bandes de format scope, titre espacé et accroche.',
    champs: champsBase('Le Dernier Gardien', 'Critique', [{ id: 'accroche', type: 'texte', label: 'Accroche', defaut: 'Chaque légende a une fin.' }, img('decor', 'Image plein cadre', 'noir')]),
    variantes: Object.fromEntries([['nuit', 'Nuit argentée', C.w, C.silver], ['ambre', 'Ambre', '#F2C66D', '#F2C66D']].map(([id, nom, titreC, filet]) => [id, { nom, rendre(d, ctx) {
      const z = zone(ctx, 'decor', { ...plein, label: 'Image plein cadre', requis: true });
      const ac = texte(ctx, d, 'accroche', 'Accroche', { police: 'serif', l: 760, h: 60, maxLignes: 1, tMax: 52, tMin: 30, casse: 'none' }, (f) => ({ x: W / 2, y: 392 + f.cap, couleur: titreC, ancre: 'middle' }));
      const t = texte(ctx, d, 'titre', 'Titre', { ...TITRE, tMax: 150, tMin: 100, l: 900, h: 200, maxLignes: 2, interlettre: 6 }, (f) => ({ x: W / 2, y: 460 + f.cap, couleur: titreC, ancre: 'middle', interlettre: 6 }), { titre: true, requis: true });
      return {
        fond: fondPlein(C.k0),
        illustration: image('decor', d.decor, z, { filtre: 'assombri' }) + `<rect width="${W}" height="${H}" fill="#0A1430" opacity="${id === 'nuit' ? 0.35 : 0}" style="mix-blend-mode:multiply"/><rect width="${W}" height="${H}" fill="#3A1E00" opacity="${id === 'ambre' ? 0.3 : 0}" style="mix-blend-mode:multiply"/>` + `<rect width="${W}" height="${H}" fill="url(#voile-bas)"/>`
          + A.brume(`f9-b`, W, 600, { couleur: id === 'nuit' ? '#9FB0D8' : '#E8B070', op: 0.3 }) + A.halo('f9-h', W / 2, 470, 520, filet, 0.22, { ry: 170 }) + A.faisceau('f9-f', W / 2, 160, W / 2, 900, H, { couleur: titreC, op: 0.1 }) + A.vignette('f9-v', W, H, 0.7) + A.grain('f9-g', W, H, 0.12),
        graphisme: `<rect width="${W}" height="36" fill="${C.k0}"/><rect y="${H - 36}" width="${W}" height="36" fill="${C.k0}"/><rect x="${W / 2 - 60}" y="372" width="120" height="3" fill="${filet}"/>`,
        textes: ac + lueur('f9-tl', t, '#000', 14, 0.7),
        marque: marque(d, filet, C.k, titreC, C.k, C.w),
      };
    } }])),
  },
  '10-duel': {
    nom: 'Duel',
    description: 'Deux combattants face à face, coupe diagonale, badge central.',
    champs: champsBase('Duel', 'Versus', [{ id: 'nomA', type: 'texte', label: 'Premier combattant', defaut: 'Vortex' }, { id: 'nomB', type: 'texte', label: 'Second combattant', defaut: 'Némésis' }, img('imageA', 'Image du premier', 'pop'), img('imageB', 'Image du second', 'cosmos')]),
    variantes: Object.fromEntries([['jaune', 'Coupe jaune', C.y, C.k], ['rouge', 'Coupe rouge', C.red, C.w]].map(([id, nom, coupe, badgeT]) => [id, { nom, rendre(d, ctx) {
      const o = H * Math.tan((14 * Math.PI) / 180), mx = W / 2;
      const zA = zone(ctx, 'imageA', { x: 0, y: 0, w: mx + o, h: H, mode: 'couvrir', label: 'Image du premier', requis: true }), zB = zone(ctx, 'imageB', { x: mx - o, y: 0, w: W - mx + o, h: H, mode: 'couvrir', label: 'Image du second', requis: true });
      const ptsA = `0,0 ${mx + o},0 ${mx - o},${H} 0,${H}`, ptsB = `${mx + o},0 ${W},0 ${W},${H} ${mx - o},${H}`;
      const nom = (k, l, x, y, anc) => texte(ctx, d, k, l, { police: 'display', l: 460, h: 90, maxLignes: 1, tMax: 84, tMin: 48 }, (f) => ({ x, y: y + f.cap, couleur: C.w, ancre: anc, contour: { couleur: C.k, largeur: 10 } }));
      const t = texte(ctx, d, 'titre', 'Titre', { ...TITRE, tMax: 132, tMin: 100, l: 520, h: 140, maxLignes: 1 }, (f) => ({ x: mx, y: 290 + f.cap, couleur: badgeT, ancre: 'middle' }), { titre: true, requis: true });
      const bw = Math.min(600, Math.max(320, largeur(String(d.titre || '').toLocaleUpperCase('fr-FR'), 'display', 132) + 90));
      return {
        fond: fondPlein(C.k),
        illustration: `<clipPath id="duel-a"><polygon points="${ptsA}"/></clipPath><clipPath id="duel-b"><polygon points="${ptsB}"/></clipPath><g clip-path="url(#duel-a)">${image('imageA', d.imageA, zA)}</g><g clip-path="url(#duel-b)">${image('imageB', d.imageB, zB, { filtre: 'assombri' })}</g>`
          + `<g clip-path="url(#duel-a)">${A.degrade('f10-a', W, H, [[0, '#FF7A1A', 0], [1, '#FF7A1A', 0.28]], 0, ' style="mix-blend-mode:screen"')}</g><g clip-path="url(#duel-b)">${A.degrade('f10-b', W, H, [[0, '#2E6BFF', 0.3], [1, '#2E6BFF', 0]], 0, ' style="mix-blend-mode:screen"')}</g>`
          + A.vitesse(mx, 360, { n: 70, r0: 280, couleur: '#FFFFFF', op: 0.1, graine: 12 }) + A.vignette('f10-v', W, H, 0.6) + A.grain('f10-g', W, H, 0.08),
        graphisme: A.choc('f10-c', mx, 360, 70, { couleur: coupe, graine: 14 }) + `<polygon points="${mx + o - 10},0 ${mx + o + 10},0 ${mx - o + 10},${H} ${mx - o - 10},${H}" fill="${coupe}"/><g transform="rotate(-6 ${mx} 360)"><rect x="${mx - bw / 2}" y="272" width="${bw}" height="176" fill="${coupe}" stroke="${C.k}" stroke-width="10"/></g>`,
        textes: t + nom('nomA', 'Premier combattant', G.m + 10, 380, 'start') + nom('nomB', 'Second combattant', W - G.m - 10, 120, 'end'),
        marque: marque(d, coupe, badgeT, coupe, badgeT, C.w),
      };
    } }])),
  },
  '11-une-editoriale': {
    nom: 'Une éditoriale',
    description: 'Mise en page de magazine : filets, accroche en italique, image encadrée.',
    champs: champsBase('Le grand retour', 'Le dossier', [{ id: 'accroche', type: 'texte', label: 'Accroche', defaut: 'Trente ans de légende, en un seul numéro' }, { id: 'numero', type: 'texte', label: 'Numéro', defaut: 'N° 12' }, img('visuel', 'Visuel', 'cosmos')]),
    variantes: Object.fromEntries([['papier', 'Papier', C.paper, C.k, C.red], ['encre', 'Encre', C.k, C.paper, C.y]].map(([id, nom, fond, encre, accent]) => [id, { nom, rendre(d, ctx) {
      const z = zone(ctx, 'visuel', { x: 700, y: 92, w: 500, h: 520, mode: 'couvrir', label: 'Visuel', requis: true });
      const ac = texte(ctx, d, 'accroche', 'Accroche', { police: 'serif', l: 560, h: 110, maxLignes: 2, tMax: 48, tMin: 30, casse: 'none', interligne: 1.05 }, (f) => ({ x: G.m, y: 170 + f.cap, couleur: encre, interligne: 1.05 }));
      const t = texte(ctx, d, 'titre', 'Titre', { ...TITRE, tMax: 124, tMin: 100, l: 600, h: 220, maxLignes: 2 }, (f) => ({ x: G.m, y: 318 + f.cap, couleur: encre }), { titre: true, requis: true });
      const num = String(d.numero || '').toLocaleUpperCase('fr-FR');
      return {
        fond: fondPlein(fond),
        illustration: (id === 'papier' ? A.trame('f11-t', 0, 0, W, H, { couleur: C.k, pas: 12, rayon: 1.6, op: 0.12, fondu: 'droite' }) : A.halo('f11-h', z.x + z.w / 2, z.y + z.h / 2, 520, accent, 0.18)) + A.grain('f11-g', W, H, id === 'papier' ? 0.14 : 0.08)
          + `<filter id="f11-o" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="22" stdDeviation="22" flood-opacity="0.35"/></filter><rect x="${z.x + 14}" y="${z.y + 14}" width="${z.w}" height="${z.h}" fill="${accent}" filter="url(#f11-o)"/>` + image('visuel', d.visuel, z) + `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" fill="none" stroke="${encre}" stroke-width="6"/>`,
        graphisme: `<rect x="${G.m}" y="150" width="580" height="4" fill="${encre}"/><rect x="${G.m}" y="292" width="140" height="10" fill="${accent}"/>` + (num ? `<text x="${z.x + z.w - 18}" y="${z.y + z.h - 22}" text-anchor="end" font-family="${M.mono.family}" font-weight="700" font-size="26" letter-spacing="3" fill="${C.w}" stroke="${C.k}" stroke-width="5" paint-order="stroke">${esc(num)}</text>` : ''),
        textes: ac + t,
        marque: marque(d, encre, fond, encre, fond, encre),
      };
    } }])),
  },
};
