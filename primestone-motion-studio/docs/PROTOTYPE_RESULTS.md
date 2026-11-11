# Prototypes

## 1. Prototypes historiques A1–A15

Leur définition se trouve dans le dossier maître, **absent** (B-002). Aucun libellé n'est reconstitué ici.
Les identifiants A1 à A15 sont réservés. La colonne « Correspondance » ci-dessous sera remplie à réception du dossier.

## 2. Prototypes de levée de risque proposés (phase 2)

Identifiants provisoires P0–P5, pour ne pas empiéter sur A1–A15. Tous à réaliser **sur le poste Windows cible**.
Code jetable, limité dans le temps, avec un critère chiffré décidé avant l'exécution.

| ID | Question tranchée | Contenu minimal | Critère de réussite (seuils à confirmer) | Invalide si échec | Correspondance A |
|---|---|---|---|---|---|
| **P0** | La chaîne Windows fonctionne-t-elle de bout en bout ? | Inventaire du poste ; Tauri 2 + React vide ; une commande, un événement, un flux ; installeur NSIS testé | Compilation, exécution et installation sans intervention manuelle | Rien (prérequis de tout le reste) | à établir |
| **P1** | Peut-on afficher la vidéo de façon fluide dans l'UI ? | Images 1080p puis 4K produites côté Rust, affichées par 3 voies comparées : (a) canal binaire → WebGL/WebGPU, (b) mémoire partagée, (c) fenêtre native enfant sous la WebView | 1080p à 60 i/s stable, latence et charge CPU mesurées ; comportement en redimensionnement | **Tauri** comme conteneur, ou le mode d'affichage | à établir |
| **P2** | MLT est-il intégrable et suffisant sous Windows ? | Obtenir MLT (binaires MSYS2 puis compilation) ; le piloter depuis Rust en lié *et* en processus séparé ; timeline 3 pistes, recherche à l'image, lecture, rendu ; inventaire des licences des modules utilisés | Précision à l'image, recherche < seuil, lecture temps réel 1080p, aucun module GPL requis (si D-004 l'exige) | **MLT** → repli (b) ou (c) de la matrice | à établir |
| **P3** | Qui compose l'image finale ? | Une scène animée simple (texte, forme, images clés) rendue par Skia, insérée dans une timeline ; comparaison prévisualisation / export | Rendu identique entre les deux chemins ; coût par image mesuré | Le partage MLT / Motion Engine | à établir |
| **P4** | Qui tient l'horloge audio ? | Lecture A/V avec sortie CPAL (WASAPI) et avec la sortie de MLT ; mesure de la dérive sur 10 min | Dérive < 1 image, pas de coupure sous charge | CPAL ou la sortie audio de MLT | à établir |
| **P5** | Un projet survit-il à un arrêt brutal ? | Journal d'opérations + SQLite WAL ; arrêt forcé du processus pendant des écritures, 1 000 répétitions | Zéro projet irrécupérable, zéro opération validée perdue | Le schéma de persistance | à établir |

**Ordre et justification** : P0 d'abord (prérequis). P1 et P2 ensuite, car ce sont les deux seuls qui peuvent
renverser un choix structurant (conteneur, moteur de montage) ; tout développement fait avant eux serait à risque.
P3 dépend de P2. P4 et P5 sont indépendants et peuvent être menés en parallèle.

Reportés aux phases concernées, car ils n'invalident pas l'architecture : IA locale (isolée en processus, donc
remplaçable), OpenTimelineIO, plugins.

## 3. Résultats

Aucun prototype exécuté à ce jour.

| ID | Date | Environnement | Résultat mesuré | Conclusion | Preuve (`TEST_EVIDENCE.md`) |
|---|---|---|---|---|---|
| — | — | — | — | — | — |
