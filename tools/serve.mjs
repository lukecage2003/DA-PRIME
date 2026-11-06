// Primestone · serveur statique local, sans dépendance. Sert la racine du dépôt ; / affiche la page d'accueil (index.html).
// Usage : node tools/serve.mjs [port]   ->  http://localhost:4173/atelier/
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, normalize, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ttf': 'font/ttf' };
export function demarrer(port = 4173, host = '127.0.0.1') {
  const srv = createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const f = normalize(join(ROOT, p));
    if (!f.startsWith(ROOT) || /[\\/]\.(git|env)/.test(f)) { res.writeHead(403); return res.end(); }
    try {
      if (!(await stat(f)).isFile()) throw 0;
      res.writeHead(200, { 'Content-Type': TYPES[extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
      res.end(await readFile(f));
    } catch { res.writeHead(404); res.end('404'); }
  });
  return new Promise((ok) => srv.listen(port, host, () => ok(srv)));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const port = +(process.argv[2] || 4173), host = process.argv.includes('--reseau') ? '0.0.0.0' : '127.0.0.1';
  await demarrer(port, host);
  console.log(`Atelier : http://localhost:${port}/atelier/`);
  if (host === '0.0.0.0') { const { networkInterfaces } = await import('node:os'); for (const l of Object.values(networkInterfaces()).flat()) if (l && l.family === 'IPv4' && !l.internal) console.log(`Sur le téléphone ou la tablette (même Wi-Fi) : http://${l.address}:${port}/atelier/`); }
}
