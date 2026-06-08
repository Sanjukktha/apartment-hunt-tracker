// Client helper that calls our /api/transit proxy to find the nearest public
// transit stop to a coordinate. Returns the station object or null (a missing
// stop is not an error: the group just keeps its first apartment as the start).
export async function findTransit(lat, lng) {
  try {
    const res = await fetch('/api/transit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data.station || null
  } catch {
    return null
  }
}
