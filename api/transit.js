// Vercel serverless function: finds the nearest public transit stop to a point
// so the schedule generator can start each group from a station instead of a
// random doorstep. Accepts { lat, lng, radiusM? } and returns { station } where
// station is null when nothing is nearby.
import { findNearestTransit } from './_transit.js'

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
  const lat = Number(body && body.lat)
  const lng = Number(body && body.lng)
  const radiusM = body && body.radiusM ? Number(body.radiusM) : undefined

  try {
    const station = await findNearestTransit(lat, lng, radiusM)
    res.status(200).json({ station })
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || 'Transit lookup failed' })
  }
}
