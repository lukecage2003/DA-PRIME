# Infographies pilotées par des données JSON

**Statut : provisoire** (logotype NON OFFICIEL, jaune non validé). Format 16:9, 1920 × 1080.

Une infographie = **un fichier JSON** (une création) + **un gabarit** qui le met en page. Les fichiers d'exemple sont dans `data/infographies/`.

## Structures disponibles

| `type` | Gabarit | Contenu |
|---|---|---|
| `chronologie` | `info-chronologie` | 2 à 6 périodes successives, largeurs proportionnelles à leur durée |
| `barres` | `info-barres` | 2 à 6 valeurs en barres horizontales à l'échelle, source obligatoire |

Champs communs : `titre` (obligatoire, 90 caractères), `rubrique` (30), `numero` (12), `source` (160).

### Chronologie

```json
{
  "$schema": "../../schemas/infographie.schema.json",
  "type": "chronologie",
  "titre": "Les quatre âges des comics américains",
  "finEchelle": 2026,
  "periodes": [
    { "nom": "Âge d'or", "debut": 1938, "fin": 1956, "evenement": "Action Comics #1", "detail": "Superman ouvre l'ère des super-héros." },
    { "nom": "Âge moderne", "debut": 1985, "fin": null, "evenement": "Watchmen" }
  ]
}
```

`periodes[]` : `nom` (obligatoire, 30), `debut` (obligatoire, 1800 à 2100), `fin` (même plage, ou `null` pour la dernière période seulement), `evenement` (48), `detail` (130). `finEchelle` est obligatoire si la dernière période reste ouverte.

### Barres

`barres[]` : `label` (obligatoire, 40), `sous` (40), `valeur` (nombre ≥ 0, obligatoire), `affichage` (14, remplace la valeur formatée). Options : `unite` (12), `echelleMax` (valeur de la barre pleine, au moins égale à la plus grande valeur).

## Validation et erreurs

La même spécification (`templates/_systeme/infographies.js`) sert à la validation dans l'Atelier et dans Node, et produit le schéma `schemas/infographie.schema.json` (autocomplétion dans VS Code grâce à la clé `$schema`).

Chaque erreur indique son emplacement, par exemple :

| Donnée | Message |
|---|---|
| virgule oubliée | `JSON invalide (ligne 7) : vérifier les virgules, guillemets et accolades.` |
| `"couleur": "rouge"` | `couleur : champ inconnu (faute de frappe ?).` |
| 7 périodes | `periodes : 7 élément(s), entre 2 et 6 attendus.` |
| période qui finit avant de commencer | `periodes[0].fin : la fin (1940) doit être postérieure au début (1950).` |
| périodes qui se chevauchent | `periodes[1].debut : chevauche la période précédente (qui finit en 1960).` |
| `"valeur": "3"` | `barres[0].valeur : nombre attendu (reçu : string).` |

Tant qu'il reste une erreur, l'aperçu affiche un cadre « Données invalides » et les contrôles listent chaque erreur. Les contrôles de mise en page habituels s'appliquent ensuite (texte qui déborde d'une période trop courte, par exemple).

## Créer une infographie

- **Dans l'Atelier** : Support *Infographies*, choisir le gabarit, modifier le JSON dans la zone de texte, ou *Importer .json*. *Exporter .json* enregistre les données, *Exemple* revient au modèle. Exports PNG, JPG et SVG comme pour les miniatures.
- **Dans le dépôt** : ajouter un fichier dans `data/infographies/`. `npm run build` refuse un fichier invalide ; `npm run check` vérifie aussi sa conformité au schéma.
