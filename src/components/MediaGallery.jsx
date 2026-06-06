// Renders listing media from links: images in a grid, videos with a player.
export default function MediaGallery({ media }) {
  const items = Array.isArray(media) ? media : []
  if (!items.length) return <p className="muted">No photos or videos yet.</p>

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((m, i) =>
        m.kind === 'video' ? (
          <video
            key={i}
            controls
            className="w-full rounded-xl border border-line bg-black"
            src={m.url}
          />
        ) : (
          <a
            key={i}
            href={m.url}
            target="_blank"
            rel="noopener"
            className="block overflow-hidden rounded-xl border border-line"
          >
            <img
              src={m.url}
              alt={`Listing media ${i + 1}`}
              loading="lazy"
              className="h-44 w-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none'
                e.currentTarget.parentElement.classList.add('p-4')
                e.currentTarget.parentElement.append(
                  Object.assign(document.createElement('span'), {
                    className: 'hint',
                    textContent: 'Could not load this image. Open the link.',
                  }),
                )
              }}
            />
          </a>
        ),
      )}
    </div>
  )
}
