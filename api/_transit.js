// Finds the public transit stop nearest to a point, used to anchor each visit
// group to a real PATH / subway / train station (or a bus stop as a fallback)
// instead of dropping you in the middle of a block.
//
// Primary source is the Google Places API (New), which is fast, accurate, and
// has excellent NYC / NJ coverage. It needs GOOGLE_MAPS_API_KEY. When that key
// is absent (e.g. local dev) we fall back to the free OpenStreetMap Overpass
// API, which works but can be slow or throttled under load.
//
// Files prefixed with _ are not treated as endpoints by Vercel; this is shared
// by api/transit.js (production) and the Vite dev middleware.

function fail(status, message) {
  const err = new Error(message)
  err.status = status
  return err
}

function toRad(deg) {
  return (deg * Math.PI) / 180
}

// Straight-line distance in meters; small inline copy so this stays self-contained.
function distanceM(aLat, aLng, bLat, bLng) {
  const R = 6371000
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

function kindLabel(kind) {
  return kind === 'rail' ? 'Train / subway station' : 'Bus stop'
}

async function fetchWithTimeout(url, opts, timeoutMs = 12000) {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)
  try {
    return await fetch(url, { ...opts, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}

// ---- Google Places API (New): primary source ----

const GOOGLE_PLACES_URL = 'https://places.googleapis.com/v1/places:searchNearby'
const RAIL_TYPES = ['subway_station', 'train_station', 'light_rail_station', 'transit_station']
const BUS_TYPES = ['bus_station', 'bus_stop']

// Nearest place of the given Google types to a point, ranked by distance.
async function googleNearest(lat, lng, types, radiusM, key, kind) {
  const res = await fetchWithTimeout(GOOGLE_PLACES_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Goog-Api-Key': key,
      'X-Goog-FieldMask': 'places.displayName,places.location',
    },
    body: JSON.stringify({
      includedTypes: types,
      maxResultCount: 1,
      rankPreference: 'DISTANCE',
      locationRestriction: { circle: { center: { latitude: lat, longitude: lng }, radius: radiusM } },
    }),
  })
  if (!res.ok) throw fail(502, `Places lookup failed (${res.status})`)
  const data = await res.json()
  const place = data.places && data.places[0]
  if (!place || !place.location) return null
  const pLat = place.location.latitude
  const pLng = place.location.longitude
  return {
    name: (place.displayName && place.displayName.text) || (kind === 'rail' ? 'Transit station' : 'Bus stop'),
    kind,
    kindLabel: kindLabel(kind),
    lat: pLat,
    lng: pLng,
    distance_m: Math.round(distanceM(lat, lng, pLat, pLng)),
  }
}

// Prefer rail within radiusM; fall back to a nearby bus stop (shorter radius,
// since you would not walk far to a bus).
async function googleNearestTransit(lat, lng, radiusM, key) {
  const rail = await googleNearest(lat, lng, RAIL_TYPES, radiusM, key, 'rail')
  if (rail) return rail
  const busRadius = Math.min(radiusM, 800)
  return googleNearest(lat, lng, BUS_TYPES, busRadius, key, 'bus')
}

// ---- OpenStreetMap Overpass: fallback when no Google key ----

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

function classifyOsm(tags) {
  if (
    tags.railway === 'station' ||
    tags.railway === 'halt' ||
    tags.station === 'subway' ||
    tags.station === 'light_rail' ||
    tags.public_transport === 'station'
  ) {
    return 'rail'
  }
  if (tags.highway === 'bus_stop' || tags.amenity === 'bus_station') return 'bus'
  return null
}

async function queryOverpass(query, timeoutMs = 15000) {
  let lastErr = null
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetchWithTimeout(
        endpoint,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            // Overpass rejects requests without a meaningful User-Agent (406/429).
            'User-Agent': 'ApartmentHuntTracker/1.0 (visit schedule transit anchor)',
            Accept: 'application/json',
          },
          body: 'data=' + encodeURIComponent(query),
        },
        timeoutMs,
      )
      if (!res.ok) {
        lastErr = fail(502, `Transit lookup failed (${res.status})`)
        continue
      }
      return await res.json()
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr || fail(502, 'Transit lookup failed')
}

// Overpass fallback for a single point. Rail-first (sparse, cheap); bus stops
// are queried separately at a short radius because they are dense enough to time
// the server out over a wide area.
async function overpassNearestTransit(lat, lng, radiusM) {
  const railQuery = `[out:json][timeout:25];(node[railway=station](around:${radiusM},${lat},${lng});node[railway=halt](around:${radiusM},${lat},${lng});node[station=subway](around:${radiusM},${lat},${lng});node[station=light_rail](around:${radiusM},${lat},${lng});node[public_transport=station](around:${radiusM},${lat},${lng}););out body;`
  let best = pickNearestOsm(lat, lng, (await queryOverpass(railQuery)).elements || [])
  if (best) return best
  const busRadius = Math.min(radiusM, 600)
  const busQuery = `[out:json][timeout:25];(node[highway=bus_stop](around:${busRadius},${lat},${lng});node[amenity=bus_station](around:${busRadius},${lat},${lng}););out body;`
  return pickNearestOsm(lat, lng, (await queryOverpass(busQuery)).elements || [])
}

function pickNearestOsm(lat, lng, elements) {
  let best = null
  let bestD = Infinity
  for (const el of elements) {
    if (typeof el.lat !== 'number' || typeof el.lon !== 'number') continue
    const kind = classifyOsm(el.tags || {})
    if (!kind) continue
    const d = distanceM(lat, lng, el.lat, el.lon)
    if (d < bestD) {
      bestD = d
      best = {
        name: (el.tags && el.tags.name) || (kind === 'rail' ? 'Transit station' : 'Bus stop'),
        kind,
        kindLabel: kindLabel(kind),
        lat: el.lat,
        lng: el.lon,
        distance_m: Math.round(d),
      }
    }
  }
  return best
}

// ---- Public API ----

// Batch lookup. Returns an array aligned to `points`, each entry the nearest
// transit stop ({ name, kind, kindLabel, lat, lng, distance_m }) or null. Google
// is queried per point in parallel (fast, generous limits); the Overpass
// fallback is sequential to stay friendly with the public servers.
export async function findNearestTransitMany(points, radiusM = 1500, key = process.env.GOOGLE_MAPS_API_KEY) {
  const list = Array.isArray(points) ? points : []
  const valid = list.map((p) => {
    const lat = Number(p && p.lat)
    const lng = Number(p && p.lng)
    return !isNaN(lat) && !isNaN(lng) ? { lat, lng } : null
  })

  if (key) {
    return Promise.all(
      valid.map(async (p) => {
        if (!p) return null
        try {
          return await googleNearestTransit(p.lat, p.lng, radiusM, key)
        } catch {
          return null
        }
      }),
    )
  }

  // No key: best-effort Overpass, one point at a time.
  const out = []
  for (const p of valid) {
    if (!p) {
      out.push(null)
      continue
    }
    try {
      out.push(await overpassNearestTransit(p.lat, p.lng, radiusM))
    } catch {
      out.push(null)
    }
  }
  return out
}

// Single-point convenience wrapper around the batch lookup.
export async function findNearestTransit(lat, lng, radiusM = 1500, key = process.env.GOOGLE_MAPS_API_KEY) {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    throw fail(400, 'lat and lng are required')
  }
  const [station] = await findNearestTransitMany([{ lat, lng }], radiusM, key)
  return station || null
}
