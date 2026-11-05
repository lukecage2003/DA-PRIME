# Compatibilité future avec Primestone Studio

**Statut : contrat proposé. Aucune intégration, aucune modification de Studio.** Toute intégration se fera après un audit technique du dépôt Studio et votre validation explicite.

## Principes

1. Studio reste autonome : sans connexion à la Brand Library, il fonctionne exactement comme aujourd'hui.
2. Studio n'importe rien de ce dépôt dans son code. Il peut seulement **lire** des fichiers publiés (manifeste, tokens, ressources).
3. Pas d'IA externe, pas de modification du pipeline de production de Studio.
4. Pas de duplication inutile : Studio met en cache les ressources qu'il utilise, identifiées par leur empreinte SHA-256, et ne les retélécharge que si elles changent.

## Ce que la Brand Library publie

| Fichier | Rôle pour Studio |
|---|---|
| `catalog/brand-manifest.json` | Liste des ressources : `id`, catégorie, statut, version, fichiers avec chemin, format, dimensions, taille et SHA-256. Schéma : `schemas/brand-manifest.schema.json` (version 1) |
| `brand/02_tokens/tokens.json` | Tokens au format DTCG 2025.10 (couleurs, polices, grilles, durées, courbe d'animation, angle d'incision) |
| `brand/02_tokens/build/tokens.flat.json` | Les mêmes tokens, aplatis et résolus : le plus simple à lire depuis une application |

## API de lecture (lot 6)

| Lecture | Moyen |
|---|---|
| Dernière version publiée | `releases` triée par `published_at`, champ `manifest` |
| Ressources d'une catégorie | `assets?category=eq.elements` (API REST Supabase) |
| Téléchargement | lien signé de courte durée sur `brand-assets/<path>` |

Studio utiliserait un compte dédié de rôle `viewer` (lecture seule), jamais la clé de service.

## Client TypeScript (lot 6, si pertinent après audit)

Un petit paquet `@primestone/brand-client`, sans dépendance obligatoire, exposerait `getManifest()`, `getTokens()`, `getAsset(id)` et `download(id, { cacheDir })` avec vérification SHA-256. Studio pourrait l'adopter ou lire les mêmes fichiers par ses propres moyens.

## Versions

Le manifeste suit le versionnement sémantique (`docs/CONVENTIONS.md`). Studio pourra épingler une version majeure (par exemple « toute 1.x ») pour ne jamais recevoir un changement cassant sans le décider.
