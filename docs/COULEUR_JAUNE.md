# Jaune de marque : comparaison

**Statut : proposition non validée.** `#FFE500` reste une proposition. Les trois jaunes relevés dans les fichiers d'origine sont conservés comme références (`color.original.*` dans `tokens.json`) ; aucun n'est remplacé.

Mesures recalculables par `npm run build:yellow` (`tools/compare_yellow.py`, données : `docs/assets/comparaison-jaunes.json`, planche : `docs/assets/comparaison-jaunes.svg`).

| Fichier d'origine | Jaune dominant | ΔE2000 vs #FFE500 | Contraste sur #000000 | Contraste sur #111111 |
|---|---|---|---|---|
| Miniature « L'Espoir » | `#FFE500` | 0,00 | 16,46 : 1 | 14,80 : 1 |
| Logotype | `#FFF503` | 4,58 | 18,31 : 1 | 16,47 : 1 |
| Icône P | `#E0DE06` | 6,01 | 14,62 : 1 | 13,15 : 1 |

Lecture du ΔE2000 : en dessous de 1, l'écart est imperceptible ; de 2 à 10, il se voit d'un coup d'œil. Les trois jaunes d'origine sont donc **visiblement différents entre eux** : le logotype est plus citron, l'icône tire vers l'olive. Tous dépassent largement le contraste de 7 : 1 (niveau AAA) sur noir.

## Options à arbitrer

1. **`#FFE500`** (proposition) : jaune de la miniature, le plus chaud, le plus proche d'un jaune d'imprimerie.
2. **`#FFF503`** : jaune du logotype, le plus lumineux sur noir ; plus froid à côté des illustrations.
3. Un autre jaune, choisi par vous ou par le créateur du logo.

Dans tous les cas, l'icône (`#E0DE06`) devrait être alignée sur le jaune retenu. Changer de jaune ne demande qu'une ligne dans `tokens.json` (`color.brand.yellow`) puis `npm run build`.
