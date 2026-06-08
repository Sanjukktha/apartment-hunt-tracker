// Finds the public transit stop nearest to a point, used to anchor each visit
// group to a real PATH / subway / train station (or a bus stop as a fallback)
// instead of dropping you in the middle of a block. Data comes from the
// OpenStreetMap Overpass API, which is free and needs no key, and has strong
// coverage for the NYC / NJ area this is built for.
//
// Files prefixed with _ are not treated as endpoints by Vercel; this is shared
// by api/transit.js (production) and the Vite dev middleware.

const OVERPASS_ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

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

// Rail-type stops (PATH, subway, light rail, commuter rail) are the backbone of
// a transit trip, so we prefer them. Bus stops are the fallback.
function classify(tags) {
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

function kindLabel(kind) {
  return kind === 'rail' ? 'Train / subway station' : 'Bus stop'
}

async function queryOverpass(query) {
  let lastErr = null
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'data=' + encodeURIComponent(query),
      })
      if (!res.ok) {
        lastErr = fail(502, 'Transit lookup failed')
        continue
      }
      return await res.json()
    } catch (e) {
      lastErr = e
    }
  }
  throw lastErr || fail(502, 'Transit lookup failed')
}

// Returns the nearest transit stop to { lat, lng } as
// { name, kind, kindLabel, lat, lng, distance_m }, preferring rail within the
// search radius and falling back to the nearest bus stop. Returns null if there
// is nothing within radiusM meters.
export async function findNearestTransit(lat, lng, radiusM = 1500) {
  if (typeof lat !== 'number' || typeof lng !== 'number' || isNaN(lat) || isNaN(lng)) {
    throw fail(400, 'lat and lng are required')
  }

  const around = `${radiusM},${lat},${lng}`
  const query = `[out:json][timeout:25];
(
  node[railway=station](around:${around});
  node[railway=halt](around:${around});
  node[station=subway](around:${around});
  node[station=light_rail](around:${around});
  node[public_transport=station](around:${around});
  node[highway=bus_stop](around:${around});
  node[amenity=bus_station](around:${around});
);
out body;`

  const data = await queryOverpass(query)
  const elements = (data && data.elements) || []

  let bestRail = null
  let bestBus = null
  for (const el of elements) {
    if (typeof el.lat !== 'number' || typeof el.lon !== 'number') continue
    const kind = classify(el.tags || {})
    if (!kind) continue
    const d = distanceM(lat, lng, el.lat, el.lon)
    const candidate = {
      name: (el.tags && el.tags.name) || (kind === 'rail' ? 'Transit station' : 'Bus stop'),
      kind,
      kindLabel: kindLabel(kind),
      lat: el.lat,
      lng: el.lon,
      distance_m: Math.round(d),
    }
    if (kind === 'rail') {
      if (!bestRail || d < bestRail.distance_m) bestRail = candidate
    } else if (!bestBus || d < bestBus.distance_m) {
      bestBus = candidate
    }
  }

  return bestRail || bestBus || null
}
