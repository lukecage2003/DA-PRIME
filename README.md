# Primestone Brand & Brand Library

Dépôt de l'identité visuelle de **Primestone Media** : système graphique, design tokens, logos, polices, éléments, Brand Book et bibliothèque numérique centralisée. Formats ouverts uniquement : SVG, PNG, JSON, CSS.

Direction artistique de référence : **Signal** (YouTube, accroches, communication) + **Kiosque** (éditorial, dossiers, carrousels, infographies, bibliothèque). Direction sombre et cinématographique en usage secondaire.

## État : lot 4 (Motion Studio dans l'Atelier) · version 0.5.0 provisoire

| Élément | Emplacement | Statut |
|---|---|---|
| Fichiers d'origine (intacts, empreintes SHA-256) | `brand/00_originaux/` | référence |
| Vectorisation du logo, comparaison mesurée | `brand/01_logo/NON-OFFICIEL/` | **non officiel**, en attente de validation |
| Design tokens DTCG + exports CSS et JSON | `brand/02_tokens/` | provisoire (jaune de marque non validé) |
| Polices OFL (statiques pour le bureau, variables pour le web) | `brand/03_fonts/` | provisoire |
| Éléments graphiques SVG + PNG 1x/2x | `brand/04_elements/` | provisoire (sceau P : non officiel) |
| Comparaison du jaune proposé aux jaunes d'origine | `docs/COULEUR_JAUNE.md` | à valider |
| Gabarits SVG des miniatures : 8 familles, 19 variantes, exemples, planche 168 px | `templates/` | provisoire (sceau non officiel) |
| Gabarits SVG Kiosque 4:5 : 6 diapositives de carrousel, fiche personnage (8 variantes) | `templates/kiosque/` | provisoire (logo non officiel) |
| Infographies 16:9 pilotées par JSON : chronologie, barres ; validation et schéma | `templates/infographies/`, `data/infographies/`, `schemas/` | provisoire |
| Atelier : 3 supports, saisie, recadrage, données JSON, contrôles, exports PNG/JPG/SVG, partage, sauvegarde automatique | `atelier/` | prototype |
| Motion Studio : 8 familles de créations animées, 6 directions visuelles, calques, effets comics, 8 presets d'animation, exports PNG/JPG/SVG/MP4 ou WebM/GIF, créations enregistrées sur l'appareil | `atelier/motion/`, `templates/_systeme/motion*.js` | MVP |
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
  miniatures/        8 familles : SVG, exemples, planche, catalogue.json
  kiosque/           carrousels et fiche personnage 4:5
  infographies/      chronologie et barres 16:9
data/infographies/   données JSON des infographies (une création par fichier)
atelier/             application web de saisie (PWA hors ligne)
catalog/             catalog.config.json (règles) · brand-manifest.json (généré)
schemas/             brand-manifest.schema.json · infographie.schema.json (généré)
supabase/            migrations/ (brouillon)
tools/               générateurs et contrôles
docs/                architecture, conventions, logo, couleur jaune, gabarits, infographies, Atelier, Motion Studio
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
