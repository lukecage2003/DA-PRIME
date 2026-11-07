// Primestone · briques éditoriales Kiosque, partagées par les carrousels, la fiche personnage et les infographies.
import { W, H, C, G, M, LOGO, esc, texte, zone, image } from './briques.js';

const SERIF = { police: 'serif', casse: 'none', interligne: 0.95 };
const CORPS = { police: 'text', casse: 'none', interligne: 1.4 };
const fixe = (t) => ({ tMax: t, tMin: t });
const haut = (top, x, couleur, extra = {}) => (f) => ({ x, y: top + f.cap, couleur, ...extra });
const mono = (id, txt, x, y, couleur, { taille = 28, ancre = 'start' } = {}) => txt ? `<text id="${id}" data-ps-champ="${id}" x="${x}" y="${y}" text-anchor="${ancre}" font-family="${M.mono.family}" font-weight="700" font-size="${taille}" letter-spacing="${(taille * 0.12).toFixed(1)}" fill="${couleur}">${esc(String(txt).toLocaleUpperCase('fr-FR'))}</text>` : '';
const fond = (c) => `<rect width="${W}" height="${H}" fill="${c}"/>`;
const trame = (c = C.k) => `<pattern id="trame" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="7" cy="7" r="3.2" fill="${c}"/></pattern><rect width="${W}" height="${H}" fill="url(#trame)" opacity="${c === C.k ? 0.07 : 0.1}"/>`;
const logotype = (x, y, h, couleur) => { const s = h / LOGO.logotype.h; return `<path data-ps-statut="NON-OFFICIEL" fill="${couleur}" fill-rule="evenodd" transform="translate(${x} ${y}) scale(${s.toFixed(4)})" d="${LOGO.logotype.d}"/>`; };
// Masthead : logotype, rubrique · numéro, filet
const masthead = (d, couleur) => `<g id="masthead">${logotype(G.m, G.m, 50, couleur)}${mono('numero', [d.rubrique, d.numero].filter(Boolean).join(' · '), W - G.m, G.m + 44, couleur, { ancre: 'end' })}<rect x="${G.m}" y="${G.m + 76}" width="${W - 2 * G.m}" height="5" fill="${couleur}"/></g>`;
const pied = (d, couleur) => mono('page', d.page, W - G.m, H - G.m, couleur, { ancre: 'end' }) + mono('pied', d.pied, G.m, H - G.m, couleur, { taille: 26 });
const cadre = (z, bord, ombre) => `${ombre ? `<rect x="${z.x + 18}" y="${z.y + 18}" width="${z.w}" height="${z.h}" fill="${ombre}"/>` : ''}<rect x="${z.x}" y="${z.y}" width="${z.w}" height="${z.h}" fill="${C.k}"/>`;
const bordure = (z, c) => `<rect x="${z.x + 3}" y="${z.y + 3}" width="${z.w - 6}" height="${z.h - 6}" fill="none" stroke="${c}" stroke-width="6"/>`;
const T = (id, label, defaut, conseil) => ({ id, type: 'texte', label, defaut, ...(conseil ? { conseil } : {}) });
const TL = (id, label, defaut, conseil) => ({ ...T(id, label, defaut, conseil), type: 'texte-long' });
const I = (id, label, placeholder) => ({ id, type: 'image', label, placeholder });
const commun = (rub, num, page, pied = '') => [T('rubrique', 'Rubrique', rub), T('numero', 'Numéro', num), T('page', 'Pagination', page), T('pied', 'Pied de page', pied), T('credit', 'Crédit artiste', '')];
const une = (nom, rendre) => ({ standard: { nom, rendre } });
// Deux mises en couleur : Primestone (noir et jaune, par défaut) et Papier. rendre(d, ctx, P) reçoit P = { fond, encre, inverse }.
const PALETTES_KIOSQUE = { primestone: { nom: 'Primestone', fond: C.k, encre: C.y, inverse: C.k }, papier: { nom: 'Papier', fond: C.paper, encre: C.k, inverse: C.y } };
const duo = (rendre) => Object.fromEntries(Object.entries(PALETTES_KIOSQUE).map(([id, P]) => [id, { nom: P.nom, rendre: (d, ctx) => rendre(d, ctx, P) }]));
const L = () => W - 2 * G.m;

export { TL, SERIF, CORPS, fixe, haut, mono, fond, trame, logotype, masthead, pied, cadre, bordure, T, I, commun, une, duo, PALETTES_KIOSQUE, L };
