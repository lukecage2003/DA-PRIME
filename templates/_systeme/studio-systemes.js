// Primestone · Motion Studio · systèmes graphiques, palettes, styles typographiques et formats.
// Palette « Primestone » (noir et jaune de marque) en tête de chaque système : c'est la palette par défaut des nouvelles créations.
// Les couleurs des éléments peuvent être des jetons (« @accent ») : changer de système ou de palette recolore toute la création.
import { C } from './motion-base.js';

export const JETONS = { fond: 'Fond', papier: 'Papier', encre: 'Encre', texte: 'Texte', accent: 'Accent', accent2: 'Accent 2' };

// Styles de texte : hiérarchie (titre, surtitre, accroche, corps, légende) et typographie d'impact (onomatopée)
const st = (o) => ({ casse: 'upper', interlettre: 0, interligne: 0.95, ...o });
export const ROLES_TEXTE = { titre: 'Titre', surtitre: 'Surtitre', accroche: 'Accroche', corps: 'Corps de texte', legende: 'Légende', onomatopee: 'Onomatopée' };

export const SYSTEMES = {
  editorial: {
    nom: 'Éditorial premium', principe: 'Hiérarchie, grille, sobriété : une idée par page, beaucoup d\'air.',
    palettes: {
      primestone: { nom: 'Primestone', fond: C.k, papier: '#1C1A10', encre: C.y, texte: C.y, accent: C.y, accent2: C.w, surAccent: C.k },
      papier: { nom: 'Papier', fond: C.paper, papier: C.warm3, encre: C.k, texte: C.k, accent: C.y, accent2: C.red, surAccent: C.k },
      encre: { nom: 'Encre', fond: C.k, papier: '#1E1E1C', encre: C.k0, texte: C.paper, accent: C.y, accent2: C.red, surAccent: C.k0 },
      jaune: { nom: 'Jaune', fond: C.y, papier: C.paper, encre: C.k, texte: C.k, accent: C.k, accent2: C.red, surAccent: C.y },
    },
    textes: { titre: st({ police: 'display', taille: 150 }), surtitre: st({ police: 'mono', taille: 30, interlettre: 4, fond: '@accent', fill: '@surAccent' }), accroche: st({ police: 'serif', casse: 'none', taille: 56 }),
      corps: st({ police: 'text', casse: 'none', taille: 30, interligne: 1.3 }), legende: st({ police: 'mono', taille: 20, interlettre: 2 }), onomatopee: st({ police: 'display', taille: 200, contour: 8 }) },
    animation: { entree: 'glisse', ease: 'douce', decalage: 0.12, duree: 0.7 }, effets: ['papier', 'trame'], grille: 12,
  },
  comics: {
    nom: 'Comics classique', principe: 'Trames, encrage, couleurs franches, impact et diagonales.',
    palettes: {
      primestone: { nom: 'Primestone', fond: C.y, papier: C.y, encre: C.k, texte: C.y, accent: C.k, accent2: C.k },
      jaune: { nom: 'Jaune et rouge', fond: C.y, papier: C.w, encre: C.k, texte: C.w, accent: C.red, accent2: '#1F5FD1' },
      bleu: { nom: 'Bleu et rouge', fond: '#1F5FD1', papier: C.w, encre: C.k, texte: C.w, accent: C.y, accent2: C.red },
      nb: { nom: 'Noir et blanc', fond: C.w, papier: '#F1F0EA', encre: C.k, texte: C.k, accent: C.k, accent2: '#8A8A8A' },
    },
    textes: { titre: st({ police: 'display', taille: 170, contour: 10, extrusion: 14 }), surtitre: st({ police: 'mono', taille: 30, interlettre: 3, fond: '@encre', fill: '@papier' }),
      accroche: st({ police: 'textBold', taille: 44, fill: '@encre' }), corps: st({ police: 'textBold', casse: 'none', taille: 30, interligne: 1.25, fill: '@encre' }), legende: st({ police: 'mono', taille: 20, fill: '@encre' }),
      onomatopee: st({ police: 'display', taille: 230, contour: 12, extrusion: 18, deformation: 'impact' }) },
    animation: { entree: 'tampon', ease: 'rebond', decalage: 0.15, duree: 0.5 }, effets: ['trame', 'vitesse', 'explosion'], grille: 8,
  },
  cinema: {
    nom: 'Cinématographique', principe: 'Profondeur, lumière, atmosphère ; lettrage espacé et lent.',
    palettes: {
      primestone: { nom: 'Primestone', fond: C.k0, papier: '#2B2600', encre: C.k0, texte: C.y, accent: C.y, accent2: C.w },
      nuit: { nom: 'Nuit', fond: C.night, papier: C.nightBlue, encre: C.k0, texte: C.w, accent: C.y, accent2: C.silver },
      rouge: { nom: 'Noir et rouge', fond: C.k0, papier: '#3A0A06', encre: C.k0, texte: C.w, accent: C.red, accent2: C.w },
      ambre: { nom: 'Ambre', fond: '#120C06', papier: '#4A2E12', encre: C.k0, texte: '#F6E7CF', accent: '#F2A93B', accent2: '#7A5230' },
    },
    textes: { titre: st({ police: 'display', taille: 150, interlettre: 8, lueur: 24 }), surtitre: st({ police: 'mono', taille: 26, interlettre: 8, fill: '@accent' }), accroche: st({ police: 'serif', casse: 'none', taille: 54 }),
      corps: st({ police: 'text', casse: 'none', taille: 28, interligne: 1.35 }), legende: st({ police: 'mono', taille: 20, interlettre: 4, fill: '@accent2' }), onomatopee: st({ police: 'display', taille: 200, lueur: 40 }) },
    animation: { entree: 'fondu', ease: 'entree-sortie', decalage: 0.3, duree: 1.4 }, effets: ['lumiere', 'particules', 'grain', 'vignette'], grille: 12,
  },
  cosmique: {
    nom: 'Cosmique', principe: 'Espace, énergie, échelle ; couleurs saturées sur fond profond.',
    palettes: {
      primestone: { nom: 'Primestone', fond: C.k0, papier: '#2B2600', encre: C.k0, texte: C.y, accent: C.y, accent2: C.w },
      nebuleuse: { nom: 'Nébuleuse', fond: '#06051A', papier: '#33206B', encre: C.k0, texte: C.w, accent: C.y, accent2: '#9C7BFF' },
      aurore: { nom: 'Aurore', fond: '#020B14', papier: '#0D3B4A', encre: C.k0, texte: C.w, accent: '#4DF0C9', accent2: '#FF4FA3' },
      solaire: { nom: 'Solaire', fond: '#140404', papier: '#5A1408', encre: C.k0, texte: C.w, accent: '#FFB21A', accent2: C.red },
    },
    textes: { titre: st({ police: 'display', taille: 160, lueur: 36, degrade: true }), surtitre: st({ police: 'mono', taille: 26, interlettre: 6, fill: '@accent' }), accroche: st({ police: 'serif', casse: 'none', taille: 54 }),
      corps: st({ police: 'text', casse: 'none', taille: 28, interligne: 1.35 }), legende: st({ police: 'mono', taille: 20, fill: '@accent2' }), onomatopee: st({ police: 'display', taille: 220, lueur: 50, deformation: 'arc' }) },
    animation: { entree: 'iris', ease: 'douce', decalage: 0.25, duree: 1 }, effets: ['etoiles', 'nebuleuse', 'energie', 'crepitement', 'particules'], grille: 12,
  },
  minimal: {
    nom: 'Minimaliste', principe: 'Peu d\'éléments, contraste fort, une seule couleur d\'accent.',
    palettes: {
      primestone: { nom: 'Primestone', fond: C.k, papier: '#1C1C1C', encre: C.k0, texte: C.y, accent: C.y, accent2: C.w },
      blanc: { nom: 'Blanc', fond: C.w, papier: '#F2F2F2', encre: C.k, texte: C.k, accent: C.red, accent2: '#BDBDBD' },
      noir: { nom: 'Noir', fond: C.k, papier: '#1C1C1C', encre: C.k0, texte: C.w, accent: C.y, accent2: '#5C5C5C' },
    },
    textes: { titre: st({ police: 'display', taille: 140 }), surtitre: st({ police: 'mono', taille: 22, interlettre: 6, fill: '@accent' }), accroche: st({ police: 'text', casse: 'none', taille: 40 }),
      corps: st({ police: 'text', casse: 'none', taille: 28, interligne: 1.4 }), legende: st({ police: 'mono', taille: 18, interlettre: 3 }), onomatopee: st({ police: 'display', taille: 200 }) },
    animation: { entree: 'revelation', ease: 'entree-sortie', decalage: 0.2, duree: 0.9 }, effets: [], grille: 6,
  },
  experimental: {
    nom: 'Expérimental', principe: 'Collage, géométrie, typographie déformée, ruptures d\'échelle.',
    palettes: {
      primestone: { nom: 'Primestone', fond: C.y, papier: C.y, encre: C.k, texte: C.k, accent: C.k, accent2: C.k },
      collage: { nom: 'Collage', fond: '#EFE9DC', papier: '#D8CDB6', encre: C.k, texte: C.k, accent: C.red, accent2: '#2340B0' },
      acide: { nom: 'Acide', fond: '#0E0E0E', papier: '#2A2A2A', encre: C.k0, texte: '#E8FF3A', accent: '#FF3EA5', accent2: '#3AF0FF' },
    },
    textes: { titre: st({ police: 'display', taille: 190, deformation: 'inclinaison' }), surtitre: st({ police: 'mono', taille: 28, interlettre: 2, fond: '@accent2', fill: '@papier' }), accroche: st({ police: 'serif', casse: 'none', taille: 70, deformation: 'onde' }),
      corps: st({ police: 'text', casse: 'none', taille: 30, interligne: 1.2 }), legende: st({ police: 'mono', taille: 20 }), onomatopee: st({ police: 'display', taille: 240, deformation: 'perspective', ombre: 16 }) },
    animation: { entree: 'volet', ease: 'forte', decalage: 0.1, duree: 0.6 }, effets: ['motif', 'trame', 'papier'], grille: 5,
  },
};
export const palette = (doc) => ({ ...(SYSTEMES[doc.systeme] || SYSTEMES.comics).palettes[doc.palette] || Object.values((SYSTEMES[doc.systeme] || SYSTEMES.comics).palettes)[0], ...(doc.couleurs || {}) });
// Résout une couleur : jeton « @accent », hexadécimal, ou dégradé { lin|rad, st: [[o, couleur, alpha]] }
export function resoudre(v, pal) {
  if (v == null || v === 'none') return 'none';
  if (typeof v === 'string') return v[0] === '@' ? pal[v.slice(1)] || '#FF00FF' : v;
  return { ...v, st: v.st.map(([o, c, a]) => [o, resoudre(c, pal), a]) };
}

// Formats : réseaux, vidéo, impression (300 dpi) et personnalisé. sure : marges de zone sûre (fractions) de l'interface des plateformes.
export const FORMATS_STUDIO = {
  '16:9': { nom: '16:9 HD', w: 1920, h: 1080, groupe: 'Vidéo', sure: { t: 0.05, b: 0.05, l: 0.05, r: 0.05 } },
  '16:9-4k': { nom: '16:9 4K', w: 3840, h: 2160, groupe: 'Vidéo', sure: { t: 0.05, b: 0.05, l: 0.05, r: 0.05 } },
  'miniature': { nom: 'Miniature YouTube', w: 1280, h: 720, groupe: 'Vidéo', sure: { t: 0.05, b: 0.15, l: 0.05, r: 0.17 } },
  '9:16': { nom: '9:16 Story, Reels, TikTok', w: 1080, h: 1920, groupe: 'Réseaux', sure: { t: 0.13, b: 0.22, l: 0.06, r: 0.13 } },
  '4:5': { nom: '4:5 Instagram', w: 1080, h: 1350, groupe: 'Réseaux', sure: { t: 0.05, b: 0.05, l: 0.05, r: 0.05 } },
  '1:1': { nom: '1:1 Carré', w: 1080, h: 1080, groupe: 'Réseaux', sure: { t: 0.05, b: 0.05, l: 0.05, r: 0.05 } },
  'banniere-yt': { nom: 'Bannière YouTube', w: 2560, h: 1440, groupe: 'Réseaux', sure: { t: 0.353, b: 0.353, l: 0.198, r: 0.198 } },
  'x-entete': { nom: 'En-tête X', w: 1500, h: 500, groupe: 'Réseaux', sure: { t: 0.1, b: 0.1, l: 0.05, r: 0.05 } },
  'a4-portrait': { nom: 'A4 portrait 300 dpi', w: 2480, h: 3508, groupe: 'Impression', sure: { t: 0.04, b: 0.04, l: 0.04, r: 0.04 } },
  'a4-paysage': { nom: 'A4 paysage 300 dpi', w: 3508, h: 2480, groupe: 'Impression', sure: { t: 0.04, b: 0.04, l: 0.04, r: 0.04 } },
  'comics-us': { nom: 'Page comics US 300 dpi', w: 1988, h: 3075, groupe: 'Impression', sure: { t: 0.04, b: 0.04, l: 0.05, r: 0.05 } },
  'affiche': { nom: 'Affiche 2:3', w: 2400, h: 3600, groupe: 'Impression', sure: { t: 0.04, b: 0.04, l: 0.04, r: 0.04 } },
};
export const FORMAT_MAX = 8192;
export function format(id, w, h) {
  if (id === 'perso') return { id, nom: 'Personnalisé', w: Math.round(Math.min(FORMAT_MAX, Math.max(64, +w || 1080))), h: Math.round(Math.min(FORMAT_MAX, Math.max(64, +h || 1080))), sure: { t: 0.05, b: 0.05, l: 0.05, r: 0.05 } };
  const f = FORMATS_STUDIO[id] || FORMATS_STUDIO['16:9']; return { id: FORMATS_STUDIO[id] ? id : '16:9', ...f };
}
