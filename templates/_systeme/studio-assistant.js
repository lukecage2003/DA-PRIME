// Primestone · assistant éditorial LOCAL (règles et vocabulaire, aucune IA externe, aucun envoi de données).
// Il lit une demande en français, en déduit le type de création, les personnages, les formats, l'ambiance et un éventuel
// projet de campagne, propose des titres (formulations, jamais des faits) et signale ce qui manque ou reste à vérifier.
import { PERSONNAGES, personnagesDans, sans, trouverPersonnage } from './studio-personnages.js';

export const TYPES = {
  versus: { nom: 'Versus', mise: 'duel', min: 2 }, equipes: { nom: 'Affrontement d\'équipes', mise: 'equipes', min: 3 }, comparaison: { nom: 'Comparaison de pouvoirs', mise: 'duel', min: 2 },
  versions: { nom: 'Versions alternatives', mise: 'duel', min: 1 }, hypothese: { nom: 'Affrontement hypothétique', mise: 'duel', min: 2 },
  portrait: { nom: 'Portrait', mise: 'heros', min: 1 }, presentation: { nom: 'Présentation de personnage', mise: 'heros', min: 1 }, origine: { nom: 'Origine', mise: 'heros-repere', min: 1, faits: true },
  premiere: { nom: 'Première apparition', mise: 'heros-repere', min: 1, faits: true }, evolution: { nom: 'Évolution', mise: 'heros-repere', min: 1, faits: true }, retrospective: { nom: 'Rétrospective', mise: 'heros-repere', min: 1, faits: true },
  analyse: { nom: 'Analyse', mise: 'une', min: 0 }, critique: { nom: 'Critique', mise: 'une', min: 0 }, actualite: { nom: 'Actualité', mise: 'une', min: 0, faits: true }, createur: { nom: 'Présentation de créateur', mise: 'une', min: 0, faits: true },
  annonce: { nom: 'Annonce de série', mise: 'annonce', min: 0, faits: true }, recommandation: { nom: 'Recommandation', mise: 'annonce', min: 0 },
  evenement: { nom: 'Événement', mise: 'evenement', min: 0 }, crossover: { nom: 'Crossover', mise: 'evenement', min: 2 },
  chronologie: { nom: 'Chronologie', mise: 'liste', min: 0, faits: true }, classement: { nom: 'Classement', mise: 'liste', min: 0 }, selection: { nom: 'Sélection', mise: 'liste', min: 0 },
  cosmique: { nom: 'Hiérarchie cosmique', mise: 'liste', min: 0 }, faction: { nom: 'Faction ou univers', mise: 'liste', min: 0 },
  quiz: { nom: 'Quiz', mise: 'question', min: 0 }, debat: { nom: 'Débat', mise: 'question', min: 0 }, citation: { nom: 'Citation', mise: 'citation', min: 0 },
};
export const FORMATS_ASSISTANT = { miniature: 'Miniature YouTube', '4:5': 'Publication Instagram', carrousel: 'Carrousel', '9:16': 'Story ou vertical', '1:1': 'Carré', affiche: 'Affiche', '16:9': 'Vidéo 16:9' };
const MOIS = ['janvier', 'fevrier', 'mars', 'avril', 'mai', 'juin', 'juillet', 'aout', 'septembre', 'octobre', 'novembre', 'decembre'];
// Mots déclencheurs du type (testés dans l'ordre : le plus spécifique d'abord)
const REGLES = [
  ['equipes', /\b(equipes?|teams?)\b.*\b(vs|versus|contre|face)\b|\b(vs|versus|contre)\b.*\bequipes?\b/], ['comparaison', /compar\w*.*pouvoirs?|pouvoirs?.*compar/], ['versions', /\bversions?\b|alternatives?|variantes? de/],
  ['hypothese', /hypothetique|et si\b|qui gagnerait/], ['versus', /\b(vs|versus|contre|face a|affrontement|duel|combat)\b/], ['crossover', /crossover/], ['evenement', /evenements?|\bevent\b|saga/],
  ['premiere', /premiere apparition/], ['origine', /origines?/], ['evolution', /evolution/], ['retrospective', /retrospective|anniversaire|histoire de/],
  ['chronologie', /chronologie|ordre de lecture|timeline/], ['classement', /classement|\btop ?\d+|les \d+ (meilleurs|plus)/], ['selection', /selection|meilleur/], ['recommandation', /recommand|a lire|par ou commencer/],
  ['quiz', /quiz|devine/], ['debat', /debat|qui a raison|pour ou contre/], ['citation', /citation|\bquote\b/], ['createur', /createur|auteur|dessinat|scenariste|artiste/],
  ['cosmique', /hierarchie|entites cosmiques|puissances cosmiques/], ['faction', /faction|organisation|univers de/], ['critique', /critique|avis|note/], ['analyse', /analyse|decryptage|pourquoi/],
  ['actualite', /actu|news|vient d.etre annonce|retour d/], ['annonce', /nouvelle serie|annonce|lancement|nouveau comic/], ['presentation', /presentation|fiche|presente/], ['portrait', /portrait/],
];
const UNIV = [['cosmique', /cosmi|espace|galax|stell/], ['urbain', /urbain|ville|nuit|rue|noir et/], ['mystique', /mystique|magi|sorcel|occulte/], ['techno', /techno|armure|robot|cyber/]];
// Mots en capitale qui ne sont pas des personnages
const EXCLUS = new Set(['fais', 'fait', 'prepare', 'cree', 'creer', 'transforme', 'une', 'un', 'le', 'la', 'les', 'des', 'de', 'du', 'et', 'sur', 'pour', 'instagram', 'youtube', 'tiktok', 'marvel', 'dc', 'image', 'comics', 'moi', 'tout', 'chaque', 'affiche', 'miniature', 'story', 'carrousel', 'publication', 'campagne', 'semaine', 'mois', 'vs', 'versus', 'contre', ...MOIS]);

function prochainMois(m, ref) { const y = ref.getMonth() > m || (ref.getMonth() === m && ref.getDate() > 1) ? ref.getFullYear() + 1 : ref.getFullYear(); return new Date(Date.UTC(y, m, 1)); }
const iso = (d) => d.toISOString().slice(0, 10);
const plus = (d, n) => new Date(d.getTime() + n * 86400000);

export function analyser(texte, { ref = new Date() } = {}) {
  const brut = String(texte || '').trim(), t = sans(brut), res = { demande: brut, type: 'portrait', personnages: [], formats: [], anime: /anim|motion|video|gif|reels/.test(t), univers: null, manques: [], verifier: [], campagne: null, titres: [], sousTitre: '', confiance: 0 };
  for (const [ty, re] of REGLES) if (re.test(t)) { res.type = ty; res.confiance++; break; }
  // Personnages : base locale, puis noms propres restants (« entre X et Y », « X vs Y », mots en capitale)
  const connus = personnagesDans(brut); res.personnages = connus.map((p) => p.nom);
  const m = brut.match(/entre\s+(.+?)\s+et\s+(.+?)(?:[.,!?]|$)/i) || brut.match(/(\S.+?)\s+(?:vs\.?|versus|contre)\s+(.+?)(?:[.,!?]|$)/i);
  if (m) for (const n of [m[1], m[2]]) { const c = n.replace(/^(un|une|le|la|les|fais|fais-moi|moi|un vs|vs)\s+/gi, '').replace(/^.*\b(vs|entre)\s+/i, '').trim(); if (c && !res.personnages.some((p) => sans(p) === sans(c)) && c.split(/\s+/).length <= 4) res.personnages.push(c.replace(/\s+(en|pour|sur|au|dans)\s.*$/i, '')); }
  if (!res.personnages.length) { const caps = [...brut.matchAll(/(?:^|[\s«"(])([A-ZÉÈÀÂÎÔÛÇ][\wÀ-ÿ'-]+(?:\s+[A-ZÉÈÀÂÎÔÛÇ][\wÀ-ÿ'-]+)*)/g)].map((x) => x[1]).filter((n, i) => !EXCLUS.has(sans(n)) && !(i === 0 && brut.startsWith(n))); if (caps.length) res.personnages.push(...caps.slice(0, 4)); }
  res.personnages = [...new Set(res.personnages)].slice(0, 6);
  // Formats
  const F = [['carrousel', /carrousel|carousel/], ['miniature', /miniature|youtube|vignette/], ['9:16', /story|stories|reels|tiktok|vertical|short/], ['affiche', /affiche|poster/], ['4:5', /instagram|publication|post\b/], ['1:1', /carre/]];
  for (const [f, re] of F) if (re.test(t)) res.formats.push(f);
  if (!res.formats.length) res.formats.push('miniature');
  // Ambiance : demande explicite, sinon celle du premier personnage connu
  res.univers = (UNIV.find(([, re]) => re.test(t)) || [])[0] || connus[0]?.univers || (res.type === 'cosmique' ? 'cosmique' : 'urbain');
  // Campagne : période, rythme, thème
  const moisIdx = MOIS.findIndex((x) => new RegExp(`\\b${x}\\b`).test(t)), semaine = /semaine/.test(t), serie = /serie de publications|campagne|calendrier|chaque jour|tous les jours|prepare tout|\bmois\b/.test(t);
  if ((moisIdx >= 0 && serie) || semaine || /chaque jour|serie de publications|campagne/.test(t)) {
    const debut = moisIdx >= 0 ? prochainMois(moisIdx, ref) : plus(new Date(Date.UTC(ref.getFullYear(), ref.getMonth(), ref.getDate())), ((8 - ref.getDay()) % 7) || 7);
    const jours = moisIdx >= 0 ? new Date(Date.UTC(debut.getUTCFullYear(), moisIdx + 1, 0)).getUTCDate() : semaine ? 7 : +(t.match(/(\d+) (publications|posts)/)?.[1] || 10);
    const filtre = /noirs?\b/.test(t) && /hero|heroine/.test(t) ? { tag: 'noir' } : /cosmique/.test(t) ? { tag: 'cosmique' } : /antagonistes?|vilains?|mechants?/.test(t) ? { tag: 'vilain' } : /\bdc\b/.test(t) ? { editeur: 'DC' } : /marvel/.test(t) && !connus.length ? { editeur: 'Marvel' } : connus.length === 1 ? { personnage: connus[0].nom } : null;
    res.campagne = planifierCampagne({ theme: brut, debut: iso(debut), jours, filtre, formats: res.formats, type: res.type });
    res.type = 'campagne';
  }
  // Titres proposés (formulations éditoriales, sans affirmation factuelle)
  const [A, B] = res.personnages;
  res.titres = titresPour(res.type, A, B);
  res.sousTitre = { versus: 'Le face-à-face', comparaison: 'Pouvoirs face à face', origine: 'Aux origines du mythe', premiere: 'Première apparition', evolution: 'Une évolution en images', presentation: 'Fiche personnage', portrait: 'Portrait', annonce: 'Nouvelle série', evenement: 'L\'événement', crossover: 'Crossover', chronologie: 'Ordre de lecture', classement: 'Le classement', citation: 'Citation', quiz: 'Quiz', debat: 'Le débat' }[res.type] || '';
  // Manques et vérifications
  const ty = TYPES[res.type];
  if (ty && res.personnages.length < ty.min) res.manques.push(ty.min >= 2 ? `Préciser ${ty.min} protagonistes (ex. « entre X et Y »).` : 'Préciser le personnage ou le sujet.');
  if (ty?.faits) res.verifier.push('Les faits (dates, numéros, créateurs, événements) ne sont pas inventés : les fournir ou les vérifier avant publication.');
  res.personnages.filter((n) => !trouverPersonnage(n)).forEach((n) => res.verifier.push(`« ${n} » ne figure pas dans la base locale : ambiance choisie par défaut, à ajuster.`));
  if (ty && !ty.min && !res.personnages.length && ['actualite', 'annonce', 'analyse', 'critique', 'createur'].includes(res.type)) res.manques.push('Préciser le personnage, la série ou le sujet (le nom sera utilisé tel quel).');
  if (/transforme|decline|adapte/.test(t) && /cette|ce visuel|cette miniature|cette creation/.test(t)) { res.declinaison = true; const cible = res.formats.filter((f) => f !== 'miniature'); res.formats = cible.length ? (cible.includes('carrousel') ? ['carrousel'] : cible) : ['4:5']; res.manques = res.manques.filter((x) => !x.startsWith('Préciser')); }
  return res;
}
export function titresPour(type, A = 'Le héros', B = 'son rival') {
  const T = {
    versus: [`${A} vs ${B}`, `${A} contre ${B} : qui l'emporte ?`, 'Le duel impossible'], hypothese: [`Et si ${A} affrontait ${B} ?`, `${A} vs ${B}`, 'Le combat qui n\'a jamais eu lieu'],
    comparaison: [`${A} vs ${B} : les pouvoirs`, 'Qui est le plus puissant ?', `${A} face à ${B}`], versions: [`Les visages de ${A}`, `${A} : toutes les versions`, 'Un héros, mille versions'],
    equipes: ['Le choc des équipes', 'Qui l\'emporte ?', 'Affrontement total'], portrait: [A, `Qui est ${A} ?`, `${A}, l'icône`], presentation: [A, `Qui est ${A} ?`, `Dossier : ${A}`],
    origine: [`Les origines de ${A}`, `D'où vient ${A} ?`, `${A} : aux sources du mythe`], premiere: [`La première apparition de ${A}`, `${A} : là où tout commence`, `Le jour où ${A} est apparu`],
    evolution: [`L'évolution de ${A}`, `${A} à travers les époques`, `${A} : une transformation`], retrospective: [`${A} : rétrospective`, `L'histoire de ${A}`, 'Les grandes heures'],
    analyse: [A ? `Pourquoi ${A} fascine` : 'Le décryptage', 'Analyse', 'Ce qu\'il faut comprendre'], critique: ['Notre critique', A ? `${A} : notre avis` : 'Faut-il le lire ?', 'Le verdict'],
    actualite: [A ? `${A} : le retour` : 'Le retour', 'C\'est officiel', 'Ce qu\'il faut savoir'], annonce: [A ? `${A} revient` : 'Nouvelle série', 'Bientôt', 'Ça commence'],
    evenement: [A ? `${A} : l'événement` : 'L\'événement', 'Tout va changer', 'Le grand affrontement'], crossover: [`${A} × ${B}`, 'Deux mondes se rencontrent', 'Le crossover'],
    chronologie: ['Ordre de lecture', A ? `${A} : par où commencer ?` : 'Par où commencer ?', 'La chronologie'], classement: ['Le classement', A ? `Top ${A}` : 'Le top', 'Du moins au plus puissant'],
    selection: ['Notre sélection', 'Les incontournables', 'À ne pas manquer'], recommandation: ['À lire absolument', 'Par où commencer ?', 'Notre conseil'],
    cosmique: ['L\'ordre cosmique', 'Les puissances de l\'univers', 'Qui domine le cosmos ?'], faction: [A ? `L'univers de ${A}` : 'Les factions', 'Qui contrôle quoi ?', 'Carte du pouvoir'],
    quiz: ['Le quiz', A ? `Connaissez-vous ${A} ?` : 'Êtes-vous incollable ?', 'Testez-vous'], debat: [A && B ? `${A} ou ${B} ?` : 'Le débat', 'Qui a raison ?', 'On en parle'],
    citation: [A || 'La citation', 'Les mots du héros', 'Une réplique culte'], createur: [A || 'Le créateur', 'Derrière les planches', 'Portrait d\'auteur'],
  };
  return (T[type] || T.portrait).map((x) => x.replace(/\s+/g, ' ').trim());
}
// Campagne : calendrier de publications variées (personnages différents, angles éditoriaux alternés) au statut « idée »
const ANGLES = ['presentation', 'origine', 'portrait', 'premiere', 'citation', 'evolution', 'analyse'];
export function planifierCampagne({ theme, debut, jours = 7, filtre = null, formats = ['4:5'], type } = {}) {
  let pool = PERSONNAGES.filter((p) => !filtre || (filtre.tag && p.tags.includes(filtre.tag)) || (filtre.editeur && p.editeur === filtre.editeur) || (filtre.personnage && p.nom === filtre.personnage));
  if (!pool.length) pool = PERSONNAGES;
  const unique = !filtre?.personnage, d0 = new Date(debut + 'T00:00:00Z'), pubs = [], manques = [];
  if (unique && pool.length < jours) manques.push(`Seulement ${pool.length} personnages dans la base locale pour ce thème : ${jours - pool.length} publication(s) à compléter.`);
  for (let i = 0; i < jours; i++) {
    const p = unique ? pool[i] : pool[0], angle = unique ? ANGLES[i % ANGLES.length] : ANGLES[i % ANGLES.length];
    pubs.push({ id: `pub${i + 1}-${Math.random().toString(36).slice(2, 7)}`, date: iso(plus(d0, i)), personnage: p ? p.nom : '', univers: p?.univers || 'urbain', type: p ? angle : 'presentation', titre: p ? titresPour(angle, p.nom)[0] : 'À définir', format: formats[0] === 'miniature' && formats.length === 1 ? '4:5' : formats[0], statut: 'idee', verifier: true, note: '' });
  }
  return { nom: theme ? theme.slice(0, 80) : 'Nouvelle campagne', theme, debut, fin: iso(plus(d0, jours - 1)), filtre, publications: pubs, manques, type };
}
export { PERSONNAGES };
