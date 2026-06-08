import { navigate } from '../hooks/useHashRoute.js'
import { isPrefsComplete } from '../lib/prefs.js'
import Onboarding from './Onboarding.jsx'
import ListingsTable from './ListingsTable.jsx'
import ListingForm from './ListingForm.jsx'
import ListingDetail from './ListingDetail.jsx'
import Visitations from './Visitations.jsx'
import Members from './Members.jsx'

// One hunt's world: the Leads and Visitations tabs plus setup, detail, and the
// members panel. All listing links are scoped under #hunt=<id>.
export default function HuntView({
  hunt,
  listings,
  view,
  listingId,
  isOwner,
  members,
  memberCount,
  busy,
  onSaveListing,
  onDeleteListing,
  onAddSample,
  onExport,
  onSavePrefs,
  onInvite,
  onRemoveMember,
  onRenameHunt,
  onDeleteHunt,
}) {
  const prefs = hunt.prefs || {}
  const base = 'hunt=' + hunt.id
  const byId = (id) => listings.find((l) => l.id === id)
  const needsSetup = !isPrefsComplete(prefs)

  // Force setup until the hunt has its search areas and target places.
  if (view === 'setup' || needsSetup) {
    return (
      <Onboarding
        initial={prefs}
        huntName={hunt.name}
        busy={busy}
        onComplete={onSavePrefs}
        onCancel={needsSetup ? null : () => navigate(base)}
      />
    )
  }

  function rename() {
    const next = window.prompt('Rename this hunt', hunt.name)
    if (next && next.trim()) onRenameHunt(next.trim())
  }

  function remove() {
    if (window.confirm(`Delete "${hunt.name}" and all its listings? This cannot be undone.`)) {
      onDeleteHunt()
    }
  }

  return (
    <div className="mt-5">
      <div className="flex flex-wrap items-center gap-2">
        <h1 className="font-display m-0 mr-2 text-[24px] font-semibold">{hunt.name}</h1>
        <Tab href={`#${base}`} active={view === 'leads' || view === 'add' || view === 'edit' || view === 'detail'}>
          Leads
        </Tab>
        <Tab href={`#${base}/visits`} active={view === 'visits'}>
          Visitations
        </Tab>
        <span className="flex-1" />
        <a href={`#${base}/members`} className="btn btn-ghost no-underline">
          Members{memberCount ? ` (${memberCount})` : ''}
        </a>
        <a href={`#${base}/setup`} className="btn btn-ghost no-underline">
          Edit setup
        </a>
        {isOwner && (
          <>
            <button className="btn btn-ghost" onClick={rename}>
              Rename
            </button>
            <button className="btn btn-ghost" onClick={remove}>
              Delete
            </button>
          </>
        )}
      </div>

      <div className="mt-1">
        {view === 'add' && (
          <ListingForm prefs={prefs} onSave={onSaveListing} onCancel={() => navigate(base)} />
        )}

        {view === 'edit' && (
          <ListingForm
            prefs={prefs}
            listing={byId(listingId)}
            onSave={onSaveListing}
            onCancel={() => navigate(base)}
          />
        )}

        {view === 'detail' && <ListingDetail listing={byId(listingId)} canEdit base={base} />}

        {view === 'members' && (
          <Members
            members={members}
            isOwner={isOwner}
            onInvite={onInvite}
            onRemove={onRemoveMember}
            busy={busy}
          />
        )}

        {view === 'visits' && <Visitations listings={listings} base={base} />}

        {view === 'leads' && (
          <ListingsTable
            listings={listings}
            canEdit
            onDelete={onDeleteListing}
            onExport={onExport}
            onAddSample={onAddSample}
            base={base}
          />
        )}
      </div>
    </div>
  )
}

function Tab({ href, active, children }) {
  return (
    <a
      href={href}
      className="pill no-underline"
      style={
        active
          ? { background: 'var(--color-terra)', color: '#fff' }
          : { background: 'var(--color-paper-2)', color: 'var(--color-ink-soft)' }
      }
    >
      {children}
    </a>
  )
}
