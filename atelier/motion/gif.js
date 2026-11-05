// Motion Studio · encodeur GIF animé (GIF89a, palette globale 256 couleurs par coupe médiane, tramage ordonné léger, LZW).
// Sans dépendance. palette(échantillons RGBA) puis creerGIF(w, h, palette, délai en centièmes) -> { ajouter(rgba), fin() }.
export function palette(echantillons, max = 256) {
  const px = [];
  for (const d of echantillons) { const pas = Math.max(1, Math.floor(d.length / 4 / 40000)) * 4; for (let i = 0; i < d.length; i += pas) px.push([d[i], d[i + 1], d[i + 2]]); }
  let boites = [px];
  while (boites.length < max) {
    let bi = -1, bc = 0, bs = 0;
    boites.forEach((b, i) => { if (b.length < 2) return; for (let c = 0; c < 3; c++) { let lo = 255, hi = 0; for (const p of b) { if (p[c] < lo) lo = p[c]; if (p[c] > hi) hi = p[c]; } const s = (hi - lo) * Math.log2(b.length + 1); if (s > bs) { bs = s; bi = i; bc = c; } } });
    if (bi < 0) break;
    const b = boites[bi].sort((a, z) => a[bc] - z[bc]), mid = b.length >> 1;
    boites.splice(bi, 1, b.slice(0, mid), b.slice(mid));
  }
  const pal = new Uint8Array(max * 3);
  boites.forEach((b, i) => { const s = [0, 0, 0]; for (const p of b) { s[0] += p[0]; s[1] += p[1]; s[2] += p[2]; } for (let c = 0; c < 3; c++) pal[i * 3 + c] = Math.round(s[c] / Math.max(1, b.length)); });
  return pal;
}
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function creerGIF(w, h, pal, delai = 7) {
  const out = []; const o = (...b) => out.push(...b), mot = (v) => o(v & 255, (v >> 8) & 255);
  o(...[...'GIF89a'].map((c) => c.charCodeAt(0))); mot(w); mot(h); o(0xf7, 0, 0); for (const v of pal) o(v);
  o(0x21, 0xff, 11, ...[...'NETSCAPE2.0'].map((c) => c.charCodeAt(0)), 3, 1, 0, 0, 0);
  const lut = new Int16Array(32768).fill(-1);
  const proche = (r, g, b) => { const k = ((r >> 3) << 10) | ((g >> 3) << 5) | (b >> 3); let v = lut[k]; if (v >= 0) return v;
    let best = 0, bd = Infinity; const R = (r & 0xf8) + 4, G = (g & 0xf8) + 4, B = (b & 0xf8) + 4;
    for (let i = 0; i < 256; i++) { const dr = pal[i * 3] - R, dg = pal[i * 3 + 1] - G, db = pal[i * 3 + 2] - B, d = dr * dr * 2 + dg * dg * 4 + db * db * 3; if (d < bd) { bd = d; best = i; } }
    lut[k] = best; return best; };
  return {
    ajouter(rgba) {
      const idx = new Uint8Array(w * h), cl = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
      for (let y = 0, i = 0; y < h; y++) for (let x = 0; x < w; x++, i++) { const t = (BAYER[(y & 3) * 4 + (x & 3)] - 7.5) * 1.6, j = i * 4; idx[i] = proche(cl(rgba[j] + t), cl(rgba[j + 1] + t), cl(rgba[j + 2] + t)); }
      o(0x21, 0xf9, 4, 0, delai & 255, (delai >> 8) & 255, 0, 0, 0x2c); mot(0); mot(0); mot(w); mot(h); o(0, 8);
      const data = lzw(idx); for (let i = 0; i < data.length; i += 255) { const n = Math.min(255, data.length - i); out.push(n); for (let j = 0; j < n; j++) out.push(data[i + j]); } o(0);
    },
    fin() { o(0x3b); return new Uint8Array(out); },
  };
}
// Compression LZW des index (taille de code minimale 8)
function lzw(idx) {
  const res = []; let acc = 0, nb = 0;
  const ecrire = (code, taille) => { acc |= code << nb; nb += taille; while (nb >= 8) { res.push(acc & 255); acc >>>= 8; nb -= 8; } };
  const CLR = 256, EOI = 257; let taille = 9, suivant = 258, table = new Map();
  ecrire(CLR, taille); let pre = idx[0];
  for (let i = 1; i < idx.length; i++) {
    const k = idx[i], cle = (pre << 8) | k, v = table.get(cle);
    if (v !== undefined) { pre = v; continue; }
    ecrire(pre, taille);
    if (suivant === 4096) { ecrire(CLR, taille); suivant = 258; taille = 9; table = new Map(); }
    else { if (suivant >= 1 << taille) taille++; table.set(cle, suivant++); }
    pre = k;
  }
  ecrire(pre, taille); ecrire(EOI, taille); if (nb > 0) res.push(acc & 255);
  return res;
}
