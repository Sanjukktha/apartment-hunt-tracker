import { newId } from './store.js'

// Per-hunt preferences: where the user is searching and the up-to-3 places they
// want to be close to. These live on the hunt record (hunt.prefs) and drive the
// commute links on every listing in that hunt.

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
    searchAreas: [],
    closeTo: [],
    defaultMode: 'transit',
    setupComplete: false,
  }
}

export function newCloseTo(label = '', address = '') {
  return { id: newId(), label, address }
}

// A hunt is ready to use once it has at least one search area and one place to be
// close to.
export function isPrefsComplete(prefs) {
  if (!prefs) return false
  return (prefs.searchAreas?.length || 0) > 0 && (prefs.closeTo?.length || 0) > 0
}
