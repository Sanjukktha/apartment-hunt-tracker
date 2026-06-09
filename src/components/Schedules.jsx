import { useState } from 'react'
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

// Order subsections by their planned visit date (ascending). Dated groups come
// first in date order; undated groups keep their relative order at the end.
// 'YYYY-MM-DD' sorts chronologically as plain strings, so localeCompare works.
function sortGroups(groups) {
  return [...groups].sort((a, b) => {
    const ad = a.plannedDate || ''
    const bd = b.plannedDate || ''
    if (ad && bd) return ad.localeCompare(bd)
    if (ad) return -1
    if (bd) return 1
    return 0
  })
}

// One saved schedule. View mode shows the grouped route (subsections ordered by
// any planned dates); Edit mode lets you set a visit date per subsection, which
// reorders them by date on save. Apartment stops stay read-only on purpose.
function SavedScheduleView({ sched, base, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)

  const data = sched.data || {}
  const groups = editing ? draft.groups : sortGroups(data.groups || [])

  function startEdit() {
    setDraft(JSON.parse(JSON.stringify(data)))
    setEditing(true)
  }

  function cancel() {
    setEditing(false)
    setDraft(null)
  }

  function setGroupDate(gi, value) {
    setDraft((d) => ({
      ...d,
      groups: d.groups.map((g, i) => (i === gi ? { ...g, plannedDate: value || undefined } : g)),
    }))
  }

  async function save() {
    setSaving(true)
    try {
      await onUpdate(sched.id, { ...draft, groups: sortGroups(draft.groups) })
      setEditing(false)
      setDraft(null)
    } finally {
      setSaving(false)
    }
  }

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
          {editing ? (
            <>
              <button className="btn btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button className="btn btn-ghost" onClick={cancel} disabled={saving}>
                Cancel
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-teal" onClick={startEdit}>
                Edit dates
              </button>
              <a href={`#${base}/schedules`} className="btn btn-ghost no-underline">
                All schedules
              </a>
              <button className="btn btn-ghost" onClick={() => onDelete(sched)}>
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {editing && (
        <p className="hint mt-3">
          Set a visit date for each subsection below. They reorder into date order when you save.
          Apartment stops stay as they are.
        </p>
      )}

      <div className="mt-4">
        <ScheduleGroups
          groups={groups}
          base={base}
          editable={editing}
          onGroupDate={setGroupDate}
        />
      </div>
    </div>
  )
}

// The Schedules tab. With a scheduleId it shows that one saved schedule; without
// one it lists them all. Each apartment links through to its full detail page.
export default function Schedules({ schedules, base, scheduleId, onUpdate, onDelete }) {
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
    return <SavedScheduleView sched={sched} base={base} onUpdate={onUpdate} onDelete={onDelete} />
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
