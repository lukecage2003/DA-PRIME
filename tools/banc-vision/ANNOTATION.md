# Grille d'annotation humaine — banc Comic Vision

L'annotation est la **référence**. Elle est faite par vous, sur l'image, **avant** de lire la moindre sortie de modèle pour cette page. Une proposition automatique (cases détectées par DA-PRIME, blocs OCR) peut servir de point de départ, mais elle ne devient référence qu'après correction et signature (`valide_par`). Une annotation sans `valide_par` est ignorée par le noteur.

Fichier : `<corpus>/annotations/<page>.json`, conforme à `schemas/annotation.schema.json` (modèle vide : `modele-annotation.json`). Jamais dans le dépôt Git.

## Ordre de travail (≈ 30 à 60 min par page, estimation)

1. **Corpus** : `reglage` (on a le droit de regarder les sorties et d'ajuster invites et paramètres) ou `controle` (on ne regarde ses sorties qu'une fois tous les réglages figés). Ne jamais déplacer une page de contrôle vers le réglage après avoir vu ses résultats sans le noter.
2. **Nature de la page** : histoire, couverture, crédits, résumé, distribution, texte, publicité, autre. Une couverture ou une page de crédits n'est pas une page d'histoire : on n'y attend ni dialogue ni continuité.
3. **Cases** : corriger la proposition de DA-PRIME (`entrees/<page>.json`, champ `cases_source`). Zone en fractions de la page, ordre de lecture. Pour une case sans bord (débordante, incrustée), tracer le rectangle englobant et le noter dans `ambigu`.
4. **Personnages** : un identifiant par personne **sur la page** (`PA`, `PB`…), le même d'une case à l'autre si c'est la même personne. Un rectangle par apparition (champ `case`). `identite` : le nom seulement si vous le connaissez ; `identite_deductible_de_la_page` = vrai **uniquement** si la page elle-même permet de le savoir (nom lu dans une bulle, une légende, un générique). Un modèle n'est pas pénalisé de ne pas nommer quelqu'un que la page ne nomme pas ; il l'est s'il nomme sans justification.
5. **Expressions et postures** : vocabulaire simple (« en colère », « effrayé », « neutre » ; « debout », « accroupi », « en chute »). Si vous hésitez vous-même, écrivez-le dans `ambigu`.
6. **Objets** : seulement ceux qui comptent pour l'histoire ou l'action (`important: true`) ; le décor anodin peut être omis.
7. **Actions** : `agent verbe cible` + `synonymes` acceptables (« frappe » ≈ « cogne », « donne un coup de poing »).
8. **Relations spatiales et interactions** : uniquement celles qui sont nettes.
9. **Bulles** : pour chaque bloc OCR de dialogue ou de pensée (identifiants `O…` de `entrees/<page>.json`), le locuteur (`PA`, `hors_champ`, `narrateur`) et `locuteur_certain` (queue de bulle visible, personnage unique…). Seules les bulles à locuteur certain sont notées automatiquement.
10. **Continuité** (de case à case) : même personnage, suite d'action, changement de lieu ou de temps, type de transition.
11. **Faits de la page** : 3 à 8 phrases courtes, chacune avec sa classe : `visible`, `lu` (vient du texte), `interprete`, `deduit`.
12. **À ne pas inventer** : ce qu'un modèle serait tenté d'affirmer à tort (un nom connu du personnage non écrit sur la page, une arme absente, une mort non montrée…). Le noteur le cherche dans les sorties.
13. **Ambiguïtés** : ce que même un lecteur humain ne peut pas trancher. Un bon modèle doit le signaler comme incertain ; on mesure s'il le fait.
14. Signer : `valide_par` (vos initiales) et `date_validation`.

## Jugement des sorties (fiche CSV produite par `outils/noter.mjs`)

Ouvrir `fiche-jugement.csv` (séparateur `;`, UTF-8). Pour chaque affirmation du modèle, en regardant **l'image** et votre annotation :

| verdict | sens |
|---|---|
| `exact` | juste et suffisamment précis |
| `partiel` | juste dans l'idée, imprécis ou incomplet |
| `faux` | erreur sur quelque chose qui existe (mauvais locuteur, mauvaise expression, mauvaise case) |
| `invente` | ce qui est affirmé **n'existe pas** dans l'image ni dans le texte (personnage, objet, action, événement, nom, citation) |
| `non_verifiable` | impossible à trancher, même pour vous (exclu des taux) |

Lignes `ambiguite_reference` : `signale` (le modèle a marqué l'incertitude), `affirme` (il a tranché avec assurance), `absent` (il n'en parle pas).

Règles de cohérence entre juges : juger sans connaître le nom du modèle si possible (les dossiers de résultats peuvent être renommés) ; en cas de doute entre `faux` et `invente`, poser la question « la chose existe-t-elle sur la page ? » — oui → `faux`, non → `invente`.
