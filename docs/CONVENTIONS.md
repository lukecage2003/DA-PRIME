# Conventions

## Nommage des fichiers

`PS_<TYPE>_<nom>[_<variante>][_<taille>px][_NON-OFFICIEL][@2x].<ext>`

| TYPE | Contenu | Exemple |
|---|---|---|
| `LOGO` | logotype, icône | `PS_LOGO_logotype_jaune_960px_NON-OFFICIEL.png` |
| `EL` | élément graphique | `PS_EL_rubrique-actu@2x.png` |
| `GRID` | grille de construction | `PS_GRID_miniature-1280x720.svg` |
| `MIN` | miniature YouTube | `PS_MIN_01-analyse-personnage_v1.0.svg` (lot 2) |
| `CAR`, `FICHE` | supports Kiosque 4:5 | `PS_CAR_car-recit_standard_NON-OFFICIEL.svg` (lot 3) |
| `INFO` | infographies | à définir |
| `CLIP` | habillage vidéo rendu (WebM) | lot ultérieur |

Minuscules, mots séparés par des tirets, sans accents ni espaces. Variantes de couleur : `jaune`, `noir`, `blanc`.
Les polices gardent les noms de leur fonderie (`Anton-Regular.ttf`).

## Identifiants du catalogue

L'identifiant d'une ressource est le nom sans préfixe `PS_`, sans extension, taille ni `@2x`, en minuscules (`el-rubrique-actu`). Tous les fichiers qui partagent cet identifiant (SVG, PNG 1x, PNG 2x) forment une même ressource.

## Statuts

| Statut | Signification |
|---|---|
| `officiel` | validé par Primestone, utilisable partout |
| `provisoire` | utilisable en production interne, peut évoluer |
| `non-officiel` | ne pas diffuser comme ressource officielle |
| `reference` | fichier d'origine conservé intact |

Un fichier ne passe en `officiel` que par une décision écrite, consignée dans `CHANGELOG.md`.

## Versions

Versionnement sémantique sur l'ensemble de la bibliothèque (`catalog/catalog.config.json > release.version`) :
- **correctif** (0.1.1) : export refait, coquille, sans changement visuel ;
- **mineure** (0.2.0) : ressource ajoutée, ou ressource modifiée de façon compatible ;
- **majeure** (1.0.0) : première version officielle, puis tout changement qui casse un usage (renommage, suppression, nouvelle géométrie).

Les gabarits portent aussi leur version dans le nom (`_v1.0`).

## Tokens

`brand/02_tokens/tokens.json` est la seule source. Les exports de `build/` (CSS, JSON) sont régénérés par `npm run build:tokens` et ne s'éditent jamais à la main.

## Avant chaque commit

```bash
npm run build && npm run check
```
