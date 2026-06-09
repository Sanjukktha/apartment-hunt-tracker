import { displayName } from '../lib/auth.js'

// Persistent top bar for signed-in views: brand, optional breadcrumb, and the
// account control.
export default function TopBar({ user, cloudAvailable, crumb, onSignOut, gated, canEdit, onLock }) {
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b-[1.5px] border-line pb-3">
      <a href="#dashboard" className="font-display text-[18px] font-semibold no-underline text-ink">
        Apartment <em className="text-terra italic">Hunt</em>
      </a>
      {crumb && (
        <>
          <span className="text-ink-soft">/</span>
          <span className="font-semibold">{crumb}</span>
        </>
      )}
      <span className="flex-1" />
      {gated &&
        (canEdit ? (
          <button className="btn btn-ghost text-[13px]" onClick={onLock} title="Lock the site (require the code again)">
            Lock
          </button>
        ) : (
          <span className="flex items-center gap-2 text-[13px]">
            <span className="pill" style={{ background: 'var(--color-paper-2)', color: 'var(--color-ink-soft)' }}>
              View only
            </span>
            <button className="btn btn-ghost" onClick={onLock}>
              Enter code
            </button>
          </span>
        ))}
      {cloudAvailable ? (
        user ? (
          <span className="flex items-center gap-2 text-[13px]">
            <span className="muted">{displayName(user)}</span>
            <button className="btn btn-ghost" onClick={onSignOut}>
              Sign out
            </button>
          </span>
        ) : null
      ) : (
        <span
          className="pill"
          style={{ background: 'var(--color-paper-2)', color: 'var(--color-ink-soft)' }}
        >
          Local dev
        </span>
      )}
    </div>
  )
}
