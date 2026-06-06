import { supabase } from './supabase.js'
import { isRemote, newId } from './store.js'

// User preferences captured during onboarding: where they are searching and the
// up-to-3 places they want to be close to. These drive the commute links on
// every listing. Stored locally; in cloud mode a shared copy lives in Supabase
// so everyone on the shared link generates commutes against the same areas.

const LS_PREFS = 'apt_prefs_v1'
const SETTINGS_ID = 'shared'
export const MAX_CLOSE_TO = 3

// OpenRouteService has no transit engine, so transit has ors: null and only gets
// a clickable Google Maps link (the user reads the time off Maps).
export const TRAVEL_MODES = [
  { value: 'transit', label: 'Public transit', ors: null, gmaps: 'transit' },
  { value: 'driving-car', label: 'Drive', ors: 'driving-car', gmaps: 'driving' },
  { value: 'foot-walking', label: 'Walk', ors: 'foot-walking', gmaps: 'walking' },
  { value: 'cycling-regular', label: 'Cycle', ors: 'cycling-regular', gmaps: 'bicycling' },
]

export function emptyPrefs() {
  return {
    searchAreas: [], // free-text cities / neighborhoods they care about
    closeTo: [], // [{ id, label, address }] up to MAX_CLOSE_TO
    defaultMode: 'transit',
    ownerName: '',
    setupComplete: false,
  }
}

export function newCloseTo(label = '', address = '') {
  return { id: newId(), label, address }
}

function readLocalPrefs() {
  try {
    return { ...emptyPrefs(), ...JSON.parse(localStorage.getItem(LS_PREFS) || '{}') }
  } catch {
    return emptyPrefs()
  }
}

function writeLocalPrefs(p) {
  localStorage.setItem(LS_PREFS, JSON.stringify(p))
}

export async function loadPrefs() {
  const local = readLocalPrefs()
  // A visitor opening a shared cloud link has no local prefs yet: pull the
  // shared settings so commute links resolve to the owner's chosen areas.
  if (isRemote() && !local.setupComplete) {
    try {
      const { data } = await supabase
        .from('settings')
        .select('data')
        .eq('id', SETTINGS_ID)
        .maybeSingle()
      if (data && data.data) {
        const merged = { ...emptyPrefs(), ...data.data }
        writeLocalPrefs(merged)
        return merged
      }
    } catch {
      // settings table may not exist yet; fall back to local
    }
  }
  return local
}

export async function savePrefs(p) {
  const merged = { ...emptyPrefs(), ...p }
  writeLocalPrefs(merged)
  if (isRemote()) {
    try {
      await supabase
        .from('settings')
        .upsert({ id: SETTINGS_ID, data: merged, updated_at: new Date().toISOString() })
    } catch {
      // non-fatal: local prefs still saved
    }
  }
  return merged
}
