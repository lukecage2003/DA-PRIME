// Production › Visuels : détourage local d'une image (baguette magique, retrait du fond, gomme, restauration).
// Entièrement déterministe, sans IA : la baguette sélectionne les pixels contigus de couleur proche du point touché.
// L'original n'est jamais modifié : le résultat est enregistré comme nouvelle image transparente de la bibliothèque.
export function initDetourage({ el, bouton, info }) {
  async function ouvrir(ressource, { nom, enregistrer }) {
    const im = new Image(); im.src = ressource.href; await im.decode();
    const W = im.naturalWidth, H = im.naturalHeight, cv = el('canvas', { width: W, height: H, className: 'toile-detourage' }), g = cv.getContext('2d', { willReadFrequently: true });
    g.drawImage(im, 0, 0); const original = g.getImageData(0, 0, W, H), pile = [];
    let outil = 'baguette', tol = 32, rayon = Math.round(Math.max(W, H) / 60), appui = false;
    const memoriser = () => { pile.push(g.getImageData(0, 0, W, H)); if (pile.length > 20) pile.shift(); };
    // Remplissage par diffusion (pile explicite) : efface les pixels contigus proches de la couleur de départ
    function baguette(x0, y0, efface = true) {
      const d = g.getImageData(0, 0, W, H), p = d.data, i0 = (y0 * W + x0) * 4, [r0, g0, b0] = [p[i0], p[i0 + 1], p[i0 + 2]], t2 = tol * tol * 3, vu = new Uint8Array(W * H), s = [y0 * W + x0];
      while (s.length) { const k = s.pop(); if (vu[k]) continue; vu[k] = 1; const i = k * 4; if (p[i + 3] === 0 && efface) { /* déjà transparent : on continue la diffusion */ }
        else { const dr = p[i] - r0, dg = p[i + 1] - g0, db = p[i + 2] - b0; if (dr * dr + dg * dg + db * db > t2) continue; }
        p[i + 3] = 0; const x = k % W, y = (k / W) | 0; if (x > 0) s.push(k - 1); if (x < W - 1) s.push(k + 1); if (y > 0) s.push(k - W); if (y < H - 1) s.push(k + W); }
      g.putImageData(d, 0, 0);
    }
    function pinceau(x, y) {
      if (outil === 'gomme') { g.save(); g.globalCompositeOperation = 'destination-out'; g.beginPath(); g.arc(x, y, rayon, 0, 7); g.fill(); g.restore(); return; }
      const d = g.getImageData(0, 0, W, H); for (let yy = Math.max(0, y - rayon); yy < Math.min(H, y + rayon); yy++) for (let xx = Math.max(0, x - rayon); xx < Math.min(W, x + rayon); xx++) if ((xx - x) ** 2 + (yy - y) ** 2 <= rayon * rayon) { const i = (yy * W + xx) * 4; for (let c = 0; c < 4; c++) d.data[i + c] = original.data[i + c]; }
      g.putImageData(d, 0, 0);
    }
    const point = (ev) => { const b = cv.getBoundingClientRect(); return [Math.max(0, Math.min(W - 1, Math.round(((ev.clientX - b.left) / b.width) * W))), Math.max(0, Math.min(H - 1, Math.round(((ev.clientY - b.top) / b.height) * H)))]; };
    cv.addEventListener('pointerdown', (ev) => { ev.preventDefault(); memoriser(); const [x, y] = point(ev); if (outil === 'baguette') baguette(x, y); else { appui = true; cv.setPointerCapture(ev.pointerId); pinceau(x, y); } });
    cv.addEventListener('pointermove', (ev) => { if (appui) pinceau(...point(ev)); });
    cv.addEventListener('pointerup', () => { appui = false; });
    const choixOutil = (o) => bouton({ baguette: 'Baguette magique', gomme: 'Gomme', restaurer: 'Restaurer' }[o], () => { outil = o; outils.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.outil === o))); }, { dataset: { outil: o }, 'aria-pressed': String(o === outil) });
    const outils = el('div', { className: 'rangee' }, ...['baguette', 'gomme', 'restaurer'].map(choixOutil));
    const tolI = el('input', { type: 'range', min: 4, max: 120, value: tol, id: 'det-tolerance' }); tolI.addEventListener('input', () => { tol = +tolI.value; });
    const rayI = el('input', { type: 'range', min: 2, max: Math.round(Math.max(W, H) / 8), value: rayon }); rayI.addEventListener('input', () => { rayon = +rayI.value; });
    const dlg = el('dialog', { className: 'dialogue large detourage', 'aria-label': 'Détourer une image' });
    const fond = () => { memoriser(); for (const [x, y] of [[0, 0], [W - 1, 0], [0, H - 1], [W - 1, H - 1]]) baguette(x, y); info('Fond retiré depuis les quatre coins : vérifier les bords, affiner à la gomme ou restaurer.'); };
    dlg.append(el('div', { className: 'pile', style: 'padding:16px' },
      el('h2', { className: 'titre-section', textContent: 'Détourer' }),
      el('p', { className: 'note', textContent: 'Outil local et déterministe (sans IA) : la baguette efface les zones contiguës de couleur proche ; la gomme et la restauration affinent à la main. L\'original reste intact : le résultat devient une nouvelle image transparente.' }),
      outils, el('div', { className: 'grille2' }, el('label', { className: 'champ' }, 'Tolérance de la baguette', tolI), el('label', { className: 'champ' }, 'Taille du pinceau', rayI)),
      el('div', { className: 'cadre-detourage' }, cv),
      el('div', { className: 'rangee' }, bouton('Retirer le fond (coins)', fond, { id: 'det-fond' }), bouton('Annuler', () => { const x = pile.pop(); if (x) g.putImageData(x, 0, 0); }), bouton('Tout restaurer', () => { memoriser(); g.putImageData(original, 0, 0); }),
        bouton('Enregistrer l\'image détourée', async () => { const b = await new Promise((ok) => cv.toBlob(ok, 'image/png')); const f = new File([b], `${nom} (détouré).png`, { type: 'image/png' }); await enregistrer(f); dlg.close(); }, { className: 'accent', id: 'det-enregistrer' }),
        bouton('Fermer', () => dlg.close()))));
    document.body.append(dlg); dlg.addEventListener('close', () => dlg.remove()); dlg.showModal();
    return { dlg, baguette, fond };
  }
  return { ouvrir };
}
