-- Apartment Hunt Helper: Supabase schema (v2, accounts + hunts + collaboration).
-- Run this in the Supabase SQL Editor for a new project. If you are upgrading an
-- existing v1 project, run supabase-migration-v2.sql instead.
--
-- Model: every user signs in with Google. A user owns "hunts". The owner can
-- invite collaborators by email; an invited person who signs in with that email
-- can view and add listings in that hunt. Owners manage the hunt and its members.

-- 1. Tables -------------------------------------------------------------

create table if not exists public.hunts (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null default auth.uid(),
  name       text not null,
  prefs      jsonb default '{}'::jsonb,   -- { searchAreas, closeTo, defaultMode }
  created_at timestamptz not null default now()
);

create table if not exists public.hunt_members (
  id            uuid primary key default gen_random_uuid(),
  hunt_id       uuid not null references public.hunts(id) on delete cascade,
  invited_email text not null,            -- stored lowercased
  user_id       uuid,                     -- filled in when they first sign in
  role          text default 'member',
  created_at    timestamptz not null default now(),
  unique (hunt_id, invited_email)
);

create table if not exists public.listings (
  id          uuid primary key default gen_random_uuid(),
  hunt_id     uuid references public.hunts(id) on delete cascade,
  created_at  timestamptz not null default now(),
  status      text,
  address     text,
  type        text,
  rent        numeric,
  location    text,
  visit              text,
  visit_confirmed    boolean default false,
  visit_timing_type  text,
  visit_window_start text,
  visit_window_end   text,
  rating      int,
  notes       text,
  contact_name   text,
  contact_number text,
  contact_method text,
  commutes    jsonb default '[]'::jsonb,
  media       jsonb default '[]'::jsonb,
  added_by    text,
  user_id     uuid,
  deleted_at  timestamptz   -- soft delete: non-null means it is in the Trash
);

create index if not exists listings_hunt_id_idx on public.listings (hunt_id);
create index if not exists hunt_members_email_idx on public.hunt_members (lower(invited_email));

-- 2. Access helper ------------------------------------------------------
-- SECURITY DEFINER so it can read the tables without tripping the policies
-- below (which would otherwise recurse).

create or replace function public.has_hunt_access(h uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.hunts where id = h and owner_id = auth.uid()
  ) or exists (
    select 1 from public.hunt_members m
    where m.hunt_id = h
      and lower(m.invited_email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

create or replace function public.is_hunt_owner(h uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (select 1 from public.hunts where id = h and owner_id = auth.uid());
$$;

-- 3. Row level security -------------------------------------------------

alter table public.hunts enable row level security;
alter table public.hunt_members enable row level security;
alter table public.listings enable row level security;

grant select, insert, update, delete on public.hunts, public.hunt_members, public.listings to authenticated;

-- Hunts: you see hunts you own or are a member of; only the owner edits/deletes.
drop policy if exists "hunts read"   on public.hunts;
drop policy if exists "hunts insert" on public.hunts;
drop policy if exists "hunts update" on public.hunts;
drop policy if exists "hunts delete" on public.hunts;
create policy "hunts read"   on public.hunts for select to authenticated using (public.has_hunt_access(id));
create policy "hunts insert" on public.hunts for insert to authenticated with check (owner_id = auth.uid());
create policy "hunts update" on public.hunts for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "hunts delete" on public.hunts for delete to authenticated using (owner_id = auth.uid());

-- Members: anyone with access can see the member list; only the owner manages it.
drop policy if exists "members read"   on public.hunt_members;
drop policy if exists "members insert" on public.hunt_members;
drop policy if exists "members update" on public.hunt_members;
drop policy if exists "members delete" on public.hunt_members;
create policy "members read"   on public.hunt_members for select to authenticated using (public.has_hunt_access(hunt_id));
create policy "members insert" on public.hunt_members for insert to authenticated with check (public.is_hunt_owner(hunt_id));
create policy "members update" on public.hunt_members for update to authenticated using (public.is_hunt_owner(hunt_id)) with check (public.is_hunt_owner(hunt_id));
create policy "members delete" on public.hunt_members for delete to authenticated using (public.is_hunt_owner(hunt_id));

-- Listings: any owner or member of the hunt can read and write.
drop policy if exists "listings read"   on public.listings;
drop policy if exists "listings insert" on public.listings;
drop policy if exists "listings update" on public.listings;
drop policy if exists "listings delete" on public.listings;
create policy "listings read"   on public.listings for select to authenticated using (public.has_hunt_access(hunt_id));
create policy "listings insert" on public.listings for insert to authenticated with check (public.has_hunt_access(hunt_id));
create policy "listings update" on public.listings for update to authenticated using (public.has_hunt_access(hunt_id)) with check (public.has_hunt_access(hunt_id));
create policy "listings delete" on public.listings for delete to authenticated using (public.has_hunt_access(hunt_id));
