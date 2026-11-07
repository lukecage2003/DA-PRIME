// FAUX llama-server pour vérifier la MÉCANIQUE du banc (reprise, schéma, notation). Réponses fabriquées : AUCUNE valeur de qualité.
// Contient volontairement une citation hors OCR et une identité non justifiée pour vérifier que le noteur les détecte.
import { createServer } from 'node:http';
let n = 0;
const sortie = (img) => ({ cases: [{ id: 'C1', ordre: 1, zone: { x: 0.05, y: 0.05, w: 0.9, h: 0.4 }, plan: 'moyen', angle: 'normal', lieu: 'street', certitude: 'probable' }],
  personnages: [{ id: 'PA', case: 'C1', zone: { x: 0.2, y: 0.2, w: 0.3, h: 0.6 }, description: 'man in a coat', expression: 'angry', posture: 'standing', identite_proposee: 'John Doe', justification_identite: null, classe: 'visible', certitude: 'probable' }],
  objets: [{ case: 'C1', nom: 'gun', zone: { x: 0.5, y: 0.4, w: 0.1, h: 0.1 }, tenu_par: 'PA', classe: 'visible', certitude: 'sur' }],
  actions: [{ case: 'C1', agent: 'PA', verbe: 'points at', cible: null, classe: 'interprete', certitude: 'probable' }],
  relations: [{ case: 'C1', sujet: 'PA', relation: 'tient', objet: 'gun', classe: 'visible', certitude: 'sur' }],
  bulles: [{ ocr: 'O1', nature: 'dialogue', locuteur: 'PA', indice: 'tail', classe: 'interprete', certitude: 'probable' }, { ocr: 'O999', locuteur: 'PA', classe: 'incertain' }],
  synthese: { faits: [{ texte: 'He says "I will destroy you all"', classe: 'deduit', sources: ['O1'] }] }, incertitudes: [img ? 'mock' : 'texte seul'] });
createServer((q, r) => { let b = ''; q.on('data', (d) => (b += d)); q.on('end', () => {
  if (q.url === '/props') return r.end(JSON.stringify({ build_info: 'FAUX-SERVEUR-TEST', model_path: 'aucun' }));
  const j = JSON.parse(b), img = JSON.stringify(j.messages).includes('image_url'); n++;
  setTimeout(() => r.end(JSON.stringify({ choices: [{ message: { content: JSON.stringify(sortie(img)) } }], usage: { prompt_tokens: 1, completion_tokens: 1 } })), 300);
}); }).listen(+process.argv[2] || 8091, '127.0.0.1', () => console.log('faux serveur prêt'));
