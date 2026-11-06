# Script Studio 0.11.0 · audit, validation réelle et architecture locale

Date : 2026-11-06 · branche de travail · **document de conception : aucun moteur OCR, vision ou rédaction n'est encore implémenté.**
Machine de mesure : conteneur Linux, 4 cœurs, 15 Go de RAM, **sans GPU**. Hugging Face et ollama.com n'étaient pas accessibles depuis cet environnement : les tailles et licences des *poids* de modèles ci-dessous viennent des dépôts officiels (GitHub) et de la documentation connue ; elles sont à confirmer sur la fiche de chaque modèle avant intégration.

## 1. État réel du code (0.10.0)

| Élément | Où | État constaté |
|---|---|---|
| Projets, plan, éditeur, critique, exports, prompts | `atelier/script/script.js`, `templates/_systeme/script-moteur.js`, `script-prompts.js` | fonctionnels, 39 tests verts |
| Import CBZ/ZIP | `atelier/script/comics.js` (`lireZip` + `DecompressionStream`) | fonctionnel ; méthodes « stockée » et « deflate » seulement (ZIP64 et chiffrement non gérés) |
| Import PDF | pdf.js 6.5 intégré (`atelier/vendor/pdfjs/`) | fonctionnel ; pages rendues ≤ 2400 px (perte possible sur les scans haute définition) |
| CBR | — | refusé avec message clair (conversion en CBZ) |
| Doubles pages | `importerFichiers` | heuristique de proportions par rapport à la page médiane : **inopérante pour un fichier d'une seule page** (pas de référence) |
| Doublons | empreinte SHA-256 du fichier et de chaque page | fonctionnel |
| Détection des cases | `detecterCases` (découpe XY sur gouttières) | fiable sur grilles à gouttières nettes ; **une seule case** sur cases diagonales, débordantes ou sans gouttière, toujours signalée « faible » |
| Transcription, analyse, provenance, validation | `comics-ui.js` | manuels ; provenances dialogue / visuel / interprétation / incertain ; validation en 7 points par numéro |
| Points d'extension | `MOTEURS.ocr`, `MOTEURS.vision` dans `comics.js` | déclarés « non installés », rien de branché |
| Stockage | IndexedDB v5 (`scripts`, `comics`, `pages` en Blob…) | fonctionnel ; pas de file d'attente de traitements longs, pas de Web Worker |

Points d'intégration identifiés : (a) bouton « Détecter les cases » → étendre en « Analyser la page » (OCR + vision) ; (b) liste des transcriptions → recevoir des propositions « à vérifier » ; (c) événements de l'analyse → recevoir des suggestions de la vision ; (d) éditeur de script → propositions par séquence ; (e) Prompt Studio → réutiliser les modèles comme gabarits de prompts locaux.

## 2. Validation sur comics réels

**Corpus disponible ici : une seule vraie planche** (extrait fourni par l'utilisateur, 1133 × 759, cases en diagonale), déclinée en JPG, CBZ et PDF, plus un faux CBR. Ce n'est **pas** une validation suffisante : le protocole complet doit être rejoué par l'utilisateur sur ses propres numéros avec `node tools/valider-comics.mjs <dossier>` (rapport hors du dépôt).

| Mesure | Résultat réel |
|---|---|
| Import JPG / CBZ / PDF / CBR | ok / ok (doublon de page détecté) / ok (317 ms) / refus explicite |
| Détection des cases (cases diagonales) | 1 case, fiabilité « faible » signalée — pas d'erreur silencieuse, mais aucune aide |
| Double page sur fichier d'une page | non détectable (limite confirmée) |
| OCR Tesseract.js 7, modèle *fast* anglais, page entière | 76 % des mots retrouvés (précision 93 %), 0,45 s |
| Même chose, image ×2 + binarisation | **86 %** (précision 88 %) ; mode « texte épars » : 88 % (précision 81 %) |
| Modèle *standard* (23 Mo) | 72 à 88 % : pas meilleur que *fast* sur cette planche |
| Modèle *best* (virgule flottante) | **plante** dans Tesseract.js (`DotProductSSE` absent) : inutilisable dans le navigateur |
| Erreurs typiques | mots en italique d'emphase (presque toujours ratés), lettrage stylisé des grands titres, trames de points autour des bulles |

Conclusion : Tesseract est **utilisable comme premier jet** sur le lettrage courant, à condition de prétraiter, d'OCR-iser par bulle et de tout marquer « à vérifier ». Il ne suffit pas pour le lettrage stylisé : un OCR à base de modèle vision-langage doit être proposé en option.

## 3. Comparatif OCR

| Solution | Licence | Exécution | Taille | Navigateur / hors ligne | Points forts / faibles | Verdict |
|---|---|---|---|---|---|---|
| **Tesseract.js 7** | Apache-2.0 | WebAssembly, Web Worker | cœur ≈ 3-5 Mo + données *fast* 4 Mo (eng), 1,1 Mo (fra) | oui, partout ; hors ligne si données mises en cache | mesuré : 76-88 % ; faible sur italique et lettrage stylisé ; *best* incompatible | **Retenu (niveau 1, intégré au navigateur)** |
| PaddleOCR (PP-OCR, modèles mobiles ONNX) | Apache-2.0 | onnxruntime-web (WASM/WebGPU) | détection ≈ 5 Mo + reconnaissance latine ≈ 10 Mo + runtime ≈ 10 Mo | oui avec onnxruntime-web ; portage à faire | meilleure détection de texte de scène et de zones courbes ; reconnaissance latine moins éprouvée en français | **À évaluer (niveau 1 bis)** |
| EasyOCR | Apache-2.0 | Python + PyTorch | ≈ 1-2 Go d'installation | non (service local Python) | bonne détection (CRAFT), lent sur CPU, installation lourde sous Windows | Écarté (lourdeur sans gain démontré) |
| docTR | Apache-2.0 | Python ; démo TF.js | 50-100 Mo | partiel | orienté documents | Écarté |
| **MiniCPM-OCR 1.0** (1,3 B, octobre 2026) | dépôt Apache-2.0 ; licence des poids à confirmer | Ollama / llama.cpp (GGUF) | ≈ 1 à 1,5 Go quantifié | service local | OCR par modèle vision-langage, robuste au lettrage et aux mises en page ; lent sans GPU | **Retenu (niveau 2, optionnel)** |
| Surya | code Apache-2.0, poids OpenRAIL-M (restrictions commerciales) | Python | ~1 Go | non | bon sur documents | Écarté (licence des poids) |
| manga-ocr / mokuro | Apache-2.0 / GPL-3.0 | Python | ~450 Mo | non | spécialisés japonais | Hors sujet (mokuro exclu : GPL) |

## 4. Comparatif des modèles de vision (exécution locale)

| Modèle | Tailles | Licence (à confirmer sur la fiche) | Usage pour les comics | Ressources (Q4, ordre de grandeur) |
|---|---|---|---|---|
| **Qwen3-VL** | 2B, 4B, 8B, 32B, 30B-A3B | dépôt Apache-2.0 ; poids annoncés Apache-2.0 | description de case, lecture de texte, ordre des cases, attribution des bulles ; bon français | 4B : ≈ 3,5 Go, 6-8 Go RAM ; 8B : ≈ 6 Go, 10-12 Go RAM |
| **MiniCPM-V 4.7** | 1B, 35B-A3B | dépôt Apache-2.0 ; licence des poids MiniCPM à vérifier (usage commercial possiblement soumis à enregistrement) | 1B très léger pour PC modestes ; 35B-A3B pour GPU | 1B : ≈ 1 Go ; 35B-A3B : ≈ 20 Go |
| InternVL 3.5 | 1B à 241B | code MIT ; poids variables selon la base | performant ; empaquetage Ollama moins direct | 4B/8B comparables à Qwen3-VL |
| Florence-2 | 0,23B / 0,77B | MIT | légende, régions, OCR de zones ; **tourne dans le navigateur** (transformers.js + WebGPU) ; faible pour le raisonnement narratif | 0,5-1,5 Go |
| Détection de bulles | — | comic-text-detector (GPL-3.0) exclu ; Kumiko (AGPL) inspiration seulement | à couvrir par la découpe géométrique existante + le modèle de vision | — |

Recommandation : **Qwen3-VL-4B par défaut** (8B si GPU ≥ 8 Go, 2B ou MiniCPM-V 4.7 1B pour PC sans GPU). Le modèle **propose** (descriptions, ordre, locuteur) ; tout arrive « à vérifier ».

## 5. Comparatif des modèles de langage (rédaction française)

| Modèle | Licence | Contexte | Français / rédaction | Q4 | Verdict |
|---|---|---|---|---|---|
| **Qwen3 8B / 14B** (ou 30B-A3B) | Apache-2.0 | 32K natif (étendu jusqu'à 128K) | bon, structure et citations bien suivies | 8B ≈ 5 Go ; 14B ≈ 9 Go ; 30B-A3B ≈ 18 Go | **Défaut** |
| **Mistral Small 3.x 24B** | Apache-2.0 | 128K | **meilleure prose française** de la catégorie | ≈ 14 Go (GPU 16 Go conseillé) | **Option qualité** |
| Gemma 3 12B | conditions Gemma (restrictions d'usage) | 128K | bon | ≈ 8 Go | possible, licence moins simple |
| Llama 3.x 8B | licence communautaire Llama | 128K | correct | ≈ 5 Go | écarté (licence, français) |

Exécution : **Ollama** (MIT ; installateur Windows ; API REST sur `localhost:11434` ; gère le téléchargement, la mémoire et le GPU) comme connecteur principal ; **llama.cpp server** (MIT, API compatible OpenAI) comme alternative ; LM Studio compatible par la même API. WebLLM (Apache-2.0, WebGPU, tout dans le navigateur) en option « sans installation » pour les modèles ≤ 8B, au prix de 4-5 Go dans le stockage du navigateur.

## 6. Architecture locale recommandée

```
Navigateur (DA-PRIME, inchangé : GitHub Pages ou serveur local)
 ├─ Script Studio (UI)                 ─ mode manuel toujours disponible
 ├─ File de traitements (Web Worker)   ─ progression, erreurs, annulation, reprise
 ├─ Base de connaissances (IndexedDB)  ─ assertions sourcées, statuts de validation
 ├─ Détecteur de capacités             ─ cœurs, mémoire, WebGPU, quota, moteurs joignables
 ├─ 1. OCR Engine
 │     niveau 1 : Tesseract.js (Worker, données fra+eng mises en cache) — prétraitement ×2, binarisation, par case/bulle
 │     niveau 2 : modèle vision-langage OCR via Ollama (MiniCPM-OCR / Qwen3-VL) — optionnel
 ├─ 2. Comic Vision Engine
 │     géométrie existante (cases) + Qwen3-VL / MiniCPM-V via Ollama (description, ordre, locuteur)
 └─ 3. Local Writing Engine
       Ollama ou llama.cpp (Qwen3 / Mistral Small) — séquence par séquence, citations obligatoires, vérificateur déterministe
Service local facultatif : Ollama sur localhost (aucun cloud, modèles téléchargés une fois puis hors ligne)
```

Principes : chaque moteur est un **adaptateur** derrière une interface commune (`disponible()`, `capacites()`, `traiter(tache, {signal, progres})`) ; aucun appel hors de `localhost` ; modèles remplaçables par configuration ; les sorties ne deviennent jamais des faits sans validation humaine.

Contrainte réelle à traiter : depuis la version publiée (HTTPS), joindre `http://localhost:11434` nécessite d'autoriser l'origine dans Ollama (`OLLAMA_ORIGINS`) et, dans les navigateurs Chromium récents, d'accepter la demande d'accès au réseau local. Mode recommandé pour les moteurs : lancer DA-PRIME en local (`npm run atelier`) — même origine de confiance, aucune configuration.

## 7. Base de connaissances (fiabilité)

Unité : **assertion**, qui étend les transcriptions et événements actuels (migration automatique) :

`{ id, contenu, categorie: dialogue | narration | visuel | interpretation | hypothese, issue, page, case, bulle?, zone (bbox), methode: manuel | ocr:tesseract-fast-eng | vlm:qwen3-vl-4b-q4 | llm:…, confiance 0-1, statut: brouillon | a-verifier | valide | rejete, derive_de: [ids], auteur, date }`

Règles : toute sortie de moteur entre en `a-verifier` ; une citation n'est **citation** que si elle est identique à une transcription validée ; une interprétation reste formulée comme telle dans le script ; hypothèses et éléments incertains sont exclus de l'export final (avertissement bloquant à l'export).

## 8. Assistant de rédaction (conception)

Travail **séquence par séquence** : paquet de contexte = objectif de la séquence, budget de mots, profil, résumé des séquences voisines, assertions validées liées (avec identifiants). Sortie demandée : texte oral avec marqueurs `[#id]` par affirmation. Vérificateur déterministe après génération : chaque phrase factuelle cite une assertion validée ; chaque citation entre guillemets correspond mot pour mot à une transcription ; chaque nombre, date ou nom propre figure dans les sources ; sinon proposition rejetée ou signalée. La proposition est montrée en comparaison (outil de différences existant) : accepter, modifier ou refuser. Les règles de l'analyse critique actuelle (clichés, longueurs, répétitions) s'appliquent aussi aux propositions.

## 9. Intégration DA-PRIME

- **Visual Asset Studio** : une case de comic devient une **référence** (`pageId` + zone) et non une copie ; recadrage exporté seulement à la demande ; collection « Comics » ; aucun doublon (empreinte), originaux jamais modifiés.
- **Bibliothèque de personnages** : lier un personnage reconnu par l'utilisateur aux fiches existantes (jamais par reconnaissance automatique d'identité).
- **Motion Studio** : une composition par séquence (storyboard), avec la case de référence comme illustration.
- **Montage** : plan de montage CSV et SRT existants, enrichis de l'identifiant de chaque visuel.

## 10. Ressources matérielles et tailles

| Profil | Matériel | Moteurs conseillés | Téléchargement |
|---|---|---|---|
| Léger (portable sans GPU, 8 Go) | 4 cœurs | Tesseract.js ; vision MiniCPM-V 1B ou Qwen3-VL-2B ; rédaction Qwen3-4B | ≈ 4-6 Go |
| Standard (16 Go, GPU 8 Go) | NVIDIA RTX 3060/4060 | Tesseract + MiniCPM-OCR ; Qwen3-VL-4B ; Qwen3-8B | ≈ 10-12 Go |
| Qualité (32 Go, GPU 16-24 Go) | RTX 4080/4090 | Qwen3-VL-8B ; Mistral Small 24B | ≈ 22-25 Go |

Ordres de grandeur sur CPU seul : vision 4B ≈ 20 à 60 s par page ; rédaction 8B ≈ 3-8 mots/s. Avec GPU 8 Go : 3-6 s par page, 30-60 mots/s. À mesurer sur la machine de l'utilisateur par le détecteur de capacités (banc d'essai court).

## 11. Compatibilité Windows et navigateurs

- Windows : Ollama natif (CPU, NVIDIA CUDA, AMD) ; llama.cpp (CUDA, Vulkan). Aucune dépendance Python requise pour la voie recommandée.
- Navigateurs : Tesseract.js partout ; WebGPU (Florence-2, WebLLM) sur Chrome et Edge récents, plus limité sur Firefox et Safari. Accès à `localhost` depuis la version publiée : à tester par navigateur (autorisation de réseau local), d'où la recommandation du serveur local.

## 12. Plan d'implémentation

| Étape | Contenu | Critère de sortie |
|---|---|---|
| 0.11.0 | Base de connaissances (assertions + migration), détecteur de capacités, panneau « Moteurs », file de traitements en Web Worker (progression, annulation) | aucune régression ; migration vérifiée ; mode manuel inchangé |
| 0.11.1 | OCR niveau 1 (Tesseract.js, fra + eng *fast*, données téléchargées à la demande puis hors ligne), prétraitement, OCR par case | ≥ 85 % des mots sur lettrage courant (corpus réel), tout en « à vérifier » |
| 0.11.2 | Connecteur Ollama + vision (Qwen3-VL) : description de case, ordre, locuteur | propositions toujours sourcées et validables ; annulation fonctionnelle |
| 0.11.3 | Rédaction séquence par séquence + vérificateur de citations et de sources | 0 citation inventée, 100 % des affirmations reliées à une assertion validée |
| 0.11.4 | Intégration Visual Asset Studio, storyboard Motion Studio, exports enrichis | aucune copie inutile, originaux intacts |
| option | PaddleOCR ONNX, WebLLM, MiniCPM-OCR | gain mesuré sur le corpus réel |

## 13. Risques et réponses

| Risque | Réponse |
|---|---|
| Hallucinations (citations, événements) | statut « à vérifier » obligatoire ; vérificateur déterministe ; export final bloqué sur éléments non validés |
| Pas de GPU | profils de modèles légers, traitement en arrière-plan, mode manuel |
| Quota du navigateur (modèles WebLLM) | modèles lourds gardés dans Ollama, pas dans le navigateur |
| Accès `localhost` depuis HTTPS | serveur local recommandé ; documentation `OLLAMA_ORIGINS` |
| Licences des poids | vérification avant intégration ; liste blanche (Apache-2.0 / MIT) |
| Lettrage stylisé, italique | OCR niveau 2 optionnel ; correction manuelle |
| Grands PDF et mémoire | rendu page par page, libération des images, file de traitements |
| Droits des comics | aucune donnée hors de l'appareil ; pas de reproduction longue ; jamais dans Git |

## 14. Tests et critères d'acceptation

Corpus réel minimal (fourni par l'utilisateur, jamais versionné) : 10 numéros variés — comic américain moderne, réimpression ancienne tramée, manga (lecture de droite à gauche), bande dessinée franco-belge, pages pleines, doubles pages, scan PDF basse définition, CBZ aux noms de fichiers irréguliers, lettrage stylisé, bulles partiellement illisibles.

| Domaine | Critère |
|---|---|
| Import | 100 % des CBZ, ZIP et PDF ; CBR refusé avec message ; originaux intacts (empreintes) |
| Ordre des pages | ≥ 98 % correct ; corrections manuelles possibles |
| Doubles pages | précision et rappel ≥ 90 % sur numéros complets |
| Cases | grilles à gouttières : ≥ 80 % de pages justes ; mises en page irrégulières : 100 % signalées, aucune erreur silencieuse |
| OCR niveau 1 | ≥ 85 % des mots sur lettrage courant après prétraitement ; 100 % des sorties « à vérifier » |
| Vision | 100 % des propositions sourcées (page, case) et rejetables ; aucune identité de personnage attribuée sans confirmation |
| Rédaction | 0 citation inventée ; 100 % des affirmations reliées ; durée cible ± 10 % ; corrections acceptées une par une |
| Fiabilité | annulation de tout traitement long ; reprise après fermeture ; fonctionnement hors ligne après téléchargement des modèles |

Outils : `node tools/valider-comics.mjs <dossier>` (import, pages, doubles, doublons, cases, durées ; grille de vérification humaine), banc OCR à reproduire avec la vérité terrain saisie par l'utilisateur.
