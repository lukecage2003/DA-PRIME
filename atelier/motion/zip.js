// Motion Studio · archive ZIP sans compression (méthode « stockée »), pour les exports par lot. Aucune dépendance.
const TABLE = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export function crc32(o) { let c = 0xffffffff; for (let i = 0; i < o.length; i++) c = TABLE[(c ^ o[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
// fichiers : [{ nom, data: Uint8Array | string }] → Uint8Array (archive complète)
export function zip(fichiers, date = new Date()) {
  const enc = new TextEncoder(), loc = [], cen = []; let pos = 0;
  const dt = ((date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)) & 0xffff, dd = (((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xffff;
  const vus = new Set();
  for (const f of fichiers) {
    let nom = String(f.nom).replace(/[\\:*?"<>|]/g, '_'); for (let i = 2; vus.has(nom); i++) nom = nom.replace(/(\.[^.]*)?$/, (x) => `-${i}${x}`); vus.add(nom);
    const n = enc.encode(nom), d = typeof f.data === 'string' ? enc.encode(f.data) : f.data, c = crc32(d);
    const h = new DataView(new ArrayBuffer(30)); h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(10, dt, true); h.setUint16(12, dd, true);
    h.setUint32(14, c, true); h.setUint32(18, d.length, true); h.setUint32(22, d.length, true); h.setUint16(26, n.length, true);
    const e = new DataView(new ArrayBuffer(46)); e.setUint32(0, 0x02014b50, true); e.setUint16(4, 20, true); e.setUint16(6, 20, true); e.setUint16(8, 0x0800, true); e.setUint16(12, dt, true); e.setUint16(14, dd, true);
    e.setUint32(16, c, true); e.setUint32(20, d.length, true); e.setUint32(24, d.length, true); e.setUint16(28, n.length, true); e.setUint32(42, pos, true);
    loc.push(new Uint8Array(h.buffer), n, d); cen.push(new Uint8Array(e.buffer), n); pos += 30 + n.length + d.length;
  }
  const tc = cen.reduce((s, x) => s + x.length, 0), fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, fichiers.length, true); fin.setUint16(10, fichiers.length, true); fin.setUint32(12, tc, true); fin.setUint32(16, pos, true);
  const parts = [...loc, ...cen, new Uint8Array(fin.buffer)], out = new Uint8Array(parts.reduce((s, x) => s + x.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out;
}
