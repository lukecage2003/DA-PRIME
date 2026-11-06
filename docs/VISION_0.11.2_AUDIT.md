# DA-PRIME 0.11.2 — Audit de vision locale (Comic Vision Engine)

Document de conception, établi le 2026-11-06. **Aucun moteur de vision n'est implémenté ; aucun modèle n'a été téléchargé ni exécuté.** Les performances des modèles ne sont donc pas mesurées ici : elles le seront par le protocole décrit plus bas, sur la machine de l'utilisateur.

## 1. Sources et degré de vérification

La session de travail n'avait accès ni à huggingface.co, ni à ollama.com, ni à arxiv.org (refus du réseau de la session). Les informations proviennent :
- **vérifiées sur la source officielle** (GitHub) : dépôts QwenLM/Qwen3-VL, OpenBMB/MiniCPM-V, OpenGVLab/InternVL, ggml-org/llama.cpp (`docs/multimodal.md`, `tools/mtmd/models/`), ollama/ollama (`docs/api.md`) ;
- **sources secondaires** (presse spécialisée, guides, moteurs de recherche) : signalées « secondaire » ci-dessous ; à confirmer sur la fiche Hugging Face exacte avant tout téléchargement.

Règle retenue : la licence d'un dépôt de **code** ne couvre pas automatiquement les **poids**. Chaque point de contrôle doit être vérifié sur sa fiche (`LICENSE` du dépôt de poids) au moment de l'intégration.

## 2. Ce que l'on attend du moteur (et ce qu'il ne fera pas)

Le moteur **observe** et **propose** ; l'utilisateur **valide**. Trois niveaux, toujours distingués :

| Niveau | Exemples | Classement obligatoire |
|---|---|---|
| Structure visuelle | cases, bulles, cartouches, personnages visibles, décor, objets, composition, doubles pages, cases inclinées | observation visuelle (avec coordonnées) |
| Narration visuelle | actions observables, relations entre personnages, évolution d'une action d'une case à l'autre, changement de lieu, continuité, lien bulle ↔ locuteur | description, puis interprétation pour tout ce qui n'est pas visible |
| Informations éditoriales | résumé de page et de séquence, événements importants, liens entre pages | interprétation ou hypothèse, jamais un fait tant que non validé |

**Nature de la page et du texte** (exigence de l'utilisateur) : une couverture, une page de crédits, un résumé « Previously… », une page de distribution (« Cast »), une publicité ne sont pas des pages d'histoire ; un nom d'auteur, un titre, un cartouche de lieu (« NOW! ABOARD THE ABEONA… »), une fiche de présentation (« COL. CAROL DANVERS. CODENAME… »), un texte du décor (enseigne, écran, journal) ou un effet sonore ne sont pas des bulles. La 0.11.1 permet déjà de les classer à la main (nature de la page, nature de chaque texte OCR, suggestions par mots-clés sûrs) ; le moteur de vision **proposera** ces natures à partir de l'image (forme de bulle, encadré de cartouche, position, style), toujours à confirmer.

**L'image fait partie du récit** : le moteur décrira aussi la mise en scène, en la séparant des faits :
- observations : plan (large, moyen, gros plan, très gros plan), angle (plongée, contre-plongée), regard et orientation des personnages, lignes de mouvement, éléments au premier plan, lumière et dominante colorée, nombre et taille des cases, case qui déborde ;
- descriptions : ce que font les personnages visibles, dans quel décor ;
- interprétations : effet produit (tension, isolement, révélation), type de transition entre cases (moment à moment, action à action, sujet à sujet, scène à scène, aspect à aspect), rythme de la page.

**Interdits** (contrôlés par le code, pas seulement demandés au modèle) : inventer l'identité d'un personnage, une citation ou un événement ; réécrire un texte reconnu par l'OCR ; présenter un résultat non validé comme un fait dans un script.

## 3. Comparatif des modèles (au 2026-11-06)

| Modèle | Tailles | Licence code | Licence poids | Vérification | Exécution locale | Notes pour les comics |
|---|---|---|---|---|---|---|
| **Qwen3-VL** (Instruct et Thinking) | 2B, 4B, 8B, 32B ; 30B-A3B, 235B-A22B (MoE) | Apache-2.0 | Apache-2.0 (secondaire) | dépôt officiel : tailles, dates (sept.-oct. 2025), 256 à 1 280 jetons visuels par image, contexte 256K | llama.cpp (`qwen3vl`, depuis fin oct. 2025), Ollama (secondaire), vLLM, Transformers | résolution dynamique, bonne lecture de texte annoncée ; page entière de 2400 px réduite à ≤ 1 280 jetons : détails fins perdus → analyse **par case** nécessaire |
| **Qwen3.5** (multimodal natif) | 0.8B, 2B, 4B, 9B ; 27B, 35B-A3B, 122B-A10B, 397B-A17B | Apache-2.0 (secondaire) | Apache-2.0 (secondaire) | secondaire seulement (févr.-mars 2026) | GGUF annoncés (secondaire) ; prise en charge de la vision par llama.cpp **non confirmée** | candidat sérieux en 9B ; à confirmer avant tout choix |
| **Qwen3.6-35B-A3B** | 35B-A3B (MoE) | Apache-2.0 (secondaire) | Apache-2.0 (secondaire) | secondaire (avril 2026) | Ollama ≈ 19 à 24 Go en Q4 (secondaire, chiffres divergents) | profil performant ; 3B paramètres actifs : rapide pour sa taille |
| **Gemma 4** | E2B, E4B, 26B-A4B, 31B | Apache-2.0 (secondaire, plusieurs sources) | Apache-2.0 (secondaire) | llama.cpp : `gemma4v` dans le code, modèles listés dans `docs/multimodal.md` | llama.cpp, Ollama (secondaire) | changement de licence (les Gemma 3 étaient sous conditions propres à Google) : vérifier la fiche |
| **MiniCPM-V 4.6 / 4.7** | 4.7 : 1B et 35B-A3B (MoE) ; 4.6 : mai 2026 | Apache-2.0 | « Code and model weights are released under Apache-2.0 » (dépôt officiel), avec une « Model license » et une « Usage statement » à lire | dépôt officiel | llama.cpp (`minicpmv`), Ollama (officiel selon le dépôt), int4, GGUF | OCR revendiqué fort (MiniCPM-OCR 1.0, oct. 2026) ; chiffres du développeur uniquement |
| **InternVL3.5** | 1B à 38B ; 20B-A4B, 30B-A3B, 241B-A28B | MIT | **non précisée** dans le dépôt : dépend du modèle de langue de chaque variante | dépôt officiel (août 2025) | llama.cpp : `internvl` (InternVL 2.5 et 3 listés ; 3.5 non confirmé) ; Ollama : à faire selon le dépôt | découpage en tuiles de 448 px (jusqu'à 12) : bon pour une page haute résolution |
| **Magi / Magiv2** (spécialisé manga) | détecteur + transcription | ? | modèle « crop-embedder » : usage personnel, recherche, non commercial (secondaire) ; modèle principal : non trouvée | secondaire | PyTorch | détecte cases, textes, personnages et relie bulles et locuteurs ; conçu pour le manga noir et blanc ; **écarté** tant que la licence n'est pas claire |
| Modèles OCR-VLM (PaddleOCR-VL, DeepSeek-OCR, dots.ocr, GLM-OCR, MiniCPM-OCR) | variés | variés | à vérifier | llama.cpp les liste comme modèles OCR | llama.cpp | option pour le **lettrage stylisé** (où Tesseract échoue), pas pour la narration |
| Exclus | Llama 4 (licence Llama, restrictions), Gemma 3 (conditions propres) | | | | | licence incompatible avec un usage libre sans contrôle juridique |

Points communs à tous ces modèles (connus des études sur les comics, voir §8) : ils lisent mal le petit texte d'une page entière réduite, confondent l'ordre des cases sur les mises en page complexes, et **hallucinent** des détails plausibles. Les évaluations par similarité sémantique de texte surestiment leurs capacités.

## 4. Besoins matériels

### 4.1 Machine de cette session ≠ machine cible
- **Environnement d'exécution de Claude Code (mesuré)** : conteneur Linux, 4 cœurs Intel Xeon 2,1 GHz, 15,7 Go de RAM, **aucun GPU**, ≈ 29 Go de disque libre. Ce n'est **pas** la machine de l'utilisateur.
- **Machine cible (PC Windows de l'utilisateur)** : **inconnue à ce jour**. Rien n'est supposé. Pour la mesurer :

```bash
node tools/serveur-moteurs.mjs
```

puis ouvrir Script Studio › Moteurs (processeur, RAM, disque, mémoire vidéo NVIDIA par `nvidia-smi`). Pour une carte AMD ou Intel, la mémoire vidéo n'est pas mesurée par DA-PRIME : la lire dans le Gestionnaire des tâches (onglet Performance › GPU › « Mémoire GPU dédiée »).

### 4.2 Profils proposés (tailles estimées, à confirmer)
Les tailles ci-dessous sont **calculées** (≈ 0,6 Go par milliard de paramètres en quantification Q4_K_M, plus le projecteur de vision de 0,6 à 1,2 Go), faute d'accès aux fiches de fichiers. La mémoire nécessaire ajoute le contexte (texte OCR, image : 1 000 à 3 000 jetons par case) et le système. Les vitesses ne sont **pas** estimées : elles seront mesurées.

| Profil | Machine | Modèle candidat | Fichiers (estimés) | Mémoire à prévoir (estimée) |
|---|---|---|---|---|
| CPU léger | 16 Go de RAM, sans GPU | Qwen3-VL-4B, Gemma 4 E4B ou Qwen3.5-4B | ≈ 3 à 4 Go | ≈ 6 à 8 Go de RAM ; lent : analyse par lots la nuit |
| GPU standard | GPU 8 Go, 16 Go de RAM | **Qwen3-VL-8B** ou Qwen3.5-9B | ≈ 6 Go | 8 Go de VRAM (déport complet) |
| GPU performant | GPU 16 à 24 Go, 32 Go de RAM | Qwen3-VL-30B-A3B, Qwen3.6-35B-A3B ou MiniCPM-V 4.7 35B-A3B | ≈ 18 à 24 Go | 24 Go de VRAM, ou déport partiel GPU + RAM (MoE : seuls ≈ 3B paramètres actifs) |
| Serveur local secondaire (facultatif) | un autre PC du réseau privé | idem selon sa carte | — | le PC principal et les téléphones restent des terminaux |

### 4.3 Exécution locale
- **Ollama** : le plus simple sous Windows ; API locale `http://localhost:11434` ; images en base64 dans `images`, `options` (`temperature`, `seed`, `num_ctx`) et `format` avec un **schéma JSON** (sorties structurées) — vérifié dans la documentation officielle de l'API.
- **llama.cpp** (`llama-server --mmproj …`) : plus de contrôle (quantification, déport GPU partiel), API compatible OpenAI ; prise en charge vérifiée dans le code pour `qwen3vl`, `minicpmv`, `internvl`, `gemma4v`, `glm4v`, `kimivl`, `pixtral`, `paddleocr`, `deepseekocr`.
- Aucun service d'IA externe ; aucun téléchargement de modèle sans action explicite de l'utilisateur (même règle que les modèles OCR).

## 5. Architecture recommandée

```
Comics (import, pages, nature de page) ─┐
Détection des cases (existante) ────────┤
OCR Engine (Tesseract, blocs + zones) ──┼─► Comic Vision Engine ─► résultats bruts (JSON validé par schéma)
                                        │        │                      │
                                        │        │                      ▼
File de traitements (existante) ◄───────┘        │        Rapprochement OCR ↔ vision + contrôles
                                                 │                      │
          adaptateurs remplaçables : ollama │ llama.cpp │ manuel        ▼
          (servis par tools/serveur-moteurs.mjs, jeton par en-tête)   Base de connaissances (« à vérifier »)
                                                                         │ validation humaine
                                                                         ▼
                                                     Script Studio · Visual Asset Studio (suggestions)
```

- **Module pur** `templates/_systeme/vision.js` : schéma des résultats, contrôles, rapprochement, conversion en assertions. Indépendant du modèle.
- **Adaptateurs** (interface `{ id, modele, version, analyser(image, contexte, options) → JSON brut }`) : `ollama`, `llamacpp`, `manuel`. Remplacer un modèle = changer d'adaptateur ou de réglage, sans toucher à Script Studio.
- **Accès** : le navigateur parle au serveur local DA-PRIME (`tools/serveur-moteurs.mjs`), qui relaie vers Ollama ou llama.cpp sur le PC : un seul point d'entrée authentifié (en-tête `X-DA-PRIME-Jeton`, jamais dans l'adresse), adresses locales uniquement, aucun relais vers Internet. Les téléphones restent des terminaux.
- **Unités d'analyse** :
  1. page entière réduite (composition, nature de la page, ordre des cases, double page) ;
  2. **case par case** à pleine résolution (personnages, actions, objets, bulles), avec les blocs OCR de la case et leurs identifiants ;
  3. séquence (plusieurs cases ou pages) : uniquement à partir des résultats déjà enregistrés et de leurs références, pour relier les actions et les lieux ;
  4. double page : analysée comme une seule image, puis par moitié et par case.
- **Paramètres reproductibles** : température 0, graine fixée, schéma JSON imposé, invite versionnée ; tout est enregistré avec le résultat.
- **Historique** : magasin `vision-passes` (comme `ocr-passes`) : modèle, version, empreinte du fichier de poids, paramètres, invite, date, durée, sortie brute ; les assertions gardent leur historique.

### 5.1 Format d'un résultat (chaque élément)
`{ id, type: case|bulle|cartouche|personnage|decor|objet|action|relation|composition|nature-page|nature-texte|transition, classement: observation|description|interpretation|hypothese|incertain, contenu, zone {x,y,w,h} (fractions de la page), comic, page, case, refsOcr: [ids], refsElements: [ids], modele, versionModele, parametres, date, confiance, statut: a-verifier }`

### 5.2 Rapprochement OCR ↔ vision
- Les blocs OCR sont **donnés** au modèle (identifiant, zone, texte) ; il peut seulement les **référencer** (locuteur probable, nature du texte), jamais les réécrire.
- Tout texte entre guillemets dans une sortie de vision doit correspondre à un bloc OCR ou à une transcription validée, sinon l'élément est **rejeté** (citation inventée).
- Locuteur d'une bulle : hypothèse (queue de bulle orientée vers un personnage visible), jamais un fait.
- Nature du texte proposée par la vision (bulle, cartouche, lieu, crédits, titre, décor, effet sonore) : suggestion affichée à côté de celle des mots-clés ; l'utilisateur tranche.

### 5.3 Identités
- Un personnage est désigné « Personnage A, B… » par numéro.
- Un nom n'est proposé que s'il figure dans un texte de la page (fiche de présentation, dialogue validé, cartouche) **et** reste une hypothèse.
- Le contrôle de code rejette tout nom absent des textes OCR et validés du numéro.
- Visual Asset Studio ne reçoit que des **suggestions** de cadrage (zones de personnages), sans identité.

### 5.4 Confiance
La confiance auto-déclarée d'un modèle n'est pas fiable. Elle est remplacée par des indices mesurables :
- accord entre deux analyses (page réduite et case pleine résolution) ;
- cohérence avec l'OCR (zones de bulles) et avec les cases détectées ;
- stabilité entre deux exécutions avec des graines différentes.

En dessous d'un seuil, l'élément est classé « incertain ».

## 6. Protocole de validation sur comics

### 6.1 Corpus de référence (hors dépôt)
Pages réelles déjà disponibles, réparties en réglage et contrôle comme pour l'OCR :

| Situation | Exemples disponibles |
|---|---|
| Grille classique | Immortal Hulk #1 p5, #2 p4 |
| Cases inclinées, fonds perdus | The Ultimates #4 p6, p13, p18 |
| Double page | Immortal Hulk #1 p20-21 ; doubles pages de The Ultimates |
| Pleine page | The Ultimates #1 p12 (vaisseau) ; Immortal Hulk #1 p1 (couverture) |
| Gros plans | Immortal Hulk #1 p14 (dernière case) |
| Plusieurs personnages dans une case | Immortal Hulk #1 p14 (première case) ; New Avengers #1 p2 |
| Dialogues intégrés à l'image | écran « 95:42:03 » (Secret Wars #0 p3), magazine (Immortal Hulk #1 p5) |
| Effets sonores | « BDAM » (Immortal Hulk #1 p9), « BE-DOOP! » (Secret Wars #1 p15) |
| Narration visuelle complexe | Immortal Hulk #3 p14 ; Secret Wars #0 p15 (style manga) |
| Pages non narratives | couvertures et couvertures variantes (Secret Wars #1 p1-9), crédits (The Ultimates #1 p12, Secret Wars #0 p20), résumé (New Avengers #1 p2), distribution (Secret Wars #1 p18) |

### 6.2 Annotation humaine de référence (par page)
- nature de la page ;
- cases : rectangle et ordre ;
- textes : zone, nature, locuteur s'il est certain ;
- personnages : étiquette constante dans la page et identité seulement si elle est établie ;
- actions par case : agent, verbe, objet ;
- relations ;
- lieu, et changement de lieu ;
- objets importants ;
- plan et angle ;
- transitions entre cases ;
- « éléments à ne pas inventer » : identités inconnues, textes illisibles.

Le format est le même que §5.1, ce qui rend l'annotation directement comparable à la sortie du moteur.

### 6.3 Mesures (séparées, jamais un score unique)
| Mesure | Méthode |
|---|---|
| Détection (cases, bulles, cartouches, personnages) | précision et rappel avec recouvrement ≥ 0,5 entre rectangles |
| Nature de la page et des textes | exactitude par classe, matrice de confusion (couverture, crédits, bulle, cartouche…) |
| Description des actions | correspondance agent, verbe et objet, jugée par un humain selon une grille : exact, partiel, faux, inventé |
| Cohérence entre cases | même personnage suivi d'une case à l'autre, même lieu tant qu'aucun changement n'est annoncé |
| Relations | exactitude des relations listées, rejet des relations non visibles |
| Exactitude des descriptions | proportion d'éléments exacts parmi les éléments affirmés |
| **Hallucinations** | éléments affirmés absents de la référence ; identités inventées ; citations inventées (contrôle automatique contre l'OCR) ; événements inventés |
| Temps et mémoire | par case et par page, sur la machine cible |

Le jugement « exact ou partiel » se fait sur des éléments atomiques, pas en comparant deux résumés par similarité sémantique : cette méthode masque les hallucinations (étude de 2026 « Semantic Similarity is a Spurious Measure of Comic Understanding », citée d'après son résumé).

### 6.4 Seuils d'acceptation proposés (à confirmer après la première mesure)
- **Détection des cases** : rappel ≥ 90 % sur les grilles et ≥ 70 % sur les cases inclinées.
- **Nature de la page** : exactitude ≥ 90 %.
- **Actions** : ≥ 70 % d'exactes ou de partielles.
- **Citations inventées** : 0 en sortie, garanti par le contrôle de code.
- **Identités inventées** : 0 présentée comme un fait, garanti par le contrôle de code.
- **Éléments inventés** : ≤ 10 %.

## 7. Plan d'implémentation 0.11.2 (après autorisation)
1. Confirmer les licences et les tailles des candidats sur leurs fiches officielles. Autoriser huggingface.co ou ollama.com sur la machine cible.
2. Mesurer la machine cible avec le serveur local.
3. Livrer le module pur `vision.js` : schéma, contrôles anti-hallucination, rapprochement OCR, conversion en assertions. Il se teste sans aucun modèle.
4. Ajouter les adaptateurs Ollama et llama.cpp derrière le serveur local, avec le jeton par en-tête, le traitement `vision-pages` dans la file existante, l'annulation et la reprise.
5. Construire l'interface :
   - panneau « Lecture visuelle » dans le lecteur, avec les éléments dessinés sur la page ;
   - classement observation, description, interprétation, hypothèse ;
   - validation à l'unité et en lot.
6. Annoter la référence humaine : 10 pages de réglage, 10 pages de contrôle jamais utilisées pour régler.
7. Mesurer 3 ou 4 candidats sur la machine cible, puis choisir le modèle par défaut et les profils.
8. Mettre à jour la documentation et le journal des versions, et écrire les tests. Aucun modèle dans Git, aucun déploiement.

## 8. Risques et protections
| Risque | Protection |
|---|---|
| Hallucination (objets, actions, événements) | sorties en JSON contraint ; éléments atomiques ; classement obligatoire ; tout « à vérifier » ; contrôle de cohérence avec les cases et l'OCR ; mesure dédiée |
| Identité ou citation inventée | rejet automatique de tout nom ou guillemet absent des textes OCR ou validés |
| Détails perdus par la réduction de la page | analyse case par case à pleine résolution |
| Ordre de lecture faux sur les mises en page complexes | ordre issu de la détection des cases, corrigeable ; le modèle ne fait que le confirmer |
| Couverture, crédits ou résumé pris pour des pages d'histoire | nature de page (manuelle, puis suggérée) exclue des résumés d'histoire |
| Licence des poids différente du code | vérification fiche par fiche ; empreinte du fichier de poids enregistrée avec chaque résultat |
| Machine trop faible | profils ; analyse en lots ; serveur secondaire facultatif ; aucune hypothèse sur le matériel |
| Fuite de données | adresses locales uniquement ; jeton par en-tête ; aucun service externe ; aucun comic dans Git |
| Résultats non reproductibles | température 0, graine, invite versionnée, version et empreinte du modèle enregistrées |
| Dépendance à un modèle | adaptateurs remplaçables ; le module pur et les données ne dépendent d'aucun modèle |

## 9. Recommandation
- **Candidat principal** : **Qwen3-VL-8B-Instruct**.
  - Licence Apache-2.0 sur le dépôt officiel ; celle des poids reste à confirmer sur la fiche.
  - Prise en charge vérifiée dans llama.cpp depuis octobre 2025, et disponible dans Ollama.
  - Résolution dynamique, et versions 2B et 4B de la même famille pour le profil léger.
- **À comparer sur le protocole** avant de figer le choix : Qwen3.5-9B (plus récent, prise en charge de la vision par llama.cpp à confirmer), Gemma 4 E4B (profil léger), MiniCPM-V 4.6 ou 4.7 (point fort annoncé : l'OCR).
- **Pour le lettrage stylisé**, un modèle OCR-VLM (MiniCPM-OCR, PaddleOCR-VL) en option, à côté de Tesseract et non à sa place.
- **Conditions d'intégration** :
  1. Licence des poids confirmée sur la fiche exacte.
  2. Machine cible mesurée.
  3. Hôtes de téléchargement autorisés, et téléchargement seulement avec l'accord de l'utilisateur.
  4. Protocole §6 appliqué : seuils §6.4 atteints sur le corpus de contrôle.
  5. Contrôles anti-invention en place avant toute mise à disposition.
