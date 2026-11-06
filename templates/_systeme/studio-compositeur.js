// Primestone · compositeur intelligent : d'une intention éditoriale (brief) à une composition Motion Studio éditable.
// La mise en scène dépend du TYPE (duel, héros, une, annonce, événement, liste, question, citation…), de l'UNIVERS
// du personnage (cosmique, urbain, mystique, technologique), du FORMAT (paysage, portrait, carré : recomposition réelle,
// pas un redimensionnement) et du PROFIL de direction artistique (système, palette, couleurs).
import { nouveauDocument, creerElement, normaliserEl, ajouterPlan, changerPlan, contraste } from './studio.js';
import { palette } from './studio-systemes.js';
import { format as fmt, SYSTEMES } from './studio-systemes.js';
import { TYPES } from './studio-assistant.js';
import { trouverPersonnage } from './studio-personnages.js';
import { sonsAuto } from './studio-sons.js';

const SANS = { contour: { c: '@encre', w: 0 }, extrusion: { c: '@accent', profondeur: 0, angle: 45 }, lueur: { c: '@accent', b: 0 }, ombre: { c: '@encre', dx: 0, dy: 0, flou: 0, op: 0.85 }, deformation: { type: 'aucune', force: 0.4 }, degrade: null, fond: 'none' };
const FOND_UNIVERS = { cosmique: 'cosmos', urbain: 'noir', mystique: 'cosmos', techno: 'noir' };
const SYSTEME_PAR_DEFAUT = { duel: ['comics'], equipes: ['comics'], heros: null, 'heros-repere': null, une: ['editorial'], annonce: null, evenement: ['cosmique'], liste: ['editorial', 'encre'], question: ['comics'], citation: ['cinema'] };
const SYSTEME_UNIVERS = { cosmique: ['cosmique', 'nebuleuse'], urbain: ['cinema', 'nuit'], mystique: ['cosmique', 'aurore'], techno: ['cinema', 'ambre'] };
export const FORMATS_COMPOSITEUR = { miniature: 'miniature', '16:9': '16:9', '4:5': '4:5', '9:16': '9:16', '1:1': '1:1', affiche: 'affiche', carrousel: '4:5' };

// Kit de composition : dimensions, orientation, fabriques d'éléments en unités relatives
function kit(d) {
  const { w: W, h: H } = d.format, u = Math.min(W, H) / 1080, m = Math.round(Math.min(W, H) * 0.06), P = W / H > 1.2, V = H / W > 1.2;
  const fin = (e, anim) => { if (anim) e.anim = anim; return normaliserEl(e); };
  const k = {
    d, W, H, u, m, P, V, C: !P && !V,
    T: (role, contenu, box, tx = {}, anim) => { const e = creerElement('texte', d, { role, contenu }); Object.assign(e, box); Object.assign(e.texte, { auto: true }, tx); return fin(e, anim); },
    F: (forme, box, fx = {}, anim) => { const e = creerElement('forme', d, { forme }); Object.assign(e, box); Object.assign(e.forme, fx); return fin(e, anim); },
    E: (effet, params = {}, box = {}, anim) => { const e = creerElement('effet', d, { effet, params }); Object.assign(e, box); return fin(e, anim ?? { entree: { type: 'fondu', duree: 0.8, delai: 0 } }); },
    I: (src, placeholder, box, ix = {}, anim) => { const e = creerElement('image', d, { placeholder }); Object.assign(e, box); e.image.src = src || null; e.image.placeholder = placeholder; Object.assign(e.image, ix); return fin(e, anim); },
    en: (type, delai, duree = 0.7, courbe = 'douce', o = {}) => ({ entree: { type, delai, duree, courbe, ...o } }),
  };
  return k;
}
// Ambiance d'univers : fond, lumière, matière ; centrée sur le sujet (cx, cy en fractions)
function ambiance(k, univers, cx = 0.6, cy = 0.45, { fondImage = true, intensite = 1 } = {}) {
  if (k.minimal || k.reel) fondImage = false;
  const { W, H, E, I } = k, out = [], plein = { x: 0, y: 0, w: W, h: H };
  if (!fondImage && !k.minimal) out.push(E('degrade', { couleur: '@papier', couleur2: '@fond', intensite: 0.9, angle: 100 }, { ...plein, nom: 'Fond profond', prof: 0.1 }));
  if (fondImage) out.push(I(null, FOND_UNIVERS[univers] || 'noir', { ...plein, nom: 'Décor', prof: 0.15, verrou: false, op: univers === 'techno' ? 0.3 : univers === 'mystique' ? 0.6 : 0.85 }, {}, { entree: { type: 'fondu', duree: 1.2, delai: 0 } }));
  if (univers === 'cosmique') out.push(E('nebuleuse', { couleur: '@accent2', couleur2: '@papier', intensite: 0.5 * intensite, densite: 0.5 }, { ...plein, nom: 'Nébuleuse', prof: 0.25 }), E('etoiles', { intensite: 0.7, densite: 0.45 }, { ...plein, nom: 'Étoiles', prof: 0.1 }), E('energie', { couleur: '@accent', couleur2: '@accent2', intensite: 0.55 * intensite, cx, cy }, { ...plein, nom: 'Énergie', prof: 0.5 }));
  if (univers === 'urbain') out.push(E('lumiere', { mode: 'projecteur', couleur: '#DDE6FF', intensite: 0.4 * intensite, densite: 0.35, cx: cx - 0.1, cy: -0.05, angle: 12 }, { ...plein, nom: 'Faisceau' }), E('brume', { couleur: '#AEB8D6', intensite: 0.4 * intensite }, { ...plein, nom: 'Brume', prof: 0.6 }));
  if (univers === 'mystique') out.push(E('degrade', { couleur: '@accent2', couleur2: '@fond', intensite: 0.45, angle: 100 }, { ...plein, nom: 'Voile mystique', blend: 'screen' }), E('particules', { mode: 'etincelles', couleur: '@accent2', couleur2: '#FFFFFF', intensite: 0.6 * intensite, densite: 0.5 }, { ...plein, nom: 'Étincelles', prof: 0.8 }));
  if (univers === 'techno') out.push(E('motif', { mode: 'quadrillage', couleur: '@accent2', intensite: 0.08, echelle: 2.6, angle: 0 }, { ...plein, nom: 'Grille technique', op: 0.16 }), E('mouvement', { couleur: '@accent', intensite: 0.35, densite: 0.35, angle: -8 }, { ...plein, nom: 'Flux', op: 0.5 }));
  out.push(E('lumiere', { mode: 'halo', couleur: univers === 'urbain' ? '#9FB2E6' : '@accent', intensite: 0.45 * intensite, densite: 0.4, cx, cy }, { ...plein, nom: 'Halo du sujet', prof: 0.4 }), E('vignette', { intensite: 0.65 }, { ...plein, nom: 'Vignettage' }));
  if (!k.sobre) out.push(E('grain', { intensite: 0.28 }, { ...plein, nom: 'Grain' }));
  // Profil épuré : on retire la matière secondaire (particules, flux), la lumière reste
  const retirer = [...(k.sobre ? ['Étincelles', 'Flux', 'Brume'] : []), ...(k.reel ? ['Énergie'] : [])];
  return out.filter((e) => !retirer.includes(e.nom));
}
const perso = (brief, i) => brief.personnages?.[i] || null;
const nomDe = (brief, i, defaut) => perso(brief, i)?.nom || defaut;
// Héros détouré : image fournie (ressource) ou personnage de démonstration
// Lumière par univers : contre-jour, aura et ombre portée choisis pour l'ambiance (l'image du personnage n'est jamais déformée ni retournée)
export const LUMIERES = { cosmique: { contre: '#FFE9A8', aura: '@accent2', auraForce: 0.55, ombre: 0.45, dir: 300 }, urbain: { contre: '#D8E6FF', aura: null, ombre: 0.75, dir: 220 },
  mystique: { contre: '@accent2', aura: '@accent2', auraForce: 0.6, ombre: 0.4, dir: 270 }, techno: { contre: '#9FE6FF', aura: '@accent', auraForce: 0.35, ombre: 0.6, dir: 315 } };
// Image réelle d'un personnage : la mise en scène suit ses caractéristiques mesurées (transparence, sujet, orientation, rôle, catégorie)
function imageReelle(k, p, box, ix, anim, lum, un) {
  const inf = p.imageInfo, base = { nom: p.nom || 'Personnage', prof: 0.45, ...box };
  if (inf.alpha) { // détouré : devant le décor, silhouette entière cadrée sur le sujet utile, mis en lumière
    const b = inf.boite || { x: 0, y: 0, w: 1, h: 1 }, s0 = Math.min(box.w / inf.w, box.h / inf.h), z = Math.min(2.2, Math.max(1, Math.min(box.w / (inf.w * s0 * b.w), box.h / (inf.h * s0 * b.h)) * 0.98)), w = inf.w * s0 * z, h = inf.h * s0 * z;
    return k.I(p.image, 'encre', base, { ajustement: 'contenir', masque: { forme: 'aucun' }, zoom: +z.toFixed(3), dx: +((w * (0.5 - b.x - b.w / 2)) / box.w).toFixed(3), dy: +((h * (1 - b.y - b.h)) / box.h).toFixed(3), contour: { c: '@encre', w: Math.round(5 * k.u) }, eclairage: { actif: true, ...(LUMIERES[un] || LUMIERES.urbain), ...lum }, ...ix }, anim);
  }
  const ra = inf.w / inf.h, ombre = { c: '@encre', dx: 16 * k.u, dy: 16 * k.u, op: 0.5 };
  // Couverture ou silhouette complète : jamais recadrées, le cadre prend les proportions de l'image
  if (inf.categorie === 'couverture' || p.role === 'silhouette' || inf.categorie === 'logo') { const bw = Math.min(box.w, box.h * ra), bh = bw / ra;
    return k.I(p.image, 'pop', { ...base, x: box.x + (box.w - bw) / 2, y: box.y + (box.h - bh) * (inf.categorie === 'couverture' ? 0.5 : 1), w: bw, h: bh }, { ajustement: 'couvrir', masque: { forme: 'rect' }, contour: { c: '@encre', w: Math.round(5 * k.u) }, ombre, ...ix }, anim); }
  // Illustration opaque : cadre plein, visage privilégié (haut de l'image) pour un portrait ou une image verticale
  const s = Math.max(box.w / inf.w, box.h / inf.h), h = inf.h * s, haut = ['portrait', 'gros-plan'].includes(p.role) || inf.orientation === 'portrait';
  return k.I(p.image, 'pop', base, { ajustement: 'couvrir', masque: { forme: 'rect' }, dy: haut ? +(((h - box.h) / (2 * box.h)) * 0.85).toFixed(3) : 0, contour: { c: '@encre', w: Math.round(5 * k.u) }, ombre, ...ix }, anim);
}
const heros = (k, brief, i, box, ix = {}, anim, lum = {}) => { const un = perso(brief, i)?.univers || brief.univers; if (perso(brief, i)?.image && perso(brief, i).imageInfo) return imageReelle(k, perso(brief, i), box, ix, anim, lum, un);
  return k.I(perso(brief, i)?.image || null, 'encre', { nom: nomDe(brief, i, 'Personnage'), prof: 0.45, ...box }, { ajustement: 'contenir', masque: { forme: 'aucun' }, contour: { c: '@encre', w: Math.round(6 * k.u) }, eclairage: { actif: true, ...(LUMIERES[un] || LUMIERES.urbain), ...lum }, ...ix }, anim); };
// Variante de mise en page stable pour un même sujet (évite la répétition dans une campagne)
const variante = (b, n = 2) => { let h = 7; for (const c of `${b.titre}|${b.personnages[0]?.nom || ''}|${b.type}`) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h % n; };
const rubrique = (k, texte, box, anim) => k.T('surtitre', texte, box, { auto: true, valign: 'milieu' }, anim);

const MISES = {
  // Duel : opposition frontale, coupe diagonale, deux ambiances, badge central
  duel(k, b) {
    const { W, H, u, m, P, T, F, I, en } = k, ua = perso(b, 0)?.univers || b.univers, ub = perso(b, 1)?.univers || b.univers, o = (P ? H : W) * 0.12, out = [];
    const pa = P ? [0, 0, 0.5 + o / W, 0, 0.5 - o / W, 1, 0, 1] : [0, 0, 1, 0, 1, 0.5 - o / H, 0, 0.5 + o / H], pb = P ? [0.5 + o / W, 0, 1, 0, 1, 1, 0.5 - o / W, 1] : [0, 0.5 + o / H, 1, 0.5 - o / H, 1, 1, 0, 1];
    const opq = (i) => perso(b, i)?.image && perso(b, i).imageInfo && !perso(b, i).imageInfo.alpha ? perso(b, i).image : null;
    const reels = b.personnages.slice(0, 2).every((p) => p?.image && p.imageInfo?.alpha);
    if (reels) out.push(F('polygone', { nom: 'Décor A', x: 0, y: 0, w: W, h: H, prof: 0.15 }, { fill: '@accent', stroke: 'none', lw: 0, pts: pa, trame: { actif: true, couleur: '@encre', cellule: Math.round(14 * u), intensite: 0.35 } }, en('glisse', 0, 0.8, 'forte', { dir: P ? 'gauche' : 'haut', force: 0.4 })),
      F('polygone', { nom: 'Décor B', x: 0, y: 0, w: W, h: H, prof: 0.15 }, { fill: '@accent2', stroke: 'none', lw: 0, pts: pb, trame: { actif: true, couleur: '@encre', cellule: Math.round(14 * u), intensite: 0.35 } }, en('glisse', 0, 0.8, 'forte', { dir: P ? 'droite' : 'bas', force: 0.4 })),
      k.E('vignette', { intensite: 0.55 }, { x: 0, y: 0, w: W, h: H, nom: 'Vignettage' }));
    else out.push(I(opq(0), FOND_UNIVERS[ua] || 'pop', { nom: opq(0) ? nomDe(b, 0, 'Héros') : 'Décor A', x: 0, y: 0, w: W, h: H, prof: 0.15 }, { masque: { forme: 'polygone', pts: pa } }, en('glisse', 0, 0.8, 'forte', { dir: P ? 'gauche' : 'haut', force: 0.4 })),
      I(opq(1), FOND_UNIVERS[ub] === FOND_UNIVERS[ua] ? 'pop' : FOND_UNIVERS[ub] || 'cosmos', { nom: opq(1) ? nomDe(b, 1, 'Rival') : 'Décor B', x: 0, y: 0, w: W, h: H, prof: 0.15 }, { masque: { forme: 'polygone', pts: pb }, traitement: { contraste: 0.1 } }, en('glisse', 0, 0.8, 'forte', { dir: P ? 'droite' : 'bas', force: 0.4 })));
    out.push(k.E('vitesse', { couleur: '#FFFFFF', intensite: 0.45, densite: 0.5, cx: 0.5, cy: 0.5 }, { x: 0, y: 0, w: W, h: H, nom: 'Lignes de vitesse', op: 0.35 }), k.E('energie', { couleur: '@accent', couleur2: '#FFFFFF', intensite: 0.6, cx: 0.5, cy: 0.5 }, { x: 0, y: 0, w: W, h: H, nom: 'Choc' }),
      F('polygone', { nom: 'Séparation', x: 0, y: 0, w: W, h: H }, { fill: '@accent', stroke: 'none', lw: 0, pts: P ? [0.5 + o / W - 0.006, 0, 0.5 + o / W + 0.006, 0, 0.5 - o / W + 0.006, 1, 0.5 - o / W - 0.006, 1] : [0, 0.5 + o / H - 0.006, 1, 0.5 - o / H - 0.006, 1, 0.5 - o / H + 0.006, 0, 0.5 + o / H + 0.006] }, en('revelation', 0.3, 0.5, 'forte', { dir: P ? 'haut' : 'gauche' })),
      ...(P ? [heros(k, b, 0, { x: -W * 0.02, y: H * 0.08, w: W * 0.52, h: H * 0.92 }, {}, en('glisse', 0.4, 0.7, 'forte', { dir: 'gauche', force: 0.5 }), { contre: '#FFFFFF', aura: '@accent', auraForce: 0.45, dir: 340 }), heros(k, b, 1, { x: W * 0.5, y: H * 0.08, w: W * 0.52, h: H * 0.92 }, {}, en('glisse', 0.5, 0.7, 'forte', { dir: 'droite', force: 0.5 }), { contre: '#9FE6FF', aura: '@accent2', auraForce: 0.55, dir: 200 })]
        : [heros(k, b, 0, { x: W * 0.05, y: H * 0.03, w: W * 0.9, h: H * 0.47 }, {}, en('glisse', 0.4, 0.7, 'forte', { dir: 'haut', force: 0.4 }), { contre: '#FFFFFF', aura: '@accent', auraForce: 0.45, dir: 70 }), heros(k, b, 1, { x: W * 0.05, y: H * 0.5, w: W * 0.9, h: H * 0.47 }, {}, en('glisse', 0.5, 0.7, 'forte', { dir: 'bas', force: 0.4 }), { contre: '#9FE6FF', aura: '@accent2', auraForce: 0.55, dir: 250 })]));
    const nomA = nomDe(b, 0, 'Héros'), nomB = nomDe(b, 1, 'Rival'), bt = (P ? 120 : 140) * u, s0 = (P ? 300 : 340) * u;
    out.push(T('titre', nomA, P ? { x: m, y: H - m - bt * 1.3, w: W * 0.4, h: bt * 1.3 } : { x: m, y: H * 0.5 - s0 * 0.55 - bt, w: W - 2 * m, h: bt }, { taille: bt, align: P ? 'start' : 'middle', valign: 'bas' }, en('tampon', 0.9, 0.45, 'rebond')),
      T('titre', nomB, P ? { x: W * 0.6 - m, y: H - m - bt * 1.3, w: W * 0.4, h: bt * 1.3 } : { x: m, y: H - m - bt, w: W - 2 * m, h: bt }, { taille: bt, align: P ? 'end' : 'middle', valign: 'bas' }, en('tampon', 1.05, 0.45, 'rebond')));
    const s = Math.round((P ? 300 : 340) * u);
    out.push(F('explosion', { nom: 'Badge', x: W / 2 - s / 2, y: H / 2 - s / 2, w: s, h: s }, { fill: '@accent', stroke: '@encre', lw: Math.round(8 * u), branches: 14 }, { entree: { type: 'zoom', delai: 1.2, duree: 0.45, courbe: 'rebond' }, boucle: { type: 'pulsation', amplitude: 0.8, periode: 1.4 } }),
      T('onomatopee', 'VS', { nom: 'VS', x: W / 2 - s * 0.32, y: H / 2 - s * 0.24, w: s * 0.64, h: s * 0.48 }, { taille: 150 * u, align: 'middle', valign: 'milieu', fill: '#FFFFFF', deformation: { type: 'aucune', force: 0 } }, en('tampon', 1.3, 0.4, 'rebond')));
    const tt = b.titre && !/\bvs\b/i.test(b.titre) ? b.titre : TYPES[b.type]?.nom || 'Versus';
    out.push(rubrique(k, tt, { x: W / 2 - W * (P ? 0.2 : 0.35), y: m * 0.7, w: W * (P ? 0.4 : 0.7), h: 56 * u }, en('revelation', 0.2, 0.5, 'forte')));
    // Image opaque : déjà posée en moitié de décor, pas de personnage détouré en double
    return out.filter((e) => !(e.type === 'image' && e.prof === 0.45 && ((opq(0) && e.nom === nomDe(b, 0, 'Héros')) || (opq(1) && e.nom === nomDe(b, 1, 'Rival')))));
  },
  // Héros : présence dominante, écho du nom, ambiance d'univers, rubrique et accroche
  heros(k, b, repere = false) {
    if (!repere && !k.lateral && variante(b) === 1) return MISES.monumental(k, b);
    const { W, H, u, m, P, V, T, F, en } = k, nom = b.titre || nomDe(b, 0, 'Personnage'), hz = P ? { x: W * 0.4, y: H * 0.04, w: W * 0.6, h: H * 0.96 } : V ? { x: W * 0.02, y: H * 0.05, w: W * 0.96, h: H * 0.62 } : { x: W * 0.32, y: H * 0.06, w: W * 0.7, h: H * 0.94 };
    if (P && k.sujet === 'gauche') hz.x = W - hz.x - hz.w;
    const cx = (hz.x + hz.w / 2) / W, cy = (hz.y + hz.h * 0.4) / H, out = [...ambiance(k, b.univers, cx, cy)];
    const echo = (perso(b, 0)?.nom || nom).toUpperCase();
    out.push(T('titre', echo, { nom: 'Écho du nom', x: -W * 0.05, y: P ? H * 0.2 : H * 0.12, w: W * 1.1, h: P ? H * 0.6 : H * 0.42, op: 0.1 }, { ...SANS, taille: 600 * u, align: 'middle', valign: 'milieu', fill: '@texte' }, en('fondu', 0, 1.6, 'entree-sortie')));
    out.push(heros(k, b, 0, hz, {}, { entree: { type: 'zoom-arriere', delai: 0.3, duree: 1.2, courbe: 'forte', force: 0.25 }, boucle: { type: 'flottement', amplitude: 0.35, periode: 5 } }));
    const col = P ? { x: k.sujet === 'gauche' ? W - m - W * 0.4 : m, y: H * 0.22, w: W * 0.4, h: H * 0.7 } : V ? { x: m, y: H * 0.67, w: W - 2 * m, h: H * 0.3 } : { x: m, y: H * 0.4, w: W * 0.42, h: H * 0.54 };
    const al = V ? 'middle' : 'start';
    out.push(rubrique(k, b.rubrique || TYPES[b.type]?.nom || 'Portrait', { x: V ? W / 2 - W * 0.3 : col.x, y: col.y - (P ? 70 : 60) * u, w: V ? W * 0.6 : col.w * 0.8, h: 52 * u }, en('revelation', 0.6, 0.5, 'forte')),
      T('titre', nom, { x: col.x, y: col.y, w: col.w, h: col.h * 0.55 }, { taille: (V ? 170 : 150) * u, align: al, valign: 'haut' }, en('revelation', 0.8, 0.8, 'forte', { dir: 'bas' })),
      T('accroche', b.sousTitre || '', { x: col.x, y: col.y + col.h * 0.58, w: col.w, h: col.h * 0.18 }, { taille: 52 * u, align: al, fill: '@texte', casse: 'none' }, en('fondu', 1.2, 0.8)));
    if (repere) { const s = 210 * u, bx = P ? col.x : V ? W - m - s : col.x, by = P ? col.y + col.h * 0.78 : V ? H * 0.06 : col.y + col.h * 0.78;
      out.push(F('etoile', { nom: 'Repère', x: bx, y: by, w: s, h: s, rot: -8 }, { fill: '@accent', stroke: 'none', lw: 0, branches: 18, creux: 0.84 }, en('rotation', 1.4, 0.6, 'rebond')),
        T('titre', b.repere || 'À vérifier', { nom: 'Repère · texte', x: bx + s * 0.16, y: by + s * 0.3, w: s * 0.68, h: s * 0.4, rot: -8 }, { ...SANS, taille: 56 * u, align: 'middle', valign: 'milieu', fill: '@surAccent' === '@surAccent' ? '#111111' : '#111111' }, en('fondu', 1.6, 0.4))); }
    return out;
  },
  'heros-repere'(k, b) { return MISES.heros(k, b, true); },
  // Monumental : sujet centré en contre-plongée, rayons derrière, titre sur un sol sombre, lecture centrée
  monumental(k, b) {
    const { W, H, u, m, P, V, T, E, en } = k, nom = b.titre || nomDe(b, 0, 'Personnage'), hz = P ? { x: W * 0.22, y: H * 0.02, w: W * 0.56, h: H * 0.86 } : V ? { x: W * 0.02, y: H * 0.1, w: W * 0.96, h: H * 0.62 } : { x: W * 0.08, y: H * 0.04, w: W * 0.84, h: H * 0.7 };
    const out = [...ambiance(k, b.univers, 0.5, P ? 0.35 : 0.32, { intensite: 1.1 })];
    out.splice(2, 0, E('rayons', { couleur: '@accent', intensite: 0.5, densite: 0.45, cx: 0.5, cy: P ? 0.3 : 0.28 }, { x: 0, y: 0, w: W, h: H, nom: 'Rayons', prof: 0.2 }, { entree: { type: 'fondu', duree: 1.4, delai: 0.2 }, boucle: { type: 'aucune' } }));
    out.push(heros(k, b, 0, hz, {}, { entree: { type: 'zoom-arriere', delai: 0.2, duree: 1.4, courbe: 'forte', force: 0.3 }, boucle: { type: 'flottement', amplitude: 0.3, periode: 6 } }, { dir: 270 }),
      E('degrade', { couleur: '@fond', couleur2: '@fond', intensite: 0.96, angle: 90, fondu: true }, { nom: 'Sol', x: 0, y: H * (P ? 0.45 : 0.5), w: W, h: H * (P ? 0.55 : 0.5) }, { entree: { type: 'fondu', duree: 0.6, delai: 0 } }));
    const ty = H * (P ? 0.7 : V ? 0.76 : 0.74);
    out.push(rubrique(k, b.rubrique || TYPES[b.type]?.nom || 'Portrait', { x: W / 2 - W * 0.2, y: ty - 64 * u, w: W * 0.4, h: 50 * u }, en('revelation', 0.9, 0.5, 'forte')),
      T('titre', nom, { x: m, y: ty, w: W - 2 * m, h: H * (P ? 0.17 : 0.14) }, { taille: (P ? 150 : 180) * u, align: 'middle', valign: 'haut', lueur: { c: '@accent', b: 20 * u } }, en('lettres', 1, 1, 'douce')),
      T('accroche', b.sousTitre || '', { x: m, y: ty + H * (P ? 0.17 : 0.145), w: W - 2 * m, h: 60 * u }, { taille: 46 * u, align: 'middle', fill: '@texte', casse: 'none' }, en('fondu', 1.6, 0.8)));
    return out;
  },
  // Une éditoriale : titraille, filets, visuel encadré, note pour une critique
  une(k, b) {
    const { W, H, u, m, P, V, T, F, I, E, en } = k, out = [E('papier', { intensite: 0.4 }, { x: 0, y: 0, w: W, h: H, nom: 'Papier' })];
    let iz = P ? { x: W * 0.55, y: m * 1.2, w: W * 0.45 - m * 1.4, h: H - m * 2.4 } : V ? { x: m, y: H * 0.1, w: W - 2 * m, h: H * 0.42 } : { x: W * 0.5, y: m * 1.4, w: W * 0.5 - m * 1.3, h: H * 0.6 };
    // Image réelle : détourée → mise en scène sans cadre ; opaque (planche, couverture, photo) → cadre aux proportions de l'image, jamais recadrée
    const pr = perso(b, 0), inf = pr?.image && pr.imageInfo;
    if (inf?.alpha) { out.push(imageReelle(k, pr, iz, {}, en('revelation', 0.3, 0.9, 'entree-sortie', { dir: 'bas' }), {}, pr.univers || b.univers)); }
    else { if (inf && P && inf.w > inf.h) iz = { x: W * 0.46, y: m * 1.4, w: W * 0.54 - m, h: H - m * 3.4 };
    if (inf) { const ra = inf.w / inf.h, bw = Math.min(iz.w, iz.h * ra), bh = bw / ra; iz = { x: iz.x + (iz.w - bw) / 2, y: iz.y + (iz.h - bh) / 2, w: bw, h: bh }; }
    out.push(F('rect', { nom: 'Ombre', x: iz.x + 16 * u, y: iz.y + 16 * u, w: iz.w, h: iz.h }, { fill: '@accent', stroke: 'none', lw: 0 }, en('fondu', 0.5, 0.6)),
      I(perso(b, 0)?.image || null, FOND_UNIVERS[b.univers] || 'cosmos', { nom: 'Visuel', ...iz }, { contour: { c: '@encre', w: Math.round(5 * u) } }, en('revelation', 0.3, 0.9, 'entree-sortie', { dir: 'bas' }))); }
    const col = P ? { x: m, y: m * 1.2, w: W * 0.47, h: H - m * 2.4 } : V ? { x: m, y: H * 0.55, w: W - 2 * m, h: H * 0.42 } : { x: m, y: m * 1.4, w: W * 0.44, h: H - m * 2.8 };
    out.push(rubrique(k, b.rubrique || TYPES[b.type]?.nom || 'Analyse', { x: col.x, y: col.y, w: col.w * 0.6, h: 50 * u }, en('revelation', 0, 0.5, 'forte')),
      F('rect', { nom: 'Filet', x: col.x, y: col.y + 74 * u, w: col.w, h: Math.max(2, 3 * u) }, { fill: '@texte', stroke: 'none', lw: 0 }, en('revelation', 0.2, 0.6, 'forte')),
      T('titre', b.titre || 'Titre', { x: col.x, y: col.y + 96 * u, w: col.w, h: col.h * 0.5 }, { ...SANS, taille: 140 * u, fill: '@texte' }, en('glisse', 0.4, 0.7, 'forte', { force: 0.3 })),
      T('accroche', b.sousTitre || '', { x: col.x, y: col.y + 110 * u + col.h * 0.5, w: col.w, h: col.h * 0.2 }, { ...SANS, taille: 48 * u, fill: '@texte', casse: 'none' }, en('fondu', 0.8, 0.7)));
    if (b.type === 'critique' && b.note) { const n = Math.max(0, Math.min(5, Math.round(+b.note))), s = 56 * u; for (let i = 0; i < 5; i++) out.push(F('etoile', { nom: `Note ${i + 1}`, x: col.x + i * s * 1.15, y: col.y + col.h - s, w: s, h: s }, { fill: i < n ? '@accent' : 'none', stroke: '@texte', lw: i < n ? 0 : 2, branches: 5, creux: 0.45 }, en('zoom', 1 + i * 0.08, 0.35, 'rebond'))); }
    return out;
  },
  // Annonce : information principale dominante, rayons, date en bandeau
  annonce(k, b) {
    const { W, H, u, m, P, V, T, E, en } = k, out = [...ambiance(k, b.univers, 0.5, P ? 0.4 : 0.35, { intensite: 0.8 })];
    out.splice(1, 0, E('rayons', { couleur: '@accent', intensite: 0.35, densite: 0.4, cx: 0.5, cy: P ? 0.4 : 0.35 }, { x: 0, y: 0, w: W, h: H, nom: 'Rayons' }, { entree: { type: 'fondu', duree: 1, delai: 0.2 }, boucle: { type: 'aucune' } }));
    if (perso(b, 0) || b.type === 'annonce') out.push(heros(k, b, 0, P ? { x: W * 0.3, y: H * 0.02, w: W * 0.4, h: H * 0.62 } : { x: W * 0.15, y: H * 0.06, w: W * 0.7, h: H * 0.5 }, { op: 0.95 }, en('zoom-arriere', 0.2, 1.2, 'forte', { force: 0.2 })));
    out.push(rubrique(k, b.rubrique || TYPES[b.type]?.nom || 'Annonce', { x: W / 2 - W * 0.22, y: P ? H * 0.6 : H * 0.57, w: W * 0.44, h: 54 * u }, en('revelation', 0.8, 0.5, 'forte')),
      T('titre', b.titre || 'Bientôt', { x: m, y: P ? H * 0.66 : H * 0.62, w: W - 2 * m, h: P ? H * 0.2 : H * 0.18 }, { taille: (P ? 150 : 170) * u, align: 'middle', valign: 'milieu' }, en('lettres', 1, 1, 'douce')),
      T('surtitre', b.repere || 'Date à confirmer', { x: W / 2 - W * 0.2, y: P ? H * 0.88 : H * 0.84, w: W * 0.4, h: 50 * u }, { auto: true, valign: 'milieu', align: 'middle' }, en('fondu', 1.4, 0.6)));
    return out;
  },
  // Événement / crossover : échelle cosmique, titre monumental, protagonistes alignés
  evenement(k, b) {
    const { W, H, u, m, P, T, E, en } = k, out = [...ambiance(k, 'cosmique', 0.5, 0.42, { intensite: 1.2 })];
    out.splice(2, 0, E('rayons', { couleur: '@accent', intensite: 0.45, densite: 0.5, cx: 0.5, cy: 0.42 }, { x: 0, y: 0, w: W, h: H, nom: 'Rayons' }, { entree: { type: 'fondu', duree: 1.2, delai: 0.3 }, boucle: { type: 'aucune' } }));
    const n = Math.min(3, Math.max(1, b.personnages?.length || 2)), lw = (W - 2 * m) / n;
    for (let i = 0; i < n; i++) out.push(heros(k, b, i, { x: m + i * lw, y: P ? H * 0.42 : H * 0.5, w: lw, h: P ? H * 0.58 : H * 0.5, op: 0.95 }, {}, en('glisse', 0.6 + i * 0.15, 0.7, 'forte', { dir: 'bas', force: 0.3 })));
    const titre = b.titre || (b.type === 'crossover' ? `${nomDe(b, 0, 'Univers A')} × ${nomDe(b, 1, 'Univers B')}` : 'L\'événement');
    out.push(rubrique(k, b.rubrique || TYPES[b.type]?.nom || 'Événement', { x: W / 2 - W * 0.18, y: m, w: W * 0.36, h: 52 * u }, en('revelation', 0.2, 0.5, 'forte')),
      T('titre', titre, { x: m, y: H * 0.1, w: W - 2 * m, h: P ? H * 0.3 : H * 0.28 }, { taille: (P ? 190 : 200) * u, align: 'middle', valign: 'milieu', lueur: { c: '@accent', b: 28 * u } }, en('lettres', 0.4, 1.2, 'douce')),
      T('accroche', b.sousTitre || '', { x: m, y: P ? H * 0.38 : H * 0.4, w: W - 2 * m, h: 70 * u }, { taille: 52 * u, align: 'middle', fill: '@texte', casse: 'none' }, en('fondu', 1.2, 0.8)));
    return out;
  },
  // Liste : chronologie, classement, sélection, hiérarchie — la lisibilité prime
  liste(k, b) {
    const { W, H, u, m, P, V, T, F, E, en } = k, out = [...ambiance(k, b.univers, 0.8, 0.5, { intensite: 0.5, fondImage: false })].filter((e) => !['Énergie', 'Étincelles'].includes(e.nom));
    out.push(E('trame', { couleur: '@accent', mode: 'lineaire', intensite: 0.18 }, { x: 0, y: 0, w: W, h: H, nom: 'Trame', op: 0.22 }));
    const items = (b.items?.length ? b.items : Array.from({ length: 5 }, (_, i) => `Élément ${i + 1} à compléter`)).slice(0, V ? 7 : 6), hT = (V ? 0.2 : 0.24) * H;
    out.push(rubrique(k, b.rubrique || TYPES[b.type]?.nom || 'Liste', { x: m, y: m * 0.8, w: W * 0.36, h: 50 * u }, en('revelation', 0, 0.5, 'forte')),
      T('titre', b.titre || 'Le classement', { x: m, y: m * 0.8 + 66 * u, w: P ? W * 0.62 : W - 2 * m, h: hT - 66 * u }, { taille: 120 * u }, en('glisse', 0.2, 0.6, 'forte', { force: 0.3 })));
    const illu = !!perso(b, 0) && (P || items.length <= 4), y0 = m * 0.8 + hT + 10 * u, lh = Math.min(170 * u, (H - y0 - m) / items.length), x0 = m, lw = P || illu ? W * 0.6 : W - 2 * m;
    if (b.type === 'chronologie') out.push(F('rect', { nom: 'Axe', x: x0 + 36 * u, y: y0, w: Math.max(3, 4 * u), h: lh * items.length }, { fill: '@accent', stroke: 'none', lw: 0 }, en('revelation', 0.4, 1, 'forte', { dir: 'haut' })));
    items.forEach((t, i) => { const y = y0 + i * lh, pyr = b.type === 'cosmique' ? 0.55 + 0.45 * (i / Math.max(1, items.length - 1)) : 1, w = lw * pyr;
      out.push(F(b.type === 'chronologie' ? 'ellipse' : 'lame', { nom: `Repère ${i + 1}`, x: x0 + (b.type === 'chronologie' ? 18 * u : 0), y: y + lh * 0.12, w: b.type === 'chronologie' ? 40 * u : 76 * u, h: b.type === 'chronologie' ? 40 * u : lh * 0.76 }, { fill: '@accent', stroke: 'none', lw: 0 }, en('zoom', 0.6 + i * 0.12, 0.4, 'rebond')),
        T('titre', String(i + 1), { nom: `Numéro ${i + 1}`, x: x0, y: y + lh * 0.12, w: 76 * u, h: lh * 0.76 }, { ...SANS, taille: lh * 0.6, align: 'middle', valign: 'milieu', fill: b.type === 'chronologie' ? 'none' : '#111111' }, en('fondu', 0.65 + i * 0.12, 0.3)),
        T('corps', t, { nom: `Ligne ${i + 1}`, x: x0 + 100 * u, y: y + lh * 0.1, w: w - 100 * u, h: lh * 0.8 }, { ...SANS, police: 'textBold', taille: Math.min(44 * u, lh * 0.42), valign: 'milieu', fill: '@texte', casse: 'none' }, en('glisse', 0.7 + i * 0.12, 0.5, 'forte', { force: 0.2 })));
    });
    if (illu) out.splice(out.length - items.length * 3, 0, heros(k, b, 0, P ? { x: W * 0.6, y: H * 0.1, w: W * 0.42, h: H * 0.9 } : { x: W * 0.42, y: H * 0.5, w: W * 0.62, h: H * 0.5 }, { op: 0.95 }, en('fondu', 0.4, 1)));
    return out;
  },
  // Question : quiz ou débat, point d'interrogation géant, options
  question(k, b) {
    const { W, H, u, m, P, V, T, F, en } = k, out = [...ambiance(k, b.univers, 0.75, 0.5, { intensite: 0.7 })];
    out.push(T('onomatopee', '?', { nom: 'Point d\'interrogation', x: P ? W * 0.6 : W * 0.2, y: P ? H * 0.08 : H * 0.06, w: P ? W * 0.36 : W * 0.6, h: P ? H * 0.84 : H * 0.4, op: 0.95 }, { taille: (P ? 640 : 420) * u, align: 'middle', valign: 'milieu', fill: '@accent' }, { entree: { type: 'tampon', delai: 0.2, duree: 0.5, courbe: 'rebond' }, boucle: { type: 'balancement', amplitude: 0.6, periode: 3 } }));
    const col = P ? { x: m, y: H * 0.2, w: W * 0.55, h: H * 0.6 } : { x: m, y: H * 0.52, w: W - 2 * m, h: H * 0.42 };
    out.push(rubrique(k, b.rubrique || TYPES[b.type]?.nom || 'Quiz', { x: col.x, y: col.y - 70 * u, w: col.w * 0.5, h: 52 * u }, en('revelation', 0, 0.5, 'forte')),
      T('titre', b.titre || 'Qui gagne ?', { x: col.x, y: col.y, w: col.w, h: col.h * 0.6 }, { taille: 140 * u, align: V ? 'middle' : 'start' }, en('glisse', 0.4, 0.7, 'forte', { force: 0.3 })));
    if (b.personnages?.length >= 2) ['A', 'B'].forEach((l, i) => { const bw = col.w * 0.48, x = col.x + i * col.w * 0.52, y = col.y + col.h * 0.68;
      out.push(F('cartouche', { nom: `Option ${l}`, x, y, w: bw, h: 90 * u }, { fill: i ? '@accent2' : '@accent', stroke: '@encre', lw: Math.round(4 * u) }, en('zoom', 0.9 + i * 0.15, 0.4, 'rebond')),
        T('titre', `${l} · ${nomDe(b, i, '')}`, { nom: `Option ${l} · texte`, x: x + 16 * u, y: y + 12 * u, w: bw - 32 * u, h: 66 * u }, { ...SANS, taille: 52 * u, valign: 'milieu', fill: '#111111' }, en('fondu', 1 + i * 0.15, 0.4))); });
    return out;
  },
  // Citation : la parole d'abord, guillemets monumentaux, portrait en retrait
  citation(k, b) {
    const { W, H, u, m, P, V, T, en } = k, out = [...ambiance(k, b.univers, P ? 0.82 : 0.5, 0.4, { intensite: 0.6 })];
    if (perso(b, 0)) out.push(heros(k, b, 0, P ? { x: W * 0.6, y: H * 0.08, w: W * 0.42, h: H * 0.92, op: 0.85 } : { x: W * 0.2, y: H * 0.04, w: W * 0.6, h: H * 0.42, op: 0.85 }, {}, en('fondu', 0.2, 1.4, 'entree-sortie')));
    const col = P ? { x: m, y: H * 0.16, w: W * 0.6, h: H * 0.7 } : { x: m, y: V ? H * 0.46 : H * 0.36, w: W - 2 * m, h: V ? H * 0.46 : H * 0.56 };
    out.push(T('onomatopee', '«', { nom: 'Guillemet', x: col.x - 10 * u, y: col.y - 120 * u, w: 220 * u, h: 220 * u, op: 0.9 }, { ...SANS, police: 'serif', taille: 320 * u, fill: '@accent' }, en('zoom', 0, 0.5, 'rebond')),
      T('accroche', b.citation || 'Citation à fournir et à vérifier', { nom: 'Citation', x: col.x, y: col.y + 60 * u, w: col.w, h: col.h * 0.7 }, { ...SANS, taille: 84 * u, fill: '@texte', casse: 'none', interligne: 1.1 }, en('mots', 0.4, 1.4, 'douce')),
      T('legende', `— ${nomDe(b, 0, 'Source à préciser')}`, { nom: 'Attribution', x: col.x, y: col.y + col.h * 0.78, w: col.w, h: 50 * u }, { taille: 30 * u, fill: '@accent', interlettre: 3 }, en('fondu', 1.6, 0.6)));
    return out;
  },
  equipes(k, b) {
    const { W, H, u, m, P, T, F, en } = k, n = Math.min(6, Math.max(3, b.personnages?.length || 4)), out = [...ambiance(k, b.univers, 0.5, 0.55, { intensite: 0.7 })];
    out.push(rubrique(k, b.rubrique || 'Affrontement', { x: m, y: m * 0.7, w: W * 0.34, h: 50 * u }, en('revelation', 0, 0.5, 'forte')), T('titre', b.titre || 'Le choc des équipes', { x: m, y: m * 0.7 + 64 * u, w: W - 2 * m, h: (P ? 0.17 : 0.13) * H }, { taille: 120 * u }, en('tampon', 0.3, 0.45, 'rebond')));
    const y0 = (P ? 0.32 : 0.26) * H, cols = P ? n : Math.min(n, 3), rows = Math.ceil(n / cols), cw = (W - 2 * m) / cols, ch = (H - y0 - m) / rows;
    for (let i = 0; i < n; i++) { const x = m + (i % cols) * cw, y = y0 + Math.floor(i / cols) * ch;
      out.push(heros(k, b, i, { x: x + 6 * u, y, w: cw - 12 * u, h: ch * 0.85 }, {}, en('glisse', 0.5 + i * 0.12, 0.6, 'forte', { dir: 'bas', force: 0.3 })),
        T('titre', nomDe(b, i, `Membre ${i + 1}`), { nom: `Nom ${i + 1}`, x: x + 6 * u, y: y + ch * 0.82, w: cw - 12 * u, h: ch * 0.16 }, { taille: 56 * u, align: 'middle', valign: 'milieu' }, en('fondu', 0.7 + i * 0.12, 0.4))); }
    return out;
  },
};

// Composition d'un brief dans un format ; brief : { type, titre, sousTitre, rubrique, personnages: [{ nom, image?, univers? }], univers, repere, items, citation, note, profil }
// Traitements comparables d'un même sujet (Production › Visuels › Comparer)
export const TRAITEMENTS = { monumental: { nom: 'Monumental', mise: 'monumental' }, editorial: { nom: 'Éditorial', mise: 'une', systeme: ['editorial', 'papier'] }, cinema: { nom: 'Cinématographique', mise: 'heros', systeme: ['cinema', 'nuit'] }, minimal: { nom: 'Minimaliste', mise: 'heros', systeme: ['minimal', 'noir'], sobre: true } };
export function composer(brief, formatId = 'miniature', { profil, traitement } = {}) {
  const tr = TRAITEMENTS[traitement], b = normaliserBrief(brief), mise = tr?.mise || TYPES[b.type]?.mise || 'heros', carrousel = formatId === 'carrousel';
  const [sy, pal] = profil?.systeme ? [profil.systeme, profil.palette] : tr?.systeme ? tr.systeme : SYSTEME_PAR_DEFAUT[mise] ? SYSTEME_PAR_DEFAUT[mise] : SYSTEME_UNIVERS[b.univers] || ['comics'];
  const f = fmt(FORMATS_COMPOSITEUR[formatId] || formatId), d = nouveauDocument({ format: f.id, w: f.w, h: f.h, systeme: sy, palette: pal, nom: b.titre || TYPES[b.type]?.nom || 'Création' });
  if (profil?.couleurs) d.couleurs = { ...profil.couleurs }; if (profil?.id) d.profil = profil.id;
  d.duree = mise === 'liste' ? 7 : 6; d.brief = JSON.parse(JSON.stringify({ ...brief, personnages: b.personnages })); d.origine = { compositeur: b.type, format: formatId };
  const k = kit(d); k.sujet = profil?.composition?.sujet; k.sobre = !!tr?.sobre || profil?.sobriete === 'épurée' || (profil?.mesures?.densite ?? 1) < 0.08; k.lateral = !!tr && mise === 'heros'; k.minimal = traitement === 'minimal'; k.reel = b.personnages.some((p) => p.image); if (tr) d.origine.traitement = traitement; d.elements = sansVides((MISES[mise] || MISES.heros)(k, b));
  if (['duel', 'heros', 'heros-repere', 'annonce', 'evenement'].includes(mise)) d.camera = { type: 'poussee', intensite: 0.3 };
  if (carrousel) composerCarrousel(d, b);
  // Bande son synchronisée sur l'animation (effets synthétisés, modifiables dans Document › Son)
  d.audio = { volume: 0.9, muet: false, pistes: sonsAuto(d) };
  return d;
}
// Jeton de texte le plus lisible sur le fond du document (contraste mesuré)
const lisible = (d) => { const p = palette(d); return contraste(p.texte, p.fond) >= contraste(p.encre, p.fond) ? '@texte' : '@encre'; };
const accentLisible = (d) => { const p = palette(d); return contraste(p.accent, p.fond) >= 2 ? '@accent' : lisible(d); };
const sansVides = (els) => els.filter((e) => e.type !== 'texte' || String(e.texte.contenu).trim());
// Carrousel : couverture puis diapositives de contenu et de conclusion, chacune en plan (exportables une par une)
function composerCarrousel(d, b) {
  const pages = (b.items?.length ? b.items : [b.sousTitre || 'L\'essentiel en quelques points', ...(TYPES[b.type]?.faits ? ['Les faits à vérifier et sourcer'] : []), 'À retenir']).slice(0, 8);
  pages.forEach((txt, i) => { ajouterPlan(d); d.duree = 3; d.plans[d.planActif].nom = `Diapositive ${i + 2}`; d.plans[d.planActif].transition = { type: 'glissement', duree: 0.5 };
    const k = kit(d), { W, H, u, m, T, F } = k;
    const pj = trouverPersonnage(txt), illu = pj ? [heros(k, { personnages: [{ nom: pj.nom, univers: pj.univers }], univers: pj.univers }, 0, { x: W * 0.3, y: H * 0.36, w: W * 0.72, h: H * 0.56, prof: 0.4 }, {}, k.en('zoom-arriere', 0.3, 1, 'forte', { force: 0.2 }))] : [];
    d.elements = [...ambiance(k, pj?.univers || b.univers, 0.75, 0.6, { intensite: 0.6, fondImage: false }).filter((e) => !['Énergie', 'Étincelles'].includes(e.nom) && (pj || e.nom !== 'Halo du sujet')),
      ...illu,
      T('titre', String(i + 2).padStart(2, '0'), { nom: 'Numéro', x: m, y: m, w: 300 * u, h: 220 * u }, { ...SANS, taille: 220 * u, fill: accentLisible(d) }, k.en('tampon', 0.1, 0.4, 'rebond')),
      F('rect', { nom: 'Filet', x: m, y: m + 240 * u, w: 160 * u, h: 8 * u }, { fill: '@accent', stroke: 'none', lw: 0 }, k.en('revelation', 0.3, 0.4, 'forte')),
      T('titre', txt, { x: m, y: m + 290 * u, w: W - 2 * m, h: H * 0.5 }, { taille: 110 * u, valign: 'haut' }, k.en('mots', 0.4, 0.9, 'douce')),
      ...pages.map((_, j) => F('rect', { nom: `Progression ${j + 2}`, x: m + j * ((W - 2 * m) / pages.length), y: H - m - 70 * u, w: (W - 2 * m) / pages.length - 8 * u, h: 6 * u, op: j <= i ? 1 : 0.25 }, { fill: j <= i ? '@accent' : '@texte', stroke: 'none', lw: 0 }, k.en('fondu', 0.2, 0.4))),
      ...(i === pages.length - 1 ? [k.E('lumiere', { mode: 'halo', couleur: '@accent', intensite: 0.5, densite: 0.4, cx: 0.8, cy: 0.75 }, { x: 0, y: 0, w: W, h: H, nom: 'Lumière de conclusion' })] : []),
      T('legende', b.titre || '', { x: m, y: H - m - 40 * u, w: W * 0.7, h: 40 * u }, { taille: 24 * u, fill: lisible(d) }, k.en('fondu', 0.6, 0.4)),
      T('legende', i === pages.length - 1 ? 'Fin' : 'Suite →', { x: W - m - 260 * u, y: H - m - 40 * u, w: 260 * u, h: 40 * u }, { taille: 24 * u, align: 'end', fill: accentLisible(d) }, k.en('fondu', 0.8, 0.4))]; d.elements = sansVides(d.elements); });
  changerPlan(d, 0); d.plans[0].nom = 'Couverture';
}
function normaliserBrief(b) {
  const personnages = (b.personnages || []).map((p) => (typeof p === 'string' ? { nom: p } : p)).map((p) => ({ ...p, univers: p.univers || trouverPersonnage(p.nom)?.univers || null }));
  return { type: TYPES[b.type] ? b.type : 'portrait', titre: b.titre || '', sousTitre: b.sousTitre || '', rubrique: b.rubrique || '', personnages, univers: b.univers || personnages[0]?.univers || 'urbain', repere: b.repere || '', items: b.items || [], citation: b.citation || '', note: b.note };
}
// Déclinaison multiformat : la même intention recomposée pour chaque support
export function decliner(brief, formats, o) { return formats.map((f) => composer(brief, f, o)); }
export { SYSTEMES };
