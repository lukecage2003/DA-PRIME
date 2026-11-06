# Gabarits : miniatures YouTube, supports Kiosque et infographies

**Statut : provisoire.** Tous les gabarits portent le sceau P issu de la vectorisation **NON OFFICIELLE** du logo, et le jaune `#FFE500` reste une proposition. Ils se régénèrent automatiquement (`npm run build:templates`) quand le logo ou les couleurs sont validés.

## Organisation

```
templates/
  _systeme/
    briques.js       formats, couleurs, grille, mesure et ajustement du texte, formes, images, filtres
    familles.js      les 11 familles de miniatures et leurs variantes
    kiosque.js       les gabarits Kiosque 4:5 (lot 3)
    infographies.js  structures de données, validation, schéma JSON et gabarits d'infographies
    editorial.js     briques Kiosque partagées
    registre.js      la liste des supports et leur format
    moteur.js        rendre(famille, variante, données) -> SVG + alertes de contrôle
    tokens.js, logo.js, placeholders.js, metrics.js   modules générés, ne pas éditer
  miniatures/
    <famille>/PS_MIN_<famille>_<variante>_NON-OFFICIEL.svg   gabarit modifiable
    <famille>/exemples/*.jpg                                 rendu avec images PLACEHOLDER
    PS_MIN_planche-168px_NON-OFFICIEL.png                    planche de lisibilité smartphone
    catalogue.json                                           familles, variantes, champs
  kiosque/
    <gabarit>/PS_CAR_… ou PS_FICHE_…_NON-OFFICIEL.svg        1080 × 1350
    <gabarit>/exemples/*.jpg · PS_CAR_planche-360px_NON-OFFICIEL.png · catalogue.json
```

Le même moteur sert à générer les fichiers et à faire fonctionner l'Atelier : un gabarit modifié change partout à la fois.

## Architecture commune des supports

`templates/_systeme/registre.js` est la seule liste des supports :

| Collection | Format | Gabarits | Préfixe | Planche de lisibilité |
|---|---|---|---|---|
| Miniatures YouTube | 1280 × 720 | `familles.js` | `PS_MIN_` | 168 px |
| Kiosque | 1080 × 1350 | `kiosque.js` | `PS_CAR_`, `PS_FICHE_` | 360 px |
| Infographies | 1920 × 1080 | `infographies.js` (données JSON) | `PS_INFO_` | aucune |

Un gabarit déclare ses champs (`texte`, `texte-long`, `choix`, `image`, `json`) et ses variantes ; le moteur choisit le format de sa collection, applique les contrôles communs et renvoie le SVG, les alertes, les zones d'image et le format. L'Atelier, la génération des fichiers et les tests lisent tous ce registre : ajouter un support revient à ajouter une collection.

Briques partagées : `briques.js` (formats, texte, formes, images, filtres) et `editorial.js` (masthead, trame, styles serif, corps et mono, communs à Kiosque et aux infographies).

## Les 11 familles (25 variantes)

| Famille | Variantes | Images |
|---|---|---|
| 01 · Analyse de personnage | Fond jaune · Fond noir · Personnage à gauche | personnage détouré |
| 02 · Analyse de comic | Couverture inclinée · Fond jaune · Deux couvertures | 1 ou 2 couvertures (note 0 à 5 en étoiles vectorielles) |
| 03 · Actualités Marvel et DC | Bandeau noir · Bandeau jaune | personnage détouré (pastille rouge ACTU, éditeur) |
| 04 · Théories | Point d'interrogation · Titre à gauche | image plein cadre, assombrie |
| 05 · Guides de lecture | Trois couvertures · Deux couvertures · Fond noir | 2 ou 3 couvertures numérotées |
| 06 · Événements | Titre en bas · Titre en haut | 2 personnages, un par univers |
| 07 · Histoire des comics | Bichromie · Image en couleur | personnage détouré (année géante) |
| 08 · Dossiers cosmiques et multiversels | Décor seul · Personnage en surimpression | décor plein cadre (+ personnage) |
| 09 · Affiche cinéma | Nuit argentée · Ambre | image plein cadre assombrie, bandes de format scope, accroche en italique, titre espacé |
| 10 · Duel | Coupe jaune · Coupe rouge | 2 images en coupe diagonale, badge central, noms des deux combattants |
| 11 · Une éditoriale | Papier · Encre | visuel encadré à ombre décalée, filets, accroche en italique, numéro |

Constantes de toutes les familles : rubrique en haut à gauche, sceau en bas à gauche, marge de 58 px, coin bas droit (192 × 80 px) laissé libre pour la durée, crédit vertical au bord droit.

## Structure d'un fichier SVG

Calques nommés, reconnus comme calques par Inkscape et comme groupes par Figma :

| Calque | Contenu |
|---|---|
| Fond | aplat ou dégradé |
| Illustration | images (`data-ps-champ="personnage"`, `couverture`, `decor`…), filtres liseré, bichromie, assombri |
| Graphisme | incision, filets, bandeaux, étoiles, « ? » |
| Textes | titre et textes secondaires, texte vivant (`data-ps-champ="titre"`…) |
| Marque | rubrique, sceau P (`data-ps-statut="NON-OFFICIEL"`), crédit |
| Guides (masqué) | marges et zone de durée |

Les textes sont en majuscules dans le fichier (la casse est appliquée par le moteur). Les images des fichiers du dépôt pointent vers `brand/99_tests/substitution/` par chemin relatif.

## Modifier sans l'Atelier

- **Inkscape** (gratuit, Windows) : ouvrir le SVG ; installer d'abord les polices de `brand/03_fonts/` (fichiers statiques). Remplacer une image : clic droit > *Propriétés de l'image* > lien.
- **Figma** (navigateur, tous appareils) : glisser le SVG dans un fichier ; les calques deviennent des groupes, les textes restent modifiables si les polices sont disponibles dans Figma.
- Un SVG exporté par l'Atelier contient ses images et ses polices : il s'affiche à l'identique partout, mais il est plus lourd.

## Contrôles intégrés au moteur

| Contrôle | Niveau |
|---|---|
| Texte qui ne tient pas dans sa zone, même à la taille minimale | erreur |
| Texte dans le coin masqué par la durée YouTube | erreur |
| Champ ou image obligatoire vide | erreur |
| Plus de 3 mots dans le titre | attention |
| Capitales du titre sous 86 px (12 % de la hauteur) : peu lisible à 168 px de large | attention |
| Image agrandie plus de 1,5 fois (risque de flou) | attention |
| Crédit artiste manquant | attention |
| Image de substitution utilisée | info |

La taille du titre s'ajuste automatiquement (de 170 à 72 px selon la famille) à partir des métriques réelles des polices, avec la typographie française (espace insécable avant ? ! : ;).

## Supports Kiosque (lot 3) · format 4:5, 1080 × 1350

| Gabarit | Usage | Champs principaux |
|---|---|---|
| `car-couverture` | 1re diapositive d'un carrousel | titre serif, image en case-cadre, rubrique, n°, pied, pagination |
| `car-presentation-comic` | un comic par diapositive (guides, critiques) | couverture, titre, éditeur · année, auteurs, parution, niveau 1 à 3, accroche |
| `car-recit` | texte long (dossiers historiques) | surtitre daté, titre, texte, deux repères |
| `car-chiffre-cle` | chiffre fort, à partager en story | surtitre, chiffre, phrase, source |
| `car-faits` | actualité : ce qu'on sait | titre, trois faits numérotés |
| `car-avis` | dernière diapositive : avis de la rédaction | surtitre, citation |
| `fiche-personnage` (case jaune · case noire) | collection numérotée | nom, identité, 3 données, 3 lectures avec auteurs, personnage détouré |

Règles Kiosque : fond papier avec trame Ben-Day à 7 %, masthead (logotype NON OFFICIEL, rubrique · n°, filet de 5 px), marge de 65 px, titres en Instrument Serif italique, textes en Archivo, repères en JetBrains Mono, pagination en bas à droite. Pas de contrôle de zone de durée (propre à YouTube) ; capitales minimales de 48 px pour les titres.

Ces gabarits se modifient dans l'Atelier, diapositive par diapositive (Support *Kiosque*), ou dans Inkscape ou Figma. Il n'y a pas d'éditeur de carrousel complet (enchaînement des diapositives) à ce stade.

## Infographies

Voir `docs/INFOGRAPHIES.md`.
