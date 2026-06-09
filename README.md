# Apartment Hunt

A small web app for tracking apartment and townhouse visits during a housing search. It keeps each lead in one place: the address, the rent, the commute to the places you care about, who to contact, your notes after talking to them, and photos or videos. It works offline by default, and you can flip on a shared cloud mode to let family or roommates see the same list and add to it.

I built it for my own move and then generalized it so anyone can use it for any city.

## What it does

- **One table for every lead.** Status pipeline (To contact, Contacted, Visit scheduled, Visited, Interested, Passed), rent, type, location, visit date, contact, rating, notes, and media. Sort and filter.
- **Commute links, built for you.** During setup you list up to three places you want to be close to (an office, a partner's work, a gym). Every listing then gets a one-click Google Maps directions link from the apartment to each place, with the travel mode pre-filled. No Google API and no cost: it is just a deep link into Maps.
- **Auto distance and time.** For drive, walk, and cycle, the app fills in the distance and time using OpenRouteService (free, no credit card). Public transit is not auto-filled (OpenRouteService has no transit engine), so for transit you open the Maps link, see the exact route, and type the time in. The link is still built for you.
- **Photos and videos by link.** Paste a link (Google Drive, Google Photos, Imgur, the listing page). The detail page shows images in a gallery and plays videos. Links keep storage free.
- **Visit planning.** Mark a listing "Visit confirmed" with either a specific time or a flexible window. The Visitations tab collects them all, and a schedule generator clusters confirmed visits by real distance (not by area name), respects your fixed times and windows, and suggests an efficient order per group with a clickable Google Maps walking route.
- **Excel export.** One click produces an .xlsx. The commute cells link to the Maps routes, and the media cell links back to that listing's page on the live site, since a spreadsheet cannot hold real images.
- **Accounts and hunts.** Sign in with Google and organize your search into named hunts (for example "New Jersey Hunting" and "Texas Hunting"). A dashboard shows each hunt with its lead and confirmed-visit counts. Each hunt has its own Leads and Visitations tabs.
- **Collaboration.** Invite family by their Google email. Once they sign in, the hunt appears on their dashboard and they can view and add listings. Only the owner can rename or delete a hunt and manage its members.

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
| `GOOGLE_MAPS_API_KEY` | server only | Google Places API (New) key for the "start from a transit stop" schedule anchor. Optional; falls back to OpenStreetMap when blank. |
| `VITE_ACCESS_CODE` | browser | Site-wide access code (soft gate). When set, visitors enter it to edit, or choose "view only". Blank disables the gate. Bundled into the client, so it deters casual visitors but is not real security. |

### Supabase (cloud sharing and sign-in)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the SQL Editor, run the contents of `supabase-schema.sql`. If you set up your database from an earlier version of this file, also run `supabase-migration-visits.sql` to add the visit planning columns.
3. Enable Google as an auth provider: Authentication > Providers > Google. Add your site URL to the allowed redirect URLs.
4. Copy the Project URL and anon key (Project Settings > API) into `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

### OpenRouteService (distance and time auto-fill)

1. Sign up at [openrouteservice.org/dev](https://openrouteservice.org/dev). It is free and needs no credit card.
2. Create a token and put it in `ORS_API_KEY`.

### Google Places (transit-stop schedule anchor)

1. In [Google Cloud Console](https://console.cloud.google.com), create a project and enable the **Places API (New)**.
2. Create an API key and put it in `GOOGLE_MAPS_API_KEY`. Optionally restrict it to the Places API.
3. Leave blank to skip it: the schedule generator then falls back to the free OpenStreetMap Overpass service, which is slower and can be rate limited.

## Deploy (Vercel)

1. Push this repo to GitHub.
2. Import it in [Vercel](https://vercel.com). It auto-detects Vite, so no build settings are needed.
3. Add the four environment variables in the Vercel project settings (set `VITE_SITE_URL` to the deployed URL).
4. Deploy. The `api/route.js` function runs automatically as the routing backend.

## How accounts and collaboration work

Everyone signs in with Google. A signed-in user owns hunts; each hunt holds its own listings and setup. The owner invites a collaborator by entering their Google email in the hunt's Members panel. No email is sent, so the owner just tells them to sign in. When that person signs in with the invited email, Supabase row level security (via the `has_hunt_access` function) lets them read and add listings in that hunt, and the hunt shows up on their dashboard. Only the owner can rename or delete the hunt and manage members.

Local mode (no Supabase keys configured) is for development only. It uses localStorage with a single implicit user and no sign-in. In any deployed setup the app is always signed in and cloud backed.

## Project layout

```
api/route.js          serverless OpenRouteService proxy (commute time/distance)
api/geocode.js        serverless geocoder for the schedule generator
api/_ors.js           shared routing logic (used by the functions and dev server)
src/lib/              store, supabase, prefs, auth, commute, geocode, scheduler, geo, excel, constants
src/components/       Landing, TopBar, Dashboard, HuntView, Onboarding, Members,
                      ListingsTable, ListingForm, ListingDetail, MediaGallery, Visitations
src/hooks/            hash router
supabase-schema.sql   full schema (new projects)
supabase-migration-v2.sql   upgrade an existing v1 database
docs/                 the original idea, the first HTML prototype, and SETUP.md
```
