// Lightweight site-wide gate (NOT real security). The app talks to Supabase with
// a public key (open mode, no logins), so this only deters casual visitors from
// adding/editing/generating: anyone who picks "view only" gets a read-only app,
// and editing needs a shared access code. A determined person with dev tools can
// still bypass it; true protection would require server-side auth.
//
// The code is read from VITE_ACCESS_CODE so the literal never lives in committed
// source. When it is blank the gate is disabled and the app is fully open (the
// previous behavior).

const LS_KEY = 'apt_access_role'

export const ACCESS_CODE = (import.meta.env.VITE_ACCESS_CODE || '').trim()

// Whether the gate is active at all.
export function gateEnabled() {
  return ACCESS_CODE.length > 0
}

// '' (not chosen yet), 'editor' (entered the code), or 'viewer' (view only).
export function getRole() {
  try {
    return localStorage.getItem(LS_KEY) || ''
  } catch {
    return ''
  }
}

export function setRole(role) {
  try {
    localStorage.setItem(LS_KEY, role)
  } catch {
    // ignore
  }
}

export function clearRole() {
  try {
    localStorage.removeItem(LS_KEY)
  } catch {
    // ignore
  }
}
