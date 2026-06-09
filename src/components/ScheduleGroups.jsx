// Renders the grouped stops of a schedule. Shared by the live result in
// Visitations and the saved-schedule view, so both look identical. A stop is
// either a transit anchor ({ transit: true, ... }) or an apartment that links
// through to its full detail page.

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

export function timingLabel(l) {
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

export default function ScheduleGroups({ groups, base, startIndex = 0 }) {
  return (
    <div className="flex flex-col gap-4">
      {groups.map((g, gi) => (
        <div key={g.id || gi} className="card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="font-display m-0 text-[18px] font-semibold">
                {startIndex + gi + 1}. {g.label}
              </h3>
              {g.dates && g.dates.length > 0 && <div className="hint mt-0.5">{g.dates.join(', ')}</div>}
            </div>
            {g.mapsUrl && (
              <a className="link-chip no-underline" href={g.mapsUrl} target="_blank" rel="noopener">
                Open walking route in Maps
              </a>
            )}
          </div>

          {g.warnings && g.warnings.length > 0 && (
            <div className="mt-3 flex flex-col gap-1">
              {g.warnings.map((w, i) => (
                <p key={i} className="text-[13px] text-terra">
                  {w}
                </p>
              ))}
            </div>
          )}

          {g.transitNote && <p className="hint mt-2 text-[13px]">{g.transitNote}</p>}

          <ol className="mt-3 flex flex-col gap-2">
            {g.stops.map((s, i) =>
              s.transit ? (
                <li key={i} className="flex gap-3">
                  <span className="font-display mt-0.5 text-[15px] font-semibold text-terra">
                    {i + 1}
                  </span>
                  <div className="flex-1 border-b border-line pb-2">
                    <a
                      href={
                        'https://www.google.com/maps/search/?api=1&query=' +
                        encodeURIComponent(`${s.lat},${s.lng}`)
                      }
                      target="_blank"
                      rel="noopener"
                      className="font-semibold text-ink no-underline hover:text-terra"
                    >
                      Start: {s.name}
                    </a>
                    <div className="hint mt-0.5">{s.kindLabel} · public transit start</div>
                  </div>
                </li>
              ) : (
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
              ),
            )}
          </ol>
        </div>
      ))}
    </div>
  )
}
