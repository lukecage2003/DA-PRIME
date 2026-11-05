# Utilisation dans les applications Adobe

**Aucun script n'a encore été exécuté dans une application Adobe** : ce dépôt est produit sur un serveur sans Photoshop, Illustrator ni After Effects. Les scripts sont vérifiés syntaxiquement (`npm run check`) et en lecture seule. Merci de les lancer une fois et de m'envoyer les rapports.

## 1. Installer les polices (Windows)

Dans `brand/03_fonts/`, sélectionner **les fichiers `.ttf` à la racine** (pas `_variable/`), clic droit > *Installer pour tous les utilisateurs*. Redémarrer les applications Adobe.
Les polices variables de `_variable/` sont réservées au web : installées en même temps que les statiques, elles créent des doublons de noms dans les menus Adobe.

## 2. Importer le nuancier

`brand/02_tokens/build/Primestone.ase` contient les couleurs globales en trois groupes (brand, editorial, cinematic).
- Photoshop : panneau Nuancier > menu > *Importer des nuances…*
- Illustrator : panneau Nuancier > menu > *Ouvrir une bibliothèque de nuances > Autre bibliothèque…*

## 3. Lancer les diagnostics (lecture seule)

| Application | Commande | Script |
|---|---|---|
| Photoshop | Fichier > Scripts > Parcourir… | `templates/photoshop/scripts/PS_diagnostic.jsx` |
| Illustrator | Fichier > Scripts > Autre script… | `templates/illustrator/scripts/AI_diagnostic.jsx` |
| After Effects | Fichier > Scripts > Exécuter le fichier script… | `templates/after-effects/scripts/AE_diagnostic.jsx` |

Chaque script indique la version de l'application, vérifie la présence des polices Primestone et écrit `Primestone_diagnostic_<application>.txt` sur le Bureau. Pour After Effects, cocher d'abord *Préférences > Scripts et expressions > Autoriser les scripts à écrire des fichiers et à accéder au réseau*.

Premiere Pro : indiquer la version affichée dans *Aide > À propos de Premiere Pro*.

## Suite

Les gabarits des lots 2 à 4 (PSD, scripts de construction Illustrator et After Effects, MOGRT) seront finalisés une fois vos versions connues. Ce qui sera vérifiable ici (PSD générés, rendus vidéo) le sera ; ce qui demande l'application Adobe sera indiqué comme « à vérifier par vous ».
