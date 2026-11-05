// Motion Studio · rendu canvas 2D d'une scène (aperçu, PNG, JPG, vidéo, GIF). Même liste d'affichage que le rendu SVG.
import M from '../../templates/_systeme/metrics.js';
import { largeur } from '../../templates/_systeme/motion-base.js';

const rgba = (hex, a = 1) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16},${(n >> 8) & 255},${n & 255},${a})`; };
const police = (x) => { const m = M[x.police]; return `${m.style === 'italic' ? 'italic ' : ''}${m.weight} ${x.taille}px "${m.family}"`; };

export function creerRendu() {
  const images = new Map(), silhouettes = new Map(), trames = new Map(); let bruit = null;
  async function precharger(scene) {
    const hrefs = new Set(); const parcourir = (n) => { if (n.k === 'img') hrefs.add(n.href); n.kids?.forEach(parcourir); }; scene.nodes.forEach(parcourir);
    await Promise.all([...hrefs].filter((h) => !images.has(h)).map(async (h) => { const im = new Image(); im.src = h; try { await im.decode(); images.set(h, im); } catch { images.set(h, null); } }));
  }
  function peint(g, f) {
    if (typeof f === 'string') return f;
    const gr = f.lin ? g.createLinearGradient(...f.lin) : g.createRadialGradient(f.rad[0], f.rad[1], 0, f.rad[0], f.rad[1], f.rad[2]);
    for (const [o, c, a = 1] of f.st) gr.addColorStop(o, rgba(c, a)); return gr;
  }
  const chemin = (pts) => { const p = new Path2D(); p.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) p.lineTo(pts[i], pts[i + 1]); p.closePath(); return p; };
  function remplir(g, x, p, regle) {
    if (x.fill && x.fill !== 'none') { g.fillStyle = peint(g, x.fill); g.fill(p, regle); }
    if (x.stroke) { g.strokeStyle = peint(g, x.stroke); g.lineWidth = x.lw || 1; g.lineJoin = 'round'; g.stroke(p); }
  }
  function silhouette(im, c) {
    const cle = im.src.slice(-64) + im.src.length + c; if (silhouettes.has(cle)) return silhouettes.get(cle);
    const k = Math.min(1, 1200 / Math.max(im.naturalWidth, im.naturalHeight)), cv = Object.assign(document.createElement('canvas'), { width: Math.round(im.naturalWidth * k), height: Math.round(im.naturalHeight * k) }), g = cv.getContext('2d');
    g.drawImage(im, 0, 0, cv.width, cv.height); g.globalCompositeOperation = 'source-in'; g.fillStyle = c; g.fillRect(0, 0, cv.width, cv.height);
    silhouettes.set(cle, cv); return cv;
  }
  function points(g, x, e) {
    const tracer = (gg) => { gg.fillStyle = x.fill; gg.beginPath(); for (let i = 0; i < x.pts.length; i += 3) { gg.moveTo(x.pts[i] + x.pts[i + 2], x.pts[i + 1]); gg.arc(x.pts[i], x.pts[i + 1], x.pts[i + 2], 0, 6.2832); } gg.fill(); };
    if (!x.cle) return tracer(g);
    const cle = `${x.cle}@${e.toFixed(3)}`; let c = trames.get(cle);
    if (!c) {
      let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
      for (let i = 0; i < x.pts.length; i += 3) { x0 = Math.min(x0, x.pts[i] - x.pts[i + 2]); y0 = Math.min(y0, x.pts[i + 1] - x.pts[i + 2]); x1 = Math.max(x1, x.pts[i] + x.pts[i + 2]); y1 = Math.max(y1, x.pts[i + 1] + x.pts[i + 2]); }
      if (!isFinite(x0)) return;
      const cv = Object.assign(document.createElement('canvas'), { width: Math.max(1, Math.ceil((x1 - x0) * e)), height: Math.max(1, Math.ceil((y1 - y0) * e)) }), gg = cv.getContext('2d');
      gg.setTransform(e, 0, 0, e, -x0 * e, -y0 * e); tracer(gg); c = { cv, x0, y0, w: x1 - x0, h: y1 - y0 };
      if (trames.size > 24) trames.clear(); trames.set(cle, c);
    }
    g.drawImage(c.cv, c.x0, c.y0, c.w, c.h);
  }
  function texte(g, x, e) {
    g.font = police(x); g.textBaseline = 'alphabetic';
    const passe = (fn) => x.lignes.forEach((l, i) => {
      const y = x.y + i * x.pas;
      if (!x.ls) { g.textAlign = x.align === 'middle' ? 'center' : x.align === 'end' ? 'right' : 'left'; fn(l, x.x, y); return; }
      const tot = largeur(l, x.police, x.taille, x.ls); let cx = x.align === 'middle' ? x.x - tot / 2 : x.align === 'end' ? x.x - tot : x.x; g.textAlign = 'left';
      for (const ch of l) { fn(ch, cx, y); cx += largeur(ch, x.police, x.taille) + x.ls; }
    });
    if (x.op !== undefined) g.globalAlpha *= x.op;
    if (x.stroke) { g.strokeStyle = x.stroke; g.lineWidth = x.lw * 2; g.lineJoin = 'round'; passe((t, a, b) => g.strokeText(t, a, b)); }
    if (x.glow) { g.shadowColor = x.glow.c; g.shadowBlur = x.glow.b * e; }
    g.fillStyle = peint(g, x.fill || '#000'); passe((t, a, b) => g.fillText(t, a, b));
  }
  function noeud(g, x, e) {
    g.save();
    try {
      if (x.op !== undefined && x.k !== 'text') g.globalAlpha *= x.op;
      switch (x.k) {
        case 'g': {
          if (x.clip) g.clip(chemin(x.clip));
          if (x.blend) g.globalCompositeOperation = x.blend;
          const t = x.tr; if (t) { g.translate(t.x, t.y); if (t.s !== 1 || t.r) { g.translate(t.ox, t.oy); if (t.r) g.rotate((t.r * Math.PI) / 180); g.scale(t.s, t.s); g.translate(-t.ox, -t.oy); } }
          for (const k of x.kids) noeud(g, k, e * (t?.s ?? 1)); break;
        }
        case 'rect': { const p = new Path2D(); x.rx && p.roundRect ? p.roundRect(x.x, x.y, x.w, x.h, x.rx) : p.rect(x.x, x.y, x.w, x.h); remplir(g, x, p); break; }
        case 'poly': if (x.blend) g.globalCompositeOperation = x.blend; remplir(g, x, chemin(x.pts)); break;
        case 'circ': { const p = new Path2D(); p.arc(x.x, x.y, Math.max(0, x.r), 0, 6.2832); remplir(g, x, p); break; }
        case 'path': if (x.tr) { g.translate(x.tr.x, x.tr.y); g.scale(x.tr.s, x.tr.s); } remplir(g, x, new Path2D(x.d), 'evenodd'); break;
        case 'text': texte(g, x, e); break;
        case 'img': {
          const im = images.get(x.href); if (!im) break;
          if (x.contour) { const s = silhouette(im, x.contour.c), n = 16; for (let i = 0; i < n; i++) { const a = (i / n) * 6.2832; g.drawImage(s, x.x + Math.cos(a) * x.contour.w, x.y + Math.sin(a) * x.contour.w, x.w, x.h); } }
          g.drawImage(im, x.x, x.y, x.w, x.h); break;
        }
        case 'dots': if (x.blend) g.globalCompositeOperation = x.blend; points(g, x, e); break;
        case 'grain': {
          if (!bruit) { const c = Object.assign(document.createElement('canvas'), { width: 256, height: 256 }), gg = c.getContext('2d'), d = gg.createImageData(256, 256); let s = 9;
            for (let i = 0; i < d.data.length; i += 4) { s = (s * 1103515245 + 12345) >>> 0; const v = (s >>> 16) & 255; d.data[i] = d.data[i + 1] = d.data[i + 2] = v; d.data[i + 3] = 255; } gg.putImageData(d, 0, 0); bruit = c; }
          g.globalCompositeOperation = 'overlay'; g.fillStyle = g.createPattern(bruit, 'repeat'); g.fillRect(x.x, x.y, x.w, x.h); break;
        }
      }
    } finally { g.restore(); }
  }
  // Dessine la scène dans un contexte ; echelle = pixels du canvas par pixel de la scène
  function dessiner(g, scene, echelle = 1) {
    g.setTransform(echelle, 0, 0, echelle, 0, 0); g.globalAlpha = 1; g.globalCompositeOperation = 'source-over';
    g.clearRect(0, 0, scene.w, scene.h); for (const n of scene.nodes) noeud(g, n, echelle);
  }
  return { precharger, dessiner, images };
}
