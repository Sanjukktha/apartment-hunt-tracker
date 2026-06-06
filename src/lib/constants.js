// Shared option lists and styling maps used across the views.

export const STATUSES = [
  'To contact',
  'Contacted',
  'Visit scheduled',
  'Visited',
  'Interested',
  'Passed',
]

export const CONTACT_METHODS = [
  'WhatsApp',
  'iMessage',
  'Call / Text',
  'Facebook Marketplace',
  'StreetEasy',
  'Zillow',
  'Apartments.com',
  'Email',
  'Other',
]

// [background, text] per status, matching the prototype pills.
export const STATUS_COLORS = {
  'To contact': ['#f3ebe0', '#6b6157'],
  Contacted: ['#d8e7e5', '#2f6d68'],
  'Visit scheduled': ['#fde9c8', '#9a6b00'],
  Visited: ['#e0e7f0', '#3a5a82'],
  Interested: ['#d6efd6', '#2e7d32'],
  Passed: ['#f0d9d1', '#a83920'],
}

export const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov', '.m4v', '.ogg']

export function mediaKind(url) {
  const u = (url || '').toLowerCase().split('?')[0]
  return VIDEO_EXTENSIONS.some((ext) => u.endsWith(ext)) ? 'video' : 'image'
}
