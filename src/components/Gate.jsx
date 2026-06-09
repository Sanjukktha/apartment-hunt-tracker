import { useState } from 'react'
import { ACCESS_CODE } from '../lib/access.js'

// The site-wide gate shown before the app loads (when an access code is set).
// Entering the code unlocks full editing; "I just want to view" grants a
// read-only session.
export default function Gate({ onUnlock }) {
  const [code, setCode] = useState('')
  const [err, setErr] = useState('')

  function submit(e) {
    e.preventDefault()
    if (code === ACCESS_CODE) onUnlock('editor')
    else setErr('That code is not right. Try again, or continue as a viewer.')
  }

  return (
    <div className="grid min-h-screen place-items-center px-4">
      <div className="card w-full max-w-[420px] p-7 text-center">
        <div className="font-display text-[22px] font-semibold">
          Apartment <em className="text-terra italic">Hunt</em>
        </div>
        <p className="muted mt-2">
          Enter the access code to add and edit, or continue as a viewer to look around.
        </p>

        <form onSubmit={submit} className="mt-5 flex flex-col gap-2">
          <input
            type="password"
            className="input"
            placeholder="Access code"
            value={code}
            autoFocus
            onChange={(e) => {
              setCode(e.target.value)
              setErr('')
            }}
          />
          {err && <div className="text-[13px] text-terra">{err}</div>}
          <button type="submit" className="btn btn-primary" disabled={!code}>
            Continue
          </button>
        </form>

        <button className="btn btn-ghost mt-2 w-full" onClick={() => onUnlock('viewer')}>
          I just want to view
        </button>
      </div>
    </div>
  )
}
