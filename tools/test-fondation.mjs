// DA-PRIME · tests de la fondation 0.11.0 : base de connaissances, validation, moteurs, serveur local, file de traitements,
// capacités, migration d'une base 0.10 réelle (IndexedDB v5) et contrôle avant export. Aucun modèle d'IA n'est utilisé.
// Usage : node tools/test-fondation.mjs [--unitaires]
import { createServer } from 'node:http';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import os from 'node:os';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'), imp = (p) => import(pathToFileURL(join(ROOT, p)));
const res = []; const ok = (c, m) => { res.push(!!c); console.log(`  ${c ? 'ok' : 'KO'}  ${m}`); };
const fin = () => { const ko = res.filter((c) => !c).length; console.log(ko ? `\n${ko} test(s) en échec sur ${res.length}.` : `\n${res.length} tests de la fondation 0.11.0 réussis.`); process.exit(ko ? 1 : 0); };
const K = await imp('templates/_systeme/connaissances.js'), MO = await imp('templates/_systeme/moteurs.js');

console.log('Base de connaissances et moteurs (Node)');
{
  const a = K.normaliser({ id: 'x', contenu: 'Le héros quitte la ville.', categorie: 'visuel', page: '3' });
  ok(a.statut === 'a-verifier' && a.page === 3 && a.methode === 'manuel' && a.confiance === 1 && a.historique.length === 0, 'assertion normalisée : « à vérifier » par défaut, méthode et confiance renseignées');
  K.changerStatut(a, 'valide'); K.modifierContenu(a, 'Le héros quitte la ville en flammes.');
  ok(a.statut === 'a-verifier' && a.historique.length === 2 && a.historique[1].motif.includes('modifié après validation'), 'contenu modifié après validation : retour « à vérifier », historique tracé');
  let vide = false; try { K.changerStatut(K.normaliser({ id: 'v', contenu: ' ' }), 'valide'); } catch { vide = true; } ok(vide, 'une information vide ne peut pas être validée');
  const comic = { id: 'c1', validation: { evenements: true, personnages: false }, analyse: { evenements: [{ id: 'e1', texte: 'Il révèle que le gardien est son frère.', provenance: 'dialogue', page: 4, case: 2, importance: 3 }, { id: 'e2', texte: 'Peut-être un complot.', provenance: 'incertain', page: 5 }, { id: 'e3', texte: 'Le gardien a tout orchestré.', provenance: 'interpretation', page: 6 }], personnages: [{ nom: 'Gardien', role: 'antagoniste', provenance: 'dialogue' }] } };
  const pages = [{ id: 'p4', index: 3, transcriptions: [{ id: 't1', type: 'dialogue', texte: 'Tu ne savais pas ?', statut: 'lu', case: 2, personnage: 'Gardien' }, { id: 't2', type: 'cartouche', texte: '', statut: 'illisible' }, { id: 't3', type: 'dialogue', texte: 'Je…', statut: 'illisible' }] }];
  const m = K.assertionsDepuisComic(comic, pages), par = (id) => m.find((x) => x.id === id);
  ok(par('ev:e1').statut === 'valide' && par('ev:e1').categorie === 'dialogue' && par('ev:e1').page === 4 && par('ev:e1').case === 2 && par('ev:e1').methode === 'migration'
    && par('ev:e2').statut === 'a-verifier' && par('ev:e2').categorie === 'incertain' && par('tx:t1').categorie === 'dialogue' && par('tx:t1').page === 4 && par('tx:t2').statut === 'brouillon' && par('tx:t3').categorie === 'incertain' && par('tx:t3').confiance === 0
    && par('pe:c1:gardien').statut === 'a-verifier', 'migration 0.10 : validation existante conservée, incertain jamais validé, illisible = incertain (confiance 0), références page/case gardées');
  ok(K.synchroniser(m, K.assertionsDepuisComic(comic, pages)).length === 0, 'migration idempotente (aucun changement au second passage)');
  const c2 = JSON.parse(JSON.stringify(comic)); c2.analyse.evenements[0].texte = 'Il révèle que le gardien est son père.'; c2.analyse.evenements.pop();
  const act = K.synchroniser(m, K.assertionsDepuisComic(c2, pages)), mod = act.find((x) => x.action === 'modif'), orph = act.find((x) => x.action === 'orpheline');
  ok(mod?.assertion.statut === 'a-verifier' && mod.assertion.historique.at(-1).par === 'synchronisation' && orph?.assertion.id === 'ev:e3', 'synchronisation : texte modifié → à revérifier ; événement supprimé → orphelin');
  const kb = [...m, K.normaliser({ id: 'h1', contenu: 'Hypothèse forte', categorie: 'hypothese', statut: 'valide', comic: 'c1' }), K.normaliser({ id: 'r1', contenu: 'Rejetée', categorie: 'visuel', statut: 'rejete', comic: 'c1' })];
  K.changerStatut(kb.find((x) => x.id === 'ev:e3'), 'valide'); const pts = K.pointsPourScript(kb, ['c1']);
  ok(pts.map((x) => x.assertion).join() === 'ev:e1,ev:e3' && pts[1].provenance === 'interpretation' && pts[0].ref.page === 4, 'matière de script : seules les informations validées admises (hypothèse, incertain, rejeté, transcriptions exclus), ordre et références conservés');
  const projet = { points: pts }; ok(K.controlerScript(projet, kb).bloquants === 0 && K.controlerScript(projet, kb).problemes.some((p) => p.gravite === 'info'), 'contrôle avant export : interprétation signalée, aucun bloquant');
  K.changerStatut(kb.find((x) => x.id === 'ev:e1'), 'a-verifier'); ok(K.controlerScript(projet, kb).bloquants === 1, 'information dévalidée après coup : export bloqué (brouillon)');
  const b0 = K.normaliser({ id: 'b0', contenu: '', statut: 'brouillon' }); K.modifierContenu(b0, 'Texte ajouté ensuite.'); K.modifierContenu(b0, '');
  ok(b0.historique.map((h) => h.vers).join() === 'a-verifier,brouillon', 'brouillon rempli → « à vérifier » (validable) ; contenu vidé → brouillon');
  const ancien = { points: [{ id: 'p010', cle: 'e1', texte: 'Point repris en 0.10', ref: { comic: 'c1', page: 4 } }, { id: 'libre', texte: 'Point saisi à la main' }] };
  const kb2 = [K.normaliser({ id: 'ev:e1', contenu: 'x', statut: 'rejete' })]; ok(K.controlerScript(ancien, kb2).bloquants === 1 && K.controlerScript(ancien, []).bloquants === 1 && K.controlerScript({ points: [ancien.points[1]] }, []).bloquants === 0, 'projet 0.10 (points sans lien) : source rejetée ou supprimée → export bloqué ; point manuel non concerné');
  const ad = ['http://localhost:11434', 'http://127.0.0.1:4180', 'http://192.168.1.20:4180', 'http://10.0.0.5', 'http://172.16.3.4', 'http://pc-studio.local:4180', 'http://[::1]:11434'], refus = ['https://api.example.com', 'http://8.8.8.8:11434', 'http://172.32.0.1', 'ftp://localhost'];
  ok(ad.every((u) => MO.adresseLocale(u).ok) && refus.every((u) => !MO.adresseLocale(u).ok), 'moteurs : adresses locales et privées acceptées, Internet et protocoles exotiques refusés');
  const p0 = MO.profilRecommande({}), p1 = MO.profilRecommande({ coeurs: 8, ramGo: 8 }), p2 = MO.profilRecommande({ serveur: { ramGo: 16, vramGo: 8, coeurs: 8 } }), p3 = MO.profilRecommande({ serveur: { ramGo: 64, vramGo: 24, coeurs: 16 } }), p4 = MO.profilRecommande({ mobile: true, ramGo: 8 });
  ok(p0.profil === 'leger' && p0.raisons.some((r) => /inconnue/.test(r)) && p1.profil === 'leger' && p2.profil === 'standard' && p3.profil === 'qualite' && p4.profil === 'mobile', `profils : capacités inconnues → léger (jamais supposées), 16 Go + GPU 8 Go → standard, GPU 24 Go → qualité, mobile → délégué (${p0.raisons.join(' ; ')})`);
  ok(Object.values(MO.ADAPTATEURS).filter((a) => a.etat === 'disponible' && a.type !== 'ocr').every((a) => a.mode === 'manuel'), 'vision et rédaction : aucun moteur d\'IA disponible (modes manuels seulement ; l\'OCR local arrive en 0.11.1)');
}
console.log('Serveur local des moteurs (Node)');
const SM = await imp('tools/serveur-moteurs.mjs');
{
  const { srv, jeton } = await SM.demarrer({ port: 4187, reseau: true }), g = (p, h = {}) => fetch(`http://127.0.0.1:4187${p}`, { headers: h }), J = { 'X-DA-PRIME-Jeton': jeton };
  const sans = await g('/api/capacites'), avec = await (await g('/api/capacites', J)).json(), sante = await (await g('/api/sante', J)).json();
  ok(sans.status === 401 && jeton.length >= 32, 'mode réseau : API refusée sans jeton (401), jeton aléatoire de 144 bits');
  ok(avec.coeurs === os.cpus().length && Math.abs(avec.ramGo - os.totalmem() / 1073741824) < 0.2 && avec.disque?.libreGo > 0 && (avec.gpus.length ? true : avec.vramGo === null), `capacités réelles du PC : ${avec.coeurs} cœurs, ${avec.ramGo} Go, disque ${avec.disque?.libreGo} Go libres, mémoire vidéo ${avec.vramGo ?? 'inconnue (aucun GPU NVIDIA)'} — rien d'inventé`);
  ok(sante.moteurs.ocr.etat === 'non installé' && sante.moteurs.vision.etat === 'non installé' && sante.moteurs.ecriture.etat === 'non installé', 'santé : les trois moteurs déclarés « non installé »');
  const codes = await Promise.all(['/atelier/script/', '/docs/SCRIPT_STUDIO.md', '/tools/serve.mjs', '/.git/config', '/package.json', '/brand/00_originaux/x', '/../etc/passwd'].map(async (p) => (await g(p)).status)), post = await fetch('http://127.0.0.1:4187/api/sante', { method: 'POST', headers: J });
  ok(codes[0] === 200 && codes.slice(1).every((c) => c === 404) && post.status === 405, `fichiers servis : application seulement (documents, outils, dépôt Git, originaux refusés : ${codes.join(', ')}) ; écriture interdite (405)`);
  const pre = (o) => fetch('http://127.0.0.1:4187/api/sante', { method: 'OPTIONS', headers: { Origin: o } }), cl = await pre('http://192.168.1.20:4173'), ci = await pre('https://exemple.com'), gi = await fetch('http://127.0.0.1:4187/api/sante', { headers: { ...J, Origin: 'https://exemple.com' } });
  ok(cl.status === 204 && cl.headers.get('access-control-allow-origin') === 'http://192.168.1.20:4173' && ci.status === 403 && !gi.headers.get('access-control-allow-origin'), 'DA-PRIME ouvert depuis une autre adresse locale : accès autorisé (CORS) ; origines Internet refusées');
  srv.close();
}
if (process.argv.includes('--unitaires')) fin();

// ---------- Intégration navigateur ----------
console.log('Intégration (Chromium)');
const { chromium, devices } = createRequire(import.meta.url)('playwright');
const { srv: serveur } = await SM.demarrer({ port: 4188 });   // DA-PRIME servi par le serveur local (mode PC direct)
const faux = createServer((q, r) => { r.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); r.end(JSON.stringify(q.url === '/api/tags' ? { models: [{ name: 'qwen3:8b' }] } : {})); }); await new Promise((r) => faux.listen(4189, '127.0.0.1', r));
const browser = await chromium.launch(), ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true }), p = await ctx.newPage(), err = [];
p.on('pageerror', (x) => err.push(x.message)); p.on('console', (m) => m.type() === 'error' && !/Failed to load resource/.test(m.text()) && err.push(m.text())); p.on('dialog', (d) => d.accept());
const B = 'http://localhost:4188', D = (f, a) => p.evaluate(f, a), att = (ms = 200) => p.waitForTimeout(ms);
// Attente d'une condition asynchrone (waitForFunction ne sait pas attendre une promesse)
const attendreQue = async (f, a, delai = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < delai) { if (await p.evaluate(f, a).catch(() => false)) return true; await att(150); } throw new Error('condition non atteinte'); };
// 1. Base 0.10 réelle (IndexedDB version 5) créée AVANT la mise à jour, puis ouverte par la 0.11
await p.goto(`${B}/index.html`);
await D(async () => { const V5 = ['creations', 'ressources', 'versions', 'modeles', 'composants', 'presets', 'campagnes', 'profils', 'visuels', 'personnages', 'scripts', 'redaction', 'prompts', 'comics', 'pages'];
  const db = await new Promise((ok, ko) => { const r = indexedDB.open('primestone-motion', 5); r.onupgradeneeded = () => V5.forEach((m) => r.result.createObjectStore(m, { keyPath: 'id' })); r.onsuccess = () => ok(r.result); r.onerror = () => ko(r.error); });
  const c = document.createElement('canvas'); c.width = 600; c.height = 900; const g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, 600, 900); g.fillStyle = '#234'; [[20, 20], [310, 20], [20, 460], [310, 460]].forEach(([x, y]) => g.fillRect(x, y, 270, 420)); const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg'));
  const t = db.transaction(['comics', 'pages', 'scripts'], 'readwrite');
  t.objectStore('pages').put({ id: 'pgA', comic: 'cmA', index: 0, nom: 'p1.jpg', blob, w: 600, h: 900, vignette: '', cases: [], transcriptions: [{ id: 'txA', case: 1, type: 'dialogue', personnage: 'Gardien', texte: 'Tu ne savais pas ?', statut: 'lu' }, { id: 'txB', case: 2, type: 'dialogue', personnage: '', texte: '[illisible]', statut: 'illisible' }], notesVisuelles: '' });
  t.objectStore('pages').put({ id: 'pgB', comic: 'cmA', index: 1, nom: 'p2.jpg', blob, w: 600, h: 900, vignette: '', cases: [], transcriptions: [] });
  t.objectStore('comics').put({ id: 'cmA', genre: 'numero', serie: 'Saga Test', numero: '7', titre: '', source: 'test', hash: 'h', pages: ['pgA', 'pgB'], analyse: { resume: 'Résumé', personnages: [{ nom: 'Gardien', role: 'antagoniste', provenance: 'dialogue' }], evenements: [{ id: 'evA', texte: 'Le gardien révèle son identité.', page: 1, case: 1, provenance: 'dialogue', importance: 3 }, { id: 'evB', texte: 'Un complot, peut-être.', page: 2, provenance: 'incertain', importance: 2 }], lieux: '', relations: '', incertitudes: '' }, validation: { evenements: true } });
  t.objectStore('scripts').put({ id: 'spA', v: 1, nom: 'Projet 0.10', sujet: 'Saga Test', duree: 180, plateforme: 'youtube', type: 'analyse', public: '', objectif: '', ton: '', profondeur: 'intermediaire', question: '', promesse: '', conflit: '', enjeu: '', pointDeVue: '', titres: [], miniatures: [], suggestions: [], sources: [], points: [{ id: 'ptA', cle: 'evA', texte: 'Le gardien révèle son identité.', importance: 3, provenance: 'dialogue', ref: { comic: 'cmA', page: 1 } }], comics: ['cmA'], notes: '', sequences: [], versions: [], archive: false, cree: 1, modifie: 1, etapes: {} });
  await new Promise((r) => { t.oncomplete = r; }); db.close(); });
await p.goto(`${B}/atelier/script/#moteurs`); await p.waitForFunction(() => window.__script, null, { timeout: 30000 });
await attendreQue(async () => (await window.__script.db.lire('reglages', 'migration-0.11'))?.numeros === 1);
const kbm = await D(async () => (await window.__script.db.tous('connaissances')).map((a) => [a.id, a.statut, a.categorie, a.page, a.methode]));
const v = (id) => kbm.find((x) => x[0] === id);
ok(v('ev:evA')?.[1] === 'valide' && v('ev:evB')?.[1] === 'a-verifier' && v('ev:evB')?.[2] === 'incertain' && v('tx:txA')?.[2] === 'dialogue' && v('tx:txB')?.[2] === 'incertain' && v('ev:evA')[4] === 'migration', `migration d'une vraie base 0.10 (IndexedDB v5 → v6) en arrière-plan : ${kbm.length} informations, statuts et provenance conservés`);
ok(await D(async () => { const s = await window.__script.db.lire('scripts', 'spA'), c = await window.__script.db.lire('comics', 'cmA'); return s?.points?.length === 1 && c?.analyse?.evenements?.length === 2; }), 'projets et analyses 0.10 intacts après migration');
// 2. Moteurs : capacités, serveur local détecté automatiquement, profil, Ollama local simulé
await p.waitForSelector('#capacites'); const capTxt = await p.textContent('#capacites'), srvTxt = await p.textContent('#serveur');
ok(/Cœurs logiques/.test(capTxt) && /Mémoire vidéo\s*inconnu/.test(capTxt) && /non mesurable/.test(capTxt), 'capacités du navigateur affichées, mémoire vidéo « inconnu » (non mesurable, jamais supposée)');
ok(new RegExp(`${os.cpus().length} cœurs`).test(srvTxt) && /Go libres/.test(srvTxt), 'serveur local détecté automatiquement (DA-PRIME servi par lui) : mesures réelles du PC affichées');
ok(/Recommandé :/.test(await p.textContent('#profil-moteurs')) && /non téléchargé/.test(await p.textContent('#profil-moteurs')), 'profil de configuration recommandé à partir des mesures ; modèles listés comme non téléchargés');
ok(await p.locator('select[data-moteur="ocr"] option:not([disabled])').count() === 2 && await p.locator('select[data-moteur="vision"] option:not([disabled])').count() === 1, 'moteurs non installés non sélectionnables (OCR : manuel + Tesseract ; vision : manuel seulement)');
await p.fill('#ollama-url', 'https://api.example.com'); await p.click('#tester-ollama'); await att(200); const refus = await p.textContent('#ollama-resultat');
await p.fill('#ollama-url', 'http://127.0.0.1:4189'); await p.click('#tester-ollama'); await p.waitForFunction(() => /Joignable/.test(document.querySelector('#ollama-resultat').textContent), null, { timeout: 8000 });
ok(/publique refusée/.test(refus) && /1 modèle\(s\) installé\(s\) : qwen3:8b/.test(await p.textContent('#ollama-resultat')), 'connexion Ollama : adresse publique refusée ; service local joignable, modèles listés sans exécution');
// 3. File de traitements : terminé, annulation, interruption + reprise du curseur, erreur + réessai
const tache = (etat, t = 15000) => p.waitForFunction((e) => document.querySelector('#liste-taches .tache')?.dataset.etat === e, etat, { timeout: t });
const file = (type, params) => D(async ([t, pa]) => (await window.__script.file.ajouter(t, pa)).id, [type, params]);
await p.click('#lancer-diagnostic'); await tache('termine'); ok(/100 %/.test(await p.textContent('#liste-taches .tache')), 'traitement en arrière-plan : progression jusqu\'à 100 %, terminé');
const idA = await file('diagnostic', { etapes: 40, pause: 100 }); await p.waitForFunction((id) => /[1-9]\d* %/.test(document.querySelector(`[data-tache="${id}"]`)?.textContent || ''), idA); await p.click(`[data-annuler="${idA}"]`); await tache('annule');
ok(true, 'annulation d\'un traitement en cours');
const idI = await file('diagnostic', { etapes: 30, pause: 150 }); await attendreQue(async (id) => ((await window.__script.db.lire('taches', id))?.curseur || 0) >= 6, idI); await p.reload(); await p.waitForFunction(() => window.__script);
await p.waitForSelector(`[data-tache="${idI}"][data-etat="interrompu"]`, { timeout: 10000 }); const cur = await D(async (id) => (await window.__script.db.lire('taches', id)).curseur, idI);
await p.click(`[data-reprendre="${idI}"]`); await p.waitForSelector(`[data-tache="${idI}"][data-etat="termine"]`, { timeout: 15000 }); const tI = await D(async (id) => window.__script.db.lire('taches', id), idI);
ok(cur >= 6 && tI.essais === 2 && tI.etat === 'termine', `page rechargée pendant un traitement : « interrompu » à l'étape ${cur}, reprise contrôlée depuis le curseur, terminé au 2e essai`);
const idE = await file('diagnostic', { etapes: 5, pause: 50, echouerA: 3 }); await p.waitForSelector(`[data-tache="${idE}"][data-etat="erreur"]`, { timeout: 10000 });
ok(/échec volontaire à l'étape 3/.test(await p.textContent(`[data-tache="${idE}"]`)), 'erreur d\'un traitement visible avec son message, réessai proposé');
// 4. Worker : détection des cases de tout un numéro en arrière-plan
const idW = await file('cases-numero', { comic: 'cmA' }); await p.waitForSelector(`[data-tache="${idW}"][data-etat="termine"]`, { timeout: 20000 });
const pw = await D(async () => (await window.__script.db.lire('pages', 'pgA')).cases.length);
ok(pw === 4, `Web Worker : cases de tout le numéro détectées hors du fil de l'interface (${pw} cases page 1)`);
// 5. Connaissances : validation humaine tracée
await p.click('[data-espace="connaissances"]'); await p.waitForSelector('#kb-liste');
await p.locator('[data-assertion="tx:txA"] [data-valider]').click(); await att(300);
await p.locator('[data-assertion="tx:txA"] button', { hasText: 'Détails' }).click(); await p.fill('#kb-contenu', 'Tu ne le savais pas ?'); await p.click('#kb-enregistrer'); await att(300);
const txA = await D(async () => window.__script.db.lire('connaissances', 'tx:txA'));
ok(txA.statut === 'a-verifier' && txA.historique.map((h) => h.vers).join() === 'valide,a-verifier', 'validation humaine tracée ; information modifiée après validation → « à vérifier »');
await p.locator('[data-filtre="statut"]').selectOption('a-verifier'); await att(200); const nb = await p.locator('#kb-liste [data-assertion]').count(); await p.click('text=Tout sélectionner'); await p.click('[data-lot="rejete"]'); await att(300);
ok(nb >= 2 && (await D(async () => (await window.__script.db.tous('connaissances')).filter((a) => a.statut === 'rejete').length)) >= nb, `filtres et validation groupée (${nb} informations rejetées en une fois)`);
// 6. Contrôle avant export : matière dont la source n'est plus validée
await D(async () => { const p = await window.__script.db.lire('scripts', 'spA'); p.points[0].assertion = 'ev:evA'; await window.__script.db.ecrire('scripts', p); const a = await window.__script.db.lire('connaissances', 'ev:evA'); a.statut = 'a-verifier'; await window.__script.db.ecrire('connaissances', a); });
await p.goto(`${B}/atelier/script/?projet=spA#projets`); await p.waitForFunction(() => window.__script?.projet?.()); await p.click('[data-etape="export"]'); await p.waitForFunction(() => /BROUILLON/.test(document.querySelector('#controle-export')?.textContent || ''));
const [dl] = await Promise.all([p.waitForEvent('download'), p.click('#telecharger-export')]);
ok(/brouillon/.test(dl.suggestedFilename()) && /à vérifier — ne peut pas figurer comme fait/.test(await p.textContent('#controle-export')), `export contrôlé : information non validée signalée, fichier marqué brouillon (${dl.suggestedFilename()})`);
// 6 bis. Suppression d'un numéro depuis l'espace Comics : ses informations sont rejetées (plus jamais utilisables), traces conservées
await p.goto('about:blank'); await p.goto(`${B}/atelier/script/#comics`); await p.waitForFunction(() => window.__script); await p.click('[data-comic="cmA"]'); await p.click('text=Supprimer ce numéro');
await attendreQue(async () => (await window.__script.db.tous('connaissances')).filter((a) => a.comic === 'cmA').every((a) => a.statut === 'rejete'));
ok((await D(async () => (await window.__script.db.tous('connaissances')).filter((a) => a.comic === 'cmA' && a.historique.at(-1)?.motif === 'numéro supprimé').length)) > 0, 'numéro supprimé : ses informations passent « rejetée » (motif tracé)');
// 7. Mobile : profil délégué, aucun modèle
const m = await browser.newContext({ ...devices['iPhone 13'] }), pm = await m.newPage(); await pm.goto(`${B}/atelier/script/#moteurs`); await pm.waitForSelector('#profil-moteurs');
ok(/Appareil mobile/.test(await pm.textContent('#profil-moteurs')) && (await pm.evaluate(() => document.documentElement.scrollWidth <= screen.width)), 'téléphone : profil « Appareil mobile » (moteurs délégués au PC), page sans débordement');
await m.close();
ok(!err.length, `aucune erreur JavaScript${err.length ? ' · ' + err.slice(0, 3).join(' | ') : ''}`);
await browser.close(); serveur.close(); faux.close(); fin();
