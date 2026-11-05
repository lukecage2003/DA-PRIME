// Primestone · site statique pour GitHub Pages (dossier _site/, non versionné).
// Liste blanche : uniquement les fichiers que l'Atelier et Motion Studio chargent, c'est-à-dire la liste du précache
// hors ligne (atelier/precache.json), plus une page d'accueil qui redirige vers l'Atelier.
// Rien d'autre n'est publié : ni originaux de marque, ni Supabase, ni outils, ni données de travail.
// Usage : node tools/build-pages.mjs [dossier]   (vérification : node tools/build-pages.mjs --verifier)
import { readFileSync, writeFileSync, mkdirSync, rmSync, copyFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, normalize, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, process.argv.slice(2).find((a) => !a.startsWith('--')) || '_site');
const { fichiers } = JSON.parse(readFileSync(join(ROOT, 'atelier/precache.json'), 'utf8'));
const liste = new Set(['atelier/precache.json', 'atelier/sw.js']);
for (const f of fichiers) { if (f.endsWith('/')) { liste.add(normalize(join('atelier', f, 'index.html'))); continue; } liste.add(normalize(join('atelier', f))); }
// Refus explicites : rien hors des dossiers attendus, aucun fichier sensible
const AUTORISES = /^(atelier\/|templates\/_systeme\/|brand\/03_fonts\/web\/|brand\/04_elements\/png\/|brand\/99_tests\/substitution\/PLACEHOLDER_)/;
const INTERDITS = /((^|\/)\.env|\.pem$|\.key$|\.p12$|supabase\/|brand\/00_originaux|brand\/99_tests\/client)/i;
const refus = [...liste].filter((f) => f.startsWith('..') || !AUTORISES.test(f) || INTERDITS.test(f));
if (refus.length) { console.error('Fichiers refusés :', refus.join(', ')); process.exit(1); }

rmSync(OUT, { recursive: true, force: true });
let octets = 0;
for (const f of [...liste].sort()) { const s = join(ROOT, f), d = join(OUT, f); mkdirSync(dirname(d), { recursive: true }); copyFileSync(s, d); octets += statSync(s).size; }
// Accueil : redirection relative (fonctionne à la racine d'un domaine comme sous /<dépôt>/)
writeFileSync(join(OUT, 'index.html'), '<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta http-equiv="refresh" content="0; url=atelier/"><title>Atelier Primestone</title><link rel="canonical" href="atelier/"></head><body><a href="atelier/">Ouvrir l\'Atelier Primestone</a></body></html>\n');
writeFileSync(join(OUT, '.nojekyll'), '');
// Contrôle : aucun motif de secret dans les fichiers texte publiés
const tous = (d) => readdirSync(d).flatMap((x) => { const p = join(d, x); return statSync(p).isDirectory() ? tous(p) : [p]; });
const suspects = tous(OUT).filter((p) => /\.(js|json|html|css|webmanifest)$/.test(p) && /(api[_-]?key|secret|password|BEGIN (RSA|PRIVATE)|sk-[A-Za-z0-9]{20}|ghp_[A-Za-z0-9]{20}|eyJhbGciOi)/i.test(readFileSync(p, 'utf8')));
if (suspects.length) { console.error('Motifs sensibles détectés :', suspects.map((p) => relative(OUT, p)).join(', ')); process.exit(1); }
console.log(`_site : ${liste.size + 2} fichiers, ${(octets / 1048576).toFixed(2)} Mo, aucun motif sensible.`);
