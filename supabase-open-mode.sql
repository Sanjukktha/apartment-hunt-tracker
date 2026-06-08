-- Open mode (no sign-in). Run this on the project to let the app read and write
-- with just the publishable key, no Google sign-in required. Anyone with the site
-- link can view and edit, which is fine for a private family tool.
-- This is the simple, reliable fallback when JWT/auth verification is misbehaving.

alter table public.hunts        disable row level security;
alter table public.hunt_members disable row level security;
alter table public.listings     disable row level security;

-- owner_id is no longer set by a signed-in user, so allow it to be empty.
alter table public.hunts alter column owner_id drop not null;
alter table public.hunts alter column owner_id drop default;

grant select, insert, update, delete on public.hunts, public.hunt_members, public.listings to anon, authenticated;
