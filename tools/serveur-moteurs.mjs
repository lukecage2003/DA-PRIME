// DA-PRIME · serveur local des moteurs (fondation 0.11.0, sans dépendance, sans modèle d'IA).
// Sert l'application et une petite API locale : /api/sante et /api/capacites (mesures RÉELLES du PC : processeur, mémoire,
// GPU et mémoire vidéo via nvidia-smi si présent, espace disque). Aucun moteur n'est exécuté dans cette version.
// Usage :  node tools/serveur-moteurs.mjs [port]            → ce PC uniquement (http://localhost:port)
//          node tools/serveur-moteurs.mjs [port] --reseau   → PC + téléphones et tablettes du même réseau, jeton obligatoire
import { createServer } from 'node:http';
import { readFile, stat, statfs } from 'node:fs/promises';
import { join, normalize, extname, dirname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFile } from 'node:child_process';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import os from 'node:os';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const VERSION = JSON.parse(await readFile(join(ROOT, 'package.json'), 'utf8')).version;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2' };
// Seuls les fichiers de l'application sont servis (jamais les originaux de marque, outils, documents ou fichiers cachés)
const AUTORISES = /^\/(index\.html|atelier\/.+|templates\/.+\.(js|json|svg|jpg|png)|accueil\/.+\.jpg|brand\/03_fonts\/web\/.+|brand\/04_elements\/png\/.+|brand\/99_tests\/substitution\/PLACEHOLDER_.+)$/;
const sortie = (cmd, args) => new Promise((ok) => execFile(cmd, args, { timeout: 4000, windowsHide: true }, (e, out) => ok(e ? null : String(out))));

export async function capacites() {
  const cpus = os.cpus(), c = { mesure: new Date().toISOString(), source: 'serveur local (mesures du système)', os: `${os.type()} ${os.release()}`, plateforme: process.platform, arch: process.arch,
    cpu: cpus[0]?.model?.trim() || null, coeurs: cpus.length || null, ramGo: +(os.totalmem() / 1073741824).toFixed(1), ramLibreGo: +(os.freemem() / 1073741824).toFixed(1), gpus: [], vramGo: null, disque: null, node: process.version };
  // NVIDIA : mémoire vidéo réelle via nvidia-smi ; autres GPU : nom seulement si l'OS le fournit, mémoire non inventée
  const nv = await sortie('nvidia-smi', ['--query-gpu=name,memory.total,memory.free', '--format=csv,noheader,nounits']);
  if (nv) for (const l of nv.trim().split('\n')) { const [nom, tot, libre] = l.split(',').map((x) => x.trim()); c.gpus.push({ nom, vramGo: +(+tot / 1024).toFixed(1), vramLibreGo: +(+libre / 1024).toFixed(1), source: 'nvidia-smi' }); }
  else if (process.platform === 'win32') { const w = await sortie('powershell', ['-NoProfile', '-Command', 'Get-CimInstance Win32_VideoController | Select-Object -ExpandProperty Name']); if (w) for (const nom of w.trim().split(/\r?\n/).filter(Boolean)) c.gpus.push({ nom: nom.trim(), vramGo: null, source: 'Win32_VideoController (mémoire non fiable, non reportée)' }); }
  else if (process.platform === 'darwin') { const m = await sortie('system_profiler', ['SPDisplaysDataType']); const nom = m?.match(/Chipset Model:\s*(.+)/)?.[1]; if (nom) c.gpus.push({ nom: nom.trim(), vramGo: null, memoireUnifiee: true, source: 'system_profiler (mémoire unifiée partagée avec la RAM)' }); }
  c.vramGo = c.gpus.some((g) => g.vramGo) ? Math.max(...c.gpus.map((g) => g.vramGo || 0)) : null;
  try { const f = await statfs(ROOT); c.disque = { libreGo: +((f.bavail * f.bsize) / 1073741824).toFixed(1), totalGo: +((f.blocks * f.bsize) / 1073741824).toFixed(1), chemin: ROOT }; } catch { c.disque = null; }
  return c;
}
const MOTEURS = { ocr: { etat: 'non installé', prevu: '0.11.1' }, vision: { etat: 'non installé', prevu: '0.11.2' }, ecriture: { etat: 'non installé', prevu: '0.11.3' } };

export function demarrer({ port = 4180, reseau = false, jeton = reseau ? randomBytes(18).toString('hex') : '' } = {}) {
  const ok = (req) => { if (!jeton) return true; const j = Buffer.from(String(req.headers['x-da-prime-jeton'] || new URL(req.url, 'http://x').searchParams.get('jeton') || '')), r = Buffer.from(jeton); return j.length === r.length && timingSafeEqual(j, r); };
  const json = (res, code, o) => { res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(o)); };
  const srv = createServer(async (req, res) => {
    const u = new URL(req.url, 'http://x'); let p = decodeURIComponent(u.pathname);
    if (p.startsWith('/api/')) {
      if (req.method !== 'GET') return json(res, 405, { erreur: 'méthode non autorisée' });
      if (!ok(req)) return json(res, 401, { erreur: 'jeton requis' });
      if (p === '/api/sante') return json(res, 200, { ok: true, application: 'DA-PRIME', version: VERSION, reseau, moteurs: MOTEURS });
      if (p === '/api/capacites') return json(res, 200, await capacites());
      return json(res, 404, { erreur: 'inconnu' });
    }
    if (p === '/') p = '/index.html'; if (p.endsWith('/')) p += 'index.html';
    const f = normalize(join(ROOT, p));
    if (!AUTORISES.test(p) || !f.startsWith(ROOT + sep)) { res.writeHead(404); return res.end('404'); }
    try { if (!(await stat(f)).isFile()) throw 0; res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff' }); res.end(await readFile(f)); }
    catch { res.writeHead(404); res.end('404'); }
  });
  return new Promise((r) => srv.listen(port, reseau ? '0.0.0.0' : '127.0.0.1', () => r({ srv, jeton })));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = +(process.argv.find((a) => /^\d+$/.test(a)) || 4180), reseau = process.argv.includes('--reseau'), { jeton } = await demarrer({ port, reseau });
  console.log(`DA-PRIME ${VERSION} · serveur local des moteurs (aucun modèle installé dans cette version)`);
  console.log(`Sur ce PC : http://localhost:${port}/atelier/script/${jeton ? `?jeton=${jeton}` : ''}#moteurs`);
  if (reseau) { for (const l of Object.values(os.networkInterfaces()).flat()) if (l && l.family === 'IPv4' && !l.internal) console.log(`Sur le réseau local : http://${l.address}:${port}/atelier/script/?jeton=${jeton}#moteurs`);
    console.log('Jeton à garder privé : il donne accès à l\'API de ce PC depuis le réseau local. Arrêter avec Ctrl+C.'); }
}
