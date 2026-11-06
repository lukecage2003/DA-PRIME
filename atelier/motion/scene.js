// Motion Studio · scène interactive : zoom, règles, guides, grille, zones sûres, sélection directe,
// déplacement, redimensionnement, rotation, recadrage des illustrations, sélection au lasso, gestes tactiles, magnétisme.
import { S, modifier, selectionner, selection, deplacer, redimensionner, notifier, trouverEl } from './etat.js';
import { inverse, appliquer, matriceEl } from '../../templates/_systeme/studio.js';

export function initScene(ctx) {
  const $ = (s) => document.querySelector(s), plateau = $('#plateau'), defile = $('#defile'), sv = $('#surcouche'), cv = $('#apercu'), cadre = $('#cadre-scene');
  let z = 1, geste = null, accroches = [];
  const W = () => S.doc.format.w, H = () => S.doc.format.h;
  // ---------- Dimensions ----------
  function zoomVoulu() { const v = $('#zoom').value; if (v !== 'ajuste') return +v; const r = defile.getBoundingClientRect(); return Math.max(0.02, Math.min((r.width - 48) / W(), (r.height - 48) / H())); }
  function dimensionner() {
    z = zoomVoulu(); const w = Math.max(1, Math.round(W() * z)), h = Math.max(1, Math.round(H() * z));
    plateau.style.width = w + 'px'; plateau.style.height = h + 'px'; sv.setAttribute('viewBox', `0 0 ${W()} ${H()}`); sv.setAttribute('preserveAspectRatio', 'none');
    const e = Math.min(1, (w * Math.min(2, devicePixelRatio || 1)) / W()), cw = Math.round(W() * e), ch = Math.round(H() * e);
    if (cv.width !== cw || cv.height !== ch) { cv.width = cw; cv.height = ch; }
    return e;
  }
  const versScene = (ev) => { const r = sv.getBoundingClientRect(); return [((ev.clientX - r.left) / r.width) * W(), ((ev.clientY - r.top) / r.height) * H()]; };
  const local = (id, p) => appliquer(inverse(S.boites[id].m), p[0], p[1]);
  const dedans = (id, p) => { const b = S.boites[id]; if (!b) return false; const [x, y] = local(id, p); return x >= 0 && y >= 0 && x <= b.w && y <= b.h; };
  // Élément sous le pointeur : calque de premier niveau, ou le plus profond (double-clic dans un groupe)
  // Les effets plein cadre ne masquent pas les éléments situés dessous : ils ne sont choisis qu'en dernier recours
  function sous(p, profond = false, liste = S.doc.elements, effets = false) {
    if (effets === false) { const r = sous(p, profond, liste, null); if (r) return r; return sous(p, profond, liste, true); }
    // Un effet plein cadre (trame, grain, lumière…) ne se sélectionne pas en touchant la scène : onglet Calques
    const plein = (e) => e.type === 'effet' && e.w >= W() * 0.95 && e.h >= H() * 0.95;
    for (const e of [...liste].reverse()) { if (e.visible === false || e.verrou || (effets === null && e.type === 'effet') || plein(e)) continue;
      if (e.enfants && (profond || S.sel.some((id) => e.enfants.some((c) => c.id === id)))) { const c = sous(p, profond, e.enfants, effets); if (c) return c; }
      if (dedans(e.id, p)) return e; }
    return null;
  }
  // ---------- Surcouche ----------
  function dessiner(lignes = accroches) {
    const k = 1 / z, out = [], d = S.doc;
    if ($('#voir-grille').checked) { const p = d.grille.pas; let g = ''; for (let x = p; x < W(); x += p) g += `M${x} 0V${H()}`; for (let y = p; y < H(); y += p) g += `M0 ${y}H${W()}`; out.push(`<path d="${g}" stroke="rgba(0,194,255,.25)" stroke-width="${k}" fill="none" pointer-events="none"/>`); }
    if ($('#voir-zones').checked && d.format.sure) { const s = d.format.sure; out.push(`<rect x="${s.l * W()}" y="${s.t * H()}" width="${(1 - s.l - s.r) * W()}" height="${(1 - s.t - s.b) * H()}" fill="none" stroke="#FF5A45" stroke-dasharray="${8 * k} ${6 * k}" stroke-width="${1.5 * k}" pointer-events="none"/>`); }
    if ($('#voir-regles').checked) { d.guides.v.forEach((x, i) => out.push(`<line class="guide" x1="${x}" x2="${x}" y1="0" y2="${H()}" stroke-width="${k}"/><line class="guide-zone" data-guide="v:${i}" x1="${x}" x2="${x}" y1="0" y2="${H()}" stroke-width="${10 * k}"/>`));
      d.guides.h.forEach((y, i) => out.push(`<line class="guide" y1="${y}" y2="${y}" x1="0" x2="${W()}" stroke-width="${k}"/><line class="guide-zone" data-guide="h:${i}" y1="${y}" y2="${y}" x1="0" x2="${W()}" stroke-width="${10 * k}"/>`)); }
    for (const l of lignes) out.push(l.x !== undefined ? `<line x1="${l.x}" x2="${l.x}" y1="0" y2="${H()}" stroke="#FF3EA5" stroke-width="${k}" pointer-events="none"/>` : `<line y1="${l.y}" y2="${l.y}" x1="0" x2="${W()}" stroke="#FF3EA5" stroke-width="${k}" pointer-events="none"/>`);
    const sel = selection();
    for (const { el } of sel) { const b = S.boites[el.id]; if (!b) continue; out.push(`<polygon class="cadre-sel" points="${b.coins.map((c) => c.join(',')).join(' ')}" stroke-width="${(el.verrou ? 1 : 1.5) * k}" ${el.verrou ? `stroke-dasharray="${6 * k} ${4 * k}"` : ''}/>`); }
    if (sel.length === 1 && !sel[0].el.verrou && !S.lecture) {
      const { el } = sel[0], b = S.boites[el.id], hs = 9 * k, m = b.m;
      if (S.recadrage) out.push(`<text x="${b.coins[0][0]}" y="${b.coins[0][1] - 8 * k}" fill="#00C2FF" font-size="${13 * k}" font-family="Archivo">Recadrage : glisser, molette ou pincer</text>`);
      else { for (const [n, fx, fy] of [['nw', 0, 0], ['n', 0.5, 0], ['ne', 1, 0], ['e', 1, 0.5], ['se', 1, 1], ['s', 0.5, 1], ['sw', 0, 1], ['w', 0, 0.5]]) { const [x, y] = appliquer(m, fx * b.w, fy * b.h); out.push(`<rect class="poignee" data-poignee="${n}" x="${x - hs}" y="${y - hs}" width="${hs * 2}" height="${hs * 2}" stroke-width="${1.5 * k}"/>`); }
        const [rx, ry] = appliquer(m, b.w / 2, -34 * k / Math.max(0.01, Math.hypot(m[2], m[3]))), [tx, ty] = appliquer(m, b.w / 2, 0);
        out.push(`<line x1="${tx}" y1="${ty}" x2="${rx}" y2="${ry}" stroke="#00C2FF" stroke-width="${k}" pointer-events="none"/><circle class="poignee" data-poignee="rot" cx="${rx}" cy="${ry}" r="${hs * 1.1}" stroke-width="${1.5 * k}"/>`); }
    }
    if (geste?.type === 'lasso' && geste.r) { const r = geste.r; out.push(`<rect x="${r.x}" y="${r.y}" width="${r.w}" height="${r.h}" fill="rgba(0,194,255,.1)" stroke="#00C2FF" stroke-width="${k}" pointer-events="none"/>`); }
    sv.innerHTML = out.join('');
    regles();
  }
  // ---------- Règles ----------
  function regles() {
    cadre.classList.toggle('sans-regles', !$('#voir-regles').checked); if (!$('#voir-regles').checked) return;
    const pr = plateau.getBoundingClientRect();
    for (const [c, horiz] of [[$('#regle-h'), true], [$('#regle-v'), false]]) {
      const r = c.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1); c.width = Math.max(1, r.width * dpr); c.height = Math.max(1, r.height * dpr);
      const g = c.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, r.width, r.height); g.fillStyle = '#8c8a80'; g.strokeStyle = '#55534c'; g.font = '9px "JetBrains Mono", monospace';
      const pas = [10, 20, 50, 100, 200, 500, 1000, 2000].find((s) => s * z >= 50) || 5000, o = horiz ? pr.left - r.left : pr.top - r.top, L = horiz ? r.width : r.height;
      g.beginPath(); for (let v = Math.floor(-o / z / pas) * pas; v * z + o < L; v += pas / 5) { const p = Math.round(v * z + o) + 0.5, maj = Math.abs(v % pas) < 1e-6; if (horiz) { g.moveTo(p, 22); g.lineTo(p, maj ? 8 : 16); if (maj) g.fillText(String(Math.round(v)), p + 2, 9); } else { g.moveTo(22, p); g.lineTo(maj ? 8 : 16, p); if (maj) { g.save(); g.translate(9, p + 2); g.rotate(-Math.PI / 2); g.fillText(String(Math.round(v)), -24, 0); g.restore(); } } } g.stroke();
    }
  }
  for (const [id, axe] of [['#regle-h', 'h'], ['#regle-v', 'v']]) $(id).addEventListener('pointerdown', (ev) => {
    ev.preventDefault(); const p = versScene(ev), v = Math.round(axe === 'h' ? p[1] : p[0]); modifier((d) => d.guides[axe].push(Math.max(0, v)), 'guide'); geste = { type: 'guide', axe, i: S.doc.guides[axe].length - 1 }; $(id).setPointerCapture(ev.pointerId);
  });
  for (const id of ['#regle-h', '#regle-v']) { $(id).addEventListener('pointermove', (ev) => geste?.type === 'guide' && guide(ev)); $(id).addEventListener('pointerup', (ev) => geste?.type === 'guide' && finGuide(ev)); }
  function guide(ev) { const p = versScene(ev); S.doc.guides[geste.axe][geste.i] = Math.round(geste.axe === 'h' ? p[1] : p[0]); dessiner(); }
  function finGuide() { const g = S.doc.guides[geste.axe], v = g[geste.i], L = geste.axe === 'h' ? H() : W(); if (v < 0 || v > L) modifier((d) => d.guides[geste.axe].splice(geste.i, 1)); else notifier('doc'); geste = null; dessiner(); }
  // ---------- Magnétisme ----------
  function aimanter(b, exclus) {
    if (!$('#aimant').checked) return { dx: 0, dy: 0, lignes: [] };
    const tol = 7 / z, d = S.doc, cx = [0, W() / 2, W(), ...d.guides.v], cy = [0, H() / 2, H(), ...d.guides.h];
    for (const [id, bb] of Object.entries(S.boites)) { if (exclus.has(id) || !d.elements.some((e) => e.id === id)) continue; const a = bb.aabb; cx.push(a.x, a.x + a.w / 2, a.x + a.w); cy.push(a.y, a.y + a.h / 2, a.y + a.h); }
    const meilleur = (bords, cand, grille) => { let m = null; for (const e of bords) { for (const c of cand) if (Math.abs(c - e) < tol && (!m || Math.abs(c - e) < Math.abs(m.d))) m = { d: c - e, v: c };
      if (grille && $('#voir-grille').checked && d.grille.aimant) { const c = Math.round(e / d.grille.pas) * d.grille.pas; if (Math.abs(c - e) < tol && (!m || Math.abs(c - e) < Math.abs(m.d))) m = { d: c - e, v: c }; } } return m; };
    const mx = meilleur([b.x, b.x + b.w / 2, b.x + b.w], cx, true), my = meilleur([b.y, b.y + b.h / 2, b.y + b.h], cy, true);
    return { dx: mx?.d || 0, dy: my?.d || 0, lignes: [mx && { x: mx.v }, my && { y: my.v }].filter(Boolean) };
  }
  // ---------- Gestes ----------
  const pointeurs = new Map();
  sv.addEventListener('pointerdown', (ev) => {
    if (S.lecture) ctx.arreter();
    sv.setPointerCapture(ev.pointerId); pointeurs.set(ev.pointerId, versScene(ev)); const p = versScene(ev);
    if (pointeurs.size === 2) { const s = selection(); if (s.length === 1 && !s[0].el.verrou) { const [a, b] = [...pointeurs.values()]; geste = { type: 'pincer', e: s[0].el, d0: Math.hypot(a[0] - b[0], a[1] - b[1]), a0: Math.atan2(b[1] - a[1], b[0] - a[0]), o: { ...s[0].el, image: s[0].el.image && { ...s[0].el.image } }, enfants: s[0].el.enfants ? JSON.stringify(s[0].el.enfants) : null, cle: 'pincer' + Date.now() }; } return; }
    const po = ev.target.dataset?.poignee, gd = ev.target.dataset?.guide;
    if (gd) { const [axe, i] = gd.split(':'); geste = { type: 'guide', axe, i: +i }; S.hist.push(JSON.stringify(S.doc)); return; }
    const s = selection();
    if (po && s.length === 1) { const e = s[0].el; geste = { type: po === 'rot' ? 'rotation' : 'taille', poignee: po, e, p0: p, o: { x: e.x, y: e.y, w: e.w, h: e.h, rot: e.rot }, m0: S.boites[e.id].m, parent: s[0].parent, cle: 'g' + Date.now(), enfants: e.enfants ? JSON.stringify(e.enfants) : null }; return; }
    if (S.recadrage && s.length === 1 && s[0].el.type === 'image' && dedans(s[0].el.id, p)) { geste = { type: 'recadrage', e: s[0].el, p0: p, o: { dx: s[0].el.image.dx, dy: s[0].el.image.dy }, cle: 'r' + Date.now() }; return; }
    const cible = sous(p);
    if (cible) {
      if (ev.shiftKey) selectionner(cible.id, true); else if (!S.sel.includes(cible.id)) selectionner(cible.id);
      const ents = selection().filter((x) => !x.el.verrou);
      geste = { type: 'deplacer', p0: p, ents, o: ents.map((x) => ({ x: x.el.x, y: x.el.y })), b0: union(ents.map((x) => S.boites[x.el.id].aabb)), cle: 'd' + Date.now(), bouge: false };
    } else { if (!ev.shiftKey) selectionner([]); geste = { type: 'lasso', p0: p, r: null, ajout: ev.shiftKey }; }
  });
  sv.addEventListener('pointermove', (ev) => {
    if (!pointeurs.has(ev.pointerId)) { const c = ev.target.dataset?.poignee; sv.style.cursor = c ? (c === 'rot' ? 'grab' : 'nwse-resize') : ''; return; }
    pointeurs.set(ev.pointerId, versScene(ev)); const p = versScene(ev); if (!geste) return;
    if (geste.type === 'pincer') { const [a, b] = [...pointeurs.values()]; if (!b) return; const k = Math.hypot(a[0] - b[0], a[1] - b[1]) / geste.d0, ang = Math.atan2(b[1] - a[1], b[0] - a[0]) - geste.a0, e = geste.e, o = geste.o;
      modifier(() => { if (S.recadrage && e.image) e.image.zoom = Math.min(8, Math.max(0.2, o.image.zoom * k)); else { const cx = o.x + o.w / 2, cy = o.y + o.h / 2; e.w = o.w; e.h = o.h; if (geste.enfants) e.enfants = JSON.parse(geste.enfants); redimensionner(e, o.w * k, o.h * k); e.x = cx - e.w / 2; e.y = cy - e.h / 2; e.rot = Math.round(((o.rot || 0) + (ang * 180) / Math.PI) * 10) / 10; } }, geste.cle); return; }
    const dx = p[0] - geste.p0?.[0], dy = p[1] - geste.p0?.[1];
    if (geste.type === 'deplacer') {
      if (!geste.bouge && Math.hypot(dx, dy) * z < 3) return; geste.bouge = true;
      const b = { ...geste.b0, x: geste.b0.x + dx, y: geste.b0.y + dy }, a = ev.altKey ? { dx: 0, dy: 0, lignes: [] } : aimanter(b, new Set(geste.ents.map((x) => x.el.id))); accroches = a.lignes;
      modifier(() => geste.ents.forEach((x, i) => { x.el.x = geste.o[i].x; x.el.y = geste.o[i].y; deplacer(x, dx + a.dx, dy + a.dy); }), geste.cle);
    } else if (geste.type === 'taille') redim(p, ev.shiftKey);
    else if (geste.type === 'rotation') { const e = geste.e, c = appliquer(S.boites[e.id].m, e.w / 2, e.h / 2); let a = (Math.atan2(p[1] - c[1], p[0] - c[0]) * 180) / Math.PI + 90; const pr = geste.parent ? Math.atan2(S.boites[geste.parent.id].m[1], S.boites[geste.parent.id].m[0]) * 180 / Math.PI : 0; a -= pr;
      if (ev.shiftKey) a = Math.round(a / 15) * 15; a = ((a + 540) % 360) - 180; modifier(() => { e.rot = Math.round(a * 10) / 10; }, geste.cle); }
    else if (geste.type === 'recadrage') { const e = geste.e, iv = inverse(S.boites[e.id].m), lx = iv[0] * dx + iv[2] * dy, ly = iv[1] * dx + iv[3] * dy; modifier(() => { e.image.dx = geste.o.dx + lx / e.w; e.image.dy = geste.o.dy + ly / e.h; }, geste.cle); }
    else if (geste.type === 'lasso') { geste.r = { x: Math.min(p[0], geste.p0[0]), y: Math.min(p[1], geste.p0[1]), w: Math.abs(dx), h: Math.abs(dy) }; dessiner(); }
    else if (geste.type === 'guide') guide(ev);
  });
  // Redimensionnement dans le repère de l'élément ; le point opposé reste fixe (Maj : proportions conservées)
  function redim(p, prop) {
    const { e, o, m0, poignee: n } = geste, iv = inverse(m0), [lx, ly] = appliquer(iv, p[0], p[1]);
    let x0 = 0, y0 = 0, x1 = o.w, y1 = o.h; if (n.includes('w')) x0 = Math.min(lx, x1 - 2); if (n.includes('e')) x1 = Math.max(lx, x0 + 2); if (n.includes('n')) y0 = Math.min(ly, y1 - 2); if (n.includes('s')) y1 = Math.max(ly, y0 + 2);
    if (prop || e.type === 'sceau') { const k = n.length === 2 ? Math.max((x1 - x0) / o.w, (y1 - y0) / o.h) : n === 'e' || n === 'w' ? (x1 - x0) / o.w : (y1 - y0) / o.h; const nw = o.w * k, nh = o.h * k;
      if (n.includes('w')) x0 = x1 - nw; else x1 = x0 + nw; if (n.includes('n')) y0 = y1 - nh; else if (n.includes('s') || n.length === 2) y1 = y0 + nh; else { y0 = (o.h - nh) / 2; y1 = y0 + nh; } if (n === 'n' || n === 's') { x0 = (o.w - nw) / 2; x1 = x0 + nw; } }
    const c = appliquer(m0, (x0 + x1) / 2, (y0 + y1) / 2); let cx = c[0], cy = c[1];
    if (geste.parent) { const ip = inverse(S.boites[geste.parent.id].m); [cx, cy] = appliquer(ip, cx, cy); }
    // Groupe : les enfants repartent de leur état initial à chaque mouvement (pas d'accumulation)
    modifier(() => { e.w = o.w; e.h = o.h; if (e.type === 'groupe') e.enfants = JSON.parse(geste.enfants); redimensionner(e, x1 - x0, y1 - y0); e.x = cx - e.w / 2; e.y = cy - e.h / 2; }, geste.cle);
  }
  const fin = (ev) => {
    pointeurs.delete(ev.pointerId); if (!geste) return;
    if (geste.type === 'lasso' && geste.r && (geste.r.w > 2 || geste.r.h > 2)) { const r = geste.r, ids = S.doc.elements.filter((e) => e.visible !== false && !e.verrou && (() => { const a = S.boites[e.id].aabb; return a.x < r.x + r.w && a.x + a.w > r.x && a.y < r.y + r.h && a.y + a.h > r.y; })()).map((e) => e.id); selectionner(ids, geste.ajout); }
    if (geste.type === 'guide') return finGuide(ev);
    if (pointeurs.size === 0) { geste = null; accroches = []; dessiner(); ctx.apresGeste?.(); }
  };
  for (const t of ['pointerup', 'pointercancel']) sv.addEventListener(t, fin);
  sv.addEventListener('dblclick', (ev) => {
    const p = versScene(ev), e = sous(p, true); if (!e) return;
    selectionner(e.id); if (e.type === 'texte') ctx.editerTexte(); if (e.type === 'image') { S.recadrage = true; notifier('sel'); }
  });
  defile.addEventListener('wheel', (ev) => {
    const s = selection();
    if (S.recadrage && s.length === 1 && s[0].el.image) { ev.preventDefault(); const e = s[0].el; modifier(() => { e.image.zoom = Math.min(8, Math.max(0.2, (e.image.zoom || 1) * Math.exp(-ev.deltaY * 0.0015))); }, 'zoom-img'); return; }
    if (ev.ctrlKey || ev.metaKey) { ev.preventDefault(); const nz = Math.min(4, Math.max(0.05, z * Math.exp(-ev.deltaY * 0.002))); const o = [...$('#zoom').options].find((x) => x.value === 'perso') || $('#zoom').appendChild(new Option('Personnalisé', 'perso')); o.value = String(nz); o.textContent = `${Math.round(nz * 100)} %`; $('#zoom').value = String(nz); ctx.dessiner(); }
  }, { passive: false });
  $('#zoom').addEventListener('change', () => ctx.dessiner());
  for (const id of ['#voir-grille', '#voir-regles', '#voir-zones', '#aimant']) $(id).addEventListener('change', () => ctx.dessiner());
  addEventListener('resize', () => ctx.dessiner());
  return { dimensionner, dessiner, zoom: () => z, versScene };
}
const union = (bs) => { const x = Math.min(...bs.map((b) => b.x)), y = Math.min(...bs.map((b) => b.y)); return { x, y, w: Math.max(...bs.map((b) => b.x + b.w)) - x, h: Math.max(...bs.map((b) => b.y + b.h)) - y }; };
export { trouverEl, matriceEl };
