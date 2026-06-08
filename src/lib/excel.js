// SheetJS is loaded on demand (only when exporting) to keep the main bundle small.

// Where the media cell deep links point. Configurable so links work once hosted;
// falls back to the current page.
function siteBase() {
  let base = import.meta.env.VITE_SITE_URL || window.location.origin + window.location.pathname
  return base.replace(/[#?].*$/, '')
}

export async function exportListings(listings, prefs, huntId) {
  const XLSX = await import('xlsx')
  const areas = (prefs && prefs.closeTo) || []

  const headers = ['Status', 'Address', 'Type / Beds', 'Rent ($/mo)', 'Location', 'Visit']
  areas.forEach((a) => headers.push((a.label || 'Area') + ' commute'))
  headers.push('Contact Name', 'Contact Number', 'Contact Method', 'Photos / Videos', 'Rating', 'Notes')

  const aoa = [headers]
  listings.forEach((l) => {
    const row = [
      l.status || '',
      l.address || '',
      l.type || '',
      l.rent ? Number(l.rent) : '',
      l.location || '',
      l.visit ? new Date(l.visit).toLocaleString() : '',
    ]
    areas.forEach((a) => {
      const c = (l.commutes || []).find((x) => x.areaId === a.id)
      row.push(c ? [c.time, c.distance].filter(Boolean).join(', ') || 'Open route' : '')
    })
    row.push(
      l.contact_name || '',
      l.contact_number || '',
      l.contact_method || '',
      l.media && l.media.length ? `${l.media.length} item(s)` : '',
      l.rating ? '★'.repeat(Number(l.rating)) : '',
      l.notes || '',
    )
    aoa.push(row)
  })

  const ws = XLSX.utils.aoa_to_sheet(aoa)
  ws['!cols'] = headers.map((h, i) => ({ wch: i === 1 ? 34 : i === headers.length - 1 ? 44 : 16 }))

  const base = siteBase()
  const areaStart = 6
  const mediaCol = areaStart + areas.length + 3

  listings.forEach((l, ri) => {
    const r = ri + 1
    // Per-area commute cells link to the Google Maps route.
    areas.forEach((a, ai) => {
      const c = (l.commutes || []).find((x) => x.areaId === a.id)
      if (c && c.mapsUrl) {
        const ref = XLSX.utils.encode_cell({ r, c: areaStart + ai })
        if (!ws[ref]) ws[ref] = { t: 's', v: 'Open route' }
        ws[ref].l = { Target: c.mapsUrl, Tooltip: 'Maps route' }
      }
    })
    // Media cell links back to the listing's detail page on the live site.
    if (l.media && l.media.length) {
      const ref = XLSX.utils.encode_cell({ r, c: mediaCol })
      ws[ref] = {
        t: 's',
        v: `${l.media.length} item(s)`,
        l: { Target: base + '#hunt=' + huntId + '/id=' + l.id, Tooltip: 'Open the listing page' },
      }
    }
  })

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Apartment Visits')
  XLSX.writeFile(wb, 'Apartment_Visits.xlsx')
}
