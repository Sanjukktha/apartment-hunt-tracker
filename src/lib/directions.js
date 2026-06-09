// Client helper for inline transit directions. Calls /api/directions to get a
// transit-route summary from the base address to each point (a subsection's
// start station). Returns an array aligned to `points`, each a summary or null
// (null just means the UI shows the Maps link instead).
export async function transitDirectionsMany(origin, points) {
  try {
    const res = await fetch('/api/directions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ origin, points }),
    })
    if (!res.ok) return points.map(() => null)
    const data = await res.json()
    return Array.isArray(data.routes) ? data.routes : points.map(() => null)
  } catch {
    return points.map(() => null)
  }
}
