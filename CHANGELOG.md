# Journal des versions

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
