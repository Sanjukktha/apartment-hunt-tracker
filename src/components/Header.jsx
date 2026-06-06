import { displayName } from '../lib/auth.js'

// Title, live stats, and the top bar with cloud/auth controls.
export default function Header({
  stats,
  cloudAvailable,
  mode,
  user,
  busy,
  onGoRemote,
  onGoLocal,
  onShare,
  onSignIn,
  onSignOut,
}) {
  const remote = mode === 'remote'

  return (
    <header className="border-b-[1.5px] border-line pb-[18px]">
      <div className="mb-3 flex flex-wrap items-center justify-end gap-2 text-[13px]">
        {cloudAvailable ? (
          <>
            <span
              className="pill"
              style={
                remote
                  ? { background: 'var(--color-teal-soft)', color: 'var(--color-teal)' }
                  : { background: 'var(--color-paper-2)', color: 'var(--color-ink-soft)' }
              }
              title={remote ? 'Shared with anyone who has the link' : 'Saved only in this browser'}
            >
              {remote ? 'Cloud, shared' : 'Local only'}
            </span>

            {remote ? (
              <>
                <button className="btn btn-teal" onClick={onShare} disabled={busy}>
                  Share link
                </button>
                <button className="btn btn-ghost" onClick={onGoLocal} disabled={busy}>
                  Go local
                </button>
              </>
            ) : (
              <button className="btn btn-teal" onClick={onGoRemote} disabled={busy}>
                {busy ? 'Working...' : 'Go remote and share'}
              </button>
            )}

            {remote &&
              (user ? (
                <span className="flex items-center gap-2">
                  <span className="muted">{displayName(user)}</span>
                  <button className="btn btn-ghost" onClick={onSignOut} disabled={busy}>
                    Sign out
                  </button>
                </span>
              ) : (
                <button className="btn btn-ghost" onClick={onSignIn} disabled={busy}>
                  Sign in to edit
                </button>
              ))}
          </>
        ) : (
          <span
            className="pill"
            style={{ background: 'var(--color-paper-2)', color: 'var(--color-ink-soft)' }}
            title="Add Supabase keys to enable sharing"
          >
            Local only
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <a href="#list" className="no-underline text-ink">
            <h1 className="font-display m-0 text-[clamp(28px,4.5vw,42px)] font-semibold leading-[1.05] tracking-[-0.02em]">
              Apartment <em className="text-terra italic font-semibold">Hunt</em>
            </h1>
          </a>
          <p className="mt-1.5 max-w-[52ch] text-[14.5px] text-ink-soft">
            Track your visits, commutes, and contacts. Entries save automatically. Export to Excel
            anytime.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <Stat value={stats.total} label="Listings" />
          <Stat value={stats.visits} label="Visits set" />
          <Stat value={stats.liked} label="Liked" />
        </div>
      </div>
    </header>
  )
}

function Stat({ value, label }) {
  return (
    <div className="card min-w-[78px] px-3.5 py-[9px] text-center">
      <b className="font-display block text-[22px] leading-none">{value}</b>
      <span className="text-[11px] uppercase tracking-[0.07em] text-ink-soft">{label}</span>
    </div>
  )
}
