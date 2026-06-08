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

// Rough walking time at 5 km/h.
export function walkMinutes(km) {
  return Math.round((km / 5) * 60)
}
