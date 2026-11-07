// Primestone · moteur de gabarits de miniatures (module ES sans dépendance, identique dans Node et le navigateur).
// rendre(familleId, varianteId, donnees, options) -> { svg, alertes, zones, variante }
// Le SVG produit est structuré en calques (Inkscape / Figma) ; les champs modifiables portent data-ps-champ.
import { T, W, H, C, G, esc, placer, DEFS, calque, guides, inter, utiliserFormat, FORMATS } from './briques.js';
import { COLLECTIONS, trouver } from './registre.js';
import FAMILLES from './familles.js';
import KIOSQUE from './kiosque.js';
import INFOGRAPHIES from './infographies.js';
export { W, H, C, G, placer, FAMILLES, KIOSQUE, INFOGRAPHIES, FORMATS, COLLECTIONS, trouver, T };

export function rendre(familleId, varianteId, donnees = {}, { guides: avecGuides = false } = {}) {
  const t = trouver(familleId); if (!t) throw new Error(`Gabarit inconnu : ${familleId}`);
  const fam = t.gabarit; utiliserFormat(t.collection.format);
  // « standard » : ancien nom de la variante papier des gabarits Kiosque (avant Primestone), conservé pour les documents existants
  if (varianteId === 'standard' && !fam.variantes.standard && fam.variantes.papier) varianteId = 'papier';
  const vari = fam.variantes[varianteId] ? varianteId : Object.keys(fam.variantes)[0];
  const d = { ...Object.fromEntries(fam.champs.filter((c) => c.defaut !== undefined).map((c) => [c.id, c.defaut])), ...donnees };
  const ctx = { alertes: [], zones: {}, textes: [] };
  const out = fam.variantes[vari].rendre(d, ctx); // { fond, illustration, graphisme, textes, marque }

  // Contrôles communs
  for (const t of ctx.textes) {
    if (t.f.vide) { if (t.requis) ctx.alertes.push({ niveau: 'erreur', champ: t.id, message: `${t.label} vide.` }); continue; }
    if (t.f.deborde) ctx.alertes.push({ niveau: 'erreur', champ: t.id, message: `${t.label} : le texte déborde de sa zone, même à la plus petite taille. Raccourcir.` });
    if (t.mots) {
      const n = (d[t.id] || '').trim().split(/\s+/).filter((m) => /[\p{L}\d]/u.test(m)).length;
      if (n > 3) ctx.alertes.push({ niveau: 'attention', champ: t.id, message: `${t.label} : ${n} mots. Trois mots maximum sont recommandés sur YouTube.` });
    }
    if (t.titre) {
      if (t.f.cap < G.capMin) ctx.alertes.push({ niveau: 'attention', champ: t.id, message: `${t.label} : capitales de ${Math.round(t.f.cap)} px, sous le minimum de ${G.capMin} px. ${G.format === 'miniature' ? 'Peu lisible à 168 px de large (smartphone).' : 'Peu lisible dans le fil sur téléphone.'}` });
    }
    if (t.boite && G.format === 'miniature' && inter(t.boite, { x: G.m, y: H - G.m - G.seal, w: G.seal, h: G.seal })) ctx.alertes.push({ niveau: 'erreur', champ: t.id, message: `${t.label} chevauche le sceau Primestone (bas gauche).` });
    if (t.boite && G.dead && inter(t.boite, G.dead)) ctx.alertes.push({ niveau: 'erreur', champ: t.id, message: `${t.label} empiète sur le coin bas droit, masqué par la durée YouTube.` });
  }
  for (const [id, z] of Object.entries(ctx.zones)) {
    const img = d[id];
    if (!img?.href) { if (z.requis) ctx.alertes.push({ niveau: 'erreur', champ: id, message: `${z.label} : aucune image.` }); continue; }
    if (img.placeholder) ctx.alertes.push({ niveau: 'info', champ: id, message: `${z.label} : image de substitution (PLACEHOLDER).` });
    const p = placer(img, z);
    if (p.echelle > 1.5) ctx.alertes.push({ niveau: 'attention', champ: id, message: `${z.label} : image agrandie ${p.echelle.toFixed(1)} fois, risque de flou. Utiliser une source plus grande.` });
  }
  if (!String(d.credit || '').trim() && fam.champs.some((c) => c.id === 'credit')) ctx.alertes.push({ niveau: 'attention', champ: 'credit', message: 'Crédit artiste manquant.' });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" data-ps-format="${G.format}" data-ps-famille="${familleId}" data-ps-variante="${vari}" data-ps-version="${T.$version}">
<title>Primestone · ${esc(t.collection.nom)} · ${esc(fam.nom)} · ${esc(fam.variantes[vari].nom)}</title>
<desc>Gabarit Primestone provisoire (tokens v${T.$version}). Sceau P : vectorisation NON OFFICIELLE. Jaune ${C.y} : proposition non validée. Généré par templates/_systeme/moteur.js.</desc>
${DEFS()}
${calque('fond', 'Fond', out.fond || '')}
${calque('illustration', 'Illustration', out.illustration || '')}
${calque('graphisme', 'Graphisme', out.graphisme || '')}
${calque('textes', 'Textes', out.textes || '')}
${calque('marque', 'Marque (rubrique, sceau, crédit)', out.marque || '')}
${calque('guides', 'Guides (masqué)', guides(), !avecGuides)}
</svg>
`;
  return { svg, alertes: ctx.alertes, zones: ctx.zones, variante: vari, format: { id: G.format, w: W, h: H }, collection: t.collection.id };
}

