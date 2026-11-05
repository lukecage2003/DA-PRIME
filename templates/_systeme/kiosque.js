// Primestone · gabarits Kiosque (lot 3) : diapositives de carrousel et fiche personnage, format 4:5 (1080 × 1350).
// Mêmes briques et mêmes contrôles que les miniatures ; pas d'éditeur dans l'Atelier pour l'instant (décision du lot 2).
import { W, H, C, G, M, texte, zone, image } from './briques.js';
import { TL, SERIF, CORPS, fixe, haut, mono, fond, trame, logotype, masthead, pied, cadre, bordure, T, I, commun, une, L } from './editorial.js';



export default {
  'car-couverture': {
    format: 'carrousel', prefixe: 'CAR', nom: 'Carrousel · couverture', description: 'Première diapositive : titre-question en serif, image en case-cadre.',
    champs: [T('titre', 'Titre', 'Batman : par où commencer'), I('image', 'Image', 'noir'), ...commun('Guide', 'N°044', '01/06', '3 lectures essentielles')],
    variantes: une('Papier', (d, ctx) => {
      const z = zone(ctx, 'image', { x: G.m, y: 720, w: L(), h: 470, mode: 'couvrir', label: 'Image', requis: true });
      return { fond: fond(C.paper) + trame(), illustration: cadre(z) + image('image', d.image, z) + bordure(z, C.k),
        textes: texte(ctx, d, 'titre', 'Titre', { ...SERIF, tMax: 150, tMin: 84, l: L(), h: 420, maxLignes: 3 }, haut(240, G.m, C.k), { titre: true, requis: true, mots: false }),
        marque: masthead(d, C.k) + pied(d, C.k) };
    }),
  },
  'car-presentation-comic': {
    format: 'carrousel', prefixe: 'CAR', nom: 'Carrousel · présentation d’un comic', description: 'Couverture à gauche, fiche technique à droite, accroche en bas.',
    champs: [T('surtitre', 'Surtitre', 'Lecture 01'), T('titre', 'Titre du comic', 'Batman : Year One'), T('editeur', 'Éditeur · année', 'DC · 1987'), T('auteurs', 'Auteurs', 'Frank Miller, David Mazzucchelli'), T('parution', 'Parution', 'Batman #404–407'),
      { id: 'niveau', type: 'choix', label: 'Niveau (1 à 3)', options: ['1', '2', '3'], defaut: '1' }, TL('accroche', 'Accroche', 'La première année de Bruce Wayne à Gotham, racontée comme un polar. Le point d’entrée idéal.'), I('couverture', 'Couverture', 'noir'), ...commun('Guide', 'N°044', '02/06')],
    variantes: une('Papier', (d, ctx) => {
      const z = zone(ctx, 'couverture', { x: G.m, y: 240, w: 390, h: 585, mode: 'couvrir', label: 'Couverture', requis: true });
      const x = 500, l = W - G.m - x, n = +d.niveau || 1, NIV = ['débutant', 'intermédiaire', 'confirmé'];
      const kv = (id, label, y) => mono(`${id}-label`, label, x, y, C.k, { taille: 22 }) + texte(ctx, d, id, label, { ...CORPS, ...fixe(32), l, h: 90, maxLignes: 2, interligne: 1.2 }, haut(y + 18, x, C.k));
      const points = [0, 1, 2].map((i) => `<circle cx="${x + 14 + i * 38}" cy="${812}" r="12" fill="${i < n ? C.k : 'none'}" stroke="${C.k}" stroke-width="4"/>`).join('');
      return {
        fond: fond(C.paper),
        illustration: cadre(z, C.k, C.y) + image('couverture', d.couverture, z) + bordure(z, C.k) + `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="46" fill="${C.k}"/>` + mono('editeur', d.editeur, z.x + 16, z.y + 32, C.y, { taille: 22 }),
        graphisme: `<g id="niveau" data-ps-champ="niveau">${points}</g>` + mono('niveau-texte', NIV[n - 1], x + 130, 820, C.k, { taille: 22 }),
        textes: mono('surtitre', d.surtitre, x, 262, C.k, { taille: 24 }) + texte(ctx, d, 'titre', 'Titre', { ...SERIF, tMax: 92, tMin: 56, l, h: 250, maxLignes: 3 }, haut(292, x, C.k), { titre: true, requis: true, mots: false })
          + kv('auteurs', 'Auteurs', 590) + kv('parution', 'Parution', 690) + mono('niveau-label', 'Niveau', x, 780, C.k, { taille: 22 })
          + texte(ctx, d, 'accroche', 'Accroche', { ...CORPS, tMax: 40, tMin: 30, l: L(), h: 300, maxLignes: 6 }, haut(900, G.m, C.k)),
        marque: masthead(d, C.k) + pied(d, C.k),
      };
    }),
  },
  'car-recit': {
    format: 'carrousel', prefixe: 'CAR', nom: 'Carrousel · récit', description: 'Texte long : surtitre daté, titre serif, corps de texte.',
    champs: [T('surtitre', 'Surtitre (date · lieu)', '18 avril 1938 · Cleveland → New York'), TL('titre', 'Titre', 'Deux jeunes auteurs vendent leur personnage 130 dollars.'), TL('corps', 'Texte', 'Jerry Siegel et Joe Shuster cèdent à l’éditeur les droits de Superman avec leur première histoire. Action Comics #1 sort en kiosque : le super-héros moderne est né.'),
      T('gauche', 'Repère gauche', 'Siegel & Shuster'), T('droite', 'Repère droit', 'DC · Action Comics #1'), ...commun('Histoire', 'N°045', '02/05')],
    variantes: une('Papier', (d, ctx) => ({
      fond: fond(C.paper) + trame(),
      graphisme: `<rect x="${G.m}" y="${H - G.m - 110}" width="${L()}" height="5" fill="${C.k}"/>`,
      textes: mono('surtitre', d.surtitre, G.m, 262, C.k, { taille: 24 }) + texte(ctx, d, 'titre', 'Titre', { ...SERIF, tMax: 110, tMin: 64, l: L(), h: 380, maxLignes: 4 }, haut(300, G.m, C.k), { titre: true, requis: true, mots: false })
        + texte(ctx, d, 'corps', 'Texte', { ...CORPS, tMax: 40, tMin: 30, l: L(), h: 420, maxLignes: 9 }, haut(730, G.m, C.k))
        + mono('gauche', d.gauche, G.m, H - G.m - 64, C.k, { taille: 22 }) + mono('droite', d.droite, W - G.m, H - G.m - 64, C.k, { taille: 22, ancre: 'end' }),
      marque: masthead(d, C.k) + pied(d, C.k),
    })),
  },
  'car-chiffre-cle': {
    format: 'carrousel', prefixe: 'CAR', nom: 'Carrousel · chiffre clé', description: 'Diapositive inversée pour un chiffre fort, à partager en story.',
    champs: [T('surtitre', 'Surtitre', 'En 2024, un exemplaire s’est vendu'), T('chiffre', 'Chiffre', '6 M$'), T('phrase', 'Phrase', 'Le comic le plus cher de l’histoire.'), T('source', 'Source', 'Source : à vérifier avant publication'), ...commun('Histoire', 'N°045', '04/05').filter((c) => c.id !== 'pied')],
    variantes: une('Noir', (d, ctx) => ({
      fond: fond(C.k),
      textes: mono('surtitre', d.surtitre, G.m, 240, C.w, { taille: 26 }) + texte(ctx, d, 'chiffre', 'Chiffre', { police: 'display', tMax: 420, tMin: 160, l: L(), h: 420, maxLignes: 1 }, haut(290, G.m - 8, C.y), { titre: true, requis: true })
        + texte(ctx, d, 'phrase', 'Phrase', { ...SERIF, tMax: 90, tMin: 56, l: L(), h: 300, maxLignes: 3 }, haut(800, G.m, C.w)),
      marque: logotype(G.m, G.m, 50, C.y) + mono('source', d.source, G.m, H - G.m, C.y, { taille: 22 }) + mono('page', d.page, W - G.m, H - G.m, C.y, { ancre: 'end' }),
    })),
  },
  'car-faits': {
    format: 'carrousel', prefixe: 'CAR', nom: 'Carrousel · faits', description: 'Actualité : trois faits numérotés.',
    champs: [T('titre', 'Titre', 'Ce qu’on sait'), TL('fait1', 'Fait 1', 'Une nouvelle série mensuelle est annoncée pour le printemps.'), TL('fait2', 'Fait 2', 'L’équipe créative sera dévoilée lors d’une prochaine convention.'), TL('fait3', 'Fait 3', 'Aucune date de parution en France pour l’instant.'), ...commun('Actu · Marvel', '', '02/03', 'Exemple fictif')],
    variantes: une('Papier', (d, ctx) => ({
      fond: fond(C.paper),
      graphisme: [0, 1, 2].map((i) => `<rect x="${G.m}" y="${470 + i * 240}" width="${L()}" height="4" fill="${C.k}"/><text x="${G.m}" y="${470 + i * 240 + 130}" font-family="${M.display.family}" font-size="110" fill="${C.k}">${i + 1}</text>`).join(''),
      textes: texte(ctx, d, 'titre', 'Titre', { ...SERIF, tMax: 130, tMin: 72, l: L(), h: 160, maxLignes: 1 }, haut(250, G.m, C.k), { titre: true, requis: true, mots: false })
        + [1, 2, 3].map((i) => texte(ctx, d, `fait${i}`, `Fait ${i}`, { ...CORPS, tMax: 40, tMin: 30, l: L() - 130, h: 170, maxLignes: 3 }, haut(470 + (i - 1) * 240 + 34, G.m + 130, C.k))).join(''),
      marque: masthead(d, C.k) + pied(d, C.k),
    })),
  },
  'car-avis': {
    format: 'carrousel', prefixe: 'CAR', nom: 'Carrousel · avis', description: 'Dernière diapositive : l’avis de la rédaction.',
    champs: [T('surtitre', 'Surtitre', 'L’avis Primestone'), TL('citation', 'Citation', '« Le retour était attendu. Reste à savoir si l’équipe saura éviter la nostalgie. »'), ...commun('Actu · Marvel', '', '03/03').filter((c) => c.id !== 'pied' && c.id !== 'numero' && c.id !== 'rubrique')],
    variantes: une('Noir', (d, ctx) => ({
      fond: fond(C.k),
      textes: mono('surtitre', d.surtitre, G.m, 220, C.y, { taille: 26 }) + texte(ctx, d, 'citation', 'Citation', { ...SERIF, tMax: 100, tMin: 56, l: L(), h: 780, maxLignes: 8, interligne: 1.05 }, haut(290, G.m, C.w), { requis: true }),
      marque: logotype(G.m, H - G.m - 50, 50, C.y) + mono('page', d.page, W - G.m, H - G.m, C.y, { ancre: 'end' }),
    })),
  },
  'fiche-personnage': {
    format: 'carrousel', prefixe: 'FICHE', nom: 'Fiche personnage', description: 'Collection numérotée : identité, trois données, trois lectures.',
    champs: [T('nom', 'Nom', 'Superman'), T('identite', 'Identité', 'Clark Kent · Kal-El'), T('apparition', 'Première apparition', 'Action Comics #1 (juin 1938)'), T('createurs', 'Créateurs', 'Jerry Siegel, Joe Shuster'), T('origine', 'Origine', 'Krypton, élevé à Smallville'),
      T('lecture1', 'Lecture 1', 'All-Star Superman'), T('auteurs1', 'Auteurs 1', 'Morrison, Quitely'), T('lecture2', 'Lecture 2', 'Birthright'), T('auteurs2', 'Auteurs 2', 'Waid, Yu'), T('lecture3', 'Lecture 3', 'For All Seasons'), T('auteurs3', 'Auteurs 3', 'Loeb, Sale'),
      I('personnage', 'Personnage détouré', 'encre'), ...commun('Fiche · DC', 'N°001', 'N°001').map((c) => (c.id === 'pied' ? { ...c, defaut: 'Image de substitution' } : c))],
    variantes: Object.fromEntries([['jaune', 'Case jaune', C.y], ['noire', 'Case noire', C.k]].map(([id, nom, caseC]) => [id, { nom, rendre(d, ctx) {
      const z = zone(ctx, 'personnage', { x: G.m, y: 240, w: 455, h: 560, mode: 'contenir', label: 'Personnage', requis: true });
      const x = 560, l = W - G.m - x;
      const kv = (id, label, y) => mono(`${id}-label`, label, x, y, C.k, { taille: 20 }) + texte(ctx, d, id, label, { ...CORPS, ...fixe(30), l, h: 80, maxLignes: 2, interligne: 1.2 }, haut(y + 16, x, C.k));
      const col = (i) => { const cx = G.m + (i - 1) * 320; return mono(`lecture${i}-label`, `Lecture ${i}`, cx, 1100, C.k, { taille: 20 }) + texte(ctx, d, `lecture${i}`, `Lecture ${i}`, { ...SERIF, tMax: 40, tMin: 28, l: 290, h: 80, maxLignes: 2 }, haut(1118, cx, C.k)) + texte(ctx, d, `auteurs${i}`, `Auteurs ${i}`, { police: 'mono', tMax: 20, tMin: 16, l: 290, h: 50, maxLignes: 2, interligne: 1.2, casse: 'none' }, haut(1200, cx, C.k)); };
      return {
        fond: fond(C.paper) + trame(),
        illustration: `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" fill="${caseC}"/><clipPath id="case-clip"><rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}"/></clipPath><g clip-path="url(#case-clip)">${image('personnage', d.personnage, z, { filtre: caseC === C.k ? 'encre-jaune' : 'encre', clip: false })}</g>` + bordure(z, C.k),
        graphisme: `<rect x="${G.m}" y="1060" width="${L()}" height="5" fill="${C.k}"/>`,
        textes: texte(ctx, d, 'nom', 'Nom', { police: 'display', tMax: 140, tMin: 70, l, h: 250, maxLignes: 2, interligne: 0.88 }, haut(250, x, C.k), { titre: true, requis: true })
          + texte(ctx, d, 'identite', 'Identité', { ...SERIF, tMax: 54, tMin: 38, l, h: 110, maxLignes: 2 }, haut(520, x, C.k))
          + kv('apparition', 'Première apparition', 660) + kv('createurs', 'Créateurs', 780) + kv('origine', 'Origine', 900) + [1, 2, 3].map(col).join(''),
        marque: masthead(d, C.k) + pied(d, C.k),
      };
    } }])),
  },
};
