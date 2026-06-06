import { createClient } from '@supabase/supabase-js'

// These are baked in at build time from environment variables (Vercel project
// settings, or a local .env). The anon key is public by design; what it can do
// is governed by row level security in Supabase. See supabase-schema.sql.
const url = import.meta.env.VITE_SUPABASE_URL
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Cloud features (sharing, sign-in) only light up when both values are present.
// With them blank, the app runs entirely on localStorage.
export const cloudConfigured = Boolean(url && anonKey)

export const supabase = cloudConfigured
  ? createClient(url, anonKey, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null
