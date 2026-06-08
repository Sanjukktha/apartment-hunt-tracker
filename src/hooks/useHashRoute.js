import { useEffect, useState } from 'react'

// Hash routing keeps the app working on static hosting and makes deep links
// possible. Routes: #list (default), #add, #edit=<id>, #id=<id> (detail),
// #settings. The #id form is what the Excel export points back to.
export function parseHash(hash) {
  const h = (hash || '').replace(/^#/, '')
  if (!h || h === 'list') return { name: 'list' }
  if (h === 'add') return { name: 'add' }
  if (h === 'visits') return { name: 'visits' }
  if (h === 'settings') return { name: 'settings' }
  const edit = h.match(/^edit=(.+)$/)
  if (edit) return { name: 'edit', id: decodeURIComponent(edit[1]) }
  const detail = h.match(/^id=(.+)$/)
  if (detail) return { name: 'detail', id: decodeURIComponent(detail[1]) }
  return { name: 'list' }
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
