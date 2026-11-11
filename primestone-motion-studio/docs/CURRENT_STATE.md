# État courant

Mis à jour : 2026-11-11 · Phase 1/8 (cadrage) · Aucun code applicatif n'existe.

## 1. Constats majeurs de l'inspection

1. **L'environnement inspecté n'est pas Windows.** C'est un conteneur cloud Linux éphémère, sans GPU ni affichage.
   Aucune validation Windows (MSVC, WebView2, WASAPI, DirectX, packaging) n'a pu y être faite. → B-001
2. **Le dossier maître de reprise (11 novembre 2026) n'a pas été trouvé** : ni joint à la demande, ni dans le dépôt,
   ni sur le disque. Les 1 735 exigences et la définition des prototypes A1–A15 sont donc inconnues ici. → B-002
3. **Le répertoire de travail n'est pas vide.** `/workspace/DA-PRIME` contient un projet existant,
   `primestone-brand` 0.9.1 (bibliothèque de marque et studio web HTML/JS, 346 fichiers suivis, 40 Mo), qui comprend
   déjà un module nommé « Motion Studio » (`atelier/motion/`). Rien n'en a été repris, modifié ni supprimé. → D-001

## 2. Environnement réellement mesuré

| Élément | Valeur constatée | Conséquence |
|---|---|---|
| Système | Ubuntu 24.04.5 LTS, noyau 6.18, x86_64 (VM) | Pas de Windows |
| Processeur | Intel Xeon 2,10 GHz, 4 vCPU, 1 thread/cœur | Mesures de performance non représentatives |
| Mémoire | 15 Gio, pas de swap | — |
| Stockage | 252 Go, 30 Go disponibles | Suffisant pour documents et petits prototypes |
| GPU / VRAM | Aucun (`nvidia-smi` absent, pas de `/dev/dri`, pas de Vulkan) | Aucun test GPU possible |
| Affichage | Ni `DISPLAY` ni Wayland | Aucune fenêtre native ; Chromium headless seulement |
| Node / npm | 22.23.4 / 10.9.9 (pnpm 10.28.0, yarn 1.22.22, bun 1.4.4) | Suffisant pour l'UI |
| Rust / Cargo | 1.97.0 / 1.97.0, rustup 1.28.2 | Cible installée : `x86_64-unknown-linux-gnu` uniquement |
| Cibles Windows Rust | Absentes (`x86_64-pc-windows-msvc`, `-gnu`) ; pas de MinGW, pas de Wine | Pas de compilation croisée |
| Visual Studio Build Tools | Sans objet sur Linux | À vérifier sur le poste Windows |
| C/C++ | gcc 13.3, clang 18.1.3, cmake 3.28.3, ninja 1.11.1 | — |
| Python | 3.13.18 ; `onnxruntime` 1.29.0 présent | — |
| FFmpeg | 6.1.1 (build Ubuntu, `--enable-gpl`, x264, x265) | Build GPL : non redistribuable tel quel |
| MLT (`melt`) | Absent | Non testé |
| SQLite | CLI absente ; bibliothèque 3.53.1 via Python, FTS5 actif | FTS5 testé (trivial, Linux) |
| Bibliothèques Tauri Linux | `webkit2gtk-4.1`, `gtk+-3.0`, `libsoup-3.0` absentes | Tauri non compilable ici sans installation |
| CLI Tauri | Absente | — |
| Docker | 29.9.2 | — |
| Réseau | crates.io, npm, static.rust-lang.org joignables ; pages `github.com` de MLT refusées (403 du proxy) | Sources MLT inaccessibles ici |

Détail des commandes : `TEST_EVIDENCE.md`.

## 3. Bilan

**Validé (par exécution réelle)**
- Chaîne Rust et Node présentes et récentes dans le conteneur.
- SQLite FTS5 : création d'une table virtuelle, insertion, requête `MATCH` (Linux, Python).
- FFmpeg 6.1.1 présent ; liste des encodeurs et accélérations compilés relevée (compilés ≠ utilisables : pas de GPU).

**Évalué sur documentation et connaissances, non testé**
- Les 15 technologies de la matrice (`ARCHITECTURE.md` §4). Aucune n'a le statut « validé ».

**Non validé**
- Tout ce qui est spécifique à Windows ; MLT ; lecture temps réel ; GPU ; audio ; IA locale ; packaging.
- La roadmap des phases 2 à 8 et l'architecture : propositions, à approuver.

**Bloqué**
- B-001 poste Windows non inspecté · B-002 dossier maître absent · B-003 emplacement du projet. Voir `BLOCKERS.md`.
