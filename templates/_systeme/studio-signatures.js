// Primestone · Motion Studio · modèles signature : compositions éditoriales et cinématographiques composées librement
// (calques indépendants, animations propres, plans successifs), chacune avec sa direction artistique.
import { nouveauDocument, creerElement, normaliserEl, ajouterPlan, changerPlan, synchroniserPlans, adapter } from './studio.js';
import { format as fmt } from './studio-systemes.js';

const T = (d, role, contenu, props = {}, tx = {}, anim) => { const e = creerElement('texte', d, { role, contenu }); Object.assign(e, props); Object.assign(e.texte, tx); if (anim) e.anim = anim; return normaliserEl(e); };
const F = (d, forme, props = {}, fx = {}, anim) => { const e = creerElement('forme', d, { forme }); Object.assign(e, props); Object.assign(e.forme, fx); if (anim) e.anim = anim; return normaliserEl(e); };
const E = (d, effet, params = {}, props = {}, anim) => { const e = creerElement('effet', d, { effet, params }); Object.assign(e, props); if (anim) e.anim = anim; return normaliserEl(e); };
const I = (d, placeholder, props = {}, ix = {}, anim) => { const e = creerElement('image', d, { placeholder }); Object.assign(e, props); Object.assign(e.image, ix); if (anim) e.anim = anim; return normaliserEl(e); };
const en = (type, delai, duree = 0.8, courbe = 'douce', o = {}) => ({ entree: { type, delai, duree, courbe, ...o } });
const sansStyle = { contour: { c: '@encre', w: 0 }, extrusion: { c: '@accent', profondeur: 0, angle: 45 }, lueur: { c: '@accent', b: 0 }, ombre: { c: '@encre', dx: 0, dy: 0, flou: 0, op: 0.85 }, deformation: { type: 'aucune', force: 0.4 }, degrade: null, fond: 'none' };

export const SIGNATURES = {
  'affiche-cinema': { nom: 'Affiche de cinéma', description: 'Plein cadre nocturne, lumière volumétrique, titre espacé et bloc de crédits.', format: '4:5', systeme: 'cinema', palette: 'nuit',
    creer(d) { const { w: W, h: H } = d.format; d.duree = 8; d.camera = { type: 'poussee', intensite: 0.5 };
      return [I(d, 'noir', { nom: 'Ville nocturne', x: 0, y: 0, w: W, h: H, prof: 0.2 }, { zoom: 1.12, dx: -0.12, dy: 0.04 }, en('fondu', 0, 1.6, 'entree-sortie')),
        E(d, 'lumiere', { mode: 'projecteur', couleur: '#DDE6FF', intensite: 0.45, densite: 0.35, cx: 0.72, cy: -0.05, angle: 18 }, { nom: 'Faisceau', op: 0.8 }),
        E(d, 'brume', { couleur: '#AEB8D6', intensite: 0.45, densite: 0.5 }, { nom: 'Brume', prof: 0.6 }),
        E(d, 'vignette', { intensite: 0.75 }, { nom: 'Vignettage' }), E(d, 'grain', { intensite: 0.35 }, { nom: 'Grain' }),
        T(d, 'accroche', 'Chaque légende a une fin.', { x: W * 0.1, y: H * 0.08, w: W * 0.8, h: 80 }, { ...sansStyle, taille: 52, align: 'middle', fill: '#E6E9F2' }, en('fondu', 0.8, 1.4, 'entree-sortie')),
        F(d, 'ligne', { nom: 'Filet', x: W / 2 - 60, y: H * 0.585, w: 120, h: 3 }, { fill: '@accent', stroke: 'none', lw: 3 }, en('revelation', 1.4, 0.8, 'entree-sortie', { dir: 'gauche' })),
        T(d, 'titre', 'Le Dernier Gardien', { x: W * 0.06, y: H * 0.61, w: W * 0.88, h: 300 }, { ...sansStyle, taille: 150, interlettre: 12, align: 'middle', fill: '#FFFFFF', lueur: { c: '#9FB2E6', b: 18 } }, en('lettres', 1.6, 1.6, 'douce')),
        T(d, 'legende', 'Un film de Alix Martin · avec Lou Diaz, Kai Ito, Vega Rhodes · musique originale de Sol Arden · d\'après le comic « Les Veilleurs »', { x: W * 0.12, y: H - 230, w: W * 0.76, h: 64, op: 0.7 }, { ...sansStyle, police: 'textBold', taille: 20, interlettre: 1, interligne: 1.3, align: 'middle', fill: '#C9CCD6' }, en('fondu', 2.8, 1.2)),
        T(d, 'surtitre', 'Prochainement', { x: W * 0.2, y: H - 140, w: W * 0.6, h: 44 }, { ...sansStyle, police: 'mono', taille: 28, interlettre: 10, align: 'middle', fill: '@accent' }, en('fondu', 3.4, 1, 'entree-sortie'))];
    } },
  'une-magazine': { nom: 'Une de magazine', description: 'Grille éditoriale, titraille, personnage détouré sur disque d\'accent.', format: '4:5', systeme: 'editorial', palette: 'papier',
    creer(d) { const { w: W, h: H } = d.format, m = 64; d.duree = 6;
      return [E(d, 'papier', { intensite: 0.45 }, { nom: 'Papier' }),
        T(d, 'titre', 'Kiosque', { nom: 'Titre du magazine', x: m, y: 36, w: W - 2 * m, h: 230 }, { ...sansStyle, taille: 240, align: 'middle', fill: '@encre', interlettre: -2 }, en('revelation', 0, 0.8, 'entree-sortie', { dir: 'bas' })),
        F(d, 'rect', { nom: 'Filet', x: m, y: 286, w: W - 2 * m, h: 4 }, { fill: '@encre', stroke: 'none', lw: 0 }, en('revelation', 0.3, 0.6, 'forte')),
        T(d, 'legende', 'N° 12 · Novembre 2026 · Le magazine des univers dessinés', { nom: 'Date', x: m, y: 300, w: W - 2 * m, h: 34 }, { ...sansStyle, taille: 20, interlettre: 3, fill: '@encre' }, en('fondu', 0.4, 0.6)),
        F(d, 'ellipse', { nom: 'Disque', x: W * 0.36, y: H * 0.36, w: 700, h: 700 }, { fill: '@accent', stroke: 'none', lw: 0 }, en('zoom', 0.5, 0.9, 'rebond')),
        I(d, 'encre', { nom: 'Personnage', x: W * 0.3, y: H * 0.33, w: W * 0.72, h: H * 0.67, prof: 0.4 }, { ajustement: 'contenir', masque: { forme: 'aucun' } }, en('glisse', 0.7, 0.9, 'forte', { dir: 'droite', force: 0.5 })),
        T(d, 'accroche', 'Trente ans de légende', { x: m, y: 380, w: 440, h: 70 }, { ...sansStyle, taille: 46, fill: '@encre' }, en('glisse', 0.9, 0.7, 'forte', { force: 0.4 })),
        T(d, 'titre', 'Le grand retour', { nom: 'Titre de couverture', x: m, y: 450, w: 420, h: 260 }, { ...sansStyle, taille: 118, fill: '@encre', interligne: 0.9 }, en('glisse', 1.05, 0.7, 'forte', { force: 0.4 })),
        F(d, 'rect', { nom: 'Trait accent', x: m, y: 728, w: 120, h: 12 }, { fill: '@accent2', stroke: 'none', lw: 0 }, en('revelation', 1.3, 0.5, 'forte')),
        T(d, 'corps', 'Les origines secrètes\nEntretien exclusif\nLa chronologie complète', { x: m, y: 770, w: 360, h: 170 }, { ...sansStyle, police: 'textBold', taille: 30, interligne: 1.45, fill: '@encre', casse: 'upper' }, en('mots', 1.4, 1.2, 'douce')),
        F(d, 'etoile', { nom: 'Pastille', x: W - 300, y: 390, w: 220, h: 220, rot: 12 }, { fill: '@accent2', stroke: 'none', lw: 0, branches: 18, creux: 0.82 }, { entree: { type: 'tampon', delai: 1.8, duree: 0.45, courbe: 'rebond' }, boucle: { type: 'rotation', amplitude: 0.15, periode: 12 } }),
        T(d, 'titre', 'Inédit', { nom: 'Pastille · texte', x: W - 270, y: 465, w: 160, h: 70, rot: 12 }, { ...sansStyle, taille: 54, align: 'middle', fill: '#FFFFFF' }, en('tampon', 1.9, 0.45, 'rebond')),
        T(d, 'legende', 'Illustration de démonstration', { x: m, y: H - 64, w: 420, h: 30, op: 0.6 }, { ...sansStyle, taille: 16, fill: '@encre' }, en('fondu', 2, 0.6))];
    } },
  'manifeste': { nom: 'Manifeste typographique', description: 'Collage expérimental : ruptures d\'échelle, déformations, géométrie.', format: '1:1', systeme: 'experimental', palette: 'collage',
    creer(d) { const { w: W, h: H } = d.format; d.duree = 6;
      return [E(d, 'papier', { intensite: 0.55 }, { nom: 'Papier' }), E(d, 'motif', { mode: 'rayures', couleur: '@encre', intensite: 0.08, angle: 45, echelle: 1.6 }, { nom: 'Rayures', op: 0.5 }),
        F(d, 'ellipse', { nom: 'Soleil', x: W * 0.52, y: H * 0.05, w: 470, h: 470 }, { fill: '@accent', stroke: 'none', lw: 0 }, { entree: { type: 'zoom', delai: 0, duree: 0.8, courbe: 'rebond' }, boucle: { type: 'flottement', amplitude: 0.6, periode: 4 } }),
        F(d, 'lame', { nom: 'Lame', x: -40, y: H * 0.47, w: W + 80, h: 120, rot: -8 }, { fill: '@accent2', stroke: 'none', lw: 0, angle: 20 }, en('volet', 0.3, 0.6, 'forte')),
        I(d, 'pop', { nom: 'Fragment', x: W * 0.06, y: H * 0.08, w: 380, h: 380, rot: -6 }, { masque: { forme: 'hexagone' }, contour: { c: '@encre', w: 8 }, traitement: { trame: { actif: true, cellule: 9 } } }, en('iris', 0.5, 0.9, 'entree-sortie')),
        T(d, 'titre', 'Cosmos', { nom: 'Écho', x: 60, y: H * 0.43, w: W - 120, h: 330, rot: -8 }, { ...sansStyle, taille: 300, fill: '@fond', contour: { c: '@encre', w: 3 }, align: 'middle' }, en('glisse', 0.6, 0.8, 'forte', { dir: 'gauche', force: 0.4 })),
        T(d, 'titre', 'Cosmos', { x: 40, y: H * 0.41, w: W - 120, h: 330, rot: -8 }, { ...sansStyle, taille: 300, fill: '@encre', align: 'middle', deformation: { type: 'inclinaison', force: 0.35 } }, en('tampon', 0.9, 0.5, 'rebond')),
        T(d, 'accroche', 'Un manifeste pour les univers impossibles', { x: 80, y: H * 0.8, w: W * 0.62, h: 120 }, { ...sansStyle, taille: 52, fill: '@encre', interligne: 1.05 }, en('mots', 1.3, 1, 'douce')),
        F(d, 'explosion', { nom: 'Éclat', x: W * 0.74, y: H * 0.74, w: 230, h: 230 }, { fill: '@accent', stroke: '@encre', lw: 6, branches: 13 }, { entree: { type: 'rotation', delai: 1.6, duree: 0.6, courbe: 'rebond' }, boucle: { type: 'pulsation', amplitude: 1, periode: 1.6 } }),
        T(d, 'legende', 'N°01', { x: W * 0.765, y: H * 0.835, w: 160, h: 50 }, { ...sansStyle, police: 'display', taille: 46, align: 'middle', fill: '@encre' }, en('fondu', 1.8, 0.4))];
    } },
  'annonce-plans': { nom: 'Annonce en trois plans', description: 'Teaser, révélation puis date : trois états enchaînés par des transitions.', format: '16:9', systeme: 'comics', palette: 'jaune',
    creer(d) { const { w: W, h: H } = d.format;
      d.duree = 2.6; d.fond = { type: 'couleur', c1: '@encre' };
      d.elements = [F(d, 'rect', { nom: 'Fond noir', x: 0, y: 0, w: W, h: H, verrou: true }, { fill: '#0B0B0D', stroke: 'none', lw: 0 }),
        E(d, 'grain', { intensite: 0.35 }, { nom: 'Grain' }),
        T(d, 'titre', 'Il arrive…', { x: W * 0.1, y: H * 0.4, w: W * 0.8, h: 200 }, { ...sansStyle, taille: 170, align: 'middle', valign: 'milieu', fill: '#FFFFFF', interlettre: 6 }, en('machine', 0.3, 1.2, 'lineaire'))];
      ajouterPlan(d); d.plans[0].nom = 'Teaser'; d.duree = 3.6; d.plans[d.planActif].nom = 'Révélation'; d.plans[d.planActif].transition = { type: 'flash', duree: 0.5 };
      d.elements = [I(d, 'pop', { nom: 'Décor', x: 0, y: 0, w: W, h: H, prof: 0.2 }, { zoom: 1.05 }, { entree: { type: 'zoom-arriere', delai: 0, duree: 1.2, courbe: 'forte', force: 0.3 } }),
        E(d, 'vitesse', { couleur: '#FFFFFF', intensite: 0.5, densite: 0.6, cx: 0.5, cy: 0.5 }, { nom: 'Lignes de vitesse', op: 0.55 }),
        T(d, 'surtitre', 'Nouvelle série', { x: W * 0.36, y: H * 0.2, w: W * 0.28, h: 60 }, { taille: 34, align: 'middle', fond: '@encre', fill: '@papier' }, en('revelation', 0.4, 0.5, 'forte')),
        T(d, 'onomatopee', 'Vortex', { x: W * 0.12, y: H * 0.3, w: W * 0.76, h: 380 }, { taille: 320, align: 'middle', valign: 'milieu', fill: '@papier', extrusion: { c: '@accent', profondeur: 22, angle: 45 } }, { entree: { type: 'tampon', delai: 0.6, duree: 0.5, courbe: 'rebond' }, boucle: { type: 'tremblement', amplitude: 0.25 } })];
      ajouterPlan(d); d.duree = 3.2; d.plans[d.planActif].nom = 'Date'; d.plans[d.planActif].transition = { type: 'volet', duree: 0.6 };
      d.elements = [F(d, 'rect', { nom: 'Fond jaune', x: 0, y: 0, w: W, h: H, verrou: true }, { fill: '@fond', stroke: 'none', lw: 0 }),
        E(d, 'trame', { mode: 'radial', couleur: '@accent', intensite: 0.6 }, { nom: 'Trame' }),
        F(d, 'explosion', { nom: 'Explosion', x: W * 0.08, y: H * 0.14, w: 620, h: 620 }, { fill: '@accent', stroke: '@encre', lw: 10, branches: 16 }, { entree: { type: 'zoom', delai: 0.2, duree: 0.6, courbe: 'rebond' }, boucle: { type: 'pulsation', amplitude: 1, periode: 1.4 } }),
        T(d, 'onomatopee', 'N°1', { x: W * 0.12, y: H * 0.36, w: 540, h: 280 }, { taille: 230, align: 'middle', valign: 'milieu', fill: '@papier' }, en('tampon', 0.5, 0.45, 'rebond')),
        T(d, 'titre', 'En librairie le 12 mars', { x: W * 0.47, y: H * 0.36, w: W * 0.46, h: 300 }, { taille: 120, fill: '@papier' }, en('glisse', 0.8, 0.7, 'forte', { dir: 'droite', force: 0.5 }))];
      return d.elements;
    } },
};
export function docDepuisSignature(id, { format } = {}) {
  const s = SIGNATURES[id]; let d = nouveauDocument({ format: s.format, systeme: s.systeme, palette: s.palette, nom: s.nom });
  d.elements = s.creer(d); d.origine = { signature: id }; if (d.plans) changerPlan(d, 0);
  // Autre format : chaque plan est adapté (ancrages, échelle), puis corrigeable à la main
  if (format && format !== s.format) { const nf = fmt(format); if (d.plans) { synchroniserPlans(d); d.plans = d.plans.map((p) => ({ ...p, elements: adapter({ ...d, elements: p.elements }, nf).elements })); d.elements = d.plans[d.planActif].elements; d.format = nf; } else d = { ...adapter(d, nf), format: nf }; }
  return d;
}
export { fmt };
