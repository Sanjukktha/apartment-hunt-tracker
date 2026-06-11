-- Mark a lead as "visited": a quick visual flag that you are still considering
-- the apartment but have already been to see it in person. It does not change the
-- status or remove the lead from anything; it just tints the row (green once
-- visited, a soft amber while still to-visit) and shows a tick on the left.
-- Independent of the "Visited" status and the visit_confirmed flag. Run this in
-- the Supabase SQL Editor.

alter table public.listings add column if not exists visited boolean default false;
