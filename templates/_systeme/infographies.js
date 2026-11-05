// Primestone · infographies pilotées par des données JSON (lot 3), format 16:9 (1920 × 1080).
// Une seule spécification déclarative (STRUCTURES) sert à la fois :
//   - à la validation des données, dans le navigateur et dans Node (valider) ;
//   - au schéma JSON publié pour les éditeurs de texte (versJsonSchema -> schemas/infographie.schema.json).
import { W, H, C, G, M, texte, lame } from './briques.js';
import { SERIF, CORPS, haut, mono, fond, trame, masthead, T, L } from './editorial.js';
import EXEMPLES from './exemples.js';
import TOK from './tokens.js';

// ---------- Spécification ----------
const txt = (max, { min = 0, requis = false } = {}) => ({ t: 'texte', min: requis ? Math.max(1, min) : min, max, requis });
const entete = { titre: txt(90, { requis: true }), rubrique: txt(30), numero: txt(12), source: txt(160) };
export const STRUCTURES = {
  chronologie: {
    description: 'Périodes successives proportionnelles à leur durée, avec un repère par période.',
    champs: { ...entete, finEchelle: { t: 'entier', min: 1800, max: 2100, description: 'Année de fin de l’échelle, obligatoire si la dernière période n’a pas de fin.' },
      periodes: { t: 'liste', min: 2, max: 6, requis: true, element: { t: 'objet', champs: {
        nom: txt(30, { requis: true }), debut: { t: 'entier', min: 1800, max: 2100, requis: true }, fin: { t: 'entier', min: 1800, max: 2100, nul: true },
        evenement: txt(48), detail: txt(130) } } } },
    regles(d, err) {
      const p = d.periodes || [];
      p.forEach((x, i) => {
        if (x.fin == null && i !== p.length - 1) err(`periodes[${i}].fin`, 'seule la dernière période peut rester ouverte (fin : null).');
        if (x.fin != null && x.fin <= x.debut) err(`periodes[${i}].fin`, `la fin (${x.fin}) doit être postérieure au début (${x.debut}).`);
        if (i && p[i - 1].fin != null && x.debut < p[i - 1].fin) err(`periodes[${i}].debut`, `chevauche la période précédente (qui finit en ${p[i - 1].fin}).`);
        if (i && x.debut < p[i - 1].debut) err(`periodes[${i}].debut`, 'les périodes doivent être dans l’ordre chronologique.');
      });
      const der = p[p.length - 1];
      if (der && der.fin == null && d.finEchelle == null) err('finEchelle', 'obligatoire quand la dernière période n’a pas de fin.');
      if (der && der.fin == null && d.finEchelle != null && d.finEchelle <= der.debut) err('finEchelle', `doit être postérieure à ${der.debut}.`);
    },
  },
  barres: {
    description: 'Comparaison de valeurs en barres horizontales, toujours à l’échelle, source obligatoire.',
    champs: { ...entete, source: txt(160, { requis: true }), unite: txt(12), echelleMax: { t: 'nombre', min: 0, description: 'Valeur de la barre pleine (par défaut : la plus grande valeur).' },
      barres: { t: 'liste', min: 2, max: 6, requis: true, element: { t: 'objet', champs: {
        label: txt(40, { requis: true }), sous: txt(40), valeur: { t: 'nombre', min: 0, requis: true }, affichage: txt(14) } } } },
    regles(d, err) {
      const max = Math.max(0, ...(d.barres || []).map((b) => +b.valeur || 0));
      if (d.echelleMax != null && d.echelleMax < max) err('echelleMax', `doit être au moins égale à la plus grande valeur (${max}).`);
      if (max === 0 && d.echelleMax == null) err('barres', 'au moins une valeur doit être supérieure à 0.');
    },
  },
};

// ---------- Validation (messages en français, avec le chemin de la donnée) ----------
const typeDe = (v) => (v === null ? 'null' : Array.isArray(v) ? 'liste' : typeof v);
function verifier(spec, v, chemin, err) {
  if (v === undefined || v === null || v === '') {
    if (v === null && spec.nul) return;
    if (spec.requis) err(chemin, 'obligatoire.');
    else if (v === null && !spec.nul) err(chemin, 'ne peut pas être null.');
    return;
  }
  switch (spec.t) {
    case 'texte':
      if (typeof v !== 'string') return err(chemin, `texte attendu (reçu : ${typeDe(v)}).`);
      if (v.trim().length < spec.min) return err(chemin, 'obligatoire.');
      if (v.length > spec.max) err(chemin, `${v.length} caractères, ${spec.max} maximum.`);
      return;
    case 'entier': case 'nombre':
      if (typeof v !== 'number' || !Number.isFinite(v)) return err(chemin, `nombre attendu (reçu : ${typeDe(v)}).`);
      if (spec.t === 'entier' && !Number.isInteger(v)) err(chemin, 'nombre entier attendu.');
      if (spec.min != null && v < spec.min) err(chemin, `doit être au moins ${spec.min}.`);
      if (spec.max != null && v > spec.max) err(chemin, `doit être au plus ${spec.max}.`);
      return;
    case 'liste':
      if (!Array.isArray(v)) return err(chemin, `liste attendue (reçu : ${typeDe(v)}).`);
      if (v.length < spec.min || v.length > spec.max) err(chemin, `${v.length} élément(s), entre ${spec.min} et ${spec.max} attendus.`);
      v.slice(0, spec.max).forEach((x, i) => verifier(spec.element, x, `${chemin}[${i}]`, err));
      return;
    case 'objet':
      if (typeDe(v) !== 'object') return err(chemin, `objet attendu (reçu : ${typeDe(v)}).`);
      for (const k of Object.keys(v)) if (!(k in spec.champs) && !k.startsWith('$')) err(chemin ? `${chemin}.${k}` : k, 'champ inconnu (faute de frappe ?).');
      for (const [k, s] of Object.entries(spec.champs)) verifier(s, v[k], chemin ? `${chemin}.${k}` : k, err);
  }
}
// Accepte un texte JSON ou un objet. Renvoie { donnees, erreurs: [{ chemin, message }] }.
export function valider(entree, typeAttendu) {
  const erreurs = []; const err = (chemin, message) => erreurs.push({ chemin, message });
  let d = entree;
  if (typeof entree === 'string') {
    try { d = JSON.parse(entree); } catch (e) {
      const pos = +(String(e.message).match(/position (\d+)/) || [])[1];
      const ligne = Number.isFinite(pos) ? entree.slice(0, pos).split('\n').length : null;
      err('', `JSON invalide${ligne ? ` (ligne ${ligne})` : ''} : vérifier les virgules, guillemets et accolades.`);
      return { donnees: null, erreurs };
    }
  }
  if (typeDe(d) !== 'object') { err('', 'un objet JSON est attendu.'); return { donnees: null, erreurs }; }
  const s = STRUCTURES[d.type];
  if (!s) { err('type', `type inconnu « ${d.type ?? ''} » (attendus : ${Object.keys(STRUCTURES).join(', ')}).`); return { donnees: d, erreurs }; }
  if (typeAttendu && d.type !== typeAttendu) err('type', `ce gabarit attend le type « ${typeAttendu} ».`);
  verifier({ t: 'objet', champs: { type: { t: 'texte', min: 1, max: 20, requis: true }, ...s.champs } }, d, '', err);
  if (!erreurs.length) s.regles(d, err);
  return { donnees: d, erreurs };
}

// ---------- Schéma JSON (généré, pour l'autocomplétion des éditeurs) ----------
function schemaDe(spec) {
  const base = spec.description ? { description: spec.description } : {};
  switch (spec.t) {
    case 'texte': return { ...base, type: 'string', ...(spec.min ? { minLength: spec.min } : {}), maxLength: spec.max };
    case 'entier': case 'nombre': return { ...base, type: spec.nul ? [spec.t === 'entier' ? 'integer' : 'number', 'null'] : spec.t === 'entier' ? 'integer' : 'number', ...(spec.min != null ? { minimum: spec.min } : {}), ...(spec.max != null ? { maximum: spec.max } : {}) };
    case 'liste': return { ...base, type: 'array', minItems: spec.min, maxItems: spec.max, items: schemaDe(spec.element) };
    case 'objet': return { ...base, type: 'object', additionalProperties: false, patternProperties: { '^\\$': {} }, required: Object.entries(spec.champs).filter(([, s]) => s.requis).map(([k]) => k), properties: Object.fromEntries(Object.entries(spec.champs).map(([k, s]) => [k, schemaDe(s)])) };
  }
}
export function versJsonSchema() {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema', $id: 'https://primestone.media/schemas/infographie/v1.json', title: 'Primestone · données d’infographie',
    description: 'Généré par templates/_systeme/infographies.js. Les règles croisées (ordre des périodes, échelle) sont vérifiées par le moteur.',
    oneOf: Object.keys(STRUCTURES).map((k) => ({ $ref: `#/$defs/${k}` })),
    $defs: Object.fromEntries(Object.entries(STRUCTURES).map(([k, s]) => {
      const o = schemaDe({ t: 'objet', description: s.description, champs: s.champs });
      o.properties = { type: { const: k }, ...o.properties }; o.required = ['type', ...o.required]; return [k, o];
    })),
  };
}

// ---------- Rendu ----------
const nombre = (v) => v.toLocaleString('fr-FR', { maximumFractionDigits: 2 });
const COULEURS = () => [C.y, T_('color.editorial.warm-1'), T_('color.editorial.warm-2'), T_('color.editorial.warm-3')];
const T_ = (k) => TOK[k];
const enErreur = (ctx, erreurs) => {
  for (const e of erreurs) ctx.alertes.push({ niveau: 'erreur', champ: 'donnees', message: `Données${e.chemin ? ` · ${e.chemin}` : ''} : ${e.message}` });
  return { fond: fond(C.paper), textes: `<rect x="${G.m}" y="${G.m}" width="${W - 2 * G.m}" height="${H - 2 * G.m}" fill="none" stroke="${C.red}" stroke-width="6" stroke-dasharray="24 14"/>`
    + mono('erreur', `Données invalides : ${erreurs.length} erreur${erreurs.length > 1 ? 's' : ''} (voir les contrôles)`, W / 2, H / 2, C.red, { taille: 34, ancre: 'middle' }) };
};
const pieceCommune = (d) => ({ rubrique: d.rubrique || '', numero: d.numero || '', page: '', pied: '' });
const champsInfo = (type) => [{ id: 'donnees', type: 'json', label: 'Données (JSON)', defaut: JSON.stringify(EXEMPLES[type], null, 2), structure: type }];

export default {
  'info-chronologie': {
    prefixe: 'INFO', nom: 'Chronologie', description: 'Périodes proportionnelles à leur durée, à partir d’un fichier JSON.',
    champs: champsInfo('chronologie'),
    variantes: { standard: { nom: 'Papier', rendre(d, ctx) {
      const { donnees: x, erreurs } = valider(d.donnees, 'chronologie'); if (erreurs.length) return enErreur(ctx, erreurs);
      const p = x.periodes, fin = (q) => q.fin ?? x.finEchelle, t0 = p[0].debut, t1 = fin(p[p.length - 1]);
      const l = L(), X = (a) => G.m + ((a - t0) / (t1 - t0)) * l, y0 = 440, hb = 260, cols = COULEURS();
      let blocs = '', dessous = '';
      p.forEach((q, i) => {
        const x0 = X(q.debut), w = X(fin(q)) - x0, c = cols[i % cols.length], id = `periodes[${i}]`;
        blocs += `<rect x="${x0.toFixed(1)}" y="${y0}" width="${w.toFixed(1)}" height="${hb}" fill="${c}"/><rect x="${x0.toFixed(1)}" y="${y0}" width="6" height="${hb + 220}" fill="${C.k}"/>`;
        blocs += texte(ctx, { [id]: q.nom }, id, `Période ${i + 1}`, { police: 'display', tMax: 56, tMin: 26, l: w - 40, h: 130, maxLignes: 2, interligne: 0.9 }, haut(y0 + 26, x0 + 22, C.k));
        blocs += mono(`${id}-dates`, `${q.debut} – ${q.fin ?? 'aujourd’hui'}`, x0 + 22, y0 + hb - 26, C.k, { taille: Math.min(26, Math.max(16, Math.floor(w / 9))) });
        dessous += texte(ctx, { [`${id}.evenement`]: q.evenement || '' }, `${id}.evenement`, `Période ${i + 1} · événement`, { ...SERIF, tMax: 36, tMin: 22, l: w - 36, h: 80, maxLignes: 2 }, haut(y0 + hb + 34, x0 + 22, C.k))
          + texte(ctx, { [`${id}.detail`]: q.detail || '' }, `${id}.detail`, `Période ${i + 1} · détail`, { ...CORPS, tMax: 26, tMin: 17, l: w - 36, h: 110, maxLignes: 4, interligne: 1.3 }, haut(y0 + hb + 120, x0 + 22, C.k));
      });
      return {
        fond: fond(C.paper) + trame(),
        graphisme: blocs + `<rect x="${G.m}" y="${y0 + hb}" width="${l}" height="8" fill="${C.k}"/>`,
        textes: texte(ctx, x, 'titre', 'Titre', { ...SERIF, tMax: 96, tMin: 56, l, h: 200, maxLignes: 2 }, haut(220, G.m, C.k), { titre: true, requis: true, mots: false }) + dessous,
        marque: masthead(pieceCommune(x), C.k) + mono('source', x.source, G.m, H - G.m + 30, C.k, { taille: 20 }),
      };
    } } },
  },
  'info-barres': {
    prefixe: 'INFO', nom: 'Barres comparatives', description: 'Valeurs à l’échelle, biseau de l’incision, source obligatoire.',
    champs: champsInfo('barres'),
    variantes: { standard: { nom: 'Jaune', rendre(d, ctx) {
      const { donnees: x, erreurs } = valider(d.donnees, 'barres'); if (erreurs.length) return enErreur(ctx, erreurs);
      const b = x.barres, max = x.echelleMax ?? Math.max(...b.map((q) => q.valeur)), l = L(), xb = G.m + 520, lb = W - G.m - xb - 40;
      const zone0 = 470, zone1 = H - G.m - 60, pas = Math.min(120, (zone1 - zone0) / b.length), hb = pas * 0.62;
      let rangs = '';
      b.forEach((q, i) => {
        const y = zone0 + i * pas, w = Math.max(2, (q.valeur / max) * lb), id = `barres[${i}]`, val = q.affichage || `${nombre(q.valeur)}${x.unite ? ` ${x.unite}` : ''}`;
        rangs += texte(ctx, { [id]: q.label }, id, `Barre ${i + 1}`, { police: 'mono', tMax: 28, tMin: 18, l: 480, h: 40, maxLignes: 1, casse: 'upper', interlettre: 2 }, haut(y + 4, G.m, C.k));
        rangs += texte(ctx, { [`${id}.sous`]: q.sous || '' }, `${id}.sous`, `Barre ${i + 1} · précision`, { ...CORPS, tMax: 22, tMin: 16, l: 480, h: 30, maxLignes: 1 }, haut(y + 48, G.m, C.k));
        rangs += lame(xb, y, w, hb, C.k);
        const tv = Math.round(hb * 0.62), dedans = w > 40 + val.length * tv * 0.5;
        rangs += `<text id="${id}-valeur" x="${(dedans ? xb + 24 : xb + w + hb * 0.15 + 18).toFixed(1)}" y="${(y + hb / 2 + tv * 0.36).toFixed(1)}" font-family="${M.display.family}" font-size="${tv}" fill="${dedans ? C.y : C.k}">${val.replace(/&/g, '&amp;').replace(/</g, '&lt;')}</text>`;
      });
      return {
        fond: fond(C.y),
        graphisme: rangs,
        textes: texte(ctx, x, 'titre', 'Titre', { ...SERIF, tMax: 96, tMin: 56, l, h: 200, maxLignes: 2 }, haut(220, G.m, C.k), { titre: true, requis: true, mots: false }),
        marque: masthead(pieceCommune(x), C.k) + mono('source', x.source, G.m, H - G.m + 30, C.k, { taille: 20 }),
      };
    } } },
  },
};
