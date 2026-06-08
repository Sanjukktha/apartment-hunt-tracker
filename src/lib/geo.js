// Small geo helpers for the schedule generator.

function toRad(deg) {
  return (deg * Math.PI) / 180
}

// Great-circle distance in kilometers between two { lat, lng } points.
export function haversineKm(a, b) {
  const R = 6371
  const dLat = toRad(b.lat - a.lat)
  const dLng = toRad(b.lng - a.lng)
  const lat1 = toRad(a.lat)
  const lat2 = toRad(b.lat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function kmToMiles(km) {
  return km * 0.621371
}

// Streets are not straight, so real walking distance is longer than the
// straight-line (haversine) distance. We scale by this factor everywhere we
// turn a haversine gap into a walking estimate so the numbers stay consistent.
export const STREET_FACTOR = 1.3

// Rough walking time at 5 km/h.
export function walkMinutes(km) {
  return Math.round((km / 5) * 60)
}

// Inverse of walkMinutes, for grouping by a maximum walk time. Returns the
// straight-line (haversine) distance whose street-adjusted walk takes `min`
// minutes, so it can be compared against raw haversine gaps in clustering.
export function walkKmForMinutes(min) {
  const walkKm = (min / 60) * 5 // distance actually walked
  return walkKm / STREET_FACTOR // straight-line equivalent
}
