// DA-PRIME · son des compositions animées : effets sonores synthétisés sur l'appareil (aucun fichier, aucun droit tiers),
// placement automatique synchronisé sur l'animation, mixage et encodage pour l'export.
// Partie pure (catalogue, placement automatique) utilisable dans Node ; synthèse et mixage dans le navigateur (Web Audio).
import { plansDe, debutPlan } from './studio.js';

export const SONS = {
  whoosh: { nom: 'Passage rapide (whoosh)', cat: 'Mouvement', duree: 0.8 },
  souffle: { nom: 'Souffle grave', cat: 'Mouvement', duree: 1.1 },
  impact: { nom: 'Impact', cat: 'Impact', duree: 1.3 },
  boom: { nom: 'Boom cinéma', cat: 'Impact', duree: 2.6 },
  riser: { nom: 'Montée de tension', cat: 'Tension', duree: 1.6 },
  scintillement: { nom: 'Scintillement', cat: 'Lumière', duree: 1.4 },
  tic: { nom: 'Tic', cat: 'Interface', duree: 0.08 },
  nappe: { nom: 'Nappe d\'ambiance', cat: 'Ambiance', duree: 0 },
};
export const AUDIO0 = { volume: 0.9, muet: false, pistes: [] };
export function normaliserAudio(a) {
  if (!a) return { ...AUDIO0, pistes: [] };
  return { volume: Math.min(1, Math.max(0, +a.volume || 0)), muet: !!a.muet, pistes: (a.pistes || []).filter((p) => p && (SONS[p.sfx] || p.ressource)).map((p, i) => ({ id: p.id || `s${i}`, source: p.ressource ? 'fichier' : 'sfx', sfx: p.sfx || null, ressource: p.ressource || null, nom: p.nom || SONS[p.sfx]?.nom || 'Son', t: Math.max(0, +p.t || 0), volume: Math.min(1.5, Math.max(0, p.volume ?? 0.8)), fondu: Math.max(0, +p.fondu || 0), auto: !!p.auto })) };
}

// Placement automatique : un son par geste fort de l'animation, sans surcharge (impacts sur les arrivées, souffles sur les
// glissements et révélations, scintillement sur les textes lettre à lettre, transitions entre plans, nappe de fond facultative)
export function sonsAuto(doc, { nappe = !['comics', 'experimental'].includes(doc.systeme) } = {}) {
  const ev = [], ps = plansDe(doc);
  ps.forEach((p, k) => {
    const t0 = debutPlan(doc, k), tr = p.transition?.type;
    if (k > 0 && tr && tr !== 'coupe') ev.push({ t: Math.max(0, t0 - 0.15), sfx: tr === 'flash' ? 'impact' : tr === 'fondu' || tr === 'iris' ? 'souffle' : 'whoosh', v: 0.7 });
    for (const e of p.elements) {
      const en = e.anim?.entree; if (!en || en.type === 'aucune' || e.visible === false || (e.op ?? 1) < 0.3) continue;
      const t = t0 + (en.delai || 0), d = en.duree || 0.6;
      if (['tampon', 'rebond'].includes(en.type) || (en.type === 'zoom' && en.courbe === 'rebond')) ev.push({ t: t + d * 0.55, sfx: 'impact', v: 0.9, ancre: true });
      else if (en.type === 'zoom-arriere' && e.type === 'image') ev.push({ t: Math.max(0, t - 0.1), sfx: 'souffle', v: 0.75 });
      else if (['glisse', 'revelation', 'volet'].includes(en.type) && e.type !== 'effet') ev.push({ t: Math.max(0, t - 0.08), sfx: 'whoosh', v: e.type === 'texte' ? 0.45 : 0.65 });
      else if (['lettres', 'machine'].includes(en.type)) ev.push({ t, sfx: 'scintillement', v: 0.5 });
    }
  });
  ev.sort((a, b) => a.t - b.t);
  const garde = [], max = { impact: 3, whoosh: 4, souffle: 2, scintillement: 2 }, n = {};
  for (const x of ev) { if (garde.some((g) => Math.abs(g.t - x.t) < (g.sfx === x.sfx ? 0.35 : 0.12))) continue; if ((n[x.sfx] = (n[x.sfx] || 0) + 1) > (max[x.sfx] || 3)) continue; garde.push(x); }
  // Montée de tension avant le premier impact marquant
  const imp = garde.find((g) => g.sfx === 'impact' && g.t >= SONS.riser.duree); if (imp) garde.push({ t: imp.t - SONS.riser.duree, sfx: 'riser', v: 0.45 });
  if (nappe) garde.push({ t: 0, sfx: 'nappe', v: 0.28 });
  return garde.sort((a, b) => a.t - b.t).map((g, i) => ({ id: `auto${i}`, source: 'sfx', sfx: g.sfx, nom: SONS[g.sfx].nom, t: Math.round(g.t * 100) / 100, volume: g.v, fondu: g.sfx === 'nappe' ? 1 : 0, auto: true }));
}

// ---------- Synthèse (navigateur) ----------
const SR = 48000;
const alea = (s) => () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
function bruit(ctx, d, graine = 7) { const b = ctx.createBuffer(2, Math.ceil(d * ctx.sampleRate), ctx.sampleRate), r = alea(graine); for (let c = 0; c < 2; c++) { const x = b.getChannelData(c); for (let i = 0; i < x.length; i++) x[i] = r() * 2 - 1; } const s = ctx.createBufferSource(); s.buffer = b; return s; }
const env = (g, pts) => { g.gain.setValueAtTime(pts[0][1], pts[0][0]); for (const [t, v, lin] of pts.slice(1)) (lin ? g.gain.linearRampToValueAtTime : g.gain.exponentialRampToValueAtTime).call(g.gain, Math.max(v, 0.0001), t); };
const cache = new Map();
export async function synthetiser(id, duree = 0) {
  const d = id === 'nappe' ? Math.max(2, Math.min(60, duree || 8)) : SONS[id].duree, cle = `${id}:${d}`; if (cache.has(cle)) return cache.get(cle);
  const ctx = new OfflineAudioContext(2, Math.ceil(d * SR), SR), out = ctx.createGain(); out.connect(ctx.destination);
  const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -10; comp.ratio.value = 4; comp.connect(out);
  if (id === 'whoosh' || id === 'souffle') {
    const grave = id === 'souffle', n = bruit(ctx, d), f = ctx.createBiquadFilter(), g = ctx.createGain(), pan = ctx.createStereoPanner();
    f.type = 'bandpass'; f.Q.value = grave ? 0.8 : 1.4; f.frequency.setValueAtTime(grave ? 120 : 300, 0); f.frequency.exponentialRampToValueAtTime(grave ? 900 : 3200, d * 0.38); f.frequency.exponentialRampToValueAtTime(grave ? 160 : 500, d);
    env(g, [[0, 0.0001], [d * 0.38, grave ? 1.2 : 0.9], [d, 0.0001]]); pan.pan.setValueAtTime(-0.7, 0); pan.pan.linearRampToValueAtTime(0.7, d);
    n.connect(f).connect(g).connect(pan).connect(comp); n.start(0);
  } else if (id === 'impact' || id === 'boom') {
    const lourd = id === 'boom', o = ctx.createOscillator(), go = ctx.createGain(); o.type = 'sine'; o.frequency.setValueAtTime(lourd ? 70 : 140, 0); o.frequency.exponentialRampToValueAtTime(lourd ? 28 : 42, lourd ? 1.2 : 0.45);
    env(go, [[0, 1.2], [lourd ? d : d * 0.8, 0.0001]]); o.connect(go).connect(comp); o.start(0); o.stop(d);
    const n = bruit(ctx, 0.5, 11), f = ctx.createBiquadFilter(), gn = ctx.createGain(); f.type = 'lowpass'; f.frequency.setValueAtTime(lourd ? 1200 : 3500, 0); f.frequency.exponentialRampToValueAtTime(200, 0.4);
    env(gn, [[0, lourd ? 0.6 : 0.9], [0.35, 0.0001]]); n.connect(f).connect(gn).connect(comp); n.start(0);
    if (lourd) { const r = bruit(ctx, d, 13), lp = ctx.createBiquadFilter(), gr = ctx.createGain(); lp.type = 'lowpass'; lp.frequency.value = 180; env(gr, [[0, 0.0001], [0.15, 0.7], [d, 0.0001]]); r.connect(lp).connect(gr).connect(comp); r.start(0); }
  } else if (id === 'riser') {
    const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.setValueAtTime(180, 0); o.frequency.exponentialRampToValueAtTime(1100, d);
    f.type = 'lowpass'; f.frequency.setValueAtTime(400, 0); f.frequency.exponentialRampToValueAtTime(5000, d); env(g, [[0, 0.0001], [d * 0.97, 0.35], [d, 0.0001, true]]);
    o.connect(f).connect(g).connect(comp); o.start(0); o.stop(d);
    const n = bruit(ctx, d, 17), h = ctx.createBiquadFilter(), gn = ctx.createGain(); h.type = 'highpass'; h.frequency.setValueAtTime(800, 0); h.frequency.exponentialRampToValueAtTime(6000, d); env(gn, [[0, 0.0001], [d * 0.97, 0.5], [d, 0.0001, true]]); n.connect(h).connect(gn).connect(comp); n.start(0);
  } else if (id === 'scintillement') {
    const r = alea(23);
    for (let i = 0; i < 9; i++) { const t = i * 0.09 + r() * 0.04, o = ctx.createOscillator(), g = ctx.createGain(), p = ctx.createStereoPanner(); o.type = 'sine'; o.frequency.value = 1800 + r() * 2600; p.pan.value = r() * 1.6 - 0.8;
      env(g, [[t, 0.0001], [t + 0.01, 0.22], [t + 0.6, 0.0001]]); o.connect(g).connect(p).connect(comp); o.start(t); o.stop(t + 0.65); }
  } else if (id === 'tic') {
    const n = bruit(ctx, d, 29), f = ctx.createBiquadFilter(), g = ctx.createGain(); f.type = 'highpass'; f.frequency.value = 2500; env(g, [[0, 0.8], [d, 0.0001]]); n.connect(f).connect(g).connect(comp); n.start(0);
  } else if (id === 'nappe') {
    const f = ctx.createBiquadFilter(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain(); f.type = 'lowpass'; f.frequency.value = 650; lfo.frequency.value = 0.12; lg.gain.value = 250; lfo.connect(lg).connect(f.frequency); lfo.start(0);
    env(g, [[0, 0.0001], [Math.min(2, d / 3), 0.32, true], [Math.max(d - 1.5, d * 0.7), 0.32, true], [d, 0.0001, true]]); f.connect(g).connect(comp);
    for (const [hz, det] of [[110, -6], [110, 6], [164.8, 0], [220, 3], [261.6, -3]]) { const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = hz; o.detune.value = det; const og = ctx.createGain(); og.gain.value = 0.12; o.connect(og).connect(f); o.start(0); o.stop(d); }
  }
  const b = await ctx.startRendering(); cache.set(cle, b); return b;
}
// Mixage complet de la composition (durée totale), sons synthétisés et fichiers importés ; null si aucun son
export async function mixer(doc, { duree, decoder } = {}) {
  const a = normaliserAudio(doc.audio); if (a.muet || !a.pistes.length) return null;
  const D = Math.max(0.5, duree), ctx = new OfflineAudioContext(2, Math.ceil(D * SR), SR), maitre = ctx.createGain(); maitre.gain.value = a.volume; maitre.connect(ctx.destination);
  for (const p of a.pistes) { if (p.t >= D) continue;
    const buf = p.source === 'fichier' ? await decoder?.(p.ressource) : await synthetiser(p.sfx, p.sfx === 'nappe' ? D - p.t : 0); if (!buf) continue;
    const s = ctx.createBufferSource(), g = ctx.createGain(), fin = Math.min(D, p.t + buf.duration); s.buffer = buf; g.gain.setValueAtTime(p.fondu ? 0.0001 : p.volume, p.t);
    if (p.fondu) { g.gain.linearRampToValueAtTime(p.volume, p.t + p.fondu); g.gain.setValueAtTime(p.volume, Math.max(p.t + p.fondu, fin - p.fondu)); g.gain.linearRampToValueAtTime(0.0001, fin); }
    s.connect(g).connect(maitre); s.start(p.t); s.stop(fin); }
  return ctx.startRendering();
}
// Fichier WAV 16 bits stéréo
export function versWAV(b) {
  const n = b.length, ch = b.numberOfChannels, o = new DataView(new ArrayBuffer(44 + n * ch * 2)), s = (i, t) => [...t].forEach((c, k) => o.setUint8(i + k, c.charCodeAt(0)));
  s(0, 'RIFF'); o.setUint32(4, 36 + n * ch * 2, true); s(8, 'WAVE'); s(12, 'fmt '); o.setUint32(16, 16, true); o.setUint16(20, 1, true); o.setUint16(22, ch, true); o.setUint32(24, b.sampleRate, true); o.setUint32(28, b.sampleRate * ch * 2, true); o.setUint16(32, ch * 2, true); o.setUint16(34, 16, true); s(36, 'data'); o.setUint32(40, n * ch * 2, true);
  const d = [...Array(ch)].map((_, c) => b.getChannelData(c)); let p = 44; for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { const v = Math.max(-1, Math.min(1, d[c][i])); o.setInt16(p, v < 0 ? v * 0x8000 : v * 0x7fff, true); p += 2; }
  return new Uint8Array(o.buffer);
}
// Encodage Opus (WebCodecs) pour l'export WebM ; null si l'encodeur audio n'est pas disponible
export async function encoderOpus(b) {
  if (typeof AudioEncoder === 'undefined') return null;
  const cfg = { codec: 'opus', sampleRate: b.sampleRate, numberOfChannels: 2, bitrate: 160000 };
  try { if (!(await AudioEncoder.isConfigSupported(cfg)).supported) return null; } catch { return null; }
  const morceaux = []; let err = null; const enc = new AudioEncoder({ output: (c) => { const d = new Uint8Array(c.byteLength); c.copyTo(d); morceaux.push({ data: d, temps: c.timestamp }); }, error: (e) => { err = e; } });
  enc.configure(cfg); const pas = 4800;
  for (let i = 0; i < b.length; i += pas) { const n = Math.min(pas, b.length - i), plan = new Float32Array(n * 2); plan.set(b.getChannelData(0).subarray(i, i + n), 0); plan.set(b.getChannelData(1).subarray(i, i + n), n);
    const ad = new AudioData({ format: 'f32-planar', sampleRate: b.sampleRate, numberOfFrames: n, numberOfChannels: 2, timestamp: Math.round((i / b.sampleRate) * 1e6), data: plan }); enc.encode(ad); ad.close(); }
  await enc.flush(); enc.close(); if (err) throw err; return { morceaux, frequence: b.sampleRate };
}
