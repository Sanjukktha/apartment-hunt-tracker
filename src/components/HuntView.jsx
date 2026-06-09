import { navigate } from '../hooks/useHashRoute.js'
import { isPrefsComplete } from '../lib/prefs.js'
import Onboarding from './Onboarding.jsx'
import ListingsTable from './ListingsTable.jsx'
import ListingForm from './ListingForm.jsx'
import ListingDetail from './ListingDetail.jsx'
import Visitations from './Visitations.jsx'
import Schedules from './Schedules.jsx'
import Members from './Members.jsx'

// One hunt's world: the Leads and Visitations tabs plus setup, detail, and the
// members panel. All listing links are scoped under #hunt=<id>.
export default function HuntView({
  hunt,
  listings,
  deleted = [],
  view,
  listingId,
  scheduleId,
  schedules = [],
  isOwner,
  members,
  memberCount,
  busy,
  onSaveListing,
  onDeleteListing,
  onStrikeListing,
  onRestoreListing,
  onPurgeListing,
  onAddSample,
  onExport,
  onSavePrefs,
  onInvite,
  onRemoveMember,
  onRenameHunt,
  onDeleteHunt,
  onSaveSchedule,
  onUpdateSchedule,
  onDeleteSchedule,
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
    if (
      window.confirm(
        `Move "${hunt.name}" and all its listings to Trash? You can restore it from the dashboard.`,
      )
    ) {
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
        <Tab href={`#${base}/schedules`} active={view === 'schedules' || view === 'schedule'}>
          Schedules
        </Tab>
        <span className="flex-1" />
        <a href={`#${base}/trash`} className="btn btn-ghost no-underline">
          Trash{deleted.length ? ` (${deleted.length})` : ''}
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

        {view === 'visits' && (
          <Visitations listings={listings} base={base} onSaveSchedule={onSaveSchedule} />
        )}

        {(view === 'schedules' || view === 'schedule') && (
          <Schedules
            schedules={schedules}
            base={base}
            scheduleId={view === 'schedule' ? scheduleId : null}
            onUpdate={onUpdateSchedule}
            onDelete={onDeleteSchedule}
          />
        )}

        {view === 'trash' && (
          <Trash deleted={deleted} base={base} onRestore={onRestoreListing} onPurge={onPurgeListing} />
        )}

        {view === 'leads' && (
          <ListingsTable
            listings={listings}
            canEdit
            onDelete={onDeleteListing}
            onStrike={onStrikeListing}
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

function Trash({ deleted, base, onRestore, onPurge }) {
  if (!deleted.length) {
    return (
      <div className="card mt-5 p-8 text-center">
        <h3 className="font-display m-0 mb-1.5 text-[19px]">Trash is empty</h3>
        <p className="muted">Deleted listings show up here and can be restored.</p>
        <a href={`#${base}`} className="btn btn-ghost mt-4 inline-block no-underline">
          Back to listings
        </a>
      </div>
    )
  }
  return (
    <div className="mt-5">
      <p className="hint mb-3">
        Deleted listings. Restore brings one back to your list. Delete permanently cannot be undone.
      </p>
      <div className="flex flex-col gap-2">
        {deleted.map((l) => (
          <div key={l.id} className="card flex flex-wrap items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{l.address || l.location || 'Untitled'}</div>
              <div className="hint">{[l.type, l.location].filter(Boolean).join(' · ')}</div>
            </div>
            <button className="btn btn-teal" onClick={() => onRestore(l)}>
              Restore
            </button>
            <button className="btn btn-ghost" onClick={() => onPurge(l)}>
              Delete permanently
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
