# Banc Comic Vision (DA-PRIME 0.11.2)

Kit **local** pour comparer des modèles de vision sur VOS pages de comics, avant toute intégration d'un moteur dans DA-PRIME. Rien ici n'est publié avec l'atelier (le dossier `tools/` n'est pas copié par `build-pages`).

Règles :
- Les pages, l'OCR, les annotations et les résultats restent dans un dossier **hors du dépôt** : `preparer-entrees.mjs` refuse un corpus situé dans le dépôt.
- Les poids des modèles (`*.gguf`) ne sont jamais versionnés (`.gitignore`).
- Le modèle de vision interroge uniquement un `llama-server` local (127.0.0.1). Aucune API ni aucun service distant.

## Séparation des rôles

| Étape | Outil | Classes produites |
|---|---|---|
| Lire le texte | Tesseract (OCR DA-PRIME 0.11.1, réglages par défaut) | lu |
| Observer l'image | modèle de vision (llama.cpp), sortie JSON contrainte par `schemas/sortie-vision.schema.json` | visible, interprété, déduit, incertain |
| Rapprocher | code déterministe (blocs OCR référencés par identifiant `O…`, zones ramenées à la page) | — |
| Interpréter le récit | approche C (synthèse texte seul), puis le moteur narratif | interprété, déduit |

Le modèle de vision ne cite ni ne réécrit jamais le texte : il renvoie aux blocs OCR par leur identifiant. Il ne nomme un personnage que si un bloc OCR contient le nom.

## Chaîne de travail

1. `node tools/banc-vision/outils/preparer-entrees.mjs --corpus <dossier>` : OCR réel des pages (`pages/*.png`) et cases. Avec `--cases-brouillon`, les cases viennent des brouillons d'annotation.
2. `node tools/banc-vision/outils/squelettes-annotation.mjs --corpus <dossier> --role reglage|controle` : squelettes d'annotation, à compléter selon `ANNOTATION.md`.
3. Lancer `llama-server`. Sous Windows : `scripts/windows/lancer-serveur.ps1`, puis `fumee-vision.ps1` pour vérifier que le modèle voit l'image.
4. `node tools/banc-vision/outils/executer-banc.mjs --corpus <dossier> --sortie <dossier> --etiquette <modèle-quant-config>`. Approches A (page entière), B (case par case, case en pleine résolution et vignette de la page) et C (synthèse). La reprise est automatique ; Ctrl+C ne perd rien.
5. `node tools/banc-vision/outils/noter.mjs --corpus <dossier> --resultats <dossier> --etiquette <e>` :
   - contrôles automatiques (citation absente de l'OCR, nom non justifié, bulle inexistante ou hors de sa case, élément interdit) ;
   - comparaison géométrique à l'annotation ;
   - fiche CSV de jugement humain (`exact`, `partiel`, `faux`, `invente`, `non_verifiable`).

   `--reference-provisoire` note par rapport aux brouillons **non validés** ; le rapport l'indique en tête.

## Références

Une annotation ne sert de référence qu'une fois signée (`valide_par`). Les brouillons, qu'ils soient produits à la main ou proposés par un assistant, ne sont jamais une vérité terrain. Les pages de réglage et de contrôle sont rapportées séparément. Les invites et les paramètres ne se règlent que sur le réglage.

## Test

`npm run test:banc-vision` : page synthétique et faux serveur. Il vérifie la mécanique seulement, sans aucune mesure de qualité.
