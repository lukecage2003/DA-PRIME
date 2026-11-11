# Blocages

| ID | Blocage | Effet | Levée | Décision liée | État |
|---|---|---|---|---|---|
| B-001 | Le poste Windows de développement n'a pas été inspecté : la session s'exécute dans un conteneur Linux sans GPU | Aucune validation Windows ; matériel réel inconnu ; phase 2 impossible | Lancer l'inspection sur le poste Windows (session locale ou dossier du poste connecté à cette session), ou transmettre la sortie d'un script d'inventaire | D-002 | Ouvert |
| B-002 | Dossier maître de reprise introuvable | Exigences historiques et prototypes A1–A15 inconnus ; traçabilité limitée aux règles de la consigne | Fournir le document | D-003 | Ouvert |
| B-003 | Répertoire de travail occupé par un autre projet | Emplacement définitif non fixé | Choisir dépôt dédié ou sous-dossier | D-001 | Ouvert (contourné par un sous-dossier isolé) |
| B-004 | Pages GitHub de MLT refusées par le proxy du conteneur (403) | État actuel du support Windows de MLT non vérifié à la source | Vérifier depuis le poste Windows, ou autoriser l'hôte | — | Ouvert, non critique |
