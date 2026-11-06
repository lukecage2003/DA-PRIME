// DA-PRIME · Script Studio · moteur éditorial (module ES pur, identique dans Node et le navigateur).
// Traitement DÉTERMINISTE LOCAL : durées, budgets de mots, architecture narrative, analyse critique par règles, adaptations,
// comparaison de versions, exports. Aucun modèle de langage : le moteur structure, mesure et signale ; la prose reste écrite
// par l'auteur (ou par un modèle externe choisi par lui via Prompt Studio). Rien n'est modifié sans validation.
import { analyser as analyserIdee, titresPour, TYPES as TYPES_VISUELS } from './studio-assistant.js';

// ---------- Plateformes, types, fonctions narratives ----------
export const PLATEFORMES = {
  youtube: { nom: 'YouTube (format long)', wpm: 145, hook: 15, min: 60, max: 4 * 3600, chapitres: true },
  shorts: { nom: 'YouTube Shorts', wpm: 165, hook: 2, min: 10, max: 180 },
  tiktok: { nom: 'TikTok', wpm: 165, hook: 2, min: 10, max: 600 },
  reels: { nom: 'Instagram Reels', wpm: 160, hook: 2, min: 10, max: 180 },
  documentaire: { nom: 'Documentaire', wpm: 130, hook: 45, min: 300, max: 4 * 3600, chapitres: true },
  podcast: { nom: 'Podcast', wpm: 155, hook: 30, min: 300, max: 4 * 3600, chapitres: true },
  interview: { nom: 'Interview', wpm: 150, hook: 20, min: 120, max: 3 * 3600 },
  explicatif: { nom: 'Format explicatif', wpm: 145, hook: 8, min: 30, max: 1800 },
};
export const TYPES = {
  storytelling: 'Storytelling', resume: 'Résumé narratif', analyse: 'Analyse approfondie', personnage: 'Analyse de personnage', evenement: 'Analyse d\'événement',
  guide: 'Guide de lecture', critique: 'Critique', documentaire: 'Documentaire', comparaison: 'Comparaison', versus: 'Versus', theorie: 'Théorie et interprétation', actualite: 'Actualité',
};
export const FONCTIONS = {
  hook: 'Hook', promesse: 'Promesse', contexte: 'Mise en contexte', enjeux: 'Enjeux', progression: 'Progression', revelation: 'Révélation', tension: 'Montée en tension',
  respiration: 'Respiration', transition: 'Transition', rappel: 'Rappel de contexte', payoff: 'Payoff', conclusion: 'Conclusion', appel: 'Appel à l\'action',
};
// Consignes d'écriture par fonction (ce que la séquence doit accomplir, pas un texte à recopier)
const CONSIGNES = {
  hook: 'Ouvrir sur l\'élément le plus fort : une image, une contradiction, une question ou un chiffre vérifié. Pas de salutation, pas d\'annonce du programme.',
  promesse: 'Dire précisément ce que le spectateur saura ou comprendra à la fin. Une phrase, tenue plus loin.',
  contexte: 'Donner le strict nécessaire pour suivre : qui, quoi, où, depuis quand. Pas de biographie exhaustive.',
  enjeux: 'Montrer ce qui est en jeu et pour qui ; poser le conflit central.',
  progression: 'Faire avancer le propos d\'un pas : un fait, une conséquence, une étape. Une idée principale par séquence.',
  revelation: 'Amener l\'information qui change la lecture de ce qui précède ; la préparer, puis la poser simplement.',
  tension: 'Rapprocher le moment décisif : raccourcir les phrases, resserrer les faits, retarder la réponse sans tricher.',
  respiration: 'Laisser souffler : une image, une anecdote courte, un recul. Pas de nouvelle information lourde.',
  transition: 'Relier deux blocs par une question ou une conséquence logique, pas par une formule toute faite.',
  rappel: 'Rappeler en deux phrases où l\'on en est (formats longs) avant d\'ouvrir la suite.',
  payoff: 'Répondre à la question centrale et récompenser l\'attention : ce que tout cela signifie.',
  conclusion: 'Clore sur une idée nette (bilan, ouverture, prise de position). Pas de résumé de tout ce qui a été dit.',
  appel: 'Une invitation simple et liée au sujet (prochaine vidéo, lecture conseillée). Facultatif.',
};
const POIDS = { hook: 0.05, promesse: 0.03, contexte: 0.1, enjeux: 0.07, progression: 0.12, revelation: 0.09, tension: 0.08, respiration: 0.04, transition: 0.02, rappel: 0.03, payoff: 0.08, conclusion: 0.05, appel: 0.015 };
const INTENSITE = { hook: 4, promesse: 3, contexte: 2, enjeux: 3, progression: 3, revelation: 5, tension: 4, respiration: 1, transition: 2, rappel: 2, payoff: 5, conclusion: 3, appel: 1 };
// Squelettes par type : l'ordre des fonctions centrales (le moteur les répète selon la durée et la matière)
const SQUELETTES = {
  storytelling: ['contexte', 'enjeux', 'progression', 'tension', 'revelation', 'payoff'], resume: ['contexte', 'progression', 'progression', 'revelation', 'payoff'],
  analyse: ['contexte', 'enjeux', 'progression', 'revelation', 'progression', 'payoff'], personnage: ['contexte', 'progression', 'enjeux', 'revelation', 'payoff'],
  evenement: ['contexte', 'enjeux', 'progression', 'tension', 'revelation', 'payoff'], guide: ['contexte', 'progression', 'progression', 'progression', 'payoff'],
  critique: ['contexte', 'progression', 'progression', 'revelation', 'payoff'], documentaire: ['contexte', 'enjeux', 'progression', 'respiration', 'progression', 'revelation', 'payoff'],
  comparaison: ['contexte', 'enjeux', 'progression', 'progression', 'tension', 'payoff'], versus: ['contexte', 'enjeux', 'progression', 'progression', 'tension', 'payoff'],
  theorie: ['contexte', 'enjeux', 'progression', 'revelation', 'tension', 'payoff'], actualite: ['contexte', 'enjeux', 'progression', 'payoff'],
};

// ---------- Durées ----------
// « 1 h 30 », « 90 min », « 2:30 », « 45 s », « 1h », « 15 » (minutes par défaut) → secondes
export function lireDuree(v) {
  if (typeof v === 'number') return Math.max(1, v);
  const s = String(v || '').toLowerCase().replace(',', '.').trim(); let m;
  if ((m = s.match(/^(\d+):(\d{1,2})(?::(\d{1,2}))?$/))) return m[3] ? +m[1] * 3600 + +m[2] * 60 + +m[3] : +m[1] * 60 + +m[2];
  let t = 0, avant = '';
  for (const [, x, u = ''] of s.matchAll(/(\d+(?:\.\d+)?)\s*(h|heures?|minutes?|min|mn|m|secondes?|sec|s)?/g)) { const k = /^h/.test(u) ? 3600 : /^s/.test(u) ? 1 : u ? 60 : avant === 'h' ? 60 : 60; t += +x * k; avant = u[0] || ''; }
  return Math.max(1, Math.round(t));
}
export const formatDuree = (s) => { s = Math.round(s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60; return h ? `${h} h ${String(m).padStart(2, '0')}` : m ? `${m} min${x ? ` ${String(x).padStart(2, '0')} s` : ''}` : `${x} s`; };
export const timecode = (s) => { s = Math.max(0, s); const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = Math.floor(s % 60), f = Math.round((s % 1) * 1000); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}`; };
export const classeDuree = (s) => (s <= 90 ? 'court' : s <= 12 * 60 ? 'intermediaire' : s <= 45 * 60 ? 'long' : 'tres-long');
export const CLASSES = { court: 'Format court', intermediaire: 'Format intermédiaire', long: 'Format long', 'tres-long': 'Format très long' };

// Comptage : seuls les mots prononcés comptent. Repères non prononcés : [PAUSE 2s], [SILENCE 3s], [EXTRAIT 0:12], [VISUEL …], [MUSIQUE …], lignes « // note »
export function compter(texte, wpm = 145) {
  const brut = String(texte || ''), lignes = brut.split('\n').filter((l) => !/^\s*\/\//.test(l)).map((l) => l.replace(/\s\/\/.*$/, '')); let pauses = 0, extraits = 0, silences = 0;
  const sans = lignes.join('\n').replace(/\[([^\]]*)\]/g, (_, c) => { const d = lireTemps(c); if (/^\s*pause/i.test(c)) pauses += d || 1; else if (/^\s*silence/i.test(c)) silences += d || 2; else if (/^\s*(extrait|archive|son)/i.test(c)) extraits += d || 5; return ' '; });
  const dialogues = sans.split('\n').filter((l) => /^\s*[—–-]\s|^\s*[A-ZÉÈ][\wÉÈ' -]{1,30}\s*:/.test(l)).join('\n');
  // Le nom du locuteur (« NOM : ») n'est pas prononcé
  const dit = (t) => t.replace(/^\s*[A-ZÉÈÀ][A-ZÉÈÀ' -]{0,30}\s*:\s*/gm, ''), M = (t) => (dit(t).match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length, mots = M(sans), motsDialogue = M(dialogues);
  const parole = (mots / wpm) * 60;
  return { mots, motsDialogue, pauses, silences, extraits, parole, total: parole + pauses + silences + extraits };
}
function lireTemps(c) { const m = c.match(/(\d+):(\d{2})/); if (m) return +m[1] * 60 + +m[2]; const s = c.match(/(\d+(?:[.,]\d+)?)\s*s/); return s ? +s[1].replace(',', '.') : 0; }

// ---------- Projets ----------
let n = 0; const id = (p) => `${p}${Date.now().toString(36)}${(n++).toString(36)}`;
export function nouveauProjet(o = {}) {
  return { id: id('sp'), v: 1, nom: o.nom || 'Nouveau projet', sujet: o.sujet || '', angle: o.angle || '', public: o.public || 'Curieux et fans de pop culture', plateforme: o.plateforme || 'youtube', duree: lireDuree(o.duree ?? 600),
    objectif: o.objectif || 'Informer et captiver', ton: o.ton || 'Passionné et précis', profondeur: o.profondeur || 'intermediaire', type: o.type || 'analyse', profil: o.profil || null,
    question: '', promesse: '', conflit: '', enjeu: '', pointDeVue: '', titres: [], miniatures: [], suggestions: [],
    sources: [], points: [], comics: [], notes: '', sequences: [], versions: [], archive: false, cree: Date.now(), modifie: Date.now(), etapes: {}, origine: o.origine || null };
}
export const PROFIL0 = { id: 'defaut', nom: 'Narration claire', langue: 'fr', ton: 'Passionné et précis', style: 'oral, phrases courtes', niveau: 'courant', humour: 'léger', profondeur: 'intermediaire', vulgarisation: 'élevée', wpm: 145, complexite: 'moyenne', preferees: [], aEviter: [] };
export const wpmDe = (projet, profil) => Math.round(((profil?.wpm || 145) * (PLATEFORMES[projet.plateforme]?.wpm || 145)) / 145);

// ---------- Architecte éditorial ----------
// Suggestions déterministes à partir de l'idée : chaque suggestion est indépendante, acceptée ou rejetée par l'auteur
export function architecte(idee, { type } = {}) {
  const a = analyserIdee(idee), sujet = (a.personnages.join(' et ') || idee.replace(/^(fais|prépare|crée|écris)[- ]?(moi)?\s*(une?|le|la|les)?\s*/i, '').replace(/[.?!]+$/, '')).trim() || 'le sujet';
  const t = type || ({ versus: 'versus', comparaison: 'comparaison', origine: 'personnage', portrait: 'personnage', presentation: 'personnage', evenement: 'evenement', crossover: 'evenement', chronologie: 'guide', recommandation: 'guide', selection: 'guide', critique: 'critique', actualite: 'actualite', annonce: 'actualite', theorie: 'theorie', hypothese: 'theorie', analyse: 'analyse' }[a.type] || 'analyse');
  const S = sujet;
  const angles = [
    ['question', `La question que tout le monde se pose sur ${S}`, `Partir d'une question précise et y répondre pas à pas.`],
    ['contre-pied', `Ce que l'on croit savoir sur ${S}… et ce que les sources montrent`, 'Confronter une idée reçue aux faits vérifiables.'],
    ['coulisses', `${S} : les coulisses`, 'Raconter la fabrication, les choix et les contraintes (sources nécessaires).'],
    ['evolution', `Comment ${S} a changé`, 'Suivre une évolution dans le temps, avec des étapes datées et sourcées.'],
    ['detail', `Le détail qui change tout dans ${S}`, 'Partir d\'un élément précis et en tirer une lecture d\'ensemble.'],
    ...(a.personnages.length >= 2 ? [['opposition', `${a.personnages[0]} face à ${a.personnages[1]} : deux visions`, 'Opposer deux logiques plutôt que deux puissances.']] : []),
  ].map(([k, titre, desc]) => ({ id: id('ang'), genre: 'angle', cle: k, titre, desc, statut: 'propose' }));
  const sug = (genre, texte) => ({ id: id('sug'), genre, texte, statut: 'propose' });
  return {
    sujet: S, type: t, personnages: a.personnages, angles,
    suggestions: [
      sug('question', `Qu'est-ce qui fait réellement de ${S} un sujet à part ?`), sug('question', `Pourquoi ${S} divise-t-il autant ?`),
      sug('promesse', `À la fin de cette vidéo, vous saurez ce qui rend ${S} unique — preuves à l'appui.`),
      sug('conflit', a.personnages.length >= 2 ? `${a.personnages[0]} contre ${a.personnages[1]} : deux façons de voir le même problème.` : `L'image publique de ${S} contre ce que racontent réellement les sources.`),
      sug('enjeu', `Comprendre ${S} change la façon de lire ce qui suit (série, film, événement).`),
      sug('pointDeVue', 'Point de vue assumé, argumenté, avec les limites signalées.'),
      sug('differenciation', 'Se distinguer par la précision des sources et la clarté de la progression, pas par le volume.'),
      ...titresPour(a.type in TYPES_VISUELS ? a.type : 'analyse', a.personnages[0] || S, a.personnages[1]).map((x) => sug('titre', x)), sug('titre', `${S} : ce que personne ne vous a expliqué`),
      ...['Le visage du sujet en gros plan, un mot-clé de trois mots maximum', a.personnages.length >= 2 ? 'Duel : deux personnages face à face, badge VS' : 'Sujet monumental à contre-jour, question en titre', 'Détail agrandi (case, objet, couverture) avec flèche ou cercle'].map((x) => sug('miniature', x)),
    ],
    verifier: a.verifier,
  };
}

// ---------- Plan narratif ----------
// Architecture selon la durée et la plateforme ; budget de mots par séquence ; matière (points) répartie par importance.
// La matière manquante est signalée : le moteur n'ajoute jamais de séquence de remplissage.
export function construirePlan(p, { profil } = {}) {
  const wpm = wpmDe(p, profil), D = p.duree, cl = classeDuree(D), pf = PLATEFORMES[p.plateforme] || PLATEFORMES.youtube, alertes = [];
  if (D > pf.max) alertes.push(`Durée supérieure au maximum habituel de ${pf.nom} (${formatDuree(pf.max)}).`);
  if (D < pf.min) alertes.push(`Durée inférieure au minimum habituel de ${pf.nom} (${formatDuree(pf.min)}).`);
  const points = [...(p.points || [])].filter((x) => x.provenance !== 'incertain' || x.forcer).sort((a, b) => (b.importance || 2) - (a.importance || 2));
  const coeur = SQUELETTES[p.type] || SQUELETTES.analyse;
  let fonctions, echelle = 1;
  if (cl === 'court') fonctions = D <= 35 ? ['hook', 'progression', 'payoff'] : ['hook', 'promesse', 'progression', 'revelation', 'conclusion'];
  else {
    // Nombre de blocs de fond : ~1 par 75 s, plafonné par la matière disponible (si elle est fournie)
    const voulu = Math.max(coeur.length, Math.round(D / 75)), dispo = points.length ? Math.max(coeur.length, Math.ceil(points.length / (cl === 'intermediaire' ? 1 : 2))) : voulu;
    const nb = Math.min(voulu, dispo); echelle = nb / voulu; if (points.length && dispo < voulu) alertes.push(`Matière insuffisante pour ${formatDuree(D)} : ${points.length} point(s) fourni(s), soit environ ${formatDuree(D * echelle)} de contenu réel. Ajouter des sources ou réduire la durée — aucun remplissage n'est ajouté.`);
    const corps = []; for (let i = 0; i < nb; i++) corps.push(coeur[Math.min(coeur.length - 1, Math.floor((i / nb) * coeur.length))]);
    // Respirations et transitions dans les formats plus longs
    const avec = []; corps.forEach((f, i) => { avec.push(f); if (cl !== 'intermediaire' && i % 4 === 3 && i < corps.length - 1) avec.push('respiration'); });
    fonctions = ['hook', 'promesse', ...avec, 'conclusion', ...(p.plateforme === 'youtube' ? ['appel'] : [])];
  }
  // Durée de narration : retire les extraits et pauses prévus (sources de type extrait)
  const horsParole = (p.sources || []).filter((s) => s.genre === 'extrait').reduce((t, s) => t + (s.duree || 0), 0), narration = Math.max(5, D - horsParole), motsTotal = Math.round((narration / 60) * wpm);
  const somme = fonctions.reduce((t, f) => t + POIDS[f], 0) / echelle;
  let seqs = fonctions.map((f) => ({ id: id('sq'), niveau: 2, titre: FONCTIONS[f], fonction: f, objectif: CONSIGNES[f], budgetMots: Math.max(f === 'hook' ? 8 : 15, Math.round((POIDS[f] / somme) * motsTotal)), intensite: INTENSITE[f], texte: '', sources: [], refs: [], notes: '', commentaires: [], points: [] }));
  // Matière : chaque point important va dans une séquence de fond, en ordre (chronologie des comics conservée)
  const fond = seqs.filter((s) => ['contexte', 'enjeux', 'progression', 'revelation', 'tension', 'payoff'].includes(s.fonction));
  const ordre = [...points].sort((a, b) => (a.ordre ?? 0) - (b.ordre ?? 0));
  const garde = cl === 'court' ? ordre.filter((x) => (x.importance || 2) >= 3).slice(0, 3) : ordre;
  garde.forEach((pt, i) => { const s = fond[Math.min(fond.length - 1, Math.floor((i / Math.max(1, garde.length)) * fond.length))]; if (!s) return; s.points.push(pt.id); if (pt.ref) s.refs.push(pt.ref); if (pt.source) s.sources.push(pt.source); });
  if (cl === 'court' && ordre.length > garde.length) alertes.push(`Format court : ${garde.length} point(s) essentiel(s) retenu(s) sur ${ordre.length} (importance maximale).`);
  // Hiérarchie : chapitres (formats longs) et parties (formats très longs), avec rappels de contexte
  if (cl === 'long' || cl === 'tres-long') {
    const parChap = cl === 'long' ? 4 : 3, out = []; let k = 0, chap = 0, partie = 0;
    for (const s of seqs) {
      if (['hook', 'promesse'].includes(s.fonction) || s.fonction === 'conclusion' || s.fonction === 'appel') { out.push(s); continue; }
      if (k % parChap === 0) { if (cl === 'tres-long' && chap % 3 === 0) out.push({ id: id('pt'), niveau: 0, titre: `Partie ${++partie}`, fonction: 'partie', objectif: 'Grande étape du récit.', budgetMots: 0, intensite: 0, texte: '', sources: [], refs: [], notes: '', commentaires: [], points: [] });
        out.push({ id: id('ch'), niveau: 1, titre: `Chapitre ${++chap}`, fonction: 'chapitre', objectif: 'Un chapitre = une question traitée jusqu\'au bout.', budgetMots: 0, intensite: 0, texte: '', sources: [], refs: [], notes: '', commentaires: [], points: [] });
        if (chap > 1 && cl === 'tres-long') out.push({ id: id('sq'), niveau: 2, titre: FONCTIONS.rappel, fonction: 'rappel', objectif: CONSIGNES.rappel, budgetMots: Math.round(motsTotal * 0.012), intensite: 2, texte: '', sources: [], refs: [], notes: '', commentaires: [], points: [] }); }
      out.push(s); k++;
    }
    seqs = out;
  }
  // Budget total respecté (les rappels de contexte sont pris sur l'ensemble, pas ajoutés)
  const s2 = seqs.filter((x) => x.niveau === 2), sb = s2.reduce((t, x) => t + x.budgetMots, 0), cible = Math.round(motsTotal * echelle);
  if (sb > 0 && Math.abs(sb - cible) / cible > 0.02) s2.forEach((x) => { x.budgetMots = Math.max(x.fonction === 'hook' ? 8 : 10, Math.round((x.budgetMots * cible) / sb)); });
  return { sequences: seqs, wpm, motsTotal, narration, classe: cl, alertes };
}

// ---------- Mesures ----------
const VIDES = new Set('alors aussi autre avant avec avoir cela cette comme dans depuis donc elle elles encore entre être fait faire leur leurs mais même moins nous parce pendant peut plus pour pourquoi quand quel quelle sans selon sera sont sous tous tout toute toutes très vers voilà vous était étaient avait avaient comment chaque celui celle ceux deux trois where which there their about would could should these those other’'.split(/\s+/));
export const phrases = (t) => String(t || '').replace(/\[[^\]]*\]/g, ' ').split(/(?<=[.!?…])\s+|\n+/).map((x) => x.trim()).filter((x) => /\p{L}/u.test(x));
const motsDe = (t) => (String(t).toLowerCase().match(/[\p{L}][\p{L}'’-]*/gu) || []);
export function mesurerSequence(s, wpm) {
  const c = compter(s.texte, wpm), ph = phrases(s.texte), long = ph.length ? ph.reduce((t, x) => t + motsDe(x).length, 0) / ph.length : 0;
  const denses = (s.texte.match(/\b\d[\d.,]*\b|\b[A-ZÉ][\p{L}]+(?:\s+[A-ZÉ][\p{L}]+)*/gu) || []).length;
  return { ...c, phrases: ph.length, longueurMoyenne: Math.round(long * 10) / 10, densite: c.mots ? Math.round((denses / c.mots) * 1000) / 10 : 0, ecart: s.budgetMots ? Math.round(((c.mots - s.budgetMots) / s.budgetMots) * 100) : 0 };
}
export function mesurerProjet(p, { profil } = {}) {
  const wpm = wpmDe(p, profil); let t = 0;
  const seqs = p.sequences.map((s) => { const m = s.niveau < 2 ? { mots: 0, total: 0, parole: 0, pauses: 0, extraits: 0, silences: 0, motsDialogue: 0 } : mesurerSequence(s, wpm); const debut = t; const d = s.niveau < 2 ? 0 : m.mots ? m.total : (s.budgetMots / wpm) * 60; t += d; return { id: s.id, debut, duree: d, ...m }; });
  const tot = seqs.reduce((a, s) => ({ mots: a.mots + s.mots, parole: a.parole + (s.parole || 0), pauses: a.pauses + (s.pauses || 0), extraits: a.extraits + (s.extraits || 0), silences: a.silences + (s.silences || 0), dialogue: a.dialogue + (s.motsDialogue || 0) }), { mots: 0, parole: 0, pauses: 0, extraits: 0, silences: 0, dialogue: 0 });
  return { wpm, sequences: seqs, ...tot, total: tot.parole + tot.pauses + tot.extraits + tot.silences, estime: t, cible: p.duree, motsCibles: Math.round((p.duree / 60) * wpm) };
}

// ---------- Analyse critique (règles explicites, aucune réécriture automatique) ----------
export const CLICHES = ['dans cette vidéo', 'sans plus attendre', 'mais ce n\'est pas tout', 'accrochez-vous', 'vous n\'allez pas en croire vos yeux', 'restez jusqu\'à la fin', 'avant de commencer', 'n\'oubliez pas de vous abonner', 'on se retrouve', 'bref', 'il était une fois', 'figurez-vous que', 'et c\'est là que tout bascule', 'roulement de tambour', 'spoiler alert', 'force est de constater', 'il faut savoir que', 'en effet', 'tout simplement', 'à noter que'];
const OUVERTURES_FAIBLES = /^(bonjour|salut|hello|bienvenue|aujourd'hui (on|nous)|dans (cette|la) vidéo|on va parler|je vais vous)/i;
export function analyserScript(p, { profil } = {}) {
  const wpm = wpmDe(p, profil), m = mesurerProjet(p, { profil }), pb = [], seqs = p.sequences.filter((s) => s.niveau === 2), total = m.mots || 1;
  const add = (s, type, gravite, passage, explication, correction) => pb.push({ id: `${type}-${s?.id || 'g'}-${pb.length}`, seq: s?.id || null, type, gravite, passage, explication, correction: correction || { mode: 'note', texte: '' }, statut: 'ouvert' });
  const hook = seqs.find((s) => s.fonction === 'hook');
  if (!hook || !hook.texte.trim()) add(hook, 'hook-absent', 'haute', '', 'Pas de hook rédigé : les premières secondes décident si le spectateur reste.', { mode: 'note', texte: CONSIGNES.hook });
  else { const p1 = phrases(hook.texte)[0] || '', n1 = motsDe(p1).length;
    if (OUVERTURES_FAIBLES.test(p1)) add(hook, 'hook-faible', 'haute', p1, 'Le hook commence par une salutation ou une annonce de programme : l\'élément fort arrive trop tard.', { mode: 'note', texte: 'Commencer directement par l\'image, la contradiction ou la question la plus forte ; garder la présentation pour plus tard ou la supprimer.' });
    if (n1 > 25) add(hook, 'hook-long', 'moyenne', p1, `Première phrase de ${n1} mots : trop longue pour accrocher à l'oral.`, couper(p1));
    if (!/[?!]|\d|mais|pourtant|jamais|personne|seul|secr[eè]t|vrai/i.test(hook.texte.slice(0, 260))) add(hook, 'hook-tension', 'basse', p1, 'Le hook ne contient ni question, ni contraste, ni élément concret (chiffre, détail) : il informe sans intriguer.', { mode: 'note', texte: 'Ajouter une tension : une question précise, un contraste (« pourtant »), un détail concret vérifié.' }); }
  // Introduction trop longue : mots avant le premier bloc de fond
  const iFond = seqs.findIndex((s) => !['hook', 'promesse', 'contexte'].includes(s.fonction)), avant = seqs.slice(0, iFond < 0 ? seqs.length : iFond).reduce((t, s) => t + compter(s.texte, wpm).mots, 0);
  if (avant / total > (classeDuree(p.duree) === 'court' ? 0.35 : 0.22) && total > 80) add(seqs[0], 'intro-longue', 'moyenne', '', `L'introduction (hook, promesse, contexte) occupe ${Math.round((avant / total) * 100)} % du texte : le sujet commence trop tard.`, { mode: 'note', texte: 'Déplacer une partie du contexte au moment où il devient utile ; garder seulement ce qui est nécessaire pour suivre.' });
  const promesse = seqs.find((s) => s.fonction === 'promesse');
  if (promesse?.texte.trim()) { const cles = [...new Set(motsDe(promesse.texte).filter((w) => w.length >= 6 && !VIDES.has(w)))], suite = seqs.slice(seqs.indexOf(promesse) + 1).map((s) => s.texte.toLowerCase()).join(' ');
    const absents = cles.filter((w) => !suite.includes(w.slice(0, Math.max(5, w.length - 2)))); if (cles.length && absents.length / cles.length > 0.6) add(promesse, 'promesse', 'haute', promesse.texte.slice(0, 160), `Promesse peut-être non tenue : ${absents.slice(0, 4).join(', ')} n'apparaissent plus ensuite.`, { mode: 'note', texte: 'Vérifier que la suite répond explicitement à la promesse, ou reformuler la promesse.' }); }
  const aEviter = [...CLICHES, ...((profil?.aEviter) || []).map((x) => x.toLowerCase())];
  for (const s of seqs) {
    const t = s.texte; if (!t.trim()) { if (s.budgetMots > 0) add(s, 'vide', 'basse', '', `Séquence « ${s.titre} » non rédigée.`); continue; }
    for (const para of t.split(/\n{2,}/)) { const nm = motsDe(para).length; if (nm > 110) add(s, 'dense', 'moyenne', para.slice(0, 140) + '…', `Paragraphe de ${nm} mots sans respiration : difficile à dire et à suivre.`, { mode: 'note', texte: 'Couper en deux ou trois paragraphes ; une idée par paragraphe.' }); }
    for (const ph of phrases(t)) { const nm = motsDe(ph).length; if (nm > 35) add(s, 'phrase-longue', 'basse', ph, `Phrase de ${nm} mots : risque de souffle court à l'enregistrement.`, couper(ph)); }
    for (const c of aEviter) { const i = t.toLowerCase().indexOf(c); if (i >= 0) { const extrait = t.slice(i, i + c.length); add(s, 'cliche', 'moyenne', extrait, `Formule toute faite (« ${extrait} ») : elle sonne artificielle et n'apporte rien.`, { mode: 'remplacer', avant: extrait, apres: '' }); } }
    // Répétitions : un même mot plein utilisé 3 fois ou plus sur 60 mots
    const mw = motsDe(t); const vus = new Set();
    for (let i = 0; i < mw.length; i++) { const w = mw[i]; if (w.length < 5 || VIDES.has(w) || vus.has(w)) continue; const fen = mw.slice(i, i + 60).filter((x) => x === w).length; if (fen >= 3) { vus.add(w); add(s, 'repetition', 'basse', w, `« ${w} » revient ${fen} fois en moins de 60 mots.`, { mode: 'note', texte: 'Remplacer certaines occurrences (pronom, synonyme précis) ou supprimer la redite.' }); } }
    const ms = mesurerSequence(s, wpm); if (s.budgetMots && Math.abs(ms.ecart) > 40 && ms.mots > 20) add(s, ms.ecart > 0 ? 'trop-long' : 'trop-court', 'basse', '', `${ms.mots} mots pour un budget de ${s.budgetMots} (${ms.ecart > 0 ? '+' : ''}${ms.ecart} %).`, { mode: 'note', texte: ms.ecart > 0 ? 'Resserrer : garder ce qui fait avancer le propos.' : 'Développer avec de la matière sourcée, ou réduire la durée cible plutôt que remplir.' });
  }
  const concl = seqs.find((s) => s.fonction === 'conclusion');
  if (!concl || compter(concl.texte, wpm).mots < Math.min(25, concl?.budgetMots * 0.4 || 25)) add(concl, 'conclusion', 'moyenne', '', 'Conclusion absente ou très courte : la vidéo s\'arrête sans résolution.', { mode: 'note', texte: CONSIGNES.conclusion });
  // Progression : intensités plates sur une longue suite de séquences
  for (let i = 0; i + 4 < seqs.length; i++) { const f = seqs.slice(i, i + 5); if (f.every((s) => s.intensite === f[0].intensite) && f.every((s) => s.texte.trim())) { add(f[0], 'plat', 'basse', '', `Cinq séquences d'intensité égale (${f[0].intensite}) à la suite : rythme monotone possible.`, { mode: 'note', texte: 'Alterner : une révélation, une respiration, une montée en tension.' }); break; } }
  const ecartDuree = m.mots ? Math.round(((m.total - p.duree) / p.duree) * 100) : 0;
  if (m.mots > 50 && Math.abs(ecartDuree) > 15) add(null, 'duree', 'moyenne', '', `Durée estimée ${formatDuree(m.total)} pour une cible de ${formatDuree(p.duree)} (${ecartDuree > 0 ? '+' : ''}${ecartDuree} %).`, { mode: 'note', texte: ecartDuree > 0 ? 'Couper les passages qui n\'apportent pas d\'information nouvelle.' : 'Ajouter de la matière sourcée ou réduire la durée cible — pas de remplissage.' });
  return { problemes: pb, mesure: m, rythme: rythme(p, m) };
}
// Proposition de découpe d'une phrase longue (à la première articulation naturelle)
function couper(ph) {
  const m = ph.match(/^(.{40,}?)(,\s*(?:mais|et|car|donc|alors|puis|qui|où|tandis que|parce que)\s+)(.+)$/i);
  if (!m) return { mode: 'note', texte: 'Couper la phrase en deux à l\'articulation la plus naturelle.' };
  const suite = m[3].charAt(0).toUpperCase() + m[3].slice(1), lien = m[2].replace(/^,\s*/, '').trim();
  const apres = `${m[1].trim()}. ${/^(mais|et|donc|alors|puis)$/i.test(lien) ? lien.charAt(0).toUpperCase() + lien.slice(1) + ' ' + m[3] : suite}`;
  return { mode: 'remplacer', avant: ph, apres };
}
// Courbe de rythme indicative : intensité déclarée, densité mesurée, longueur relative (pas une prédiction de rétention)
export function rythme(p, m = mesurerProjet(p)) {
  return p.sequences.filter((s) => s.niveau === 2).map((s) => { const x = m.sequences.find((y) => y.id === s.id) || {}; return { id: s.id, titre: s.titre, fonction: s.fonction, debut: x.debut || 0, duree: x.duree || 0, intensite: s.intensite, densite: x.densite || 0, mots: x.mots || 0, budget: s.budgetMots }; });
}
// Application d'une correction acceptée par l'auteur (jamais automatique)
export function appliquerCorrection(p, probleme) {
  const c = probleme.correction; if (c?.mode !== 'remplacer') return false; const s = p.sequences.find((x) => x.id === probleme.seq); if (!s || !s.texte.includes(c.avant)) return false;
  s.texte = s.texte.replace(c.avant, c.apres).replace(/[ \t]{2,}/g, ' ').replace(/\s+([.,!?])/g, '$1').replace(/^\s*[,.:;]\s*/gm, '').replace(/(^|[.!?…]\s+)(\p{Ll})/gu, (_, a, b) => a + b.toUpperCase()); return true;
}

// ---------- Adaptation à une autre plateforme ou durée : un nouveau projet, plan reconstruit (pas une coupe) ----------
export function adapter(p, { plateforme, duree, profil } = {}) {
  const n2 = nouveauProjet({ ...p, nom: `${p.nom} · ${PLATEFORMES[plateforme]?.nom || plateforme}`, plateforme, duree: duree ?? (PLATEFORMES[plateforme]?.max <= 180 ? 60 : p.duree), origine: { projet: p.id, version: p.versions?.length || 0 } });
  Object.assign(n2, { sujet: p.sujet, angle: p.angle, question: p.question, promesse: p.promesse, conflit: p.conflit, enjeu: p.enjeu, pointDeVue: p.pointDeVue, sources: JSON.parse(JSON.stringify(p.sources)), points: JSON.parse(JSON.stringify(p.points)), comics: [...p.comics], type: p.type, profil: p.profil });
  const plan = construirePlan(n2, { profil }); n2.sequences = plan.sequences;
  // Le hook et la conclusion sont à réécrire pour le nouveau format : le texte d'origine est fourni comme note, jamais recopié
  const src = (f) => p.sequences.find((s) => s.fonction === f)?.texte || '';
  for (const s of n2.sequences) if (['hook', 'promesse', 'conclusion'].includes(s.fonction) && src(s.fonction)) s.notes = `Version d'origine (à reconstruire pour ${PLATEFORMES[plateforme]?.nom}) : ${src(s.fonction).slice(0, 400)}`;
  return { projet: n2, alertes: plan.alertes };
}

// ---------- Versions : comparaison mot à mot ----------
export function texteProjet(p) { return p.sequences.map((s) => (s.niveau < 2 ? `\n${s.niveau === 0 ? '# ' : '## '}${s.titre}\n` : `### ${s.titre}\n${s.texte}\n`)).join('\n'); }
export function comparer(a, b) {
  const A = String(a).split(/(\s+)/), B = String(b).split(/(\s+)/), n = A.length, m = B.length;
  if (n * m > 4e6) return [{ t: '-', s: a }, { t: '+', s: b }];
  const L = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = A[i] === B[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = [], push = (t, s) => { const d = out[out.length - 1]; if (d && d.t === t) d.s += s; else out.push({ t, s }); };
  let i = 0, j = 0; while (i < n && j < m) { if (A[i] === B[j]) { push('=', A[i]); i++; j++; } else if (L[i + 1][j] >= L[i][j + 1]) push('-', A[i++]); else push('+', B[j++]); }
  while (i < n) push('-', A[i++]); while (j < m) push('+', B[j++]); return out;
}

// ---------- Exports ----------
const refTxt = (r) => [r.numero ? `${r.serie || ''} #${r.numero}`.trim() : r.comic || '', r.page ? `p. ${r.page}` : '', r.case ? `case ${r.case}` : ''].filter(Boolean).join(' · ');
export function exporter(p, format, { profil, comics = {} } = {}) {
  const m = mesurerProjet(p, { profil }), info = (s) => m.sequences.find((x) => x.id === s.id), narr = (t) => t.split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n').replace(/\[[^\]]*\]/g, '').replace(/[ \t]{2,}/g, ' ').trim();
  const tete = `# ${p.nom}\n\nSujet : ${p.sujet || '—'} · ${PLATEFORMES[p.plateforme]?.nom} · cible ${formatDuree(p.duree)} · estimé ${formatDuree(m.total || m.estime)} · ${m.mots} mots à ${m.wpm} mots/min\n`;
  const seqs = p.sequences;
  if (format === 'complet') return tete + '\n' + texteProjet(p);
  if (format === 'chapitres') return tete + seqs.map((s) => (s.niveau < 2 ? `\n${'#'.repeat(s.niveau + 2)} ${s.titre}\n` : `\n**${s.titre}** — ${FONCTIONS[s.fonction] || s.fonction}\n\n${s.texte}\n`)).join('');
  if (format === 'timecodes') return tete + seqs.map((s) => (s.niveau < 2 ? `\n## ${s.titre}\n` : `\n[${timecode(info(s).debut)} → ${timecode(info(s).debut + info(s).duree)}] ${s.titre}\n${s.texte}\n`)).join('');
  if (format === 'references') return tete + seqs.filter((s) => s.niveau === 2).map((s) => `\n[${timecode(info(s).debut)}] ${s.titre}\n${s.texte}\n${s.refs.length ? `Références : ${s.refs.map((r) => refTxt({ ...r, ...(comics[r.comic] || {}) })).join(' ; ')}\n` : ''}${s.sources.length ? `Sources : ${s.sources.join(' ; ')}\n` : ''}`).join('');
  if (format === 'visuel') return tete + seqs.filter((s) => s.niveau === 2).map((s) => `\n[${timecode(info(s).debut)}] ${s.titre} (intensité ${s.intensite}/5)\nTEXTE : ${narr(s.texte)}\nVISUELS : ${[...(s.texte.match(/\[VISUEL[^\]]*\]/gi) || []), ...s.refs.map((r) => refTxt({ ...r, ...(comics[r.comic] || {}) }))].join(' ; ') || '—'}\nMONTAGE : ${s.notes || '—'}\n`).join('');
  if (format === 'narration') return seqs.filter((s) => s.niveau === 2).map((s) => narr(s.texte)).filter(Boolean).join('\n\n') + '\n';
  if (format === 'montage') { const q = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    return '﻿entree;sortie;duree_s;sequence;fonction;intensite;texte;visuels;references;notes\n' + seqs.filter((s) => s.niveau === 2).map((s) => [timecode(info(s).debut), timecode(info(s).debut + info(s).duree), info(s).duree.toFixed(1), s.titre, FONCTIONS[s.fonction] || s.fonction, s.intensite, narr(s.texte), (s.texte.match(/\[VISUEL[^\]]*\]/gi) || []).join(' '), s.refs.map((r) => refTxt({ ...r, ...(comics[r.comic] || {}) })).join(' ; '), s.notes].map(q).join(';')).join('\n') + '\n'; }
  if (format === 'srt') { let k = 0, out = ''; for (const s of seqs.filter((x) => x.niveau === 2)) { const mots = narr(s.texte).split(/\s+/).filter(Boolean), d0 = info(s).debut, pas = 60 / m.wpm; for (let i = 0; i < mots.length; i += 9) { const a = d0 + i * pas, b = d0 + Math.min(mots.length, i + 9) * pas; out += `${++k}\n${srtT(a)} --> ${srtT(b)}\n${mots.slice(i, i + 9).join(' ')}\n\n`; } } return out; }
  if (format === 'json') return JSON.stringify(p, null, 2);
  throw new Error(`format inconnu : ${format}`);
}
const srtT = (s) => `${timecode(s)},${String(Math.round((s % 1) * 1000)).padStart(3, '0')}`;
export const EXPORTS = { complet: 'Script complet (.md)', chapitres: 'Structuré par chapitres (.md)', timecodes: 'Avec timecodes (.md)', references: 'Avec références comics (.md)', visuel: 'Avec indications visuelles (.md)', narration: 'Narration seule (.txt)', montage: 'Plan de montage (.csv)', srt: 'Sous-titres de narration (.srt)', json: 'Projet complet (.json)' };
export const EXT = { complet: 'md', chapitres: 'md', timecodes: 'md', references: 'md', visuel: 'md', narration: 'txt', montage: 'csv', srt: 'srt', json: 'json' };
