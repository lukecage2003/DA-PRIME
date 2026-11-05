// Primestone · briques des gabarits : couleurs, grille, mesure et ajustement du texte, formes, images, filtres.
// Module ES sans dépendance, identique dans Node et le navigateur. Utilisé par familles.js et moteur.js.
import T from './tokens.js';
import M from './metrics.js';
import LOGO from './logo.js';
export { T, M, LOGO };

// Formats : miniature YouTube (lot 2), carrousel Kiosque 4:5 et infographie 16:9 (lot 3). W, H et G sont des liaisons vivantes :
// le moteur appelle utiliserFormat() avant chaque rendu, les familles lisent toujours les valeurs du format courant.
export const FORMATS = {
  miniature: { w: T['format.youtube-thumbnail.width'], h: T['format.youtube-thumbnail.height'], m: T['layout.thumbnail.margin'], seal: T['layout.thumbnail.seal-size'], capMin: T['layout.thumbnail.title-cap-min'], zoneMorte: true },
  carrousel: { w: T['format.carousel.width'], h: T['format.carousel.height'], m: T['layout.carousel.margin'], seal: 86, capMin: 48, zoneMorte: false },
  infographie: { w: T['format.video-hd.width'], h: T['format.video-hd.height'], m: T['layout.video.safe-title'], seal: T['layout.video.bug-size'], capMin: 48, zoneMorte: false },
};
export let W, H, G;
export function utiliserFormat(id = 'miniature') {
  const f = FORMATS[id]; if (!f) throw new Error(`Format inconnu : ${id}`);
  W = f.w; H = f.h;
  G = { format: id, m: f.m, seal: f.seal, capMin: f.capMin, angle: T['motif.incision-angle'], ink: Math.round(W * T['motif.ink-outline-ratio'] * 10) / 10,
    dead: f.zoneMorte ? { x: W - 16 - T['layout.thumbnail.dead-zone-width'], y: H - 16 - T['layout.thumbnail.dead-zone-height'], w: T['layout.thumbnail.dead-zone-width'], h: T['layout.thumbnail.dead-zone-height'] } : null };
}
utiliserFormat('miniature');
export const C = {
  y: T['color.brand.yellow'], k: T['color.brand.black'], k0: T['color.brand.black-pure'], w: T['color.brand.white'],
  red: T['color.editorial.news-red'], paper: T['color.editorial.paper'], night: T['color.cinematic.night'], nightBlue: T['color.cinematic.night-blue'], silver: T['color.cinematic.silver'],
};
const TAN = Math.tan((G.angle * Math.PI) / 180);
const r1 = (n) => Math.round(n * 10) / 10;

// ---------- Texte : mesure, coupure, ajustement ----------
export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export function largeur(texte, police, taille, interlettre = 0) {
  const m = M[police]; let u = 0;
  for (const ch of texte) u += m.adv[ch.codePointAt(0)] ?? m.fallback;
  return (u / m.upm) * taille + interlettre * Math.max(0, [...texte].length - 1);
}
// Cherche la plus grande taille (pas de 2 px) pour laquelle le texte tient dans la boîte en maxLignes au plus.
export function ajuster(texte, { police, l, h, maxLignes = 2, interligne = 0.9, tMax, tMin, casse = 'upper', interlettre = 0 }) {
  // Typographie française : espace insécable avant ? ! : ; » et après « (la ponctuation ne passe jamais seule à la ligne)
  const t = (casse === 'upper' ? texte.toLocaleUpperCase('fr-FR') : texte).replace(/[ \t]+([?!:;»])/g, '\u00A0$1').replace(/«[ \t]+/g, '«\u00A0');
  const mots = t.trim().split(/[ \t\r\n]+/).filter(Boolean);
  if (!mots.length) return { lignes: [], taille: tMax, deborde: false, vide: true, cap: 0 };
  const couper = (taille) => {
    const lignes = []; let cur = '';
    for (const mot of mots) {
      const essai = cur ? cur + ' ' + mot : mot;
      if (!cur || largeur(essai, police, taille, interlettre) <= l) cur = essai; else { lignes.push(cur); cur = mot; }
    }
    lignes.push(cur); return lignes;
  };
  for (let taille = tMax; taille >= tMin; taille -= 2) {
    const lignes = couper(taille);
    const ok = lignes.length <= maxLignes && lignes.every((x) => largeur(x, police, taille, interlettre) <= l) && taille * (1 + (lignes.length - 1) * interligne) <= h;
    if (ok) return { lignes, taille, deborde: false, cap: (M[police].cap / M[police].upm) * taille };
  }
  const lignes = couper(tMin);
  return { lignes, taille: tMin, deborde: true, cap: (M[police].cap / M[police].upm) * tMin };
}
// Bloc de texte positionné par sa première ligne de base. ancre : start | middle | end
export function blocTexte(id, f, { x, y, police, couleur, ancre = 'start', interligne = 0.9, interlettre = 0, contour }) {
  const m = M[police];
  const attrs = `font-family="${m.family}" font-weight="${m.weight}"${m.style !== 'normal' ? ` font-style="${m.style}"` : ''} font-size="${f.taille}" fill="${couleur}" text-anchor="${ancre}"${interlettre ? ` letter-spacing="${interlettre}"` : ''}${contour ? ` stroke="${contour.couleur}" stroke-width="${contour.largeur}" paint-order="stroke" stroke-linejoin="round"` : ''}`;
  const tspans = f.lignes.map((l, i) => `<tspan x="${r1(x)}" dy="${i ? r1(f.taille * interligne) : 0}">${esc(l)}</tspan>`).join('');
  return `<text id="${id}" data-ps-champ="${id}" xml:space="preserve" x="${r1(x)}" y="${r1(y)}" ${attrs}>${tspans}</text>`;
}
// Boîte englobante d'un bloc (pour les contrôles de zone morte)
export function boite(f, { x, y, police, ancre = 'start', interligne = 0.9, interlettre = 0 }) {
  const w = Math.max(0, ...f.lignes.map((l) => largeur(l, police, f.taille, interlettre)));
  const x0 = ancre === 'start' ? x : ancre === 'end' ? x - w : x - w / 2;
  return { x: x0, y: y - f.cap, w, h: f.cap + (f.lignes.length - 1) * f.taille * interligne };
}

// ---------- Formes du langage Primestone ----------
export const lame = (x, y, w, h, fill, extra = '') => { const o = h * TAN; return `<polygon${extra} fill="${fill}" points="${r1(x)},${r1(y + h)} ${r1(x + w)},${r1(y + h)} ${r1(x + w + o)},${r1(y)} ${r1(x + o)},${r1(y)}"/>`; };
export function rubrique(label, fond, texte, x = G.m, y = G.m) {
  const fs = 27, ls = 3.8, px = 20, py = 15, t = label.toLocaleUpperCase('fr-FR');
  const w = Math.ceil(largeur(t, 'mono', fs, ls) + px * 2), h = fs + py * 2;
  return { svg: `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fond}"/><text id="rubrique" data-ps-champ="rubrique" x="${x + px}" y="${r1(y + py + fs * 0.76)}" font-family="${M.mono.family}" font-weight="700" font-size="${fs}" letter-spacing="${ls}" fill="${texte}">${esc(t)}</text>`, w, h };
}
export function sceau(fond, lettre, x = G.m, y = H - G.m - G.seal, s = G.seal) {
  const gh = s * 0.68, sc = gh / LOGO.P.h, gw = LOGO.P.w * sc;
  return `<g id="sceau" data-ps-statut="NON-OFFICIEL"><rect x="${x}" y="${y}" width="${s}" height="${s}" rx="${r1(s * T['motif.seal-radius-ratio'])}" fill="${fond}"/><path fill="${lettre}" fill-rule="evenodd" transform="translate(${r1(x + (s - gw) / 2)} ${r1(y + (s - gh) / 2)}) scale(${Math.round(sc * 10000) / 10000})" d="${LOGO.P.d}"/></g>`;
}
export const credit = (txt, couleur) => txt ? `<text id="credit" data-ps-champ="credit" transform="translate(${W - 20} ${H / 2 - 40}) rotate(-90)" text-anchor="middle" font-family="${M.mono.family}" font-weight="700" font-size="13" letter-spacing="1.6" fill="${couleur}" opacity="0.8">${esc(txt.toLocaleUpperCase('fr-FR'))}</text>` : '';

// ---------- Images : emplacement, ajustement, recadrage ----------
// mode 'couvrir' : remplit la zone, rognée ; mode 'contenir' : personnage détouré, posé sur le bas de la zone.
export function placer(img, zone) {
  const z = img.zoom ?? 1, ox = img.dx ?? 0, oy = img.dy ?? 0;
  const s0 = zone.mode === 'couvrir' ? Math.max(zone.w / img.w, zone.h / img.h) : Math.min(zone.w / img.w, zone.h / img.h);
  const s = s0 * z, w = img.w * s, h = img.h * s;
  const x = zone.x + (zone.w - w) / 2 + ox * zone.w;
  const y = zone.mode === 'couvrir' ? zone.y + (zone.h - h) / 2 + oy * zone.h : zone.y + zone.h - h + oy * zone.h;
  return { x, y, w, h, echelle: s };
}
export function image(id, img, zone, { filtre, clip = zone.mode === 'couvrir' } = {}) {
  if (!img?.href) return '';
  const p = placer(img, zone);
  const el = `<image id="${id}-image" x="${r1(p.x)}" y="${r1(p.y)}" width="${r1(p.w)}" height="${r1(p.h)}" preserveAspectRatio="none" href="${esc(img.href)}" xlink:href="${esc(img.href)}"/>`;
  const cp = clip ? `<clipPath id="${id}-clip"><rect x="${zone.x}" y="${zone.y}" width="${zone.w}" height="${zone.h}"/></clipPath>` : '';
  return `${cp}<g id="${id}" data-ps-champ="${id}"${clip ? ` clip-path="url(#${id}-clip)"` : ''}${filtre ? ` filter="url(#${filtre})"` : ''}>${el}</g>`;
}

export const DEFS = () => `<defs>
<filter id="encre" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="${G.ink}" result="d"/><feFlood flood-color="${C.k}"/><feComposite in2="d" operator="in" result="c"/><feMerge><feMergeNode in="c"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="encre-jaune" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="${G.ink}" result="d"/><feFlood flood-color="${C.y}"/><feComposite in2="d" operator="in" result="c"/><feMerge><feMergeNode in="c"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<filter id="bichromie" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope="1.6" intercept="-0.3"/><feFuncG type="linear" slope="1.6" intercept="-0.3"/><feFuncB type="linear" slope="1.6" intercept="-0.3"/></feComponentTransfer><feComponentTransfer><feFuncR type="table" tableValues="${hexN(C.k, 0)} ${hexN(C.y, 0)}"/><feFuncG type="table" tableValues="${hexN(C.k, 1)} ${hexN(C.y, 1)}"/><feFuncB type="table" tableValues="${hexN(C.k, 2)} ${hexN(C.y, 2)}"/></feComponentTransfer></filter>
<filter id="assombri" color-interpolation-filters="sRGB"><feColorMatrix type="saturate" values="0.7"/><feComponentTransfer><feFuncR type="linear" slope="0.62"/><feFuncG type="linear" slope="0.62"/><feFuncB type="linear" slope="0.62"/></feComponentTransfer></filter>
<linearGradient id="voile-gauche" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="${C.k0}" stop-opacity="0.82"/><stop offset="0.62" stop-color="${C.k0}" stop-opacity="0"/></linearGradient>
<linearGradient id="voile-bas" x1="0" x2="0" y1="0" y2="1"><stop offset="0.35" stop-color="${C.k0}" stop-opacity="0"/><stop offset="1" stop-color="${C.k0}" stop-opacity="0.85"/></linearGradient>
</defs>`;
export function hexN(hex, i) { return Math.round((parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255) * 1000) / 1000; }

export const calque = (id, label, contenu, cache = false) => `<g id="calque-${id}" inkscape:groupmode="layer" inkscape:label="${label}"${cache ? ' style="display:none"' : ''}>${contenu}</g>`;
export const guides = () => `<g fill="none" stroke="#00C2FF" stroke-width="2"><rect x="${G.m}" y="${G.m}" width="${W - 2 * G.m}" height="${H - 2 * G.m}" stroke-dasharray="10 8"/></g>${G.dead ? `<rect x="${G.dead.x}" y="${G.dead.y}" width="${G.dead.w}" height="${G.dead.h}" fill="${C.red}" fill-opacity="0.35" stroke="${C.red}" stroke-width="2"/>` : ''}`;
export const inter = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

// Aide pour les familles : déclare et ajuste un texte, puis le dessine
export function texte(ctx, d, id, label, opts, dessin, { titre = false, requis = false, mots = titre } = {}) {
  const f = ajuster(d[id] || '', opts);
  const pos = { police: opts.police, interligne: opts.interligne ?? 0.9, interlettre: opts.interlettre ?? 0, ...(typeof dessin === 'function' ? dessin(f) : dessin) };
  ctx.textes.push({ id, label, f, titre, requis, mots, boite: f.vide ? null : boite(f, pos) });
  return f.vide ? '' : blocTexte(id, f, pos);
}
export function zone(ctx, id, z) { ctx.zones[id] = z; return z; }
