# Plan directeur

Statut : **proposition (phase 1)**. Le découpage des phases 2 à 8 n'a pas été fourni : il est proposé ici et doit
être approuvé ou corrigé (D-010), puis rapproché du dossier maître quand il sera disponible.

## 1. Objectif

Logiciel Windows professionnel de montage et de Motion Design, local-first, fiable, modulaire.
Règles absolues : `REQUIREMENTS_TRACEABILITY.md`.

## 2. Roadmap des huit phases

| Phase | Contenu | Critère de sortie |
|---|---|---|
| **1. Cadrage** | Inspection, évaluation des technologies, risques, architecture initiale, documentation | Livrables présents ; décisions en attente listées ; accord donné |
| **2. Prototypes décisifs** | Sur le poste Windows réel : P0 à P5 (voir `PROTOTYPE_RESULTS.md`). Code jetable | Chaque technologie « à tester » devient validée ou rejetée, preuve à l'appui ; architecture figée |
| **3. Socle** | Workspace Cargo par couches, contrats et génération des types, coquille Tauri, modèle de projet, opérations d'édition avec annuler/rétablir, stockage, sauvegarde et récupération, CI Windows | Un projet se crée, se modifie par opérations, se ferme brutalement et se récupère sans perte ; tests automatiques |
| **4. Montage** | Media Engine : import, analyse, proxys, timeline multipiste, lecture temps réel, coupes et trims, Task Graph et Scheduler | Montage simple lisible en temps réel sur la machine de référence |
| **5. Audio et export** | Audio Engine, mixage, mesures, synchronisation, exports, gestion des codecs, tâches longues annulables | Export conforme et synchrone, vérifié automatiquement |
| **6. Motion Design** | Motion Engine : calques, formes, texte, images clés, courbes, intégration à la timeline | Composition animée rendue à l'identique en prévisualisation et à l'export |
| **7. IA locale et extensions** | Local AI Runtime isolé (transcription, OCR, analyse, recherche), couche de plugins, interopérabilité | Fonctions IA utilisables hors ligne, annulables, sans effet sur la stabilité de la lecture |
| **8. Industrialisation** | Performance sur gros projets, robustesse, accessibilité, installeur signé, mise à jour hors ligne, documentation | Version candidate installable sur une machine vierge ; campagne de tests passée |

Les prototypes A1–A15 seront placés dans ces phases dès que leur définition sera disponible (B-002).

## 3. Registre des risques (hiérarchisé)

Gravité : ce qui est remis en cause si le risque se réalise.

| Rang | Risque | Gravité | Probabilité | Traitement |
|---|---|---|---|---|
| R1 | **Prévisualisation temps réel dans une WebView** : pas de surface native partagée ; chaque image doit traverser un canal | Architecture (choix de Tauri) | Élevée | P1 |
| R2 | **MLT sous Windows** : chaîne MinGW, mélange avec Rust MSVC, pas de binding, modules GPL, GPU limité | Architecture (moteur de montage) | Élevée | P2 ; replis identifiés |
| R3 | **Frontière MLT / Motion Engine / Skia** : deux compositeurs, double conversion d'images, rendu différent entre prévisualisation et export | Architecture | Moyenne à élevée | P3 |
| R4 | **Exigences inconnues** : dossier maître absent, 1 735 exigences non transcrites | Conformité de tout le projet | Certaine aujourd'hui | B-002 |
| R5 | **Environnement de développement non Windows** : rien de spécifique à Windows n'est vérifiable ici | Fiabilité des validations | Certaine aujourd'hui | B-001, D-002 |
| R6 | **Licences et brevets** : GPL (MLT, x264/x265), brevets H.264/HEVC/AAC, licences des modèles d'IA | Distribution | Moyenne | D-004 avant la phase 3 |
| R7 | **Horloge audio/vidéo** : deux chemins audio, dérive, latence | Qualité de lecture | Moyenne | P4 |
| R8 | **Intégrité des projets** : arrêt brutal, corruption, migration de format | Confiance des utilisateurs | Moyenne | P5 ; conception dès la phase 3 |
| R9 | **GPU** : diversité des pilotes, concurrence lecture / IA pour la VRAM, repli CPU | Performance | Moyenne | Scheduler ; repli CPU obligatoire et testé |
| R10 | **Codecs** : formats professionnels (ProRes, DNxHR, 10 bits, HDR, fréquence variable), décodage matériel | Couverture fonctionnelle | Moyenne | Matrice de formats cible à définir (D-006) |
| R11 | **Gros projets** : milliers de clips, UI de timeline, mémoire, index | Performance | Moyenne | Rendu canvas, virtualisation, jeux de données de test |
| R12 | **Tâches longues et processus enfants** : annulation, orphelins, reprise | Fiabilité | Moyenne | Job Objects Windows, supervision par le Core |
| R13 | **Isolation de l'IA** : plantage, mémoire, versions d'ORT en conflit | Stabilité | Moyenne | Processus dédiés, un seul ORT |
| R14 | **Packaging** : taille (FFmpeg, modèles, WebView2), signature de code, SmartScreen, antivirus | Installation | Moyenne | Essai d'installeur dès P0 |
| R15 | **Stockage et recherche** : écrivain unique SQLite, index volumineux | Performance | Faible | WAL, index reconstructible |
| R16 | **Confusion avec l'existant** : le dépôt contient déjà un « Motion Studio » web | Organisation | Moyenne | D-001 |
