-- Migration: visit confirmation and timing fields, for the Visitations tab and
-- the schedule generator. Run this in the Supabase SQL Editor if you already
-- created your table from an earlier version of supabase-schema.sql.
-- Safe to run more than once.

alter table public.listings
  add column if not exists visit_confirmed    boolean default false,
  add column if not exists visit_timing_type  text,
  add column if not exists visit_window_start text,
  add column if not exists visit_window_end   text;
