// Primestone · registre unique des supports : chaque collection associe un format et ses gabarits.
// Utilisé par le moteur (recherche d'un gabarit), la génération des fichiers et l'Atelier (navigation).
import FAMILLES from './familles.js';
import KIOSQUE from './kiosque.js';
import INFOGRAPHIES from './infographies.js';

export const COLLECTIONS = [
  { id: 'miniatures', nom: 'Miniatures YouTube', format: 'miniature', prefixe: 'MIN', gabarits: FAMILLES, etiquette: (id, g) => `${id.slice(0, 2)} · ${g.nom}`, planche: 168 },
  { id: 'kiosque', nom: 'Kiosque', format: 'carrousel', prefixe: 'CAR', gabarits: KIOSQUE, etiquette: (id, g) => { const n = g.nom.replace(/^Carrousel · /, ''); return n.charAt(0).toUpperCase() + n.slice(1); }, planche: 360 },
  { id: 'infographies', nom: 'Infographies', format: 'infographie', prefixe: 'INFO', gabarits: INFOGRAPHIES, etiquette: (id, g) => g.nom, planche: null },
];
export function trouver(id) {
  for (const c of COLLECTIONS) if (c.gabarits[id]) return { collection: c, gabarit: c.gabarits[id] };
  return null;
}
