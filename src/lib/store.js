import { supabase, cloudConfigured } from './supabase.js'

// Data layer (v2). The app is account-based: a signed-in user owns hunts, each
// hunt holds listings, and the owner can invite collaborators by email.
//
// When Supabase is configured (production) everything is remote and requires
// sign-in. When it is not (local dev), it falls back to localStorage with a
// single implicit local user so the app still runs without a backend.

const LS_HUNTS = 'apt_hunts_v2'
const LS_LISTINGS = 'apt_listings_v2'

export function cloudAvailable() {
  return cloudConfigured
}

export function isRemote() {
  return cloudConfigured
}

export function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2)
}

function nowIso() {
  return new Date().toISOString()
}

function readLS(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || '[]')
  } catch {
    return []
  }
}

function writeLS(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

// ---- Hunts ----

export async function listHunts() {
  if (isRemote()) {
    const { data, error } = await supabase
      .from('hunts')
      .select('*')
      .is('deleted_at', null)
      .order('created_at', { ascending: true })
    if (error) throw error
    return data || []
  }
  return readLS(LS_HUNTS).filter((h) => !h.deleted_at)
}

// Soft-deleted hunts (the Trash), most recently deleted first.
export async function listDeletedHunts() {
  if (isRemote()) {
    const { data, error } = await supabase
      .from('hunts')
      .select('*')
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  return readLS(LS_HUNTS).filter((h) => h.deleted_at)
}

export async function createHunt({ name, prefs }) {
  if (isRemote()) {
    // owner_id is filled by the database default auth.uid(), so it always matches
    // the RLS check and the browser never has to send it.
    const { data, error } = await supabase
      .from('hunts')
      .insert({ name, prefs: prefs || {} })
      .select()
      .single()
    if (error) throw error
    return data
  }
  const hunt = { id: newId(), name, prefs: prefs || {}, owner_id: 'local', created_at: nowIso() }
  const hunts = readLS(LS_HUNTS)
  hunts.push(hunt)
  writeLS(LS_HUNTS, hunts)
  return hunt
}

export async function updateHunt(id, patch) {
  if (isRemote()) {
    const { data, error } = await supabase.from('hunts').update(patch).eq('id', id).select().single()
    if (error) throw error
    return data
  }
  const hunts = readLS(LS_HUNTS)
  const i = hunts.findIndex((h) => h.id === id)
  if (i > -1) {
    hunts[i] = { ...hunts[i], ...patch }
    writeLS(LS_HUNTS, hunts)
    return hunts[i]
  }
  return null
}

// Soft delete: move the whole hunt to Trash (recoverable). Its listings stay
// attached untouched and reappear when the hunt is restored.
export async function deleteHunt(id) {
  if (isRemote()) {
    const { error } = await supabase.from('hunts').update({ deleted_at: nowIso() }).eq('id', id)
    if (error) throw error
    return
  }
  const hunts = readLS(LS_HUNTS)
  const i = hunts.findIndex((h) => h.id === id)
  if (i > -1) {
    hunts[i] = { ...hunts[i], deleted_at: nowIso() }
    writeLS(LS_HUNTS, hunts)
  }
}

// Bring a trashed hunt back, listings and all.
export async function restoreHunt(id) {
  if (isRemote()) {
    const { error } = await supabase.from('hunts').update({ deleted_at: null }).eq('id', id)
    if (error) throw error
    return
  }
  const hunts = readLS(LS_HUNTS)
  const i = hunts.findIndex((h) => h.id === id)
  if (i > -1) {
    hunts[i] = { ...hunts[i], deleted_at: null }
    writeLS(LS_HUNTS, hunts)
  }
}

// Permanently remove a hunt and everything in it (only from the Trash view).
export async function purgeHunt(id) {
  if (isRemote()) {
    // Listings cascade-delete via the hunt_id foreign key.
    const { error } = await supabase.from('hunts').delete().eq('id', id)
    if (error) throw error
    return
  }
  writeLS(LS_HUNTS, readLS(LS_HUNTS).filter((h) => h.id !== id))
  writeLS(LS_LISTINGS, readLS(LS_LISTINGS).filter((l) => l.hunt_id !== id))
}

// ---- Members (remote only; local dev is single-user) ----

export async function listMembers(huntId) {
  if (!isRemote()) return []
  const { data, error } = await supabase
    .from('hunt_members')
    .select('*')
    .eq('hunt_id', huntId)
    .order('created_at', { ascending: true })
  if (error) throw error
  return data || []
}

export async function inviteMember(huntId, email) {
  if (!isRemote()) return null
  const invited_email = email.trim().toLowerCase()
  const { data, error } = await supabase
    .from('hunt_members')
    .insert({ hunt_id: huntId, invited_email })
    .select()
    .single()
  if (error) throw error
  return data
}

export async function removeMember(memberId) {
  if (!isRemote()) return
  const { error } = await supabase.from('hunt_members').delete().eq('id', memberId)
  if (error) throw error
}

// ---- Listings (scoped to a hunt) ----

export async function listListings(huntId) {
  if (isRemote()) {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('hunt_id', huntId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  return readLS(LS_LISTINGS)
    .filter((l) => l.hunt_id === huntId && !l.deleted_at)
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
}

// Soft-deleted listings (the Trash) for a hunt.
export async function listDeletedListings(huntId) {
  if (isRemote()) {
    const { data, error } = await supabase
      .from('listings')
      .select('*')
      .eq('hunt_id', huntId)
      .not('deleted_at', 'is', null)
      .order('deleted_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  return readLS(LS_LISTINGS).filter((l) => l.hunt_id === huntId && l.deleted_at)
}

export async function upsertListing(record) {
  const row = { ...record }
  if (!row.id) row.id = newId()
  if (!row.created_at) row.created_at = nowIso()

  if (isRemote()) {
    const { data, error } = await supabase.from('listings').upsert(row).select().single()
    if (error) throw error
    return data
  }
  const rows = readLS(LS_LISTINGS)
  const i = rows.findIndex((r) => r.id === row.id)
  if (i > -1) rows[i] = row
  else rows.unshift(row)
  writeLS(LS_LISTINGS, rows)
  return row
}

// Soft delete: move to Trash (recoverable), do not erase.
export async function removeListing(id) {
  if (isRemote()) {
    const { error } = await supabase.from('listings').update({ deleted_at: nowIso() }).eq('id', id)
    if (error) throw error
    return
  }
  const rows = readLS(LS_LISTINGS)
  const i = rows.findIndex((r) => r.id === id)
  if (i > -1) {
    rows[i] = { ...rows[i], deleted_at: nowIso() }
    writeLS(LS_LISTINGS, rows)
  }
}

// Bring a trashed listing back.
export async function restoreListing(id) {
  if (isRemote()) {
    const { error } = await supabase.from('listings').update({ deleted_at: null }).eq('id', id)
    if (error) throw error
    return
  }
  const rows = readLS(LS_LISTINGS)
  const i = rows.findIndex((r) => r.id === id)
  if (i > -1) {
    rows[i] = { ...rows[i], deleted_at: null }
    writeLS(LS_LISTINGS, rows)
  }
}

// Permanently remove a listing (only from the Trash view).
export async function purgeListing(id) {
  if (isRemote()) {
    const { error } = await supabase.from('listings').delete().eq('id', id)
    if (error) throw error
    return
  }
  writeLS(LS_LISTINGS, readLS(LS_LISTINGS).filter((r) => r.id !== id))
}

// Lightweight roll-up across every hunt the user can see, for the dashboard.
export async function allListingsLite() {
  if (isRemote()) {
    const { data, error } = await supabase
      .from('listings')
      .select('id,hunt_id,status,visit_confirmed')
      .is('deleted_at', null)
    if (error) throw error
    return data || []
  }
  return readLS(LS_LISTINGS)
    .filter((l) => !l.deleted_at)
    .map((l) => ({
      id: l.id,
      hunt_id: l.hunt_id,
      status: l.status,
      visit_confirmed: l.visit_confirmed,
    }))
}
