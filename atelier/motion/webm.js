// Motion Studio · multiplexeur WebM minimal (Matroska/EBML) pour les images encodées par WebCodecs (VP9 ou VP8).
// Une grappe (Cluster) par image clé ; durée inscrite dans l'en-tête. Sans dépendance.
const enc = new TextEncoder();
function vint(n) { // taille EBML (1 à 8 octets)
  for (let l = 1; l <= 8; l++) if (n < 2 ** (7 * l) - 1) { const o = new Uint8Array(l); let v = n; for (let i = l - 1; i >= 0; i--) { o[i] = v & 255; v = Math.floor(v / 256); } o[0] |= 1 << (8 - l); return o; }
  throw new Error('taille EBML');
}
const uint = (n) => { const o = []; do { o.unshift(n & 255); n = Math.floor(n / 256); } while (n > 0); return new Uint8Array(o); };
const idb = (id) => { const o = []; while (id > 0) { o.unshift(id & 255); id = Math.floor(id / 256); } return new Uint8Array(o); };
const cat = (parts) => { const n = parts.reduce((s, p) => s + p.length, 0), o = new Uint8Array(n); let i = 0; for (const p of parts) { o.set(p, i); i += p.length; } return o; };
const el = (id, data) => { const d = data instanceof Uint8Array ? data : Array.isArray(data) ? cat(data) : typeof data === 'string' ? enc.encode(data) : uint(data); return cat([idb(id), vint(d.length), d]); };
const f64 = (x) => { const b = new Uint8Array(8); new DataView(b.buffer).setFloat64(0, x); return b; };

// images : [{ data: Uint8Array, temps: microsecondes, cle: bool }] ; audio facultatif : { morceaux: [{ data, temps }], frequence } (Opus stéréo)
export function muxerWebM({ codec, largeur, hauteur, duree, images, audio }) {
  const ebml = el(0x1a45dfa3, [el(0x4286, 1), el(0x42f7, 1), el(0x42f2, 4), el(0x42f3, 8), el(0x4282, 'webm'), el(0x4287, 2), el(0x4285, 2)]);
  const info = el(0x1549a966, [el(0x2ad7b1, 1000000), el(0x4d80, 'Primestone Motion Studio'), el(0x5741, 'Primestone Motion Studio'), el(0x4489, f64(duree * 1000))]);
  const opusHead = () => { const b = new Uint8Array(19), v = new DataView(b.buffer); b.set(enc.encode('OpusHead')); b[8] = 1; b[9] = 2; v.setUint16(10, 312, true); v.setUint32(12, audio.frequence, true); return b; };
  const pisteAudio = audio?.morceaux?.length ? [el(0xae, [el(0xd7, 2), el(0x73c5, 2), el(0x9c, 0), el(0x86, 'A_OPUS'), el(0x63a2, opusHead()), el(0x56aa, 6500000), el(0x56bb, 80000000), el(0x83, 2), el(0xe1, [el(0xb5, f64(audio.frequence)), el(0x9f, 2)])])] : [];
  const tracks = el(0x1654ae6b, [el(0xae, [el(0xd7, 1), el(0x73c5, 1), el(0x9c, 0), el(0x86, codec === 'vp8' ? 'V_VP8' : 'V_VP9'), el(0x83, 1), el(0xe0, [el(0xb0, largeur), el(0xba, hauteur)])]), ...pisteAudio]);
  // Blocs vidéo et audio entrelacés par ordre chronologique ; nouvelle grappe à chaque image clé (ou toutes les 30 s)
  const blocs = [...images.map((x) => ({ ...x, piste: 1 })), ...(pisteAudio.length ? audio.morceaux.map((x) => ({ ...x, piste: 2, cle: true })) : [])].sort((a, b) => a.temps - b.temps || a.piste - b.piste);
  const grappes = []; let cur = null;
  for (const im of blocs) {
    const ms = Math.round(im.temps / 1000);
    if (!cur || (im.piste === 1 && im.cle) || ms - cur.t > 30000) { cur = { t: ms, blocs: [] }; grappes.push(cur); }
    const rel = ms - cur.t, tete = new Uint8Array([0x80 | im.piste, (rel >> 8) & 255, rel & 255, im.cle ? 0x80 : 0]);
    cur.blocs.push(el(0xa3, cat([tete, im.data])));
  }
  const clusters = grappes.map((g) => el(0x1f43b675, [el(0xe7, g.t), ...g.blocs]));
  const segment = el(0x18538067, [info, tracks, ...clusters]);
  return new Blob([ebml, segment], { type: 'video/webm' });
}
