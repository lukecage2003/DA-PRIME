# Motion Studio · MVP (lot 4)

Outil de création graphique et de motion design dédié aux comics, super-héros, éditeurs et à la pop culture, intégré à l'Atelier (`atelier/motion/`). Il produit des **compositions originales et des animations autonomes** (annonces, révélations, affiches animées, présentations). Ce n'est pas un logiciel de montage : pas de timeline, l'animation est pilotée par des presets et quelques réglages.

Tout fonctionne sur l'appareil : aucun compte, aucun serveur distant, aucune API d'IA, aucun service payant.

## Ouvrir

```bash
npm run atelier            # puis http://localhost:4173/atelier/ → bouton « Motion Studio → »
```

Adresse directe : `http://localhost:4173/atelier/motion/`. Sur téléphone ou tablette : `npm run atelier:reseau` (voir `docs/ATELIER.md`, mêmes limites HTTP).

## Utiliser

1. **Famille** : choisir l'une des huit familles (tableau ci-dessous). Les textes déjà personnalisés sont conservés d'une famille à l'autre ; les textes par défaut sont remplacés.
2. **Direction visuelle** : quatre directions adaptées par famille, éditoriales ou cinématographiques. Changer de direction rétablit ses couleurs et ses effets.
3. **Format** : 16:9 (1920 × 1080), 1:1 (1080 × 1080), 4:5 (1080 × 1350), 9:16 (1080 × 1920). La mise en page s'adapte (paysage ou vertical).
4. **Textes** : l'aperçu se met à jour à chaque frappe ; les titres s'ajustent seuls ; les listes (équipe, membres, niveaux, étapes, fiche, statistiques) se saisissent une ligne par entrée, avec le format indiqué à côté du champ.
5. **Illustrations** : *Importer* (PNG, JPG, WebP, AVIF ; réduites à 3000 px), *Recentrer*, *Substitution*, curseur de zoom. Dans l'aperçu : glisser pour recadrer, pincer ou molette pour zoomer. Les illustrations ne sont jamais retouchées : la trame ne les recouvre que si *Trame aussi sur les illustrations* est cochée ; l'encrage est un contour (personnage détouré) ou un filet de cadre.
6. **Animation** : presets *Révélation, Apparition, Déplacement, Zoom, Parallaxe, Particules, Volets, Statique* ; durée (4 à 12 s) ; vitesse ; *Titres lettre à lettre* ; *Volets de fin*. Lecture, pause, *Rejouer*, curseur de position, boucle.
7. **Effets** (0 = désactivé) : trame halftone, encrage, lignes de vitesse, lumière et rayons, particules, effets cosmiques (étoiles, crépitement d'énergie), grain d'impression. *Sceau P* : activable (vectorisation NON OFFICIELLE).
8. **Couleurs** : fond, accent, texte, encre ; *Couleurs de la direction* pour revenir aux valeurs d'origine. Les couleurs de marque ne sont pas modifiées : seules celles de la création changent.
9. **Calques** : liste du premier plan à l'arrière-plan ; sélectionner (dans la liste ou en touchant l'aperçu), masquer, monter, descendre ; position, échelle et opacité. Glisser dans l'aperçu déplace le calque sélectionné (recadre l'image s'il s'agit d'une illustration, sauf si *Glisser déplace aussi les illustrations* est cochée).
10. **Contrôles** : débordements, titres vides, images trop agrandies, crédit manquant.

### Familles et directions

| Famille | Contenu | Directions | Preset par défaut |
|---|---|---|---|
| Annonce de série | nouvelle série, équipe créative | La Une, Pop, Nuit, Pulp | Révélation |
| Révélation de couverture | couverture 2:3 inclinée, numéro, artiste | Nuit, La Une, Cosmique, Noir et rouge | Zoom |
| Révélation de personnage | héros ou vilain détouré, écho du nom | Noir et rouge, Pop, Nuit, Cosmique | Révélation |
| Révélation d'équipe | 2 à 5 membres en panneaux diagonaux | Pop, La Une, Nuit, Noir et rouge | Volets |
| Crossover et événement | deux camps, coupe diagonale, nom de l'événement | Cosmique, Pop, Noir et rouge, Nuit | Zoom |
| Dossier de personnage | portrait, fiche, statistiques animées | La Une, Pulp, Nuit, Noir et rouge | Déplacement |
| Hiérarchie cosmique | 3 à 7 niveaux en pyramide ou en orbites | Cosmique, Nuit, La Une, Pop | Particules |
| Chronologie | 3 à 7 étapes, axe diagonal ou vertical | La Une, Pulp, Nuit, Pop | Apparition |

Directions : **La Une** (papier, encre, jaune), **Pop** (jaune, rouge, Ben-Day, contours épais), **Pulp** (tons chauds, grain), **Nuit** (nuit bleutée, lumière, poussière), **Noir et rouge** (contraste, grain), **Cosmique** (nébuleuses, étoiles, énergie).

## Sauvegarde

- **Automatique** sur l'appareil (IndexedDB), quelques dixièmes de seconde après chaque modification, illustrations comprises. La dernière création se rouvre au lancement.
- **Mes créations** : liste des créations de l'appareil (ouvrir, supprimer). *Nouvelle création*, *Dupliquer*.
- **Enregistrer en fichier** : `.motion.json` autonome (illustrations intégrées) pour archiver ou passer d'un appareil à l'autre ; *Ouvrir un fichier* en crée une copie locale.

## Exports

| Format | Contenu | Méthode |
|---|---|---|
| PNG | image finale (composition complète) à la taille du format | canvas |
| JPG | idem, qualité 90 réduite jusqu'à 60 pour rester sous 2 Mo | canvas |
| SVG | image finale vectorielle : calques nommés, polices et images intégrées | rendu SVG du même moteur |
| MP4 ou WebM | animation complète, pleine ou demi-définition, 30 i/s | enregistrement du canvas (MediaRecorder) ; MP4 si le navigateur sait l'encoder, sinon WebM |
| GIF | animation, 480 px à 12 i/s ou 720 px à 15 i/s, 256 couleurs, en boucle | encodeur intégré, image par image |

Le bouton vidéo affiche le format réellement disponible (« Vidéo MP4 » ou « Vidéo WebM ») ; il est désactivé si le navigateur n'enregistre pas de vidéo.

## Architecture

- `templates/_systeme/motion-base.js` : formats, directions, effets, générateurs (trame, faisceaux, lames), ajustement du texte (métriques de police de l'Atelier), presets d'animation.
- `templates/_systeme/motion-familles.js` : les huit familles (champs, images, mise en page paysage et verticale).
- `templates/_systeme/motion.js` : document de création (`normaliser`), composition à l'instant *t* → **liste d'affichage** indépendante du rendu ; calques, ordre, transformations, volets.
- `templates/_systeme/motion-svg.js` : rendu SVG (Node et navigateur).
- `atelier/motion/rendu-canvas.js` : rendu canvas (aperçu, PNG, JPG, vidéo, GIF), caches de trame et de silhouettes.
- `atelier/motion/gif.js` : encodeur GIF89a (coupe médiane, tramage ordonné, LZW).
- `atelier/motion/motion.js` : interface, stockage, interactions, exports.

Le moteur est déterministe (aléas à graine fixe) : un même document et un même instant donnent la même image, dans Node comme dans le navigateur. Motion Studio est inclus dans le précache hors ligne de l'Atelier.

## Choix techniques : dépôts de référence évalués

Aucune dépendance ajoutée. Licences vérifiées sur le registre npm le 2026-11-05 (l'API GitHub n'était pas accessible depuis l'environnement de travail).

| Référence | Licence · activité | Décision |
|---|---|---|
| Motion Canvas | MIT · dernière publication 02/2025 | Non retenu : outil d'auteur en code avec son propre éditeur, pas un composant intégrable dans une interface simple. Idée reprise : la scène est une fonction pure du temps. |
| Theatre.js | cœur Apache-2.0, studio **AGPL-3.0** · dernière publication 05/2024 | Non retenu : interface de keyframes (proche d'une timeline), studio sous AGPL, activité ralentie. |
| PixiJS (+ Filters, Particle Emitter) | MIT · très actif | Non retenu pour le MVP : WebGL, ~500 Ko, pas d'export SVG ; le canvas 2D suffit aux effets visés. Candidat si des filtres GPU deviennent nécessaires. |
| GSAP | licence propre « Standard no-charge », gratuite mais **non open source**, avec restrictions d'usage | Non retenu : licence non OSI ; les quelques fonctions d'interpolation nécessaires tiennent en dix lignes. |
| SVG.js | MIT · actif | Non retenu : l'export SVG est généré directement depuis la liste d'affichage, sans manipulation du DOM. |
| Paper.js | MIT · actif | Non retenu : redondant avec le canvas 2D et le SVG. |
| Lottie Web | MIT · 05/2025 | Non retenu : lecteur d'animations produites dans After Effects (outil Adobe exclu). |
| Codrops LetterEffects, GridRevealEffects | démonstrations, conditions d'utilisation de Codrops (pas de redistribution telle quelle) | Aucun code repris. Idées réinterprétées : titres lettre à lettre, volets d'ouverture et de fin. |

## Vérifié et non vérifié

`npm run test:motion` (inclus dans `npm test`) : **51 tests**.

- Moteur (Node, 15) : 128 compositions (8 familles × 4 formats × 4 directions) sans alerte, SVG bien formé, déterminisme, entrée et pose de chaque preset, preset statique, volets, lettre à lettre, calques (masquage, déplacement, échelle, ordre), effets, débordement et titre vide, document invalide corrigé, image trop agrandie, encodeur GIF (décodage de contrôle et fidélité des couleurs).
- Interface (Chromium) : accès depuis l'Atelier, 8 familles, saisie et mise à jour immédiate, alerte de débordement, direction et format, import, recadrage souris et molette, sélection et déplacement d'un calque dans l'aperçu, masquage et ordre, effets et couleurs, lecture et curseur, sauvegarde et réouverture après rechargement, liste des créations, fichier `.motion.json` (enregistrer et ouvrir), exports PNG 1920 × 1080, JPG < 2 Mo, SVG autonome et lisible, GIF 480 × 270, vidéo MP4 (Chromium de test), rechargement hors ligne, Galaxy S25 et iPad M2 émulés (pas de défilement horizontal, cibles de 44 px, glisser et pincer au doigt), Windows 1366 px.

**Non vérifié** : aucun appareil physique ; ni Safari, ni Samsung Internet, ni Firefox (seul Chromium est disponible ici). Lecture des fichiers MP4 et WebM dans des lecteurs externes non contrôlée (seuls l'en-tête et la taille le sont).

## Limites connues

- **Vidéo en temps réel** : l'export dure autant que l'animation ; garder l'onglet visible (un onglet en arrière-plan ralentit ou interrompt l'enregistrement). Sur un téléphone peu puissant, préférer la demi-définition. Pas de son.
- **MP4** dépend du navigateur : Chromium récent et Safari l'encodent ; ailleurs, l'export se fait en WebM (que certaines applications, notamment sur iPhone, lisent mal). Le format proposé est indiqué sur le bouton.
- **GIF** : 256 couleurs, fichiers lourds au-delà de 8 s ; calcul de quelques secondes à une minute.
- **Images fixes** : toujours l'état final (composition complète), pas l'image affichée au curseur.
- **SVG** : le grain et la lueur utilisent des filtres SVG ; certains logiciels (Inkscape ancien, logiciels de découpe) les rendent différemment.
- Les créations restent dans le navigateur de l'appareil : vider les données du site les efface. Utiliser *Enregistrer en fichier* pour les conserver.
- Photos HEIC/HEIF non lisibles par tous les navigateurs (comme dans l'Atelier).

## Backlog post-MVP

- Export de l'image affichée au curseur ; vignette de prévisualisation dans *Mes créations*.
- Encodage vidéo image par image (WebCodecs) pour des exports plus rapides que le temps réel et indépendants de la visibilité de l'onglet.
- Ajout libre de textes, images et formes (aujourd'hui : éléments fournis par chaque famille).
- Traitements d'illustration optionnels (bichromie, contraste), masques personnalisés.
- Musique ou effets sonores (avec gestion des droits), sous-titres.
- Familles supplémentaires (citation, chiffre clé, comparatif d'éditions) et directions supplémentaires.
- Contrôle de lisibilité automatique du contraste texte/fond.
