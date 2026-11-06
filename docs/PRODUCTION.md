# Production éditoriale

`atelier/production/` · version 0.8.0 · tout fonctionne hors ligne, sur l'appareil. Aucune IA externe, aucun service payant, aucun envoi des créations, aucune publication automatique.

## Parcours

Ouvrir → **Assistant** (« Exprimer une idée ») → proposition modifiable (type, personnages, ambiance, titre, accroche, repère, éléments de liste, profil DA, formats) → aperçus par format → « Créer et ouvrir dans Motion Studio » → retouches → « Décliner dans ce format » → export. Pour une série : l'assistant propose une **campagne** → calendrier → édition, validation ou refus de chaque publication → production et export par lot.

## Ce que l'assistant comprend (réellement)

| Capacité | Fonctionnement |
|---|---|
| Intention | 27 types reconnus par mots-clés (versus, origine, classement, quiz, crossover…) ; modifiable dans la proposition |
| Personnages | base locale `studio-personnages.js` (≈ 80 noms : éditeur, ambiance suggérée, étiquettes) ; un nom inconnu est conservé tel quel et signalé |
| Formats | miniature YouTube, publication Instagram 4:5, carrousel, story 9:16, carré, affiche, vidéo 16:9 |
| Périodes | mois (« février » = le prochain février), semaine, « chaque jour », « série de publications », nombre de publications |
| Thèmes de campagne | super-héros noirs, cosmique, antagonistes, Marvel, DC, un personnage donné |
| Déclinaison | « Transforme cette miniature en carrousel » : choix de la création source, recomposition |

**Ce qu'il ne fait pas** : il ne génère pas d'images de personnages (les illustrations sont des emplacements à remplacer par vos visuels), ne connaît aucune date, biographie ou première apparition et n'en invente jamais (les repères s'affichent « à vérifier » tant que vous ne les fournissez pas), ne comprend pas les phrases hors de ses règles (il propose alors un portrait modifiable).

## Compositeur

`templates/_systeme/studio-compositeur.js` : `composer(brief, format, { profil })` renvoie une composition Motion Studio (version 2) entièrement éditable ; `decliner(brief, formats)`.

- 10 mises en scène : duel (coupe diagonale, deux décors, badge VS), équipes (grille), héros (présence dominante, écho du nom), héros avec repère (macaron « à vérifier »), une éditoriale (titraille, filet, visuel encadré, note pour une critique), annonce (rayons, date en bandeau), événement (titre monumental, protagonistes alignés), liste (classement, chronologie avec axe, hiérarchie en pyramide), question (point d'interrogation, options A/B), citation (guillemets, attribution).
- Ambiances d'univers, effets dosés : cosmique (nébuleuse, étoiles, énergie), urbain nocturne (faisceau, brume), mystique (voile, étincelles), technologique (grille, flux) ; halo du sujet, vignettage, grain.
- Recomposition par orientation : paysage (côte à côte, colonne de texte), vertical (superposition, texte en bas), carré ; le carrousel est un document 4:5 en plans (couverture, diapositives numérotées, fin).
- L'intention (`brief`) est enregistrée dans la création : Motion Studio s'en sert pour recomposer une déclinaison au lieu de la redimensionner.
- Un profil DA impose ses couleurs et son système ; sans profil, chaque type a une direction par défaut.

## Profils de direction artistique

`atelier/production/analyse-da.js`. Mesuré sur l'image (réduite à 480 px, jamais envoyée) : palette par coupe médiane, luminosité, contraste, saturation, température, densité de texture, masse et centre du sujet (écart à la couleur dominante), répartition haute/basse de la lumière, orientation. Proposé : six jetons (`fond`, `papier`, `encre`, `texte`, `accent`, `accent2`), texte choisi pour le meilleur contraste WCAG sur le fond, système graphique le plus proche. **Non mesurable** sans IA : polices exactes, traitement précis des personnages, intention — notes déclaratives. Niveaux : identité de marque, direction de campagne, direction de création.

## Campagnes

Statuts : idée → à produire → en cours → à valider → validé → exporté (refus : retour « à produire », marqué refusé). Produire une publication crée la création dans la bibliothèque (dossier = nom de la campagne) ; les retouches faites ensuite dans Motion Studio sont celles qui s'exportent. Une opération par lot est annulable (dernière opération). Export ZIP : un PNG par publication (un par diapositive de carrousel) nommé `date_titre.png` + `calendrier.csv`.

## Données

IndexedDB `primestone-motion` version 3 : `creations`, `ressources`, `versions`, `modeles`, `composants`, `presets`, `campagnes`, `profils`. La mise à niveau ajoute les magasins sans toucher aux données existantes.

## Limites

- Base de personnages volontairement courte et sans faits ; à enrichir localement.
- Analyse d'image statistique : une référence très texturée ou multicolore peut donner une palette à corriger.
- Le profil appliqué à une campagne recolore les créations produites ; il ne réorganise pas leur composition.
- Export par lot en PNG uniquement (les animations s'exportent une par une depuis Motion Studio).
