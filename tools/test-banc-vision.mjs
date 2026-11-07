// DA-PRIME · test mécanique du banc Comic Vision (tools/banc-vision) : aucune donnée réelle, aucun modèle, aucun réseau externe.
// Page synthétique générée ici, faux llama-server local (réponses fabriquées) ; vérifie exécution, reprise, schéma, alertes et notation.
import { mkdtempSync, writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync, rmSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { ecrirePng, lirePng, decouper, reduire } from './banc-vision/outils/png.mjs';

const K = join(dirname(fileURLToPath(import.meta.url)), 'banc-vision'), T = mkdtempSync(join(tmpdir(), 'banc-vision-')), PORT = 18091;
let ok = 0, ko = 0; const t = (nom, c) => { if (c) ok++; else { ko++; console.log('ÉCHEC :', nom); } };
try {
  // 1. PNG : écriture / lecture / découpe / réduction
  const w = 400, h = 600, rgb = Buffer.alloc(w * h * 3, 255); for (let y = 100; y < 300; y++) for (let x = 50; x < 200; x++) rgb[(y * w + x) * 3 + 1] = 0;
  const png = ecrirePng({ w, h, rgb }), lu = lirePng(png); t('png aller-retour', lu.w === w && lu.h === h && lu.rgb.equals(rgb));
  const d = decouper(lu, { x: 0.1, y: 0.1, w: 0.5, h: 0.5 }, 0); t('découpe', d.img.w === 200 && d.img.h === 300 && Math.abs(d.zonePage.x - 0.1) < 1e-9);
  t('réduction', reduire(lu, 100).h === 100);
  // 2. Corpus synthétique (hors dépôt)
  const C = join(T, 'corpus'); for (const s of ['pages', 'entrees', 'annotations']) mkdirSync(join(C, s), { recursive: true });
  writeFileSync(join(C, 'pages/p1.png'), png);
  writeFileSync(join(C, 'entrees/p1.json'), JSON.stringify({ page: 'p1.png', nature_page: 'histoire', cases: [{ id: 'C1', ordre: 1, zone: { x: 0, y: 0, w: 1, h: 0.5 } }, { id: 'C2', ordre: 2, zone: { x: 0, y: 0.5, w: 1, h: 0.5 } }],
    ocr: [{ id: 'O1', case: 'C1', zone: { x: 0.1, y: 0.05, w: 0.3, h: 0.05 }, texte: 'HELLO THERE', nature: null }] }));
  writeFileSync(join(C, 'annotations/p1.json'), JSON.stringify({ page: 'p1.png', corpus: 'controle', nature_page: 'histoire', cases: [{ id: 'C1', ordre: 1, zone: { x: 0, y: 0, w: 1, h: 0.5 } }, { id: 'C2', ordre: 2, zone: { x: 0, y: 0.5, w: 1, h: 0.5 } }],
    personnages: [{ id: 'PA', case: 'C1', zone: { x: 0.1, y: 0.1, w: 0.4, h: 0.4 }, identite: null, identite_deductible_de_la_page: false }], objets: [], actions: [], relations: [],
    bulles: [{ ocr: 'O1', nature: 'dialogue', locuteur: 'PA', locuteur_certain: true }], continuite: [], faits_page: [], a_ne_pas_inventer: ['John Doe'], ambigu: ['qui parle'], valide_par: 'TEST', date_validation: null }));
  // 3. Faux serveur + exécution + reprise
  const srv = spawn(process.execPath, [join(K, 'tests/faux-serveur.mjs'), String(PORT)], { stdio: ['ignore', 'pipe', 'inherit'] });
  await new Promise((r) => srv.stdout.once('data', r));
  const R = join(T, 'resultats'), run = () => spawnSync(process.execPath, [join(K, 'outils/executer-banc.mjs'), '--corpus', C, '--sortie', R, '--etiquette', 'test', '--port', String(PORT), '--modele', 'FAUX'], { encoding: 'utf8', timeout: 120000 });
  const r1 = run(), dossier = join(R, 'test/p1'); t('exécution', r1.status === 0 && existsSync(join(dossier, 'A-page.json')) && existsSync(join(dossier, 'B-C2.json')) && existsSync(join(dossier, 'C-synthese.json')));
  const r2 = run(); t('reprise sans nouvelle requête', r2.status === 0 && !/·\s[ABC]\s/.test(r2.stdout) && !/case C\d…/.test(r2.stdout));
  const ex = JSON.parse(readFileSync(join(R, 'test/execution.json'), 'utf8')); t('provenance enregistrée', ex.serveur.build === 'FAUX-SERVEUR-TEST' && ex.invites === 'invites-v1' && ex.machine.coeurs > 0);
  srv.kill();
  // 4. Notation : alertes automatiques et fiche humaine
  const n = spawnSync(process.execPath, [join(K, 'outils/noter.mjs'), '--corpus', C, '--resultats', R, '--etiquette', 'test'], { encoding: 'utf8' });
  t('notation', n.status === 0 && existsSync(join(R, 'test/rapport.md')));
  const md = readFileSync(join(R, 'test/rapport.md'), 'utf8');
  for (const a of ['citation_hors_ocr', 'identite_non_justifiee', 'bulle_inexistante', 'element_interdit_present']) t(`alerte ${a}`, md.includes(a));
  t('mesure des bulles déclarées', md.includes('Bulles déclarées'));
  t('fiche CSV', readFileSync(join(R, 'test/fiche-jugement.csv'), 'utf8').split('\n').length > 5);
  t('annotations non validées ignorées par défaut', (() => { const a = JSON.parse(readFileSync(join(C, 'annotations/p1.json'), 'utf8')); a.valide_par = null; writeFileSync(join(C, 'annotations/p1.json'), JSON.stringify(a));
    spawnSync(process.execPath, [join(K, 'outils/noter.mjs'), '--corpus', C, '--resultats', R, '--etiquette', 'test'], { encoding: 'utf8' }); return readFileSync(join(R, 'test/rapport.md'), 'utf8').includes('Corpus non-annote'); })());
  // 5. Le kit ne contient ni image ni poids
  const lourds = []; const voir = (d) => { for (const f of readdirSync(d, { withFileTypes: true })) { const p = join(d, f.name); if (f.isDirectory()) voir(p); else if (/\.(png|jpe?g|webp|gguf|pdf|cbz|cbr)$/i.test(f.name)) lourds.push(p); } }; voir(K);
  t('aucune image ni aucun poids dans le kit', lourds.length === 0);
} finally { rmSync(T, { recursive: true, force: true }); }
console.log(`${ok} réussi(s), ${ko} échec(s)`); process.exit(ko ? 1 : 0);
