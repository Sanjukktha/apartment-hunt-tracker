import { useMemo, useState } from 'react'
import { STATUSES, CONTACT_METHODS, mediaKind } from '../lib/constants.js'
import { TRAVEL_MODES } from '../lib/prefs.js'
import { mapsUrl, supportsAutoDistance, fetchDistanceTime } from '../lib/commute.js'

const BLANK = {
  status: 'To contact',
  location: '',
  type: '',
  address: '',
  rent: '',
  visit: '',
  contact_name: '',
  contact_number: '',
  contact_method: 'WhatsApp',
  rating: '',
  notes: '',
}

// Builds the editable per-area commute state from prefs + an existing listing.
function initCommutes(prefs, listing) {
  const saved = {}
  if (listing && Array.isArray(listing.commutes)) {
    for (const c of listing.commutes) saved[c.areaId] = c
  }
  const state = {}
  for (const area of prefs.closeTo) {
    const s = saved[area.id] || {}
    state[area.id] = {
      mode: s.mode || prefs.defaultMode || 'transit',
      time: s.time || '',
      distance: s.distance || '',
    }
  }
  return state
}

export default function ListingForm({ prefs, listing, onSave, onCancel }) {
  const isEdit = Boolean(listing)
  const [form, setForm] = useState(() => ({ ...BLANK, ...(listing || {}) }))
  const [media, setMedia] = useState(() => (Array.isArray(listing?.media) ? listing.media : []))
  const [mediaInput, setMediaInput] = useState('')
  const [commutes, setCommutes] = useState(() => initCommutes(prefs, listing))
  const [autoState, setAutoState] = useState({}) // areaId -> { loading, error }
  const [saving, setSaving] = useState(false)

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const setCommute = (areaId, patch) =>
    setCommutes((c) => ({ ...c, [areaId]: { ...c[areaId], ...patch } }))

  function addMedia() {
    const v = mediaInput.trim()
    if (!v) return
    const url = /^https?:\/\//i.test(v) ? v : 'https://' + v
    setMedia([...media, { url, kind: mediaKind(url) }])
    setMediaInput('')
  }

  function removeMedia(i) {
    setMedia(media.filter((_, idx) => idx !== i))
  }

  async function autoFill(area) {
    const cs = commutes[area.id]
    if (!form.address.trim() || !area.address.trim()) {
      setAutoState((s) => ({ ...s, [area.id]: { error: 'Enter the apartment address first' } }))
      return
    }
    setAutoState((s) => ({ ...s, [area.id]: { loading: true } }))
    try {
      const data = await fetchDistanceTime(form.address, area.address, cs.mode)
      if (data) {
        setCommute(area.id, {
          time: `${data.duration_min} min`,
          distance: `${data.distance_miles} mi`,
        })
      }
      setAutoState((s) => ({ ...s, [area.id]: {} }))
    } catch (err) {
      setAutoState((s) => ({ ...s, [area.id]: { error: err.message || 'Lookup failed' } }))
    }
  }

  async function save() {
    if (!form.address.trim() && !form.location.trim()) return
    setSaving(true)
    const builtCommutes = prefs.closeTo.map((area) => {
      const cs = commutes[area.id] || {}
      return {
        areaId: area.id,
        label: area.label,
        address: area.address,
        mode: cs.mode || prefs.defaultMode,
        time: (cs.time || '').trim(),
        distance: (cs.distance || '').trim(),
        mapsUrl: mapsUrl(form.address, area.address, cs.mode || prefs.defaultMode),
      }
    })
    const record = {
      ...listing,
      ...form,
      rent: form.rent === '' || form.rent == null ? null : Number(form.rent),
      rating: form.rating === '' || form.rating == null ? null : Number(form.rating),
      media,
      commutes: builtCommutes,
    }
    await onSave(record)
    setSaving(false)
  }

  return (
    <div className="card mt-5 p-5">
      <h3 className="font-display m-0 mb-4 text-[19px] font-semibold">
        {isEdit ? 'Edit listing' : 'Add a listing'}
      </h3>

      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
        <Field label="Status">
          <select className="input" value={form.status} onChange={set('status')}>
            {STATUSES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </Field>

        <Field label="Location">
          <input className="input" list="locOptions" value={form.location} onChange={set('location')} placeholder="e.g. Jersey City" />
          <datalist id="locOptions">
            {prefs.searchAreas.map((a) => (
              <option key={a} value={a} />
            ))}
          </datalist>
        </Field>

        <Field label="Type / Beds">
          <input className="input" value={form.type} onChange={set('type')} placeholder="e.g. 2BR apt, Studio, Townhouse" />
        </Field>

        <Field label="Address" full>
          <input className="input" value={form.address} onChange={set('address')} placeholder="Full street address" />
        </Field>

        <Field label="Rent (per month)">
          <input className="input" type="number" min="0" step="50" value={form.rent ?? ''} onChange={set('rent')} placeholder="2400" />
        </Field>

        <Field label="Visit date and time">
          <input className="input" type="datetime-local" value={form.visit} onChange={set('visit')} />
        </Field>

        <Field label="Rating (after visit)">
          <select className="input" value={form.rating ?? ''} onChange={set('rating')}>
            <option value="">-</option>
            {[1, 2, 3, 4, 5].map((n) => (
              <option key={n} value={n}>
                {'★'.repeat(n)}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Contact name">
          <input className="input" value={form.contact_name} onChange={set('contact_name')} placeholder="e.g. Maria (broker)" />
        </Field>

        <Field label="Contact number">
          <input className="input" value={form.contact_number} onChange={set('contact_number')} placeholder="+1 ..." />
        </Field>

        <Field label="Contact method">
          <select className="input" value={form.contact_method} onChange={set('contact_method')}>
            {CONTACT_METHODS.map((m) => (
              <option key={m}>{m}</option>
            ))}
          </select>
        </Field>

        <Field label="Notes / remarks" full>
          <textarea className="input" value={form.notes} onChange={set('notes')} placeholder="What they said, what to ask, fee / move-in details, vibe, etc." />
        </Field>
      </div>

      {/* Commute section, one block per "close to" area */}
      <div className="mt-6">
        <label className="field-label">Commute to your areas</label>
        <p className="hint mb-3">
          Links open Google Maps with the route pre-filled. For drive, walk, and cycle you can
          auto-fill time and distance. For transit, click the link and type the time you see.
        </p>
        {prefs.closeTo.length === 0 && <p className="muted">No areas set. Add some in Settings.</p>}
        <div className="flex flex-col gap-3">
          {prefs.closeTo.map((area) => {
            const cs = commutes[area.id] || {}
            const url = mapsUrl(form.address, area.address, cs.mode)
            const auto = autoState[area.id] || {}
            const canAuto = supportsAutoDistance(cs.mode)
            return (
              <div key={area.id} className="rounded-xl border border-line bg-paper-2/40 p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{area.label || 'Area'}</span>
                  <span className="hint">{area.address}</span>
                  {form.address.trim() && (
                    <a className="link-chip ml-auto" href={url} target="_blank" rel="noopener">
                      Open in Maps
                    </a>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                  <select
                    className="input"
                    value={cs.mode}
                    onChange={(e) => setCommute(area.id, { mode: e.target.value })}
                  >
                    {TRAVEL_MODES.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className="input"
                    placeholder="Time (e.g. 38 min)"
                    value={cs.time}
                    onChange={(e) => setCommute(area.id, { time: e.target.value })}
                  />
                  <input
                    className="input"
                    placeholder="Distance (e.g. 4.2 mi)"
                    value={cs.distance}
                    onChange={(e) => setCommute(area.id, { distance: e.target.value })}
                  />
                  <button
                    type="button"
                    className="btn btn-ghost shrink-0"
                    disabled={!canAuto || auto.loading}
                    title={canAuto ? 'Auto-fill via OpenRouteService' : 'Transit cannot be auto-filled'}
                    onClick={() => autoFill(area)}
                  >
                    {auto.loading ? '...' : 'Auto-fill'}
                  </button>
                </div>
                {auto.error && <p className="hint mt-1 text-terra">{auto.error}</p>}
                {!canAuto && <p className="hint mt-1">Transit: open the Maps link and type the time.</p>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Media links */}
      <div className="mt-6">
        <label className="field-label">Photos / videos (links)</label>
        <p className="hint mb-2">
          Paste a link to a photo or video (Google Drive, Google Photos, Imgur, the listing page).
          The detail view shows images and plays videos.
        </p>
        <div className="flex gap-2">
          <input
            className="input"
            placeholder="https://..."
            value={mediaInput}
            onChange={(e) => setMediaInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                addMedia()
              }
            }}
          />
          <button type="button" className="btn btn-ghost shrink-0" onClick={addMedia}>
            Add
          </button>
        </div>
        {media.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5">
            {media.map((m, i) => (
              <div key={i} className="flex items-center gap-2 text-[13px]">
                <span className="pill" style={{ background: 'var(--color-paper-2)', color: 'var(--color-ink-soft)' }}>
                  {m.kind}
                </span>
                <span className="truncate text-ink-soft">{m.url}</span>
                <button
                  type="button"
                  className="ml-auto shrink-0 cursor-pointer text-ink-soft hover:text-terra"
                  onClick={() => removeMedia(i)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="mt-5 flex gap-2.5">
        <button className="btn btn-primary" onClick={save} disabled={saving}>
          {saving ? 'Saving...' : 'Save listing'}
        </button>
        <button className="btn btn-ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </div>
  )
}

function Field({ label, full, children }) {
  return (
    <div className={full ? 'sm:col-span-2 lg:col-span-3' : ''}>
      <label className="field-label">{label}</label>
      {children}
    </div>
  )
}
