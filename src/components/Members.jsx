import { useState } from 'react'

// Invite-by-email collaboration panel. The owner adds a family member's Google
// email; when that person signs in with it, row level security grants them
// access to this hunt. No email is actually sent, so tell them to sign in.
export default function Members({ members, isOwner, onInvite, onRemove, busy }) {
  const [email, setEmail] = useState('')
  const [err, setErr] = useState('')

  async function invite() {
    const e = email.trim()
    if (!e) return
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
      setErr('Enter a valid email')
      return
    }
    setErr('')
    try {
      await onInvite(e)
      setEmail('')
    } catch (ex) {
      setErr(ex.message || 'Could not invite')
    }
  }

  return (
    <div className="card mt-5 p-5">
      <h3 className="font-display m-0 text-[18px] font-semibold">Members</h3>
      <p className="hint mt-1">
        Invite family by their Google email. They sign in with Google, then this hunt appears on
        their dashboard. They can view and add listings.
      </p>

      {isOwner && (
        <div className="mt-3 flex gap-2">
          <input
            className="input"
            type="email"
            placeholder="family@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && invite()}
          />
          <button className="btn btn-primary shrink-0" onClick={invite} disabled={busy || !email.trim()}>
            Invite
          </button>
        </div>
      )}
      {err && <p className="hint mt-1 text-terra">{err}</p>}

      <div className="mt-4 flex flex-col gap-2">
        {members.length === 0 && <p className="muted">No collaborators yet.</p>}
        {members.map((m) => (
          <div key={m.id} className="flex items-center gap-2 border-b border-line pb-2 text-[14px]">
            <span>{m.invited_email}</span>
            <span
              className="pill"
              style={{ background: 'var(--color-paper-2)', color: 'var(--color-ink-soft)' }}
            >
              {m.user_id ? 'joined' : 'invited'}
            </span>
            {isOwner && (
              <button
                className="ml-auto cursor-pointer text-[13px] text-ink-soft hover:text-terra"
                onClick={() => onRemove(m.id)}
                disabled={busy}
              >
                Remove
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
