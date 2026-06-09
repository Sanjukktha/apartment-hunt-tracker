// Vercel serverless function: finds the nearest public transit stop so the
// schedule generator can start each group from a station instead of a random
// doorstep. Accepts either { points: [{lat,lng}, ...] } (batch, returns
// { stations: [...] }) or { lat, lng } (single, returns { station }). A null
// entry means nothing transit was within range of that point.
import { findNearestTransit, findNearestTransitMany } from './_transit.js'

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
  const radiusM = body && body.radiusM ? Number(body.radiusM) : undefined

  try {
    if (body && Array.isArray(body.points)) {
      const stations = await findNearestTransitMany(body.points, radiusM)
      res.status(200).json({ stations })
      return
    }
    const station = await findNearestTransit(Number(body && body.lat), Number(body && body.lng), radiusM)
    res.status(200).json({ station })
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || 'Transit lookup failed' })
  }
}
