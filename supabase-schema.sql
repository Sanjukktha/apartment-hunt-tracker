-- Apartment Hunt Tracker: Supabase schema.
-- Run this in the Supabase SQL Editor for a new project.
-- Model: anyone with the link can read; only signed-in users can write.

-- 1. Listings table -------------------------------------------------------

create table if not exists public.listings (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  status      text,
  address     text,
  type        text,
  rent        numeric,
  location    text,
  visit       text,          -- the datetime-local string as entered
  rating      int,
  notes       text,
  contact_name   text,
  contact_number text,
  contact_method text,
  commutes    jsonb default '[]'::jsonb,  -- [{ areaId, label, address, mode, mapsUrl, time, distance }]
  media       jsonb default '[]'::jsonb,  -- [{ url, kind }] kind in ('image','video')
  added_by    text,          -- display name of whoever added it
  user_id     uuid           -- auth.uid() of whoever added it
);

-- 2. Shared settings (the onboarding prefs, so everyone on a shared link
--    generates commutes against the same areas) ---------------------------

create table if not exists public.settings (
  id         text primary key,            -- always 'shared'
  data       jsonb,
  updated_at timestamptz default now()
);

-- 3. Row level security ---------------------------------------------------

alter table public.listings enable row level security;
alter table public.settings enable row level security;

-- Supabase is moving toward revoking automatic grants, so set them explicitly.
grant select on public.listings to anon, authenticated;
grant insert, update, delete on public.listings to authenticated;
grant select on public.settings to anon, authenticated;
grant insert, update, delete on public.settings to authenticated;

-- Listings: open read, signed-in write.
drop policy if exists "listings read"   on public.listings;
drop policy if exists "listings insert" on public.listings;
drop policy if exists "listings update" on public.listings;
drop policy if exists "listings delete" on public.listings;

create policy "listings read"   on public.listings for select to anon, authenticated using (true);
create policy "listings insert" on public.listings for insert to authenticated with check (true);
create policy "listings update" on public.listings for update to authenticated using (true) with check (true);
create policy "listings delete" on public.listings for delete to authenticated using (true);

-- Settings: open read, signed-in write.
drop policy if exists "settings read"  on public.settings;
drop policy if exists "settings write" on public.settings;
drop policy if exists "settings edit"  on public.settings;

create policy "settings read"  on public.settings for select to anon, authenticated using (true);
create policy "settings write" on public.settings for insert to authenticated with check (true);
create policy "settings edit"  on public.settings for update to authenticated using (true) with check (true);

-- Note: to make editing owner-only later, add a policy like
--   using (user_id = auth.uid())
-- on update/delete and drop the permissive ones above.
