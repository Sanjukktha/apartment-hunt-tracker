import { useEffect, useState } from 'react'

// Hash routing (v2). Routes:
//   #dashboard (default)
//   #hunt=<id>            leads tab
//   #hunt=<id>/visits     visitations tab
//   #hunt=<id>/schedules  saved schedules tab
//   #hunt=<id>/schedules/id=<sid>  one saved schedule
//   #hunt=<id>/add        new listing
//   #hunt=<id>/edit=<lid> edit listing
//   #hunt=<id>/id=<lid>   listing detail (Excel deep links point here)
//   #hunt=<id>/setup      edit this hunt's setup
//   #hunt=<id>/members    collaborators
export function parseHash(hash) {
  const h = (hash || '').replace(/^#/, '')
  if (!h || h === 'dashboard') return { name: 'dashboard' }

  const hunt = h.match(/^hunt=([^/]+)(?:\/(.*))?$/)
  if (hunt) {
    const huntId = decodeURIComponent(hunt[1])
    const rest = hunt[2] || ''
    if (!rest || rest === 'leads') return { name: 'hunt', huntId, view: 'leads' }
    if (rest === 'visits') return { name: 'hunt', huntId, view: 'visits' }
    if (rest === 'schedules') return { name: 'hunt', huntId, view: 'schedules' }
    const sched = rest.match(/^schedules\/id=(.+)$/)
    if (sched) return { name: 'hunt', huntId, view: 'schedule', scheduleId: decodeURIComponent(sched[1]) }
    if (rest === 'add') return { name: 'hunt', huntId, view: 'add' }
    if (rest === 'setup') return { name: 'hunt', huntId, view: 'setup' }
    if (rest === 'members') return { name: 'hunt', huntId, view: 'members' }
    if (rest === 'trash') return { name: 'hunt', huntId, view: 'trash' }
    const edit = rest.match(/^edit=(.+)$/)
    if (edit) return { name: 'hunt', huntId, view: 'edit', listingId: decodeURIComponent(edit[1]) }
    const detail = rest.match(/^id=(.+)$/)
    if (detail) return { name: 'hunt', huntId, view: 'detail', listingId: decodeURIComponent(detail[1]) }
    return { name: 'hunt', huntId, view: 'leads' }
  }

  return { name: 'dashboard' }
}

export function navigate(route) {
  window.location.hash = route
}

export function useHashRoute() {
  const [route, setRoute] = useState(() => parseHash(window.location.hash))
  useEffect(() => {
    const onChange = () => setRoute(parseHash(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return route
}
