import { useState } from 'react'
import { navigate } from '../hooks/useHashRoute.js'

// The signed-in home. Shows roll-up analytics and the user's hunts, and lets
// them start a new hunt.
export default function Dashboard({ hunts, summary, onCreateHunt, busy }) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  const totals = hunts.reduce(
    (acc, h) => {
      const s = summary[h.id] || { leads: 0, confirmed: 0 }
      acc.leads += s.leads
      acc.confirmed += s.confirmed
      return acc
    },
    { leads: 0, confirmed: 0 },
  )

  async function create() {
    const n = name.trim()
    if (!n) return
    await onCreateHunt(n)
    setName('')
    setCreating(false)
  }

  return (
    <div className="mt-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display m-0 text-[clamp(26px,4vw,36px)] font-semibold tracking-[-0.02em]">
            {hunts.length ? 'Welcome back' : 'Your dashboard'}
          </h1>
          <p className="mt-1 text-ink-soft">
            {hunts.length
              ? 'Pick up a hunt, or start a new one.'
              : 'Start your first hunt to begin logging leads.'}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Stat value={hunts.length} label="Hunts" />
          <Stat value={totals.leads} label="Leads" />
          <Stat value={totals.confirmed} label="Confirmed visits" />
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3">
        {creating ? (
          <div className="card flex w-full max-w-[480px] items-center gap-2 p-2">
            <input
              className="input"
              autoFocus
              placeholder="Name this hunt, e.g. New Jersey Hunting"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') create()
                if (e.key === 'Escape') setCreating(false)
              }}
            />
            <button className="btn btn-primary shrink-0" onClick={create} disabled={busy || !name.trim()}>
              {busy ? '...' : 'Create'}
            </button>
            <button className="btn btn-ghost shrink-0" onClick={() => setCreating(false)} disabled={busy}>
              Cancel
            </button>
          </div>
        ) : (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            + Start hunting
          </button>
        )}
      </div>

      {hunts.length > 0 && (
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {hunts.map((h) => {
            const s = summary[h.id] || { leads: 0, confirmed: 0 }
            return (
              <button
                key={h.id}
                className="card cursor-pointer p-5 text-left transition hover:shadow-md"
                onClick={() => navigate('hunt=' + encodeURIComponent(h.id))}
              >
                <div className="font-display text-[19px] font-semibold">{h.name}</div>
                <div className="mt-2 flex gap-4 text-[13.5px] text-ink-soft">
                  <span>
                    <b className="text-ink">{s.leads}</b> leads
                  </span>
                  <span>
                    <b className="text-ink">{s.confirmed}</b> confirmed
                  </span>
                </div>
                {Array.isArray(h.prefs?.searchAreas) && h.prefs.searchAreas.length > 0 && (
                  <div className="hint mt-2 truncate">{h.prefs.searchAreas.join(', ')}</div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

function Stat({ value, label }) {
  return (
    <div className="card min-w-[92px] px-3.5 py-[9px] text-center">
      <b className="font-display block text-[22px] leading-none">{value}</b>
      <span className="text-[11px] uppercase tracking-[0.07em] text-ink-soft">{label}</span>
    </div>
  )
}
