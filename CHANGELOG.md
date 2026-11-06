# Journal des versions

## 0.8.0 · 2026-11-06 · studio créatif éditorial : assistant, compositeur, campagnes, profils DA

- Production éditoriale (`atelier/production/`), quatre espaces : Assistant, Campagnes, Profils DA, Bibliothèque ; accessible depuis l'accueil (« Exprimer une idée »), l'Atelier et Motion Studio.
- Assistant local (règles, aucune IA externe) : reconnaît 27 types de contenus (versus, comparaison de pouvoirs, versions alternatives, affrontement hypothétique, équipes, portrait, présentation, origine, première apparition, évolution, rétrospective, analyse, critique, actualité, créateur, annonce de série, recommandation, événement, crossover, chronologie, classement, sélection, hiérarchie cosmique, faction, quiz, débat, citation), les personnages de sa base locale, les formats, les périodes et les demandes de déclinaison ; signale ce qui manque et ce qui doit être vérifié, sans jamais inventer de faits.
- Compositeur (`studio-compositeur.js`) : 10 mises en scène distinctes (duel, équipes, héros, héros avec repère, une éditoriale, annonce, événement, liste, question, citation), ambiances d'univers (cosmique, urbain nocturne, mystique, technologique), recomposition réelle par format (paysage, portrait, carré) et carrousel en plans ; profil DA de l'utilisateur appliqué tel quel ; compositions entièrement éditables dans Motion Studio.
- Campagnes : planification (ex. « tout le mois de février, un super-héros noir différent chaque jour » → 28 publications, 28 personnages, 7 angles), calendrier mensuel avec glisser-déposer, vue liste, édition d'une publication (date, personnage, type, titre, accroche, format, statut, note), remplacement de personnage, ordre, duplication, suppression, validation ou refus individuel ; statuts idée, à produire, en cours, à valider, validé, exporté ; validation de la campagne ; calendrier CSV.
- Production par lot : produire, changer statut, format ou profil, décaler les dates, dupliquer, supprimer, exporter en ZIP (PNG pleine définition, une image par diapositive de carrousel, calendrier joint) ; dernière opération annulable ; un profil appliqué à des créations déjà produites ne change que leurs couleurs et leur système.
- Profils de direction artistique : analyse sur l'appareil d'une image de référence (palette médiane, luminosité, contraste, saturation, température, texture, masse et position du sujet, répartition de la lumière) → jetons de couleur et système graphique proposés, contraste texte/fond vérifié ; niveaux marque, campagne, création ; enregistrer, modifier, dupliquer, supprimer ; aperçu sur trois compositions. Polices et intention ne sont pas devinées : elles restent déclaratives.
- Motion Studio : ouverture d'une création par lien (`?creation=`), section « Direction artistique » du panneau Document (appliquer un profil), « Décliner dans ce format » recompose réellement une création issue de l'assistant.
- Bibliothèque centralisée : recherche (titre, personnage, dossier), filtres (format, origine, campagne), ouvrir, dupliquer, exporter, supprimer, export ZIP d'une sélection.
- Stockage : base locale version 3 (magasins `campagnes` et `profils` ajoutés, données existantes conservées) ; archive ZIP sans dépendance (`atelier/motion/zip.js`).
- Tests : 129 tests Motion Studio (dont 10 Node et 9 Chromium pour la production) ; 15 tests du moteur et 54 de l'Atelier inchangés.

## 0.7.0 · 2026-11-06 · studio créatif : finition, plans, modèles signature, vitrine

- Accueil : vitrine avec démonstration animée en direct (moteur de Motion Studio dans la page), trois points de départ, galerie, exports, confidentialité ; liens retour vers l'accueil depuis les deux outils.
- Interface de l'Atelier et de Motion Studio : thème neutre, jaune réservé à l'action et à la sélection, icônes dessinées, panneaux et séquenceur plus lisibles.
- Illustrations de démonstration originales (pop, noir, cosmos, encre), générées par `tools/gen-placeholders.mjs`.
- Atelier : 3 familles aux directions distinctes (affiche cinéma, duel, une éditoriale) : 11 familles, 25 variantes.
- Motion Studio : plans (états successifs d'une création) enchaînés par 6 transitions (fondu, volet, iris, zoom, éclair, glissement), lecture et exports de toute la séquence ; 4 modèles signature (affiche de cinéma, une de magazine, manifeste typographique, annonce en trois plans) ; vignettes des modèles rendues par le moteur ; 3 effets (brume, bandes cinémascope, impression décalée CMJ), 21 au total.
- Correctif : toucher le fond de la scène ne sélectionne plus un effet plein cadre.
- Tests : 109 tests Motion Studio (37 Node, 72 Chromium) ; 15 tests du moteur et 54 de l'Atelier, avec les 25 variantes.

## 0.6.0 · 2026-11-05 · lot 5 : Motion Studio, studio de composition et de motion design

- Éditeur de composition libre : page blanche ou modèle ; éléments texte, illustration, forme, effet, groupe ; manipulation directe sur la scène (déplacer, redimensionner, pivoter, pincer), sélection multiple et lasso, grouper, verrouiller, masquer, ordre, alignement et répartition, copier-coller, annuler et rétablir (120 étapes), règles, guides, grille, magnétisme, zones sûres, zoom.
- Typographie : hiérarchie par système, polices de la marque et polices locales importées, ajustement automatique ou taille fixe, contours, ombre, lueur, extrusion, dégradé, bandeau, déformations (arc, onde, inclinaison, impact, perspective).
- Illustrations : import multiple sans altération de l'original, recadrage sur la scène, 9 masques, contour, ombre, traitements non destructifs (fond uni retiré, noir et blanc, bichromie, contraste, luminosité, trame en points), remplacement en conservant les réglages.
- Bibliothèque graphique : 18 formes, bulles et cadres ; 18 effets (trames, papier, grain, motifs, vitesse, mouvement, explosion, impact, éclairs, énergie, rayons, lumière, dégradé, vignettage, particules, étoiles, nébuleuse, crépitement) ; 18 composants ; 6 systèmes graphiques et 16 palettes à jetons de couleur.
- Animation par calque : 13 entrées (dont lettre à lettre, mot à mot, machine à écrire, masques animés), 8 boucles, 8 sorties, 9 courbes et Bézier personnalisée, 12 préréglages et préréglages personnels, échelonnement, caméra et parallaxe, séquenceur.
- Formats : 12 formats (vidéo, réseaux, impression 300 dpi) et personnalisé jusqu'à 8192 px, adaptation de la composition et déclinaisons.
- Exports : PNG ×1 à ×4 et transparent, JPG, SVG autonome à calques, GIF (transparent possible), WebM image par image (WebCodecs, multiplexeur intégré), MP4 ou WebM en temps réel.
- Bibliothèque de travail : créations par dossiers et recherche, modèles intégrés (les 8 familles du MVP, entièrement éditables) et personnels, composants personnels, ressources, versions (manuelles et automatiques), sauvegarde automatique, stockage persistant demandé, projets `.motion.json` complets, export et import de toute la bibliothèque, conversion automatique des créations du MVP.
- Aucune dépendance ajoutée ; évaluation des bibliothèques de référence dans `docs/MOTION_STUDIO.md`.
- Tests : 93 tests Motion Studio (32 dans Node, 61 dans Chromium) ; 15 tests du moteur et 54 de l'Atelier inchangés.

## 0.5.0 · 2026-11-05 · lot 4 : Motion Studio

- Motion Studio dans l'Atelier (`atelier/motion/`, bouton dans l'en-tête de l'Atelier) : 8 familles de créations (annonce de série, couverture, personnage, équipe, crossover, dossier, hiérarchie cosmique, chronologie), 6 directions visuelles éditoriales et cinématographiques, 4 formats (16:9, 1:1, 4:5, 9:16).
- Textes, illustrations (import, recadrage, zoom), couleurs, effets réglables (trame, encrage, vitesse, lumière, particules, cosmique, grain), calques (sélection, masquage, ordre, position, échelle, opacité).
- 8 presets d'animation, durée, vitesse, titres lettre à lettre, volets de fin ; lecture, curseur, boucle.
- Sauvegarde automatique sur l'appareil, liste des créations, fichier `.motion.json` ; exports PNG, JPG, SVG, MP4 ou WebM selon le navigateur, GIF.
- Moteur sans dépendance (liste d'affichage, rendus canvas et SVG), encodeur GIF intégré ; évaluation des dépôts de référence dans `docs/MOTION_STUDIO.md`.
- Tests : 51 tests Motion Studio (`npm run test:motion`) ; 15 tests du moteur et 54 de l'Atelier inchangés et réussis.

## 0.4.0 · 2026-11-05 · lot 3 : Kiosque dans l'Atelier, infographies JSON

- Architecture commune des supports : registre unique (`templates/_systeme/registre.js`), format 16:9 1920 × 1080 ajouté, briques éditoriales partagées (`editorial.js`).
- Atelier : choix du support (Miniatures YouTube, Kiosque, Infographies), édition individuelle des 8 diapositives Kiosque, textes longs multilignes, aperçu aux proportions du support, exports à la taille du support, dernière création retrouvée par support. Miniatures inchangées.
- Infographies : spécification déclarative unique pour la validation (Atelier et Node) et le schéma `schemas/infographie.schema.json` ; gabarits chronologie et barres ; exemples `data/infographies/` ; erreurs localisées ; import et export JSON dans l'Atelier.
- Tests : 15 tests du moteur, 54 tests de bout en bout.

## 0.3.0 · 2026-11-05 · audit mobile + fondations du lot 3 (Kiosque)

- Atelier, corrections mobiles : orientation des photos de téléphone figée à l'import ; sélecteur de fichiers ouvert à toutes les images (galerie, appareil photo) ; sauvegarde automatique complète (images et recadrage compris) dans IndexedDB, un brouillon par famille ; résumé des contrôles à côté de l'aperçu ; bouton Partager (JPG) quand le système le permet ; familles et variantes sur une ligne défilante sous 600 px.
- Moteur : système de formats (miniature 1280 × 720, carrousel 1080 × 1350) sans modification des miniatures existantes.
- Gabarits Kiosque : 6 diapositives de carrousel et fiche personnage (8 variantes), exemples et planche 360 px.
- Tests : 10 tests unitaires du moteur, 37 tests de bout en bout de l'Atelier.

## 0.2.0 · 2026-11-05 · lot 2 (gabarits + Atelier prototype)

- Moteur de gabarits partagé (`templates/_systeme/`) : mesure du texte par métriques de police, ajustement automatique du titre, typographie française, contrôles de lisibilité et de débordement.
- 8 familles de miniatures, 19 variantes, SVG en calques nommés ; exemples JPG avec images PLACEHOLDER et planche de lisibilité à 168 px.
- Polices web WOFF2 (sous-ensembles latin + français, 61 Ko au total).
- Atelier prototype (`atelier/`) : saisie, import et recadrage tactile/souris, contrôles, exports PNG, JPG ≤ 2 Mo, SVG autonome, hors ligne.
- Serveur local sans dépendance (`tools/serve.mjs`) et 31 tests de bout en bout (`tools/test-atelier.mjs`).

## 0.1.1 · 2026-11-05 · vérification finale du lot 1

- Volet Adobe abandonné à votre demande : scripts de diagnostic, export ExtendScript des tokens et nuancier `.ase` retirés.
- Jaune : la proposition `#FFE500` devient un alias de la couleur d'origine de la miniature ; les trois jaunes d'origine restent des références (`color.original`). Comparaison mesurée : `docs/COULEUR_JAUNE.md`.
- Images de test renommées `PLACEHOLDER_*`.
- Nouveaux contrôles (`tools/validate.py`) : schéma JSON du manifeste, correspondance manifeste/fichiers dans les deux sens, SVG, PNG, polices et licences, marquages, exports de tokens, documentation.
- Dépendances figées : `requirements.txt`, `package-lock.json`.
- Documentation recentrée sur ce dépôt : contrat d'intégration externe retiré.
- Inventaire : 33 ressources, 109 fichiers (voir le bilan de la 0.1.1).

## 0.1.0 · 2026-11-05 · lot 1 (fondations, provisoire)

- Réorganisation du dépôt : `brand/`, `catalog/`, `schemas/`, `supabase/`, `tools/`, `docs/`, `presentations/`.
- Originaux conservés intacts dans `brand/00_originaux/` avec empreintes SHA-256.
- Vectorisation **non officielle** du logotype et du P, comparée à l'original (IoU ≥ 0,998 à ×4).
- Design tokens DTCG 2025.10 et exports CSS et JSON aplati (exports ExtendScript et `.ase` retirés en 0.1.1).
- Polices OFL : Anton, Instrument Serif, Archivo (dont Condensed), JetBrains Mono ; instances statiques pour les applications de bureau.
- 19 éléments graphiques SVG et leurs PNG 1x/2x (incision, filet, volet, sceau P non officiel, case-cadre, trame Ben-Day, 8 rubriques, 2 grilles).
- Catalogue `brand-manifest.json` (schéma v1) et contrôles `npm run check`.
- Schéma Supabase en brouillon, non appliqué.
