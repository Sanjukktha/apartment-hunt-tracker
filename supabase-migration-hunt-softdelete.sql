-- Recoverable delete for whole hunts. Like listings, a hunt is soft-deleted
-- (marked with a timestamp, not removed) so a mistaken delete can be restored
-- from the dashboard Trash. Its listings stay attached and come back with it.
-- Run once in the Supabase SQL Editor.
alter table public.hunts add column if not exists deleted_at timestamptz;
