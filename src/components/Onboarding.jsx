import { useState } from 'react'
import { TRAVEL_MODES, MAX_CLOSE_TO, newCloseTo, savePrefs } from '../lib/prefs.js'

// First-run setup. Captures where the user is searching and the up-to-3 places
// they want to be close to, which drive the commute links on every listing.
export default function Onboarding({ initial, onComplete }) {
  const [ownerName, setOwnerName] = useState(initial?.ownerName || '')
  const [areaInput, setAreaInput] = useState('')
  const [searchAreas, setSearchAreas] = useState(initial?.searchAreas || [])
  const [closeTo, setCloseTo] = useState(
    initial?.closeTo?.length ? initial.closeTo : [newCloseTo()],
  )
  const [defaultMode, setDefaultMode] = useState(initial?.defaultMode || 'transit')
  const [saving, setSaving] = useState(false)

  function addArea() {
    const v = areaInput.trim()
    if (!v) return
    if (!searchAreas.includes(v)) setSearchAreas([...searchAreas, v])
    setAreaInput('')
  }

  function removeArea(a) {
    setSearchAreas(searchAreas.filter((x) => x !== a))
  }

  function updateCloseTo(id, patch) {
    setCloseTo(closeTo.map((c) => (c.id === id ? { ...c, ...patch } : c)))
  }

  function addCloseTo() {
    if (closeTo.length >= MAX_CLOSE_TO) return
    setCloseTo([...closeTo, newCloseTo()])
  }

  function removeCloseTo(id) {
    setCloseTo(closeTo.filter((c) => c.id !== id))
  }

  const validCloseTo = closeTo.filter((c) => c.label.trim() || c.address.trim())
  const canContinue = searchAreas.length > 0 && validCloseTo.length > 0

  async function finish() {
    setSaving(true)
    const cleaned = validCloseTo.map((c) => ({
      ...c,
      label: c.label.trim(),
      address: c.address.trim(),
    }))
    const prefs = await savePrefs({
      ownerName: ownerName.trim(),
      searchAreas,
      closeTo: cleaned,
      defaultMode,
      setupComplete: true,
    })
    setSaving(false)
    onComplete(prefs)
  }

  return (
    <div className="mx-auto max-w-[760px] px-[clamp(14px,4vw,44px)] pt-12 pb-16">
      <h1 className="font-display m-0 text-[clamp(28px,4.5vw,40px)] font-semibold leading-[1.08] tracking-[-0.02em]">
        Let us set up your <em className="text-terra italic">hunt</em>
      </h1>
      <p className="mt-2 max-w-[54ch] text-[15px] text-ink-soft">
        Tell us where you are looking and what you want to be near. We use this to build a
        one-click commute link for every place you add.
      </p>

      <div className="card mt-7 p-6">
        <label className="field-label">Your name (optional)</label>
        <input
          className="input"
          placeholder="So shared entries show who added them"
          value={ownerName}
          onChange={(e) => setOwnerName(e.target.value)}
        />

        <div className="mt-6">
          <label className="field-label">Where are you searching?</label>
          <p className="hint mb-2">
            Add the cities or neighborhoods you care about. These become your location filters.
          </p>
          <div className="flex gap-2">
            <input
              className="input"
              placeholder="e.g. Jersey City, Brooklyn, Mission District"
              value={areaInput}
              onChange={(e) => setAreaInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addArea()
                }
              }}
            />
            <button className="btn btn-ghost shrink-0" onClick={addArea} type="button">
              Add
            </button>
          </div>
          {searchAreas.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {searchAreas.map((a) => (
                <span
                  key={a}
                  className="pill flex items-center gap-2"
                  style={{ background: 'var(--color-teal-soft)', color: 'var(--color-teal)' }}
                >
                  {a}
                  <button
                    className="cursor-pointer text-[13px] leading-none opacity-70 hover:opacity-100"
                    onClick={() => removeArea(a)}
                    type="button"
                    aria-label={`Remove ${a}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="mt-6">
          <label className="field-label">Places you want to be close to (up to {MAX_CLOSE_TO})</label>
          <p className="hint mb-2">
            Your office, a partner's work, a gym, anything. Each one gets its own commute link on
            every listing.
          </p>
          <div className="flex flex-col gap-3">
            {closeTo.map((c, i) => (
              <div key={c.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1.6fr_auto]">
                <input
                  className="input"
                  placeholder={`Label ${i + 1} (e.g. Office)`}
                  value={c.label}
                  onChange={(e) => updateCloseTo(c.id, { label: e.target.value })}
                />
                <input
                  className="input"
                  placeholder="Full address"
                  value={c.address}
                  onChange={(e) => updateCloseTo(c.id, { address: e.target.value })}
                />
                {closeTo.length > 1 ? (
                  <button
                    className="btn btn-ghost shrink-0"
                    onClick={() => removeCloseTo(c.id)}
                    type="button"
                    aria-label="Remove this place"
                  >
                    Remove
                  </button>
                ) : (
                  <span className="hidden sm:block" />
                )}
              </div>
            ))}
          </div>
          {closeTo.length < MAX_CLOSE_TO && (
            <button className="btn btn-ghost mt-3" onClick={addCloseTo} type="button">
              + Add another place
            </button>
          )}
        </div>

        <div className="mt-6">
          <label className="field-label">Default commute mode</label>
          <select
            className="input max-w-[260px]"
            value={defaultMode}
            onChange={(e) => setDefaultMode(e.target.value)}
          >
            {TRAVEL_MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>

        <div className="mt-7 flex items-center gap-3">
          <button className="btn btn-primary" onClick={finish} disabled={!canContinue || saving}>
            {saving ? 'Saving...' : 'Start tracking'}
          </button>
          {!canContinue && (
            <span className="hint">Add at least one search area and one place to be close to.</span>
          )}
        </div>
      </div>
    </div>
  )
}
