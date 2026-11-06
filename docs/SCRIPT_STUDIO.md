# Script Studio

`atelier/script/` · version 0.10.0 · local-first, hors ligne après une première visite, aucun service cloud, aucune clé API, aucun envoi de fichier.

Parcours d'un projet : **Projet → Sources → Analyse → Angle éditorial → Plan → Script → Analyse critique → Export**. Chaque étape affiche son état (terminé, à valider, à faire).

## Ce qui est réellement fait, et par quoi

| Niveau | Dans Script Studio | Statut |
|---|---|---|
| 1. Traitement déterministe local | durées, budgets de mots, architecture narrative, analyse critique par règles, rythme indicatif, comparaison de versions, exports, prompts | **fonctionnel** |
| 2. Extraction | pages des CBZ/ZIP (lecteur ZIP natif), des PDF (pdf.js), images ; empreintes SHA-256 ; doubles pages et doublons | **fonctionnel** (CBR non pris en charge) |
| 2 bis. OCR | point d'extension prévu (`MOTEURS.ocr` dans `comics.js`) | **non installé** : transcription manuelle |
| 3. Analyse structurelle | détection géométrique des cases (découpe XY sur les gouttières), ordre de lecture gauche→droite ou manga | **fonctionnel, fiabilité affichée** ; cases inclinées ou sans gouttière : découpe manuelle |
| 4. Compréhension sémantique | aucune génération de prose ; suggestions d'angles et de titres par règles ; noms récurrents relevés dans les transcriptions (marqués « incertain ») | **règles uniquement**, présentées comme telles |
| 5. Compréhension multimodale | point d'extension prévu (`MOTEURS.vision`) | **non installé** : les actions visibles sont décrites par l'utilisateur (provenance « visuel ») |

Le moteur **structure, mesure et signale** ; il ne rédige pas le script à la place de l'auteur. Pour une rédaction assistée, Prompt Studio prépare des instructions pour un modèle externe que l'utilisateur choisit lui-même et auquel il colle le texte (rien n'est envoyé automatiquement).

## Fonctions

- **Projets** : nom, sujet, type (12 types), plateforme (8), durée libre (« 30 s », « 1 h 30 », « 2:30 »…), public, objectif, ton, profondeur, profil d'écriture, sources, matière, comics associés, notes ; dupliquer, archiver, supprimer ; versions nommées, comparaison mot à mot, restauration ; annulation (Ctrl+Z) ; sauvegarde automatique.
- **Architecte éditorial** : 5 à 6 angles et des suggestions (question centrale, promesse, conflit, enjeu, point de vue, différenciation, titres, concepts de miniatures) ; chacune modifiable, acceptée ou rejetée individuellement ; lien vers Production pour composer la miniature.
- **Storytelling Engine** : 13 fonctions narratives (hook, promesse, contexte, enjeux, progression, révélation, tension, respiration, transition, rappel, payoff, conclusion, appel) ; squelettes différents par type ; architecture selon la durée (court ≤ 90 s, intermédiaire ≤ 12 min, long ≤ 45 min avec chapitres, très long avec parties, chapitres et rappels de contexte). Budget de mots selon la vitesse du profil (145 mots/min par défaut, ajustée par plateforme). **Aucun remplissage** : si la matière fournie ne couvre pas la durée, le plan est réduit et l'écart est signalé.
- **Comptage** : seuls les mots prononcés comptent ; repères non prononcés `[PAUSE 2s]`, `[SILENCE 3s]`, `[EXTRAIT 0:12]`, `[VISUEL …]`, `[MUSIQUE …]`, notes `//` ; noms de locuteurs (`NOM :`) exclus ; durée de narration, pauses, extraits, silences et dialogues distingués.
- **Analyse critique** (règles explicites) : hook faible ou trop long, hook sans tension, introduction trop longue, promesse non tenue, paragraphes denses, phrases trop longues (découpe proposée), clichés et expressions à éviter du profil, répétitions, budget dépassé ou insuffisant, rythme monotone, conclusion absente, écart de durée. Pour chaque point : passage, explication, correction ; **appliquée seulement si acceptée**. Courbe de rythme indicative (intensité déclarée, densité mesurée), sans prétention de prédire la rétention.
- **Adaptation** : YouTube, Shorts, TikTok, Reels, documentaire, podcast, interview, explicatif ; un nouveau projet indépendant dont le plan est reconstruit (le texte d'origine est donné en note, jamais simplement coupé).
- **Profils d'écriture** : langue, ton, style oral, niveau, humour, profondeur, vulgarisation, vitesse, complexité, expressions préférées et à éviter.
- **Comics** : import multiple (CBZ, ZIP, PDF, images), fiche du numéro (saisie par l'utilisateur ; série et numéro proposés d'après le nom de fichier, à vérifier), navigation page par page, réordonnancement, exclusion, doubles pages, doublons, recherche plein texte (métadonnées, analyses, transcriptions), arcs de plusieurs numéros, cases (détection géométrique et tracé manuel), transcription par case (type, personnage, statut lu / incertain / illisible — un texte illisible n'est jamais complété), notes visuelles, analyse par numéro (résumé, personnages, événements avec page, case, provenance, importance, fonction, révélation, flashback ; lieux, relations, incertitudes), validation humaine en 7 points, chronologie d'arc et personnages récurrents.
- **Comic-to-Script** : seuls les événements des numéros validés sont repris, avec leur provenance (dialogue, visuel, interprétation) et leur référence (numéro, page, case) ; les informations « incertaines » ne sont jamais utilisées automatiquement ; ordre chronologique conservé ; format court = essentiel seulement. Vue de correspondance script ↔ pages.
- **Prompt Studio** : 9 modèles (création, réécriture, amélioration, critique, storytelling, adaptation, analyse de comics, contexte, vérification des sources), versions compacte et détaillée, 32 variables remplies depuis le projet, estimation de jetons, modèles personnels, catégories, tags, favoris, historique, import/export. Copie uniquement.
- **Exports** : script complet, par chapitres, avec timecodes, avec références comics, avec indications visuelles, narration seule (Markdown/TXT), plan de montage (CSV), sous-titres de narration (SRT, importables dans Premiere Pro, DaVinci Resolve ou CapCut), projet complet (JSON). Aucune intégration directe à un logiciel de montage n'est revendiquée.

## Données et vie privée

IndexedDB de DA-PRIME, version 5 : `scripts`, `redaction`, `prompts`, `comics`, `pages` (copies des pages). Les fichiers d'origine ne sont jamais modifiés ni envoyés ; les comics ne sont jamais écrits dans le dépôt (`*.cbz`, `*.cbr` exclus par `.gitignore`). La sauvegarde complète de Motion Studio inclut les projets de scripts, profils et prompts ; les pages de comics (images) n'y figurent pas : conserver les fichiers d'origine.

## Audit des projets de référence (licences vérifiées le 2026-11-06)

| Projet | Licence | Classement | Ce qui a inspiré Script Studio |
|---|---|---|---|
| Story Architect (STARC) | GPL-3.0 | 3. Inspiration uniquement | cartes, chronologie, organisation des documents |
| Manuskript | GPL-3.0 | 3. Inspiration uniquement | plan hiérarchique, fiches, réorganisation des séquences |
| GenStory.cc | MIT | 2. Adaptation possible (non nécessaire) | local-first dans le navigateur, sauvegarde portable |
| Story Studio | MIT | 2. Adaptation possible (non nécessaire) | IA remplaçable qui propose, l'auteur accepte ; versions |
| Rescript | PolyForm Noncommercial 1.0 | 4. Exclusion (usage commercial interdit) | idée de timecodes et d'export vers le montage (conceptuel) |
| CineMatrix | MIT | 3. Inspiration (pile Python/React) | courbe de tension, temps narratifs, découpage |
| PromptDock | GPL-3.0 | 3. Inspiration uniquement | variables, catégories, favoris, import/export |
| pdf.js (pdfjs-dist 6.5.438) | Apache-2.0 | **1. Réutilisation directe** | intégré dans `atelier/vendor/pdfjs/`, chargé seulement à l'import d'un PDF |
| fflate | MIT | 2. Possible | non nécessaire : lecteur ZIP natif (DecompressionStream) |
| libarchive.js | MIT (WebAssembly) | 2. Possible | piste pour les CBR ; non intégré (2,3 Mo) |
| Tesseract.js (+ données de langue) | Apache-2.0 | 2. Adaptation possible | OCR local futur ; non intégré (données de 2 à 15 Mo par langue) |
| manga-ocr | Apache-2.0 (Python) | 2. Possible via un service local | OCR de bulles, hors navigateur |
| Kumiko | AGPL-3.0 | 3. Inspiration uniquement | détection des cases ; Script Studio a sa propre découpe |
| comic-text-detector | GPL-3.0 | 4. Exclusion pour réutilisation | — |
| Magi (compréhension de mangas) | licence non trouvée | 4. Exclusion tant que non clarifiée | — |
| onnxruntime-web | MIT | 2. Possible | exécution future d'un modèle local de détection ou de vision |

Aucun code GPL, AGPL ou non commercial n'a été repris : seules les idées fonctionnelles ont été étudiées.

## Fondation 0.11.0

### Base de connaissances (onglet Connaissances)
Chaque information est une **assertion** (`templates/_systeme/connaissances.js`) : contenu, catégorie (dialogue extrait, narration, élément visuel observable, interprétation, hypothèse, information incertaine), numéro, page, case, méthode d'extraction (`manuel`, `migration`, puis `ocr:…`, `vision:…`, `ecriture:…`), confiance, statut (brouillon, à vérifier, validée, rejetée) et historique.
- Transcriptions, événements et personnages saisis dans l'espace Comics y arrivent automatiquement (synchronisation, identifiants stables `tx:`, `ev:`, `pe:`).
- Une information modifiée après validation redevient « à vérifier ». Une source supprimée rend l'information « rejetée ».
- Un script ne reprend que des informations **validées** de catégorie dialogue, narration, visuel ou interprétation. Avant export, un contrôle signale toute matière dont la source n'est plus validée ; l'export est alors marqué BROUILLON.
- Les futurs moteurs n'écriront qu'en « à vérifier » : rien n'entre dans un script sans relecture humaine.

### File de traitements
`atelier/script/taches.js` : une tâche à la fois, progression, annulation, erreurs ; une tâche en cours au moment d'une fermeture de page devient « interrompue » et se reprend au point d'arrêt (ou se relance depuis le début). Les traitements d'images tournent dans un Web Worker (`worker-taches.js`), par exemple la détection des cases d'un numéro entier.

### Capacités et profils (onglet Moteurs)
- Navigateur : cœurs logiques, mémoire approximative (plafonnée à 8 Go par le navigateur), nom de la carte graphique, WebGPU, quota de stockage — chaque valeur avec sa source. La mémoire vidéo n'est pas mesurable depuis un navigateur : elle reste « inconnue ».
- Serveur local (mesures réelles du PC : RAM, processeurs, disque, mémoire vidéo NVIDIA via `nvidia-smi`) :

```bash
node tools/serveur-moteurs.mjs
```

Mode réseau local (téléphones et tablettes ; jeton obligatoire, affiché au démarrage avec une adresse prête à ouvrir) :

```bash
node tools/serveur-moteurs.mjs --reseau
```

- Profils mobile, léger, standard, qualité (`templates/_systeme/moteurs.js`) : recommandés d'après les capacités mesurées uniquement ; une capacité inconnue donne le profil léger.

### Moteurs (architecture, aucun installé)
Trois moteurs indépendants et remplaçables : **OCR Engine**, **Comic Vision Engine**, **Local Writing Engine**. Seuls les adaptateurs manuels sont disponibles en 0.11.0 ; Tesseract.js (0.11.1), vision Ollama (0.11.2) et rédaction Ollama (0.11.3) sont déclarés « prévus ». Le test Ollama vérifie seulement qu'un serveur local répond et liste ses modèles déjà installés ; les adresses publiques sont refusées.

## Validation sur 10 comics réels

Les fichiers restent sur votre disque : jamais dans le dépôt (`.gitignore` exclut CBZ, CBR, CB7 ; ne placez pas de PDF de comics dans le dossier du projet).

1. Réunir 10 numéros variés dans un dossier **hors du dépôt** : grilles classiques, pages pleine page, cases inclinées, doubles pages, numérisations de qualité moyenne, lettrage stylisé.
2. Mesure automatique (import, pages, doublons, doubles pages, cases, temps) — le rapport est écrit dans ce même dossier :

```bash
node tools/valider-comics.mjs ~/comics-validation
```

3. Dans Script Studio : importer chaque numéro, lancer « Tout le numéro (arrière-plan) », puis vérifier dans la visionneuse 5 pages par numéro (cases justes, fusionnées, manquantes) et noter le résultat par fiabilité annoncée (bonne, moyenne, faible).
4. Transcrire 2 pages par numéro, analyser le numéro, valider ; vérifier dans Connaissances que chaque information porte numéro, page et case, puis construire un script de test et contrôler l'export.
5. Lancer `node tools/serveur-moteurs.mjs` sur le PC prévu pour les moteurs et noter le profil recommandé (RAM, mémoire vidéo, disque).

Ces mesures serviront de référence pour l'OCR (0.11.1) : taux de mots corrects par type de lettrage.

### Résultats sur 5 numéros réels (2026-11-06)

| Numéro | Pages | Doubles pages | Cases bonne / moyenne / faible | Import + cases |
|---|---|---|---|---|
| Immortal Hulk #1 (2018) | 33 | 2 | 21 / 0 / 12 | 5,6 s |
| Immortal Hulk #2 | 24 | 1 | 16 / 0 / 8 | 3,1 s |
| Immortal Hulk #3 | 24 | 2 | 10 / 0 / 14 | 2,9 s |
| The Ultimates #1 (2016) | 24 | 3 | 1 / 1 / 22 | 2,5 s |
| The Ultimates #4 | 22 | 3 | 2 / 0 / 20 | 2,6 s |

Contrôle visuel : grilles classiques (Hulk) bien découpées, mais certaines pages « bonne » fusionnent deux cases ; couvertures, pleines pages et pages de texte correctement signalées « faible » ; mises en page inclinées ou à fond perdu (Ultimates) presque toutes « faible » — la fiabilité annoncée est honnête, la découpe automatique n'y suffit pas (tracé manuel).

## Limites

- Pas de prose générée : l'auteur écrit (ou colle le texte d'un outil externe qu'il a choisi).
- CBR non pris en charge (convertir en CBZ).
- OCR, vision et rédaction locales non installés (architecture prête, adaptateurs manuels seulement).
- Mémoire vidéo mesurée seulement via le serveur local et sur carte NVIDIA.
- Détection des cases fiable sur des gouttières nettes seulement.
- Analyse critique par règles : utile, mais ni exhaustive ni infaillible ; le rythme est une estimation.
- Les PDF sont rendus à 2400 px maximum par page.
