# Motion Studio · studio de composition et de motion design (lot 5, version 0.6.0)

Motion Studio est l'outil de création graphique et d'animation de l'Atelier, spécialisé dans les comics, les super-héros, les univers fictifs et la pop culture. Il s'ouvre depuis le bouton *Motion Studio →* de l'Atelier (`atelier/motion/`).

Il produit des compositions originales, fixes ou animées : annonces éditoriales, révélations de couvertures et de personnages, affiches, compositions typographiques, dossiers, cartes d'univers, chronologies, crossovers, visuels pour YouTube, Instagram, TikTok et l'impression. Ce n'est ni un logiciel de montage vidéo ni un outil de publication.

Tout fonctionne sur l'appareil : aucun compte, aucun serveur distant, aucune API d'IA, aucun service payant.

```bash
npm run atelier            # http://localhost:4173/atelier/motion/
npm run atelier:reseau     # depuis une tablette ou un téléphone du même Wi-Fi (voir docs/ATELIER.md)
```

## Ce qui a changé depuis le MVP (0.5.0)

Le MVP remplissait 8 familles de modèles par des formulaires. Le studio est désormais un **éditeur de composition libre** : page blanche ou modèle, éléments ajoutés librement, manipulés directement sur la scène, chacun avec sa propre animation. Les 8 familles du MVP restent disponibles comme **modèles intégrés**, convertis à l'ouverture en compositions entièrement éditables. Les créations enregistrées avec le MVP sont converties automatiquement (textes, illustrations, recadrages conservés).

## L'écran

- **En-tête** : retour à l'Atelier, nom de la création, annuler et rétablir, *Bibliothèque*, *Exporter*, état de la sauvegarde.
- **Outils** (colonne de gauche ; bandeau sous l'en-tête sur tablette et téléphone) : Sélection, Texte, Forme, Image, Effet, Composant.
- **Scène** au centre : règles, guides, grille, zones sûres, zoom, lecture et curseur de temps.
- **Séquenceur** sous la scène : une piste par calque.
- **Panneau** à droite (sous la scène sur tablette et téléphone) : *Propriétés* (contextuelles), *Animation*, *Calques*, *Document*, puis *Contrôles*.

Les réglages courants sont visibles ; les réglages avancés sont dans des sections repliables qui restent ouvertes une fois dépliées.

## Composer

| Action | Comment |
|---|---|
| Sélectionner | toucher ou cliquer un élément ; Maj + clic pour ajouter ; glisser dans le vide pour un lasso ; Ctrl+A pour tout |
| Entrer dans un groupe | double-clic sur l'élément voulu |
| Déplacer | glisser ; flèches (Maj : ×10 px) ; magnétisme sur les bords et le centre de la scène, les guides, la grille et les autres éléments (Alt pendant le glisser pour l'ignorer) |
| Redimensionner | 8 poignées (Maj : proportions conservées) ; pincer à deux doigts |
| Pivoter | poignée ronde (Maj : pas de 15°) ; rotation à deux doigts |
| Ordre | boutons premier plan, avancer, reculer, arrière-plan ; flèches de l'onglet Calques |
| Aligner, répartir | 6 alignements (sur la scène pour un élément, sur la sélection pour plusieurs) ; répartition horizontale et verticale |
| Grouper, dégrouper | Ctrl+G, Ctrl+Maj+G ; les positions sont conservées |
| Dupliquer, copier, coller, supprimer | Ctrl+D, Ctrl+C, Ctrl+V, Suppr |
| Verrouiller, masquer | onglet Calques ; un calque verrouillé ne se sélectionne plus sur la scène |
| Annuler, rétablir | Ctrl+Z, Ctrl+Maj+Z ou Ctrl+Y (120 étapes ; les réglages continus d'un même champ comptent pour une étape) |
| Lecture | Espace, ou ▶ ; le curseur et la tête de lecture du séquenceur positionnent l'instant |
| Raccourcis d'ajout | T texte, R rectangle, I illustration |

Les règles se masquent dans *Affichage* ; glisser depuis une règle crée un guide, le ramener hors de la scène le supprime. *Document > Grille et guides* propose des guides au centre et aux tiers.

### Typographie

Chaque texte est un élément à part entière :

- **Hiérarchie** : Titre, Surtitre, Accroche, Corps, Légende, Onomatopée, avec des styles propres à chaque système graphique ;
- **Polices** : les cinq polices de la marque (Anton, Archivo, Archivo gras, Instrument Serif italique, JetBrains Mono) et les **polices locales importées** (TTF, OTF, WOFF, WOFF2), enregistrées sur l'appareil et dans les fichiers de projet ;
- taille, ajustement automatique à la boîte (ou taille fixe avec alerte de débordement), interligne, interlettrage, alignements horizontal et vertical, capitales, retours à la ligne manuels, typographie française (espaces insécables) ;
- couleur ou dégradé vertical, bandeau de fond diagonal ;
- contour, second contour, ombre portée (décalage, flou, opacité), lueur, **extrusion** (lettrage en relief) ;
- **déformations** : arc (texte sur trajectoire circulaire), onde, inclinaison, impact (centre agrandi), perspective ;
- les contours et l'extrusion restent dans la boîte du texte.

### Illustrations

- import de plusieurs fichiers à la fois (PNG, JPG, WebP, AVIF, GIF) ; **l'original est conservé à l'octet près** (au-delà de 4096 px de côté, une copie de travail réduite est créée et signalée) ;
- remplissage du cadre ou image entière, zoom, décalage, **recadrage direct sur la scène** (double-clic, puis glisser, molette ou pincer) ;
- **masques** : rectangle, coins arrondis, ellipse, lame diagonale, losange, hexagone, étoile, explosion, polygone (masques des modèles) ;
- contour (filet, ou silhouette encrée pour une image détourée), ombre portée ;
- **traitements non destructifs**, recalculés à partir de l'original : retrait d'un fond uni (couleur et tolérance), noir et blanc, bichromie, contraste, luminosité, trame d'impression en points ;
- **remplacer l'illustration** conserve masque, recadrage, traitements et animations.

Le détourage automatique d'un personnage sur un fond complexe n'est pas proposé : aucune méthode locale fiable et légère n'a été retenue (voir le backlog). Le retrait d'un fond uni fonctionne sur les illustrations à fond blanc ou coloré.

### Formes, bulles et cadres

Rectangle (coins arrondis), ellipse, polygone, étoile, losange, hexagone, lame diagonale, bandeau, explosion et éclat d'impact (variables), bulle de dialogue, bulle de cri, bulle de pensée (pointe orientable), cartouche narratif, case de comics, cadre éditorial (double filet), ligne, flèche. Remplissage uni ou dégradé, contour, trame intérieure, ombre portée.

### Effets

Chaque effet est un calque : il se déplace, se redimensionne, se masque, s'anime et se combine avec les autres. Paramètres communs : intensité, densité, échelle, angle, couleurs, foyer, variation (graine), animation et vitesse.

| Catégorie | Effets |
|---|---|
| Impression | trame halftone (radiale, linéaire, Ben-Day uniforme, inversée), texture papier, grain, motifs (rayures, quadrillage, pois, zigzag) |
| Mouvement | lignes de vitesse (radiales), lignes de mouvement (parallèles) |
| Impact | explosion, impact |
| Énergie | éclairs, aura d'énergie |
| Lumière | rayons lumineux, lumière (halo, projecteur, reflets d'objectif), dégradé, vignettage |
| Particules | poussière, étincelles montantes, chute, éclatement |
| Cosmos | champ d'étoiles, nébuleuse, crépitement cosmique |

### Systèmes graphiques

Six systèmes, chacun avec ses palettes, ses styles typographiques, ses animations par défaut et ses effets conseillés :

| Système | Principe | Palettes |
|---|---|---|
| Éditorial premium | hiérarchie, grille, sobriété | Papier, Encre, Jaune |
| Comics classique | trames, encrage, couleurs franches, impact | Jaune et rouge, Bleu et rouge, Noir et blanc |
| Cinématographique | profondeur, lumière, atmosphère | Nuit, Noir et rouge, Ambre |
| Cosmique | espace, énergie, échelle | Nébuleuse, Aurore, Solaire |
| Minimaliste | peu d'éléments, contraste fort | Blanc, Noir |
| Expérimental | collage, géométrie, typographie déformée | Collage, Acide |

Les couleurs des éléments sont des **jetons** (Fond, Papier, Encre, Texte, Accent, Accent 2) ou des couleurs libres. Changer de système ou de palette recolore toute la composition sans casser sa cohérence ; les composants insérés prennent les couleurs du système actif. Les couleurs de la palette sont modifiables pour la création ; les couleurs de marque ne sont pas modifiées.

## Animer

Chaque calque a sa propre animation, en trois parties combinables :

- **Entrée** : fondu, glissement (4 directions), zoom avant ou arrière, tampon (impact), rebond, rotation, révélation par masque (4 directions), iris, volet diagonal, et pour les textes lettre à lettre, mot à mot, machine à écrire ; durée, délai, amplitude ;
- **Boucle** : flottement, pulsation, battement, rotation continue, balancement, tremblement, scintillement, dérive ; amplitude, période, début ;
- **Sortie** : fondu, glissement, zoom, agrandissement, rotation, masquage, iris, volet ; durée et avance sur la fin.

**Courbes** : linéaire, décélération douce ou forte, accélération, accélération puis décélération, dépassement, élastique, rebonds, saccadée, ou **courbe de Bézier personnalisée** (quatre valeurs).

**Préréglages** : impact comics, révélation douce, titre de cinéma, arrivée latérale, chute avec rebonds, machine à écrire, lettres en cascade, iris cosmique, volet aller-retour, flottement, battement de cœur, néon ; *Enregistrer comme préréglage* crée les vôtres. Les préréglages s'appliquent à plusieurs calques à la fois ; *Échelonner* décale leurs entrées.

**Composition** : durée (1 à 60 s), lecture en boucle, **caméra** (poussée, recul, travelling, secousse) et **profondeur** de chaque calque pour une parallaxe multicouche.

**Séquenceur** : une piste par calque ; faire glisser la barre bleue change le délai d'entrée, son bord droit sa durée ; la barre rouge règle la sortie ; la tête de lecture se déplace sur la règle des temps. Ce n'est pas une timeline de montage : pas de clips, de pistes audio ni d'images clés libres.

## Formats

Vidéo HD 1920 × 1080 et 4K 3840 × 2160, miniature YouTube 1280 × 720, 9:16 (Story, Reels, TikTok), 4:5, 1:1, bannière YouTube 2560 × 1440, en-tête X 1500 × 500, A4 portrait et paysage en 300 dpi, page de comics US en 300 dpi, affiche 2:3, et **format personnalisé** de 64 à 8192 px de côté.

Changer de format **adapte** la composition : les éléments proches d'un bord y restent ancrés, les autres gardent leur position relative, les éléments plein cadre (fonds, effets) sont étirés, les tailles suivent la moyenne des rapports de dimensions. *Décliner dans ce format en copie* crée une nouvelle création adaptée : les placements se corrigent ensuite à la main. Les **zones sûres** (Affichage) montrent les parties masquées par l'interface des plateformes (9:16, miniature, bannière).

## Exporter

| Format | Contenu |
|---|---|
| PNG | composition complète ou instant du curseur, ×1, ×2 ou ×4 (8192 px au plus), fond transparent possible |
| JPG | qualité 92, ou limité à 2 Mo pour une miniature YouTube |
| SVG | vectoriel, calques nommés (Inkscape, Figma), images et polices intégrées (y compris importées), fond transparent possible |
| GIF | 480, 720 ou 1080 px, 10 à 25 images/s, 256 couleurs, en boucle, fond transparent possible |
| WebM image par image | VP9 (ou VP8), 24, 30 ou 60 images/s, jusqu'à 4K ; rendu exact de chaque image, plus rapide que le temps réel, indépendant de la visibilité de l'onglet (WebCodecs) |
| MP4 ou WebM temps réel | selon le navigateur (MediaRecorder) ; dure autant que l'animation, onglet visible obligatoire ; 1920 px au plus |

Le panneau n'affiche que les formats que le navigateur sait réellement produire. Aucun export n'a de son.

## Bibliothèque et projets

- **Mes créations** : vignettes, dossiers (champ *Dossier* de l'onglet Document), recherche, ouverture, duplication, suppression ; nouvelle création sur page blanche au format et dans le système choisis.
- **Modèles** : les 8 modèles intégrés (4 directions chacun, au format choisi) et vos modèles (*Enregistrer comme modèle*).
- **Composants** : titre d'impact, bandeau de surtitre, accroche, bloc de texte, crédit, onomatopées sur explosion et éclat, bulles de dialogue, de cri et de pensée, cartouche, case et planche de trois cases, badge, bandeau diagonal, cadre éditorial, fiche de statistiques, sceau P (non officiel), et vos composants (*Comme composant* sur une sélection).
- **Formes et bulles**, **Typographie** (hiérarchie et dix onomatopées), **Effets**, **Ressources** (illustrations et polices importées).
- **Fichiers** : enregistrer la création en **projet `.motion.json`** (composition, illustrations et polices incluses) ; ouvrir un projet (version 2, ou fichier du MVP converti) ; **exporter ou importer toute la bibliothèque** (créations, ressources, modèles, composants, préréglages ; l'import n'écrase rien).

**Sauvegarde automatique** sur l'appareil (IndexedDB) une demi-seconde après chaque modification, et à la fermeture de l'onglet ; la dernière création se rouvre au lancement. **Versions** : *Enregistrer une version* (Document > Organisation), version automatique toutes les dix minutes d'édition, restauration (l'état courant est d'abord enregistré comme version) ; 30 versions au plus par création. Le studio demande au navigateur un **stockage persistant** ; l'état est affiché dans Bibliothèque > Fichiers. Le stockage du navigateur pouvant être effacé, **le fichier de projet reste la sauvegarde de référence** et le moyen de passer d'un appareil à l'autre.

## Architecture

Le même moteur, sans dépendance, produit l'aperçu et tous les exports : une **liste d'affichage** (groupes, rectangles, polygones, chemins, textes, images, trames, grain) est rendue soit sur canvas (aperçu, PNG, JPG, GIF, vidéo), soit en SVG.

| Couche | Fichiers |
|---|---|
| Données et rendu de scène | `templates/_systeme/studio.js` (document, éléments, groupes, matrices, adaptation, conversion des modèles et du MVP) |
| Typographie | `templates/_systeme/studio-texte.js` |
| Formes et masques | `templates/_systeme/studio-formes.js` |
| Effets | `templates/_systeme/studio-effets.js` |
| Animation | `templates/_systeme/studio-anim.js` (courbes, entrées, boucles, sorties, caméra) |
| Systèmes, palettes, formats | `templates/_systeme/studio-systemes.js` |
| Composants intégrés | `templates/_systeme/studio-composants.js` |
| Modèles (familles du MVP) | `templates/_systeme/motion*.js` |
| Rendus | `atelier/motion/rendu-canvas.js`, `templates/_systeme/motion-svg.js` |
| Éditeur | `atelier/motion/` : `app.js` (orchestration), `etat.js` (document, sélection, historique, opérations), `scene.js` (manipulation directe), `proprietes.js` (panneaux), `sequenceur.js`, `bibliotheque.js`, `exports.js`, `stockage.js`, `traitements.js` |
| Encodeurs | `atelier/motion/gif.js` (GIF89a), `atelier/motion/webm.js` (multiplexeur WebM) |

Le moteur est **déterministe** (aléas à graine fixe) : même document, même instant, même image, dans Node comme dans le navigateur. Un élément illisible est signalé dans les contrôles sans bloquer le reste de la composition. Pour ajouter un effet, une forme, une entrée ou un composant, il suffit d'ajouter une entrée au catalogue correspondant : l'éditeur, la bibliothèque, les rendus et les exports la prennent en charge.

## Choix techniques : bibliothèques évaluées

Aucune dépendance n'a été ajoutée. Licences et activité vérifiées sur le registre npm (l'API GitHub n'était pas accessible depuis l'environnement de travail).

| Référence | Licence · activité | Décision |
|---|---|---|
| PixiJS, PixiJS Filters, Particle Emitter | MIT · très actif (filters et émetteur : moins actifs) | Non retenus : WebGL, ~500 Ko, pas d'export SVG, deux chaînes de rendu à maintenir. Le canvas 2D suffit aux effets livrés. Candidat si des filtres GPU (flou directionnel, distorsions) deviennent nécessaires. |
| GSAP | licence « Standard no-charge », gratuite mais non open source | Non retenu : licence non OSI ; courbes et préréglages implémentés (Bézier comprise) en quelques dizaines de lignes. |
| Theatre.js | cœur Apache-2.0, studio AGPL-3.0 · peu actif depuis 2024 | Non retenu : éditeur sous AGPL, logique de timeline à images clés hors périmètre. |
| Motion Canvas | MIT · dernière publication 2025 | Non retenu : outil d'auteur en code avec son éditeur. Principe repris : la scène est une fonction pure du temps. |
| SVG.js, Paper.js | MIT · actifs | Non retenus : le SVG est produit directement depuis la liste d'affichage. |
| Lottie Web | MIT | Non retenu : lecteur d'animations conçues dans After Effects (outil Adobe exclu). |
| Codrops LetterEffects, GridRevealEffects | conditions d'utilisation de Codrops | Aucun code repris ; idées réinterprétées (lettre à lettre, volets, révélations). |
| Encodage vidéo et GIF (gif.js, mp4-muxer, webm-muxer…) | MIT pour la plupart | Non retenus : encodeur GIF et multiplexeur WebM écrits pour le studio (quelques centaines de lignes, testés) ; MP4 confié au navigateur. |

## Vérifié et non vérifié

`npm run test:motion` (inclus dans `npm test`) exécute les tests du moteur dans Node puis ceux de l'éditeur dans Chromium. **93 tests** : 32 dans Node (modèles du MVP ; 96 modèles convertis ; 6 systèmes × styles, formes, effets et composants à 4 instants ; déterminisme ; typographie ; courbes, entrées, boucles, sorties, caméra ; groupes et matrices ; adaptation de format ; jetons de couleur ; migration du MVP ; document invalide ; encodeurs GIF et WebM) et 61 dans Chromium (page blanche, texte, styles, déformation, annuler et rétablir, bibliothèque, déplacement, poignées, rotation, alignement, groupe, duplication, calques, import multiple et original intact, masque, bichromie, recadrage, remplacement, animation par calque, préréglage, échelonnement, séquenceur, lecture, système, caméra, format A4, police locale, composant, version, modèle personnel, sauvegarde et rechargement, recherche, projet et bibliothèque en fichier, PNG ×1 et ×2 transparent, JPG, SVG, GIF, WebM image par image et MP4 temps réel relus par le navigateur, hors ligne, transfert vers un autre appareil, ouverture d'un projet du MVP, Galaxy S25, iPad M2 portrait et paysage, Windows 1366 px).

**Non vérifié** : aucun appareil physique ; ni Safari, ni Samsung Internet, ni Firefox (seul Chromium est disponible ici). Les gestes tactiles sont des événements tactiles réels de Chromium sur des appareils émulés. Les fichiers vidéo sont vérifiés par lecture dans Chromium (dimensions et durée), pas dans des lecteurs ou logiciels externes.

## Limites connues

- **Safari** : le flou des ombres de texte utilise le filtre canvas, absent des versions anciennes de Safari (l'ombre s'affiche alors nette) ; l'encodage WebM image par image dépend de WebCodecs et de VP9, qui peuvent manquer : seul l'enregistrement temps réel est alors proposé.
- **Vidéo** : pas de son ; MP4 seulement en temps réel et selon le navigateur ; pas de vidéo à transparence.
- **Très grands formats** : au-delà d'environ 16 millions de pixels (A4 ×2 par exemple), certains appareils mobiles refusent de créer l'image ; le studio prévient.
- **GIF** : 256 couleurs, fichiers lourds au-delà de quelques secondes en 1080 px.
- **SVG** : le grain, la texture papier, les lueurs et les flous utilisent des filtres SVG que certains logiciels rendent différemment ; les modes de fusion utilisent `mix-blend-mode`.
- **Adaptation de format** : automatique mais approximative ; prévoir des corrections manuelles.
- **Polices importées** : leur mesure utilise le navigateur ; vérifier leur licence avant diffusion. Elles ne sont pas disponibles dans les tests Node.
- Les éléments vectoriels issus des modèles (fonds, formes composites) se transforment et s'animent mais leurs formes internes ne se modifient pas une à une.
- Photos HEIC/HEIF non lisibles par tous les navigateurs.

## Backlog (non livré)

- Détourage automatique de personnages sur fond complexe (modèle de segmentation local : poids, licence et fiabilité à évaluer).
- États et scènes successives dans une même composition (transitions entre plans).
- Images clés libres et trajectoires de mouvement dessinées ; morphing de formes.
- Masques animés dessinés à la main, masques d'écrêtage entre calques.
- Export MP4 image par image (multiplexeur MP4), vidéo à transparence (WebM VP9 alpha), séquence PNG, son.
- Édition point par point des formes et des éléments vectoriels issus des modèles.
- Sauvegarde automatique dans un dossier de l'ordinateur (File System Access, Chromium seulement).
- Filtres GPU (flou directionnel, distorsions) si PixiJS ou WebGL deviennent justifiés.
- Vérifications sur appareils physiques, Safari et Firefox.
