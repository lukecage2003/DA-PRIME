// Script Studio · détection des capacités de l'appareil, SANS rien inventer.
// Le navigateur ne donne qu'une partie des informations : nombre de cœurs logiques, mémoire approximative (Chromium,
// plafonnée à 8 Go), carte graphique (nom via WebGL/WebGPU, sans mémoire vidéo), quota de stockage du site (pas l'espace disque).
// Les valeurs exactes (RAM, VRAM, disque) viennent du serveur local facultatif (tools/serveur-moteurs.mjs) quand il est lancé.
export async function detecter({ serveur, jeton } = {}) {
  const n = navigator, c = { mesure: Date.now(), sources: {} };
  c.coeurs = n.hardwareConcurrency || null; c.sources.coeurs = c.coeurs ? 'navigator.hardwareConcurrency (cœurs logiques)' : 'non fourni';
  c.ramGo = n.deviceMemory ?? null; c.ramPlafond = c.ramGo === 8; c.sources.ramGo = c.ramGo ? 'navigator.deviceMemory (approximatif, plafonné à 8 Go)' : 'non fourni par ce navigateur';
  c.mobile = !!(n.userAgentData?.mobile ?? /Android|iPhone|iPad|Mobile/i.test(n.userAgent));
  c.plateforme = n.userAgentData?.platform || (/Windows/.test(n.userAgent) ? 'Windows' : /Mac/.test(n.userAgent) ? 'macOS' : /Android/.test(n.userAgent) ? 'Android' : /iPhone|iPad/.test(n.userAgent) ? 'iOS' : /Linux/.test(n.userAgent) ? 'Linux' : 'inconnue');
  try { const gl = document.createElement('canvas').getContext('webgl'), ext = gl?.getExtension('WEBGL_debug_renderer_info'); c.gpuNom = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : null; gl?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { c.gpuNom = null; }
  c.webgpu = false; c.vramGo = null; c.sources.vramGo = 'non mesurable depuis un navigateur';
  try { const a = await n.gpu?.requestAdapter?.(); if (a) { c.webgpu = true; const i = a.info || (await a.requestAdapterInfo?.()) || {}; c.gpuWebGPU = [i.vendor, i.architecture, i.description].filter(Boolean).join(' · ') || 'adaptateur présent'; c.gpuLogiciel = /swiftshader|llvmpipe|software|basic render/i.test(`${c.gpuNom} ${i.description || ''}`); c.maxBufferMo = Math.round((a.limits?.maxBufferSize || 0) / 1048576) || null; } } catch { /* WebGPU indisponible */ }
  try { const e = await n.storage?.estimate?.(); c.quotaGo = e?.quota ? +(e.quota / 1073741824).toFixed(1) : null; c.utiliseMo = e?.usage ? Math.round(e.usage / 1048576) : 0; c.sources.quotaGo = 'quota de stockage accordé au site (pas l\'espace disque total)'; } catch { c.quotaGo = null; }
  try { c.persistant = !!(await n.storage?.persisted?.()); } catch { c.persistant = false; }
  // Serveur local facultatif : mesures exactes du PC qui exécutera les moteurs
  c.serveur = null;
  if (serveur) { try { const r = await fetch(new URL('/api/capacites', serveur), { headers: jeton ? { 'X-DA-PRIME-Jeton': jeton } : {}, signal: AbortSignal.timeout(4000) }); c.serveur = r.ok ? await r.json() : { erreur: `réponse ${r.status}${r.status === 401 ? ' (jeton requis ou invalide)' : ''}` }; } catch (e) { c.serveur = { erreur: e.name === 'TimeoutError' ? 'délai dépassé' : 'injoignable' }; } }
  if (c.serveur?.erreur) c.serveur = { ...c.serveur, injoignable: true };
  return c;
}
