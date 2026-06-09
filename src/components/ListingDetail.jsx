import { STATUS_COLORS } from '../lib/constants.js'
import { navigate } from '../hooks/useHashRoute.js'
import MediaGallery from './MediaGallery.jsx'

// Go back to wherever the user came from (a schedule, the leads list, the visits
// tab...) instead of always jumping to the leads list. Falls back to the hunt
// home when there is no in-app history (e.g. opened from a deep link).
function goBack(base) {
  if (typeof window !== 'undefined' && window.history.length > 1) window.history.back()
  else navigate(base)
}

function fmtVisit(v) {
  if (!v) return null
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

export default function ListingDetail({ listing, canEdit, base }) {
  if (!listing) {
    return (
      <div className="card mt-6 p-8 text-center">
        <h3 className="font-display m-0 mb-1.5 text-[20px]">Listing not found</h3>
        <p className="muted">It may have been deleted, or the link points to a different dataset.</p>
        <a href={`#${base}`} className="btn btn-ghost mt-4 inline-block no-underline">
          Back to all listings
        </a>
      </div>
    )
  }

  const [bg, fg] = STATUS_COLORS[listing.status] || ['#f3ebe0', '#6b6157']
  const commutes = Array.isArray(listing.commutes) ? listing.commutes : []
  const visit = fmtVisit(listing.visit)

  return (
    <div className="mt-5">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => goBack(base)} className="link-chip no-underline">
          ← Back
        </button>
        <a href={`#${base}`} className="link-chip no-underline">
          All listings
        </a>
        {canEdit && (
          <a href={`#${base}/edit=` + encodeURIComponent(listing.id)} className="btn btn-ghost ml-auto no-underline">
            Edit
          </a>
        )}
      </div>

      <div className="card p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <span className="pill" style={{ background: bg, color: fg }}>
              {listing.status || '-'}
            </span>
            <h2 className="font-display mt-2 mb-0 text-[26px] font-semibold leading-tight">
              {listing.address || listing.location || 'Untitled listing'}
            </h2>
            <p className="mt-1 text-ink-soft">
              {[listing.type, listing.location].filter(Boolean).join(' · ')}
            </p>
          </div>
          <div className="text-right">
            <div className="font-display text-[28px] font-semibold">
              {listing.rent ? '$' + Number(listing.rent).toLocaleString() : ''}
            </div>
            {listing.rent && <div className="hint">per month</div>}
            {listing.rating && <div className="stars mt-1">{'★'.repeat(Number(listing.rating))}</div>}
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-x-8 gap-y-4 sm:grid-cols-2">
          {visit && <Detail label="Visit" value={visit} />}
          {(listing.contact_name || listing.contact_number || listing.contact_method) && (
            <Detail
              label="Contact"
              value={
                <span>
                  {listing.contact_name && <span>{listing.contact_name} </span>}
                  {listing.contact_number && <span className="muted">{listing.contact_number} </span>}
                  {listing.contact_method && <span className="hint">({listing.contact_method})</span>}
                </span>
              }
            />
          )}
          {listing.added_by && <Detail label="Added by" value={listing.added_by} />}
        </dl>

        {commutes.some((c) => c.mapsUrl) && (
          <div className="mt-6">
            <label className="field-label">Commute</label>
            <div className="mt-1 flex flex-col gap-2">
              {commutes
                .filter((c) => c.mapsUrl)
                .map((c, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <a className="link-chip no-underline" href={c.mapsUrl} target="_blank" rel="noopener">
                      {c.label || 'Route'}
                    </a>
                    <span className="text-ink-soft">
                      {[c.time, c.distance].filter(Boolean).join(', ') || 'Open Maps for the time'}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {listing.notes && (
          <div className="mt-6">
            <label className="field-label">Notes</label>
            <p className="mt-1 whitespace-pre-wrap">{listing.notes}</p>
          </div>
        )}

        <div className="mt-6">
          <label className="field-label">Photos and videos</label>
          <div className="mt-2">
            <MediaGallery media={listing.media} />
          </div>
        </div>
      </div>
    </div>
  )
}

function Detail({ label, value }) {
  return (
    <div>
      <dt className="field-label">{label}</dt>
      <dd className="m-0">{value}</dd>
    </div>
  )
}
