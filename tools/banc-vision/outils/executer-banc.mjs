// Banc Comic Vision — exécutant (Node ≥ 20, aucune dépendance). Interroge UNIQUEMENT un llama-server local (127.0.0.1).
// Approches : A = page entière ; B = case par case (case pleine résolution + vignette de page) ; C = synthèse narrative après B.
// Reprise : chaque résultat est un fichier ; un résultat déjà présent est sauté (Ctrl+C sans perte, relancer la même commande).
// Usage :
//   node outils/executer-banc.mjs --corpus <dossier> --sortie <dossier> --etiquette qwen3vl-8b-Q8_0-hybride \
//        --modele Qwen3-VL-8B-Instruct --quant Q8_0 --config hybride [--approches A,B,C] [--port 8090] [--jetons-case 2560]
// Dossier corpus (hors dépôt) : pages/<page>.png et entrees/<page>.json = { page, nature_page, cases:[{id,ordre,zone}], ocr:[{id,case,zone,texte,nature}] }
import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, renameSync, appendFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import os from 'node:os';
import http from 'node:http';
import { lirePng, ecrirePng, decouper, reduire } from './png.mjs';

const ICI = dirname(fileURLToPath(import.meta.url)), RACINE = join(ICI, '..');
const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const CORPUS = resolve(arg('corpus', '')), SORTIE = resolve(arg('sortie', 'resultats')), ETIQ = arg('etiquette', 'sans-nom'), PORT = +arg('port', 8090);
const APPROCHES = arg('approches', 'A,B,C').split(','), META = { modele: arg('modele', '?'), quant: arg('quant', '?'), config: arg('config', '?'), runtime: 'llama.cpp llama-server', jetonsCase: +arg('jetons-case', 2560), jetonsPage: +arg('jetons-page', 4096) };
if (!existsSync(join(CORPUS, 'entrees'))) { console.error('Usage : --corpus <dossier> contenant pages/ et entrees/'); process.exit(2); }
const SCHEMA = JSON.parse(readFileSync(join(RACINE, 'schemas/sortie-vision.schema.json'), 'utf8')), INV = JSON.parse(readFileSync(join(RACINE, 'invites/invites-v1.json'), 'utf8'));
// Synthèse C : sous-schéma (continuité, synthèse, incertitudes) — avec le schéma complet, le modèle recopiait toutes les observations B et atteignait la limite de sortie (constat de réglage, protocole v3).
const SCHEMA_C = { ...SCHEMA, $id: SCHEMA.$id.replace(/\/v\d+$/, '') + '/synthese-v3', required: ['continuite', 'synthese', 'incertitudes'], properties: { continuite: SCHEMA.properties.continuite, synthese: SCHEMA.properties.synthese, incertitudes: SCHEMA.properties.incertitudes } };
const SANS_CASES = process.argv.includes('--sans-cases'), CASES_B = arg('cases', '') ? arg('cases', '').split(',') : null; // --cases C1,C2,C3 : sous-ensemble pour l'approche B (et C) // test 1 : le modèle détecte lui-même les cases (approche A)
const SERVEUR = `http://127.0.0.1:${PORT}`, DOSSIER = join(SORTIE, ETIQ); mkdirSync(DOSSIER, { recursive: true });
const ecrireAtomique = (f, o) => { if (o.echecTransport) { console.log(`  ÉCHEC TRANSPORT (non enregistré, sera retenté) : ${o.echecTransport}`); return; } mkdirSync(dirname(f), { recursive: true }); writeFileSync(f + '.tmp', JSON.stringify(o, null, 1)); renameSync(f + '.tmp', f); };

// ---------- Mesure mémoire (pic pendant chaque requête) ----------
const sh = (cmd, args) => new Promise((ok) => execFile(cmd, args, { timeout: 5000, windowsHide: true }, (e, out) => ok(e ? '' : String(out))));
async function echantillon() {
  const vram = +(await sh('nvidia-smi', ['--query-gpu=memory.used', '--format=csv,noheader,nounits'])).trim().split('\n')[0] || null;
  let ramSysteme = null, ramServeur = null;
  if (process.platform === 'win32') { const o = await sh('powershell', ['-NoProfile', '-Command', "$o=Get-CimInstance Win32_OperatingSystem; $p=(Get-Process llama-server -ErrorAction SilentlyContinue | Measure-Object WorkingSet64 -Sum).Sum; \"$($o.TotalVisibleMemorySize - $o.FreePhysicalMemory) $p\""]);
    const [u, p] = o.trim().split(/\s+/); ramSysteme = u ? +u / 1024 : null; ramServeur = p ? +p / 1048576 : null; }
  else if (existsSync('/proc/meminfo')) { const m = readFileSync('/proc/meminfo', 'utf8'), v = (k) => +(m.match(new RegExp(`${k}:\\s+(\\d+)`)) || [0, 0])[1]; ramSysteme = (v('MemTotal') - v('MemAvailable')) / 1024;
    const pids = (await sh('pgrep', ['-x', 'llama-server'])).trim().split('\n').filter(Boolean); if (pids.length) ramServeur = pids.reduce((t, q) => { try { return t + +(/VmRSS:\s+(\d+)/.exec(readFileSync(`/proc/${q}/status`, 'utf8'))?.[1] || 0) / 1024; } catch { return t; } }, 0); }
  return { vramMo: vram, ramSystemeMo: ramSysteme, ramServeurMo: ramServeur };
}
async function avecSonde(fn) {
  let actif = true; const pics = { vramMo: 0, ramSystemeMo: 0, ramServeurMo: 0 };
  const boucle = (async () => { while (actif) { const e = await echantillon(); for (const k in pics) if (e[k] !== null && e[k] > pics[k]) pics[k] = e[k]; await new Promise((r) => setTimeout(r, 1500)); } })();
  const t0 = Date.now(); try { const r = await fn(); return { ...r, dureeMs: Date.now() - t0, pics }; } catch (e) { return { echecTransport: String(e.message || e), dureeMs: Date.now() - t0, pics }; } finally { actif = false; await boucle; }
}

// ---------- Appel au modèle ----------
const remplir = (t, v) => t.replace(/\{\{(\w+)\}\}/g, (_, k) => (v[k] === undefined ? `{{${k}}}` : typeof v[k] === 'string' ? v[k] : JSON.stringify(v[k])));
async function appeler({ systeme, utilisateur, images = [], maxJetons = 4096, jetonsImage, schema = SCHEMA }) {
  const contenu = [...images.map((b) => ({ type: 'image_url', image_url: { url: `data:image/png;base64,${b.toString('base64')}` } })), { type: 'text', text: utilisateur }];
  const corps = { messages: [{ role: 'system', content: systeme }, { role: 'user', content: images.length ? contenu : utilisateur }], temperature: 0, seed: 42, max_tokens: maxJetons,
    response_format: { type: 'json_schema', json_schema: { name: 'comic_vision', schema } } };
  // node:http et non fetch : sur CPU, la lecture d'une image peut dépasser le délai d'en-têtes de fetch (300 s)
  const r = await new Promise((ok, ko) => { const corpsTxt = JSON.stringify(corps), q = http.request(`${SERVEUR}/v1/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(corpsTxt) } }, (res) => { let t = ''; res.setEncoding('utf8'); res.on('data', (d) => (t += d)); res.on('end', () => ok({ ok: res.statusCode < 300, status: res.statusCode, texte: t })); });
    q.on('error', ko); q.setTimeout(0); q.end(corpsTxt); });
  const brut = r.texte; if (!r.ok) return { erreur: `HTTP ${r.status} : ${brut.slice(0, 300)}` };
  const j = JSON.parse(brut), texte = j.choices?.[0]?.message?.content ?? '';
  let sortie = null, erreurJson = null; try { sortie = JSON.parse(texte); } catch (e) { erreurJson = e.message; }
  return { sortie, erreurJson, texteBrut: sortie ? undefined : texte, usage: j.usage, timings: j.timings, jetonsImageDemandes: jetonsImage };
}
const sysCommun = INV.regles_communes;

// ---------- Exécution ----------
const props = await fetch(`${SERVEUR}/props`).then((r) => r.json()).catch(() => null);
if (!props) { console.error(`Aucun llama-server sur ${SERVEUR} : lancer d'abord scripts/windows/lancer-serveur.ps1`); process.exit(1); }
const EXEC = { ...META, casesB: CASES_B, maxJetonsSortie: 4096, etiquette: ETIQ, invites: INV.version, schema: SCHEMA.$id, schemaSynthese: SCHEMA_C.$id, serveur: { build: props.build_info ?? props.build ?? null, modele: props.model_path ?? props.default_generation_settings?.model ?? null, n_ctx: props.default_generation_settings?.n_ctx ?? null }, debut: new Date().toISOString(), machine: { os: process.platform, processeur: os.cpus()[0]?.model, coeurs: os.cpus().length, ramGo: +(os.totalmem() / 2 ** 30).toFixed(1) } };
ecrireAtomique(join(DOSSIER, 'execution.json'), EXEC); appendFileSync(join(DOSSIER, 'executions.jsonl'), JSON.stringify({ ...EXEC, corpus: CORPUS, approches: APPROCHES }) + '\n'); // historique : execution.json ne décrit que le dernier lancement
const entrees = readdirSync(join(CORPUS, 'entrees')).filter((f) => f.endsWith('.json')).sort();
let arret = false; process.on('SIGINT', () => { if (arret) process.exit(130); arret = true; console.log('\nArrêt demandé : fin de la requête en cours puis sortie (relancer la même commande pour reprendre).'); });
for (const f of entrees) {
  if (arret) break;
  const E = JSON.parse(readFileSync(join(CORPUS, 'entrees', f), 'utf8')), nom = f.replace(/\.json$/, ''), img = lirePng(readFileSync(join(CORPUS, 'pages', E.page)));
  const ocrPage = E.ocr.map((b) => ({ id: b.id, case: b.case ?? null, zone: b.zone, texte: b.texte, nature: b.nature ?? null }));
  // A : page entière
  if (APPROCHES.includes('A')) { const fich = join(DOSSIER, nom, 'A-page.json');
    if (!existsSync(fich)) { console.log(`${nom} · A page entière…`); const page = ecrirePng(reduire(img, 2400));
      const r = await avecSonde(() => appeler({ systeme: remplir(INV.A_page_entiere.systeme, { regles_communes: sysCommun }), utilisateur: remplir(INV.A_page_entiere.utilisateur, { nature_page: E.nature_page || 'unknown', cases_geometrie: SANS_CASES ? [] : E.cases, blocs_ocr: ocrPage }), images: [page], jetonsImage: META.jetonsPage }));
      ecrireAtomique(fich, { page: nom, approche: 'A', repere: { x: 0, y: 0, w: 1, h: 1 }, ...r }); console.log(`  ${(r.dureeMs / 1000).toFixed(0)} s · VRAM ${r.pics.vramMo} Mo · RAM serveur ${Math.round(r.pics.ramServeurMo)} Mo${r.erreur || r.erreurJson ? ' · ERREUR ' + (r.erreur || r.erreurJson) : ''}`); } }
  // B : case par case
  const vignette = ecrirePng(reduire(img, 768)); const obsB = []; let connus = [];
  if (APPROCHES.includes('B') || APPROCHES.includes('C')) for (const c of [...E.cases].filter((c) => !CASES_B || CASES_B.includes(c.id)).sort((a, b) => a.ordre - b.ordre)) {
    if (arret) break; const fich = join(DOSSIER, nom, `B-${c.id}.json`);
    if (!existsSync(fich)) { console.log(`${nom} · B case ${c.id}…`); const { img: crop, zonePage } = decouper(img, c.zone);
      const blocs = ocrPage.filter((b) => b.case === c.id || (!b.case && b.zone.x + b.zone.w / 2 >= zonePage.x && b.zone.x + b.zone.w / 2 <= zonePage.x + zonePage.w && b.zone.y + b.zone.h / 2 >= zonePage.y && b.zone.y + b.zone.h / 2 <= zonePage.y + zonePage.h))
        .map((b) => ({ ...b, zone: { x: (b.zone.x - zonePage.x) / zonePage.w, y: (b.zone.y - zonePage.y) / zonePage.h, w: b.zone.w / zonePage.w, h: b.zone.h / zonePage.h } }));
      const r = await avecSonde(() => appeler({ systeme: remplir(INV.B_case_par_case.systeme, { regles_communes: sysCommun }), utilisateur: remplir(INV.B_case_par_case.utilisateur, { case_id: c.id, case_ordre: String(c.ordre), nb_cases: String(E.cases.length), personnages_connus: connus, blocs_ocr_case: blocs }), images: [ecrirePng(crop), vignette], jetonsImage: META.jetonsCase }));
      ecrireAtomique(fich, { page: nom, approche: 'B', case: c.id, repere: zonePage, ...r }); console.log(`  ${(r.dureeMs / 1000).toFixed(0)} s · VRAM ${r.pics.vramMo} Mo · RAM serveur ${Math.round(r.pics.ramServeurMo)} Mo${r.erreur || r.erreurJson ? ' · ERREUR ' + (r.erreur || r.erreurJson) : ''}`); }
    const res = existsSync(fich) ? JSON.parse(readFileSync(fich, "utf8")) : {}; if (res.sortie) { obsB.push({ case: c.id, observations: res.sortie }); connus = [...new Map([...connus, ...(res.sortie.personnages || []).map((p) => [p.id, { id: p.id, description: p.description || '' }])].map((x) => (Array.isArray(x) ? x : [x.id, x]))).values()]; }
  }
  // C : synthèse narrative (texte seulement), à partir des observations B
  if (APPROCHES.includes('C') && !arret && obsB.length === E.cases.filter((c) => !CASES_B || CASES_B.includes(c.id)).length) { const fich = join(DOSSIER, nom, 'C-synthese.json');
    if (!existsSync(fich)) { console.log(`${nom} · C synthèse…`);
      const r = await avecSonde(() => appeler({ systeme: remplir(INV.C_synthese.systeme, { regles_communes: sysCommun }), utilisateur: remplir(INV.C_synthese.utilisateur, { observations_cases: obsB, blocs_ocr: ocrPage }), images: [], schema: SCHEMA_C }));
      ecrireAtomique(fich, { page: nom, approche: 'C', repere: { x: 0, y: 0, w: 1, h: 1 }, ...r }); console.log(`  ${(r.dureeMs / 1000).toFixed(0)} s`); } }
}
console.log(arret ? 'Interrompu proprement : relancer la même commande pour reprendre.' : `Terminé : ${DOSSIER}`);
