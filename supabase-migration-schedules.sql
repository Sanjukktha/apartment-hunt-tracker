-- Saved visit schedules. Run this in the Supabase SQL Editor to add the
-- "Schedules" tab: a generated schedule can be named and saved, then revisited
-- later. One row per saved schedule, scoped to a hunt; the grouped stops live in
-- the `data` JSON so the view can render without recomputing.

create table if not exists public.schedules (
  id         uuid primary key default gen_random_uuid(),
  hunt_id    uuid references public.hunts(id) on delete cascade,
  name       text not null,
  data       jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists schedules_hunt_id_idx on public.schedules (hunt_id);

-- Row level security parity with listings: any owner or member of the hunt can
-- read and write its schedules. (Skipped in open mode, disabled just below.)
alter table public.schedules enable row level security;
grant select, insert, update, delete on public.schedules to authenticated;

drop policy if exists "schedules read"   on public.schedules;
drop policy if exists "schedules insert" on public.schedules;
drop policy if exists "schedules update" on public.schedules;
drop policy if exists "schedules delete" on public.schedules;
create policy "schedules read"   on public.schedules for select to authenticated using (public.has_hunt_access(hunt_id));
create policy "schedules insert" on public.schedules for insert to authenticated with check (public.has_hunt_access(hunt_id));
create policy "schedules update" on public.schedules for update to authenticated using (public.has_hunt_access(hunt_id)) with check (public.has_hunt_access(hunt_id));
create policy "schedules delete" on public.schedules for delete to authenticated using (public.has_hunt_access(hunt_id));

-- Open mode: this deployment runs without sign-in, so match the other tables and
-- let the publishable key read and write directly.
alter table public.schedules disable row level security;
grant select, insert, update, delete on public.schedules to anon, authenticated;
