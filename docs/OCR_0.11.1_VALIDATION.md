# DA-PRIME 0.11.1 — Rapport de validation de l'OCR local (anglais)

Établi le 2026-11-06, **mis à jour après l'itération 2** (§8 : texte clair sur fond coloré). Moteur : Tesseract.js 7.0.0, modèle anglais *fast* (tessdata_fast 4.1.0), dans le navigateur (Chromium, Linux). **Seul l'anglais est validé sur des comics réels.** Le français est chargé et fonctionne techniquement, mais sa précision n'est pas validée (aucun comic français disponible).

## 1. Vérification fonctionnelle (interface réelle, données relues après chaque étape)
Comic réel jamais utilisé auparavant : *New Avengers* (2013) #2, PDF de 28 pages, importé par le bouton de l'application.

| Fonction | Résultat |
|---|---|
| OCR d'une page complète | 42 blocs « à vérifier » en 6 à 7 s, coordonnées dans la page, provenance complète (langue, prétraitement, traitement, date, numéro, page) |
| OCR d'une zone délimitée | case tracée à la main sur l'image, puis OCR « case par case » : tous les blocs restent dans la zone |
| Comparaison des prétraitements | deux passages côte à côte, avec images prétraitées, textes et durées |
| Coordonnées et provenance | zone normalisée, texte brut de Tesseract, texte proposé, fragments retirés, nature du texte |
| Validation humaine | correction (texte initial conservé), validation, nature du texte (« Cartouche de narration ») |
| Persistance | tout est retrouvé après rechargement, historique compris |
| Traitement par lots | 7 pages : annulé à 2/7, repris, terminé ; ≈ 4,4 s par page |
| Annulation et reprise | les pages terminées sont conservées, aucun doublon |
| Hors ligne | réseau coupé, OCR d'une page avec le moteur et les modèles conservés sur l'appareil |
| Nature de la page | page 1 marquée « couverture » |
| Confidentialité | aucune requête externe (hors téléchargement explicite des modèles) ; aucune erreur JavaScript |

Bugs démontrés pendant cette vérification, et corrigés :
1. **Tracé impossible.** Tracer une case à la main échouait dans un vrai navigateur. Le glisser-déposer natif de l'image annulait le geste (défaut présent depuis la 0.10, invisible dans les tests qui simulaient le tracé). Les zones OCR affichées interceptaient aussi la souris.
2. **Résultats invisibles.** Les résultats OCR existants n'apparaissaient pas en rouvrant une page : le panneau s'affichait avant d'être inséré.
3. **Provenance inexacte.** En mode « case par case », une page sans case était reconnue en page entière sans le dire, avec la mention « case par case » dans la provenance. C'est désormais signalé et enregistré exactement.
4. **Erreur à l'annulation.** Annuler pendant une reconnaissance pouvait provoquer une erreur interne de Tesseract.js : le worker était détruit pendant un travail. Il est désormais arrêté à la fin du travail en cours.
5. **Avertissements internes.** Ceux de Tesseract apparaissaient comme des erreurs dans la console : ils sont redirigés (`debug_file`).

## 2. Corpus et méthode
Les zones de texte ont été délimitées sur l'image et transcrites à la main. Chaque texte reçoit deux étiquettes :
- un **style de lettrage** : ordinaire, gras, italique, stylisé, petit ;
- une **nature** : bulle, narration, lieu ou moment, présentation, effet sonore, texte du décor, couverture, crédits, titre.

Couvertures, crédits, cartouches de lieu et titres sont relevés mais **exclus** du « lettrage courant », qui ne compte que les bulles et cartouches de narration en lettrage ordinaire.

| Corpus | Rôle | Pages | Textes | Mots (lettrage courant) |
|---|---|---|---|---|
| Réglage | mise au point du traitement | 10 pages de *Immortal Hulk* (2018) #1 à #3 et *The Ultimates* (2016) #1 et #4 | 86 | 460 |
| Contrôle A | indépendant, **jamais regardé pendant le réglage** | 6 autres pages des mêmes numéros, dont la couverture de *Immortal Hulk* #1 | 68 | 390 |
| Contrôle B | indépendant, **nouvelles séries** | 5 pages de *Secret Wars* (2015) #0 et #1 et *New Avengers* (2013) #1 | 76 | 718 |

**Paramètres figés** avant toute mesure des contrôles :
- prétraitement ×2 + gris + contraste ;
- découpage « épars » ;
- coupure entre bulles à 1,8 fois l'espacement de la ligne.

Les pages de contrôle n'ont servi à aucun réglage. Remarque d'honnêteté : quatre pages de l'ancien « contrôle » ont servi à choisir le seuil de coupure ; elles ont donc été reversées dans le corpus de réglage.

Les mesures, faites par `tools/mesurer-ocr.mjs`, sont indépendantes de la confiance de Tesseract :
- **exactitude des mots** : mots de référence correctement reconnus ;
- **WER** : substitutions, suppressions et insertions rapportées aux mots de la référence ;
- **CER** : même calcul en caractères.

Langue : anglais uniquement. Aucune statistique de langues différentes n'est fusionnée.

## 3. Résultats — lettrage courant, réglages par défaut

| Mode | Réglage | Contrôle A | Contrôle B | Contrôles A + B |
|---|---|---|---|---|
| Zone délimitée (reconnaissance seule) | 92,0 % · WER 11 % · CER 6 % | 77,7 % · WER 27 % · CER 14 % | 89,3 % · WER 14 % · CER 7 % | **85,2 %** |
| **Page entière** (usage par défaut) | 88,7 % · WER 18 % · CER 11 % | **73,3 %** · WER 31 % · CER 24 % | 87,3 % · WER 19 % · CER 13 % | **82,4 %** |
| Case par case (cases détectées automatiquement) | 85,7 % · WER 22 % · CER 15 % | 73,1 % · WER 31 % · CER 25 % | 86,4 % · WER 21 % · CER 13 % | **81,7 %** |

**Conclusion de la première itération** (sans second passage) : l'objectif de 85 % des mots sur le lettrage courant n'est **pas atteint** sur l'ensemble des pages de contrôle en page entière (82,4 %). Voir §8 pour l'itération 2, qui l'atteint (88,5 % sur trois contrôles). Il est atteint sur les nouvelles séries (87,3 %), mais pas sur le contrôle A (73,3 %). Les chiffres du réglage (88,7 %) étaient optimistes : ce sont ceux des contrôles qu'il faut retenir.

## 4. Par catégorie (page entière, réglages par défaut)

| Catégorie | Réglage | Contrôle A | Contrôle B |
|---|---|---|---|
| Dialogues ordinaires | 91,1 % (213 mots) | 86,0 % (286) | 90,6 % (690) |
| Narration et cartouches | 86,6 % (247) | **38,5 %** (104) | **7,1 %** (28) |
| Italique | 60,0 % (15) | 100 % (1 mot) | 72,7 % (22) |
| Gras dominant | 100 % (2 mots) | 87,5 % (8) | — |
| Lettrage stylisé | 17,3 % (52) | 50,0 % (44) | 39,4 % (33) |
| Effets sonores | 0 % (2) | 0 % (1) | 0 % (2) |
| Petit texte | 63,2 % (19) | 57,1 % (7) | 100 % (1 mot) |

Par nature, sur les contrôles en page entière :
- **crédits** : 61,3 % ;
- **couverture** : 28,6 % ;
- **présentation de personnage** : 77 à 100 % ;
- **lieu ou moment** : 38,9 % ;
- **texte du décor** : 0 % ;
- **titre** (« PREVIOUSLY IN NEW AVENGERS ») : 0 %.

Les catégories gras, italique, effets sonores et petit texte reposent sur très peu de mots : ces chiffres sont **indicatifs**.

Temps et mémoire :
- environ 75 à 90 ms par zone délimitée ;
- environ 4 à 7 s par page entière de 2400 px ;
- pic de mémoire du navigateur entre 0,6 et 1,2 Go.

## 5. Limites précises de l'OCR anglais
1. **Cartouches en texte clair sur fond coloré** : par exemple du texte blanc sur un cartouche vert (*Immortal Hulk* #2 p18). En page entière, ils n'étaient pas détectés (narration à 38,5 % sur le contrôle A). **Corrigé en grande partie par l'itération 2** (§8) : 73 % sur un contrôle jamais vu, des lignes restant parfois fragmentées.
2. **Bulles entières manquées** en page entière : de petites bulles isolées, comme « I FIGURED. », « HELP ME! SOMEBODY HELP! » ou « Can we trust him? ».
3. **Lettrages particuliers** :
   - petites capitales sur fond sépia (*New Avengers* #1 p2) ;
   - lettrage manuscrit fin (*Immortal Hulk* #1 p14, #3 p14), avec des confusions D → P, R → K, I → | ou T ;
   - lettrage en minuscules (*Secret Wars* #1 p15) : bien lu en zone délimitée, plusieurs bulles manquées en page entière.
4. **Lettrage stylisé, logos, couvertures, effets sonores, textes du décor** : non fiables (0 à 50 %).
5. **Fragments parasites** tirés du dessin : retirés du texte proposé quand ils sont sûrement parasites, mais certains restent. La relecture est indispensable.
6. **Ordre de lecture** approximatif en page entière. Aucune bulle ni aucun personnage n'est identifié.

**Pistes pour une prochaine itération**, à régler sur le corpus de réglage puis à contrôler sur de **nouvelles** pages jamais vues :
- inverser les cartouches clairs sur fond foncé ;
- relancer l'OCR sur les zones vides d'une bulle détectée ;
- utiliser un modèle OCR-VLM pour le lettrage stylisé (voir `docs/VISION_0.11.2_AUDIT.md`).

## 6. État technique du français
- **Fonctionnement** : le modèle *fast* français (1,1 Mo, SHA-256 vérifié) se télécharge, s'importe, se charge et s'exécute, seul (`fra`) ou combiné (`fra+eng`). C'est couvert par les tests automatisés et la vérification fonctionnelle.
- **Mesure sur texte de synthèse** :
  - phrase « ÇA COMMENCE DÉJÀ, MAUDIT ! » : `fra` rend « CA COMMENCE DÉJÀ, MAUDIT ! » (cédille perdue) ; `fra+eng` rend « CA COMMENCE DEJA, MAUDIT ! » (accents perdus) ;
  - page de synthèse en français : 100 % sur 13 mots.
- **Précision sur comics réels** : **non validée**, aucun comic français disponible.
- **Architecture** : anglais, français ou bilingue, choisi à la main. Les mesures sont rapportées par langue, sans fusion. Le bilingue est plus lent et peut dégrader les accents : à réserver aux textes réellement mêlés.

## 7. Reproduire
Corpus hors dépôt : pages en PNG et `corpus.json` (zones, style, nature, langue, référence).

Reconnaissance seule sur des zones délimitées :

```bash
node tools/mesurer-ocr.mjs ~/corpus-ocr-reglage
```

Page entière, détection comprise :

```bash
node tools/mesurer-ocr.mjs ~/corpus-ocr-controle --mode=page
```

Cases détectées automatiquement :

```bash
node tools/mesurer-ocr.mjs ~/corpus-ocr-controle --mode=cases
```

Ne jamais régler un paramètre en regardant un corpus de contrôle. Après tout changement, constituer un **nouveau** contrôle avec des pages jamais vues.

## 8. Itération 2 — texte clair sur fond coloré (cartouches)

**Cause.**
- En page entière, Tesseract applique un seul seuil à toute la page. Le fond d'un cartouche coloré passe en noir et avale son texte blanc.
- Inverser l'image ne suffit pas : le texte n'est toujours pas trouvé.
- En revanche, inverser l'image **puis** la seuiller localement (méthode de Bradley, un seuil par voisinage) le fait ressortir, sombre sur blanc.

**Traitement.** C'est un second passage sur une copie de la page : gris, inversion, seuillage local. On ne garde que les blocs **nouveaux** (sans recouvrement avec le premier passage), contenant au moins deux lettres et d'une confiance ≥ 0,7. Ils sont marqués `texteClair` dans la provenance. Le passage est activé par défaut et désactivable dans le panneau OCR. Il double le temps de traitement.

**Réglage, sur le corpus de réglage uniquement.** Le réglage a été complété par 2 pages contenant ce type de cartouches (*Immortal Hulk* #2 p16 et p17). Il compte donc 111 textes sur 12 pages, dont 16 cartouches en texte clair.

| Réglage du second passage | Lettrage courant | Textes clairs | Autres textes |
|---|---|---|---|
| sans | 63,0 % | 1,1 % | 84,4 % |
| inversion seule (seuils 0,5 à 0,8) | 63,0 % | 1,1 % | 84,4 % |
| inversion + seuillage local, voisinage 1/24, seuil 0,7 | 77,8 % | 57,5 % | 84,8 % |
| voisinage 1/12 | 68,0 % | 19,0 % | 85,0 % |
| **voisinage 1/48, seuil 0,7 (retenu)** | **80,0 %** | **66,1 %** | 84,8 % |
| voisinage 1/96 | 79,1 % | 61,5 % | 85,2 % |

Le seuil 0,7 a été retenu parce qu'il ne dégrade pas les autres textes. Ces paramètres ont été figés avant toute mesure de contrôle.

**Contrôle C, indépendant et jamais vu.** 6 pages, 68 textes, dont 13 textes clairs sur fond vert :
- *Immortal Hulk* #2 p13, p15, p19 et p20 ;
- *Secret Wars* #2 p14 et p27.

Ces pages n'ont servi à aucun réglage.

| Page entière, réglages par défaut | Sans second passage | Avec second passage |
|---|---|---|
| Lettrage courant, contrôle C | 80,6 % · WER 23 % | **91,3 % · WER 13 %** |
| Textes clairs, contrôle C | 0 % | **73,1 %** |
| Autres textes, contrôle C | 94,2 % | 94,4 % |
| Contrôle A | 73,3 % | 84,9 % |
| Contrôle B | 87,3 % | 88,3 % |
| **Contrôles A + B + C** (17 pages, 1 650 mots) | 81,8 % · WER 23 % · CER 18 % | **88,5 % · WER 17 % · CER 11 %** |
| dont dialogues | 87,2 % | 89,0 % |
| dont narration | 60,3 % | **86,4 %** |
| Temps moyen par page | 4,8 s | 11,3 s |

Les contrôles A et B avaient déjà servi de contrôle à l'itération 1, mais ils n'ont servi à aucun réglage de l'itération 2. Le contrôle C est le contrôle strict.

**Conclusion.** Avec le second passage, l'objectif de 85 % est **atteint** sur les trois contrôles réunis (88,5 %) et sur chacun d'eux (84,9 %, 88,3 %, 91,3 %), à 0,1 point près pour le contrôle A. Restent non fiables : lettrage stylisé, effets sonores, couvertures, textes du décor, et les petites bulles isolées parfois manquées.
