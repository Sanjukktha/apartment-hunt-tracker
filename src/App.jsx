import { useCallback, useEffect, useState } from 'react'
import { useHashRoute, navigate } from './hooks/useHashRoute.js'
import {
  cloudAvailable,
  listHunts,
  createHunt,
  updateHunt,
  deleteHunt,
  listListings,
  upsertListing,
  removeListing,
  listMembers,
  inviteMember,
  removeMember,
  allListingsLite,
  newId,
} from './lib/store.js'
import { getUser, onAuthChange, signOut, attributionFor } from './lib/auth.js'
import { mapsUrl } from './lib/commute.js'
import { exportListings } from './lib/excel.js'
import TopBar from './components/TopBar.jsx'
import Dashboard from './components/Dashboard.jsx'
import HuntView from './components/HuntView.jsx'

function buildSummary(hunts, lite) {
  const sum = {}
  for (const h of hunts) sum[h.id] = { leads: 0, confirmed: 0 }
  for (const l of lite) {
    if (!sum[l.hunt_id]) continue
    sum[l.hunt_id].leads += 1
    if (l.visit_confirmed) sum[l.hunt_id].confirmed += 1
  }
  return sum
}

export default function App() {
  const route = useHashRoute()
  const cloud = cloudAvailable()

  const [user, setUser] = useState(null)
  const [authReady, setAuthReady] = useState(!cloud)
  const [hunts, setHunts] = useState([])
  const [summary, setSummary] = useState({})
  const [listings, setListings] = useState([])
  const [members, setMembers] = useState([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  // Open mode: no sign-in required. The app is always usable; the publishable
  // key plus relaxed table policies let anyone with the link read and write.
  const signedIn = true

  // Auth: current user plus live updates (including the redirect back from Google).
  useEffect(() => {
    if (!cloud) {
      setAuthReady(true)
      return
    }
    let unsub
    ;(async () => {
      setUser(await getUser())
      setAuthReady(true)
      unsub = onAuthChange((u) => setUser(u))
    })()
    return () => unsub && unsub()
  }, [cloud])

  const loadHunts = useCallback(async () => {
    if (!signedIn) {
      setHunts([])
      setSummary({})
      return
    }
    const [hs, lite] = await Promise.all([listHunts(), allListingsLite()])
    setHunts(hs)
    setSummary(buildSummary(hs, lite))
  }, [signedIn])

  useEffect(() => {
    if (!authReady) return
    let cancel = false
    ;(async () => {
      setLoading(true)
      try {
        await loadHunts()
      } catch (e) {
        if (!cancel) setError(e.message || 'Could not load your hunts')
      } finally {
        if (!cancel) setLoading(false)
      }
    })()
    return () => {
      cancel = true
    }
  }, [authReady, loadHunts])

  const currentHunt = route.name === 'hunt' ? hunts.find((h) => h.id === route.huntId) : null

  const loadHuntData = useCallback(async (huntId) => {
    const [ls, ms] = await Promise.all([listListings(huntId), listMembers(huntId)])
    setListings(ls)
    setMembers(ms)
  }, [])

  useEffect(() => {
    if (route.name === 'hunt' && route.huntId && signedIn) {
      loadHuntData(route.huntId).catch((e) => setError(e.message || 'Could not load this hunt'))
    }
  }, [route.name, route.huntId, signedIn, loadHuntData])

  const isOwner = !!currentHunt

  // ---- handlers ----

  const handleCreateHunt = useCallback(
    async (name) => {
      setBusy(true)
      try {
        const h = await createHunt({ name, prefs: {} })
        await loadHunts()
        navigate('hunt=' + h.id + '/setup')
      } catch (e) {
        setError(e.message || 'Could not create the hunt')
      } finally {
        setBusy(false)
      }
    },
    [loadHunts],
  )

  const handleSavePrefs = useCallback(
    async (prefs) => {
      if (!currentHunt) return
      setBusy(true)
      try {
        const h = await updateHunt(currentHunt.id, { prefs })
        setHunts((hs) => hs.map((x) => (x.id === h.id ? h : x)))
        navigate('hunt=' + currentHunt.id)
      } catch (e) {
        setError(e.message || 'Could not save setup')
      } finally {
        setBusy(false)
      }
    },
    [currentHunt],
  )

  const handleSaveListing = useCallback(
    async (record) => {
      if (!currentHunt) return
      setBusy(true)
      try {
        const attribution = attributionFor(user, 'You')
        await upsertListing({ ...record, hunt_id: currentHunt.id, ...attribution })
        await Promise.all([loadHuntData(currentHunt.id), loadHunts()])
        navigate('hunt=' + currentHunt.id)
      } catch (e) {
        setError(e.message || 'Could not save the listing')
      } finally {
        setBusy(false)
      }
    },
    [currentHunt, user, loadHuntData, loadHunts],
  )

  const handleDeleteListing = useCallback(
    async (l) => {
      if (!currentHunt) return
      if (!window.confirm(`Delete ${l.address || 'this listing'}?`)) return
      try {
        await removeListing(l.id)
        await Promise.all([loadHuntData(currentHunt.id), loadHunts()])
      } catch (e) {
        setError(e.message || 'Could not delete')
      }
    },
    [currentHunt, loadHuntData, loadHunts],
  )

  const handleAddSample = useCallback(async () => {
    if (!currentHunt) return
    const prefs = currentHunt.prefs || {}
    const address = '88 Morgan St, Apt 12C, Jersey City, NJ 07302'
    const sample = {
      id: newId(),
      status: 'Visit scheduled',
      location: prefs.searchAreas?.[0] || 'Jersey City',
      type: '1BR apt',
      address,
      rent: 2650,
      visit: '',
      visit_confirmed: false,
      visit_timing_type: 'fixed',
      visit_window_start: '',
      visit_window_end: '',
      rating: null,
      notes: 'Example row. Edit or delete me.',
      media: [],
      commutes: (prefs.closeTo || []).map((a) => ({
        areaId: a.id,
        label: a.label,
        address: a.address,
        mode: prefs.defaultMode,
        time: '',
        distance: '',
        mapsUrl: mapsUrl(address, a.address, prefs.defaultMode),
      })),
    }
    await handleSaveListing(sample)
  }, [currentHunt, handleSaveListing])

  const handleExport = useCallback(async () => {
    if (!currentHunt) return
    try {
      await exportListings(listings, currentHunt.prefs, currentHunt.id)
    } catch (e) {
      setError(e.message || 'Export failed')
    }
  }, [currentHunt, listings])

  const handleInvite = useCallback(
    async (email) => {
      if (!currentHunt) return
      await inviteMember(currentHunt.id, email)
      setMembers(await listMembers(currentHunt.id))
    },
    [currentHunt],
  )

  const handleRemoveMember = useCallback(
    async (memberId) => {
      if (!currentHunt) return
      await removeMember(memberId)
      setMembers(await listMembers(currentHunt.id))
    },
    [currentHunt],
  )

  const handleRenameHunt = useCallback(
    async (name) => {
      if (!currentHunt) return
      const h = await updateHunt(currentHunt.id, { name })
      setHunts((hs) => hs.map((x) => (x.id === h.id ? h : x)))
    },
    [currentHunt],
  )

  const handleDeleteHunt = useCallback(async () => {
    if (!currentHunt) return
    setBusy(true)
    try {
      await deleteHunt(currentHunt.id)
      await loadHunts()
      navigate('dashboard')
    } catch (e) {
      setError(e.message || 'Could not delete the hunt')
    } finally {
      setBusy(false)
    }
  }, [currentHunt, loadHunts])

  const handleSignOut = useCallback(async () => {
    await signOut()
    setUser(null)
    navigate('dashboard')
  }, [])

  // ---- render ----

  if (cloud && !authReady) {
    return <div className="px-[clamp(14px,4vw,44px)] pt-12 text-ink-soft">Loading...</div>
  }

  return (
    <div className="min-h-screen px-[clamp(14px,4vw,44px)] pt-6 pb-16">
      <TopBar
        user={user}
        cloudAvailable={cloud}
        crumb={currentHunt ? currentHunt.name : null}
        onSignOut={handleSignOut}
      />

      {error && (
        <div
          className="mt-4 rounded-xl border border-line px-4 py-2 text-[13.5px]"
          style={{ background: 'var(--color-terra-soft)', color: 'var(--color-terra)' }}
        >
          {error}
        </div>
      )}

      {route.name === 'dashboard' && (
        <Dashboard hunts={hunts} summary={summary} onCreateHunt={handleCreateHunt} busy={busy} />
      )}

      {route.name === 'hunt' &&
        (currentHunt ? (
          <HuntView
            hunt={currentHunt}
            listings={listings}
            view={route.view}
            listingId={route.listingId}
            isOwner={isOwner}
            members={members}
            memberCount={members.length}
            busy={busy}
            onSaveListing={handleSaveListing}
            onDeleteListing={handleDeleteListing}
            onAddSample={handleAddSample}
            onExport={handleExport}
            onSavePrefs={handleSavePrefs}
            onInvite={handleInvite}
            onRemoveMember={handleRemoveMember}
            onRenameHunt={handleRenameHunt}
            onDeleteHunt={handleDeleteHunt}
          />
        ) : loading ? (
          <div className="mt-10 text-ink-soft">Loading...</div>
        ) : (
          <div className="card mt-6 p-8 text-center">
            <h3 className="font-display m-0 mb-1.5 text-[20px]">Hunt not found</h3>
            <p className="muted">It may have been deleted, or you do not have access.</p>
            <a href="#dashboard" className="btn btn-ghost mt-4 inline-block no-underline">
              Back to dashboard
            </a>
          </div>
        ))}
    </div>
  )
}
