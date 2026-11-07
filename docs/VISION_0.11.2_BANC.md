# DA-PRIME 0.11.2 — Banc Comic Vision : protocole et premières mesures

Suite de `docs/VISION_0.11.2_AUDIT.md`. Le kit se trouve dans `tools/banc-vision/` (mode d'emploi : `tools/banc-vision/README.md`). **Aucun moteur de vision n'est intégré à l'atelier.** Les pages, l'OCR, les annotations et les résultats restent hors du dépôt.

## 1. Statut des informations

- **mesuré** : exécuté réellement, avec la machine indiquée ;
- **vérifié** : lu dans le code, sur la fiche officielle ou par l'API de Hugging Face ;
- **estimé** : calcul théorique ;
- **non validé** : annotation proposée, pas encore relue par un humain.

## 2. Tailles et licences des fichiers (vérifiées le 2026-11-07, API publique de Hugging Face)

| Modèle | Dépôt (révision) | Fichier | Octets |
|---|---|---|---|
| Qwen3-VL-8B-Instruct | Qwen/Qwen3-VL-8B-Instruct-GGUF (f982a07) | Q4_K_M | 5 027 784 800 |
| | | Q8_0 | 8 709 519 456 |
| | | projecteur F16 | 1 159 029 824 |
| Qwen3-VL-30B-A3B-Instruct | unsloth (0af19e7) ; pas de 3 bits chez Qwen | UD-IQ3_XXS | 12 888 086 240 |
| | | projecteur F16 | 1 083 500 224 |
| InternVL3-14B-Instruct | ggml-org (9cb30b2) | Q4_K_M | 8 985 340 608 |
| | | projecteur f16 | 705 336 640 |
| Qwen3.5-9B | unsloth (3885219) | Q4_K_M | 5 680 522 464 |
| | | Q8_0 | 9 527 502 048 |
| | | projecteur F16 | 918 166 080 |
| MiniCPM-V 4.7 35B-A3B | openbmb (cf943fb) | plus petit : Q4_0 | 19 714 550 688 |
| Gemma 4 26B-A4B | unsloth (c099eb4) | UD-IQ3_XXS | 11 416 548 832 |

Licences des poids (métadonnées des fiches) : toutes déclarées Apache-2.0. Points d'attention :
- **Qwen3.5-9B** : fichier LICENSE présent, Apache-2.0 vérifiée.
- **Qwen3-VL** : pas de fichier LICENSE dans les dépôts ; seule la métadonnée de la fiche l'indique.
- **InternVL3-14B** : la fiche est incohérente. Elle déclare Apache-2.0, mais nomme une licence « qwen » avec un lien vers la licence de Qwen2.5-72B ; le texte de la fiche parle de MIT pour le projet et d'Apache-2.0 pour Qwen2.5. C'est à clarifier avant toute distribution ; aucune gêne pour un usage local.

Les tailles et les empreintes SHA256 complètes sont dans `tools/banc-vision/configs/candidats.json`.

Conséquences pour 16 Go de RAM et 4 Go de VRAM (estimé) :
- **MiniCPM-V 4.7** : écarté. Il n'en existe aucune version de moins de 19,7 Go.
- **Qwen3-VL-30B-A3B** : en 3 bits, 12,9 Go plus 1,1 Go de projecteur. Il ne tient pas sans pagination.
- **Qwen3-VL-8B** reste le seul candidat de qualité qui tient avec une marge.

## 3. Premiers constats mesurés

Machine des mesures : conteneur Linux, 4 cœurs Xeon à 2,1 GHz (AVX-512), 15 Go de RAM, **sans GPU**. Ce n'est **pas** la machine cible (i5-11300H, RTX 3050 4 Go). Les durées ne sont donc pas transposables telles quelles. Les sorties des modèles, elles, ne dépendent pas du matériel pour des poids identiques à température 0, aux petites différences numériques près.

Runtime : llama.cpp, commit ca89968 (2026-11-06), compilé pour CPU.

Premiers constats, au réglage :
- **Test de fumée de la vision (Q4_K_M)** : réussi (« Red square on white background »).
- **Mémoire** : pendant l'encodage d'une image de 2 560 jetons sur CPU, le serveur occupe jusqu'à **12,3 Go de RAM** (mesure de VmRSS). Sur une machine de 16 Go, c'est la contrainte principale. Sur la machine cible, le projecteur doit aller sur le GPU, sinon le budget d'image doit baisser.
- **Vitesse** : lecture de l'entrée à 9 jetons/s (4 129 jetons, image comprise, en 460 s) ; génération à 2,2 jetons/s avec un long contexte.
- **Premier essai, approche A sur une couverture (protocole v1)** : le modèle a pris des lettres du titre et des noms d'auteurs pour des personnages, puis a énuméré des objets « texte » jusqu'à la limite de sortie. Le JSON tronqué était invalide. D'où le **schéma v2** : listes plafonnées et limite de sortie de 4 096 jetons. Ce changement a été décidé sur le corpus de réglage uniquement.
- **Correction du kit** : `fetch` de Node abandonnait les requêtes de plus de 300 s. L'exécutant utilise désormais `node:http`, sans délai maximal. Une requête en échec n'est plus enregistrée : elle est retentée à la relance.

## 4. Résultats mesurés au réglage (Qwen3-VL-8B-Instruct, 2 pages)

Pages : Immortal Hulk #1 p5 (6 cases, cases C1–C3 en approche B) et la couverture d'Immortal Hulk #3. Budget d'image : 2 560 jetons ; température 0 ; graine 42 ; invites v1 ; schéma de sortie v2 ; synthèse C en sous-schéma v3.

**Référence provisoire : brouillons d'annotation NON validés.** Tous les taux de cette section sont indicatifs. Ils deviennent définitifs seulement après relecture et signature des annotations.

### 4.1 Durées et mémoire (conteneur CPU, mesuré)

| Requête | Q4_K_M | Q8_0 |
|---|---|---|
| A, page de 6 cases (7 005 jetons d'entrée) | 2 873 s ; entrée 8,4 j/s ; sortie 2,0 j/s | non exécutée (voir 4.3) |
| A, couverture | 2 053 s, JSON tronqué à 4 096 jetons | non exécutée |
| B, une case (≈ 2 400–2 800 jetons d'entrée) | 468 / 631 / 617 s | 458 / 617 / 645 s |
| B, couverture (une case) | 941 s | 1 209 s |
| C v2 (schéma complet), page de 6 cases | 2 790 s, JSON tronqué | — |
| C v3 (sous-schéma) | 1 507 s (page) ; 381 s (couverture) ; JSON valide | — |
| RAM disponible minimale (sur 15,7 Go) | 3,9 Go | 2,2 Go |

- **Vitesse de sortie :** Q8_0 n'est pas plus lent que Q4_K_M en approche B (2,8–3,6 j/s contre 2,6–3,3 j/s). Sur ce CPU, la durée dépend surtout de la lecture de l'image.
- **Mémoire du serveur :** la RSS du serveur atteint environ 13,4 Go, projections des fichiers de poids comprises. La mesure qui compte est la RAM disponible minimale.

### 4.2 Qualité (comparée aux brouillons non validés)

| Mesure | A (Q4) | B (Q4) | B (Q8) |
|---|---|---|---|
| JSON valide | 1 sur 2 | 4 sur 4 | 4 sur 4 |
| Personnages localisés : rappel / précision | 55,6 % / 55,6 % | 87,5 % / 33,3 % | 87,5 % / 33,3 % |
| Bulles déclarées sur un vrai texte de bulle | 5 sur 5 | 1 sur 19 | 1 sur 24 |

Constats :
- **Q8_0 décrit mieux que Q4_K_M**, à requêtes identiques.
  - Il voit une casquette et un magazine ; Q4 voit un casque et un livre. Le brouillon indique casquette et journal.
  - Il voit le haut rose et la bouteille tenue en C3.
  - Q4 ne relève pas la bouteille.
- **Couverture : échec des deux quantifications.** Le modèle déclare 15 « personnages » vides, posés sur les lettres du titre et des crédits. C'est la limite de la liste. Il faut traiter les couvertures autrement : nature de page connue, puis description globale sans liste de personnages.
- **Bulles : principale hallucination.** L'OCR de ces pages contient beaucoup de fragments parasites : 66 blocs sur IH1-p5, dont une dizaine de vrais textes. En approche B, le modèle présente presque tous les blocs de la case comme des bulles et leur attribue un locuteur. L'approche A, qui voit la page entière, n'en déclare que 5, toutes justes. **Le filtrage des blocs par nature avant la vision est nécessaire.** C'est la nature des textes de la 0.11.1, ou un seuil de confiance OCR.
- **Recopie d'une case à l'autre :** l'état des cases précédentes est transmis au modèle, qui reprend alors la même description et manque les changements de posture (main au menton, passage derrière le comptoir).
- **Approche A sur une page dense :** la sortie atteint presque la limite. Les zones des personnages reprennent celles des cases, et plan et angle sont identiques partout.
- **Synthèse C v3 :** elle cite le texte de l'OCR entre apostrophes, ce que les invites interdisent (2 alertes `citation_ocr_reproduite`). Elle reprend aussi les bulles parasites de B. Aucune identité n'est inventée.

### 4.3 Contrôle : Secret Wars #1 p15, Q8_0, cases C1–C3 puis synthèse C (mesuré)

Page jamais utilisée pour régler quoi que ce soit. Référence : brouillon **non validé**.

| Mesure | Valeur |
|---|---|
| Durée B par case | 610 / 234 / 498 s |
| Durée C (sous-schéma v3) | 783 s |
| JSON valide | 4 sur 4 |
| Personnages localisés : rappel / précision | 57,1 % / 57,1 % |
| Bulles déclarées sur un vrai texte de bulle | 9 sur 19 (47,4 %) |
| Locuteurs des bulles à locuteur certain | 5 sur 5 |
| Alertes | `citation_ocr_reproduite` 2 ; `element_interdit_present` 2 |

Constats :
- **Alertes « élément interdit » :** les deux portent sur le mot « combat » de « tenue de combat ». Ce sont probablement des faux positifs, car le terme interdit visait une scène de combat. Un humain doit trancher.
- **Identité proposée :** un nom tiré d'un bloc OCR de la case. Le contrôle automatique la tient pour justifiée ; sa justesse reste à juger.
- **Synthèse C :** elle traite PA de C1, C2 et C3 comme un seul personnage, alors que les identifiants sont propres à chaque case et que les descriptions diffèrent. C'est une continuité inventée.
- **Personnages vides en C1 :** trois personnages y sont déclarés sans aucune description.
- **Comparaison avec le réglage :** les bulles sont meilleures, avec moins de bruit d'OCR sur cette page, mais il s'agit d'une seule page.

### 4.4 Écarts au protocole et limites

- **Volume :** 3 pages, 12 requêtes de vision au total. Rien ne peut être tenu pour définitif, ni la comparaison Q4/Q8, ni celle des approches, ni le contrôle.
- **Q8_0 limité à l'approche B :** A était tronquée ou dégénérée en Q4 et prenait environ 45 min par page.
- **JSON indenté :** la grammaire générée par llama.cpp autorise les retours à la ligne et l'indentation, d'où environ 25 % de jetons de sortie en plus (estimé). Une grammaire GBNF compacte est à écrire avant l'intégration.
- **Pas de Windows, pas de GPU :** aucune mesure de VRAM, aucun déport GPU, scripts PowerShell non exécutés.
- **Interruptions :** un redémarrage du conteneur a interrompu une requête, relancée ensuite. Aucun résultat partiel n'a été conservé.

Les résultats comparatifs (Q4_K_M contre Q8_0, approche A contre B, contrôle) figurent dans le rapport de phase. Ils sont notés par rapport à des annotations **non validées**. Ils sont donc indicatifs tant que l'utilisateur ne les a pas relues et signées.
