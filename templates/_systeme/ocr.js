// DA-PRIME · Script Studio · OCR local (module ES pur, Node et navigateur) : modèles, prétraitements, blocs, ordre de lecture, mesures.
// Le moteur (Tesseract.js) tourne dans le navigateur ; ce module ne fait aucun accès réseau et n'exécute aucune reconnaissance.

// Modèles FAST uniquement (tessdata_fast 4.1.0, Apache-2.0) : les modèles « best » plantent dans Tesseract.js (audit 0.11).
// Téléchargés à la demande de l'utilisateur, vérifiés par empreinte SHA-256, puis conservés sur l'appareil (hors ligne ensuite).
export const MODELES = {
  version: '4.1.0', depot: 'tesseract-ocr/tessdata_fast', licence: 'Apache-2.0', variante: 'fast',
  langues: {
    eng: { nom: 'Anglais', taille: 4113088, sha256: '7d4322bd2a7749724879683fc3912cb542f19906c83bcc1a52132556427170b2' },
    fra: { nom: 'Français', taille: 1130365, sha256: 'ced037562e8c80c13122dece28dd477d399af80911a28791a66a63ac1e3445ca' },
  },
};
export const urlModele = (code) => `https://raw.githubusercontent.com/${MODELES.depot}/${MODELES.version}/${code}.traineddata`;
// Adresse fictive interceptée par le worker OCR (jamais résolue sur le réseau) : les modèles sont lus dans la base locale
export const PREFIXE_MODELES = 'https://modeles-ocr.invalid/fast';
export const COMBINAISONS = { eng: 'Anglais', fra: 'Français', 'fra+eng': 'Français + anglais (plus lent ; textes mêlés)' };
export const languesDe = (comb) => String(comb || '').split('+').filter((c) => MODELES.langues[c]);

// Prétraitements : appliqués à une COPIE temporaire de la zone, jamais à l'original
export const PRETRAITEMENTS = {
  original: { nom: 'Image originale', echelle: 1 },
  x2: { nom: 'Agrandissement ×2', echelle: 2 },
  'x2-gris': { nom: '×2 + niveaux de gris', echelle: 2, gris: true },
  'x2-contraste': { nom: '×2 + gris + contraste renforcé', echelle: 2, gris: true, contraste: true },
  'x2-binaire': { nom: '×2 + noir et blanc (seuil d\'Otsu)', echelle: 2, gris: true, binaire: true },
};
// Découpage de page de Tesseract : « auto » (colonnes et blocs), « épars » (textes dispersés, typique des bulles), « bloc » (une zone)
export const SEGMENTATIONS = { auto: { nom: 'Automatique', psm: '3' }, epars: { nom: 'Texte épars (bulles dispersées)', psm: '11' }, bloc: { nom: 'Un seul bloc', psm: '6' } };
export const ZONES = { page: 'Page entière', cases: 'Case par case (cases détectées ou tracées)' };
// « 1-3, 5 » → indices de pages (base 0), bornés au numéro
export function lirePlage(texte, total) {
  const out = new Set();
  for (const part of String(texte || '').split(/[,;\s]+/).filter(Boolean)) { const m = part.match(/^(\d+)(?:-(\d+))?$/); if (!m) throw new Error(`plage de pages invalide : « ${part} »`);
    const a = +m[1], b = +(m[2] || m[1]); if (a < 1 || b > total || a > b) throw new Error(`pages hors du numéro (1 à ${total}) : « ${part} »`); for (let i = a; i <= b; i++) out.add(i - 1); }
  if (!out.size) throw new Error('aucune page indiquée'); return [...out].sort((x, y) => x - y);
}
// Réglages par défaut choisis d'après les mesures sur pages réelles (docs/SCRIPT_STUDIO.md) : ×2 + gris + contraste, découpage épars
export const REGLAGES_OCR0 = { langues: 'eng', pretraitement: 'x2-contraste', zone: 'page', segmentation: 'epars' };

// Seuil d'Otsu sur un histogramme de 256 niveaux
export function seuilOtsu(hist) {
  let total = 0, somme = 0; for (let i = 0; i < 256; i++) { total += hist[i]; somme += i * hist[i]; }
  let sB = 0, wB = 0, max = -1, seuil = 128;
  for (let t = 0; t < 256; t++) { wB += hist[t]; if (!wB) continue; const wF = total - wB; if (!wF) break; sB += t * hist[t];
    const mB = sB / wB, mF = (somme - sB) / wF, v = wB * wF * (mB - mF) ** 2; if (v > max) { max = v; seuil = t; } }
  return seuil;
}
// Traitement en place d'un tampon RGBA (copie) : gris, contraste (étirement 2-98 %), binarisation
export function traiterPixels(d, { gris, contraste, binaire } = {}) {
  if (!gris && !contraste && !binaire) return d;
  const n = d.length / 4, hist = new Uint32Array(256);
  for (let i = 0; i < d.length; i += 4) { const y = Math.round(0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2]); d[i] = d[i + 1] = d[i + 2] = y; hist[y]++; }
  if (contraste) { let c = 0, lo = 0, hi = 255; for (let i = 0; i < 256; i++) { c += hist[i]; if (c >= n * 0.02) { lo = i; break; } } c = 0; for (let i = 255; i >= 0; i--) { c += hist[i]; if (c >= n * 0.02) { hi = i; break; } }
    const k = hi > lo ? 255 / (hi - lo) : 1; hist.fill(0); for (let i = 0; i < d.length; i += 4) { const v = Math.max(0, Math.min(255, Math.round((d[i] - lo) * k))); d[i] = d[i + 1] = d[i + 2] = v; hist[v]++; } }
  if (binaire) { const s = seuilOtsu(hist); for (let i = 0; i < d.length; i += 4) d[i] = d[i + 1] = d[i + 2] = d[i] > s ? 255 : 0; }
  return d;
}

// Mot parasite (traits du dessin lus comme du texte) : sans lettre ni chiffre, ou confiance < 60 % ET (fragment de 1-2 signes
// qui n'est pas un mot courant, ou minuscules au milieu d'un lettrage en capitales). Retiré du texte proposé, conservé dans le texte brut.
const COURTS = new Set(['I', 'A', 'AN', 'AT', 'BE', 'BY', 'DO', 'GO', 'HE', 'IF', 'IN', 'IS', 'IT', 'ME', 'MY', 'NO', 'OF', 'OH', 'ON', 'OR', 'SO', 'TO', 'UP', 'US', 'WE', 'OK', 'À', 'Y', 'EN', 'ET', 'IL', 'JE', 'LA', 'LE', 'NE', 'TU', 'UN', 'DE', 'DU', 'SA', 'SE', 'TA', 'TE', 'MA', 'ON', 'OÙ', 'OU', 'AU', 'CE', 'ÇA', 'NI']);
export function estParasite(m, capitales = true) {
  const t = String(m.text || '').trim(), c = m.confidence ?? 0, l = t.replace(/[^\p{L}\p{N}]/gu, '');
  if (!l) return !/^[?!.,;:…«»"'’—–-]{1,3}$/.test(t);   // ponctuation isolée (« BOMBE ? » en français) gardée ; traits | ~ ] _ retirés
  if (c >= 60) return false;
  return (l.length <= 2 && !COURTS.has(l.toUpperCase())) || (capitales && /\p{Ll}/u.test(l));
}
// Blocs Tesseract → blocs DA-PRIME, coordonnées normalisées (0-1) dans la PAGE d'origine. Construits à partir des MOTS :
// une ligne est coupée là où l'écart entre deux mots dépasse 1,2 hauteur de ligne ET 2,5 fois l'espace médian de la ligne
// (Tesseract réunit parfois deux bulles voisines ; un lettrage aéré, lui, n'est pas coupé).
// Ce sont des zones de texte reconnues, PAS des limites de bulles.
export function blocsDepuisTesseract(data, { echelle = 1, decalage = { x: 0, y: 0 }, largeur, hauteur, caseNo = null } = {}) {
  const out = []; let ignores = 0;
  const zoneDe = (bb) => ({ x: +((bb.x0 / echelle + decalage.x) / largeur).toFixed(4), y: +((bb.y0 / echelle + decalage.y) / hauteur).toFixed(4), w: +((bb.x1 - bb.x0) / echelle / largeur).toFixed(4), h: +((bb.y1 - bb.y0) / echelle / hauteur).toFixed(4) });
  for (const b of data?.blocks || []) for (const p of b.paragraphs || []) {
    const lignes = p.lines || [];
    if (!lignes.some((l) => (l.words || []).some((w) => w.bbox))) {   // pas de détail par mot : paragraphe entier
      const texte = (lignes.length ? lignes.map((l) => l.text.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' ') : String(p.text || '')).replace(/\s+/g, ' ').trim();
      if (!/[\p{L}\p{N}]/u.test(texte)) { ignores++; continue; }
      const mots = lignes.flatMap((l) => l.words || []); out.push({ texte, texteBrut: texte, retires: [], lignes: lignes.map((l) => l.text.trim()).filter(Boolean), confiance: Math.max(0, Math.min(1, (p.confidence ?? 0) / 100)), zone: zoneDe(p.bbox), case: caseNo, mots: mots.length, motsFaibles: mots.filter((m) => m.confidence < 60).length }); continue;
    }
    for (const l of lignes) {
      const ws = (l.words || []).filter((w) => w.bbox && String(w.text || '').trim()).sort((a, b) => a.bbox.x0 - b.bbox.x0); if (!ws.length) continue;
      const hs = ws.map((w) => w.bbox.y1 - w.bbox.y0).sort((a, b) => a - b), hL = hs[Math.floor(hs.length / 2)] || 1, segs = [[ws[0]]];
      // Seuil relatif à l'espacement habituel de la ligne : un lettrage aéré n'est pas coupé, deux bulles voisines le sont
      const ecarts = ws.slice(1).map((w, k) => w.bbox.x0 - ws[k].bbox.x1), tri = [...ecarts].sort((a, b) => a - b), med = tri.length >= 2 ? tri[Math.floor((tri.length - 1) / 2)] : 0.5 * hL, seuil = Math.max(1.2 * hL, 1.8 * med);
      for (let k = 1; k < ws.length; k++) { if (ecarts[k - 1] > seuil) segs.push([]); segs.at(-1).push(ws[k]); }
      for (const seg of segs) {
        const lettres = seg.map((w) => String(w.text).replace(/[^\p{L}]/gu, '')).join(''), capitales = lettres.length ? (lettres.match(/\p{Lu}/gu) || []).length / lettres.length >= 0.6 : true;
        const garde = seg.filter((w) => !estParasite(w, capitales)), brut = seg.map((w) => w.text).join(' ');
        if (!garde.length) { ignores++; continue; }
        const bb = { x0: Math.min(...garde.map((w) => w.bbox.x0)), y0: Math.min(...garde.map((w) => w.bbox.y0)), x1: Math.max(...garde.map((w) => w.bbox.x1)), y1: Math.max(...garde.map((w) => w.bbox.y1)) }, texte = garde.map((w) => w.text).join(' ');
        out.push({ texte, texteBrut: brut, retires: seg.filter((w) => !garde.includes(w)).map((w) => w.text), lignes: [texte], confiance: Math.max(0, Math.min(1, garde.reduce((t, w) => t + (w.confidence ?? 0), 0) / garde.length / 100)), zone: zoneDe(bb), case: caseNo,
          mots: garde.length, motsFaibles: garde.filter((w) => w.confidence < 60).length });
      }
    }
  }
  return { blocs: out, ignores };
}
// Regroupement prudent des morceaux d'un même texte (le découpage « épars » rend une ligne, voire un mot, par bloc) :
// deux groupes de la même case sont réunis si l'un est dans la colonne de l'autre (chevauchement horizontal ≥ 50 % du plus étroit)
// et s'ils se touchent verticalement (écart < 1 hauteur de ligne). Deux bulles côte à côte ne se chevauchent pas : elles restent séparées.
// Le texte est ensuite recomposé rangée par rangée, de gauche à droite (un mot en gras isolé par Tesseract reprend sa place).
export function regrouperLignes(blocs) {
  let gs = blocs.map((b) => ({ ...b, morceaux: [{ texte: b.texte, texteBrut: b.texteBrut ?? b.texte, zone: b.zone }] }));
  const proches = (a, b) => { if (a.case !== b.case) return false; const h = Math.min(...[...a.morceaux, ...b.morceaux].map((m) => m.zone.h)), o = Math.min(a.zone.x + a.zone.w, b.zone.x + b.zone.w) - Math.max(a.zone.x, b.zone.x), gv = Math.max(a.zone.y, b.zone.y) - Math.min(a.zone.y + a.zone.h, b.zone.y + b.zone.h);
    return o >= 0.5 * Math.min(a.zone.w, b.zone.w) && gv < 1.0 * h; };
  for (let change = true; change;) { change = false;
    for (let i = 0; i < gs.length && !change; i++) for (let k = i + 1; k < gs.length && !change; k++) if (proches(gs[i], gs[k])) {
      const a = gs[i], b = gs[k], x0 = Math.min(a.zone.x, b.zone.x), y0 = Math.min(a.zone.y, b.zone.y), x1 = Math.max(a.zone.x + a.zone.w, b.zone.x + b.zone.w), y1 = Math.max(a.zone.y + a.zone.h, b.zone.y + b.zone.h), n = (a.mots || 0) + (b.mots || 0);
      gs[i] = { ...a, morceaux: [...a.morceaux, ...b.morceaux], retires: [...(a.retires || []), ...(b.retires || [])], confiance: n ? (a.confiance * (a.mots || 0) + b.confiance * (b.mots || 0)) / n : Math.min(a.confiance, b.confiance), mots: n, motsFaibles: (a.motsFaibles || 0) + (b.motsFaibles || 0),
        zone: { x: +x0.toFixed(4), y: +y0.toFixed(4), w: +(x1 - x0).toFixed(4), h: +(y1 - y0).toFixed(4) } };
      gs.splice(k, 1); change = true; } }
  return gs.map(({ morceaux, ...g }) => {
    // Rangées par le CENTRE des morceaux, à ± une demi-hauteur de ligne médiane (un fragment haut n'étire pas une rangée)
    const hs = morceaux.map((m) => m.zone.h).sort((a, b) => a - b), hRef = hs[Math.floor((hs.length - 1) / 2)], rangees = [];
    for (const m of [...morceaux].sort((a, b) => (a.zone.y + a.zone.h / 2) - (b.zone.y + b.zone.h / 2))) { const c = m.zone.y + m.zone.h / 2, r = rangees.find((x) => Math.abs(x.c - c) < 0.5 * hRef); if (r) r.m.push(m); else rangees.push({ c, m: [m] }); }
    const lignes = rangees.map((r) => r.m.sort((a, b) => a.zone.x - b.zone.x));
    return { ...g, texte: lignes.map((l) => l.map((m) => m.texte).join(' ')).join(' '), texteBrut: lignes.map((l) => l.map((m) => m.texteBrut).join(' ')).join(' '), lignes: lignes.map((l) => l.map((m) => m.texte).join(' ')) };
  });
}
// Ordre de lecture : par case quand elles existent (ordre des cases), puis par rangées (haut → bas), gauche → droite
// (droite → gauche en manga). Sur une page entière sans cases, l'ordre reste APPROXIMATIF et est signalé comme tel.
export function ordreLecture(blocs, { sens = 'gd' } = {}) {
  const parCase = new Map(); for (const b of blocs) { const k = b.case ?? 0; if (!parCase.has(k)) parCase.set(k, []); parCase.get(k).push(b); }
  const out = []; let certain = true;
  for (const k of [...parCase.keys()].sort((a, b) => a - b)) {
    const reste = [...parCase.get(k)].sort((a, b) => a.zone.y - b.zone.y), rangees = [];
    for (const b of reste) { const r = rangees.find((x) => b.zone.y < x.bas - Math.min(b.zone.h, x.h) * 0.4); if (r) { r.blocs.push(b); r.bas = Math.max(r.bas, b.zone.y + b.zone.h); } else rangees.push({ bas: b.zone.y + b.zone.h, h: b.zone.h, blocs: [b] }); }
    for (const r of rangees) { if (r.blocs.length > 1) certain = false; r.blocs.sort((a, b) => (sens === 'dg' ? b.zone.x - a.zone.x : a.zone.x - b.zone.x)); out.push(...r.blocs); }
    if (k === 0 && reste.length > 1) certain = false;
  }
  return { blocs: out.map((b, i) => ({ ...b, ordre: i + 1 })), certain };
}

// ---------- Mesures (indépendantes de la confiance Tesseract) ----------
export const motsDe = (t) => (String(t || '').normalize('NFKC').toUpperCase().replace(/[‘’`´]/g, "'").replace(/[“”«»]/g, '"').replace(/-\s+/g, '').match(/[\p{L}\p{N}]+(?:'[\p{L}\p{N}]+)*/gu) || []);
const caracteresDe = (t) => [...motsDe(t).join(' ')];
// Distance d'édition avec décompte substitutions / suppressions / insertions
export function aligner(ref, hyp) {
  const n = ref.length, m = hyp.length, d = Array.from({ length: n + 1 }, (_, i) => { const r = new Uint32Array(m + 1); r[0] = i; return r; });
  for (let j = 1; j <= m; j++) d[0][j] = j;
  for (let i = 1; i <= n; i++) for (let j = 1; j <= m; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1));
  let i = n, j = m, S = 0, D = 0, I = 0, C = 0;
  while (i > 0 || j > 0) { if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (ref[i - 1] === hyp[j - 1] ? 0 : 1)) { if (ref[i - 1] === hyp[j - 1]) C++; else S++; i--; j--; } else if (i > 0 && d[i][j] === d[i - 1][j] + 1) { D++; i--; } else { I++; j--; } }
  return { S, D, I, C, N: n, distance: d[n][m] };
}
// Exactitude des mots = mots de référence correctement reconnus / mots de référence ; WER = (S+D+I)/N ; CER idem en caractères
export function mesurer(reference, reconnu) {
  const r = motsDe(reference), h = motsDe(reconnu), a = aligner(r, h), c = aligner(caracteresDe(reference), caracteresDe(reconnu));
  return { mots: a.N, motsReconnus: h.length, exactitude: a.N ? a.C / a.N : null, wer: a.N ? (a.S + a.D + a.I) / a.N : null, cer: c.N ? (c.S + c.D + c.I) / c.N : null, ...{ S: a.S, D: a.D, I: a.I, C: a.C } };
}
// Agrégation pondérée par le nombre de mots (et non moyenne de pourcentages)
export function agreger(mesures) {
  const t = mesures.reduce((s, m) => ({ N: s.N + m.mots, C: s.C + m.C, E: s.E + m.S + m.D + m.I, ce: s.ce + (m.cer ?? 0) * m.mots }), { N: 0, C: 0, E: 0, ce: 0 });
  return { echantillons: mesures.length, mots: t.N, exactitude: t.N ? t.C / t.N : null, wer: t.N ? t.E / t.N : null, cer: t.N ? t.ce / t.N : null };
}
// Deux axes distincts : la NATURE du texte (sa fonction dans la page) et son STYLE de lettrage.
// Une couverture, des crédits ou un cartouche de lieu ne sont pas des bulles : ils sont relevés, mais classés à part.
export const NATURES_TEXTE = { inconnue: 'Nature à préciser', dialogue: 'Bulle de dialogue', pensee: 'Bulle de pensée', narration: 'Cartouche de narration', localisation: 'Lieu ou moment (cartouche)',
  presentation: 'Présentation d\'un personnage', onomatopee: 'Effet sonore', decor: 'Texte du décor (enseigne, écran, journal…)', couverture: 'Couverture (titre, logo, mentions)', credits: 'Crédits (auteurs, équipe éditoriale)', titre: 'Titre ou intertitre (chapitre, « Previously… »)' };
// Catégorie de la base de connaissances correspondant à une nature confirmée par l'utilisateur
export const NATURE_VERS_CATEGORIE = { dialogue: 'dialogue', pensee: 'dialogue', narration: 'narration', localisation: 'narration', presentation: 'narration', onomatopee: 'visuel', decor: 'visuel', couverture: 'texte', credits: 'texte', titre: 'texte', inconnue: 'texte' };
export const NATURES_PAGE = { '': 'Nature de la page à préciser', couverture: 'Couverture', credits: 'Page de crédits ou de titre', histoire: 'Page de l\'histoire', resume: 'Résumé des épisodes précédents', distribution: 'Présentation des personnages (« Cast »)', texte: 'Page de texte (courrier, préface…)', publicite: 'Publicité', autre: 'Autre' };
// Suggestion par mots-clés sûrs uniquement (à confirmer) ; sinon aucune : la nature ne se devine pas à partir du seul texte
const MOTS_CREDITS = /\b(WRITER|WRITTEN BY|ARTISTS?|PENCIL(?:L)?ER|INKER|COLOU?RIST|COLOU?R ARTIST|LETTERER|LETTERING|EDITORS?|EDITOR IN CHIEF|PUBLISHER|PRODUCER|CREATIVE OFFICER|COVER ARTISTS?|DESIGNER|CREATED BY|SCÉNARIO|DESSIN|COULEURS|LETTRAGE|TRADUCTION)\b/;
export function suggererNature(texte, { naturePage = '' } = {}) {
  const t = String(texte || '').toUpperCase();
  if (MOTS_CREDITS.test(t)) return { nature: 'credits', raison: 'mots-clés de crédits (fonction éditoriale)' };
  if (/\b(CODENAME|CODE NAME|NOM DE CODE)\b|\bAGE \d{1,3}\b/.test(t)) return { nature: 'presentation', raison: 'fiche de présentation (nom de code, âge)' };
  if (/^\W*PREVIOUSLY\b|^\W*(CHAPTER|PART|CHAPITRE|PRÉCÉDEMMENT)\b/.test(t)) return { nature: 'titre', raison: 'intertitre ou résumé' };
  if (/^\W*(NOW|MEANWHILE|LATER|EARLIER|ELSEWHERE|MOMENTS? LATER|\d+ (YEARS?|MONTHS?|DAYS?|HOURS?) (AGO|LATER)|PENDANT CE TEMPS|PLUS TARD|AILLEURS)\b/.test(t)) return { nature: 'localisation', raison: 'indication de lieu ou de moment' };
  if (naturePage === 'couverture') return { nature: 'couverture', raison: 'page marquée « couverture »' };
  if (naturePage === 'credits') return { nature: 'credits', raison: 'page marquée « crédits »' };
  return null;
}
// Mesure : style de lettrage et nature, rapportés séparément ; une langue = un rapport (jamais de statistiques fusionnées)
export const STYLES_MESURE = { ordinaire: 'Lettrage ordinaire', gras: 'Gras dominant', italique: 'Italique', stylise: 'Lettrage stylisé', petit: 'Texte de petite taille' };
export const CATEGORIES_MESURE = { dialogue: 'Dialogues ordinaires', narration: 'Narration et cartouches', italique: 'Italique', gras: 'Gras', stylise: 'Lettrage stylisé', onomatopee: 'Effets sonores', petit: 'Texte de petite taille', editorial: 'Couverture, crédits, présentation, décor (lettrage ordinaire)' };
// Ancien étiquetage (un seul axe) → deux axes
export function axesEchantillon(e) {
  if (e.nature) return { style: e.categorie || 'ordinaire', nature: e.nature };
  const style = ['italique', 'stylise', 'petit', 'gras'].includes(e.categorie) ? e.categorie : 'ordinaire', nature = e.categorie === 'narration' ? 'narration' : e.categorie === 'onomatopee' ? 'onomatopee' : 'dialogue';
  return { style: e.categorie === 'onomatopee' ? 'stylise' : style, nature };
}
// Catégorie de rapport (liste de la mission) : effets sonores et natures éditoriales à part, puis style, puis nature
export function categorieRapport(e) { const { style, nature } = axesEchantillon(e); if (nature === 'onomatopee') return 'onomatopee'; if (style !== 'ordinaire') return style; return nature === 'narration' || nature === 'localisation' ? 'narration' : nature === 'dialogue' || nature === 'pensee' ? 'dialogue' : 'editorial'; }
export const OBJECTIF = { exactitude: 0.85, note: 'Objectif initial sur le lettrage courant : bulles de dialogue et cartouches de narration en lettrage ordinaire ; aucune garantie sur le lettrage stylisé, la couverture, les crédits ou les effets sonores.' };
export const estLettrageCourant = (e) => { const { style, nature } = axesEchantillon(e); return style === 'ordinaire' && ['dialogue', 'pensee', 'narration'].includes(nature); };
