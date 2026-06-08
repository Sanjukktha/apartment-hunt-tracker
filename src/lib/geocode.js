// Client helper that calls our /api/geocode proxy. Returns one result per input
// address: { address, lat, lng, label } or { address, error }.
export async function geocodeMany(addresses) {
  const res = await fetch('/api/geocode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ addresses }),
  })
  if (!res.ok) {
    let msg = 'Geocoding failed'
    try {
      const body = await res.json()
      if (body && body.error) msg = body.error
    } catch {
      // ignore
    }
    throw new Error(msg)
  }
  const data = await res.json()
  return data.results || []
}
