-- Recoverable delete. Listings are soft-deleted (marked with a timestamp, not
-- removed), so a mistaken delete by anyone with the link can be restored from
-- the Trash view. Run once in the Supabase SQL Editor.
alter table public.listings add column if not exists deleted_at timestamptz;
