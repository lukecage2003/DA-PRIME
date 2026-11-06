# Primestone Brand & Brand Library

Dépôt de l'identité visuelle de **Primestone Media** : système graphique, design tokens, logos, polices, éléments, Brand Book et bibliothèque numérique centralisée. Formats ouverts uniquement : SVG, PNG, JSON, CSS.

Direction artistique de référence : **Signal** (YouTube, accroches, communication) + **Kiosque** (éditorial, dossiers, carrousels, infographies, bibliothèque). Direction sombre et cinématographique en usage secondaire.

## État : studio créatif éditorial (accueil, Script Studio, Production, Atelier, Motion Studio) · version 0.10.0 provisoire

| Élément | Emplacement | Statut |
|---|---|---|
| Fichiers d'origine (intacts, empreintes SHA-256) | `brand/00_originaux/` | référence |
| Vectorisation du logo, comparaison mesurée | `brand/01_logo/NON-OFFICIEL/` | **non officiel**, en attente de validation |
| Design tokens DTCG + exports CSS et JSON | `brand/02_tokens/` | provisoire (jaune de marque non validé) |
| Polices OFL (statiques pour le bureau, variables pour le web) | `brand/03_fonts/` | provisoire |
| Éléments graphiques SVG + PNG 1x/2x | `brand/04_elements/` | provisoire (sceau P : non officiel) |
| Comparaison du jaune proposé aux jaunes d'origine | `docs/COULEUR_JAUNE.md` | à valider |
| Gabarits SVG des miniatures : 11 familles, 25 variantes, exemples, planche 168 px | `templates/` | provisoire (sceau non officiel) |
| Gabarits SVG Kiosque 4:5 : 6 diapositives de carrousel, fiche personnage (8 variantes) | `templates/kiosque/` | provisoire (logo non officiel) |
| Infographies 16:9 pilotées par JSON : chronologie, barres ; validation et schéma | `templates/infographies/`, `data/infographies/`, `schemas/` | provisoire |
| Atelier : 3 supports, saisie, recadrage, données JSON, contrôles, exports PNG/JPG/SVG, partage, sauvegarde automatique | `atelier/` | prototype |
| Motion Studio : composition libre (texte, image, forme, effet, groupe), typographie avancée, 21 effets, 6 systèmes graphiques, animation par calque, plans et transitions, modèles signature, séquenceur, caméra, 12 formats et personnalisé, exports PNG/JPG/SVG/GIF/WebM/MP4, bibliothèque, versions, projets et polices locales | `atelier/motion/`, `templates/_systeme/studio*.js`, `templates/_systeme/motion*.js` | version stable, provisoire |
| Production éditoriale : assistant local (27 types de contenus), compositeur multiformat, campagnes et calendrier, statuts de validation, production et export par lot (ZIP), profils de direction artistique mesurés, bibliothèque centralisée | `atelier/production/`, `templates/_systeme/studio-assistant.js`, `studio-compositeur.js`, `studio-personnages.js` | prototype fonctionnel |
| Bibliothèque visuelle : import multiple, catégories, tags, collections, favoris, fiches de personnages (7 rôles d'image), comparaison de 4 traitements × 3 formats, réutilisation dans l'Atelier et Motion Studio | `atelier/production/` (onglet Visuels), `atelier/motion/visuels.js` | prototype fonctionnel |
| Script Studio : projets éditoriaux, architecte éditorial, plan narratif selon la durée, éditeur, analyse critique, adaptations, comics (CBZ, ZIP, PDF), cases, transcription, analyse par numéro, Prompt Studio, exports de montage | `atelier/script/`, `templates/_systeme/script-*.js`, `docs/SCRIPT_STUDIO.md` | fonctionnel (OCR et vision non installés) |
| Catalogue `brand-manifest.json` + schéma | `catalog/`, `schemas/` | généré |
| Schéma Supabase | `supabase/` | **brouillon non appliqué** |
| Présentations des missions 01 et 02 | `presentations/` | archive |

## Arborescence

```
brand/
  00_originaux/      bitmaps fournis, jamais modifiés (CHECKSUMS.sha256)
  01_logo/           NON-OFFICIEL/ : SVG jaune, noir, blanc + PNG + _reference/ (mesures)
  02_tokens/         tokens.json (source unique) · build/ (généré)
  03_fonts/          TTF statiques · _variable/ · licences OFL · fonts.json
  04_elements/       svg/ · png/  (incision, filet, volet, sceau, cadres, trame, rubriques, grilles)
  99_tests/          substitution/ (PLACEHOLDER_*, images générées) · client/ (vos illustrations, ignoré par Git)
templates/
  _systeme/          moteur de gabarits (partagé avec l'Atelier)
  miniatures/        11 familles : SVG, exemples, planche, catalogue.json
  kiosque/           carrousels et fiche personnage 4:5
  infographies/      chronologie et barres 16:9
data/infographies/   données JSON des infographies (une création par fichier)
atelier/             application web de saisie (PWA hors ligne)
catalog/             catalog.config.json (règles) · brand-manifest.json (généré)
schemas/             brand-manifest.schema.json · infographie.schema.json (généré)
supabase/            migrations/ (brouillon)
tools/               générateurs et contrôles
docs/                architecture, conventions, logo, couleur jaune, gabarits, infographies, Atelier, Motion Studio, Production
presentations/       planches des missions 01 et 02
```

## Commandes

Prérequis : Node 20+ (`npm ci` installe Playwright pour les rendus PNG), Python 3.11+ (`pip install -r requirements.txt`).

```bash
npm run build          # tokens -> éléments -> gabarits et exemples -> manifeste
npm run atelier        # Atelier sur http://localhost:4173/atelier/
npm run atelier:reseau # Atelier accessible depuis le téléphone (même Wi-Fi)
npm test               # tests du moteur, de l'Atelier et de Motion Studio (Chromium, appareils émulés)
npm run test:motion    # Motion Studio seul (moteur dans Node, puis interface dans Chromium)
npm run build:webfonts # polices web et métriques (si les polices changent)
npm run build:logo     # re-vectorise le logo et refait la comparaison (≈ 1 min)
npm run build:yellow   # recalcule la comparaison des jaunes
npm run check          # contrôles obligatoires avant chaque commit
```

`npm run check` vérifie : originaux intacts, conformité du manifeste à son schéma et aux fichiers présents (taille, SHA-256, dimensions), SVG et PNG valides, polices et licences, marquages NON-OFFICIEL et PLACEHOLDER, exports de tokens à jour, documentation, absence de fichiers lourds ou d'illustrations sous droits dans Git.

## Règles

- Le logo d'origine n'est jamais modifié ni remplacé. Toute vectorisation reste marquée `NON-OFFICIEL` jusqu'à validation écrite.
- Git versionne le code et les ressources légères (< 5 Mo par fichier). Les fichiers lourds iront dans Supabase Storage (lot 6, après accord).
- Aucun livrable ni script propriétaire Adobe : le système repose sur des formats ouverts.
- Les illustrations des éditeurs ne deviennent jamais des ressources officielles.
- Rien n'est déployé, acheté ou rendu public sans accord.

Voir `docs/` pour le détail et `CHANGELOG.md` pour l'historique.

## Publication sur GitHub Pages (préparée, non activée)

- Page d'accueil : `index.html` à la racine (présentation, accès aux deux outils, exemples) ; ses visuels Motion Studio sont rendus par le moteur (`node tools/gen-accueil.mjs`, dossier `accueil/`). Illustrations de démonstration : `node tools/gen-placeholders.mjs`.
- `npm run build:pages` construit `_site/` (non versionné) : uniquement les fichiers chargés par l'Atelier et Motion Studio, d'après `atelier/precache.json` (application, moteur, polices web, sceau P non officiel, images PLACEHOLDER), plus la page d'accueil et ses visuels. Ni originaux de marque, ni Supabase, ni outils, ni données ; le script refuse tout fichier hors de cette liste et tout motif de secret.
- `.github/workflows/pages.yml` vérifie le dépôt (`npm run check`, `npm test`), construit `_site/` et le publie. Déclenchement **manuel uniquement** (Actions > « Publier sur GitHub Pages » > Run workflow).
- Le site est entièrement statique, en chemins relatifs : il fonctionne à la racine d'un domaine comme sous `https://<compte>.github.io/<dépôt>/`, avec le mode hors ligne (HTTPS fourni par Pages).
- Les créations, illustrations importées, polices et projets restent dans le navigateur de chaque visiteur (IndexedDB) ou dans les fichiers qu'il télécharge : l'application n'envoie aucune donnée et ne fait aucune requête externe.
- Activation (par le propriétaire du dépôt, après accord) : 1) fusionner ce travail dans la branche par défaut du dépôt (`ccr-1edc037c-4ye7hs` à ce jour ; l'environnement `github-pages` n'accepte par défaut que celle-ci, et le workflow n'apparaît dans l'onglet Actions qu'une fois présent sur cette branche) ; 2) Settings > Pages > Build and deployment > Source : **GitHub Actions** ; 3) Actions > « Publier sur GitHub Pages » > Run workflow. Adresse attendue : `https://lukecage2003.github.io/DA-PRIME/` (sensible à la casse).
