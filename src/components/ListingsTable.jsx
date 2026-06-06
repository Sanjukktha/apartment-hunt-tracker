import { useMemo, useState } from 'react'
import { STATUSES, STATUS_COLORS } from '../lib/constants.js'
import { navigate } from '../hooks/useHashRoute.js'

function fmtVisit(v) {
  if (!v) return null
  const d = new Date(v)
  if (isNaN(d)) return v
  return d.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function StatusPill({ status }) {
  const [bg, fg] = STATUS_COLORS[status] || ['#f3ebe0', '#6b6157']
  return (
    <span className="pill" style={{ background: bg, color: fg }}>
      {status || '-'}
    </span>
  )
}

export default function ListingsTable({
  listings,
  canEdit,
  onDelete,
  onExport,
  onAddSample,
}) {
  const [fStatus, setFStatus] = useState('')
  const [fLoc, setFLoc] = useState('')
  const [sortBy, setSortBy] = useState('visit')

  const locations = useMemo(
    () => Array.from(new Set(listings.map((l) => l.location).filter(Boolean))).sort(),
    [listings],
  )

  const rows = useMemo(() => {
    const filtered = listings.filter(
      (l) => (!fStatus || l.status === fStatus) && (!fLoc || l.location === fLoc),
    )
    const sorted = [...filtered]
    sorted.sort((a, b) => {
      if (sortBy === 'rent') return (parseFloat(a.rent) || 1e12) - (parseFloat(b.rent) || 1e12)
      if (sortBy === 'loc') return (a.location || '').localeCompare(b.location || '')
      if (sortBy === 'added') return (b.created_at || '').localeCompare(a.created_at || '')
      const av = a.visit ? new Date(a.visit).getTime() : 8e15
      const bv = b.visit ? new Date(b.visit).getTime() : 8e15
      return av - bv
    })
    return sorted
  }, [listings, fStatus, fLoc, sortBy])

  return (
    <div>
      <div className="my-4 flex flex-wrap items-center gap-2.5">
        {canEdit && (
          <a href="#add" className="btn btn-primary no-underline">
            + Add listing
          </a>
        )}
        <select className="input max-w-[170px]" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
        <select className="input max-w-[180px]" value={fLoc} onChange={(e) => setFLoc(e.target.value)}>
          <option value="">All locations</option>
          {locations.map((l) => (
            <option key={l}>{l}</option>
          ))}
        </select>
        <select className="input max-w-[200px]" value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
          <option value="visit">Sort: Visit date</option>
          <option value="rent">Sort: Rent (low to high)</option>
          <option value="loc">Sort: Location</option>
          <option value="added">Sort: Recently added</option>
        </select>
        <span className="flex-1" />
        {canEdit && (
          <button className="btn btn-ghost" onClick={onAddSample}>
            Add example row
          </button>
        )}
        <button className="btn btn-teal" onClick={onExport} disabled={!listings.length}>
          Export to Excel
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[1080px] border-collapse text-[13.5px]">
          <thead>
            <tr>
              {['Status', 'Address', 'Type', 'Rent', 'Location', 'Visit', 'Commute', 'Contact', 'Media', 'Rating', 'Notes', ''].map(
                (h, i) => (
                  <th
                    key={i}
                    className="sticky top-0 whitespace-nowrap border-b-[1.5px] border-line bg-paper-2 px-3 py-3 text-left text-[11px] uppercase tracking-[0.06em] text-ink-soft"
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((l) => (
              <Row key={l.id} l={l} canEdit={canEdit} onDelete={onDelete} />
            ))}
          </tbody>
        </table>

        {!listings.length && (
          <div className="px-6 py-[54px] text-center text-ink-soft">
            <h4 className="font-display m-0 mb-1.5 text-[20px] text-ink">No listings yet</h4>
            <div>
              {canEdit
                ? 'Hit + Add listing to enter your first one, or Add example row to see the format.'
                : 'Nothing has been added yet.'}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function Row({ l, canEdit, onDelete }) {
  const go = () => navigate('id=' + encodeURIComponent(l.id))
  const stop = (e) => e.stopPropagation()
  const commutes = Array.isArray(l.commutes) ? l.commutes.filter((c) => c.mapsUrl) : []
  const mediaCount = Array.isArray(l.media) ? l.media.length : 0
  const visit = fmtVisit(l.visit)

  return (
    <tr className="cursor-pointer align-top hover:bg-paper" onClick={go}>
      <td className="border-b border-line px-3 py-3">
        <StatusPill status={l.status} />
      </td>
      <td className="max-w-[200px] border-b border-line px-3 py-3 font-semibold">{l.address || '-'}</td>
      <td className="border-b border-line px-3 py-3">{l.type || '-'}</td>
      <td className="whitespace-nowrap border-b border-line px-3 py-3">
        <span className="font-display font-semibold">
          {l.rent ? '$' + Number(l.rent).toLocaleString() : <span className="muted">-</span>}
        </span>
      </td>
      <td className="border-b border-line px-3 py-3">{l.location || '-'}</td>
      <td className="border-b border-line px-3 py-3">{visit || <span className="muted">-</span>}</td>
      <td className="border-b border-line px-3 py-3">
        {commutes.length ? (
          <div className="flex flex-col gap-1" onClick={stop}>
            {commutes.map((c, i) => (
              <a
                key={i}
                className="link-chip"
                target="_blank"
                rel="noopener"
                href={c.mapsUrl}
                title={c.address}
              >
                {c.label || 'Route'}
                {c.time ? ` · ${c.time}` : ''}
              </a>
            ))}
          </div>
        ) : (
          <span className="muted">-</span>
        )}
      </td>
      <td className="border-b border-line px-3 py-3">
        {l.contact_name || l.contact_number || l.contact_method ? (
          <div>
            {l.contact_name && <div>{l.contact_name}</div>}
            {l.contact_number && <div className="muted">{l.contact_number}</div>}
            {l.contact_method && <div className="hint">{l.contact_method}</div>}
          </div>
        ) : (
          <span className="muted">-</span>
        )}
      </td>
      <td className="border-b border-line px-3 py-3">
        {mediaCount ? (
          <span className="link-chip">
            {mediaCount} item{mediaCount > 1 ? 's' : ''}
          </span>
        ) : (
          <span className="muted">-</span>
        )}
      </td>
      <td className="whitespace-nowrap border-b border-line px-3 py-3">
        {l.rating ? <span className="stars">{'★'.repeat(Number(l.rating))}</span> : <span className="muted">-</span>}
      </td>
      <td className="max-w-[240px] border-b border-line px-3 py-3 text-[12.5px] text-ink-soft">
        {l.notes || ''}
      </td>
      <td className="border-b border-line px-3 py-3" onClick={stop}>
        {canEdit && (
          <div className="flex gap-1.5">
            <a
              href={'#edit=' + encodeURIComponent(l.id)}
              className="grid h-[30px] w-[30px] place-items-center rounded-lg border border-line bg-paper-2 text-[14px] no-underline hover:bg-terra-soft"
              title="Edit"
            >
              {'✎'}
            </a>
            <button
              className="grid h-[30px] w-[30px] place-items-center rounded-lg border border-line bg-paper-2 text-[14px] hover:bg-terra-soft"
              title="Delete"
              onClick={() => onDelete(l)}
            >
              {'\u{1F5D1}'}
            </button>
          </div>
        )}
      </td>
    </tr>
  )
}
