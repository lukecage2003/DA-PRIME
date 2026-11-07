// PNG minimal sans dépendance (Node) : lecture 8 bits (gris, RGB, RGBA, palette sans transparence complexe), non entrelacé ;
// découpe, réduction (moyenne par boîte) et écriture RGB. Suffisant pour les pages rendues par DA-PRIME / pdf.js.
import { inflateSync, deflateSync } from 'node:zlib';

const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (b) => { let c = 0xffffffff; for (const x of b) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };

export function lirePng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('pas un PNG');
  let o = 8, w, h, prof, type, entrelace, palette = null; const idat = [];
  while (o < buf.length) { const n = buf.readUInt32BE(o), t = buf.toString('latin1', o + 4, o + 8), d = buf.subarray(o + 8, o + 8 + n); o += 12 + n;
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); prof = d[8]; type = d[9]; entrelace = d[12]; }
    else if (t === 'PLTE') palette = d; else if (t === 'IDAT') idat.push(d); else if (t === 'IEND') break; }
  if (prof !== 8 || entrelace) throw new Error(`PNG non pris en charge (profondeur ${prof}, entrelacement ${entrelace}) : réenregistrer en RGB 8 bits`);
  const canaux = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[type], bpp = canaux, ligne = w * bpp, brut = inflateSync(Buffer.concat(idat)), px = Buffer.alloc(w * h * bpp);
  for (let y = 0; y < h; y++) { const f = brut[y * (ligne + 1)], src = brut.subarray(y * (ligne + 1) + 1, (y + 1) * (ligne + 1)), dst = px.subarray(y * ligne, (y + 1) * ligne), prec = y ? px.subarray((y - 1) * ligne, y * ligne) : null;
    for (let i = 0; i < ligne; i++) { const a = i >= bpp ? dst[i - bpp] : 0, b = prec ? prec[i] : 0, c = prec && i >= bpp ? prec[i - bpp] : 0;
      let v = src[i]; if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      dst[i] = v & 0xff; } }
  const rgb = Buffer.alloc(w * h * 3);
  for (let i = 0; i < w * h; i++) { if (type === 2 || type === 6) { rgb[i * 3] = px[i * bpp]; rgb[i * 3 + 1] = px[i * bpp + 1]; rgb[i * 3 + 2] = px[i * bpp + 2]; }
    else if (type === 3) { const k = px[i] * 3; rgb[i * 3] = palette[k]; rgb[i * 3 + 1] = palette[k + 1]; rgb[i * 3 + 2] = palette[k + 2]; }
    else { rgb[i * 3] = rgb[i * 3 + 1] = rgb[i * 3 + 2] = px[i * bpp]; } }
  return { w, h, rgb };
}
export function ecrirePng({ w, h, rgb }) {
  const ligne = w * 3, brut = Buffer.alloc(h * (ligne + 1)); for (let y = 0; y < h; y++) { brut[y * (ligne + 1)] = 0; rgb.copy(brut, y * (ligne + 1) + 1, y * ligne, (y + 1) * ligne); }
  const bloc = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t, 'latin1'), d]), c = Buffer.alloc(4); c.writeUInt32BE(crc32(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), bloc('IHDR', ihdr), bloc('IDAT', deflateSync(brut, { level: 6 })), bloc('IEND', Buffer.alloc(0))]);
}
// Découpe d'une zone en fractions (marge optionnelle) ; coordonnées réelles retournées pour reconversion
export function decouper(img, z, marge = 0.01) {
  const x0 = Math.max(0, Math.floor((z.x - marge) * img.w)), y0 = Math.max(0, Math.floor((z.y - marge) * img.h)), x1 = Math.min(img.w, Math.ceil((z.x + z.w + marge) * img.w)), y1 = Math.min(img.h, Math.ceil((z.y + z.h + marge) * img.h));
  const w = x1 - x0, h = y1 - y0, rgb = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) img.rgb.copy(rgb, y * w * 3, ((y0 + y) * img.w + x0) * 3, ((y0 + y) * img.w + x1) * 3);
  return { img: { w, h, rgb }, zonePage: { x: x0 / img.w, y: y0 / img.h, w: w / img.w, h: h / img.h } };
}
export function reduire(img, cote) {
  const e = Math.min(1, cote / Math.max(img.w, img.h)); if (e === 1) return img;
  const w = Math.max(1, Math.round(img.w * e)), h = Math.max(1, Math.round(img.h * e)), rgb = Buffer.alloc(w * h * 3);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const sx0 = Math.floor(x / e), sy0 = Math.floor(y / e), sx1 = Math.min(img.w, Math.floor((x + 1) / e)), sy1 = Math.min(img.h, Math.floor((y + 1) / e)); let r = 0, g = 0, b = 0, n = 0;
    for (let yy = sy0; yy < Math.max(sy1, sy0 + 1); yy++) for (let xx = sx0; xx < Math.max(sx1, sx0 + 1); xx++) { const i = (yy * img.w + xx) * 3; r += img.rgb[i]; g += img.rgb[i + 1]; b += img.rgb[i + 2]; n++; }
    const j = (y * w + x) * 3; rgb[j] = r / n; rgb[j + 1] = g / n; rgb[j + 2] = b / n; }
  return { w, h, rgb };
}
