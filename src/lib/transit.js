// Client helpers that call our /api/transit proxy to find the nearest public
// transit stop to a coordinate. A missing stop is not an error: the group just
// keeps its first apartment as the start.

// Batch: one request for many points, returns an array aligned to `points`
// (each entry a station object or null). Used when anchoring a whole schedule.
export async function findTransitMany(points) {
  try {
    const res = await fetch('/api/transit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ points }),
    })
    if (!res.ok) return points.map(() => null)
    const data = await res.json()
    return Array.isArray(data.stations) ? data.stations : points.map(() => null)
  } catch {
    return points.map(() => null)
  }
}

// Single point convenience wrapper.
export async function findTransit(lat, lng) {
  const [station] = await findTransitMany([{ lat, lng }])
  return station || null
}
