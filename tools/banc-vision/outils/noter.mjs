// Banc Comic Vision — notation. Deux temps :
//  1) node outils/noter.mjs --corpus <dossier> --resultats <dossier> --etiquette <e>   → contrôles automatiques + fiche de jugement humain (CSV)
//  2) l'humain remplit la colonne « verdict » de la fiche (exact | partiel | faux | invente | non_verifiable) puis relance la même commande :
//     les verdicts sont relus et le rapport complet (taux d'hallucination par classe, reconnaissance de l'incertitude) est produit.
// Seules les annotations VALIDÉES (valide_par non nul) servent de référence ; les pages de RÉGLAGE et de CONTRÔLE sont rapportées séparément.
// Aucun seuil définitif : le rapport donne des mesures, pas des verdicts d'acceptation.
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const arg = (k, d) => { const i = process.argv.indexOf(`--${k}`); return i > 0 ? process.argv[i + 1] : d; };
const CORPUS = resolve(arg('corpus', '')), ETIQ = arg('etiquette', ''), DOSSIER = join(resolve(arg('resultats', 'resultats')), ETIQ);
if (!existsSync(DOSSIER) || !ETIQ) { console.error('Usage : --corpus <dossier> --resultats <dossier> --etiquette <e>'); process.exit(2); }
const PROVISOIRE = process.argv.includes('--reference-provisoire'); // brouillons NON validés : mesures indicatives seulement
const SCHEMA = JSON.parse(readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../schemas/sortie-vision.schema.json'), 'utf8'));
// Synthèse C depuis le protocole v3 : sous-schéma (même construction que dans executer-banc.mjs)
const SCHEMA_C = { ...SCHEMA, required: ['continuite', 'synthese', 'incertitudes'], properties: { continuite: SCHEMA.properties.continuite, synthese: SCHEMA.properties.synthese, incertitudes: SCHEMA.properties.incertitudes } };
const lire = (f) => JSON.parse(readFileSync(f, 'utf8'));

// ---------- Validation JSON Schema (sous-ensemble utilisé par le schéma : type, enum, required, properties, items, pattern, minimum/maximum, $ref local) ----------
function valider(v, s, chemin = '$', err = []) {
  if (s.$ref) s = s.$ref.split('/').slice(1).reduce((o, k) => o[k], SCHEMA);
  const types = [].concat(s.type || []), t = v === null ? 'null' : Array.isArray(v) ? 'array' : Number.isInteger(v) ? 'integer' : typeof v;
  if (types.length && !types.includes(t) && !(t === 'integer' && types.includes('number'))) { err.push(`${chemin} : type ${t}`); return err; }
  if (s.enum && !s.enum.includes(v)) err.push(`${chemin} : valeur hors liste « ${v} »`);
  if (s.pattern && typeof v === 'string' && !new RegExp(s.pattern).test(v)) err.push(`${chemin} : format « ${v} »`);
  if (typeof v === 'number') { if (s.minimum !== undefined && v < s.minimum) err.push(`${chemin} < ${s.minimum}`); if (s.maximum !== undefined && v > s.maximum) err.push(`${chemin} > ${s.maximum}`); }
  if (t === 'object') { for (const k of s.required || []) if (!(k in v)) err.push(`${chemin}.${k} manquant`); for (const [k, ss] of Object.entries(s.properties || {})) if (k in v) valider(v[k], ss, `${chemin}.${k}`, err); }
  if (t === 'array' && s.items) v.forEach((x, i) => valider(x, s.items, `${chemin}[${i}]`, err));
  return err;
}

// ---------- Géométrie : zones relatives à l'image fournie → fractions de page ----------
const versPage = (z, r) => z && ({ x: r.x + z.x * r.w, y: r.y + z.y * r.h, w: z.w * r.w, h: z.h * r.h });
const iou = (a, b) => { if (!a || !b) return 0; const x = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)), y = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)), i = x * y; return i / (a.w * a.h + b.w * b.h - i || 1); };
const centreDans = (a, b) => a && b && a.x + a.w / 2 >= b.x && a.x + a.w / 2 <= b.x + b.w && a.y + a.h / 2 >= b.y && a.y + a.h / 2 <= b.y + b.h;
function apparier(pred, ref, score, seuil) { // appariement glouton par score décroissant
  const paires = []; pred.forEach((p, i) => ref.forEach((r, j) => { const s = score(p, r); if (s >= seuil) paires.push([s, i, j]); }));
  paires.sort((a, b) => b[0] - a[0]); const pi = new Set(), rj = new Set(), m = new Map();
  for (const [, i, j] of paires) if (!pi.has(i) && !rj.has(j)) { pi.add(i); rj.add(j); m.set(i, j); } return m;
}
const norm = (s) => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

// ---------- Contrôles automatiques d'hallucination (indépendants du jugement humain) ----------
function controles(sortie, E, ann, caseId) {
  const al = [], ocrTexte = norm(E.ocr.map((b) => b.texte).join(' ')), ids = new Set(E.ocr.map((b) => b.id)), idsCase = caseId ? new Set(E.ocr.filter((b) => b.case === caseId).map((b) => b.id)) : ids;
  // Citation : interdite par les invites (le texte vient de l'OCR, référencé par identifiant). Hors OCR = inventée ; présente dans l'OCR = règle 2 enfreinte.
  // Apostrophes simples reconnues seulement en début de mot, pour ne pas prendre les élisions (« l'homme ») pour des guillemets.
  const parcourir = (o, ch) => { if (typeof o === 'string') { for (const m of o.matchAll(/["“«]([^"”»]{6,})["”»]|(?:^|[\s:(])['‘]([^'’]{6,}?)['’](?=[\s.,;:!?)]|$)/g)) { const brut = m[1] ?? m[2], q = norm(brut); if (!q) continue; al.push({ type: ocrTexte.includes(q) ? 'citation_ocr_reproduite' : 'citation_hors_ocr', ou: ch, valeur: brut }); } }
    else if (o && typeof o === 'object') for (const [k, v] of Object.entries(o)) parcourir(v, `${ch}.${k}`); };
  parcourir(sortie, '$');
  for (const p of sortie.personnages || []) if (p.identite_proposee) {
    const just = (p.justification_identite || '').match(/O\d+/g) || [], ok = just.length && just.every((id) => ids.has(id)) && norm(p.identite_proposee).split(' ').some((m) => m.length > 2 && ocrTexte.includes(m));
    if (!ok) al.push({ type: 'identite_non_justifiee', ou: p.id, valeur: p.identite_proposee }); }
  for (const b of sortie.bulles || []) if (!ids.has(b.ocr)) al.push({ type: 'bulle_inexistante', ou: b.ocr, valeur: b.ocr }); else if (!idsCase.has(b.ocr)) al.push({ type: 'bulle_hors_case', ou: b.ocr, valeur: b.ocr });
  // Valeurs seulement (pas les clés du schéma : « bulle » ne doit pas trouver la clé « bulles ») et mots entiers.
  const valeurs = (o) => (o && typeof o === 'object' ? Object.values(o).flatMap(valeurs) : typeof o === 'string' ? [o] : []);
  const tout = ` ${norm(valeurs(sortie).join(' '))} `;
  for (const x of ann?.a_ne_pas_inventer || []) if (norm(x) && tout.includes(` ${norm(x)} `)) al.push({ type: 'element_interdit_present', ou: '$', valeur: x });
  if (JSON.stringify(sortie).includes('"classe":"lu"')) al.push({ type: 'classe_lu_reservee_ocr', ou: '$', valeur: 'lu' });
  return al;
}

// ---------- Notation automatique d'une page ----------
const fiche = [], pages = [], entrees = readdirSync(join(CORPUS, 'entrees')).filter((f) => f.endsWith('.json')).sort();
for (const f of entrees) {
  const nom = f.replace(/\.json$/, ''), E = lire(join(CORPUS, 'entrees', f)), fa = join(CORPUS, 'annotations', f), fb = join(CORPUS, 'annotations-a-faire', f), annBrute = existsSync(fa) ? lire(fa) : PROVISOIRE && existsSync(fb) ? lire(fb) : null, ann = annBrute?.valide_par || (PROVISOIRE && annBrute) ? annBrute : null;
  const dp = join(DOSSIER, nom); if (!existsSync(dp)) continue;
  for (const fr of readdirSync(dp).filter((x) => x.endsWith('.json') && !/-v\d+\.json$/.test(x)).sort()) { // *-vN.json : sorties archivées d'un protocole antérieur, non notées
    const R = lire(join(dp, fr)), L = { page: nom, fichier: fr, approche: R.approche, case: R.case || null, corpus: ann?.corpus || 'non-annote', dureeS: R.dureeMs / 1000, pics: R.pics, erreur: R.erreur || R.erreurJson || null };
    if (!R.sortie) { pages.push({ ...L, valide: false }); continue; }
    const S = R.sortie, rep = R.repere, errs = valider(S, R.approche === 'C' && !('cases' in S) ? SCHEMA_C : SCHEMA); L.valide = !errs.length; L.erreursSchema = errs.slice(0, 5); L.alertes = controles(S, E, ann, R.case);
    const persos = (S.personnages || []).map((p) => ({ ...p, zp: versPage(p.zone, rep) }));
    if (ann) {
      // Cases (approche A seulement : test de détection quand le banc est lancé avec --sans-cases)
      if (R.approche === 'A') { const pc = (S.cases || []).map((c) => versPage(c.zone, rep)), m = apparier(pc, ann.cases.map((c) => c.zone), iou, 0.5); L.cases = { predites: pc.length, reference: ann.cases.length, appariees: m.size }; }
      // Personnages : rappel / précision par position (IoU ≥ 0,3 ou centre inclus), restreint à la case analysée en approche B
      const refP = ann.personnages.filter((p) => !R.case || p.case === R.case), m = apparier(persos, refP, (a, b) => Math.max(iou(a.zp, b.zone), centreDans(a.zp, b.zone) ? 0.3 : 0), 0.3);
      if (Array.isArray(S.personnages)) L.personnages = { predits: persos.length, reference: refP.length, apparies: m.size, inventesProbables: persos.length - m.size };
      const lien = new Map([...m].map(([i, j]) => [persos[i].id, refP[j].id]));
      // Attribution des bulles : seules les bulles dont le locuteur est certain dans l'annotation sont notées
      const refB = new Map(ann.bulles.filter((b) => b.locuteur_certain).map((b) => [b.ocr, b.locuteur])); let ok = 0, n = 0;
      for (const b of S.bulles || []) if (refB.has(b.ocr)) { n++; const pr = ['hors_champ', 'narrateur'].includes(b.locuteur) ? b.locuteur : lien.get(b.locuteur) ?? `?${b.locuteur}`; if (pr === refB.get(b.ocr)) ok++; }
      if (Array.isArray(S.bulles)) L.locuteurs = { notes: n, justes: ok };
      // Bulles déclarées : part des blocs OCR présentés comme bulle que la référence tient pour dialogue, pensée, narration ou indication de lieu/moment (décor, crédits, titre, onomatopée, bruit d'OCR : non conformes)
      const refTexte = new Set(ann.bulles.filter((b) => ['dialogue', 'narration', 'pensee', 'lieu_moment'].includes(b.nature)).map((b) => b.ocr));
      const declarees = (S.bulles || []).length; if (Array.isArray(S.bulles)) L.bulles = { declarees, conformes: (S.bulles || []).filter((b) => refTexte.has(b.ocr)).length };
    }
    pages.push(L);
    // Fiche de jugement humain : une ligne par affirmation de la sortie (la vérité vient de l'image + annotation, pas du modèle)
    const ligne = (type, id, texte, classe, cert) => fiche.push({ page: nom, fichier: fr, approche: R.approche, case: R.case || '', type, id, affirmation: texte, classe: classe || '', certitude: cert ?? '', verdict: '' });
    for (const p of S.personnages || []) { ligne('expression', p.id, `${p.id} : ${p.expression || '—'}`, p.classe, p.certitude); ligne('posture', p.id, `${p.id} : ${p.posture || '—'}`, p.classe, p.certitude); if (p.identite_proposee) ligne('identite', p.id, `${p.id} = ${p.identite_proposee} (${p.justification_identite || 'sans justification'})`, p.classe, p.certitude); }
    for (const [i, o] of (S.objets || []).entries()) ligne('objet', `o${i}`, `${o.nom}${o.tenu_par ? ' tenu par ' + o.tenu_par : ''}`, o.classe, o.certitude);
    for (const [i, a] of (S.actions || []).entries()) ligne('action', `a${i}`, `${a.agent} ${a.verbe}${a.cible ? ' ' + a.cible : ''}`, a.classe, a.certitude);
    for (const [i, r] of (S.relations || []).entries()) ligne('relation', `r${i}`, `${r.sujet} ${r.relation} ${r.objet}`, r.classe, r.certitude);
    for (const b of S.bulles || []) ligne('locuteur', b.ocr, `${b.ocr} (${b.nature}) dit par ${b.locuteur ?? '?'} — indice : ${b.indice || '—'}`, b.classe, b.certitude);
    for (const [i, c] of (S.continuite || []).entries()) ligne('continuite', `k${i}`, `${c.de}→${c.vers} ${c.type} : ${c.detail || ''}`, c.classe, c.certitude);
    for (const [i, x] of (S.synthese?.faits || []).entries()) ligne('fait', `f${i}`, x.texte, x.classe, '');
    if (ann && R.approche !== 'B') for (const [i, a] of (ann.ambigu || []).entries()) ligne('ambiguite_reference', `amb${i}`, `AMBIGU (annotation) : ${a} — le modèle l'a-t-il signalé comme incertain ? verdict = signale | affirme | absent`, '', '');
  }
}

// ---------- Fiche CSV (fusion avec les verdicts déjà saisis) ----------
const fCsv = join(DOSSIER, 'fiche-jugement.csv'), cle = (l) => `${l.fichier}|${l.page}|${l.type}|${l.id}`, csv = (v) => `"${String(v).replace(/"/g, '""')}"`;
const lireCsv = (t) => { const L = []; let c = '', ligne = [], q = false; for (let i = 0; i < t.length; i++) { const x = t[i]; if (q) { if (x === '"' && t[i + 1] === '"') { c += '"'; i++; } else if (x === '"') q = false; else c += x; } else if (x === '"') q = true; else if (x === ';') { ligne.push(c); c = ''; } else if (x === '\n') { ligne.push(c); L.push(ligne); ligne = []; c = ''; } else if (x !== '\r') c += x; } if (c || ligne.length) { ligne.push(c); L.push(ligne); } return L; };
const anciens = new Map(); if (existsSync(fCsv)) { const [t, ...ls] = lireCsv(readFileSync(fCsv, 'utf8').replace(/^\ufeff/, '')); for (const l of ls) { const o = Object.fromEntries(t.map((k, i) => [k, l[i] ?? ''])); anciens.set(cle(o), o.verdict); } }
for (const l of fiche) l.verdict = anciens.get(cle(l)) || '';
const cols = ['page', 'fichier', 'approche', 'case', 'type', 'id', 'affirmation', 'classe', 'certitude', 'verdict'];
writeFileSync(fCsv, '﻿' + [cols.join(';'), ...fiche.map((l) => cols.map((k) => csv(l[k])).join(';'))].join('\n') + '\n');

// ---------- Rapport ----------
const pct = (a, b) => (b ? `${(100 * a / b).toFixed(1)} %` : '—'), som = (xs, f) => xs.reduce((t, x) => t + (f(x) || 0), 0);
const exe = existsSync(join(DOSSIER, 'execution.json')) ? lire(join(DOSSIER, 'execution.json')) : {};
let md = `# Banc Comic Vision — ${ETIQ}\n\nModèle ${exe.modele} · ${exe.quant} · configuration ${exe.config} · serveur ${JSON.stringify(exe.serveur || {})} · invites ${exe.invites}\n\n`;
md += (PROVISOIRE ? '**RÉFÉRENCE PROVISOIRE : annotations NON validées par un humain (brouillons). Les taux ci-dessous sont indicatifs, pas définitifs.**\n\n' : '') + 'Mesures de la machine qui a exécuté le banc (voir execution.json : processeur, RAM, GPU). Aucune valeur n\'est un seuil d\'acceptation ; réglage et contrôle sont séparés.\n\n';
for (const grp of ['controle', 'reglage', 'non-annote']) {
  const G = pages.filter((p) => p.corpus === grp); if (!G.length) continue;
  md += `## Corpus ${grp} (${new Set(G.map((p) => p.page)).size} page(s), ${G.length} requête(s))\n\n`;
  for (const ap of ['A', 'B', 'C']) { const X = G.filter((p) => p.approche === ap); if (!X.length) continue;
    const pv = X.filter((p) => p.pics), al = X.flatMap((p) => p.alertes || []), P = X.filter((p) => p.personnages), Lc = X.filter((p) => p.locuteurs), Cs = X.filter((p) => p.cases);
    md += `### Approche ${ap}\n\n| Mesure | Valeur |\n|---|---|\n| JSON valide (schéma) | ${pct(X.filter((p) => p.valide).length, X.length)} |\n| Erreurs (HTTP, JSON) | ${X.filter((p) => p.erreur).length} |\n`;
    md += `| Durée moyenne / max | ${(som(X, (p) => p.dureeS) / X.length).toFixed(0)} s / ${Math.max(...X.map((p) => p.dureeS || 0)).toFixed(0)} s |\n| VRAM max · RAM serveur max · RAM système max | ${Math.max(...pv.map((p) => p.pics.vramMo || 0))} Mo · ${Math.round(Math.max(...pv.map((p) => p.pics.ramServeurMo || 0)))} Mo · ${Math.round(Math.max(...pv.map((p) => p.pics.ramSystemeMo || 0)))} Mo |\n`;
    if (Cs.length) md += `| Cases retrouvées (IoU ≥ 0,5) | rappel ${pct(som(Cs, (p) => p.cases.appariees), som(Cs, (p) => p.cases.reference))} · précision ${pct(som(Cs, (p) => p.cases.appariees), som(Cs, (p) => p.cases.predites))} |\n`;
    if (P.length) md += `| Personnages (position) | rappel ${pct(som(P, (p) => p.personnages.apparies), som(P, (p) => p.personnages.reference))} · précision ${pct(som(P, (p) => p.personnages.apparies), som(P, (p) => p.personnages.predits))} · non appariés ${som(P, (p) => p.personnages.inventesProbables)} |\n`;
    const Bu = X.filter((p) => p.bulles); if (Bu.length) md += `| Bulles déclarées sur un bloc de texte de bulle (référence) | ${pct(som(Bu, (p) => p.bulles.conformes), som(Bu, (p) => p.bulles.declarees))} (${som(Bu, (p) => p.bulles.declarees)} déclarées) |\n`;
    if (Lc.length) md += `| Locuteurs (bulles à locuteur certain) | ${pct(som(Lc, (p) => p.locuteurs.justes), som(Lc, (p) => p.locuteurs.notes))} (${som(Lc, (p) => p.locuteurs.notes)} bulles) |\n`;
    const parType = {}; for (const a of al) parType[a.type] = (parType[a.type] || 0) + 1;
    md += `| Alertes automatiques | ${al.length ? Object.entries(parType).map(([k, v]) => `${k} ${v}`).join(' · ') : 'aucune'} |\n\n`;
    // Jugement humain
    const J = fiche.filter((l) => G.some((g) => g.fichier === l.fichier && g.page === l.page) && l.approche === ap && l.verdict && l.type !== 'ambiguite_reference');
    const nonJ = fiche.filter((l) => G.some((g) => g.fichier === l.fichier && g.page === l.page) && l.approche === ap && !l.verdict).length;
    if (J.length) { md += `Jugement humain : ${J.length} affirmation(s) jugée(s), ${nonJ} restante(s).\n\n| Type | n | exact | partiel | faux | inventé |\n|---|---|---|---|---|---|\n`;
      for (const t of [...new Set(J.map((l) => l.type))]) { const T = J.filter((l) => l.type === t && l.verdict !== 'non_verifiable'), c = (v) => T.filter((l) => l.verdict === v).length; md += `| ${t} | ${T.length} | ${pct(c('exact'), T.length)} | ${pct(c('partiel'), T.length)} | ${pct(c('faux'), T.length)} | ${pct(c('invente'), T.length)} |\n`; }
      md += '\n| Classe déclarée par le modèle | n | taux d\'invention |\n|---|---|---|\n';
      for (const k of ['visible', 'interprete', 'deduit', 'incertain']) { const T = J.filter((l) => l.classe === k && l.verdict !== 'non_verifiable'); if (T.length) md += `| ${k} | ${T.length} | ${pct(T.filter((l) => l.verdict === 'invente').length, T.length)} |\n`; }
      const amb = fiche.filter((l) => G.some((g) => g.page === l.page) && l.approche === ap && l.type === 'ambiguite_reference' && l.verdict);
      if (amb.length) md += `\nReconnaissance de l'incertitude : ${pct(amb.filter((l) => l.verdict === 'signale').length, amb.length)} des ambiguïtés de référence signalées ; affirmées à tort : ${amb.filter((l) => l.verdict === 'affirme').length}.\n`;
      md += '\n'; } else md += `Jugement humain : à faire (${nonJ} affirmation(s) dans fiche-jugement.csv).\n\n`; }
}
writeFileSync(join(DOSSIER, 'rapport.md'), md); writeFileSync(join(DOSSIER, 'notation.json'), JSON.stringify({ execution: exe, requetes: pages }, null, 1));
console.log(md); console.log(`Fiche : ${fCsv}`);
