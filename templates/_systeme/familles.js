// Primestone · les familles de miniatures et leurs variantes.
// Chaque variante renvoie ses calques { fond, illustration, graphisme, textes, marque } à partir des données saisies.
// Les briques graphiques viennent de briques.js.
import { W, H, C, G, M, esc, texte, zone, image, rubrique, sceau, credit, lame, largeur } from './briques.js';

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
// Couverture en case-cadre : ombre décalée, bord, image rognée, pivot autour du centre
const couverture = (ctx, d, id, label, z, rot, bord, ombre, num) => {
  zone(ctx, id, { ...z, mode: 'couvrir', label, requis: true });
  const cx = z.x + z.w / 2, cy = z.y + z.h / 2;
  return `<g transform="rotate(${rot} ${cx} ${cy})">${ombre ? `<rect x="${z.x + 16}" y="${z.y + 16}" width="${z.w}" height="${z.h}" fill="${ombre}"/>` : ''}<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" fill="${C.k}"/>${image(id, d[id], { ...z, mode: 'couvrir' })}<rect x="${z.x + 3}" y="${z.y + 3}" width="${z.w - 6}" height="${z.h - 6}" fill="none" stroke="${bord}" stroke-width="6"/>${num ? `<rect x="${z.x}" y="${z.y + z.h - 50}" width="50" height="50" fill="${C.k}"/><text x="${z.x + 25}" y="${z.y + z.h - 11}" text-anchor="middle" font-family="${M.display.family}" font-size="40" fill="${C.y}">${num}</text>` : ''}</g>`;
};
const img = (id, label, placeholder, extra = {}) => ({ id, type: 'image', label, placeholder, ...extra });

export default {
  '01-analyse-personnage': {
    nom: 'Analyse de personnage',
    description: 'Personnage détouré, titre-concept en capitales.',
    champs: champsBase("L'Espoir", 'Analyse · Personnage', [{ id: 'personnage', type: 'image', label: 'Personnage détouré', placeholder: 'encre' }]),
    variantes: Object.fromEntries([
      ['jaune', 'Fond jaune', C.y, C.k, false],
      ['noir', 'Fond noir', C.k, C.y, false],
      ['miroir', 'Personnage à gauche', C.y, C.k, true],
    ].map(([id, nom, fond, encre, miroir]) => [id, { nom, rendre(d, ctx) {
      const z = zone(ctx, 'personnage', miroir ? { x: 0, y: 40, w: 700, h: 680, mode: 'contenir', label: 'Personnage', requis: true } : { x: 560, y: 40, w: 720, h: 680, mode: 'contenir', label: 'Personnage', requis: true });
      const x = miroir ? W - G.m : G.m, ancre = miroir ? 'end' : 'start', top = 150;
      let fT; const t = texte(ctx, d, 'titre', 'Titre', { ...TITRE, l: 560, h: 330, maxLignes: 2 }, (f) => { fT = f; return titreHaut(top, x, encre, ancre)(f); }, { titre: true, requis: true });
      const fy = top + (fT.vide ? 0 : hauteurBloc(fT)) + 30;
      return {
        fond: `<rect width="${W}" height="${H}" fill="${fond}"/>`,
        illustration: image('personnage', d.personnage, z, { filtre: fond === C.k ? 'encre-jaune' : 'encre', clip: false }),
        graphisme: fT.vide ? '' : lame(miroir ? W - G.m - 230 : G.m, fy, 210, 14, encre),
        textes: t,
        marque: marque(d, encre, fond, encre, fond, encre),
      };
    } }])),
  },
  '02-analyse-comic': {
    nom: 'Analyse de comic',
    description: 'La couverture entière en case-cadre, avec la note de la rédaction.',
    champs: champsBase('Sous-estimé ?', 'Analyse · Comic', [{ id: 'note', type: 'choix', label: 'Note', options: ['0', '1', '2', '3', '4', '5'], defaut: '4' }, img('couverture', 'Couverture', 'pop'), img('couverture2', 'Seconde couverture', 'noir', { variantes: ['duo'] })]),
    variantes: Object.fromEntries([['inclinee', 'Couverture inclinée', C.k, C.y], ['jaune', 'Fond jaune', C.y, C.k], ['duo', 'Deux couvertures', C.k, C.y]].map(([id, nom, fond, encre]) => [id, { nom, rendre(d, ctx) {
      const duo = id === 'duo', top = 150; let fT;
      const t = texte(ctx, d, 'titre', 'Titre', { ...TITRE, tMax: 150, l: 620, h: 300, maxLignes: 2 }, (f) => { fT = f; return titreHaut(top, G.m, encre)(f); }, { titre: true, requis: true });
      const ny = top + (fT.vide ? 0 : hauteurBloc(fT)) + 34;
      const cov = duo ? couverture(ctx, d, 'couverture2', 'Seconde couverture', { x: 760, y: 90, w: 300, h: 450 }, -5, encre, null) + couverture(ctx, d, 'couverture', 'Couverture', { x: 900, y: 140, w: 300, h: 450 }, 4, encre, encre)
        : couverture(ctx, d, 'couverture', 'Couverture', { x: 800, y: 80, w: 360, h: 540 }, 3, fond === C.k ? C.k : C.k, encre);
      return { fond: fondPlein(fond), illustration: cov, graphisme: `<g id="note" data-ps-champ="note">${etoiles(+d.note || 0, G.m, ny, 38, encre, encre)}</g>`, textes: t, marque: marque(d, encre, fond, encre, fond, encre) };
    } }])),
  },
  '03-actualites': {
    nom: 'Actualités Marvel et DC',
    description: 'Pastille rouge réservée à l’actu, éditeur en haut à droite, bandeau de titre.',
    champs: champsBase('Il revient', 'Actu', [{ id: 'editeur', type: 'texte', label: 'Éditeur', defaut: 'Marvel' }, img('personnage', 'Personnage détouré', 'encre')]),
    variantes: Object.fromEntries([['bandeau-noir', 'Bandeau noir', C.y, C.k], ['bandeau-jaune', 'Bandeau jaune', C.k, C.y]].map(([id, nom, fond, bande]) => [id, { nom, rendre(d, ctx) {
      const encre = bande === C.k ? C.y : C.k;
      const z = zone(ctx, 'personnage', { x: 540, y: 30, w: 700, h: 470, mode: 'contenir', label: 'Personnage', requis: true });
      const t = texte(ctx, d, 'titre', 'Titre', { ...TITRE, tMax: 140, tMin: 64, l: 860, h: 130, maxLignes: 1 }, (f) => ({ x: 190, y: 545 + f.cap, couleur: encre }), { titre: true, requis: true });
      if (String(d.editeur || '').length > 14) ctx.alertes.push({ niveau: 'attention', champ: 'editeur', message: 'Éditeur : 14 caractères maximum.' });
      return {
        fond: fondPlein(fond),
        illustration: image('personnage', d.personnage, z, { filtre: fond === C.k ? 'encre-jaune' : 'encre', clip: false }),
        graphisme: `<rect x="0" y="500" width="${W}" height="${H - 500}" fill="${bande}"/>`,
        textes: t,
        marque: rubrique(d.rubrique, C.red, C.w).svg + etiquette('editeur', d.editeur, W - G.m, G.m, fond === C.k ? C.y : C.k, true) + sceau(encre, bande) + credit(d.credit, encre),
      };
    } }])),
  },
  '04-theories': {
    nom: 'Théories',
    description: 'Image plein cadre assombrie, titre en question.',
    champs: champsBase("C'était lui ?", 'Théorie', [img('decor', 'Image plein cadre', 'noir')]),
    variantes: {
      question: { nom: 'Point d’interrogation', rendre(d, ctx) {
        zone(ctx, 'decor', { ...plein, label: 'Image', requis: true });
        const t = texte(ctx, d, 'titre', 'Titre', { ...TITRE, tMax: 130, tMin: 64, l: 640, h: 380, maxLignes: 3 }, (f) => ({ x: W - G.m, y: 140 + f.cap, couleur: C.y, ancre: 'end' }), { titre: true, requis: true });
        return { fond: fondPlein(C.k0), illustration: image('decor', d.decor, plein, { filtre: 'assombri' }), graphisme: `<text x="420" y="700" text-anchor="middle" font-family="${M.display.family}" font-size="520" fill="${C.y}" opacity="0.92">?</text>`, textes: t, marque: marque(d, C.y, C.k, C.y, C.k, C.w) };
      } },
      gauche: { nom: 'Titre à gauche', rendre(d, ctx) {
        zone(ctx, 'decor', { ...plein, label: 'Image', requis: true });
        const t = texte(ctx, d, 'titre', 'Titre', { ...TITRE, tMax: 130, tMin: 64, l: 640, h: 380, maxLignes: 3 }, (f) => ({ x: G.m, y: 150 + f.cap, couleur: C.y }), { titre: true, requis: true });
        return { fond: fondPlein(C.k0), illustration: image('decor', d.decor, plein, { filtre: 'assombri' }) + `<rect width="${W}" height="${H}" fill="url(#voile-gauche)"/>`, graphisme: '', textes: t, marque: marque(d, C.y, C.k, C.y, C.k, C.w) };
      } },
    },
  },
  '05-guides': {
    nom: 'Guides de lecture',
    description: 'Couvertures numérotées en escalier : l’ordre de lecture se lit sans texte.',
    champs: champsBase('Par où commencer', 'Guide de lecture', [img('couv1', 'Couverture 1', 'noir'), img('couv2', 'Couverture 2', 'pop'), img('couv3', 'Couverture 3', 'cosmos', { variantes: ['trois', 'noir'] })]),
    variantes: Object.fromEntries([['trois', 'Trois couvertures', C.y, C.k, 3], ['deux', 'Deux couvertures', C.y, C.k, 2], ['noir', 'Fond noir', C.k, C.y, 3]].map(([id, nom, fond, encre, n]) => [id, { nom, rendre(d, ctx) {
      const t = texte(ctx, d, 'titre', 'Titre', { ...TITRE, tMax: 130, tMin: 64, l: n === 3 ? 520 : 560, h: 360, maxLignes: 3 }, (f) => ({ x: G.m, y: 150 + f.cap, couleur: encre }), { titre: true, requis: true });
      const pos = n === 3 ? [[640, 120, 170, 255], [830, 180, 170, 255], [1020, 240, 170, 255]] : [[700, 110, 230, 345], [960, 190, 230, 345]];
      const cov = pos.map(([x, y, w, h], i) => couverture(ctx, d, `couv${i + 1}`, `Couverture ${i + 1}`, { x, y, w, h }, 0, encre, null, i + 1)).join('');
      return { fond: fondPlein(fond), illustration: cov, graphisme: '', textes: t, marque: marque(d, encre, fond, encre, fond, encre) };
    } }])),
  },
  '06-evenements': {
    nom: 'Événements',
    description: 'Deux univers séparés par l’incision à 8°.',
    champs: champsBase('Crise totale', 'Événement', [img('personnageA', 'Personnage univers A', 'encre'), img('personnageB', 'Personnage univers B', 'encre')]),
    variantes: Object.fromEntries([['titre-bas', 'Titre en bas'], ['titre-haut', 'Titre en haut']].map(([id, nom]) => [id, { nom, rendre(d, ctx) {
      const haut = id === 'titre-haut', o = H * Math.tan((G.angle * Math.PI) / 180), xb = 610;
      const zA = zone(ctx, 'personnageA', { x: 0, y: haut ? 200 : 60, w: 620, h: haut ? 520 : 660, mode: 'contenir', label: 'Personnage A', requis: true });
      const zB = zone(ctx, 'personnageB', { x: 660, y: haut ? 200 : 60, w: 620, h: haut ? 520 : 660, mode: 'contenir', label: 'Personnage B', requis: true });
      const t = texte(ctx, d, 'titre', 'Titre', { ...TITRE, tMax: 140, tMin: 64, l: 880, h: 140, maxLignes: 1 }, (f) => ({ x: xb, y: (haut ? 140 : 540) + f.cap, couleur: C.w, ancre: 'middle', contour: { couleur: C.k, largeur: 12 } }), { titre: true, requis: true });
      return {
        fond: `<rect width="${W}" height="${H}" fill="${C.nightBlue}"/><polygon fill="${C.y}" points="0,0 ${xb + o / 2},0 ${xb - o / 2},${H} 0,${H}"/>`,
        illustration: image('personnageA', d.personnageA, zA, { filtre: 'encre', clip: false }) + image('personnageB', d.personnageB, zB, { filtre: 'encre-jaune', clip: false }),
        graphisme: lame(xb - o / 2 - 9, 0, 18, H, C.k),
        textes: t,
        marque: marque(d, C.k, C.y, C.k, C.y, C.w),
      };
    } }])),
  },
  '07-histoire': {
    nom: 'Histoire des comics',
    description: 'Année géante, bichromie noir et jaune : la seule famille qui recolore l’image.',
    champs: [{ id: 'annee', type: 'texte', label: 'Année ou décennie', defaut: '1938' }, { id: 'titre', type: 'texte', label: 'Sujet', defaut: 'Action Comics #1 · la naissance du super-héros', conseil: '3 lignes maximum' }, { id: 'rubrique', type: 'texte', label: 'Rubrique', defaut: 'Histoire' }, { id: 'credit', type: 'texte', label: 'Crédit artiste', defaut: '' }, img('personnage', 'Personnage détouré', 'encre')],
    variantes: Object.fromEntries([['bichromie', 'Bichromie', 'bichromie'], ['couleur', 'Image en couleur', 'encre']].map(([id, nom, filtre]) => [id, { nom, rendre(d, ctx) {
      const z = zone(ctx, 'personnage', { x: 560, y: 30, w: 720, h: 690, mode: 'contenir', label: 'Personnage', requis: true });
      let fA; const a = texte(ctx, d, 'annee', 'Année', { police: 'display', tMax: 300, tMin: 150, l: 560, h: 300, maxLignes: 1, interligne: 0.9 }, (f) => { fA = f; return { x: G.m - 6, y: 145 + f.cap, couleur: C.k }; }, { titre: true, requis: true });
      const sy = 145 + (fA.vide ? 0 : fA.cap) + 50;
      const t = texte(ctx, d, 'titre', 'Sujet', { police: 'mono', tMax: 30, tMin: 20, l: 480, h: 150, maxLignes: 3, interligne: 1.25, interlettre: 2.5 }, (f) => ({ x: G.m, y: sy + f.cap, couleur: C.k }));
      return { fond: fondPlein(C.y), illustration: image('personnage', d.personnage, z, { filtre, clip: false }), graphisme: '', textes: a + t, marque: marque(d, C.k, C.y, C.k, C.y, C.k) };
    } }])),
  },
  '08-cosmique': {
    nom: 'Dossiers cosmiques et multiversels',
    description: 'Décor plein cadre, voile noir à gauche, jaune utilisé comme lumière.',
    champs: champsBase("L'Entité", 'Dossier cosmique', [{ id: 'soustitre', type: 'texte', label: 'Surtitre', defaut: 'Multivers · épisode 3' }, img('decor', 'Décor plein cadre', 'cosmos'), img('personnage', 'Personnage détouré', 'encre', { variantes: ['surimpression'] })]),
    variantes: Object.fromEntries([['decor', 'Décor seul'], ['surimpression', 'Personnage en surimpression']].map(([id, nom]) => [id, { nom, rendre(d, ctx) {
      zone(ctx, 'decor', { ...plein, label: 'Décor', requis: true });
      const zP = id === 'surimpression' ? zone(ctx, 'personnage', { x: 660, y: 60, w: 620, h: 660, mode: 'contenir', label: 'Personnage', requis: true }) : null;
      const s = texte(ctx, d, 'soustitre', 'Surtitre', { police: 'text', tMax: 26, tMin: 18, l: 620, h: 30, maxLignes: 1, interlettre: 6 }, (f) => ({ x: G.m, y: 330 + f.cap, couleur: C.w }));
      const t = texte(ctx, d, 'titre', 'Titre', { ...TITRE, tMax: 150, tMin: 72, l: 640, h: 150, maxLignes: 1 }, (f) => ({ x: G.m, y: 400 + f.cap, couleur: C.y }), { titre: true, requis: true });
      return {
        fond: fondPlein(C.night),
        illustration: image('decor', d.decor, plein) + `<rect width="${W}" height="${H}" fill="url(#voile-gauche)"/>` + (zP ? image('personnage', d.personnage, zP, { filtre: 'encre-jaune', clip: false }) : ''),
        graphisme: lame(G.m, 376, 220, 8, C.y),
        textes: s + t,
        marque: marque(d, C.y, C.k, C.y, C.k, C.w),
      };
    } }])),
  },
};
