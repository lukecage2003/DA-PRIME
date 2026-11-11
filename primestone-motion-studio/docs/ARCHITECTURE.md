# Architecture

Statut du document : **proposition initiale (phase 1)**, à approuver. Rien n'est implémenté.
Les choix de technologies restent ceux de la matrice (§4) : aucune n'est « validée » tant qu'un prototype Windows
ne l'a pas prouvé.

## 1. Principes

1. **Le Core Rust est la seule autorité** sur l'état des projets. Toute modification passe par une opération
   d'édition validée, journalisée et annulable. L'UI et les moteurs ne modifient jamais un projet directement.
2. **Dépendances à sens unique** : UI → Contrats → Core → interfaces de moteurs ← implémentations de moteurs.
   Un moteur ne connaît ni l'UI ni un autre moteur ; il implémente un trait défini par le Core.
3. **Médias originaux en lecture seule.** Tout résultat (proxy, cache, rendu, analyse) est écrit ailleurs.
4. **Hors ligne par défaut.** Aucun composant ne requiert réseau, compte ou service distant.
5. **Isoler ce qui peut planter ou contaminer la licence** : moteurs natifs lourds et IA dans des processus séparés.
6. **Chaque moteur est remplaçable** : le Core dépend d'une interface, jamais de MLT, FFmpeg ou Skia en propre.

## 2. Vue logique

```
┌──────────────────────── Desktop Application (Tauri 2, un processus principal) ───────────────────────┐
│  UI Layer (React + TypeScript, WebView2)                                                              │
│      │  commandes ▼            ▲ événements            ▲ flux (images, formes d'onde, progression)    │
│  ───────────────── Command / Event / Stream Contracts (schémas versionnés) ─────────────────          │
│      ▼                                                                                                │
│  Rust Core                                                                                            │
│   ├─ Edit Operations Engine      modèle de projet, validation, annuler/rétablir, journal              │
│   ├─ Production Task Graph       graphe de tâches dérivées (proxy, analyse, rendu, export)            │
│   ├─ Resource Scheduler          arbitrage CPU / GPU / VRAM / disque, priorités, annulation           │
│   ├─ Project & Storage Layer     fichier projet, SQLite + FTS5, caches, sauvegardes, récupération     │
│   └─ Engine Ports (traits)       MediaEngine · MotionEngine · AudioEngine · AiRuntime · Interchange   │
│      ▲ implémentés par                                                                                │
└──────┼────────────────────────────────────────────────────────────────────────────────────────────────┘
       │ IPC local (canal de contrôle + mémoire partagée pour les images)
  ┌────┴─────────┬────────────────┬───────────────┬─────────────────┬──────────────────────┐
  │ Media Engine │ Motion Design  │ Audio Engine  │ Local AI Runtime│ Plugin / Extension   │
  │ (MLT ?,      │ Engine (Skia ?)│ (CPAL ?)      │ (processus      │ Layer (hôte isolé,   │
  │  FFmpeg)     │                │               │  dédiés)        │  permissions)        │
  └──────────────┴────────────────┴───────────────┴─────────────────┴──────────────────────┘
```

## 3. Responsabilités et règles de communication

| Couche | Responsabilités | Peut appeler | Ne doit jamais |
|---|---|---|---|
| **Desktop Application** | Cycle de vie, fenêtres, supervision des processus enfants, mises à jour locales, journaux | Core | Contenir de la logique métier |
| **UI Layer** | Présentation, saisie, état d'affichage éphémère (sélection, zoom, panneaux) | Contrats uniquement | Écrire dans un projet, lire un média ou la base directement, parler à un moteur |
| **Contracts** | Types de commandes (requête/réponse), événements (diffusion), flux (données volumineuses, avec contre-pression). Définis une fois en Rust, types TypeScript générés. Versionnés | — | Contenir de la logique |
| **Rust Core** | Orchestration, autorité sur le projet, application des règles absolues | Ses sous-modules, les ports de moteurs | Dépendre d'un type propre à une bibliothèque de moteur |
| **Edit Operations Engine** | Modèle de données du projet ; opérations atomiques, validées, inversibles ; transactions ; historique | Storage | Effectuer un traitement média |
| **Production Task Graph** | Décrit le travail dérivé comme un graphe de tâches avec dépendances et clés de cache ; reprise après arrêt | Scheduler, ports | Modifier le projet (il émet une demande d'opération vers l'Edit Engine) |
| **Resource Scheduler** | Budgets CPU/GPU/VRAM/E/S ; la lecture interactive prime sur le travail de fond ; annulation, pause | Ports | Décider du contenu du travail |
| **Media Engine** | Décodage, composition de la timeline, effets, rendu, export, proxys | Bibliothèques média | Connaître le format de projet ; écrire hors des dossiers de sortie alloués |
| **Motion Design Engine** | Évaluation d'une scène animée (calques, formes, texte, images clés, courbes) → images | Bibliothèque graphique | Idem |
| **Audio Engine** | Sortie/entrée périphérique, mixage, mesures, horloge de lecture | API audio | Bloquer le fil temps réel sur de l'E/S ou un verrou |
| **Local AI Runtime** | Chargement de modèles locaux, inférence (transcription, OCR, analyse, texte). Jamais de génération d'images | Moteurs d'inférence | Accéder au réseau ; modifier un projet (il renvoie des *propositions* que le Core transforme en opérations) |
| **Project & Storage** | Persistance, index et recherche, caches, sauvegarde automatique, instantanés, vérification d'intégrité, migrations | SQLite, système de fichiers | Toucher aux médias originaux |
| **Plugin / Extension Layer** | Chargement d'extensions avec permissions déclarées ; elles n'accèdent qu'aux mêmes contrats que l'UI ou à des ports dédiés | Contrats | Accéder au Core en mémoire ou au disque sans permission |

Règles transverses :
- **Commandes** : UI → Core, courtes, typées, réponse immédiate. Une tâche longue renvoie un identifiant de tâche.
- **Événements** : Core → UI, à sens unique, pour toute évolution d'état. L'UI se resynchronise depuis le Core.
- **Flux** : canal distinct pour les images de prévisualisation, formes d'onde et vignettes. Jamais en JSON.
- **Moteurs ↔ Core** : le Core appelle, le moteur répond et notifie. Un moteur ne rappelle jamais l'UI.
- **Pas de dépendance circulaire** : vérifiable mécaniquement (structure du workspace Cargo, un crate par couche).

## 4. Matrice de validation des technologies

Statuts possibles : validé · candidat · à tester · rejeté. « À tester » = un prototype précis conditionne le choix.
Aucune technologie n'a été testée sous Windows à ce jour.

| Technologie | Rôle | Windows | Contraintes et dépendances | Limites techniques / juridiques | Risques d'intégration | Alternatives | Statut |
|---|---|---|---|---|---|---|---|
| **Tauri 2** (2.12 repérée) | Conteneur desktop, fenêtres, IPC, processus annexes, installeur | Bonne. Repose sur WebView2 (présent sur Windows 10/11 à jour) | Rust MSVC, Build Tools + SDK Windows, WebView2 | MIT/Apache-2.0. Le rendu passe par un navigateur : **pas de surface vidéo native partagée avec la page** | Affichage d'images vidéo à cadence fluide dans la WebView ; latence IPC ; version de WebView2 non maîtrisée (Evergreen) ou +~180 Mo (version fixe) | Electron (plus lourd, même problème) ; Qt/QML (C++, LGPL) ; UI Rust native (egui, Slint) | **À tester** (P1) |
| **React + TypeScript** | Interface | Sans réserve | Bundler (Vite), bibliothèque d'état | Le DOM ne tient pas une timeline dense | Timeline, formes d'onde et moniteur doivent être dessinés sur canvas/WebGL/WebGPU, pas en DOM | Solid, Svelte (gain marginal ici) | **Candidat** (fort) |
| **Rust** | Core, contrats, orchestration | Excellente (MSVC) | Build Tools ; FFI C/C++ pour les moteurs | — | Coût des liaisons FFI vers des bibliothèques C++ sans binding maintenu (MLT, OTIO) | C++ (cohérent avec MLT/Qt, moins sûr) | **Candidat** (fort) |
| **MLT** | Moteur de montage : timeline multipiste, transitions, filtres, rendu | **Incertaine.** Compilé de fait avec MinGW/MSYS2 (c'est ainsi que Shotcut et Kdenlive le livrent) ; guide Windows officiel déclaré obsolète ; pas de support MSVC officiel trouvé | Nombreuses dépendances (FFmpeg, frei0r, SDL2, Qt pour certains modules…) ; pas de binding Rust maintenu connu | Cœur LGPL-2.1 ; **plusieurs modules GPL** ; traitement surtout CPU, 8 bits historiquement, pipeline GPU (Movit/OpenGL) fragile ; modèle interne propre (XML) à faire coïncider avec le modèle du Core | Mélange Rust MSVC / DLL MinGW ; chaîne de compilation à maintenir ; stabilité en processus ; contamination GPL ; précision à l'image et recherche rapide à vérifier | (a) MLT dans un processus séparé piloté par IPC ; (b) moteur propre sur FFmpeg + wgpu ; (c) GStreamer + GES (LGPL, MSVC officiel) | **À tester** (P2, décisif) |
| **FFmpeg** | Analyse, décodage/encodage, proxys, exports, formats | Excellente | Build à produire ou choisir (LGPL vs GPL) | LGPL si compilé sans composants GPL ; x264/x265 = GPL ; **brevets** H.264/HEVC/AAC selon l'usage commercial ; ProRes non officiel | Appel en processus (simple, isolant, progression à analyser) ou lié (rapide, contraignant) ; encodeurs matériels variables selon GPU | Media Foundation (codecs système licenciés), encodeurs matériels NVENC/QSV/AMF | **Candidat** (fort) ; build et politique de codecs à décider |
| **SQLite + FTS5** | Index des médias, métadonnées, recherche plein texte, catalogue | Excellente | `rusqlite` avec SQLite embarqué | Domaine public. Un seul écrivain à la fois | Faible. Séparer le *document projet* de l'*index reconstructible* ; mode WAL | Tantivy pour une recherche plus riche (plus tard) | **Candidat** (fort) ; FTS5 vérifié trivialement sur Linux (T-008) |
| **CPAL** | Entrées/sorties audio bas niveau | Bonne (WASAPI) ; ASIO optionnel | — | Apache-2.0. ASIO impose le SDK Steinberg et sa licence. **Ce n'est qu'une couche périphérique**, pas un moteur de mixage | **Recouvrement avec MLT**, qui possède sa propre sortie audio : il faut un seul maître d'horloge A/V | Sortie audio de MLT (SDL2) ; WASAPI direct ; `rodio`/`kira` au-dessus de CPAL | **À tester** (P4) |
| **OpenTimelineIO** | Échange de timelines | Bonne (C++/Python) | Cœur C++ ; adaptateurs (EDL, FCPXML, AAF…) en modules Python séparés ; pas de binding Rust officiel | Apache-2.0. Ne transporte pas fidèlement effets ni animation | Embarquer Python, lier le C++, ou lire/écrire le JSON `.otio` directement en Rust | Lecteur/écrivain `.otio` natif en Rust + EDL/FCPXML écrits à la main | **Candidat** (non bloquant, phase tardive) |
| **Skia** | Rendu 2D vectoriel/texte du Motion Design | Bonne via `skia-safe` (binaires précompilés MSVC) | Compilation longue si pas de binaire ; backend GPU (D3D/Vulkan/GL) à choisir | BSD-3 | Poids ; partage de textures GPU avec le moteur vidéo ; **frontière floue avec la composition de MLT** | Vello + wgpu (Rust, plus jeune) ; tiny-skia (CPU) ; Direct2D/DirectWrite | **Candidat** ; à tester avec P3 |
| **llama.cpp** | Modèles de langage locaux (assistance, classement, résumé) | Bonne (CPU, CUDA, Vulkan) | Modèles GGUF de plusieurs Go ; VRAM | MIT ; **licences des modèles variables** | Concurrence GPU avec la lecture vidéo ; à isoler en processus | Runtime GGUF de Windows ML (expérimental) ; ORT GenAI | **Candidat** |
| **ONNX Runtime** | Inférence générique (vision, audio, OCR) | Excellente | Choix du fournisseur d'exécution : CPU, CUDA, DirectML… | MIT. DirectML est en maintenance | Taille des binaires ; conflits de versions d'ORT entre composants | — | **Candidat** (fort) |
| **WinML** (Windows ML) | Variante d'ORT fournie par Windows avec sélection du matériel | Windows 11 24H2+ seulement (à confirmer) | Windows App SDK | Redondant avec ORT embarqué ; exclut Windows 10 | Dépendance à la version de l'OS ; API pensée pour C#/C++ | ORT embarqué | **Candidat faible** : dépend de la version minimale de Windows (D-005) |
| **whisper.cpp** | Transcription locale | Bonne (CPU, CUDA, Vulkan) | Modèles 75 Mo à 3 Go | MIT | Lenteur sur CPU pour les grands modèles | sherpa-onnx, faster-whisper | **Candidat** |
| **sherpa-onnx** | Reconnaissance vocale en flux, détection de parole, séparation des locuteurs | Bonne (repose sur ORT) | Embarque son ORT | Apache-2.0 | **Recouvre whisper.cpp** ; conflit de versions d'ORT possible | whisper.cpp + VAD séparé | **Candidat** : arbitrer avec whisper.cpp (D-008) |
| **PaddleOCR** | Lecture de texte dans l'image | Moyenne en natif (PaddlePaddle + Python lourds) | — | Apache-2.0 | Embarquer Python/Paddle est disproportionné | **Modèles PP-OCR convertis en ONNX, exécutés par ORT** ; OCR Windows intégré | **À tester** sous la forme ONNX ; runtime Paddle natif **déconseillé** |

## 5. Contradictions et recouvrements relevés (non résolus)

Signalés pour arbitrage, pas tranchés :

- **C-1 · MLT / Skia / Motion Design Engine** : MLT compose déjà des images. Qui compose l'image finale, et le Motion
  Engine est-il une source pour MLT, ou MLT une source pour un compositeur propre ? (P3)
- **C-2 · MLT / CPAL** : deux chemins audio possibles ; un seul doit tenir l'horloge. (P4)
- **C-3 · ONNX Runtime / WinML / sherpa-onnx** : trois porteurs d'ORT potentiellement en versions différentes.
- **C-4 · whisper.cpp / sherpa-onnx** : même fonction principale.
- **C-5 · Modèle de projet** : le Core fait autorité, mais MLT a son propre modèle. Le modèle MLT doit rester une
  *projection dérivée* du modèle du Core, jamais l'inverse.
- **C-6 · GPL** : plusieurs modules MLT et un FFmpeg avec x264/x265 sont GPL. Compatible ou non selon la licence
  et le mode de distribution visés pour l'application (D-004).
- **C-7 · « Aucune intégration Adobe » et interopérabilité** : les formats d'échange neutres (EDL, FCPXML, AAF via
  OTIO) sont-ils dans le périmètre même s'ils servent aussi à des logiciels Adobe ? (D-009)
