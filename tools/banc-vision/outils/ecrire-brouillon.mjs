// Convertit un brouillon d'annotation compact en annotations-a-faire/<page>.json (valide_par = null : NON validé).
// Usage : node outils/ecrire-brouillon.mjs <corpus> <page-sans-ext> <brouillon.json> [auteur]
import { readFileSync, writeFileSync } from 'node:fs'; import { join, dirname } from 'node:path'; import { fileURLToPath } from 'node:url';
const [C, nom, fb, auteur = 'proposition Claude'] = process.argv.slice(2), B = JSON.parse(readFileSync(fb, 'utf8'));
const E = JSON.parse(readFileSync(join(C, 'entrees', nom + '.json'), 'utf8')), SQ = JSON.parse(readFileSync(join(C, 'annotations-a-faire', nom + '.json'), 'utf8'));
const SO = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../schemas/sortie-vision.schema.json'), 'utf8')).properties, SA = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../schemas/annotation.schema.json'), 'utf8')).properties;
const enumDe = (s, k) => s[k].items.properties, err = [], verif = (v, liste, ou) => { if (v !== '' && v !== null && !liste.includes(v)) err.push(`${ou} : « ${v} » hors liste ${JSON.stringify(liste)}`); };
const z = (a) => ({ x: a[0], y: a[1], w: a[2], h: a[3] }), ids = new Set(E.ocr.map((b) => b.id));
const cases = B.cases === 'proposees' ? E.cases.map((c) => ({ ...c, ...(B.casesInfo?.[c.id] ? { plan: B.casesInfo[c.id][0], angle: B.casesInfo[c.id][1], lieu: B.casesInfo[c.id][2] } : {}) }))
  : B.cases.map(([id, x, y, w, h, plan, angle, lieu], i) => ({ id, ordre: i + 1, zone: z([x, y, w, h]), plan, angle, lieu }));
for (const c of cases) { verif(c.plan, enumDe(SO, 'cases').plan.enum, `case ${c.id}.plan`); verif(c.angle, enumDe(SO, 'cases').angle.enum, `case ${c.id}.angle`); }
const casesIds = new Set(cases.map((c) => c.id)), chk = (c, ou) => { if (!casesIds.has(c)) err.push(`${ou} : case ${c} inconnue`); };
const A = { page: E.page, corpus: SQ.corpus, categories_test: B.cat || [], nature_page: B.nature,
  _brouillon: `${auteur} — NON VALIDÉ : à relire sur l'image, corriger puis signer valide_par`, cases,
  personnages: (B.perso || []).map(([id, c, x, y, w, h, expression, posture, description, identite = null, ded = false]) => (chk(c, `perso ${id}`), { id, case: c, zone: z([x, y, w, h]), identite, identite_deductible_de_la_page: ded, expression, posture, description })),
  objets: (B.obj || []).map(([c, nom, important = true, tenu_par = null]) => (chk(c, `objet ${nom}`), { case: c, nom, important, tenu_par })),
  actions: (B.act || []).map(([c, agent, verbe, cible = null, synonymes = []]) => (chk(c, `action ${verbe}`), { case: c, agent, verbe, cible, synonymes })),
  relations: (B.rel || []).map(([c, sujet, relation, objet]) => (chk(c, `relation`), verif(relation, enumDe(SO, 'relations').relation.enum, 'relation'), { case: c, sujet, relation, objet })),
  bulles: (B.bul || []).map(([ocr, nature, locuteur = null, certain = false]) => { if (!ids.has(ocr)) err.push(`bulle ${ocr} : bloc OCR inexistant`); verif(nature, enumDe(SO, 'bulles').nature.enum, `bulle ${ocr}`); return { ocr, _texte_ocr: E.ocr.find((b) => b.id === ocr)?.texte, nature, locuteur, locuteur_certain: certain }; }),
  continuite: (B.cont || []).map(([de, vers, type, detail = '']) => (verif(type, enumDe(SO, 'continuite').type.enum, 'continuite'), { de, vers, type, detail })),
  faits_page: (B.faits || []).map(([texte, classe]) => (verif(classe, SA.faits_page.items.properties.classe.enum, 'fait'), { texte, classe })),
  a_ne_pas_inventer: B.interdit || [], ambigu: B.ambigu || [], _texte_manque_par_ocr: B.hors_ocr || [], _blocs_ocr_parasites: E.ocr.filter((b) => !(B.bul || []).some((x) => x[0] === b.id)).map((b) => b.id).length,
  valide_par: null, date_validation: null };
for (const c of A.categories_test) verif(c, SA.categories_test.items.enum, 'categorie');
const persoIds = new Set(A.personnages.map((p) => p.id)); for (const b of A.bulles) if (b.locuteur && !['hors_champ', 'narrateur'].includes(b.locuteur) && !persoIds.has(b.locuteur)) err.push(`bulle ${b.ocr} : locuteur ${b.locuteur} absent des personnages`);
if (err.length) { console.error('ERREURS :\n' + err.join('\n')); process.exit(1); }
writeFileSync(join(C, 'annotations-a-faire', nom + '.json'), JSON.stringify(A, null, 1));
console.log(`${nom} : ${cases.length} cases, ${A.personnages.length} apparitions de personnages, ${A.actions.length} actions, ${A.bulles.length} bulles (${A._blocs_ocr_parasites} blocs OCR non retenus comme texte)`);
