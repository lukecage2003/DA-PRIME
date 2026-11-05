// Primestone · contrôles du dépôt (à lancer avant chaque commit) : npm run check
// 1. originaux intacts  2. vectorisation marquée NON-OFFICIEL  3. syntaxe des scripts ExtendScript
// 4. manifeste à jour   5. aucun fichier lourd ou interdit suivi par Git
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execSync, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const fails = []; const ok = (m) => console.log('  ok  ' + m); const ko = (m) => { fails.push(m); console.log('  KO  ' + m); };
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });

// 1
for (const line of readFileSync(join(ROOT, 'brand/00_originaux/CHECKSUMS.sha256'), 'utf8').trim().split('\n')) {
  const [h, f] = line.split(/\s+\*?/);
  const cur = createHash('sha256').update(readFileSync(join(ROOT, 'brand/00_originaux', f))).digest('hex');
  cur === h ? ok(`original intact : ${f}`) : ko(`original MODIFIÉ : ${f}`);
}
// 2
const bad = walk(join(ROOT, 'brand/01_logo/NON-OFFICIEL')).filter((p) => /\.(svg|png)$/.test(p) && !p.includes('/_reference/') && !/NON-OFFICIEL\.(svg|png)$/.test(p));
bad.length ? ko(`fichiers de logo sans marquage NON-OFFICIEL : ${bad.join(', ')}`) : ok('vectorisation du logo marquée NON-OFFICIEL');
// 3 : les directives #target/#include sont retirées, le reste doit être du JavaScript ES3/ES5 valide
for (const p of walk(join(ROOT, 'templates')).filter((x) => /\.jsx(inc)?$/.test(x))) {
  const src = readFileSync(p, 'utf8').replace(/^#(target|include|targetengine|script).*$/gm, '');
  try { new vm.Script(src, { filename: p }); ok(`syntaxe ${p.replace(ROOT + '/', '')}`); } catch (e) { ko(`syntaxe ${p.replace(ROOT + '/', '')} : ${e.message}`); }
}
// 4
const m = spawnSync(process.execPath, [join(ROOT, 'tools/build-manifest.mjs'), '--check'], { encoding: 'utf8' });
m.status === 0 ? ok('manifeste à jour') : ko(m.stderr.trim());
// 5
const tracked = execSync('git ls-files', { cwd: ROOT, encoding: 'utf8' }).trim().split('\n').filter(Boolean);
const heavy = tracked.filter((f) => { try { return statSync(join(ROOT, f)).size > 5 * 1024 * 1024; } catch { return false; } });
const banned = tracked.filter((f) => /\.(psd|psb|ai|aep|mogrt|mov|mp4|prproj)$/i.test(f) || f.startsWith('brand/99_tests/client/'));
heavy.length ? ko(`fichiers > 5 Mo suivis par Git : ${heavy.join(', ')}`) : ok('aucun fichier > 5 Mo dans Git');
banned.length ? ko(`fichiers à stocker hors Git : ${banned.join(', ')}`) : ok('aucun binaire Adobe ni illustration client dans Git');

console.log(fails.length ? `\n${fails.length} échec(s).` : '\nTous les contrôles sont passés.');
process.exit(fails.length ? 1 : 0);
