// Motion Studio · exports : PNG (jusqu'à ×4), JPG, SVG autonome, GIF animé, WebM image par image (WebCodecs),
// MP4 ou WebM en temps réel (MediaRecorder). Tous les rendus passent par la même scène que l'aperçu.
import { S } from './etat.js';
import { el, bouton } from './proprietes.js';
import { versSVG } from '../../templates/_systeme/motion-svg.js';
import M from '../../templates/_systeme/metrics.js';
import { palette as gifPalette, creerGIF } from './gif.js';
import { muxerWebM } from './webm.js';

const MAX_PX = 16.7e6, MAX_COTE = 8192;
export const MIME_TEMPS_REEL = ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm'].find((x) => window.MediaRecorder?.isTypeSupported?.(x) && HTMLCanvasElement.prototype.captureStream) || null;
async function codecWebCodecs(w, h) {
  if (typeof VideoEncoder === 'undefined') return null;
  for (const [codec, nom] of [['vp09.00.40.08', 'vp9'], ['vp8', 'vp8']]) { try { const r = await VideoEncoder.isConfigSupported({ codec, width: w, height: h, bitrate: 8e6, framerate: 30 }); if (r.supported) return { codec, nom }; } catch { /* suivant */ } }
  return null;
}
export function initExports(ctx) {
  const dlg = document.querySelector('#export'), corps = document.querySelector('#contenu-export');
  dlg.querySelector('[data-fermer]').addEventListener('click', () => dlg.close());
  let annule = false, occupe = false;
  const o = { moment: 'final', echelle: 1, transparent: false, limite2: false, gif: 480, gifFps: 15, vidFps: 30, vidDef: 1 };
  const sel = (id, label, opts, cle) => { const s = el('select', { id }, ...Object.entries(opts).map(([v, t]) => el('option', { value: v, textContent: t }))); s.value = String(o[cle]); s.addEventListener('change', () => { o[cle] = isNaN(+s.value) ? s.value : +s.value; }); return el('label', { className: 'champ' }, label, s); };
  const chk = (id, label, cle) => { const i = el('input', { type: 'checkbox', id, checked: o[cle] }); i.addEventListener('change', () => { o[cle] = i.checked; }); return el('label', { className: 'bascule' }, i, label); };
  async function construire() {
    const { w, h } = S.doc.format, wc = await codecWebCodecs(Math.min(3840, w) & ~1, Math.round(h * Math.min(1, 3840 / w)) & ~1);
    const echelles = Object.fromEntries([1, 2, 4].filter((k) => w * k <= MAX_COTE && h * k <= MAX_COTE).map((k) => [k, `×${k} · ${w * k} × ${h * k}`]));
    corps.replaceChildren(
      el('h3', { textContent: 'Image fixe' }), el('div', { className: 'grille2' }, sel('export-moment', 'Instant', { final: 'Composition complète', curseur: `Position du curseur (${S.t.toFixed(1).replace('.', ',')} s)` }, 'moment'), sel('export-echelle', 'Définition', echelles, 'echelle')),
      chk('export-transparent', 'Fond transparent (PNG, SVG, GIF)', 'transparent'), chk('export-limite', 'JPG limité à 2 Mo (miniature YouTube)', 'limite2'),
      el('div', { className: 'rangee' }, bouton('PNG', () => lancer('png'), { dataset: { export: 'png' } }), bouton('JPG', () => lancer('jpg'), { dataset: { export: 'jpg' } }), bouton('SVG', () => lancer('svg'), { dataset: { export: 'svg' } })),
      el('h3', { textContent: 'Animation' }), el('div', { className: 'grille2' }, sel('export-gif', 'GIF', { 480: '480 px', 720: '720 px', 1080: '1080 px' }, 'gif'), sel('export-gif-fps', 'Images/s du GIF', { 10: '10', 15: '15', 20: '20', 25: '25' }, 'gifFps'),
        sel('export-video-fps', 'Images/s de la vidéo', { 24: '24', 30: '30', 60: '60' }, 'vidFps'), sel('export-video-def', 'Définition vidéo', { 1: 'Pleine (4K au plus)', 0.5: 'Moitié' }, 'vidDef')),
      el('div', { className: 'rangee' }, bouton('GIF animé', () => lancer('gif'), { dataset: { export: 'gif' } }),
        wc ? bouton(`WebM (${wc.nom.toUpperCase()}, image par image)`, () => lancer('webm'), { dataset: { export: 'webm' } }) : null,
        MIME_TEMPS_REEL ? bouton(`${MIME_TEMPS_REEL.includes('mp4') ? 'MP4' : 'WebM'} (temps réel)`, () => lancer('direct'), { dataset: { export: 'direct' } }) : null),
      el('p', { className: 'info', textContent: `${wc ? 'WebM image par image : rendu exact, plus rapide que le temps réel, indépendant de la visibilité de l\'onglet. ' : 'Encodage image par image indisponible dans ce navigateur. '}${MIME_TEMPS_REEL ? `${MIME_TEMPS_REEL.includes('mp4') ? 'MP4' : 'WebM'} temps réel : dure autant que l'animation, onglet visible obligatoire.` : 'Aucun enregistrement vidéo en temps réel dans ce navigateur.'} Pas de son.` }),
      el('progress', { id: 'export-progression', className: 'progression', max: 1, value: 0, hidden: true }), el('div', { className: 'rangee' }, bouton('Annuler l\'export', () => { annule = true; }, { id: 'export-annuler', hidden: true })),
      el('p', { id: 'export-info', className: 'info', 'aria-live': 'polite' }));
  }
  const info = (t) => { const p = document.querySelector('#export-info'); if (p) p.textContent = t; };
  const prog = (v) => { const p = document.querySelector('#export-progression'); if (p) { p.hidden = v === null; p.value = v ?? 0; } };
  async function canvasScene(t, e, opts = {}) { const sc = await ctx.scenePrete(t, { final: t === null, sansFond: o.transparent && opts.transparent, ...opts }); const c = Object.assign(document.createElement('canvas'), { width: Math.round(sc.w * e), height: Math.round(sc.h * e) }); await ctx.rendu.precharger(sc); ctx.rendu.dessiner(c.getContext('2d'), sc, e); return { c, sc }; }
  const blob = (c, type, q) => new Promise((ok) => c.toBlob(ok, type, q));
  async function lancer(type) {
    if (occupe) return; occupe = true; annule = false; ctx.arreter(); document.querySelector('#export-annuler')?.removeAttribute('hidden');
    for (const b of corps.querySelectorAll('[data-export]')) b.disabled = true;
    const t = o.moment === 'final' ? null : S.t, { w, h } = S.doc.format;
    try {
      if (type === 'png' || type === 'jpg') {
        if (w * h * o.echelle ** 2 > MAX_PX) info('Attention : image très grande, certains appareils (iPhone, iPad) ne peuvent pas la créer.');
        const { c } = await canvasScene(t, o.echelle, { transparent: type === 'png' });
        if (type === 'png') { const b = await blob(c, 'image/png'); ctx.telecharger(b, 'png'); return info(`PNG exporté · ${c.width} × ${c.height} · ${(b.size / 1048576).toFixed(2)} Mo${o.transparent ? ' · fond transparent' : ''}.`); }
        let q = 0.92, b = await blob(c, 'image/jpeg', q); while (o.limite2 && b.size > 2 * 1048576 && q > 0.5) { q = Math.round((q - 0.08) * 100) / 100; b = await blob(c, 'image/jpeg', q); }
        ctx.telecharger(b, 'jpg'); return info(`JPG exporté · ${c.width} × ${c.height} · qualité ${Math.round(q * 100)} · ${(b.size / 1048576).toFixed(2)} Mo.`);
      }
      if (type === 'svg') { const s = await svgAutonome(t); ctx.telecharger(new Blob([s], { type: 'image/svg+xml' }), 'svg'); return info(`SVG exporté · ${w} × ${h} · calques nommés, images et polices intégrées${o.transparent ? ' · fond transparent' : ''}.`); }
      if (type === 'gif') return await gif();
      if (type === 'webm') return await webm();
      if (type === 'direct') return await direct();
    } catch (e) { info(`Export impossible : ${e.message || e}.`); }
    finally { occupe = false; prog(null); document.querySelector('#export-annuler')?.setAttribute('hidden', ''); for (const b of corps.querySelectorAll('[data-export]')) b.disabled = false; }
  }
  async function svgAutonome(t) {
    const sc = await ctx.scenePrete(t, { final: t === null, sansFond: o.transparent }); let svg = versSVG(sc, { titre: `Primestone · Motion Studio · ${S.doc.nom}` });
    for (const r of new Set([...svg.matchAll(/href="(?!data:)([^"]+)"/g)].map((m) => m[1]))) { const b = await (await fetch(new URL(r.replace(/&amp;/g, '&'), location.href))).blob(); const d = await new Promise((ok) => { const f = new FileReader(); f.onload = () => ok(f.result); f.readAsDataURL(b); }); svg = svg.split(`"${r}"`).join(`"${d}"`); }
    const faces = [];
    for (const m of Object.values(M)) if (svg.includes(`font-family="${m.family}" font-weight="${m.weight}"`)) { const b = await (await fetch(new URL(`../../brand/03_fonts/web/${m.file}`, location.href))).blob(); faces.push(`@font-face{font-family:"${m.family}";font-weight:${m.weight};font-style:${m.style};src:url(${await new Promise((ok) => { const f = new FileReader(); f.onload = () => ok(f.result); f.readAsDataURL(b); })}) format("woff2")}`); }
    for (const r of S.ressources.values()) if (r.type === 'police' && svg.includes(`font-family="${r.fam}"`)) faces.push(`@font-face{font-family:"${r.fam}";src:url(${r.href})}`);
    return svg.replace('<defs>', `<defs><style>${faces.join('')}</style>`);
  }
  async function gif() {
    const { w: W, h: H } = S.doc.format, e = Math.min(1, o.gif / W), w = Math.round(W * e), h = Math.round(H * e), fps = o.gifFps, n = Math.max(2, Math.round(S.doc.duree * fps)), tr = o.transparent;
    const c = Object.assign(document.createElement('canvas'), { width: w, height: h }), g = c.getContext('2d', { willReadFrequently: true });
    const image = async (i) => { const sc = await ctx.scenePrete(i / fps, { sansFond: tr }); await ctx.rendu.precharger(sc); ctx.rendu.dessiner(g, sc, e); return g.getImageData(0, 0, w, h).data; };
    const ech = []; for (let i = 0; i < 6; i++) ech.push(await image(Math.round((i / 5) * (n - 1))));
    const enc = creerGIF(w, h, gifPalette(ech, 256, tr), Math.round(100 / fps), { transparent: tr });
    for (let i = 0; i < n; i++) { if (annule) return info('Export annulé.'); enc.ajouter(await image(i)); prog(i / n); if (i % 2 === 0) { info(`Calcul du GIF… ${Math.round((i / n) * 100)} %`); await new Promise((r) => setTimeout(r)); } }
    const b = new Blob([enc.fin()], { type: 'image/gif' }); ctx.telecharger(b, 'gif'); info(`GIF exporté · ${w} × ${h} · ${n} images à ${fps} i/s · ${(b.size / 1048576).toFixed(2)} Mo${tr ? ' · transparent' : ''}.`);
  }
  async function webm() {
    const { w: W, h: H } = S.doc.format, e = o.vidDef * Math.min(1, 3840 / Math.max(W, H)), w = Math.round(W * e) & ~1, h = Math.round(H * e) & ~1, fps = o.vidFps, n = Math.max(1, Math.round(S.doc.duree * fps)), cc = await codecWebCodecs(w, h);
    if (!cc) throw new Error('encodeur vidéo indisponible');
    const c = Object.assign(document.createElement('canvas'), { width: w, height: h }), g = c.getContext('2d'), images = []; let erreur = null;
    const enc = new VideoEncoder({ output: (ch) => { const d = new Uint8Array(ch.byteLength); ch.copyTo(d); images.push({ data: d, temps: ch.timestamp, cle: ch.type === 'key' }); }, error: (x) => { erreur = x; } });
    enc.configure({ codec: cc.codec, width: w, height: h, bitrate: Math.round(Math.min(40e6, w * h * fps * 0.12)), framerate: fps });
    for (let i = 0; i < n; i++) {
      if (annule) { enc.close(); return info('Export annulé.'); } if (erreur) throw erreur;
      const sc = await ctx.scenePrete(i / fps); await ctx.rendu.precharger(sc); ctx.rendu.dessiner(g, sc, w / sc.w);
      const f = new VideoFrame(c, { timestamp: Math.round((i * 1e6) / fps), duration: Math.round(1e6 / fps) }); enc.encode(f, { keyFrame: i % (fps * 2) === 0 }); f.close();
      while (enc.encodeQueueSize > 4) await new Promise((r) => setTimeout(r, 1));
      prog(i / n); if (i % 3 === 0) { info(`Encodage WebM… ${Math.round((i / n) * 100)} %`); await new Promise((r) => setTimeout(r)); }
    }
    await enc.flush(); enc.close(); if (erreur) throw erreur;
    const b = muxerWebM({ codec: cc.nom, largeur: w, hauteur: h, duree: S.doc.duree, images }); ctx.telecharger(b, 'webm');
    info(`WebM exporté · ${cc.nom.toUpperCase()} · ${w} × ${h} · ${fps} i/s · ${S.doc.duree} s · ${(b.size / 1048576).toFixed(2)} Mo.`);
  }
  async function direct() {
    const { w: W, h: H } = S.doc.format, e = o.vidDef * Math.min(1, 1920 / Math.max(W, H)), w = Math.round(W * e) & ~1, h = Math.round(H * e) & ~1;
    const c = Object.assign(document.createElement('canvas'), { width: w, height: h }), g = c.getContext('2d'), s0 = await ctx.scenePrete(0); await ctx.rendu.precharger(s0); ctx.rendu.dessiner(g, s0, w / s0.w);
    const rec = new MediaRecorder(c.captureStream(o.vidFps), { mimeType: MIME_TEMPS_REEL, videoBitsPerSecond: Math.round(Math.min(20e6, w * h * o.vidFps * 0.15)) }), morceaux = [];
    rec.ondataavailable = (x) => x.data.size && morceaux.push(x.data); const fin = new Promise((ok) => { rec.onstop = ok; }); rec.start(250); const t0 = performance.now();
    await new Promise((ok) => { const pas = async (now) => { const t = Math.min(S.doc.duree, (now - t0) / 1000); if (annule) return ok(); const sc = await ctx.scenePrete(t); await ctx.rendu.precharger(sc); ctx.rendu.dessiner(g, sc, w / sc.w); prog(t / S.doc.duree); info(`Enregistrement… ${Math.round((t / S.doc.duree) * 100)} % (garder l'onglet visible)`); if (t >= S.doc.duree) ok(); else requestAnimationFrame(pas); }; requestAnimationFrame(pas); });
    await new Promise((r) => setTimeout(r, 200)); rec.stop(); await fin; if (annule) return info('Export annulé.');
    const ext = MIME_TEMPS_REEL.includes('mp4') ? 'mp4' : 'webm', b = new Blob(morceaux, { type: MIME_TEMPS_REEL.split(';')[0] }); ctx.telecharger(b, ext);
    info(`${ext.toUpperCase()} exporté (temps réel) · ${w} × ${h} · ${(b.size / 1048576).toFixed(2)} Mo.`);
  }
  return { async ouvrir() { await construire(); dlg.showModal(); }, svgAutonome, lancer };
}
