# Journal des décisions

Statuts : **confirmée** (donnée par le porteur du projet) · **proposée** (attend un accord) · **à tester**
(dépend d'un prototype) · **rejetée**. Une décision technique ne devient confirmée qu'avec une preuve.

## Décisions confirmées (source : consigne de phase 1, 2026-11-11)

| ID | Décision | Justification |
|---|---|---|
| K-01 | Windows en priorité | Consigne |
| K-02 | Local-first ; essentiel utilisable hors ligne ; ni compte, ni abonnement, ni API distante obligatoires | Consigne |
| K-03 | Aucune génération d'images, locale ou distante | Consigne |
| K-04 | Claude Code est un outil de développement, jamais un composant du produit | Consigne |
| K-05 | Le Core contrôle les opérations et les modifications des projets | Consigne |
| K-06 | Médias originaux jamais modifiés ni détruits sans autorisation explicite | Consigne |
| K-07 | Aucune intégration Adobe | Consigne |
| K-08 | Qualité et fiabilité avant la vitesse | Consigne |
| K-09 | Projet neuf : aucun ancien dépôt ni code repris | Consigne |
| K-10 | Aucune installation ni modification système sans autorisation explicite | Consigne |

## Décisions en attente de votre accord

| ID | Question | Recommandation | Pourquoi maintenant |
|---|---|---|---|
| **D-001** | Où vit le projet ? Le dépôt `DA-PRIME` contient déjà `primestone-brand`, avec un « Motion Studio » web homonyme | **Dépôt dédié.** À défaut, conserver le sous-dossier isolé `primestone-motion-studio/` | Contredit « projet neuf » ; risque de confusion (R16) |
| **D-002** | Où développe-t-on et teste-t-on ? Cette session tourne sur Linux sans GPU | Poste Windows réel pour les prototypes et les tests ; le cloud Linux pour la documentation et le code indépendant de la plateforme | Bloque toute la phase 2 (B-001) |
| **D-003** | Fournir le dossier maître de reprise | Le déposer dans le projet (`docs/reference/`) | Bloque la traçabilité et A1–A15 (B-002) |
| **D-004** | Licence et mode de distribution de l'application (propriétaire, source ouverte, interne, vente) | À décider par vous | Conditionne l'usage des modules GPL de MLT, du build FFmpeg et des codecs brevetés |
| **D-005** | Versions de Windows supportées et machine de référence (CPU, RAM, GPU, VRAM minimum) | Windows 11 seul simplifie nettement ; Windows 10 n'est plus maintenu par Microsoft | Conditionne WinML, WebView2 et les seuils des prototypes |
| **D-006** | Formats et codecs à garantir en entrée et en sortie | Liste courte garantie + liste « au mieux » | Dimensionne le Media Engine et les tests |
| **D-007** | Autoriser en phase 2 l'installation des outils nécessaires sur le poste Windows (Build Tools, cible Rust MSVC, CLI Tauri, MSYS2 pour MLT) | Oui, liste exacte soumise avant chaque installation | Rien ne peut être prototypé sans cela |
| **D-008** | Arbitrages de recouvrement : whisper.cpp ou sherpa-onnx ; ONNX Runtime embarqué ou WinML | ORT embarqué unique ; choix de la transcription différé à la phase 7 | Évite de porter trois runtimes |
| **D-009** | Les formats d'échange neutres (EDL, FCPXML, AAF) sont-ils dans le périmètre malgré « aucune intégration Adobe » ? | Oui pour les formats ouverts, aucun format propriétaire Adobe | Délimite l'interopérabilité |
| **D-010** | Approuver la roadmap des phases 2 à 8 (`MASTER_PLAN.md`) et le plan de prototypes P0–P5 | — | Condition de sortie de la phase 1 |
| **D-011** | Approuver l'architecture initiale et le principe « moteurs lourds et IA en processus séparés » | Oui | Oriente P1 et P2 |

## Décisions techniques à tester

| ID | Décision | Prototype | Statut |
|---|---|---|---|
| T-01 | Tauri 2 comme conteneur | P0, P1 | à tester |
| T-02 | MLT comme moteur de montage principal | P2 | à tester |
| T-03 | Skia pour le Motion Design ; partage avec MLT | P3 | à tester |
| T-04 | CPAL comme sortie audio et maître d'horloge | P4 | à tester |
| T-05 | Journal d'opérations + SQLite WAL pour la persistance | P5 | à tester |
| T-06 | PP-OCR en ONNX plutôt que le runtime PaddleOCR | Phase 7 | à tester |

## Décisions prises pendant la phase 1 (réversibles)

| ID | Décision | Justification |
|---|---|---|
| L-01 | Documents placés dans `primestone-motion-studio/docs/`, sans toucher au reste du dépôt | `docs/ARCHITECTURE.md` existe déjà à la racine pour un autre projet ; isolation en attendant D-001 |
| L-02 | Prototypes de risque numérotés P0–P5 | Ne pas attribuer de sens aux identifiants A1–A15 sans le dossier |
