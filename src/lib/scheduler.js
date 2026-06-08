import { haversineKm, kmToMiles, walkMinutes } from './geo.js'

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

// Single-linkage clustering: any two stops within thresholdKm are connected, and
// connected components become groups. This groups by real distance, not by the
// area name the user typed.
function clusterByDistance(stops, thresholdKm) {
  const parent = stops.map((_, i) => i)
  const find = (x) => {
    while (parent[x] !== x) {
      parent[x] = parent[parent[x]]
      x = parent[x]
    }
    return x
  }
  const union = (a, b) => {
    parent[find(a)] = find(b)
  }
  for (let i = 0; i < stops.length; i++) {
    for (let j = i + 1; j < stops.length; j++) {
      if (haversineKm(stops[i], stops[j]) <= thresholdKm) union(i, j)
    }
  }
  const groups = new Map()
  stops.forEach((s, i) => {
    const root = find(i)
    if (!groups.has(root)) groups.set(root, [])
    groups.get(root).push(s)
  })
  return Array.from(groups.values())
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

// A clickable Google Maps walking route through the group's ordered stops.
function groupMapsUrl(orderedListings) {
  const addrs = orderedListings.map((l) => l.address).filter(Boolean)
  if (addrs.length === 0) return ''
  if (addrs.length === 1) {
    return 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(addrs[0])
  }
  const origin = encodeURIComponent(addrs[0])
  const destination = encodeURIComponent(addrs[addrs.length - 1])
  const waypoints = addrs.slice(1, -1).map(encodeURIComponent).join('%7C') // %7C is the pipe
  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}&travelmode=walking`
  if (waypoints) url += `&waypoints=${waypoints}`
  return url
}

function fmtDate(d) {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

// items: confirmed listings already geocoded as { ...listing, lat, lng }.
export function generateSchedule(items, options = {}) {
  const thresholdKm = options.thresholdKm || 2

  const stops = items.map((l) => ({
    listing: l,
    address: l.address,
    location: l.location,
    lat: l.lat,
    lng: l.lng,
    timing: normalizeTiming(l),
  }))

  const rawGroups = clusterByDistance(stops, thresholdKm)

  const groups = rawGroups.map((groupStops, gi) => {
    const ordered = orderStops(groupStops)

    // Travel legs between consecutive stops.
    const stopOut = ordered.map((s, i) => {
      let travelFromPrev = null
      if (i > 0) {
        const km = haversineKm(ordered[i - 1], s) * 1.3 // rough street factor
        travelFromPrev = {
          km: Math.round(km * 10) / 10,
          miles: Math.round(kmToMiles(km) * 10) / 10,
          min: walkMinutes(km),
        }
      }
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
      mapsUrl: groupMapsUrl(ordered.map((s) => s.listing)),
      stops: stopOut,
      warnings,
    }
  })

  // Groups with the earliest commitments first; open-only groups last.
  groups.sort((a, b) => a.earliest - b.earliest)

  return { thresholdKm, groups }
}
