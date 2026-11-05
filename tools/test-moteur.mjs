// Primestone · tests unitaires du moteur de gabarits (Node seul, sans navigateur). Usage : npm run test:moteur
import { pathToFileURL } from 'node:url';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { rendre, FAMILLES, KIOSQUE, FORMATS } = await import(pathToFileURL(join(ROOT, 'templates/_systeme/moteur.js')));
const { ajuster, largeur } = await import(pathToFileURL(join(ROOT, 'templates/_systeme/briques.js')));
const PH = (await import(pathToFileURL(join(ROOT, 'templates/_systeme/placeholders.js')))).default;
const res = []; const ok = (c, m) => { res.push(c); console.log(`  ${c ? 'ok' : 'KO'}  ${m}`); };
const imgs = (fam) => Object.fromEntries(fam.champs.filter((c) => c.type === 'image').map((c) => [c.id, { href: 'x.png', ...PH[c.placeholder], placeholder: true }]));

// Ajustement du texte
const f1 = ajuster("L'Espoir", { police: 'display', l: 560, h: 330, maxLignes: 2, tMax: 170, tMin: 72 });
ok(!f1.deborde && f1.taille === 170 && f1.lignes.length === 1, `titre court à la taille maximale (${f1.taille} px)`);
const f2 = ajuster('Anticonstitutionnellementissime', { police: 'display', l: 300, h: 100, maxLignes: 1, tMax: 170, tMin: 72 });
ok(f2.deborde, 'mot trop long : débordement signalé');
const f3 = ajuster('Sous-estimé ?', { police: 'display', l: 600, h: 300, maxLignes: 2, tMax: 150, tMin: 72 });
ok(f3.lignes.every((l) => !/^\S*\?$/.test(l) || l.includes(' ')) && f3.lignes.join(' ').includes(' ?'), 'espace insécable avant « ? » : la ponctuation ne passe pas seule à la ligne');
ok(Math.abs(largeur('AAAA', 'mono', 20) - 2 * largeur('AA', 'mono', 20)) < 1e-9, 'mesure cohérente (police à chasse fixe)');

// Rendu de tous les gabarits, dans les deux formats
let n = 0, bad = [];
for (const [coll, fmt] of [[FAMILLES, 'miniature'], [KIOSQUE, 'carrousel']]) for (const [id, fam] of Object.entries(coll)) for (const v of Object.keys(fam.variantes)) {
  const r = rendre(id, v, { ...imgs(fam), credit: 'Test' }); n++;
  const vb = r.svg.match(/viewBox="0 0 (\d+) (\d+)"/); const e = r.alertes.filter((a) => a.niveau !== 'info');
  if (+vb[1] !== FORMATS[fmt].w || +vb[2] !== FORMATS[fmt].h || e.length || !r.svg.includes('data-ps-statut="NON-OFFICIEL"')) bad.push(`${id}/${v} ${e.map((a) => a.message).join(';')}`);
}
ok(!bad.length, `${n} variantes : dimensions du format, aucune alerte avec les valeurs par défaut, marquage NON-OFFICIEL présent${bad.length ? ' · ' + bad.join(' | ') : ''}`);
// Alternance des formats sans fuite d'état entre deux rendus
const a = rendre('01-analyse-personnage', 'jaune', imgs(FAMILLES['01-analyse-personnage'])).svg; rendre('car-avis', 'standard', {}); const b = rendre('01-analyse-personnage', 'jaune', imgs(FAMILLES['01-analyse-personnage'])).svg;
ok(a === b && a.includes('viewBox="0 0 1280 720"'), 'rendu déterministe, aucun effet de bord entre formats');
// Contrôles
const z = rendre('03-actualites', 'bandeau-noir', { ...imgs(FAMILLES['03-actualites']), titre: 'Un titre bien trop long pour le bandeau de cette miniature' });
ok(z.alertes.some((x) => /mots/.test(x.message)) && z.alertes.some((x) => x.niveau === 'erreur' || /capitales/.test(x.message)), 'titre trop long : alertes mots et débordement ou lisibilité');
ok(!rendre('car-recit', 'standard', {}).alertes.some((x) => /durée YouTube/.test(x.message)), 'Kiosque : pas de contrôle de zone de durée YouTube');
const x = rendre('01-analyse-personnage', 'jaune', { ...imgs(FAMILLES['01-analyse-personnage']), titre: '<b>&"' }).svg;
ok(x.includes('&lt;B&gt;&amp;&quot;') && !x.includes('<B>'), 'texte saisi échappé (XML valide, aucune injection)');
const sans = rendre('01-analyse-personnage', 'jaune', {});
ok(sans.alertes.some((x) => x.niveau === 'erreur' && x.champ === 'personnage'), 'image obligatoire absente : erreur');

const ko = res.filter((c) => !c).length;
console.log(ko ? `\n${ko} test(s) en échec sur ${res.length}.` : `\n${res.length} tests du moteur réussis.`);
process.exit(ko ? 1 : 0);
