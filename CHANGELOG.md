# Journal des versions

## 0.1.1 · 2026-11-05 · vérification finale du lot 1

- Volet Adobe abandonné à votre demande : scripts de diagnostic, export ExtendScript des tokens et nuancier `.ase` retirés.
- Jaune : la proposition `#FFE500` devient un alias de la couleur d'origine de la miniature ; les trois jaunes d'origine restent des références (`color.original`). Comparaison mesurée : `docs/COULEUR_JAUNE.md`.
- Images de test renommées `PLACEHOLDER_*`.
- Nouveaux contrôles (`tools/validate.py`) : schéma JSON du manifeste, correspondance manifeste/fichiers dans les deux sens, SVG, PNG, polices et licences, marquages, exports de tokens, documentation.
- Dépendances figées : `requirements.txt`, `package-lock.json`.
- Inventaire : 33 ressources, 109 fichiers (voir le bilan de la 0.1.1).

## 0.1.0 · 2026-11-05 · lot 1 (fondations, provisoire)

- Réorganisation du dépôt : `brand/`, `catalog/`, `schemas/`, `supabase/`, `tools/`, `docs/`, `presentations/`.
- Originaux conservés intacts dans `brand/00_originaux/` avec empreintes SHA-256.
- Vectorisation **non officielle** du logotype et du P, comparée à l'original (IoU ≥ 0,998 à ×4).
- Design tokens DTCG 2025.10 et exports CSS et JSON aplati (exports ExtendScript et `.ase` retirés en 0.1.1).
- Polices OFL : Anton, Instrument Serif, Archivo (dont Condensed), JetBrains Mono ; instances statiques pour les applications de bureau.
- 19 éléments graphiques SVG et leurs PNG 1x/2x (incision, filet, volet, sceau P non officiel, case-cadre, trame Ben-Day, 8 rubriques, 2 grilles).
- Catalogue `brand-manifest.json` (schéma v1) et contrôles `npm run check`.
- Schéma Supabase en brouillon, non appliqué. Contrat de compatibilité Studio proposé.
