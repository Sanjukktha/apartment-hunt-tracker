import { TRAVEL_MODES } from './prefs.js'

// Builds a plain Google Maps directions URL. No API, no key, no cost: it just
// opens Maps with the from / to / travel mode pre-filled so the user can read the
// exact route and time themselves.
export function mapsUrl(origin, destination, mode) {
  const gmaps = (TRAVEL_MODES.find((t) => t.value === mode) || {}).gmaps || 'driving'
  const params = new URLSearchParams({
    api: '1',
    origin: origin || '',
    destination: destination || '',
    travelmode: gmaps,
  })
  return 'https://www.google.com/maps/dir/?' + params.toString()
}

function orsProfile(mode) {
  return (TRAVEL_MODES.find((t) => t.value === mode) || {}).ors || null
}

export function supportsAutoDistance(mode) {
  return Boolean(orsProfile(mode))
}

// Calls our serverless proxy, which talks to OpenRouteService with the key kept
// server-side. Returns { distance_miles, duration_min } or null for transit
// (which OpenRouteService cannot route).
export async function fetchDistanceTime(origin, destination, mode) {
  const profile = orsProfile(mode)
  if (!profile) return null
  if (!origin || !destination) return null

  const res = await fetch('/api/route', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ origin, destination, profile }),
  })
  if (!res.ok) {
    let msg = 'Route lookup failed'
    try {
      const body = await res.json()
      if (body && body.error) msg = body.error
    } catch {
      // ignore
    }
    throw new Error(msg)
  }
  return await res.json()
}

// A short human label like "38 min, 4.2 mi" from a commute entry.
export function commuteSummary(c) {
  if (!c) return ''
  const parts = []
  if (c.time) parts.push(c.time)
  if (c.distance) parts.push(c.distance)
  return parts.join(', ')
}
