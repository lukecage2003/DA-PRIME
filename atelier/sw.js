// Atelier Primestone · fonctionnement hors ligne : précache de l'application (liste générée dans precache.json).
const PREFIXE = 'primestone-atelier-';
self.addEventListener('install', (e) => e.waitUntil((async () => {
  const { version, fichiers } = await (await fetch('precache.json', { cache: 'no-store' })).json();
  const c = await caches.open(PREFIXE + version); await c.addAll(fichiers); await self.skipWaiting();
})()));
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  const { version } = await (await fetch('precache.json', { cache: 'no-store' }).catch(() => caches.match('precache.json'))).json();
  for (const k of await caches.keys()) if (k.startsWith(PREFIXE) && k !== PREFIXE + version) await caches.delete(k);
  await self.clients.claim();
})()));
// Réseau d'abord (mises à jour visibles immédiatement), cache en secours hors ligne
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).catch(async () => (await caches.match(e.request, { ignoreSearch: true })) || Response.error()));
});
