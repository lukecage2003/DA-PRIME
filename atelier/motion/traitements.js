// Motion Studio · traitements non destructifs des illustrations (calculés à partir de l'original, jamais enregistrés à sa place) :
// retrait d'un fond uni, noir et blanc, bichromie, contraste, luminosité, trame d'impression en points.
const cache = new Map(), enCours = new Map();
const hex = (h) => { const n = parseInt(String(h).slice(1, 7), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
export const actif = (t) => t && (t.detourage?.actif || t.nb || t.bichromie?.actif || t.contraste || t.luminosite || t.trame?.actif);
export const cle = (id, t, col) => id + JSON.stringify(t) + (t.bichromie?.actif ? col(t.bichromie.c1) + col(t.bichromie.c2) : '');

export function lire(id, t, col) { return cache.get(cle(id, t, col)) || null; }
// Calcule (une seule fois) l'image traitée ; fin() est appelé quand elle est prête
export function preparer(res, id, t, col, fin) {
  const k = cle(id, t, col); if (cache.has(k)) return Promise.resolve(cache.get(k)); if (enCours.has(k)) return enCours.get(k);
  const p = (async () => {
    const im = new Image(); im.src = res.href; await im.decode();
    const w = im.naturalWidth, h = im.naturalHeight, cv = Object.assign(document.createElement('canvas'), { width: w, height: h }), g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(im, 0, 0); const d = g.getImageData(0, 0, w, h), px = d.data;
    const fondC = hex(t.detourage?.couleur || '#FFFFFF'), tol = (t.detourage?.tolerance ?? 40) * 4.4, c1 = hex(col(t.bichromie?.c1 || '#000000')), c2 = hex(col(t.bichromie?.c2 || '#FFFFFF'));
    const kc = 1 + (t.contraste || 0), L = (t.luminosite || 0) * 128;
    for (let i = 0; i < px.length; i += 4) {
      let r = px[i], gg = px[i + 1], b = px[i + 2];
      if (t.detourage?.actif) { const dist = Math.hypot(r - fondC[0], gg - fondC[1], b - fondC[2]); if (dist < tol) px[i + 3] = 0; else if (dist < tol * 1.35) px[i + 3] = Math.round(px[i + 3] * ((dist - tol) / (tol * 0.35))); }
      if (kc !== 1 || L) { r = (r - 128) * kc + 128 + L; gg = (gg - 128) * kc + 128 + L; b = (b - 128) * kc + 128 + L; }
      if (t.nb || t.bichromie?.actif) { const y = 0.2126 * r + 0.7152 * gg + 0.0722 * b; if (t.bichromie?.actif) { const q = Math.min(1, Math.max(0, y / 255)); r = c1[0] + (c2[0] - c1[0]) * q; gg = c1[1] + (c2[1] - c1[1]) * q; b = c1[2] + (c2[2] - c1[2]) * q; } else r = gg = b = y; }
      px[i] = r; px[i + 1] = gg; px[i + 2] = b;
    }
    g.putImageData(d, 0, 0);
    let sortie = cv;
    if (t.trame?.actif) { // Trame en points : chaque cellule devient un point de sa couleur moyenne, rayon selon sa densité
      const c = Math.max(3, Math.round(((t.trame.cellule || 10) * Math.max(w, h)) / 1200)), o = Object.assign(document.createElement('canvas'), { width: w, height: h }), og = o.getContext('2d');
      for (let y = 0; y < h; y += c) for (let x = 0; x < w; x += c) { let R = 0, G = 0, B = 0, A = 0, n = 0;
        for (let yy = y; yy < Math.min(h, y + c); yy += 2) for (let xx = x; xx < Math.min(w, x + c); xx += 2) { const j = (yy * w + xx) * 4; R += px[j]; G += px[j + 1]; B += px[j + 2]; A += px[j + 3]; n++; }
        if (!n || A / n < 10) continue; R /= n; G /= n; B /= n; const lum = (0.2126 * R + 0.7152 * G + 0.0722 * B) / 255, rad = (c / 2) * Math.sqrt(1 - lum * 0.85) * 1.15;
        og.fillStyle = `rgba(${R | 0},${G | 0},${B | 0},${A / n / 255})`; og.beginPath(); og.arc(x + c / 2, y + c / 2, rad, 0, 6.2832); og.fill(); }
      sortie = o;
    }
    const r = { href: sortie.toDataURL('image/png'), w, h };
    cache.set(k, r); enCours.delete(k); fin?.(); return r;
  })().catch((e) => { enCours.delete(k); throw e; });
  enCours.set(k, p); return p;
}
