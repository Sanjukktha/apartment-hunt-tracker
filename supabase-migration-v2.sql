-- Migration v1 -> v2: accounts, hunts, and collaboration.
-- Run this once in the Supabase SQL Editor if you already had the v1 schema.
-- It is safe to run more than once. Your existing listings are wrapped into a
-- default hunt owned by whoever added them, so nothing is lost.

-- 1. New tables ---------------------------------------------------------

create table if not exists public.hunts (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null,
  name       text not null,
  prefs      jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.hunt_members (
  id            uuid primary key default gen_random_uuid(),
  hunt_id       uuid not null references public.hunts(id) on delete cascade,
  invited_email text not null,
  user_id       uuid,
  role          text default 'member',
  created_at    timestamptz not null default now(),
  unique (hunt_id, invited_email)
);

-- 2. Extend listings ----------------------------------------------------

alter table public.listings
  add column if not exists hunt_id            uuid references public.hunts(id) on delete cascade,
  add column if not exists visit_confirmed    boolean default false,
  add column if not exists visit_timing_type  text,
  add column if not exists visit_window_start text,
  add column if not exists visit_window_end   text;

create index if not exists listings_hunt_id_idx on public.listings (hunt_id);
create index if not exists hunt_members_email_idx on public.hunt_members (lower(invited_email));

-- 3. Access helpers -----------------------------------------------------

create or replace function public.has_hunt_access(h uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.hunts where id = h and owner_id = auth.uid())
      or exists (select 1 from public.hunt_members m
                 where m.hunt_id = h
                   and lower(m.invited_email) = lower(coalesce(auth.jwt() ->> 'email','')));
$$;

create or replace function public.is_hunt_owner(h uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists (select 1 from public.hunts where id = h and owner_id = auth.uid());
$$;

-- 4. Wrap existing listings into a default hunt per owner ----------------

insert into public.hunts (owner_id, name)
select distinct l.user_id, 'My first hunt'
from public.listings l
where l.user_id is not null
  and l.hunt_id is null
  and not exists (select 1 from public.hunts h where h.owner_id = l.user_id);

update public.listings l
set hunt_id = h.id
from public.hunts h
where l.hunt_id is null and l.user_id = h.owner_id;

-- 5. Security -----------------------------------------------------------

alter table public.hunts enable row level security;
alter table public.hunt_members enable row level security;
alter table public.listings enable row level security;

-- Remove the old public (anon) access from v1.
revoke all on public.listings from anon;
drop policy if exists "listings read"   on public.listings;
drop policy if exists "listings insert" on public.listings;
drop policy if exists "listings update" on public.listings;
drop policy if exists "listings delete" on public.listings;
drop policy if exists "Public read"   on public.listings;
drop policy if exists "Public insert" on public.listings;
drop policy if exists "Public update" on public.listings;
drop policy if exists "Public delete" on public.listings;

grant select, insert, update, delete on public.hunts, public.hunt_members, public.listings to authenticated;

create policy "hunts read"   on public.hunts for select to authenticated using (public.has_hunt_access(id));
create policy "hunts insert" on public.hunts for insert to authenticated with check (owner_id = auth.uid());
create policy "hunts update" on public.hunts for update to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "hunts delete" on public.hunts for delete to authenticated using (owner_id = auth.uid());

create policy "members read"   on public.hunt_members for select to authenticated using (public.has_hunt_access(hunt_id));
create policy "members insert" on public.hunt_members for insert to authenticated with check (public.is_hunt_owner(hunt_id));
create policy "members update" on public.hunt_members for update to authenticated using (public.is_hunt_owner(hunt_id)) with check (public.is_hunt_owner(hunt_id));
create policy "members delete" on public.hunt_members for delete to authenticated using (public.is_hunt_owner(hunt_id));

create policy "listings read"   on public.listings for select to authenticated using (public.has_hunt_access(hunt_id));
create policy "listings insert" on public.listings for insert to authenticated with check (public.has_hunt_access(hunt_id));
create policy "listings update" on public.listings for update to authenticated using (public.has_hunt_access(hunt_id)) with check (public.has_hunt_access(hunt_id));
create policy "listings delete" on public.listings for delete to authenticated using (public.has_hunt_access(hunt_id));
