# Atelier · prototype (miniatures YouTube)

Interface web légère pour remplir les gabarits : choisir une famille et une variante, saisir les textes, importer et recadrer les images, contrôler, exporter. **Aucun compte, aucun serveur distant, aucune synchronisation** : tout reste sur l'appareil.

## Lancer

```bash
npm run atelier            # http://localhost:4173/atelier/ (cet ordinateur)
node tools/serve.mjs 4173 --reseau   # accessible depuis une tablette ou un téléphone du même réseau Wi-Fi
```

Sur iPad ou Android, ouvrir `http://<adresse-de-l-ordinateur>:4173/atelier/`. Limite : sans HTTPS, les navigateurs n'activent pas le mode hors ligne ni l'installation comme application ; l'Atelier fonctionne, mais seulement tant que l'ordinateur sert les fichiers. Le mode hors ligne complet sur tablette et téléphone demandera un hébergement HTTPS (prévu plus tard, après accord).

## Utiliser

1. **Famille** et **Variante** : boutons en haut du panneau.
2. **Textes** : la miniature se met à jour à chaque frappe ; le titre s'ajuste seul.
3. **Images** : *Importer* (PNG, JPG, WebP, AVIF ; réduites à 3000 px de côté), *Recentrer*, *Substitution* (revenir au placeholder), curseur de zoom.
4. **Recadrer** dans l'aperçu : glisser au doigt, à la souris ou au stylet ; pincer à deux doigts ou molette pour zoomer. Quand une miniature a plusieurs images, celle sous le doigt devient active.
5. **Contrôles** : la liste signale erreurs, points d'attention et informations (voir `docs/GABARITS.md`).
6. **Exporter** :
   - PNG 1280 × 720 ;
   - JPG 1280 × 720, qualité 90, réduite automatiquement jusqu'à 60 pour rester sous 2 Mo (limite YouTube) ;
   - SVG autonome : images et polices intégrées.

Le brouillon (famille, variante, textes) est gardé sur l'appareil ; les images importées ne le sont pas.

## Vérifié et non vérifié

`npm run test:atelier` exécute 31 tests dans Chromium : rendu des 19 variantes, alertes, import (PNG transparent, image 4000 × 3000 réduite), glisser et molette à la souris, glisser et pincer au doigt (événements tactiles réels de Chromium), exports PNG, JPG et SVG (dimensions, poids, aucune ressource externe), rechargement hors ligne, absence de défilement horizontal et cibles tactiles de 44 px aux tailles Galaxy S25, iPad M2 (portrait et paysage) et Windows (1366 et 1920 px).

**Non vérifié** : aucun appareil physique, aucun navigateur Safari ni Samsung Internet (seul Chromium est disponible ici). Points à confirmer sur iPad : export PNG/JPG (rendu des polices intégrées dans Safari) et téléchargement vers l'app Fichiers.
