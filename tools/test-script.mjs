// DA-PRIME · tests de Script Studio : moteur éditorial (Node) puis parcours complet dans Chromium
// (comics CBZ et PDF générés par le test — aucun fichier personnel —, cases, transcription, analyse, arc, plan, script, critique, versions, exports, prompts).
// Usage : node tools/test-script.mjs [--moteur] [dossier-captures]
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..'), imp = (p) => import(pathToFileURL(join(ROOT, p)));
const res = []; const ok = (c, m) => { res.push(!!c); console.log(`  ${c ? 'ok' : 'KO'}  ${m}`); };
const fin = () => { const ko = res.filter((c) => !c).length; console.log(ko ? `\n${ko} test(s) en échec sur ${res.length}.` : `\n${res.length} tests Script Studio réussis.`); process.exit(ko ? 1 : 0); };
const SM = await imp('templates/_systeme/script-moteur.js'), PR = await imp('templates/_systeme/script-prompts.js');

console.log('Moteur éditorial (Node)');
{
  const cas = [['30 s', 30], ['3 min', 180], ['15', 900], ['1 h 30', 5400], ['1h30', 5400], ['2:30', 150], ['1:30:00', 5400], ['2 heures', 7200], ['45 secondes', 45]];
  ok(cas.every(([t, s]) => SM.lireDuree(t) === s), `durées libres : ${cas.map(([t]) => `« ${t} »`).join(', ')}`);
  const c = SM.compter('Une phrase de six mots ici. [PAUSE 2s] // note de montage\n[EXTRAIT 0:12] [VISUEL couverture] — Réplique dite.\nNOM : autre réplique', 150);
  ok(c.mots === 10 && c.pauses === 2 && c.extraits === 12 && c.motsDialogue === 4, `comptage : ${c.mots} mots prononcés (repères, notes et noms de locuteurs exclus), pauses ${c.pauses} s, extraits ${c.extraits} s, ${c.motsDialogue} mots de dialogue`);
  const durees = [['30 s', 'court'], ['3 min', 'intermediaire'], ['15 min', 'long'], ['30 min', 'long'], ['1 h', 'tres-long'], ['2 h', 'tres-long']], lignes = [];
  let bons = true;
  for (const [d, cl] of durees) { const p = SM.nouveauProjet({ duree: d, type: 'analyse' }), r = SM.construirePlan(p), s2 = r.sequences.filter((s) => s.niveau === 2), somme = s2.reduce((t, s) => t + s.budgetMots, 0), chap = r.sequences.filter((s) => s.niveau === 1).length, part = r.sequences.filter((s) => s.niveau === 0).length;
    lignes.push(`${d} → ${s2.length} séq., ${somme}/${r.motsTotal} mots${chap ? `, ${chap} chap.` : ''}${part ? `, ${part} parties` : ''}`);
    bons &&= r.classe === cl && s2[0].fonction === 'hook' && s2.some((s) => s.fonction === 'conclusion' || s.fonction === 'payoff') && Math.abs(somme - r.motsTotal) / r.motsTotal < 0.12 && (cl !== 'long' || chap >= 2) && (cl !== 'tres-long' || (part >= 1 && s2.some((s) => s.fonction === 'rappel'))); }
  ok(bons, `architecture par durée : ${lignes.join(' ; ')}`);
  const types = ['actualite', 'personnage', 'guide', 'versus', 'documentaire', 'critique', 'storytelling'], sigs = new Set(types.map((t) => SM.construirePlan(SM.nouveauProjet({ duree: '10 min', type: t })).sequences.map((s) => s.fonction).join('>')));
  ok(sigs.size >= 5, `${types.length} types de scripts : ${sigs.size} structures distinctes`);
  const pm = SM.nouveauProjet({ duree: '1 h', type: 'storytelling' }); pm.points = [1, 2, 3].map((i) => ({ id: `p${i}`, texte: `Fait ${i}`, importance: 3, ordre: i }));
  const rm = SM.construirePlan(pm); ok(rm.alertes.some((a) => /Matière insuffisante/.test(a)) && rm.sequences.filter((s) => s.niveau === 2).reduce((t, s) => t + s.budgetMots, 0) < rm.motsTotal * 0.5, 'matière insuffisante pour 1 h : signalée, aucun remplissage (budget réduit à la matière réelle)');
  const pc = SM.nouveauProjet({ duree: '30 s', type: 'resume' }); pc.points = [{ id: 'a', texte: 'Essentiel A', importance: 3, ordre: 1 }, { id: 'b', texte: 'Secondaire', importance: 1, ordre: 2 }, { id: 'c', texte: 'Douteux', importance: 3, ordre: 3, provenance: 'incertain' }];
  const rc = SM.construirePlan(pc), pts = rc.sequences.flatMap((s) => s.points); ok(pts.includes('a') && !pts.includes('b') && !pts.includes('c'), 'format court : seul l\'essentiel retenu ; information incertaine jamais utilisée automatiquement');
  // Analyse critique
  const p = SM.nouveauProjet({ duree: '3 min' }); p.sequences = SM.construirePlan(p).sequences;
  const S = (f) => p.sequences.find((s) => s.fonction === f);
  S('hook').texte = 'Bonjour à tous, dans cette vidéo on va parler de Galactus, le dévoreur de mondes, une entité cosmique qui a traversé les décennies, et qui fascine encore les lecteurs du monde entier depuis très longtemps maintenant.';
  S('promesse').texte = 'Vous découvrirez la véritable signification cosmique de Galactus et son rôle universel.';
  p.sequences.find((s) => s.fonction === 'progression').texte = 'Sans plus attendre, voici les faits. Galactus apparaît. Galactus mange. Galactus repart. Galactus revient.';
  const avant = JSON.stringify(p.sequences), a = SM.analyserScript(p), types2 = new Set(a.problemes.map((x) => x.type));
  ok(['hook-faible', 'hook-long', 'cliche', 'repetition', 'conclusion'].every((t) => types2.has(t)) && JSON.stringify(p.sequences) === avant, `analyse critique : ${[...types2].join(', ')} — aucun texte modifié par l'analyse`);
  const cl = a.problemes.find((x) => x.type === 'cliche' && /plus attendre/i.test(x.passage)); SM.appliquerCorrection(p, cl);
  ok(!/sans plus attendre/i.test(p.sequences.find((s) => s.fonction === 'progression').texte), 'correction appliquée uniquement sur acceptation (cliché retiré)');
  const longue = a.problemes.find((x) => x.type === 'hook-long'); ok(longue.correction.mode === 'remplacer' && longue.correction.apres.split('.').length > longue.correction.avant.split('.').length, 'phrase trop longue : découpe proposée à une articulation naturelle');
  ok(a.rythme.length === p.sequences.filter((s) => s.niveau === 2).length && a.rythme.every((x) => x.intensite >= 0), 'courbe de rythme indicative par séquence');
  // Adaptation
  p.points = [{ id: 'x', texte: 'Point clé', importance: 3, ordre: 0 }]; const ad = SM.adapter(p, { plateforme: 'shorts', duree: 45 });
  ok(ad.projet.id !== p.id && SM.classeDuree(ad.projet.duree) === 'court' && ad.projet.sequences[0].fonction === 'hook' && ad.projet.sequences.every((s) => !s.texte) && ad.projet.sequences.some((s) => /Version d'origine/.test(s.notes)), 'adaptation Shorts : projet indépendant, plan reconstruit, texte d\'origine en note (pas de simple coupe)');
  // Versions et exports
  const d = SM.comparer('le héros sauve la ville', 'le héros perd la ville'), recA = d.filter((x) => x.t !== '+').map((x) => x.s).join(''), recB = d.filter((x) => x.t !== '-').map((x) => x.s).join('');
  ok(recA === 'le héros sauve la ville' && recB === 'le héros perd la ville' && d.some((x) => x.t === '-' && x.s.includes('sauve')), 'comparaison de versions mot à mot');
  S('hook').texte = 'Un dévoreur de mondes. [PAUSE 1s] Et pourtant, il a faim de sens.'; const srt = SM.exporter(p, 'srt'), csv = SM.exporter(p, 'montage'), tc = [...SM.exporter(p, 'timecodes').matchAll(/\[(\d\d:\d\d:\d\d) →/g)].map((m) => m[1]);
  ok(/^1\n00:00:00,000 --> 00:00:0\d,\d{3}\n/.test(srt) && csv.startsWith('\uFEFFentree;sortie') && tc.length > 3 && tc.every((t, i) => !i || t >= tc[i - 1]), 'exports : SRT valide, plan de montage CSV, timecodes croissants');
  ok(Object.keys(SM.EXPORTS).every((f) => SM.exporter(p, f).length > 10), `${Object.keys(SM.EXPORTS).length} formats d'export`);
  // Prompts
  const v = PR.variables(p, { profil: SM.PROFIL0 }), tout = Object.values(PR.MODELES).flatMap((m) => [PR.remplir(m.compact, v), PR.remplir(m.detaille, v)]);
  ok(tout.every((t) => !/\{\{/.test(t)) && Object.values(PR.MODELES).every((m) => PR.remplir(m.compact, v).length < PR.remplir(m.detaille, v).length) && Object.keys(PR.MODELES).length === 9, '9 modèles de prompts, variables résolues, version compacte plus courte que la détaillée');
  ok(/n'invente aucun fait/.test(PR.remplir(PR.MODELES.creation.compact, v)) && /\[À VÉRIFIER\]/.test(PR.remplir(PR.MODELES.creation.detaille, v)), 'règles de fiabilité incluses dans les prompts de création');
  const archi = SM.architecte('Fais-moi un VS entre Black Panther et Batman.'); ok(archi.angles.length >= 5 && archi.suggestions.every((s) => s.statut === 'propose') && archi.suggestions.some((s) => s.genre === 'miniature'), `architecte éditorial : ${archi.angles.length} angles, ${archi.suggestions.length} suggestions à accepter ou rejeter`);
}
if (process.argv.includes('--moteur')) fin();

// ---------- Chromium : parcours complet ----------
console.log('Script Studio (Chromium)');
const OUT = process.argv.slice(2).find((a) => !a.startsWith('--')) || join(tmpdir(), 'primestone-tests-script'); mkdirSync(OUT, { recursive: true });
// PDF minimal de test (formes vectorielles, aucune image tierce)
function pdfTest(n) {
  const obj = [], ajout = (s) => { obj.push(s); return obj.length; }, pages = [];
  const cat = ajout(''), arbre = ajout('');
  for (let i = 0; i < n; i++) { const flux = `0.95 g 0 0 600 900 re f 0.1 g 40 470 250 390 re f 310 470 250 390 re f 40 40 520 390 re f 1 0.9 0 rg 60 ${500 + i * 20} 80 80 re f`, c = ajout(`<< /Length ${flux.length} >>\nstream\n${flux}\nendstream`); pages.push(ajout(`<< /Type /Page /Parent ${arbre} 0 R /MediaBox [0 0 600 900] /Contents ${c} 0 R >>`)); }
  obj[cat - 1] = `<< /Type /Catalog /Pages ${arbre} 0 R >>`; obj[arbre - 1] = `<< /Type /Pages /Kids [${pages.map((p) => `${p} 0 R`).join(' ')}] /Count ${n} >>`;
  let s = '%PDF-1.4\n'; const off = []; obj.forEach((o, i) => { off.push(s.length); s += `${i + 1} 0 obj\n${o}\nendobj\n`; });
  const x = s.length; s += `xref\n0 ${obj.length + 1}\n0000000000 65535 f \n${off.map((o) => `${String(o).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size ${obj.length + 1} /Root ${cat} 0 R >>\nstartxref\n${x}\n%%EOF\n`;
  return Buffer.from(s, 'latin1');
}
const { chromium } = createRequire(import.meta.url)('playwright'), { demarrer } = await imp('tools/serve.mjs');
const PORT = 4198, URL0 = `http://localhost:${PORT}/atelier/`, srv = await demarrer(PORT), browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 1000 }, acceptDownloads: true }), p = await ctx.newPage(), err = [];
p.on('pageerror', (x) => err.push(x.message)); p.on('console', (m) => m.type() === 'error' && err.push(m.text())); p.on('dialog', (d) => d.accept(d.type() === 'prompt' ? 'Première version' : undefined));
const D = (f, a) => p.evaluate(f, a), att = (ms = 150) => p.waitForTimeout(ms), etat = () => p.textContent('#etat'), attendreEtat = (re, t = 60000) => p.waitForFunction((s) => new RegExp(s).test(document.querySelector('#etat').textContent), re.source, { timeout: t });
const dl = async (fn, nom) => { const [x] = await Promise.all([p.waitForEvent('download', { timeout: 60000 }), fn()]); const f = join(OUT, nom); await x.saveAs(f); return readFileSync(f, 'utf8'); };
await p.goto(URL0 + 'script/#comics'); await p.waitForFunction(() => window.__script, null, { timeout: 30000 });
// CBZ généré dans le navigateur : grille 2×2 à gouttières blanches, double page, page dupliquée, page pleine
const cbz = await D(async () => { const { zip } = await import('../motion/zip.js'), pg = async (w, h, fn) => { const c = Object.assign(document.createElement('canvas'), { width: w, height: h }), g = c.getContext('2d'); g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); fn(g); return new Uint8Array(await (await new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.9))).arrayBuffer()); };
  const grille = await pg(800, 1200, (g) => { g.fillStyle = '#233'; for (const [x, y] of [[30, 30], [415, 30], [30, 615], [415, 615]]) g.fillRect(x, y, 355, 555); g.fillStyle = '#e44'; g.fillRect(100, 100, 80, 80); });
  const dbl = await pg(1600, 1200, (g) => { g.fillStyle = '#335'; g.fillRect(30, 30, 1540, 1140); }), plein = await pg(800, 1200, (g) => { g.fillStyle = '#552'; g.fillRect(0, 0, 800, 1200); });
  return btoa(String.fromCharCode(...zip([{ nom: 'Test Saga 01/p01.jpg', data: grille }, { nom: 'Test Saga 01/p02.jpg', data: dbl }, { nom: 'Test Saga 01/p03.jpg', data: grille }, { nom: 'Test Saga 01/p10.jpg', data: plein }]))); });
const fCbz = { name: 'Test Saga 01.cbz', mimeType: 'application/zip', buffer: Buffer.from(cbz, 'base64') }, fPdf = { name: 'Test Saga 02.pdf', mimeType: 'application/pdf', buffer: pdfTest(2) };
await p.setInputFiles('#import-comics', [fCbz]); await attendreEtat(/importé/);
let m = await etat(); ok(/4 pages/.test(m) && /1 double/.test(m) && /1 page\(s\) en double exclue/.test(m), `import CBZ : ${m}`);
ok(await p.locator('.vignette-page').count() === 4 && await p.locator('.vignette-page[data-exclue="1"]').count() === 1, 'pages prévisualisées, doublon exclu automatiquement');
await p.setInputFiles('#import-comics', [fCbz]); await attendreEtat(/déjà dans la bibliothèque/); ok(true, 'réimport du même CBZ : doublon détecté, non dupliqué');
await p.setInputFiles('#import-comics', [{ name: 'X.cbr', mimeType: 'application/x-rar', buffer: Buffer.from('Rar!') }]); await attendreEtat(/CBR/); ok(/convertir en CBZ/i.test(await etat()), 'CBR : limite signalée honnêtement (conversion en CBZ proposée)');
await p.setInputFiles('#import-comics', [fPdf]); await attendreEtat(/importé/, 90000); m = await etat(); ok(/2 pages/.test(m), `import PDF (pdf.js local) : ${m}`);
const numeros = await D(async () => (await window.__script.db.tous('comics')).filter((c) => c.genre === 'numero').map((c) => ({ id: c.id, serie: c.serie, numero: c.numero })));
ok(numeros.length === 2 && numeros.every((c) => c.serie === 'Test Saga') && numeros.map((c) => c.numero).sort().join() === '1,2', `série et numéro déduits des noms de fichiers : ${numeros.map((c) => `${c.serie} #${c.numero}`).join(', ')}`);
// Numéro 1 : cases, transcription, analyse, validation
await p.locator(`#liste-comics [data-comic="${numeros.find((c) => c.numero === '1').id}"]`).click(); await p.waitForSelector('#detecter-cases');
await p.click('#detecter-cases'); await attendreEtat(/case\(s\) détectée/); const cases = await p.locator('#cadre-page .case').count();
const pos = await p.$$eval('#cadre-page .case', (l) => l.map((x) => [parseFloat(x.style.left), parseFloat(x.style.top)]));
ok(cases === 4 && pos[0][0] < pos[1][0] && pos[1][1] < pos[2][1], `détection géométrique des cases : ${cases} cases, ordre de lecture gauche→droite puis haut→bas`);
await p.click('#ajouter-texte'); await p.waitForSelector('#transcriptions textarea'); await p.fill('#transcriptions textarea', 'Je reviendrai.'); await p.press('#transcriptions textarea', 'Tab'); await p.locator('#transcriptions select').nth(2).selectOption('incertain'); await att(300);
await p.fill('#notes-visuelles', 'Le héros quitte la ville en flammes.'); await p.press('#notes-visuelles', 'Tab'); await att(200);
for (const [t, pv] of [['Le héros affronte le gardien sur le toit.', 'visuel'], ['Il révèle que le gardien est son frère.', 'dialogue'], ['Le gardien aurait orchestré la chute de la ville.', 'interpretation']]) { await p.click('#ajouter-evenement'); await att(250); const l = p.locator('[data-evenement]').last(); await l.locator('textarea').fill(t); await l.locator('textarea').press('Tab'); await l.locator('select').first().selectOption(pv); await att(150); }
await p.locator('[data-valider="evenements"]').check(); await p.locator('[data-valider="resume"]').check(); await att(300);
const n1 = await D(async () => (await window.__script.db.tous('comics')).find((c) => c.numero === '1'));
ok(n1.analyse.evenements.length === 3 && n1.analyse.evenements.map((e) => e.provenance).join() === 'visuel,dialogue,interpretation' && n1.validation.evenements, 'analyse du numéro : événements avec page et provenance (visuel, dialogue, interprétation), validés par l\'utilisateur');
// Arc → projet
await p.click('#nouvel-arc'); await p.waitForSelector('#nom-arc'); await p.fill('#nom-arc', 'La chute'); await p.press('#nom-arc', 'Tab');
for (const c of numeros.sort((a, b) => a.numero - b.numero)) { await p.locator('#comic select').first().selectOption(c.id); await att(300); }
await p.click('#projet-arc'); await p.waitForURL(/projet=/); await p.waitForFunction(() => window.__script?.projet?.(), null, { timeout: 30000 }).catch(() => console.log('erreurs', err));
let P = await D(() => window.__script.projet()); ok(P.comics.length === 2 && P.nom === 'La chute', 'arc de deux numéros → projet de script associé');
await p.click('[data-etape="sources"]'); await p.click('#reprendre-comics'); await att(300); m = await etat();
P = await D(() => window.__script.projet()); ok(P.points.length === 3 && P.points.every((x) => x.ref?.page && x.refTexte?.startsWith('Test Saga #1')) && /1 numéro\(s\) ignoré/.test(m), `événements repris avec leurs références ; numéro non validé ignoré (${m})`);
await p.click('[data-etape="projet"]'); await p.fill('#duree-projet', '3 min'); await p.press('#duree-projet', 'Tab'); await att(200);
await p.click('[data-etape="plan"]'); await p.click('#construire-plan'); await att(300); P = await D(() => window.__script.projet());
const avecRefs = P.sequences.filter((s) => s.refs?.length); ok(P.sequences.length >= 6 && avecRefs.length >= 1 && P.sequences.flatMap((s) => s.points).length === 3, `plan : ${P.sequences.length} séquences, matière répartie avec références (l'interprétation reste signalée ; incertain exclu)`);
// Écriture, sauvegarde, annulation
await p.click('[data-etape="script"]'); const hook = p.locator('textarea.texte').first();
await hook.fill('Sans plus attendre : un frère, une ville, une trahison. Qui a vraiment fait tomber la ville ?'); await att(900);
await p.click('[data-etape="projet"]'); await p.click('#enregistrer-version'); await att(300);
await p.click('[data-etape="script"]'); await p.locator('textarea.texte').first().fill('Un frère, une ville, une trahison. Qui a vraiment fait tomber la ville ?'); await att(900);
await p.reload(); await p.waitForFunction(() => window.__script?.projet?.());
P = await D(() => window.__script.projet()); ok(/^Un frère/.test(P.sequences.find((s) => s.fonction === 'hook').texte) && P.versions.length === 1, 'sauvegarde automatique : texte et version retrouvés après rechargement');
await p.click('[data-etape="projet"]'); await p.locator('[data-comparer]').first().click(); await p.waitForSelector('#diff'); ok(await p.locator('#diff del').count() >= 1, 'comparaison de versions (suppressions surlignées)');
await p.click('[data-etape="script"]'); await p.locator('textarea.texte').nth(1).fill('Ajout temporaire.'); await att(200); await p.keyboard.press('Control+z'); await att(300);
ok(!(await D(() => window.__script.projet())).sequences.some((s) => s.texte === 'Ajout temporaire.'), 'annulation (Ctrl+Z)');
// Critique : rien n'est appliqué sans acceptation
await p.locator('textarea.texte').nth(1).fill('Dans cette vidéo, la promesse : comprendre la chute de la ville et la trahison du frère.'); await att(900);
await p.click('[data-etape="critique"]'); await p.click('#lancer-critique'); await att(300);
const cliche = p.locator('.probleme[data-type="cliche"] [data-accepter]').first(); const avantC = (await D(() => window.__script.projet())).sequences[1]?.texte;
ok(await p.locator('.probleme').count() > 3 && /Dans cette vidéo/.test(avantC), `analyse critique : ${await p.locator('.probleme').count()} points, texte inchangé avant décision`);
await cliche.click(); await att(300); ok(!/Dans cette vidéo/.test((await D(() => window.__script.projet())).sequences.find((s) => s.texte.includes('promesse')).texte), 'correction acceptée puis appliquée');
// Exports
await p.click('[data-etape="export"]'); await p.locator('[data-format="srt"]').click(); const srt = await dl(() => p.click('#telecharger-export'), 'script.srt');
await p.locator('[data-format="montage"]').click(); const csv = await dl(() => p.click('#telecharger-export'), 'montage.csv'); await p.locator('[data-format="references"]').click(); const refs = await p.inputValue('#apercu-export');
ok(/^1\r?\n00:00:00,000 -->/.test(srt) && csv.includes('entree;sortie') && /Test Saga #1 · p\. \d/.test(refs) && await p.locator('.correspondance img').count() >= 1, 'exports SRT et plan de montage, références comics, vue de correspondance script ↔ pages');
// Adaptation
await p.click('[data-etape="critique"]'); await p.locator('#creer-adaptation').click(); await p.waitForFunction(() => /Shorts/.test(window.__script.projet()?.nom || ''), null, { timeout: 15000 });
P = await D(() => window.__script.projet()); ok(P.plateforme === 'shorts' && P.duree === 60 && P.comics.length === 2 && P.sequences[0].fonction === 'hook', 'adaptation Shorts 60 s : nouveau projet, matière et comics conservés, plan reconstruit');
// Prompt Studio
await p.click('[data-espace="prompts"]'); await p.waitForSelector('#texte-prompt'); await p.locator('[data-modele="comics"]').click(); await att(200);
await p.click('#copier-prompt'); await att(300); ok(/jamais envoyé|rien n'a été envoyé/i.test(await etat()) && await p.locator('#historique-prompts li').count() === 1 && !/\{\{/.test(await p.inputValue('#texte-prompt')), 'Prompt Studio : prompt assemblé localement, copié (jamais envoyé), historique');
// Profils
await p.click('[data-espace="profils"]'); await p.waitForSelector('#profil-wpm'); await p.fill('#profil-wpm', '120'); await att(300);
ok((await D(async () => (await window.__script.db.tous('redaction'))[0].wpm)) === 120, 'profil d\'écriture modifié et enregistré (vitesse 120 mots/min)');
await p.screenshot({ path: join(OUT, 'script-studio.png') });
// Préservation : aucun fichier comic écrit dans le dépôt, précache hors ligne complet
const pre = JSON.parse(readFileSync(join(ROOT, 'atelier/precache.json'), 'utf8')), liste = pre.fichiers || pre.urls || pre;
ok(['script/script.js', 'script/comics.js', 'vendor/pdfjs/pdf.min.mjs', 'vendor/pdfjs/pdf.worker.min.mjs'].every((f) => JSON.stringify(liste).includes(f)), 'Script Studio et pdf.js inclus dans le précache hors ligne');
ok(!err.length, `aucune erreur JavaScript${err.length ? ' · ' + err.slice(0, 3).join(' | ') : ''}`);
await browser.close(); srv.close(); fin();
