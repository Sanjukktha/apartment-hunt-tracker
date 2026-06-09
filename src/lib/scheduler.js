import { haversineKm, kmToMiles, walkMinutes, walkKmForMinutes, STREET_FACTOR } from './geo.js'

// Turns a confirmed listing's timing fields into a normalized shape.
//  fixed  -> a specific moment
//  window -> a flexible bracket [start, end]
//  open   -> confirmed but no time set yet
export function normalizeTiming(l) {
  if (l.visit_timing_type === 'fixed' && l.visit) {
    const d = new Date(l.visit)
    if (!isNaN(d)) return { type: 'fixed', start: d, end: d }
  }
  if (l.visit_timing_type === 'flexible' && (l.visit_window_start || l.visit_window_end)) {
    const s = l.visit_window_start ? new Date(l.visit_window_start) : null
    const e = l.visit_window_end ? new Date(l.visit_window_end) : null
    return {
      type: 'window',
      start: s && !isNaN(s) ? s : null,
      end: e && !isNaN(e) ? e : null,
    }
  }
  return { type: 'open', start: null, end: null }
}

function timeKey(timing) {
  return timing.start ? timing.start.getTime() : Infinity
}

// Complete-linkage clustering: two clusters merge only if EVERY pair of stops
// across them is within thresholdKm. This avoids the chaining problem (a string
// of overlapping neighborhoods all collapsing into one giant group), so you get
// tight groups where everything really is close to everything else.
function clusterByRadius(stops, thresholdKm) {
  const clusters = stops.map((s) => [s])
  let merged = true
  while (merged) {
    merged = false
    for (let i = 0; i < clusters.length && !merged; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        let maxPair = 0
        for (const a of clusters[i]) {
          for (const b of clusters[j]) {
            const d = haversineKm(a, b)
            if (d > maxPair) maxPair = d
          }
        }
        if (maxPair <= thresholdKm) {
          clusters[i] = clusters[i].concat(clusters[j])
          clusters.splice(j, 1)
          merged = true
          break
        }
      }
    }
  }
  return clusters
}

// K-means into a fixed number of groups, with deterministic farthest-first
// seeding (no randomness) so the same input always produces the same groups.
function clusterByCount(stops, k) {
  k = Math.max(1, Math.min(k, stops.length))
  if (k === 1) return [stops]

  const seedIdx = [0]
  while (seedIdx.length < k) {
    let best = -1
    let bestDist = -1
    stops.forEach((s, i) => {
      if (seedIdx.includes(i)) return
      const nearest = Math.min(...seedIdx.map((si) => haversineKm(stops[si], s)))
      if (nearest > bestDist) {
        bestDist = nearest
        best = i
      }
    })
    seedIdx.push(best)
  }

  let centroids = seedIdx.map((i) => ({ lat: stops[i].lat, lng: stops[i].lng }))
  const assign = new Array(stops.length).fill(0)

  for (let iter = 0; iter < 25; iter++) {
    let changed = false
    stops.forEach((s, i) => {
      let bestC = 0
      let bestD = Infinity
      centroids.forEach((c, ci) => {
        const d = haversineKm(c, s)
        if (d < bestD) {
          bestD = d
          bestC = ci
        }
      })
      if (assign[i] !== bestC) {
        assign[i] = bestC
        changed = true
      }
    })
    centroids = centroids.map((c, ci) => {
      const members = stops.filter((_, i) => assign[i] === ci)
      if (!members.length) return c
      return {
        lat: members.reduce((sum, m) => sum + m.lat, 0) / members.length,
        lng: members.reduce((sum, m) => sum + m.lng, 0) / members.length,
      }
    })
    if (!changed) break
  }

  const groups = Array.from({ length: k }, () => [])
  stops.forEach((s, i) => groups[assign[i]].push(s))
  return groups.filter((g) => g.length)
}

// Order within a group: timed stops first in chronological order, then any
// open stops chained by nearest neighbor. Travel inside a tight group is small,
// so respecting the clock matters more than micro-optimizing the walk.
function orderStops(stops) {
  const timed = stops
    .filter((s) => s.timing.start)
    .sort((a, b) => timeKey(a.timing) - timeKey(b.timing))
  const open = stops.filter((s) => !s.timing.start)

  const ordered = [...timed]
  let cursor = timed.length ? timed[timed.length - 1] : open.shift()
  if (!timed.length && cursor) ordered.push(cursor)
  while (open.length) {
    open.sort((a, b) => haversineKm(cursor, a) - haversineKm(cursor, b))
    const next = open.shift()
    ordered.push(next)
    cursor = next
  }
  return ordered
}

function mostCommon(values) {
  const counts = {}
  let best = null
  let bestN = 0
  for (const v of values) {
    if (!v) continue
    counts[v] = (counts[v] || 0) + 1
    if (counts[v] > bestN) {
      bestN = counts[v]
      best = v
    }
  }
  return best
}

// One Google Maps token per stop: a transit anchor uses its coordinates (more
// reliable than a station name), a listing uses its street address.
function stopToken(s) {
  if (s.transit) return `${s.lat},${s.lng}`
  return s.listing?.address || ''
}

// A clickable Google Maps walking route through the group's ordered stops,
// including the transit anchor as the origin when one is present.
function groupMapsUrl(orderedStops) {
  const tokens = orderedStops.map(stopToken).filter(Boolean)
  if (tokens.length === 0) return ''
  if (tokens.length === 1) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(tokens[0])
  }
  const origin = encodeURIComponent(tokens[0])
  const destination = encodeURIComponent(tokens[tokens.length - 1])
  const waypoints = tokens.slice(1, -1).map(encodeURIComponent).join('%7C') // %7C is the pipe
  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=walking`
  if (waypoints) url += `&waypoints=${waypoints}`
  return url
}

function fmtDate(d) {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

// A walking leg between two { lat, lng } points, with the street factor applied.
function walkLeg(from, to) {
  const km = haversineKm(from, to) * STREET_FACTOR
  return {
    km: Math.round(km * 10) / 10,
    miles: Math.round(kmToMiles(km) * 10) / 10,
    min: walkMinutes(km),
  }
}

// items: confirmed listings already geocoded as { ...listing, lat, lng }.
// When options.transitAnchor is set, options.findTransitMany(points) is awaited
// once to prepend the nearest station as the first stop of each group.
export async function generateSchedule(items, options = {}) {
  let mode = 'radius'
  if (options.mode === 'count') mode = 'count'
  else if (options.mode === 'walk') mode = 'walk'

  const groupCount = options.groupCount || 3
  const walkMin = options.walkMin || 20
  // Walk mode is radius clustering with the radius derived from a max walk time.
  const thresholdKm =
    mode === 'walk' ? walkKmForMinutes(walkMin) : options.thresholdKm || 2.4

  const stops = items.map((l) => ({
    listing: l,
    address: l.address,
    location: l.location,
    lat: l.lat,
    lng: l.lng,
    timing: normalizeTiming(l),
  }))

  const rawGroups =
    mode === 'count' ? clusterByCount(stops, groupCount) : clusterByRadius(stops, thresholdKm)

  const groups = rawGroups.map((groupStops, gi) => {
    const ordered = orderStops(groupStops)

    // Travel legs between consecutive stops.
    const stopOut = ordered.map((s, i) => {
      const travelFromPrev = i > 0 ? walkLeg(ordered[i - 1], s) : null
      return { ...s, travelFromPrev }
    })

    // Warnings: consecutive fixed times too tight for the walk between them.
    const warnings = []
    for (let i = 1; i < stopOut.length; i++) {
      const prev = stopOut[i - 1]
      const cur = stopOut[i]
      if (prev.timing.type === 'fixed' && cur.timing.type === 'fixed') {
        const gapMin = (cur.timing.start - prev.timing.start) / 60000
        const need = (cur.travelFromPrev?.min || 0) + 15 // 15 min buffer to view
        if (gapMin < need) {
          warnings.push(
            `Tight: ${Math.round(gapMin)} min between "${prev.listing.address || 'a stop'}" and "${cur.listing.address || 'the next'}", but travel plus a look needs about ${Math.round(need)} min.`,
          )
        }
      }
    }

    const dates = Array.from(
      new Set(ordered.filter((s) => s.timing.start).map((s) => fmtDate(s.timing.start))),
    )

    const area = mostCommon(ordered.map((s) => s.location))
    const earliest = Math.min(...ordered.map((s) => timeKey(s.timing)))

    return {
      id: 'group-' + gi,
      label: area ? `Around ${area}` : `Group ${gi + 1}`,
      area,
      dates,
      earliest,
      mapsUrl: groupMapsUrl(stopOut),
      stops: stopOut,
      warnings,
    }
  })

  // Optionally anchor each group to public transit: arrive at the station
  // nearest the first apartment, then walk the rest. One batched lookup covers
  // every group, which stays well under the public Overpass rate limits.
  if (options.transitAnchor && typeof options.findTransitMany === 'function') {
    const anchorPoints = groups.map((g) => {
      const first = g.stops[0]
      return first ? { lat: first.lat, lng: first.lng } : null
    })
    let stations = []
    try {
      stations = await options.findTransitMany(anchorPoints.map((p) => p || { lat: 0, lng: 0 }))
    } catch {
      stations = []
    }
    groups.forEach((g, gi) => {
      const first = g.stops[0]
      const station = anchorPoints[gi] ? stations[gi] : null
      if (!first) return
      if (!station) {
        g.transitNote = 'No nearby transit stop found; starting from the first apartment.'
        return
      }
      const transitStop = {
        transit: true,
        name: station.name,
        kind: station.kind,
        kindLabel: station.kindLabel,
        lat: station.lat,
        lng: station.lng,
        travelFromPrev: null,
      }
      // The first apartment is now reached on foot from the station.
      first.travelFromPrev = walkLeg(transitStop, first)
      g.stops = [transitStop, ...g.stops]
      g.mapsUrl = groupMapsUrl(g.stops)
    })
  }

  // Groups with the earliest commitments first; open-only groups last.
  groups.sort((a, b) => a.earliest - b.earliest)

  return { mode, thresholdKm, groupCount, walkMin, transitAnchored: !!options.transitAnchor, groups }
}
