import { supabase, cloudConfigured } from './supabase.js'

// Google sign-in via Supabase Auth. Viewing is open to anyone with the link;
// adding or editing requires a signed-in user (enforced by row level security).

export async function getUser() {
  if (!cloudConfigured) return null
  const { data } = await supabase.auth.getUser()
  return data?.user || null
}

export function onAuthChange(callback) {
  if (!cloudConfigured) return () => {}
  const { data } = supabase.auth.onAuthStateChange((_event, session) => {
    callback(session?.user || null)
  })
  return () => data.subscription.unsubscribe()
}

export async function signInWithGoogle() {
  if (!cloudConfigured) return
  // Come back to the same page (keeping ?cloud=1) after the Google round trip.
  const redirectTo = window.location.origin + window.location.pathname + window.location.search
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo },
  })
}

export async function signOut() {
  if (!cloudConfigured) return
  await supabase.auth.signOut()
}

export function displayName(user) {
  if (!user) return ''
  return user.user_metadata?.full_name || user.user_metadata?.name || user.email || 'Signed in'
}

// The owner/attribution fields written onto a listing when saving.
export function attributionFor(user, fallbackName) {
  return {
    user_id: user?.id || null,
    added_by: user ? displayName(user) : fallbackName || 'Someone',
  }
}
