// Vercel serverless function: turns addresses into coordinates for the schedule
// generator. The routing key stays server-side. Accepts { addresses: [...] } and
// returns { results: [{ address, lat, lng, label } | { address, error }] }.
import { geocodeMany } from './_ors.js'

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
  const addresses = (body && body.addresses) || []

  try {
    const results = await geocodeMany(addresses, process.env.ORS_API_KEY)
    res.status(200).json({ results })
  } catch (err) {
    res.status(err.status || 502).json({ error: err.message || 'Geocoding failed' })
  }
}
