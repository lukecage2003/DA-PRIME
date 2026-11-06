// Motion Studio · séquenceur : une piste par calque, barres d'entrée et de sortie à faire glisser (délai) ou étirer (durée),
// tête de lecture déplaçable. Volontairement plus simple qu'une timeline de montage.
import { S, modifier, selectionner } from './etat.js';

export function initSequenceur(ctx) {
  const zone = document.querySelector('#pistes');
  let geste = null;
  const D = () => S.doc.duree, pct = (v) => `${(Math.max(0, Math.min(D(), v)) / D()) * 100}%`;
  function construire() {
    const lignes = []; const vis = (els, prof) => [...els].reverse().forEach((e) => { lignes.push([e, prof]); if (e.enfants && S.sel.some((id) => id === e.id || e.enfants.some((c) => c.id === id))) vis(e.enfants, prof + 1); });
    vis(S.doc.elements, 0);
    const regle = document.createElement('div'); regle.className = 'piste'; regle.innerHTML = `<span class="nom-piste">Temps</span><div class="rail regle-temps" data-regle="1">${Array.from({ length: Math.floor(D()) + 1 }, (_, i) => `<span style="position:absolute;left:${(i / D()) * 100}%;font-size:10px;color:#8c8a80;top:3px">${i}s</span>`).join('')}<div class="tete-lecture"></div></div>`;
    zone.replaceChildren(regle, ...lignes.slice(0, 80).map(([e, prof]) => {
      const a = e.anim, r = document.createElement('div'); r.className = 'piste'; r.dataset.id = e.id; r.dataset.actif = String(S.sel.includes(e.id));
      const n = document.createElement('button'); n.type = 'button'; n.className = 'nom-piste'; n.textContent = e.nom; n.style.paddingLeft = 4 + prof * 12 + 'px'; n.addEventListener('click', (ev) => selectionner(e.id, ev.shiftKey));
      const rail = document.createElement('div'); rail.className = 'rail'; rail.dataset.id = e.id;
      if (a.boucle.type !== 'aucune') rail.insertAdjacentHTML('beforeend', `<div class="barre-anim boucle" style="left:${pct(a.boucle.delai)};right:0" title="Boucle : ${a.boucle.type}"></div>`);
      if (a.entree.type !== 'aucune') rail.insertAdjacentHTML('beforeend', `<div class="barre-anim entree" data-barre="entree" style="left:${pct(a.entree.delai)};width:${pct(a.entree.duree)}" title="Entrée : ${a.entree.type} (${a.entree.delai} s, ${a.entree.duree} s)"><span class="bord" data-bord="1"></span></div>`);
      if (a.sortie.type !== 'aucune') rail.insertAdjacentHTML('beforeend', `<div class="barre-anim sortie" data-barre="sortie" style="left:${pct(D() - a.sortie.avance - a.sortie.duree)};width:${pct(a.sortie.duree)}" title="Sortie : ${a.sortie.type}"><span class="bord" data-bord="1"></span></div>`);
      rail.insertAdjacentHTML('beforeend', '<div class="tete-lecture"></div>');
      r.append(n, rail); return r;
    }));
    tete();
  }
  function tete() { for (const t of zone.querySelectorAll('.tete-lecture')) t.style.left = pct(ctx.local()); }
  zone.addEventListener('pointerdown', (ev) => {
    const rail = ev.target.closest('.rail'); if (!rail) return; const r = rail.getBoundingClientRect(), barre = ev.target.closest('[data-barre]');
    if (barre) { const e = (function f(l) { for (const x of l) { if (x.id === rail.dataset.id) return x; if (x.enfants) { const c = f(x.enfants); if (c) return c; } } })(S.doc.elements);
      if (!S.sel.includes(e.id)) selectionner(e.id);
      geste = { e, quoi: barre.dataset.barre, bord: !!ev.target.dataset.bord, x0: ev.clientX, w: r.width, o: { ...e.anim[barre.dataset.barre] }, cle: 's' + Date.now() }; rail.setPointerCapture(ev.pointerId); ev.preventDefault(); return; }
    geste = { tete: true, r }; rail.setPointerCapture(ev.pointerId); ctx.positionner(ctx.debut() + ((ev.clientX - r.left) / r.width) * D());
  });
  zone.addEventListener('pointermove', (ev) => {
    if (!geste) return; if (geste.tete) return ctx.positionner(ctx.debut() + ((ev.clientX - geste.r.left) / geste.r.width) * D());
    const dt = ((ev.clientX - geste.x0) / geste.w) * D(), arr = (v) => Math.round(v * 20) / 20, { e, quoi, o } = geste;
    modifier(() => { const a = e.anim[quoi]; if (quoi === 'entree') { if (geste.bord) a.duree = Math.max(0.05, arr(o.duree + dt)); else a.delai = Math.max(0, arr(o.delai + dt)); }
      else { if (geste.bord) { a.avance = Math.max(0, arr(o.avance - dt)); } else a.avance = Math.max(0, arr(o.avance - dt)); } }, geste.cle);
  });
  for (const t of ['pointerup', 'pointercancel']) zone.addEventListener(t, () => { geste = null; });
  return { construire, tete };
}
