# Primestone Brand & Brand Library

Dépôt de l'identité visuelle de **Primestone Media** : système graphique, design tokens, logos, polices, éléments, Brand Book et bibliothèque numérique centralisée. Formats ouverts uniquement : SVG, PNG, JSON, CSS.

> **Primestone Studio est un dépôt séparé.** Ce dépôt ne contient, ne modifie et ne remplace aucun fichier de Studio. Studio pourra lire les ressources publiées ici via un contrat documenté (`docs/STUDIO_INTEGRATION.md`), sans en dépendre.

Direction artistique de référence : **Signal** (YouTube, accroches, communication) + **Kiosque** (éditorial, dossiers, carrousels, infographies, bibliothèque). Direction sombre et cinématographique en usage secondaire.

## État : lot 1 (fondations) · version 0.1.0 provisoire

| Élément | Emplacement | Statut |
|---|---|---|
| Fichiers d'origine (intacts, empreintes SHA-256) | `brand/00_originaux/` | référence |
| Vectorisation du logo, comparaison mesurée | `brand/01_logo/NON-OFFICIEL/` | **non officiel**, en attente de validation |
| Design tokens DTCG + exports CSS et JSON | `brand/02_tokens/` | provisoire (jaune de marque non validé) |
| Polices OFL (statiques pour le bureau, variables pour le web) | `brand/03_fonts/` | provisoire |
| Éléments graphiques SVG + PNG 1x/2x | `brand/04_elements/` | provisoire (sceau P : non officiel) |
| Comparaison du jaune proposé aux jaunes d'origine | `docs/COULEUR_JAUNE.md` | à valider |
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
catalog/             catalog.config.json (règles) · brand-manifest.json (généré)
schemas/             brand-manifest.schema.json
supabase/            migrations/ (brouillon)
tools/               générateurs et contrôles
docs/                architecture, conventions, logo, couleur jaune, intégration Studio
presentations/       planches des missions 01 et 02
```

## Commandes

Prérequis : Node 20+ (`npm ci` installe Playwright pour les rendus PNG), Python 3.11+ (`pip install -r requirements.txt`).

```bash
npm run build          # tokens -> éléments SVG/PNG -> manifeste
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
