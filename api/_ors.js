// Shared OpenRouteService logic, used by both the Vercel serverless function
// (api/route.js) and the Vite dev middleware (vite.config.js) so auto-fill works
// the same way in development and production. Files prefixed with _ are not
// treated as endpoints by Vercel.

const ORS_BASE = 'https://api.openrouteservice.org'
export const VALID_PROFILES = new Set(['driving-car', 'foot-walking', 'cycling-regular'])

function fail(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}

async function geocode(text, key) {
  const url = `${ORS_BASE}/geocode/search?text=${encodeURIComponent(text)}&size=1`
  const res = await fetch(url, { headers: { Authorization: key } })
  if (!res.ok) throw fail(502, 'Geocoding failed')
  const data = await res.json()
  const feature = data.features && data.features[0]
  if (!feature) throw fail(502, `Could not find a location for "${text}"`)
  return feature.geometry.coordinates // [lon, lat]
}

export async function computeRoute({ origin, destination, profile, key }) {
  if (!key) throw fail(500, 'Routing is not configured (missing ORS_API_KEY)')
  if (!origin || !destination) throw fail(400, 'origin and destination are required')
  if (!VALID_PROFILES.has(profile)) throw fail(400, 'Unsupported travel profile')

  const [from, to] = await Promise.all([geocode(origin, key), geocode(destination, key)])

  const routeRes = await fetch(`${ORS_BASE}/v2/directions/${profile}`, {
    method: 'POST',
    headers: { Authorization: key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ coordinates: [from, to] }),
  })
  if (!routeRes.ok) throw fail(502, 'Routing request failed')
  const route = await routeRes.json()

  const summary = route.routes?.[0]?.summary
  if (!summary) throw fail(502, 'No route found')

  const meters = summary.distance || 0
  const seconds = summary.duration || 0
  return {
    distance_miles: Math.round((meters / 1609.34) * 10) / 10,
    duration_min: Math.round(seconds / 60),
    distance_m: Math.round(meters),
    duration_s: Math.round(seconds),
  }
}
