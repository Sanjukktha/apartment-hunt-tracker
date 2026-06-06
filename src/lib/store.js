import { supabase, cloudConfigured } from './supabase.js'

// Data layer abstraction. Same three methods (all / upsert / remove) regardless
// of where the data lives. Local mode uses the browser's localStorage so the app
// works with zero setup. Remote mode uses Supabase so a shared link shows the
// same data to everyone.

const LS_LISTINGS = 'apt_listings_v1'
const LS_MODE = 'apt_mode_v1'
const TABLE = 'listings'

function readLocal() {
  try {
    return JSON.parse(localStorage.getItem(LS_LISTINGS) || '[]')
  } catch {
    return []
  }
}

function writeLocal(rows) {
  localStorage.setItem(LS_LISTINGS, JSON.stringify(rows))
}

// Whether the build has Supabase configured at all.
export function cloudAvailable() {
  return cloudConfigured
}

// A shared link carries ?cloud=1 so family who open it boot straight into the
// cloud view without flipping anything.
function urlForcesCloud() {
  try {
    return new URLSearchParams(window.location.search).get('cloud') === '1'
  } catch {
    return false
  }
}

// 'remote' only when the cloud is configured AND either the URL forces it or the
// user flipped the toggle on this device. Otherwise 'local'.
export function getMode() {
  if (!cloudConfigured) return 'local'
  if (urlForcesCloud()) return 'remote'
  return localStorage.getItem(LS_MODE) === 'remote' ? 'remote' : 'local'
}

export function setMode(mode) {
  localStorage.setItem(LS_MODE, mode === 'remote' ? 'remote' : 'local')
}

export function isRemote() {
  return getMode() === 'remote'
}

export function newId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return 'id-' + Date.now() + '-' + Math.random().toString(16).slice(2)
}

function nowIso() {
  return new Date().toISOString()
}

export async function all() {
  if (isRemote()) {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  }
  return readLocal().sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))
}

export async function upsert(record) {
  const row = { ...record }
  if (!row.id) row.id = newId()
  if (!row.created_at) row.created_at = nowIso()

  if (isRemote()) {
    const { data, error } = await supabase.from(TABLE).upsert(row).select().single()
    if (error) throw error
    return data
  }

  const rows = readLocal()
  const i = rows.findIndex((r) => r.id === row.id)
  if (i > -1) rows[i] = row
  else rows.unshift(row)
  writeLocal(rows)
  return row
}

export async function remove(id) {
  if (isRemote()) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) throw error
    return
  }
  writeLocal(readLocal().filter((r) => r.id !== id))
}

// When flipping the cloud on, copy whatever is already saved locally up to
// Supabase so nothing entered during the trip is lost. Caller passes the current
// user attribution so the rows satisfy the write policies.
export async function pushLocalToCloud(attribution = {}) {
  const rows = readLocal().map((r) => ({ ...r, ...attribution }))
  if (!rows.length) return 0
  const { error } = await supabase.from(TABLE).upsert(rows)
  if (error) throw error
  return rows.length
}
