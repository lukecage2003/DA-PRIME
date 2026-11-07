// Crée annotations-a-faire/<page>.json à partir des entrées : cases proposées et blocs OCR pré-remplis, tout le reste vide,
// valide_par = null. Ce n'est PAS une référence : à corriger sur l'image, signer, puis déplacer dans annotations/.
// Usage : node outils/squelettes-annotation.mjs --corpus <dossier> --role reglage|controle
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from 'node:fs'; import { join, resolve } from 'node:path';
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const C = resolve(arg('corpus', '')), ROLE = arg('role', ''); if (!['reglage', 'controle'].includes(ROLE)) { console.error('--role reglage|controle'); process.exit(2); }
mkdirSync(join(C, 'annotations-a-faire'), { recursive: true });
for (const f of readdirSync(join(C, 'entrees')).filter((x) => x.endsWith('.json'))) {
  const E = JSON.parse(readFileSync(join(C, 'entrees', f), 'utf8')), cible = join(C, 'annotations-a-faire', f);
  if (existsSync(cible) || existsSync(join(C, 'annotations', f))) { console.log(`${f} : déjà commencé, non écrasé`); continue; }
  writeFileSync(cible, JSON.stringify({ page: E.page, corpus: ROLE, categories_test: [], nature_page: E.nature_page || '', _cases_source: E.cases_source,
    cases: E.cases.map((c) => ({ ...c, plan: '', angle: '', lieu: '' })), personnages: [], objets: [], actions: [], relations: [],
    bulles: E.ocr.map((b) => ({ ocr: b.id, _texte_ocr: b.texte, nature: '', locuteur: null, locuteur_certain: false })),
    continuite: [], faits_page: [], a_ne_pas_inventer: [], ambigu: [], valide_par: null, date_validation: null }, null, 1));
  console.log(`${f} : squelette créé (${E.cases.length} case(s) proposée(s), ${E.ocr.length} bloc(s))`);
}
