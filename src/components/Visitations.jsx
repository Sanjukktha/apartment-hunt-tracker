import { useMemo, useState } from 'react'
import { geocodeMany } from '../lib/geocode.js'
import { generateSchedule } from '../lib/scheduler.js'

const GROUP_OPTIONS = [
  { km: 1.6, label: 'Walkable (about 1 mile)' },
  { km: 2.4, label: 'Neighborhood (about 1.5 miles)' },
  { km: 4.0, label: 'Wider area (about 2.5 miles)' },
  { km: 8.0, label: 'Whole side of town (about 5 miles)' },
]

function fmtDT(v) {
  const d = new Date(v)
  if (isNaN(d)) return v
  return d.toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function timingLabel(l) {
  if (l.visit_timing_type === 'flexible') {
    const s = l.visit_window_start ? fmtDT(l.visit_window_start) : null
    const e = l.visit_window_end ? fmtDT(l.visit_window_end) : null
    if (s && e) return `Flexible: ${s} to ${e}`
    if (s) return `Flexible from ${s}`
    if (e) return `Flexible until ${e}`
    return 'Flexible time'
  }
  if (l.visit) return fmtDT(l.visit)
  return 'Time not set yet'
}

export default function Visitations({ listings, base }) {
  const confirmed = useMemo(() => listings.filter((l) => l.visit_confirmed), [listings])
  const [thresholdKm, setThresholdKm] = useState(2.4)
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
      const sched = generateSchedule(items, { thresholdKm })
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
            <div className="flex flex-wrap items-center gap-3">
              <span className="font-semibold">{confirmed.length} confirmed</span>
              <span className="flex-1" />
              <label className="hint">Group places that are</label>
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

          {result && <ScheduleResult result={result} base={base} />}
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

function ScheduleResult({ result, base }) {
  return (
    <div className="mt-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="font-semibold">
          {result.groups.length} group{result.groups.length === 1 ? '' : 's'}
        </span>
        <span className="hint">Visit each group together to cut down on travel.</span>
      </div>

      <div className="flex flex-col gap-4">
        {result.groups.map((g, gi) => (
          <div key={g.id} className="card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-display m-0 text-[18px] font-semibold">
                  {gi + 1}. {g.label}
                </h3>
                {g.dates.length > 0 && <div className="hint mt-0.5">{g.dates.join(', ')}</div>}
              </div>
              {g.mapsUrl && (
                <a className="link-chip no-underline" href={g.mapsUrl} target="_blank" rel="noopener">
                  Open walking route in Maps
                </a>
              )}
            </div>

            {g.warnings.length > 0 && (
              <div className="mt-3 flex flex-col gap-1">
                {g.warnings.map((w, i) => (
                  <p key={i} className="text-[13px] text-terra">
                    {w}
                  </p>
                ))}
              </div>
            )}

            <ol className="mt-3 flex flex-col gap-2">
              {g.stops.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="font-display mt-0.5 text-[15px] font-semibold text-terra">
                    {i + 1}
                  </span>
                  <div className="flex-1 border-b border-line pb-2">
                    <a
                      href={`#${base}/id=` + encodeURIComponent(s.listing.id)}
                      className="font-semibold text-ink no-underline hover:text-terra"
                    >
                      {s.listing.address || s.listing.location || 'Untitled'}
                    </a>
                    <div className="hint mt-0.5">{timingLabel(s.listing)}</div>
                    {s.travelFromPrev && (
                      <div className="muted mt-0.5 text-[12.5px]">
                        about {s.travelFromPrev.miles} mi, {s.travelFromPrev.min} min walk from the
                        previous stop
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </div>
        ))}
      </div>

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
