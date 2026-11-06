// Primestone · Motion Studio · rendu SVG d'une scène (image fixe). Module ES sans dépendance, Node et navigateur.
// versSVG(scene, { polices }) -> chaîne SVG ; chaque calque est un groupe nommé (Inkscape, Figma, Illustrator).
import M from './metrics.js';
import { r1 } from './motion-base.js';
import { filtreHeros } from './ambiances.js';
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export function versSVG(scene, { polices = '', titre = 'Création Motion Studio' } = {}) {
  let n = 0; const defs = [], uid = (p) => `${p}${++n}`;
  const peint = (f, attr = 'fill') => {
    if (!f || f === 'none') return ` ${attr}="none"`;
    if (typeof f === 'string') return ` ${attr}="${f}"`;
    const id = uid('g'), st = f.st.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}"${a !== undefined && a !== 1 ? ` stop-opacity="${a}"` : ''}/>`).join('');
    defs.push(f.lin ? `<linearGradient id="${id}" gradientUnits="userSpaceOnUse" x1="${f.lin[0]}" y1="${f.lin[1]}" x2="${f.lin[2]}" y2="${f.lin[3]}">${st}</linearGradient>`
      : `<radialGradient id="${id}" gradientUnits="userSpaceOnUse" cx="${f.rad[0]}" cy="${f.rad[1]}" r="${f.rad[2]}">${st}</radialGradient>`);
    return ` ${attr}="url(#${id})"`;
  };
  const op = (o) => (o !== undefined && o !== null && o < 1 ? ` opacity="${r1(o * 100) / 100}"` : '');
  const trait = (x) => (x.stroke ? `${peint(x.stroke, 'stroke')} stroke-width="${x.lw || 1}" stroke-linejoin="round"` : '');
  const pts = (p) => { let s = ''; for (let i = 0; i < p.length; i += 2) s += `${p[i]},${p[i + 1]} `; return s.trim(); };
  function noeud(x) {
    switch (x.k) {
      case 'g': {
        const t = x.tr, sx = t?.sx ?? 1, tr = t && (t.x || t.y || t.s !== 1 || t.r || sx !== 1 || t.kx) ? ` transform="translate(${r1(t.x)} ${r1(t.y)})${t.s !== 1 || t.r || sx !== 1 || t.kx ? ` translate(${t.ox} ${t.oy})${t.r ? ` rotate(${t.r})` : ''}${t.kx ? ` skewX(${r1((Math.atan(t.kx) * 180) / Math.PI)})` : ''}${t.s !== 1 || sx !== 1 ? ` scale(${Math.round(t.s * sx * 10000) / 10000}${sx !== 1 ? ` ${t.s}` : ''})` : ''} translate(${-t.ox} ${-t.oy})` : ''}"` : '';
        let fl = ''; if (x.flou) { const id = uid('f'); defs.push(`<filter id="${id}" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="${r1(x.flou / 2)}"/></filter>`); fl = ` filter="url(#${id})"`; }
        let clip = ''; if (x.clip) { const id = uid('c'); defs.push(`<clipPath id="${id}">${typeof x.clip === 'string' ? `<path d="${x.clip}"/>` : `<polygon points="${pts(x.clip)}"/>`}</clipPath>`); clip = ` clip-path="url(#${id})"`; }
        const lab = x.nom ? ` id="calque-${esc(x.id)}" inkscape:groupmode="layer" inkscape:label="${esc(x.nom)}"` : x.id ? ` id="${esc(x.id)}"` : '';
        const inner = x.kids.map(noeud).join('');
        // Transformation et découpe sur deux groupes : la découpe reste dans le repère de la page
        return clip ? `<g${lab}${op(x.op)}${clip}${bl(x)}><g${tr}${fl}>${inner}</g></g>` : `<g${lab}${tr}${op(x.op)}${bl(x)}${fl}>${inner}</g>`;
      }
      case 'rect': return `<rect x="${x.x}" y="${x.y}" width="${x.w}" height="${x.h}"${x.rx ? ` rx="${x.rx}"` : ''}${peint(x.fill)}${trait(x)}${op(x.op)}/>`;
      case 'poly': return `<polygon points="${pts(x.pts)}"${peint(x.fill)}${trait(x)}${op(x.op)}${bl(x)}/>`;
      case 'circ': return `<circle cx="${x.x}" cy="${x.y}" r="${x.r}"${peint(x.fill)}${trait(x)}${op(x.op)}/>`;
      case 'path': return `<path d="${x.d}"${peint(x.fill)}${trait(x)}${op(x.op)}${x.tr ? ` transform="translate(${x.tr.x} ${x.tr.y}) scale(${x.tr.s})"` : ''}${x.statut ? ` data-ps-statut="${x.statut}"` : ''}${x.regle ? ` fill-rule="${x.regle}"` : ''}/>`;
      case 'text': {
        const m = x.fam ? { family: x.fam, weight: x.poids || 400, style: x.style || 'normal' } : M[x.police] || { family: 'sans-serif', weight: 400, style: 'normal' }, anc = x.align === 'middle' ? 'middle' : x.align === 'end' ? 'end' : 'start';
        let filtre = ''; if (x.glow) { const id = uid('l'); defs.push(`<filter id="${id}" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur in="SourceAlpha" stdDeviation="${r1(x.glow.b / 2)}" result="b"/><feFlood flood-color="${x.glow.c}"/><feComposite in2="b" operator="in" result="g"/><feMerge><feMergeNode in="g"/><feMergeNode in="g"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`); filtre = ` filter="url(#${id})"`; }
        const sp = x.lignes.map((l, i) => `<tspan x="${x.x}" y="${r1(x.y + i * x.pas)}">${esc(l)}</tspan>`).join('');
        return `<text font-family="${m.family}" font-weight="${m.weight}"${m.style !== 'normal' ? ` font-style="${m.style}"` : ''} font-size="${x.taille}"${x.ls ? ` letter-spacing="${x.ls}"` : ''} text-anchor="${anc}"${peint(x.fill)}${x.stroke ? `${trait({ ...x, lw: (x.lw || 1) * 2 })} paint-order="stroke"` : ''}${op(x.op)}${filtre}>${sp}</text>`;
      }
      case 'img': {
        let f = '';
        if (x.contour) { const id = uid('e'); defs.push(`<filter id="${id}" x="-5%" y="-5%" width="110%" height="110%" color-interpolation-filters="sRGB"><feMorphology in="SourceAlpha" operator="dilate" radius="${x.contour.w}" result="d"/><feFlood flood-color="${x.contour.c}"/><feComposite in2="d" operator="in" result="c"/><feMerge><feMergeNode in="c"/><feMergeNode in="SourceGraphic"/></feMerge></filter>`); f = ` filter="url(#${id})"`; }
        if (x.eclairage) { const ec = x.eclairage, id = uid('h'); defs.push(filtreHeros(id, { encre: x.contour?.c || '#111111', epaisseur: x.contour?.w || 0.01, contour: ec.contre, aura: ec.aura, auraOp: ec.af, ombre: ec.ombre, lumiere: [ec.lx, ec.ly] })); f = ` filter="url(#${id})"`; }
        return `<image x="${x.x}" y="${x.y}" width="${x.w}" height="${x.h}" preserveAspectRatio="none" href="${esc(x.href)}"${f}/>`;
      }
      case 'dots': { let s = ''; for (let i = 0; i < x.pts.length; i += 3) s += `<circle cx="${x.pts[i]}" cy="${x.pts[i + 1]}" r="${x.pts[i + 2]}"/>`; return `<g fill="${x.fill}"${op(x.op)}${bl(x)}>${s}</g>`; }
      case 'grain': { const id = uid('n'); defs.push(`<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed="4"/><feColorMatrix type="saturate" values="0"/></filter>`); return `<rect x="${x.x}" y="${x.y}" width="${x.w}" height="${x.h}" filter="url(#${id})"${op(x.op)} style="mix-blend-mode:overlay"/>`; }
      default: return '';
    }
  }
  const bl = (x) => (x.blend ? ` style="mix-blend-mode:${x.blend}"` : '');
  const corps = scene.nodes.map(noeud).join('\n');
  return `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" viewBox="0 0 ${scene.w} ${scene.h}" width="${scene.w}" height="${scene.h}" data-ps-motion="1">
<title>${esc(titre)}</title>
<desc>Primestone · Motion Studio · image fixe à ${r1(scene.t)} s. Sceau P : vectorisation NON OFFICIELLE.</desc>
<defs>${polices ? `<style>${polices}</style>` : ''}${defs.join('')}</defs>
${corps}
</svg>
`;
}
