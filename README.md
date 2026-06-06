# Apartment Hunt

A small web app for tracking apartment and townhouse visits during a housing search. It keeps each lead in one place: the address, the rent, the commute to the places you care about, who to contact, your notes after talking to them, and photos or videos. It works offline by default, and you can flip on a shared cloud mode to let family or roommates see the same list and add to it.

I built it for my own move and then generalized it so anyone can use it for any city.

## What it does

- **One table for every lead.** Status pipeline (To contact, Contacted, Visit scheduled, Visited, Interested, Passed), rent, type, location, visit date, contact, rating, notes, and media. Sort and filter.
- **Commute links, built for you.** During setup you list up to three places you want to be close to (an office, a partner's work, a gym). Every listing then gets a one-click Google Maps directions link from the apartment to each place, with the travel mode pre-filled. No Google API and no cost: it is just a deep link into Maps.
- **Auto distance and time.** For drive, walk, and cycle, the app fills in the distance and time using OpenRouteService (free, no credit card). Public transit is not auto-filled (OpenRouteService has no transit engine), so for transit you open the Maps link, see the exact route, and type the time in. The link is still built for you.
- **Photos and videos by link.** Paste a link (Google Drive, Google Photos, Imgur, the listing page). The detail page shows images in a gallery and plays videos. Links keep storage free.
- **Excel export.** One click produces an .xlsx. The commute cells link to the Maps routes, and the media cell links back to that listing's page on the live site, since a spreadsheet cannot hold real images.
- **Local first, share when ready.** With no setup it runs entirely in your browser (localStorage). Add Supabase keys and you can flip a switch to go remote, which copies your local listings up and gives you a link to share. Viewing the shared link is open to anyone; adding or editing requires a quick Google sign-in.

## Tech

- Frontend: React, Vite, Tailwind CSS v4.
- Backend: a Vercel serverless function that proxies OpenRouteService so the routing key stays server-side.
- Data and auth: Supabase (Postgres with row level security, Google sign-in).
- Export: SheetJS, loaded on demand.

## Run it locally

```bash
npm install
npm run dev
```

Open the printed URL. With no `.env` it runs in local-only mode, which is enough to use the whole app except cloud sharing and auto-fill.

To enable auto-fill and sharing locally, copy `.env.example` to `.env` and fill in the values below.

## Configuration

All configuration is environment variables. See `.env.example`.

| Variable | Where it is used | Notes |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | browser | Supabase project URL. Enables cloud mode. |
| `VITE_SUPABASE_ANON_KEY` | browser | Supabase anon key. Public by design; row level security controls access. |
| `VITE_SITE_URL` | browser | Public site URL for the Excel deep links. Falls back to the current page. |
| `ORS_API_KEY` | server only | OpenRouteService key. Never exposed to the browser. |

### Supabase (cloud sharing and sign-in)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run the contents of `supabase-schema.sql`.
3. Enable Google as an auth provider: Authentication > Providers > Google. Add your site URL to the allowed redirect URLs.
4. Copy the Project URL and anon key (Project Settings > API) into `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

### OpenRouteService (distance and time auto-fill)

1. Sign up at [openrouteservice.org/dev](https://openrouteservice.org/dev). It is free and needs no credit card.
2. Create a token and put it in `ORS_API_KEY`.

## Deploy (Vercel)

1. Push this repo to GitHub.
2. Import it in [Vercel](https://vercel.com). It auto-detects Vite, so no build settings are needed.
3. Add the four environment variables in the Vercel project settings (set `VITE_SITE_URL` to the deployed URL).
4. Deploy. The `api/route.js` function runs automatically as the routing backend.

## How sharing works

The app is local-only until you click "Go remote and share". That copies your local listings to Supabase, switches this browser to cloud mode, and updates the URL with `?cloud=1`. The "Share link" button copies that URL. Anyone who opens it sees the shared list and can view freely. To add or edit, they sign in with Google. The anon key in the page can only do what the row level security policies allow.

## Project layout

```
api/route.js          serverless OpenRouteService proxy (the backend)
api/_ors.js           shared routing logic (used by the function and dev server)
src/lib/              store, supabase, prefs, auth, commute, excel, constants
src/components/       Onboarding, Header, ListingsTable, ListingForm, ListingDetail, MediaGallery
src/hooks/            hash router
supabase-schema.sql   database tables, grants, and policies
docs/                 the original idea and the first HTML prototype
```
