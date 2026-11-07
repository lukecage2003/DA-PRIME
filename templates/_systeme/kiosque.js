// Primestone · gabarits Kiosque (lot 3) : diapositives de carrousel et fiche personnage, format 4:5 (1080 × 1350).
// Mêmes briques et mêmes contrôles que les miniatures ; pas d'éditeur dans l'Atelier pour l'instant (décision du lot 2).
import { W, H, C, G, M, texte, zone, image } from './briques.js';
import { TL, SERIF, CORPS, fixe, haut, mono, fond, trame, logotype, masthead, pied, cadre, bordure, T, I, commun, une, duo, PALETTES_KIOSQUE, L } from './editorial.js';



export default {
  'car-couverture': {
    format: 'carrousel', prefixe: 'CAR', nom: 'Carrousel · couverture', description: 'Première diapositive : titre-question en serif, image en case-cadre.',
    champs: [T('titre', 'Titre', 'Batman : par où commencer'), I('image', 'Image', 'noir'), ...commun('Guide', 'N°044', '01/06', '3 lectures essentielles')],
    variantes: duo((d, ctx, P) => {
      const z = zone(ctx, 'image', { x: G.m, y: 720, w: L(), h: 470, mode: 'couvrir', label: 'Image', requis: true });
      return { fond: fond(P.fond) + trame(P.encre), illustration: cadre(z) + image('image', d.image, z) + bordure(z, P.encre),
        textes: texte(ctx, d, 'titre', 'Titre', { ...SERIF, tMax: 150, tMin: 84, l: L(), h: 420, maxLignes: 3 }, haut(240, G.m, P.encre), { titre: true, requis: true, mots: false }),
        marque: masthead(d, P.encre) + pied(d, P.encre) };
    }),
  },
  'car-presentation-comic': {
    format: 'carrousel', prefixe: 'CAR', nom: 'Carrousel · présentation d’un comic', description: 'Couverture à gauche, fiche technique à droite, accroche en bas.',
    champs: [T('surtitre', 'Surtitre', 'Lecture 01'), T('titre', 'Titre du comic', 'Batman : Year One'), T('editeur', 'Éditeur · année', 'DC · 1987'), T('auteurs', 'Auteurs', 'Frank Miller, David Mazzucchelli'), T('parution', 'Parution', 'Batman #404–407'),
      { id: 'niveau', type: 'choix', label: 'Niveau (1 à 3)', options: ['1', '2', '3'], defaut: '1' }, TL('accroche', 'Accroche', 'La première année de Bruce Wayne à Gotham, racontée comme un polar. Le point d’entrée idéal.'), I('couverture', 'Couverture', 'noir'), ...commun('Guide', 'N°044', '02/06')],
    variantes: duo((d, ctx, P) => {
      const z = zone(ctx, 'couverture', { x: G.m, y: 240, w: 390, h: 585, mode: 'couvrir', label: 'Couverture', requis: true });
      const x = 500, l = W - G.m - x, n = +d.niveau || 1, NIV = ['débutant', 'intermédiaire', 'confirmé'];
      const kv = (id, label, y) => mono(`${id}-label`, label, x, y, P.encre, { taille: 22 }) + texte(ctx, d, id, label, { ...CORPS, ...fixe(32), l, h: 90, maxLignes: 2, interligne: 1.2 }, haut(y + 18, x, P.encre));
      const points = [0, 1, 2].map((i) => `<circle cx="${x + 14 + i * 38}" cy="${812}" r="12" fill="${i < n ? P.encre : 'none'}" stroke="${P.encre}" stroke-width="4"/>`).join('');
      return {
        fond: fond(P.fond),
        illustration: cadre(z, P.encre, C.y) + image('couverture', d.couverture, z) + bordure(z, P.encre) + `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="46" fill="${P.encre}"/>` + mono('editeur', d.editeur, z.x + 16, z.y + 32, P.fond, { taille: 22 }),
        graphisme: `<g id="niveau" data-ps-champ="niveau">${points}</g>` + mono('niveau-texte', NIV[n - 1], x + 130, 820, P.encre, { taille: 22 }),
        textes: mono('surtitre', d.surtitre, x, 262, P.encre, { taille: 24 }) + texte(ctx, d, 'titre', 'Titre', { ...SERIF, tMax: 92, tMin: 56, l, h: 250, maxLignes: 3 }, haut(292, x, P.encre), { titre: true, requis: true, mots: false })
          + kv('auteurs', 'Auteurs', 590) + kv('parution', 'Parution', 690) + mono('niveau-label', 'Niveau', x, 780, P.encre, { taille: 22 })
          + texte(ctx, d, 'accroche', 'Accroche', { ...CORPS, tMax: 40, tMin: 30, l: L(), h: 300, maxLignes: 6 }, haut(900, G.m, P.encre)),
        marque: masthead(d, P.encre) + pied(d, P.encre),
      };
    }),
  },
  'car-recit': {
    format: 'carrousel', prefixe: 'CAR', nom: 'Carrousel · récit', description: 'Texte long : surtitre daté, titre serif, corps de texte.',
    champs: [T('surtitre', 'Surtitre (date · lieu)', '18 avril 1938 · Cleveland → New York'), TL('titre', 'Titre', 'Deux jeunes auteurs vendent leur personnage 130 dollars.'), TL('corps', 'Texte', 'Jerry Siegel et Joe Shuster cèdent à l’éditeur les droits de Superman avec leur première histoire. Action Comics #1 sort en kiosque : le super-héros moderne est né.'),
      T('gauche', 'Repère gauche', 'Siegel & Shuster'), T('droite', 'Repère droit', 'DC · Action Comics #1'), ...commun('Histoire', 'N°045', '02/05')],
    variantes: duo((d, ctx, P) => ({
      fond: fond(P.fond) + trame(P.encre),
      graphisme: `<rect x="${G.m}" y="${H - G.m - 110}" width="${L()}" height="5" fill="${P.encre}"/>`,
      textes: mono('surtitre', d.surtitre, G.m, 262, P.encre, { taille: 24 }) + texte(ctx, d, 'titre', 'Titre', { ...SERIF, tMax: 110, tMin: 64, l: L(), h: 380, maxLignes: 4 }, haut(300, G.m, P.encre), { titre: true, requis: true, mots: false })
        + texte(ctx, d, 'corps', 'Texte', { ...CORPS, tMax: 40, tMin: 30, l: L(), h: 420, maxLignes: 9 }, haut(730, G.m, P.encre))
        + mono('gauche', d.gauche, G.m, H - G.m - 64, P.encre, { taille: 22 }) + mono('droite', d.droite, W - G.m, H - G.m - 64, P.encre, { taille: 22, ancre: 'end' }),
      marque: masthead(d, P.encre) + pied(d, P.encre),
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
    variantes: duo((d, ctx, P) => ({
      fond: fond(P.fond),
      graphisme: [0, 1, 2].map((i) => `<rect x="${G.m}" y="${470 + i * 240}" width="${L()}" height="4" fill="${P.encre}"/><text x="${G.m}" y="${470 + i * 240 + 130}" font-family="${M.display.family}" font-size="110" fill="${P.encre}">${i + 1}</text>`).join(''),
      textes: texte(ctx, d, 'titre', 'Titre', { ...SERIF, tMax: 130, tMin: 72, l: L(), h: 160, maxLignes: 1 }, haut(250, G.m, P.encre), { titre: true, requis: true, mots: false })
        + [1, 2, 3].map((i) => texte(ctx, d, `fait${i}`, `Fait ${i}`, { ...CORPS, tMax: 40, tMin: 30, l: L() - 130, h: 170, maxLignes: 3 }, haut(470 + (i - 1) * 240 + 34, G.m + 130, P.encre))).join(''),
      marque: masthead(d, P.encre) + pied(d, P.encre),
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
    variantes: Object.fromEntries([['primestone', 'Primestone', C.y, C.k, C.y], ['jaune', 'Case jaune', C.y, C.paper, C.k], ['noire', 'Case noire', C.k, C.paper, C.k]].map(([id, nom, caseC, fondC, encreC]) => [id, { nom, rendre(d, ctx) {
      const z = zone(ctx, 'personnage', { x: G.m, y: 240, w: 455, h: 560, mode: 'contenir', label: 'Personnage', requis: true });
      const x = 560, l = W - G.m - x;
      const kv = (id, label, y) => mono(`${id}-label`, label, x, y, encreC, { taille: 20 }) + texte(ctx, d, id, label, { ...CORPS, ...fixe(30), l, h: 80, maxLignes: 2, interligne: 1.2 }, haut(y + 16, x, encreC));
      const col = (i) => { const cx = G.m + (i - 1) * 320; return mono(`lecture${i}-label`, `Lecture ${i}`, cx, 1100, encreC, { taille: 20 }) + texte(ctx, d, `lecture${i}`, `Lecture ${i}`, { ...SERIF, tMax: 40, tMin: 28, l: 290, h: 80, maxLignes: 2 }, haut(1118, cx, encreC)) + texte(ctx, d, `auteurs${i}`, `Auteurs ${i}`, { police: 'mono', tMax: 20, tMin: 16, l: 290, h: 50, maxLignes: 2, interligne: 1.2, casse: 'none' }, haut(1200, cx, encreC)); };
      return {
        fond: fond(fondC) + trame(encreC),
        illustration: `<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" fill="${caseC}"/><clipPath id="case-clip"><rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}"/></clipPath><g clip-path="url(#case-clip)">${image('personnage', d.personnage, z, { filtre: caseC === C.k ? 'encre-jaune' : 'encre', clip: false })}</g>` + bordure(z, encreC),
        graphisme: `<rect x="${G.m}" y="1060" width="${L()}" height="5" fill="${encreC}"/>`,
        textes: texte(ctx, d, 'nom', 'Nom', { police: 'display', tMax: 140, tMin: 70, l, h: 250, maxLignes: 2, interligne: 0.88 }, haut(250, x, encreC), { titre: true, requis: true })
          + texte(ctx, d, 'identite', 'Identité', { ...SERIF, tMax: 54, tMin: 38, l, h: 110, maxLignes: 2 }, haut(520, x, encreC))
          + kv('apparition', 'Première apparition', 660) + kv('createurs', 'Créateurs', 780) + kv('origine', 'Origine', 900) + [1, 2, 3].map(col).join(''),
        marque: masthead(d, encreC) + pied(d, encreC),
      };
    } }])),
  },
  'car-versus': {
    format: 'carrousel', prefixe: 'CAR', nom: 'Carrousel · versus', description: 'Deux camps face à face : échelle de puissance, condition d’accès, exploits sourcés et verdict conditionnel.',
    champs: [T('surtitre', 'Surtitre (série · année)', 'Ultimates 2 · 2017'), T('nomA', 'Camp A', 'Black Panther'), T('nomB', 'Camp B', 'Logos'),
      { id: 'niveauA', type: 'choix', label: 'Échelle du camp A', options: ['1', '2', '3', '4'], defaut: '1', conseil: '1 street level · 2 planétaire · 3 cosmique · 4 abstrait' },
      { id: 'niveauB', type: 'choix', label: 'Échelle du camp B', options: ['1', '2', '3', '4'], defaut: '4', conseil: '1 street level · 2 planétaire · 3 cosmique · 4 abstrait' },
      T('acces', 'Condition d’accès', 'Accès : le pouvoir du Tiger God ouvre le Superflow', 'Ce qui permet au camp le plus bas d’agir au niveau de l’autre (facultatif)'),
      TL('exploitA1', 'Exploit A 1', 'Bat le Tiger God et prend temporairement son pouvoir.'), T('sourceA1', 'Source A 1', 'Ultimates 2 · 2017 · à vérifier', 'Titre, numéro, année'),
      TL('exploitA2', 'Exploit A 2', 'Atteint le Superflow grâce à ce pouvoir.'), T('sourceA2', 'Source A 2', 'Ultimates 2 #100 · 2017'),
      TL('exploitB1', 'Exploit B 1', 'Naît de la fusion de Master Order, Lord Chaos et de l’In-Betweener.'), T('sourceB1', 'Source B 1', 'Ultimates 2 #3 · 2017'),
      TL('exploitB2', 'Exploit B 2', 'Mène la guerre cosmique au niveau du Superflow.'), T('sourceB2', 'Source B 2', 'Ultimates 2 · 2017 · à vérifier'),
      TL('verdict', 'Verdict conditionnel', 'T’Challa ne surpasse pas Logos : il gagne l’accès au champ de bataille.'),
      I('imageA', 'Camp A', 'noir'), I('imageB', 'Camp B', 'cosmos'), ...commun('Versus', 'N°001', '01/05', 'Exemple · sources à vérifier')],
    variantes: duo((d, ctx, P) => {
      const demi = (L() - 40) / 2, xB = G.m + demi + 40, NIV = ['Street level', 'Planétaire', 'Cosmique', 'Abstrait'];
      const zA = zone(ctx, 'imageA', { x: G.m, y: 430, w: demi, h: 240, mode: 'couvrir', label: 'Camp A', requis: true });
      const zB = zone(ctx, 'imageB', { x: xB, y: 430, w: demi, h: 240, mode: 'couvrir', label: 'Camp B', requis: true });
      // Échelle : 4 paliers ; A au-dessus de la ligne (plein), B en dessous (contour)
      const yE = 730, px = (n) => G.m + ((Math.min(4, Math.max(1, +n || 1)) - 1) / 3) * L();
      const echelle = `<g id="echelle"><rect x="${G.m}" y="${yE - 2}" width="${L()}" height="4" fill="${P.encre}"/>`
        + NIV.map((n, i) => { const x = G.m + (i / 3) * L(); return `<rect x="${x - 2}" y="${yE - 12}" width="4" height="24" fill="${P.encre}"/>` + mono(`niv${i + 1}`, n, x, yE + 64, P.encre, { taille: 18, ancre: i === 0 ? 'start' : i === 3 ? 'end' : 'middle' }); }).join('')
        + `<path data-ps-champ="niveauA" d="M${px(d.niveauA) - 14} ${yE - 34} h28 l-14 22 z" fill="${P.encre}"/><path data-ps-champ="niveauB" d="M${px(d.niveauB) - 14} ${yE + 36} h28 l-14 -22 z" fill="none" stroke="${P.encre}" stroke-width="4"/></g>`;
      const exploit = (cote, i, x, y) => texte(ctx, d, `exploit${cote}${i}`, `Exploit ${cote} ${i}`, { ...CORPS, ...fixe(28), l: demi, h: 84, maxLignes: 2, interligne: 1.25 }, haut(y, x, P.encre))
        + mono(`source${cote}${i}`, d[`source${cote}${i}`], x, y + 92, P.encre, { taille: 18 });
      const badge = `<g id="vs"><circle cx="${W / 2}" cy="${330}" r="46" fill="${P.encre}"/><text x="${W / 2}" y="${348}" text-anchor="middle" font-family="${M.display.family}" font-size="52" fill="${P.fond}">VS</text></g>`;
      return {
        fond: fond(P.fond) + trame(P.encre),
        illustration: cadre(zA, P.encre, C.y) + image('imageA', d.imageA, zA) + bordure(zA, P.encre) + cadre(zB, P.encre, C.y) + image('imageB', d.imageB, zB) + bordure(zB, P.encre),
        graphisme: echelle + badge + `<rect x="${G.m}" y="${1135}" width="${L()}" height="5" fill="${P.encre}"/>`,
        textes: mono('surtitre', d.surtitre, G.m, 225, P.encre, { taille: 24 })
          + texte(ctx, d, 'nomA', 'Camp A', { police: 'display', tMax: 96, tMin: 54, l: demi - 60, h: 160, maxLignes: 2, interligne: 0.9 }, haut(260, G.m, P.encre), { titre: true, requis: true })
          + texte(ctx, d, 'nomB', 'Camp B', { police: 'display', tMax: 96, tMin: 54, l: demi - 60, h: 160, maxLignes: 2, interligne: 0.9 }, haut(260, xB + 60, P.encre), { titre: true, requis: true })
          + mono('acces', d.acces, G.m, 845, P.encre, { taille: 20 })
          + exploit('A', 1, G.m, 872) + exploit('B', 1, xB, 872) + exploit('A', 2, G.m, 1004) + exploit('B', 2, xB, 1004)
          + texte(ctx, d, 'verdict', 'Verdict', { ...SERIF, tMax: 44, tMin: 32, l: L(), h: 100, maxLignes: 2 }, haut(1158, G.m, P.encre), { requis: true }),
        marque: masthead(d, P.encre) + pied(d, P.encre),
      };
    }),
  },
};
