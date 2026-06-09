// Inline public-transit directions from the user's base address to each visit
// subsection's start station: which lines to take, how many transfers, and the
// total time. Uses the Google Routes API (computeRoutes, TRANSIT mode), which is
// separate from Places and must be enabled on the key. Failures degrade
// gracefully to null so the UI just falls back to the "open in Maps" link.
//
// Files prefixed with _ are not treated as endpoints by Vercel.

const ROUTES_URL = 'https://routes.googleapis.com/directions/v2:computeRoutes'

async function fetchWithTimeout(url, opts, timeoutMs = 15000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...opts, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

function vehicleIcon(type) {
  const t = (type || '').toUpperCase()
  if (t.includes('SUBWAY') || t.includes('METRO')) return '🚇'
  if (t.includes('BUS') || t.includes('TROLLEY')) return '🚌'
  if (t.includes('TRAM') || t.includes('LIGHT_RAIL') || t.includes('CABLE')) return '🚊'
  if (t.includes('FERRY')) return '⛴️'
  if (t.includes('RAIL') || t.includes('TRAIN')) return '🚆'
  return '🚉'
}

// Routes API durations look like "1980s".
function parseDurationMin(d) {
  const m = String(d || '').match(/(\d+)s/)
  return m ? Math.round(Number(m[1]) / 60) : null
}

// Reduce a computed route to the transit legs that matter for a quick read.
function summarize(route) {
  if (!route) return null
  const transitLegs = []
  for (const leg of route.legs || []) {
    for (const step of leg.steps || []) {
      if (step.travelMode === 'TRANSIT' && step.transitDetails) {
        const line = step.transitDetails.transitLine || {}
        transitLegs.push({
          icon: vehicleIcon((line.vehicle || {}).type),
          label: line.nameShort || line.name || 'Transit',
          to: step.transitDetails.stopDetails?.arrivalStop?.name || '',
        })
      }
    }
  }
  return {
    durationMin: parseDurationMin(route.duration),
    transfers: Math.max(0, transitLegs.length - 1),
    legs: transitLegs,
  }
}

async function oneRoute(originAddr, point, key) {
  const res = await fetchWithTimeout(ROUTES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'routes.duration,routes.legs.steps.travelMode,routes.legs.steps.transitDetails',
    },
    body: JSON.stringify({
      origin: { address: originAddr },
      destination: { location: { latLng: { latitude: point.lat, longitude: point.lng } } },
      travelMode: 'TRANSIT',
      computeAlternativeRoutes: false,
    }),
  })
  if (!res.ok) return null // API not enabled, no route, etc. — fall back to the link.
  const data = await res.json()
  return summarize(data.routes && data.routes[0])
}

// One transit route per point (from the same origin), returned aligned to
// `points`. Each entry is a summary { durationMin, transfers, legs } or null.
export async function transitRoutesMany(originAddr, points, key = process.env.GOOGLE_MAPS_API_KEY) {
  const list = Array.isArray(points) ? points : []
  if (!key || !originAddr) return list.map(() => null)
  return Promise.all(
    list.map((p) =>
      p && p.lat != null && p.lng != null
        ? oneRoute(originAddr, { lat: Number(p.lat), lng: Number(p.lng) }, key).catch(() => null)
        : Promise.resolve(null),
    ),
  )
}
