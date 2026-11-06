// DA-PRIME · Script Studio · architecture des moteurs locaux (module ES pur).
// Trois moteurs indépendants et remplaçables : OCR, vision des comics, rédaction. En 0.11.0, AUCUN moteur n'est installé :
// ce module décrit les adaptateurs, valide les adresses (locales uniquement), choisit un profil selon les capacités MESURÉES.
export const TYPES_MOTEURS = { ocr: 'OCR Engine', vision: 'Comic Vision Engine', ecriture: 'Local Writing Engine' };
export const MODES = { manuel: 'Manuel (toujours disponible)', navigateur: 'Dans ce navigateur', local: 'Service local sur ce PC', reseau: 'Serveur local sur le réseau' };
// Adaptateurs déclarés. « etat » : disponible | prevu (non installé dans cette version). Aucun n'exécute de modèle en 0.11.0.
export const ADAPTATEURS = {
  'ocr-manuel': { type: 'ocr', mode: 'manuel', nom: 'Transcription manuelle', etat: 'disponible' },
  'ocr-tesseract': { type: 'ocr', mode: 'navigateur', nom: 'Tesseract.js (fra, eng)', etat: 'prevu', licence: 'Apache-2.0', taille: '≈ 9 Mo', note: 'Prévu en 0.11.1 ; mesuré à 76-88 % des mots sur lettrage courant.' },
  'ocr-ollama': { type: 'ocr', mode: 'local', nom: 'OCR par modèle vision-langage (Ollama)', etat: 'prevu', note: 'Option pour lettrage stylisé (ex. MiniCPM-OCR).' },
  'vision-manuel': { type: 'vision', mode: 'manuel', nom: 'Description manuelle + découpe géométrique', etat: 'disponible' },
  'vision-ollama': { type: 'vision', mode: 'local', nom: 'Vision locale (Ollama : Qwen3-VL, MiniCPM-V)', etat: 'prevu', note: 'Prévu en 0.11.2.' },
  'ecriture-manuel': { type: 'ecriture', mode: 'manuel', nom: 'Rédaction par l\'auteur + Prompt Studio', etat: 'disponible' },
  'ecriture-ollama': { type: 'ecriture', mode: 'local', nom: 'Rédaction locale (Ollama : Qwen3, Mistral Small)', etat: 'prevu', note: 'Prévu en 0.11.3.' },
};
// Profils de configuration (recommandations, rien n'est téléchargé). Tailles indicatives (quantification 4 bits).
export const PROFILS = {
  mobile: { nom: 'Appareil mobile', description: 'Consultation, validation et édition ; aucun modèle lourd sur l\'appareil. Les moteurs tournent sur un PC du réseau.', ocr: 'ocr-manuel', vision: 'vision-manuel', ecriture: 'ecriture-manuel', delegue: true, modeles: [] },
  leger: { nom: 'Léger', description: 'PC sans GPU dédié ou peu de mémoire.', ocr: 'ocr-tesseract', vision: 'vision-ollama', ecriture: 'ecriture-ollama', modeles: [['vision', 'MiniCPM-V 4.7 1B ou Qwen3-VL-2B', 1.5], ['ecriture', 'Qwen3-4B', 2.6]] },
  standard: { nom: 'Standard', description: 'PC avec GPU 8 Go ou 16 Go de mémoire.', ocr: 'ocr-tesseract', vision: 'vision-ollama', ecriture: 'ecriture-ollama', modeles: [['ocr', 'MiniCPM-OCR 1.0 (option)', 1.2], ['vision', 'Qwen3-VL-4B', 3.5], ['ecriture', 'Qwen3-8B', 5.2]] },
  qualite: { nom: 'Qualité', description: 'PC avec GPU 16 à 24 Go et 32 Go de mémoire.', ocr: 'ocr-tesseract', vision: 'vision-ollama', ecriture: 'ecriture-ollama', modeles: [['vision', 'Qwen3-VL-8B', 6], ['ecriture', 'Mistral Small 24B', 14]] },
};
// Adresses autorisées pour un moteur : boucle locale, réseau privé, noms .local — jamais Internet
export function adresseLocale(url) {
  let u; try { u = new URL(url); } catch { return { ok: false, raison: 'adresse invalide' }; }
  if (!/^https?:$/.test(u.protocol)) return { ok: false, raison: 'protocole non pris en charge' };
  const h = u.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  const prive = h === 'localhost' || h.endsWith('.local') || h === '::1' || /^127\./.test(h) || /^10\./.test(h) || /^192\.168\./.test(h) || /^172\.(1[6-9]|2\d|3[01])\./.test(h) || /^169\.254\./.test(h) || /^f[cd][0-9a-f]{2}:/.test(h) || /^fe80:/.test(h);
  return prive ? { ok: true, hote: h, boucle: h === 'localhost' || h === '::1' || /^127\./.test(h) } : { ok: false, raison: 'adresse publique refusée : les moteurs doivent rester sur ce PC ou le réseau local' };
}
// Profil recommandé à partir de capacités mesurées ; une valeur inconnue n'est jamais supposée : elle fait baisser le profil
export function profilRecommande(c = {}) {
  const raisons = [];
  if (c.mobile) return { profil: 'mobile', raisons: ['appareil mobile détecté'] };
  const ram = c.serveur?.ramGo ?? c.ramGo ?? null, vram = c.serveur?.vramGo ?? null, coeurs = c.serveur?.coeurs ?? c.coeurs ?? null;
  if (ram === null) raisons.push('mémoire inconnue'); if (vram === null) raisons.push('mémoire vidéo inconnue (non mesurable depuis le navigateur)');
  if (vram !== null && vram >= 16 && ram >= 32) return { profil: 'qualite', raisons: [`GPU ${vram} Go, RAM ${ram} Go`] };
  if ((vram !== null && vram >= 8 && ram >= 16) || (ram !== null && ram >= 16 && (coeurs ?? 0) >= 8)) return { profil: 'standard', raisons: [vram !== null ? `GPU ${vram} Go` : 'sans GPU mesuré', `RAM ${ram} Go`, ...(coeurs ? [`${coeurs} cœurs`] : [])] };
  return { profil: 'leger', raisons: raisons.length ? raisons : [`RAM ${ram} Go`] };
}
// Estimation de l'espace nécessaire pour un profil
export const espaceProfil = (id) => (PROFILS[id]?.modeles || []).reduce((t, [, , go]) => t + go, 0);
export const REGLAGES0 = { id: 'moteurs', profil: null, choisi: false, adaptateurs: { ocr: 'ocr-manuel', vision: 'vision-manuel', ecriture: 'ecriture-manuel' }, ollama: 'http://localhost:11434', serveur: '', jeton: '' };
