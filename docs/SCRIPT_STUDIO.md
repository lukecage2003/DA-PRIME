# Script Studio

`atelier/script/` · version 0.10.0 · local-first, hors ligne après une première visite, aucun service cloud, aucune clé API, aucun envoi de fichier.

Parcours d'un projet : **Projet → Sources → Analyse → Angle éditorial → Plan → Script → Analyse critique → Export**. Chaque étape affiche son état (terminé, à valider, à faire).

## Ce qui est réellement fait, et par quoi

| Niveau | Dans Script Studio | Statut |
|---|---|---|
| 1. Traitement déterministe local | durées, budgets de mots, architecture narrative, analyse critique par règles, rythme indicatif, comparaison de versions, exports, prompts | **fonctionnel** |
| 2. Extraction | pages des CBZ/ZIP (lecteur ZIP natif), des PDF (pdf.js), images ; empreintes SHA-256 ; doubles pages et doublons | **fonctionnel** (CBR non pris en charge) |
| 2 bis. OCR | Tesseract.js 7 (WebAssembly, dans le navigateur), modèles *fast* français et anglais installés à la demande ; résultats « à vérifier » | **fonctionnel (0.11.1)** ; lettrage stylisé, effets sonores et petit texte peu fiables |
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

Mode réseau local (téléphones et tablettes ; jeton obligatoire). Le jeton n'est accepté que dans l'en-tête `X-DA-PRIME-Jeton` (jamais dans l'adresse d'une requête). L'adresse prête à ouvrir le place après « # » (`…/atelier/script/#moteurs&jeton=…`) : cette partie n'est jamais envoyée au serveur, et DA-PRIME la retire de la barre d'adresse dès l'ouverture. Le jeton n'est affiché que dans un terminal interactif (sortie redirigée vers un fichier : masqué). Pour qu'il n'apparaisse pas dans l'historique du navigateur, le saisir plutôt dans Moteurs › Jeton :

```bash
node tools/serveur-moteurs.mjs --reseau
```

- Profils mobile, léger, standard, qualité (`templates/_systeme/moteurs.js`) : recommandés d'après les capacités mesurées uniquement ; une capacité inconnue donne le profil léger.

### Moteurs
Trois moteurs indépendants et remplaçables : **OCR Engine**, **Comic Vision Engine**, **Local Writing Engine**. En 0.11.1, l'OCR Engine dispose de Tesseract.js (voir ci-dessous) ; vision Ollama (0.11.2) et rédaction Ollama (0.11.3) restent « prévus », non installés. Le test Ollama vérifie seulement qu'un serveur local répond et liste ses modèles déjà installés ; les adresses publiques sont refusées.

## OCR local 0.11.1 (Tesseract.js)

### Utilisation
1. **Moteurs › OCR local** : télécharger le modèle français et/ou anglais (confirmation demandée ; une seule fois), ou importer un fichier `.traineddata` déjà présent sur l'appareil. « Tester le moteur » vérifie qu'un texte de contrôle est reconnu (état « Prêt »).
2. **Comics › un numéro › une page › Texte reconnu (OCR local)** : choisir la langue (anglais, français, ou les deux pour des textes mêlés — plus lent), le prétraitement, la zone (page entière, ou case par case si les cases sont détectées ou tracées) et le découpage (épars, automatique, un bloc). Réglages par défaut, choisis d'après les mesures : page entière, ×2 + gris + contraste, épars.
3. Lancer sur la page, sur des pages choisies (« 1-5, 8 ») ou sur tout le numéro : le traitement passe par la file existante (Moteurs › Traitements), une page à la fois, annulable ; chaque page terminée est enregistrée aussitôt (rien de perdu si la page est fermée ; reprise au point d'arrêt).
4. Résultats : chaque bloc arrive **« à vérifier »** dans la base de connaissances, avec son extrait d'image à côté du texte, sa zone dessinée sur la page, la confiance Tesseract, la case, la langue, le prétraitement, le traitement et la date. Corriger le texte (le texte OCR initial est conservé), valider ou rejeter un à un ou en lot, relancer, comparer deux passages (« Comparer les prétraitements »), garder un seul passage.
5. Les résultats OCR ne deviennent jamais de la matière de script, même validés : ils servent à relever les textes ; le script reprend les **événements validés**.

Les zones affichées sont des zones de texte reconnues, **pas des contours de bulles** ; aucun personnage n'est identifié ; l'ordre de lecture est établi par les cases quand elles existent, et signalé **approximatif** sur une page entière. La confiance Tesseract n'est pas un taux d'exactitude.

### Architecture et confidentialité
- `templates/_systeme/ocr.js` (pur) : modèles et empreintes, prétraitements (×2, gris, contraste, seuil d'Otsu), blocs reconstruits à partir des mots (coupure entre bulles voisines relative à l'espacement de la ligne, regroupement par colonne, mots en gras remis en place, fragments parasites retirés mais conservés dans le texte brut), coordonnées de page, regroupement prudent des lignes d'un même texte, ordre de lecture, mesures (exactitude des mots, WER, CER).
- `atelier/script/ocr.js` : téléchargement explicite et vérifié des modèles, stockage local (base IndexedDB, magasin `modeles-ocr`), prétraitement sur **copies temporaires** (les pages importées ne sont jamais modifiées), reconnaissance annulable, libération du worker et de la mémoire à la fin.
- `atelier/script/ocr-worker.js` : enveloppe du worker Tesseract ; sert les modèles depuis la base locale, charge le cœur WebAssembly intégré, et **refuse toute requête vers une autre origine** (aucune image ni aucun texte ne peut sortir de l'appareil).
- `atelier/script/ocr-ui.js` : panneau du lecteur, section Moteurs, traitement `ocr-pages` de la file existante ; passages enregistrés dans le magasin `ocr-passes` (base locale version 7).
- Hors ligne : le moteur (5,9 Mo) est publié mais pas préchargé ; il est conservé dans un cache dédié dès l'installation d'un modèle (« Préparer le hors-ligne »), puis tout fonctionne sans réseau.

### Dépendances et licences (vérifiées le 2026-11-06)
| Ressource | Version | Licence | Où | Taille |
|---|---|---|---|---|
| tesseract.js (`tesseract.esm.min.js`, `worker.min.js`) | 7.0.0 | Apache-2.0 | intégré, `atelier/vendor/tesseract/` | 0,17 Mo |
| tesseract.js-core (variantes LSTM, avec et sans SIMD : `.js` + `.wasm`) | 7.0.0 | Apache-2.0 | intégré, `atelier/vendor/tesseract/` | 5,7 Mo |
| Modèle `eng.traineddata` *fast* | tessdata_fast 4.1.0 | Apache-2.0 | téléchargé à la demande depuis `raw.githubusercontent.com/tesseract-ocr/tessdata_fast/4.1.0/`, SHA-256 `7d4322bd…70b2` | 3,9 Mo |
| Modèle `fra.traineddata` *fast* | tessdata_fast 4.1.0 | Apache-2.0 | idem, SHA-256 `ced03756…45ca` | 1,1 Mo |

Seules les variantes LSTM du cœur sont intégrées (moteur hérité non utilisé). Les modèles *best* ne sont pas proposés : ils plantent dans Tesseract.js (audit 0.11). Aucune autre dépendance n'a été ajoutée. Détails : `atelier/vendor/tesseract/VERSION.txt`.

### Mesures sur pages réelles (2026-11-06)
Protocole indépendant de la confiance Tesseract : `node tools/mesurer-ocr.mjs <dossier-corpus>` compare l'OCR à des transcriptions de référence corrigées à la main (exactitude des mots, WER, CER, temps, mémoire) par catégorie de lettrage, prétraitement et langue, en trois modes : zone délimitée (reconnaissance seule), page entière (détection comprise, usage par défaut) et case par case (cases détectées automatiquement).

Deux corpus réels en anglais, transcrits à la main, hors dépôt :
- **réglage** : 46 zones sur 6 pages (*Immortal Hulk* #1 et #2, *The Ultimates* (2016) #1 et #4), utilisées pour mettre au point le traitement ;
- **contrôle** : 40 zones sur 4 autres pages (*Immortal Hulk* #2 et #3, *The Ultimates* #4), dont un lettrage très différent (*Immortal Hulk* #3, p. 6 et 14). Seul le seuil de coupure entre bulles voisines (1,8 fois l'espace médian) a été choisi en regardant aussi ce corpus.

| Lettrage courant (dialogues + narration) | Réglage (193 mots) | Contrôle (269 mots) | Ensemble (462 mots) |
|---|---|---|---|
| Zone délimitée, ×2 + noir et blanc | 95,3 % | 91,8 % | **93,3 %** (WER 10 %, CER 6 %) |
| **Page entière, réglages par défaut** (×2 + gris + contraste, découpage épars) | 93,3 % | 85,5 % | **88,7 %** (WER 18 %, CER 11 %) |
| Case par case, mêmes réglages | 91,7 % | 81,4 % | **85,7 %** (WER 22 %, CER 15 %) |

Par catégorie, page entière, réglages par défaut, les deux corpus réunis (aucune catégorie masquée) :

| Catégorie | Mots | Exactitude des mots | WER | CER |
|---|---|---|---|---|
| Dialogues ordinaires | 215 | 91,2 % | 14 % | 7 % |
| Narration et cartouches | 247 | 86,6 % | 21 % | 14 % |
| Italique | 15 | 60 % | 60 % | 40 % |
| Lettrage stylisé | 52 | 17 % | 125 % | 80 % |
| Texte de petite taille | 19 | 63 % | 58 % | 44 % |
| Effets sonores | 2 | 0 % | 150 % | 100 % |

Temps : ≈ 60 à 200 ms par zone délimitée ; ≈ 3 à 5 s par page entière de 2400 px. Mémoire du navigateur : ≈ 480 Mo au repos, pic ≈ 700 Mo (zones) à 1,1 Go (page entière).

Lecture :
- L'objectif de 85 % des mots sur le lettrage courant est atteint dans les trois modes sur l'ensemble, mais **pas** sur le corpus de contrôle seul en case par case (81,4 %). Sur des pages jamais vues, la page entière tombe à 85,5 %, juste à la limite : il faut s'attendre à ce niveau sur des comics nouveaux, et le corpus reste petit.
- Le traitement des blocs explique l'essentiel des gains en page entière. Les blocs sont reconstruits à partir des mots, avec une coupure entre bulles voisines relative à l'espacement de la ligne. Les morceaux d'un même texte sont réunis par colonne, et les mots en gras isolés par Tesseract retrouvent leur place. Les fragments tirés du dessin sont retirés du texte proposé, mais conservés dans le texte brut. Sur le corpus de réglage, le WER est passé de 65 % à 13 %.
- Le mode **case par case** n'est pas meilleur : les cartouches à cheval sur plusieurs cases, ou placés hors des cases, sont coupés (narration 82 %). Il sert surtout à imposer l'ordre de lecture des cases. La **page entière** reste le réglage par défaut.
- Le découpage « automatique » de Tesseract fusionne les cases voisines (60 % au premier essai) ; « épars » est donc le réglage par défaut.
- Italique, lettrage stylisé, petit texte et effets sonores : **non fiables**. Certains lettrages (*Immortal Hulk* #3, p. 14) produisent aussi des confusions de lettres (D lu P, R lu K) et des cartouches encadrés ignorés.
- Le français n'a été mesuré que sur des pages de synthèse (100 % sur 13 mots), faute de comic français réel dans les corpus.

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

6. **OCR** : pour 2 pages par numéro, créer un corpus de mesure (hors dépôt) : enregistrer les pages en PNG dans `~/corpus-ocr/pages/`, écrire `~/corpus-ocr/corpus.json` avec une zone par texte (fractions de la page), sa catégorie (`dialogue`, `narration`, `italique`, `stylise`, `onomatopee`, `petit`), sa langue et sa transcription exacte, puis :

```bash
node tools/mesurer-ocr.mjs ~/corpus-ocr
```

```bash
node tools/mesurer-ocr.mjs ~/corpus-ocr --mode=page
```

Le premier mesure la reconnaissance seule, le second la page entière (détection comprise). Inclure des numéros **français** (non mesurés sur pages réelles à ce jour). Les rapports `rapport-ocr.md` et `rapport-ocr-page.md` sont écrits dans le dossier du corpus ; aucune catégorie n'y est masquée.

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
- Vision et rédaction locales non installées. OCR : fiable sur le lettrage courant seulement ; ni bulles ni personnages détectés ; ordre de lecture approximatif sans cases ; français non mesuré sur pages réelles ; testé sur Chromium (Linux) uniquement.
- Mémoire vidéo mesurée seulement via le serveur local et sur carte NVIDIA.
- Détection des cases fiable sur des gouttières nettes seulement.
- Analyse critique par règles : utile, mais ni exhaustive ni infaillible ; le rythme est une estimation.
- Les PDF sont rendus à 2400 px maximum par page.
