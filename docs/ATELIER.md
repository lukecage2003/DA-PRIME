# Atelier · prototype

> **Motion Studio** (studio de composition et de motion design, lots 4 et 5) s'ouvre depuis le bouton *Motion Studio →* de l'en-tête : voir `docs/MOTION_STUDIO.md`.

Interface web légère pour remplir les gabarits des trois supports (Miniatures YouTube, Kiosque, Infographies) : choisir un support, un gabarit et une variante, saisir les textes, importer et recadrer les images, contrôler, exporter. **Aucun compte, aucun serveur distant, aucune synchronisation** : tout reste sur l'appareil.

## Tester sur le Galaxy S25

1. Sur le PC Windows (même réseau Wi-Fi que le téléphone) : `npm run atelier:reseau`. La commande affiche l'adresse à ouvrir, par exemple `http://192.168.1.20:4173/atelier/`. Autoriser Node.js dans le pare-feu Windows si une fenêtre le demande (réseau privé).
2. Sur le S25 : ouvrir cette adresse dans Chrome ou Samsung Internet.
3. À tester : changer de famille et de variante, saisir un titre (vérifier le résumé des contrôles), importer une photo de la galerie, glisser et pincer dans l'aperçu, fermer puis rouvrir l'onglet (le brouillon doit revenir), exporter en JPG et utiliser *Partager (JPG)*.
4. Limite : en HTTP sur le réseau local, le navigateur n'active ni le mode hors ligne ni l'installation comme application ; le PC doit rester allumé. Le mode hors ligne se teste sur le PC (`npm run atelier`, adresse `localhost`).

## Lancer

```bash
npm run atelier            # http://localhost:4173/atelier/ (cet ordinateur)
npm run atelier:reseau     # accessible depuis une tablette ou un téléphone du même réseau Wi-Fi
```

Sur iPad ou Android, ouvrir `http://<adresse-de-l-ordinateur>:4173/atelier/`. Limite : sans HTTPS, les navigateurs n'activent pas le mode hors ligne ni l'installation comme application ; l'Atelier fonctionne, mais seulement tant que l'ordinateur sert les fichiers. Le mode hors ligne complet sur tablette et téléphone demandera un hébergement HTTPS (prévu plus tard, après accord).

## Utiliser

1. **Support**, **Gabarit** et **Variante** : boutons en haut du panneau. L'aperçu prend les proportions du support (16:9 ou 4:5) ; sur téléphone et tablette, il ne dépasse pas la moitié de la hauteur de l'écran. Chaque support retrouve la dernière création ouverte.
2. **Textes** : l'aperçu se met à jour à chaque frappe ; les titres s'ajustent seuls ; les textes longs (Kiosque) ont une zone multiligne. Pour les infographies, le champ *Données (JSON)* se modifie directement ou s'importe en fichier (voir `docs/INFOGRAPHIES.md`).
3. **Images** : *Importer* (PNG, JPG, WebP, AVIF ; réduites à 3000 px de côté), *Recentrer*, *Substitution* (revenir au placeholder), curseur de zoom.
4. **Recadrer** dans l'aperçu : glisser au doigt, à la souris ou au stylet ; pincer à deux doigts ou molette pour zoomer. Quand une miniature a plusieurs images, celle sous le doigt devient active.
5. **Contrôles** : la liste signale erreurs, points d'attention et informations (voir `docs/GABARITS.md`).
6. **Exporter** :
   - PNG 1280 × 720 ;
   - JPG 1280 × 720, qualité 90, réduite automatiquement jusqu'à 60 pour rester sous 2 Mo (limite YouTube) ;
   - SVG autonome : images et polices intégrées.

**Sauvegarde automatique** : un brouillon par famille (textes, variante, images importées, recadrage), enregistré sur l'appareil (IndexedDB) quelques dixièmes de seconde après chaque modification. Il est retrouvé après fermeture de l'onglet, redémarrage du navigateur ou retour sur une famille. *Réinitialiser le brouillon* l'efface pour la famille affichée. Rien ne quitte l'appareil.

**Photos de téléphone** : l'orientation de la photo est appliquée puis figée à l'import. Les photos HEIC/HEIF (option « haute efficacité » de l'appareil photo) ne sont pas lisibles par tous les navigateurs : régler l'appareil photo en JPEG ou convertir la photo.

**Partager (JPG)** : bouton affiché seulement si le navigateur sait partager des fichiers (Chrome Android, Safari iPadOS). Il ouvre la feuille de partage du système : Galerie, Fichiers, Drive, messagerie.

Sur téléphone, familles et variantes défilent horizontalement sur une ligne, et le bouton à côté de l'aperçu résume les contrôles (« 2 points d'attention ») et mène à leur détail.

## Vérifié et non vérifié

`npm test` exécute les tests du moteur (15, dans Node), ceux de l'Atelier (54, dans Chromium) puis ceux de Motion Studio (93, voir `docs/MOTION_STUDIO.md`). Tests de l'Atelier : rendu des 19 variantes, alertes, import (PNG transparent, image 4000 × 3000 réduite), glisser et molette à la souris, glisser et pincer au doigt (événements tactiles réels de Chromium), exports PNG, JPG et SVG (dimensions, poids, aucune ressource externe), édition des 8 diapositives Kiosque, débordement d'un texte long, export 1080 × 1350, données JSON (mal formées, mauvaise structure, mauvais type, import et export de fichier, export 1920 × 1080), retour aux miniatures, sauvegarde et récupération du brouillon après rechargement, photo avec orientation EXIF importée sur S25 émulé, résumé des contrôles visible sans défiler, rechargement hors ligne, absence de défilement horizontal et cibles tactiles de 44 px aux tailles Galaxy S25, iPad M2 (portrait et paysage) et Windows (1366 et 1920 px).

**Non vérifié** : aucun appareil physique, aucun navigateur Safari ni Samsung Internet (seul Chromium est disponible ici). Points à confirmer sur iPad : export PNG/JPG (rendu des polices intégrées dans Safari) et téléchargement vers l'app Fichiers.
