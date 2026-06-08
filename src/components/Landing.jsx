import { signInWithGoogle } from '../lib/auth.js'

// The signed-out landing page. Our own styling, with a Continue with Google
// button that kicks off the OAuth flow.
export default function Landing() {
  return (
    <div className="flex min-h-screen items-center justify-center px-[clamp(14px,5vw,44px)] py-16">
      <div className="w-full max-w-[560px] text-center">
        <p className="font-display text-[13px] uppercase tracking-[0.18em] text-terra">
          Apartment Hunt Helper
        </p>
        <h1 className="font-display mt-3 text-[clamp(34px,6vw,52px)] font-semibold leading-[1.05] tracking-[-0.02em]">
          Hunt smarter, <em className="text-terra italic">together</em>.
        </h1>
        <p className="mx-auto mt-4 max-w-[44ch] text-[16px] text-ink-soft">
          Track every apartment lead, the commute to the places that matter, who to contact, and your
          visit notes. Plan your in-person visits, and invite family to follow along.
        </p>

        <div className="mt-8 flex flex-col items-center gap-3">
          <button className="btn btn-primary flex items-center gap-2 px-6 py-3 text-[15px]" onClick={signInWithGoogle}>
            <GoogleMark />
            Continue with Google
          </button>
          <p className="hint max-w-[40ch]">
            We use Google only to sign you in. No password to remember.
          </p>
        </div>

        <div className="mx-auto mt-10 grid max-w-[460px] grid-cols-1 gap-3 text-left sm:grid-cols-3">
          <Feature title="Leads" body="One place for rent, commute, contacts, notes, and photos." />
          <Feature title="Visits" body="Confirm visits and auto-build an efficient schedule." />
          <Feature title="Together" body="Invite family to view and add to a hunt." />
        </div>
      </div>
    </div>
  )
}

function Feature({ title, body }) {
  return (
    <div className="card p-4">
      <div className="font-display font-semibold">{title}</div>
      <div className="hint mt-1">{body}</div>
    </div>
  )
}

function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path
        fill="#FFF"
        d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.92a8.78 8.78 0 0 0 2.68-6.62z"
        opacity=".9"
      />
      <path
        fill="#FFF"
        d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.92-2.26c-.8.54-1.84.86-3.04.86-2.34 0-4.32-1.58-5.02-3.7H.96v2.34A9 9 0 0 0 9 18z"
        opacity=".75"
      />
      <path
        fill="#FFF"
        d="M3.98 10.72a5.4 5.4 0 0 1 0-3.44V4.94H.96a9 9 0 0 0 0 8.12l3.02-2.34z"
        opacity=".55"
      />
      <path
        fill="#FFF"
        d="M9 3.58c1.32 0 2.5.46 3.44 1.35l2.58-2.58A8.99 8.99 0 0 0 .96 4.94l3.02 2.34C4.68 5.16 6.66 3.58 9 3.58z"
        opacity=".9"
      />
    </svg>
  )
}
