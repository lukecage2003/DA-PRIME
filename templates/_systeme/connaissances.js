// DA-PRIME · Script Studio · base de connaissances sourcée (module ES pur, Node et navigateur).
// Une ASSERTION = une information traçable : contenu, catégorie, numéro, page, case, méthode d'extraction, confiance,
// statut de validation humaine et historique. Les moteurs futurs (OCR, vision, rédaction) n'y écriront qu'en « à vérifier ».

export const CATEGORIES = { dialogue: 'Dialogue extrait', narration: 'Narration (cartouche)', visuel: 'Élément visuel observable', interpretation: 'Interprétation', hypothese: 'Hypothèse', incertain: 'Information incertaine', texte: 'Texte relevé (OCR, nature à préciser)' };
export const STATUTS = { brouillon: 'Brouillon', 'a-verifier': 'À vérifier', valide: 'Validée', rejete: 'Rejetée' };
// Méthodes : « manuel » (saisie humaine), « migration » (reprise des données 0.10), puis moteurs : « ocr:… », « vision:… », « ecriture:… »
export const METHODES = { manuel: 'Saisie manuelle', migration: 'Reprise 0.10 (saisie manuelle)', geometrie: 'Détection géométrique', 'ocr:tesseract-fast': 'OCR local (Tesseract, modèle fast)' };
// Catégories admises comme faits dans un script final (une interprétation reste formulée comme telle)
export const FAITS = ['dialogue', 'narration', 'visuel'];
export const AUTORISEES_SCRIPT = [...FAITS, 'interpretation'];

const PROV_VERS_CAT = { dialogue: 'dialogue', visuel: 'visuel', interpretation: 'interpretation', incertain: 'incertain', source: 'interpretation' };
const TYPE_TEXTE_VERS_CAT = { dialogue: 'dialogue', pensee: 'dialogue', cartouche: 'narration', onomatopee: 'visuel', texte: 'visuel' };
const sansAccents = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
export const empreinteContenu = (s) => { let h = 2166136261; for (const c of sansAccents(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return (h >>> 0).toString(36); };

export function normaliser(a) {
  const cat = CATEGORIES[a.categorie] ? a.categorie : 'incertain', st = STATUTS[a.statut] ? a.statut : 'a-verifier';
  return { id: String(a.id), contenu: String(a.contenu ?? ''), categorie: cat, comic: a.comic || null, page: Number.isFinite(+a.page) && +a.page > 0 ? +a.page : null, case: Number.isFinite(+a.case) && +a.case > 0 ? +a.case : null,
    zone: a.zone || null, personnage: a.personnage || '', methode: a.methode || 'manuel', moteur: a.moteur || null, confiance: Math.max(0, Math.min(1, a.confiance ?? (['manuel', 'migration'].includes(a.methode || 'manuel') ? 1 : 0.5))),
    statut: st, origine: a.origine || null, empreinte: a.empreinte || empreinteContenu(a.contenu), deriveDe: a.deriveDe || [], historique: a.historique || [], cree: a.cree || Date.now(), modifie: a.modifie || Date.now(),
    importance: a.importance || 2, fonction: a.fonction || '', revelation: !!a.revelation, flashback: !!a.flashback, note: a.note || '', ...(a.ocr ? { ocr: a.ocr } : {}) };
}
// Changement de statut tracé ; une validation ne vaut que pour un contenu donné (empreinte)
export function changerStatut(a, statut, { par = 'utilisateur', motif = '' } = {}) {
  if (!STATUTS[statut]) throw new Error(`statut inconnu : ${statut}`);
  if (statut === 'valide' && !String(a.contenu).trim()) throw new Error('impossible de valider une information vide');
  if (a.statut === statut) return a;
  a.historique = [...(a.historique || []), { date: Date.now(), de: a.statut, vers: statut, par, motif, empreinte: a.empreinte }]; a.statut = statut; a.modifie = Date.now(); return a;
}
// Modification du contenu : une information validée redevient « à vérifier » (la validation portait sur l'ancien texte)
export function modifierContenu(a, contenu, { par = 'utilisateur' } = {}) {
  const e = empreinteContenu(contenu); if (e === a.empreinte) { a.contenu = contenu; return a; }
  const avant = a.statut, ancien = a.contenu; a.contenu = contenu; a.empreinte = e; a.modifie = Date.now();
  // Chaque correction garde l'ancien texte dans l'historique (le résultat OCR initial reste aussi dans a.ocr.texteBrut)
  const trace = (vers, motif) => { a.statut = vers; a.historique = [...(a.historique || []), { date: Date.now(), de: avant, vers, par, motif, empreinte: e, ancien }]; };
  // Un contenu vidé redevient brouillon ; un brouillon qui reçoit un contenu passe « à vérifier » (sinon il ne pourrait jamais être validé)
  if (!String(contenu).trim()) { trace(avant === 'rejete' ? 'rejete' : 'brouillon', 'contenu vidé'); }
  else if (avant === 'valide') trace('a-verifier', 'contenu modifié après validation');
  else if (avant === 'brouillon') trace('a-verifier', 'contenu renseigné');
  else trace(avant, 'texte corrigé');
  return a;
}

// Migration 0.10 → 0.11 : transcriptions et événements deviennent des assertions (identifiants stables, idempotent).
// Une validation existante (case « Événements » cochée) est conservée ; un texte « illisible » reste incertain.
export function assertionsDepuisComic(c, pages = []) {
  const out = [], valide = !!c.validation?.evenements;
  (c.analyse?.evenements || []).forEach((e) => out.push(normaliser({ id: `ev:${e.id}`, contenu: e.texte, categorie: PROV_VERS_CAT[e.provenance] || 'incertain', comic: c.id, page: e.page, case: e.case, methode: 'migration', statut: !String(e.texte || '').trim() ? 'brouillon' : e.provenance === 'incertain' ? 'a-verifier' : valide ? 'valide' : 'a-verifier', origine: { genre: 'evenement', id: e.id }, importance: e.importance, fonction: e.fonction, revelation: e.revelation, flashback: e.flashback })));
  pages.forEach((p) => (p.transcriptions || []).forEach((t) => { const illisible = t.statut === 'illisible';
    out.push(normaliser({ id: `tx:${t.id}`, contenu: t.texte, categorie: illisible || t.statut === 'incertain' ? 'incertain' : TYPE_TEXTE_VERS_CAT[t.type] || 'dialogue', comic: c.id, page: (p.index ?? 0) + 1, case: t.case, personnage: t.personnage, methode: 'migration', confiance: illisible ? 0 : t.statut === 'incertain' ? 0.5 : 1, statut: !String(t.texte || '').trim() ? 'brouillon' : 'a-verifier', origine: { genre: 'transcription', id: t.id, pageId: p.id } })); }));
  (c.analyse?.personnages || []).forEach((x, i) => { if (String(x.nom || '').trim()) out.push(normaliser({ id: `pe:${c.id}:${sansAccents(x.nom)}`, contenu: `Personnage présent : ${x.nom}${x.role ? ` (${x.role})` : ''}`, categorie: PROV_VERS_CAT[x.provenance] || 'incertain', comic: c.id, methode: 'migration', statut: c.validation?.personnages && x.provenance !== 'incertain' ? 'valide' : 'a-verifier', origine: { genre: 'personnage', index: i }, personnage: x.nom })); });
  return out;
}
// Synchronisation : les sources manuelles (transcriptions, événements) restent éditables dans l'interface 0.10 ;
// la base garde statut et historique, et détecte les contenus modifiés depuis la validation.
export function synchroniser(existantes, nouvelles) {
  const par = new Map(existantes.map((a) => [a.id, a])), out = [], vues = new Set();
  for (const n of nouvelles) { const a = par.get(n.id); vues.add(n.id);
    if (!a) { out.push({ action: 'ajout', assertion: n }); continue; }
    const m = { ...a, categorie: n.categorie, page: n.page, case: n.case, personnage: n.personnage, importance: n.importance, fonction: n.fonction, revelation: n.revelation, flashback: n.flashback };
    if (n.empreinte !== a.empreinte) { modifierContenu(m, n.contenu, { par: 'synchronisation' }); out.push({ action: 'modif', assertion: m }); }
    else if (JSON.stringify([m.categorie, m.page, m.case, m.personnage, m.importance, m.fonction]) !== JSON.stringify([a.categorie, a.page, a.case, a.personnage, a.importance, a.fonction])) out.push({ action: 'maj', assertion: m }); }
  for (const a of existantes) if (!vues.has(a.id) && a.origine && a.methode !== 'manuel' && ['evenement', 'transcription', 'personnage'].includes(a.origine.genre)) out.push({ action: 'orpheline', assertion: { ...a } });
  return out;
}
export function filtrer(as, { comic, categorie, statut, page, texte } = {}) {
  const q = sansAccents(texte || '');
  return as.filter((a) => (!comic || a.comic === comic) && (!categorie || a.categorie === categorie) && (!statut || a.statut === statut) && (!page || a.page === +page) && (!q || sansAccents(`${a.contenu} ${a.personnage}`).includes(q)));
}
export function statistiques(as) {
  const s = { total: as.length, parStatut: {}, parCategorie: {}, parMethode: {} };
  for (const a of as) { s.parStatut[a.statut] = (s.parStatut[a.statut] || 0) + 1; s.parCategorie[a.categorie] = (s.parCategorie[a.categorie] || 0) + 1; const m = a.methode.split(':')[0]; s.parMethode[m] = (s.parMethode[m] || 0) + 1; }
  return s;
}
// Matière pour un script : uniquement des assertions validées et de catégorie admise, références conservées
export function pointsPourScript(as, ordreComics = []) {
  const rang = new Map(ordreComics.map((id, i) => [id, i]));
  return as.filter((a) => a.statut === 'valide' && AUTORISEES_SCRIPT.includes(a.categorie) && !['transcription', 'personnage', 'ocr'].includes(a.origine?.genre))
    .map((a) => ({ id: `pt:${a.id}`, cle: a.origine?.id || a.id, assertion: a.id, texte: a.contenu, importance: a.importance || 2, provenance: a.categorie === 'interpretation' ? 'interpretation' : a.categorie === 'dialogue' || a.categorie === 'narration' ? 'dialogue' : 'visuel', fonction: a.fonction, ordre: (rang.get(a.comic) ?? 99) * 1000 + (a.page || 0) * 10 + (a.case || 0), ref: { comic: a.comic, page: a.page, case: a.case } }))
    .sort((x, y) => x.ordre - y.ordre);
}
// Contrôle avant export final : toute matière du script doit renvoyer à une assertion encore validée
export function controlerScript(projet, as) {
  const par = new Map(as.map((a) => [a.id, a])), problemes = [];
  for (const pt of projet.points || []) {
    // Points repris en 0.10 (sans lien « assertion ») : leur clé est l'identifiant de l'événement source (ev:<clé>)
    const id = pt.assertion || (pt.ref?.comic && pt.cle ? `ev:${pt.cle}` : null); if (!id) continue; const a = par.get(id);
    if (!a) problemes.push({ point: pt.id, gravite: 'bloquant', message: `« ${pt.texte.slice(0, 60)} » : information source introuvable (supprimée).` });
    else if (a.statut !== 'valide') problemes.push({ point: pt.id, gravite: 'bloquant', message: `« ${pt.texte.slice(0, 60)} » : information source ${STATUTS[a.statut].toLowerCase()} — ne peut pas figurer comme fait.` });
    else if (!AUTORISEES_SCRIPT.includes(a.categorie)) problemes.push({ point: pt.id, gravite: 'bloquant', message: `« ${pt.texte.slice(0, 60)} » : ${CATEGORIES[a.categorie].toLowerCase()} exclue d'un script final.` });
    else if (a.categorie === 'interpretation') problemes.push({ point: pt.id, gravite: 'info', message: `« ${pt.texte.slice(0, 60)} » : interprétation, à formuler comme telle.` }); }
  return { problemes, bloquants: problemes.filter((p) => p.gravite === 'bloquant').length };
}
