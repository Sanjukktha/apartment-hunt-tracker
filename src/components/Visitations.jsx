import { useMemo, useState } from 'react'
import { geocodeMany } from '../lib/geocode.js'
import { generateSchedule } from '../lib/scheduler.js'
import { findTransitMany } from '../lib/transit.js'
import ScheduleGroups, { timingLabel } from './ScheduleGroups.jsx'

const GROUP_OPTIONS = [
  { km: 1.6, label: 'Walkable (about 1 mile)' },
  { km: 2.4, label: 'Neighborhood (about 1.5 miles)' },
  { km: 4.0, label: 'Wider area (about 2.5 miles)' },
  { km: 8.0, label: 'Whole side of town (about 5 miles)' },
]

// Max walking time between stops in a group. Anything beyond your pick splits
// into a separate group, so a 30 min cap never asks you to walk 45.
const WALK_OPTIONS = [10, 15, 20, 30, 45]

// Trim a listing down to just what the saved-schedule view needs to display.
// The full apartment detail is still reachable by id, so we do not duplicate it.
function slimListing(l) {
  return {
    id: l.id,
    address: l.address,
    location: l.location,
    type: l.type,
    rent: l.rent,
    visit: l.visit,
    visit_confirmed: l.visit_confirmed,
    visit_timing_type: l.visit_timing_type,
    visit_window_start: l.visit_window_start,
    visit_window_end: l.visit_window_end,
    contact_name: l.contact_name,
    contact_number: l.contact_number,
    notes: l.notes,
  }
}

// The shape we persist for a saved schedule: enough to render the groups and
// link each stop to its apartment, without the live-only geocoding leftovers.
function serializeSchedule(result) {
  return {
    mode: result.mode,
    walkMin: result.walkMin,
    thresholdKm: result.thresholdKm,
    groupCount: result.groupCount,
    transitAnchored: result.transitAnchored,
    origin: result.origin || null,
    groups: result.groups.map((g) => ({
      plannedDate: g.plannedDate || undefined,
      id: g.id,
      label: g.label,
      area: g.area,
      dates: g.dates,
      earliest: g.earliest,
      mapsUrl: g.mapsUrl,
      warnings: g.warnings,
      transitNote: g.transitNote || null,
      stops: g.stops.map((s) =>
        s.transit
          ? {
              transit: true,
              name: s.name,
              kind: s.kind,
              kindLabel: s.kindLabel,
              lat: s.lat,
              lng: s.lng,
              fromHomeUrl: s.fromHomeUrl || null,
              travelFromPrev: s.travelFromPrev || null,
            }
          : { travelFromPrev: s.travelFromPrev || null, listing: slimListing(s.listing) },
      ),
    })),
  }
}

export default function Visitations({ listings, base, onSaveSchedule }) {
  const confirmed = useMemo(
    () => listings.filter((l) => l.visit_confirmed && !l.struck),
    [listings],
  )
  const [groupMode, setGroupMode] = useState('radius')
  const [thresholdKm, setThresholdKm] = useState(2.4)
  const [groupCount, setGroupCount] = useState(3)
  const [walkMin, setWalkMin] = useState(20)
  const [transitAnchor, setTransitAnchor] = useState(true)
  const [origin, setOrigin] = useState('')
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState('')

  async function generate() {
    setLoading(true)
    setErr('')
    setResult(null)
    const withAddr = confirmed.filter((l) => l.address && l.address.trim())
    const missing = confirmed.filter((l) => !l.address || !l.address.trim())
    try {
      const geo = await geocodeMany(withAddr.map((l) => l.address))
      const items = []
      const ungeocoded = []
      geo.forEach((r, i) => {
        const l = withAddr[i]
        if (r.lat != null && r.lng != null) items.push({ ...l, lat: r.lat, lng: r.lng })
        else ungeocoded.push({ listing: l, error: r.error })
      })
      const sched = await generateSchedule(items, {
        mode: groupMode,
        thresholdKm,
        groupCount,
        walkMin,
        transitAnchor,
        origin: origin.trim() || null,
        findTransitMany,
      })
      setResult({ ...sched, ungeocoded, missing })
    } catch (e) {
      setErr(e.message || 'Could not generate the schedule')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display m-0 text-[24px] font-semibold">Visitations</h2>
          <p className="mt-1 text-ink-soft">
            Apartments you have confirmed a visit to. Generate a schedule to group nearby ones and
            suggest an efficient order.
          </p>
        </div>
        <a href={`#${base}/schedules`} className="btn btn-ghost no-underline">
          Saved schedules
        </a>
      </div>

      {confirmed.length === 0 ? (
        <div className="card mt-5 p-8 text-center">
          <h3 className="font-display m-0 mb-1.5 text-[19px]">No confirmed visits yet</h3>
          <p className="muted">
            Open a listing, tick "Visit confirmed", and set a time or a flexible window. It will
            show up here.
          </p>
          <a href={`#${base}`} className="btn btn-ghost mt-4 inline-block no-underline">
            Back to all listings
          </a>
        </div>
      ) : (
        <>
          <div className="card mt-5 p-4">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <label className="hint whitespace-nowrap">Starting from</label>
              <input
                className="input min-w-[240px] flex-1"
                placeholder="Where you're staying (optional) - adds transit directions from here to each stop"
                value={origin}
                onChange={(e) => setOrigin(e.target.value)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold">{confirmed.length} confirmed</span>
              <span className="flex-1" />
              <label className="hint">Group by</label>
              <select
                className="input max-w-[180px]"
                value={groupMode}
                onChange={(e) => setGroupMode(e.target.value)}
              >
                <option value="radius">Distance</option>
                <option value="walk">Walk time</option>
                <option value="count">Number of groups</option>
              </select>
              {groupMode === 'radius' && (
                <select
                  className="input max-w-[260px]"
                  value={thresholdKm}
                  onChange={(e) => setThresholdKm(Number(e.target.value))}
                >
                  {GROUP_OPTIONS.map((o) => (
                    <option key={o.km} value={o.km}>
                      {o.label}
                    </option>
                  ))}
                </select>
              )}
              {groupMode === 'walk' && (
                <select
                  className="input max-w-[200px]"
                  value={walkMin}
                  onChange={(e) => setWalkMin(Number(e.target.value))}
                >
                  {WALK_OPTIONS.map((m) => (
                    <option key={m} value={m}>
                      Up to {m} min walk
                    </option>
                  ))}
                </select>
              )}
              {groupMode === 'count' && (
                <select
                  className="input max-w-[150px]"
                  value={groupCount}
                  onChange={(e) => setGroupCount(Number(e.target.value))}
                >
                  {[2, 3, 4, 5, 6].map((n) => (
                    <option key={n} value={n}>
                      {n} groups
                    </option>
                  ))}
                </select>
              )}
              <label className="hint flex cursor-pointer items-center gap-1.5 select-none">
                <input
                  type="checkbox"
                  checked={transitAnchor}
                  onChange={(e) => setTransitAnchor(e.target.checked)}
                />
                Start from a transit stop
              </label>
              <button className="btn btn-primary" onClick={generate} disabled={loading}>
                {loading ? 'Generating...' : 'Generate schedule'}
              </button>
            </div>
          </div>

          {err && (
            <div
              className="mt-4 rounded-xl border border-line px-4 py-2 text-[13.5px]"
              style={{ background: 'var(--color-terra-soft)', color: 'var(--color-terra)' }}
            >
              {err}
            </div>
          )}

          {!result && (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {confirmed.map((l) => (
                <ConfirmedCard key={l.id} l={l} base={base} />
              ))}
            </div>
          )}

          {result && (
            <ScheduleResult
              result={result}
              base={base}
              onSave={(name) => onSaveSchedule(name, serializeSchedule(result))}
            />
          )}
        </>
      )}
    </div>
  )
}

function ConfirmedCard({ l, base }) {
  return (
    <a href={`#${base}/id=` + encodeURIComponent(l.id)} className="card block p-4 no-underline text-ink">
      <div className="font-semibold">{l.address || l.location || 'Untitled'}</div>
      <div className="hint mt-0.5">{[l.type, l.location].filter(Boolean).join(' · ')}</div>
      <div className="mt-2 text-[13.5px]">{timingLabel(l)}</div>
      {(l.contact_name || l.contact_number) && (
        <div className="muted mt-1 text-[13px]">
          {l.contact_name} {l.contact_number ? `· ${l.contact_number}` : ''}
        </div>
      )}
    </a>
  )
}

function ScheduleResult({ result, base, onSave }) {
  const [savedName, setSavedName] = useState('')
  const [saving, setSaving] = useState(false)

  async function save() {
    const def = 'Schedule ' + new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    const name = window.prompt('Name this schedule', def)
    if (!name || !name.trim()) return
    setSaving(true)
    try {
      await onSave(name.trim())
      setSavedName(name.trim())
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span className="font-semibold">
          {result.groups.length} group{result.groups.length === 1 ? '' : 's'}
        </span>
        <span className="hint">Visit each group together to cut down on travel.</span>
        <span className="flex-1" />
        {savedName ? (
          <span className="hint">
            Saved as "{savedName}".{' '}
            <a href={`#${base}/schedules`} className="link-chip no-underline">
              View saved schedules
            </a>
          </span>
        ) : (
          <button className="btn btn-teal" onClick={save} disabled={saving}>
            {saving ? 'Saving...' : 'Save schedule'}
          </button>
        )}
      </div>

      <ScheduleGroups groups={result.groups} base={base} />

      {result.ungeocoded.length > 0 && (
        <div className="card mt-4 p-4">
          <div className="font-semibold">Could not locate these addresses</div>
          <ul className="mt-1 list-disc pl-5 text-[13.5px] text-ink-soft">
            {result.ungeocoded.map((u, i) => (
              <li key={i}>{u.listing.address}</li>
            ))}
          </ul>
        </div>
      )}

      {result.missing.length > 0 && (
        <div className="card mt-4 p-4">
          <div className="font-semibold">Confirmed but missing an address</div>
          <ul className="mt-1 list-disc pl-5 text-[13.5px] text-ink-soft">
            {result.missing.map((u, i) => (
              <li key={i}>{u.location || 'Untitled listing'}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
