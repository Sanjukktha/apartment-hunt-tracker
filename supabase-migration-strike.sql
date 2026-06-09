-- Strike a lead: keep it visible in the Leads list but mark it as "not pursuing"
-- (owner went silent, no longer interested, etc.) and disconnect it from the
-- Visitations tab and schedule generation. Unlike delete, a struck listing stays
-- in place; the flag just toggles. Run this in the Supabase SQL Editor.

alter table public.listings add column if not exists struck boolean default false;
