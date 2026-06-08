-- Quick fix: let the database stamp a hunt's owner automatically with the signed
-- in user's id, so the row level security check on insert always passes.
-- Run this once in the Supabase SQL Editor.
alter table public.hunts alter column owner_id set default auth.uid();
