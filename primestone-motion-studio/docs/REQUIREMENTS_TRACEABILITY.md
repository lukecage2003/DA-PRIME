# Traçabilité des exigences

**Avertissement.** Le projet compterait 1 735 exigences réparties en 50 parties. Aucune n'est disponible ici : le
dossier maître est absent (B-002) et il n'en est lui-même qu'une synthèse. Ce tableau ne contient donc que les
exigences **énoncées dans la consigne de phase 1**. Aucune exigence n'a été inventée ni déduite.

Statut de l'exigence : confirmée · proposée · à confirmer. Couverture : où elle est prise en charge.

| ID | Exigence | Source | Statut | Couverture actuelle | Vérification prévue |
|---|---|---|---|---|---|
| RQ-001 | Application Windows en priorité | Consigne P1 §1 | Confirmée | Choix techniques évalués sous cet angle | Tests sur poste Windows |
| RQ-002 | Fonctions essentielles utilisables hors ligne | Consigne P1 §1 | Confirmée | Architecture, principe 4 | Test réseau coupé |
| RQ-003 | Aucun compte, abonnement, API distante ou connexion obligatoire | Consigne P1 §1 | Confirmée | Architecture, principe 4 | Audit des dépendances ; test réseau coupé |
| RQ-004 | Aucune génération d'images ; analyse, organisation, transformation, composition, animation de médias existants | Consigne P1 §1 | Confirmée | Local AI Runtime restreint | Revue des modèles embarqués |
| RQ-005 | Claude Code hors du produit final | Consigne P1 §1 | Confirmée | — | Audit des dépendances |
| RQ-006 | Le Core contrôle opérations et modifications des projets | Consigne P1 §1, §6 | Confirmée | Architecture §1, §3 | Tests : aucune écriture hors Edit Operations Engine |
| RQ-007 | Médias originaux jamais modifiés ni détruits sans autorisation explicite | Consigne P1 §1 | Confirmée | Architecture, principe 3 | Empreintes avant/après ; ouverture en lecture seule |
| RQ-008 | Compatibilité, modularité, sécurité, moteurs évolutifs | Consigne P1 §1 | Confirmée | Ports de moteurs, isolation en processus | Remplacement d'un moteur par un bouchon |
| RQ-009 | Aucune intégration Adobe | Consigne P1 §1 | Confirmée ; portée à préciser (D-009) | — | Revue |
| RQ-010 | Qualité et fiabilité avant la vitesse | Consigne P1 §1 | Confirmée | Prototypes avant construction | — |
| RQ-011 | Pas de dépendance circulaire entre moteurs et interface | Consigne P1 §6 | Confirmée | Architecture §3 | Contrôle automatique du graphe de crates |
| RQ-012 | Treize couches minimales de l'architecture | Consigne P1 §6 | Confirmée | Architecture §2, §3 | — |
| RQ-013 | Prototypes A1 à A15 : identifiants et finalité conservés | Consigne P1 §2 | Confirmée ; contenu inconnu | Identifiants réservés | À réception du dossier |
| RQ-014 | Solution de repli CPU en cas d'absence de GPU | Consigne P1 §5 (risque à examiner) | À confirmer comme exigence | Risque R9 | Test sans GPU |
