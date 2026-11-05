-- Primestone Brand Library · schéma initial
-- STATUT : BROUILLON, NON APPLIQUÉ. Aucun projet Supabase n'a été créé.
-- À appliquer uniquement après accord explicite (lot 6), d'abord sur un projet de préproduction.
-- Principe : accès réservé aux comptes présents dans public.profiles. Inscription publique désactivée.

create type public.app_role as enum ('owner', 'editor', 'viewer');

create table public.profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  role         public.app_role not null default 'viewer',
  display_name text,
  created_at   timestamptz not null default now()
);

-- Rôle de l'utilisateur courant (null si non membre). security definer pour éviter la récursion RLS.
create function public.member_role() returns public.app_role
language sql stable security definer set search_path = '' as $$
  select role from public.profiles where user_id = auth.uid()
$$;
revoke all on function public.member_role() from public, anon;
grant execute on function public.member_role() to authenticated;

create table public.releases (
  version      text primary key check (version ~ '^\d+\.\d+\.\d+$'),
  channel      text not null check (channel in ('officiel', 'provisoire')),
  published_at timestamptz not null default now(),
  manifest     jsonb not null,
  notes        text
);

create table public.assets (
  id              text primary key check (id ~ '^[a-z0-9][a-z0-9-]*$'),
  title           text not null,
  category        text not null,
  kind            text not null,
  status          text not null check (status in ('officiel', 'provisoire', 'non-officiel', 'reference')),
  tags            text[] not null default '{}',
  usage           text,
  current_version text not null,
  preview_path    text,
  updated_at      timestamptz not null default now()
);
create index assets_category_idx on public.assets (category);
create index assets_tags_idx on public.assets using gin (tags);

create table public.asset_files (
  asset_id text not null references public.assets (id) on delete cascade,
  version  text not null,
  path     text not null,            -- clé dans le bucket brand-assets, identique au chemin du dépôt
  format   text not null,
  bytes    bigint not null,
  sha256   text not null check (sha256 ~ '^[a-f0-9]{64}$'),
  width    numeric, height numeric, scale smallint,
  primary key (asset_id, version, path)
);

create table public.collections (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name       text not null,
  created_at timestamptz not null default now()
);
create table public.collection_items (
  collection_id uuid not null references public.collections (id) on delete cascade,
  asset_id      text not null references public.assets (id) on delete cascade,
  position      integer not null default 0,
  primary key (collection_id, asset_id)
);
create table public.favorites (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  asset_id   text not null references public.assets (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, asset_id)
);

alter table public.profiles         enable row level security;
alter table public.releases         enable row level security;
alter table public.assets           enable row level security;
alter table public.asset_files      enable row level security;
alter table public.collections      enable row level security;
alter table public.collection_items enable row level security;
alter table public.favorites        enable row level security;

create policy "profil : lecture de soi" on public.profiles for select to authenticated using (user_id = (select auth.uid()) or (select public.member_role()) = 'owner');

-- Catalogue : lecture par tout membre, écriture par le propriétaire
create policy "releases : lecture membres" on public.releases for select to authenticated using ((select public.member_role()) is not null);
create policy "releases : écriture owner" on public.releases for all to authenticated using ((select public.member_role()) = 'owner') with check ((select public.member_role()) = 'owner');
create policy "assets : lecture membres" on public.assets for select to authenticated using ((select public.member_role()) is not null);
create policy "assets : écriture owner" on public.assets for all to authenticated using ((select public.member_role()) = 'owner') with check ((select public.member_role()) = 'owner');
create policy "fichiers : lecture membres" on public.asset_files for select to authenticated using ((select public.member_role()) is not null);
create policy "fichiers : écriture owner" on public.asset_files for all to authenticated using ((select public.member_role()) = 'owner') with check ((select public.member_role()) = 'owner');

-- Organisation personnelle : chacun ne voit que ses collections et favoris
create policy "collections : propriétaire" on public.collections for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()) and (select public.member_role()) is not null);
create policy "éléments : via collection" on public.collection_items for all to authenticated
  using (exists (select 1 from public.collections c where c.id = collection_id and c.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.collections c where c.id = collection_id and c.owner_id = (select auth.uid())));
create policy "favoris : propriétaire" on public.favorites for all to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()) and (select public.member_role()) is not null);

-- Stockage : bucket privé, téléchargements par liens signés temporaires uniquement
insert into storage.buckets (id, name, public, file_size_limit)
values ('brand-assets', 'brand-assets', false, 52428800);  -- 50 Mo par fichier (limite du forfait gratuit)

create policy "brand-assets : lecture membres" on storage.objects for select to authenticated
  using (bucket_id = 'brand-assets' and (select public.member_role()) is not null);
create policy "brand-assets : dépôt owner" on storage.objects for insert to authenticated
  with check (bucket_id = 'brand-assets' and (select public.member_role()) = 'owner');
create policy "brand-assets : mise à jour owner" on storage.objects for update to authenticated
  using (bucket_id = 'brand-assets' and (select public.member_role()) = 'owner');
create policy "brand-assets : suppression owner" on storage.objects for delete to authenticated
  using (bucket_id = 'brand-assets' and (select public.member_role()) = 'owner');
