// Vercel serverless function: inline transit directions from a base address to
// each subsection's start station. Accepts { origin, points: [{lat,lng}, ...] }
// and returns { routes } aligned to points (each a summary or null).
import { transitRoutesMany } from './_directions.js'

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
  const origin = body && body.origin
  const points = (body && body.points) || []

  try {
    const routes = await transitRoutesMany(origin, points)
    res.status(200).json({ routes })
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || 'Directions failed' })
  }
}
