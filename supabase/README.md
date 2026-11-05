# Supabase · Brand Library

**Statut : brouillon. Aucun projet Supabase n'existe et aucune migration n'a été appliquée.**

- `migrations/20261105120000_brand_library_init.sql` : catalogue (`assets`, `asset_files`, `releases`), organisation (`collections`, `favorites`), rôles (`profiles`), bucket privé `brand-assets` et règles d'accès (RLS).
- Accès : seuls les comptes présents dans `profiles` voient quelque chose. Au lancement, un seul compte `owner`.
- Inscription publique à désactiver dans *Authentication > Sign In / Providers* lors de la création du projet.
- Les rôles `editor` et `viewer` existent dans le schéma mais aucune interface d'équipe n'est prévue en v1.

Application prévue au lot 6, après votre accord, d'abord sur un projet de préproduction du forfait gratuit.
