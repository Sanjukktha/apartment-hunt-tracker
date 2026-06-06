// Vercel serverless function: the backend proxy for OpenRouteService.
// The browser never sees the routing key. It posts an apartment address, a target
// address, and a travel profile; we geocode both, ask OpenRouteService for the
// route, and return distance + duration. Transit is never sent here (the client
// does not call this for transit, since OpenRouteService has no transit engine).
import { computeRoute } from './_ors.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Use POST' })
    return
  }

  let body = req.body
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body)
    } catch {
      body = {}
    }
  }
  const { origin, destination, profile } = body || {}

  try {
    const data = await computeRoute({ origin, destination, profile, key: process.env.ORS_API_KEY })
    res.status(200).json(data)
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || 'Route lookup failed' })
  }
}
