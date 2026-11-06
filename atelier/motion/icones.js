// Motion Studio · icônes de l'interface (SVG en ligne, trait 1,8 px, couleur du texte). Dessins originaux.
const P = {
  curseur: '<path d="M5 3l14 7-6 2-2 6z"/>',
  texte: '<path d="M5 6V4h14v2M12 4v16M9 20h6"/>',
  forme: '<rect x="4" y="4" width="10" height="10" rx="1"/><circle cx="15.5" cy="15.5" r="4.5"/>',
  image: '<rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.6"/><path d="M4 18l5-5 4 4 3-3 4 4"/>',
  effet: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18"/>',
  composant: '<path d="M12 3l3 3-3 3-3-3zM6 9l3 3-3 3-3-3zM18 9l3 3-3 3-3-3zM12 15l3 3-3 3-3-3z"/>',
  annuler: '<path d="M9 14L4 9l5-5"/><path d="M4 9h11a5 5 0 010 10h-3"/>',
  retablir: '<path d="M15 14l5-5-5-5"/><path d="M20 9H9a5 5 0 000 10h3"/>',
  lecture: '<path d="M7 5l12 7-12 7z" fill="currentColor"/>', pause: '<path d="M8 5v14M16 5v14" stroke-width="3"/>',
  rejouer: '<path d="M3 12a9 9 0 109-9 9.7 9.7 0 00-6.7 2.8L3 8"/><path d="M3 3v5h5"/>',
  oeil: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  oeilFerme: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" opacity=".35"/><path d="M4 4l16 16"/>',
  cadenas: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 018 0v4"/>',
  cadenasOuvert: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 017.5-2" opacity=".6"/>',
  monter: '<path d="M6 15l6-6 6 6"/>', descendre: '<path d="M6 9l6 6 6-6"/>',
  gauche: '<path d="M4 3v18"/><rect x="7" y="6" width="12" height="4" rx="1"/><rect x="7" y="14" width="7" height="4" rx="1"/>',
  centreH: '<path d="M12 3v18"/><rect x="5" y="6" width="14" height="4" rx="1"/><rect x="8" y="14" width="8" height="4" rx="1"/>',
  droite: '<path d="M20 3v18"/><rect x="5" y="6" width="12" height="4" rx="1"/><rect x="10" y="14" width="7" height="4" rx="1"/>',
  haut: '<path d="M3 4h18"/><rect x="6" y="7" width="4" height="12" rx="1"/><rect x="14" y="7" width="4" height="7" rx="1"/>',
  milieu: '<path d="M3 12h18"/><rect x="6" y="5" width="4" height="14" rx="1"/><rect x="14" y="8" width="4" height="8" rx="1"/>',
  bas: '<path d="M3 20h18"/><rect x="6" y="5" width="4" height="12" rx="1"/><rect x="14" y="10" width="4" height="7" rx="1"/>',
  premier: '<path d="M7 11l5-5 5 5M7 17l5-5 5 5"/>', avant: '<path d="M7 14l5-5 5 5"/>', arriere: '<path d="M7 10l5 5 5-5"/>', dernier: '<path d="M7 7l5 5 5-5M7 13l5 5 5-5"/>',
};
export const icone = (nom, taille = 18) => `<svg class="ico-svg" width="${taille}" height="${taille}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[nom] || ''}</svg>`;
// Remplace le contenu des éléments [data-icone] par l'icône (et garde leur texte éventuel après l'icône)
export function poserIcones(racine = document) { for (const e of racine.querySelectorAll('[data-icone]')) { if (e.querySelector('.ico-svg')) continue; e.insertAdjacentHTML('afterbegin', icone(e.dataset.icone, +e.dataset.taille || 18)); } }
