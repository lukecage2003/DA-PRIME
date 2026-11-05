# Vectorisation provisoire du logo

**Statut : NON OFFICIELLE.** Cette vectorisation sert uniquement à produire les ressources des lots suivants. Elle ne remplace pas le logo d'origine et ne doit pas être diffusée comme logo officiel avant validation écrite.

## Sources

| Fichier d'origine (intact) | Zone tracée | Hauteur des lettres à la source |
|---|---|---|
| `PS_LOGO_logotype-slogan_original.png` (2560 × 1440) | logotype seul, sans le slogan | ≈ 151 px |
| `PS_LOGO_icone-P_original.png` (320 × 320) | lettre P | ≈ 164 px |

Le slogan « Au-delà des héros. » est un texte en Open Sans : il n'est pas vectorisé et ne fait pas partie du logo.

## Méthode (`tools/vectorize_logo.py`)

1. Masque extrait des pixels jaunes (canal vert, pixels dont le bleu reste faible), sans toucher aux originaux.
2. Suréchantillonnage bicubique (×8 pour le logotype, ×16 pour le P) pour lisser l'anticrénelage.
3. Tracé Potrace : `alphamax 0.75` (angles conservés), `opticurve`, `opttolerance 0.15`, `turdsize 4`.
4. Coordonnées ramenées à l'échelle d'origine : 1 unité SVG = 1 pixel source.
5. Trois couleurs : jaune `#FFE500`, noir `#111111`, blanc. Seule la couleur change entre les variantes, jamais la géométrie.

## Comparaison à l'original (`tools/compare_logo.py`)

Le SVG est rendu par Chromium puis comparé pixel à pixel au masque de l'original.

| | Recouvrement (IoU) ×1 | Pixels divergents ×1 | IoU ×4 | Pixels divergents ×4 |
|---|---|---|---|---|
| Logotype | 0,99962 | 0,030 % | 0,99804 | 0,154 % |
| Icône P | 0,99980 | 0,014 % | 0,99847 | 0,102 % |

Les écarts se situent sur les bords, à moins d'un pixel source. Planches de contrôle dans `brand/01_logo/NON-OFFICIEL/_reference/` (`*_diff-x4.png` : rouge = original seul, bleu = vecteur seul).

## Limites

- La source est petite : les incisions mesurent environ 2 px de large. Les courbes sont fidèles à la source, pas forcément au dessin d'origine du créateur du logo.
- Les rayons des coins et la largeur exacte des incisions ne peuvent pas être connus au-delà de la résolution source.
- La couleur `#FFE500` est la valeur proposée ; les jaunes d'origine (`#FFF503`, `#E0DE06`) sont archivés dans les tokens `color.legacy`.

## Pour valider ou remplacer

- **Validation** : examiner les planches `_diff-x4.png` et les SVG ; une validation écrite fera passer les fichiers en `officiel` (renommage sans le suffixe, version 1.0.0).
- **Fichiers vectoriels d'origine retrouvés** : ils remplacent intégralement cette vectorisation ; les ressources dérivées (sceau P, exports) seront régénérées par `npm run build`.
