// DA-PRIME · Script Studio · Prompt Studio : instructions pour des modèles d'IA EXTERNES choisis par l'utilisateur.
// Le prompt est assemblé localement à partir du projet ; il n'est jamais envoyé : l'utilisateur le copie lui-même.
import { formatDuree, PLATEFORMES, TYPES, FONCTIONS, wpmDe, mesurerProjet } from './script-moteur.js';

export const CATEGORIES = { creation: 'Création complète', reecriture: 'Réécriture', amelioration: 'Amélioration', critique: 'Analyse critique', storytelling: 'Storytelling', adaptation: 'Adaptation à une plateforme', comics: 'Analyse de comics', contexte: 'Contextualisation', verification: 'Vérification des sources' };
const REGLES = 'Règles : n\'invente aucun fait, date, numéro, auteur, citation ni dialogue ; signale [À VÉRIFIER] toute affirmation non couverte par les sources fournies ; écris pour l\'oral (phrases courtes, pas de liste à puces) ; pas de remplissage pour atteindre la durée ; pas de formules creuses (« dans cette vidéo », « sans plus attendre »).';
// Modèles : {{variable}} remplacée par les données du projet ; version compacte et détaillée
export const MODELES = {
  creation: { categorie: 'creation', nom: 'Écrire le script complet',
    compact: 'Écris en {{langue}} le script oral d\'une vidéo {{plateforme}} de {{duree}} (~{{mots}} mots, {{wpm}} mots/min) sur : {{sujet}}. Angle : {{angle}}. Public : {{public}}. Ton : {{ton}}. Suis ce plan :\n{{plan}}\n{{regles}}',
    detaille: 'Rôle : scénariste de vidéos éditoriales pour {{plateforme}}.\nObjectif : {{objectif}}.\nSujet : {{sujet}}\nAngle : {{angle}}\nQuestion centrale : {{question}}\nPromesse au spectateur : {{promesse}}\nConflit / enjeu : {{conflit}} / {{enjeu}}\nPublic : {{public}} · Ton : {{ton}} · Profondeur : {{profondeur}}\nDurée : {{duree}} soit ~{{mots}} mots prononcés ({{wpm}} mots/min).\nProfil d\'écriture : {{profil}}\nPlan à respecter (budget de mots par séquence) :\n{{plan}}\nMatière et sources (seules informations autorisées) :\n{{sources}}\n{{comics}}\n{{regles}}\nRends le script séquence par séquence, avec le titre de chaque séquence.' },
  reecriture: { categorie: 'reecriture', nom: 'Réécrire une séquence',
    compact: 'Réécris ce passage pour l\'oral, ton {{ton}}, ~{{mots_seq}} mots, sans changer les faits :\n{{texte_seq}}\n{{regles}}',
    detaille: 'Réécris la séquence « {{titre_seq}} » ({{fonction_seq}}) d\'une vidéo {{plateforme}} sur {{sujet}}.\nObjectif de la séquence : {{objectif_seq}}\nCible : ~{{mots_seq}} mots. Ton : {{ton}}. Profil : {{profil}}\nTexte actuel :\n{{texte_seq}}\nContexte précédent : {{precedent}}\nSuite : {{suivant}}\n{{regles}}\nGarde exactement les mêmes faits ; propose une seule version.' },
  amelioration: { categorie: 'amelioration', nom: 'Améliorer le script',
    compact: 'Améliore ce script ({{duree}}, {{plateforme}}) : rythme, transitions, clarté orale. Ne change aucun fait.\n{{script}}\n{{regles}}',
    detaille: 'Voici le script d\'une vidéo {{plateforme}} de {{duree}} sur {{sujet}} (angle : {{angle}}).\nProblèmes déjà repérés :\n{{problemes}}\nScript :\n{{script}}\nAméliore le rythme, les transitions et la clarté à l\'oral, séquence par séquence. Indique chaque modification. {{regles}}' },
  critique: { categorie: 'critique', nom: 'Analyse critique',
    compact: 'Analyse ce script : hook, promesse tenue ou non, rythme, répétitions, longueurs, conclusion. Liste les problèmes avec passage, explication, correction.\n{{script}}',
    detaille: 'Agis comme un rédacteur en chef exigeant. Script ({{duree}}, {{plateforme}}, public : {{public}}) :\n{{script}}\nÉvalue : force du hook, clarté de la promesse et sa tenue, progression, révélations, respirations, répétitions, densité, transitions artificielles, conclusion. Pour chaque problème : passage exact, explication, proposition de correction. Ne réécris pas tout le script.' },
  storytelling: { categorie: 'storytelling', nom: 'Construire l\'arc narratif',
    compact: 'Propose 3 structures narratives pour une vidéo de {{duree}} sur {{sujet}} (angle {{angle}}) : hook, promesse, révélations, montée en tension, payoff. Une ligne par temps.',
    detaille: 'Sujet : {{sujet}}\nAngle : {{angle}}\nQuestion centrale : {{question}}\nMatière disponible :\n{{sources}}\n{{comics}}\nPropose trois architectures narratives différentes pour {{duree}} ({{plateforme}}) : pour chacune, la suite des temps (hook, promesse, contexte, enjeux, progressions, révélations, tensions, respirations, payoff, conclusion), ce que chaque temps révèle et pourquoi le spectateur continue. N\'utilise que la matière fournie.' },
  adaptation: { categorie: 'adaptation', nom: 'Adapter à une plateforme',
    compact: 'Adapte ce contenu en {{cible_plateforme}} de {{cible_duree}} : nouveau hook, nouvelle progression, nouvelle chute. Ne coupe pas simplement.\n{{script}}\n{{regles}}',
    detaille: 'Contenu d\'origine ({{plateforme}}, {{duree}}) :\n{{script}}\nReconstruis-le pour {{cible_plateforme}} en {{cible_duree}} : hook dans les 2 premières secondes si format court, une seule idée forte, progression rapide, chute nette. Sélectionne l\'essentiel, n\'ajoute aucun fait. {{regles}}' },
  comics: { categorie: 'comics', nom: 'Analyser un numéro de comic',
    compact: 'À partir de ces transcriptions et notes (numéro {{numero}}), résume l\'intrigue, liste personnages, événements, révélations. Distingue : dialogue / visible / interprétation / incertain.\n{{comics}}',
    detaille: 'Voici les transcriptions et notes de pages d\'un ou plusieurs numéros de comics (références page/case incluses) :\n{{comics}}\nProduis pour CHAQUE numéro séparément : résumé, personnages, lieux, événements dans l\'ordre, révélations, flashbacks, relations. Classe chaque information : [DIALOGUE] présente dans le texte, [VISUEL] décrite dans les notes visuelles, [INTERPRÉTATION] déduction, [INCERTAIN]. Conserve les références (numéro, page, case). Ne cite pas de longs passages ; n\'invente aucun dialogue illisible.' },
  contexte: { categorie: 'contexte', nom: 'Contextualiser le sujet',
    compact: 'Liste les éléments de contexte utiles (publications antérieures, auteurs, événements liés) pour comprendre : {{sujet}}. Pour chaque élément, indique une source vérifiable.',
    detaille: 'Sujet : {{sujet}}\nCe que je sais déjà (sources) :\n{{sources}}\nListe le contexte nécessaire pour un public {{public}} : origines éditoriales, auteurs, numéros ou événements liés, continuité. Pour chaque point : source vérifiable précise (titre, numéro, date) ou mention [À VÉRIFIER]. Sépare clairement ce qui est établi de ce qui est discuté.' },
  verification: { categorie: 'verification', nom: 'Vérifier les affirmations',
    compact: 'Liste chaque affirmation factuelle de ce script et indique : source fournie, à vérifier, ou douteuse.\n{{script}}\nSources :\n{{sources}}',
    detaille: 'Script :\n{{script}}\nSources fournies :\n{{sources}}\nPour chaque affirmation factuelle (date, numéro, auteur, événement, citation) : 1) la phrase, 2) la source fournie qui la couvre ou « aucune », 3) statut : confirmée / à vérifier / contredite. Ne vérifie rien de mémoire sans le signaler.' },
};

// Variables disponibles pour un projet (et une séquence facultative)
export function variables(p, { profil, sequence, comics = [], problemes = [], cible } = {}) {
  const m = mesurerProjet(p, { profil }), seqs = p.sequences.filter((s) => s.niveau === 2), i = sequence ? seqs.indexOf(sequence) : -1;
  return {
    langue: profil?.langue === 'en' ? 'anglais' : 'français', plateforme: PLATEFORMES[p.plateforme]?.nom || p.plateforme, duree: formatDuree(p.duree), mots: m.motsCibles, wpm: wpmDe(p, profil),
    sujet: p.sujet || p.nom, angle: p.angle || 'à définir', public: p.public, ton: profil?.ton || p.ton, profondeur: p.profondeur, objectif: p.objectif, type: TYPES[p.type] || p.type,
    question: p.question || '—', promesse: p.promesse || '—', conflit: p.conflit || '—', enjeu: p.enjeu || '—',
    profil: profil ? `${profil.style}; niveau ${profil.niveau}; humour ${profil.humour}; vulgarisation ${profil.vulgarisation}${profil.preferees?.length ? `; expressions appréciées : ${profil.preferees.join(', ')}` : ''}${profil.aEviter?.length ? `; à éviter : ${profil.aEviter.join(', ')}` : ''}` : 'oral, clair, précis',
    plan: seqs.map((s, k) => `${k + 1}. ${s.titre}${s.titre !== FONCTIONS[s.fonction] ? ` (${FONCTIONS[s.fonction] || s.fonction})` : ''} — ~${s.budgetMots} mots${s.points?.length ? ` — points : ${s.points.map((id) => p.points.find((x) => x.id === id)?.texte).filter(Boolean).join(' / ')}` : ''}`).join('\n'),
    sources: [...p.sources.map((s) => `- ${s.titre}${s.reference ? ` (${s.reference})` : ''}${s.note ? ` : ${s.note}` : ''}`), ...p.points.map((x) => `- [${(x.provenance || 'source').toUpperCase()}] ${x.texte}${x.refTexte ? ` (${x.refTexte})` : ''}`)].join('\n') || '(aucune source fournie)',
    comics: comics.length ? comics.map((c) => `Numéro ${c.serie || ''} #${c.numero || '?'} :\n${c.texte}`).join('\n\n') : '',
    script: seqs.map((s) => `[${s.titre}]\n${s.texte}`).join('\n\n'), problemes: problemes.map((x) => `- ${x.explication}`).join('\n') || '(aucun)',
    titre_seq: sequence?.titre || '', fonction_seq: FONCTIONS[sequence?.fonction] || '', objectif_seq: sequence?.objectif || '', texte_seq: sequence?.texte || '', mots_seq: sequence?.budgetMots || '',
    precedent: seqs[i - 1]?.texte.slice(-300) || '—', suivant: seqs[i + 1]?.titre || '—', numero: comics[0]?.numero || '',
    cible_plateforme: PLATEFORMES[cible?.plateforme]?.nom || 'TikTok', cible_duree: formatDuree(cible?.duree || 60), regles: REGLES,
  };
}
export function remplir(modele, vars) { return String(modele).replace(/\{\{(\w+)\}\}/g, (_, k) => (vars[k] ?? '').toString()).replace(/\n{3,}/g, '\n\n').trim(); }
export const estimationTokens = (t) => Math.ceil(String(t).length / 3.6);
export const VARIABLES = ['langue', 'plateforme', 'duree', 'mots', 'wpm', 'sujet', 'angle', 'public', 'ton', 'profondeur', 'objectif', 'type', 'question', 'promesse', 'conflit', 'enjeu', 'profil', 'plan', 'sources', 'comics', 'script', 'problemes', 'titre_seq', 'fonction_seq', 'objectif_seq', 'texte_seq', 'mots_seq', 'precedent', 'suivant', 'cible_plateforme', 'cible_duree', 'regles'];
