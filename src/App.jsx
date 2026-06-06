import { useCallback, useEffect, useMemo, useState } from 'react'
import { useHashRoute, navigate } from './hooks/useHashRoute.js'
import { loadPrefs } from './lib/prefs.js'
import {
  all,
  upsert,
  remove,
  getMode,
  setMode,
  cloudAvailable,
  pushLocalToCloud,
  newId,
} from './lib/store.js'
import { getUser, onAuthChange, signInWithGoogle, signOut, attributionFor } from './lib/auth.js'
import { mapsUrl } from './lib/commute.js'
import { exportListings } from './lib/excel.js'
import Header from './components/Header.jsx'
import Onboarding from './components/Onboarding.jsx'
import ListingsTable from './components/ListingsTable.jsx'
import ListingForm from './components/ListingForm.jsx'
import ListingDetail from './components/ListingDetail.jsx'

export default function App() {
  const route = useHashRoute()
  const [prefs, setPrefs] = useState(null)
  const [listings, setListings] = useState([])
  const [user, setUser] = useState(null)
  const [mode, setModeState] = useState(getMode())
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const cloud = cloudAvailable()

  const refresh = useCallback(async () => {
    try {
      const rows = await all()
      setListings(rows)
      setError('')
    } catch (e) {
      setError(e.message || 'Could not load listings')
    }
  }, [])

  // Initial load: prefs, listings, and the signed-in user.
  useEffect(() => {
    ;(async () => {
      setLoading(true)
      const p = await loadPrefs()
      setPrefs(p)
      await refresh()
      if (cloud) setUser(await getUser())
      setLoading(false)
    })()
  }, [cloud, refresh])

  // React to sign-in / sign-out (including the redirect back from Google).
  useEffect(() => {
    if (!cloud) return
    return onAuthChange(async (u) => {
      setUser(u)
      await refresh()
    })
  }, [cloud, refresh])

  const canEdit = mode === 'local' || (mode === 'remote' && !!user)

  const stats = useMemo(
    () => ({
      total: listings.length,
      visits: listings.filter((l) => l.status === 'Visit scheduled' || l.visit).length,
      liked: listings.filter((l) => l.status === 'Interested').length,
    }),
    [listings],
  )

  const saveListing = useCallback(
    async (record) => {
      const attribution = mode === 'remote' ? attributionFor(user, prefs?.ownerName) : { added_by: prefs?.ownerName || '' }
      await upsert({ ...record, ...attribution })
      await refresh()
      navigate('list')
    },
    [mode, user, prefs, refresh],
  )

  const deleteListing = useCallback(
    async (l) => {
      if (!window.confirm(`Delete ${l.address || 'this listing'}?`)) return
      await remove(l.id)
      await refresh()
    },
    [refresh],
  )

  const addSample = useCallback(async () => {
    const area = prefs?.closeTo?.[0]
    const address = '88 Morgan St, Apt 12C, Jersey City, NJ 07302'
    const sample = {
      id: newId(),
      status: 'Visit scheduled',
      location: prefs?.searchAreas?.[0] || 'Jersey City',
      type: '1BR apt',
      address,
      rent: '2650',
      visit: '',
      contact_name: 'Sample Broker',
      contact_number: '+1 555 0100',
      contact_method: 'WhatsApp',
      rating: '',
      notes: 'Example row. Edit or delete me. Asked about broker fee and move-in date.',
      media: [],
      commutes: (prefs?.closeTo || []).map((a) => ({
        areaId: a.id,
        label: a.label,
        address: a.address,
        mode: prefs.defaultMode,
        time: '',
        distance: '',
        mapsUrl: mapsUrl(address, a.address, prefs.defaultMode),
      })),
      added_by: prefs?.ownerName || '',
    }
    await saveListing(sample)
  }, [prefs, saveListing])

  const exportXlsx = useCallback(async () => {
    try {
      await exportListings(listings, prefs, mode === 'remote')
    } catch (e) {
      setError(e.message || 'Export failed')
    }
  }, [listings, prefs, mode])

  // Cloud controls.
  const goRemote = useCallback(async () => {
    if (!cloud) return
    if (!user) {
      // Writing requires a signed-in user. Sign in, then they tap the button again.
      await signInWithGoogle()
      return
    }
    setBusy(true)
    try {
      setMode('remote')
      setModeState('remote')
      await pushLocalToCloud(attributionFor(user, prefs?.ownerName))
      const url = new URL(window.location.href)
      url.searchParams.set('cloud', '1')
      window.history.replaceState(null, '', url.toString())
      await refresh()
    } catch (e) {
      setError(e.message || 'Could not switch to cloud')
      setMode('local')
      setModeState('local')
    } finally {
      setBusy(false)
    }
  }, [cloud, user, prefs, refresh])

  const goLocal = useCallback(async () => {
    setMode('local')
    setModeState('local')
    const url = new URL(window.location.href)
    url.searchParams.delete('cloud')
    window.history.replaceState(null, '', url.toString())
    await refresh()
  }, [refresh])

  const share = useCallback(async () => {
    const url = new URL(window.location.href)
    url.searchParams.set('cloud', '1')
    url.hash = ''
    const link = url.toString()
    try {
      await navigator.clipboard.writeText(link)
      window.alert('Share link copied:\n\n' + link)
    } catch {
      window.prompt('Copy this link to share:', link)
    }
  }, [])

  if (loading || !prefs) {
    return <div className="px-[clamp(14px,4vw,44px)] pt-12 text-ink-soft">Loading...</div>
  }

  // First run, or re-running setup from the Settings route.
  if (!prefs.setupComplete || route.name === 'settings') {
    return (
      <Onboarding
        initial={prefs}
        onComplete={(p) => {
          setPrefs(p)
          navigate('list')
        }}
      />
    )
  }

  const byId = (id) => listings.find((l) => l.id === id)

  return (
    <div className="min-h-screen px-[clamp(14px,4vw,44px)] pt-7 pb-16">
      <Header
        stats={stats}
        cloudAvailable={cloud}
        mode={mode}
        user={user}
        busy={busy}
        onGoRemote={goRemote}
        onGoLocal={goLocal}
        onShare={share}
        onSignIn={signInWithGoogle}
        onSignOut={signOut}
      />

      {error && (
        <div
          className="mt-4 rounded-xl border border-line px-4 py-2 text-[13.5px]"
          style={{ background: 'var(--color-terra-soft)', color: 'var(--color-terra)' }}
        >
          {error}
        </div>
      )}

      {mode === 'remote' && !user && (
        <div className="mt-4 rounded-xl border border-line bg-paper-2 px-4 py-2 text-[13.5px] text-ink-soft">
          You are viewing the shared listings. Sign in to add or edit.
        </div>
      )}

      <main>
        {route.name === 'list' && (
          <ListingsTable
            listings={listings}
            canEdit={canEdit}
            onDelete={deleteListing}
            onExport={exportXlsx}
            onAddSample={addSample}
          />
        )}

        {route.name === 'add' &&
          (canEdit ? (
            <ListingForm prefs={prefs} onSave={saveListing} onCancel={() => navigate('list')} />
          ) : (
            <SignInGate />
          ))}

        {route.name === 'edit' &&
          (canEdit ? (
            <ListingForm
              prefs={prefs}
              listing={byId(route.id)}
              onSave={saveListing}
              onCancel={() => navigate('list')}
            />
          ) : (
            <SignInGate />
          ))}

        {route.name === 'detail' && <ListingDetail listing={byId(route.id)} canEdit={canEdit} />}
      </main>

      <footer className="mt-10 flex flex-wrap gap-3 border-t border-line pt-4 text-[12.5px] text-ink-soft">
        <a href="#settings" className="link-chip no-underline">
          Edit setup
        </a>
        <span>
          Tip: for transit, open the Maps link, pick your exact route, and type the time you see.
        </span>
      </footer>
    </div>
  )
}

function SignInGate() {
  return (
    <div className="card mt-6 p-8 text-center">
      <h3 className="font-display m-0 mb-1.5 text-[20px]">Sign in to add or edit</h3>
      <p className="muted">Viewing is open to everyone. Editing needs a quick Google sign-in.</p>
      <button className="btn btn-teal mt-4" onClick={signInWithGoogle}>
        Sign in with Google
      </button>
    </div>
  )
}
