import ScheduleGroups from './ScheduleGroups.jsx'

function fmtDate(v) {
  const d = new Date(v)
  if (isNaN(d)) return ''
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })
}

// Counts the apartments (non-transit stops) across a saved schedule.
function placeCount(data) {
  return (data.groups || []).reduce(
    (n, g) => n + (g.stops || []).filter((s) => !s.transit).length,
    0,
  )
}

// The Schedules tab. With a scheduleId it shows that one saved schedule; without
// one it lists them all. Each apartment links through to its full detail page.
export default function Schedules({ schedules, base, scheduleId, onDelete }) {
  if (scheduleId) {
    const sched = schedules.find((s) => s.id === scheduleId)
    if (!sched) {
      return (
        <div className="card mt-5 p-8 text-center">
          <h3 className="font-display m-0 mb-1.5 text-[19px]">Schedule not found</h3>
          <p className="muted">It may have been deleted.</p>
          <a href={`#${base}/schedules`} className="btn btn-ghost mt-4 inline-block no-underline">
            Back to schedules
          </a>
        </div>
      )
    }
    const data = sched.data || {}
    return (
      <div className="mt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display m-0 text-[24px] font-semibold">{sched.name}</h2>
            <div className="hint mt-0.5">
              Saved {fmtDate(sched.created_at)} · {(data.groups || []).length} group
              {(data.groups || []).length === 1 ? '' : 's'} · {placeCount(data)} place
              {placeCount(data) === 1 ? '' : 's'}
            </div>
          </div>
          <div className="flex gap-2">
            <a href={`#${base}/schedules`} className="btn btn-ghost no-underline">
              All schedules
            </a>
            <button className="btn btn-ghost" onClick={() => onDelete(sched)}>
              Delete
            </button>
          </div>
        </div>

        <div className="mt-4">
          <ScheduleGroups groups={data.groups || []} base={base} />
        </div>
      </div>
    )
  }

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display m-0 text-[24px] font-semibold">Schedules</h2>
          <p className="mt-1 text-ink-soft">
            Schedules you saved from the Visitations tab. Open one to see the grouped route, and
            click any apartment for its full details.
          </p>
        </div>
        <a href={`#${base}/visits`} className="btn btn-ghost no-underline">
          Generate a new one
        </a>
      </div>

      {schedules.length === 0 ? (
        <div className="card mt-5 p-8 text-center">
          <h3 className="font-display m-0 mb-1.5 text-[19px]">No saved schedules yet</h3>
          <p className="muted">
            Go to Visitations, generate a schedule, and hit "Save schedule" to keep it here.
          </p>
          <a href={`#${base}/visits`} className="btn btn-ghost mt-4 inline-block no-underline">
            Go to Visitations
          </a>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-2">
          {schedules.map((s) => {
            const data = s.data || {}
            const groups = data.groups || []
            return (
              <div key={s.id} className="card flex flex-wrap items-center gap-3 p-4">
                <a
                  href={`#${base}/schedules/id=` + encodeURIComponent(s.id)}
                  className="min-w-0 flex-1 no-underline text-ink"
                >
                  <div className="font-semibold hover:text-terra">{s.name}</div>
                  <div className="hint mt-0.5">
                    Saved {fmtDate(s.created_at)} · {groups.length} group{groups.length === 1 ? '' : 's'} ·{' '}
                    {placeCount(data)} place{placeCount(data) === 1 ? '' : 's'}
                    {data.transitAnchored ? ' · transit start' : ''}
                  </div>
                </a>
                <a
                  href={`#${base}/schedules/id=` + encodeURIComponent(s.id)}
                  className="btn btn-ghost no-underline"
                >
                  View
                </a>
                <button className="btn btn-ghost" onClick={() => onDelete(s)}>
                  Delete
                </button>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
