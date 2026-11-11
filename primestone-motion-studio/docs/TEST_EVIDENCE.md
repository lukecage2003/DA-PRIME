# Preuves de test

Seuls figurent ici des tests réellement exécutés. Chaque entrée : date, environnement, commande, résultat, portée.

## Environnement E1 — conteneur cloud Linux (2026-11-11)

Ubuntu 24.04.5, 4 vCPU Xeon, 15 Gio, sans GPU, sans affichage. **Aucun résultat E1 ne vaut pour Windows.**

| ID | Commande (résumé) | Résultat | Portée |
|---|---|---|---|
| T-001 | `uname -a`, `/etc/os-release`, `lscpu`, `free -h`, `df -h` | Valeurs de `CURRENT_STATE.md` §2 | Inventaire |
| T-002 | `nvidia-smi`, `ls /dev/dri`, `vulkaninfo`, `$DISPLAY` | Tous absents | Pas de GPU ni d'affichage |
| T-003 | `<outil> --version` pour node, npm, pnpm, yarn, bun, rustc, cargo, rustup, gcc, clang, cmake, ninja, python3, git, ffmpeg, docker | Versions de `CURRENT_STATE.md` §2 | Inventaire |
| T-004 | `command -v` melt, sqlite3, wine, x86_64-w64-mingw32-gcc, cargo-tauri, dotnet | Tous absents | Inventaire |
| T-005 | `rustup target list --installed` | `x86_64-unknown-linux-gnu` seul | Pas de cible Windows |
| T-006 | `pkg-config --modversion` webkit2gtk-4.1, gtk+-3.0, libsoup-3.0, mlt-framework-7, mlt++-7, alsa, libavcodec, skia, vulkan | Tous absents (sqlite3 : 3.45.1) | Tauri/MLT/CPAL non compilables ici en l'état |
| T-007 | `ffmpeg -hwaccels` ; `ffmpeg -encoders` filtré ; options de configuration | hwaccels compilés : vdpau cuda vaapi qsv drm opencl vulkan. Encodeurs : libx264, libx265, libsvtav1, libaom-av1, libvpx(-vp9), prores(_ks,_aw), dnxhd, aac, libopus, *_nvenc, *_qsv. Build `--enable-gpl` | Présence dans le binaire seulement ; aucun encodage exécuté |
| T-008 | Python `sqlite3` : `CREATE VIRTUAL TABLE t USING fts5(a)`, insertion, `MATCH 'motion'`, `PRAGMA compile_options` | SQLite 3.53.1 ; 1 ligne trouvée ; `ENABLE_FTS5` présent | FTS5 fonctionnel dans ce SQLite ; ne prouve rien sur `rusqlite` ni sur le volume |
| T-009 | `curl` vers index.crates.io, registry.npmjs.org, static.rust-lang.org, github.com/mltframework | 200, 200, 200, **403** | Accès réseau du conteneur |
| T-010 | Recherche du dossier maître (`grep` dans le dépôt, `find` sur le disque : « dossier », « reprise ») | Aucun résultat | Dossier absent de l'environnement |

## Non exécuté pendant la phase 1

Aucune compilation, aucune installation, aucun encodage, aucun test Tauri, MLT, CPAL, Skia, OTIO, IA, GPU, packaging.

## Vérifications documentaires (web, 2026-11-11) — ce ne sont pas des tests

- Tauri : dernière version annoncée repérée, 2.12 (fin du support officiel de Windows 7). https://v2.tauri.app/blog/tauri-2.12
- MLT : le guide de compilation Windows officiel se déclare obsolète (MinGW) ; aucun support MSVC/vcpkg officiel
  trouvé. Recherche non concluante, à reprendre sur le dépôt MLT. https://mltframework.org/docs/windowsbuild/
- DirectML : en maintenance (« sustained engineering ») ; Microsoft oriente vers Windows ML, bâti sur ONNX Runtime,
  pour Windows 11 24H2+. Sources secondaires pour partie, pas de date de fin trouvée.
  https://github.com/microsoft/WindowsML ·
  https://blogs.windows.com/windowsdeveloper/2025/09/23/windows-ml-is-generally-available
