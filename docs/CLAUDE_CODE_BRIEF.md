# Apartment Hunt Tracker — Project Brief for Claude Code

This document is a handoff brief. A prototype already exists (`apartment_tracker.html`), and this file explains the goal, the requirements, the recommended architecture, and a build plan you can execute interactively.

The prototype is the visual and functional baseline. Treat it as the starting point, not the finished product.

---

## 1. What this is

A small web app for tracking apartment and townhouse visits during a New York City / New Jersey housing search. It needs to be:

- Hostable on GitHub Pages (or any static host) from my own GitHub account.
- Shareable by URL with family in India so they can view the listings, and optionally add a listing themselves.
- A clean enough piece of work that I am comfortable showing it as something I built and actually used.

It is for real use starting the week of the brief, when I take a trial run trip to NYC to visit places in person, so a working first version matters more than a perfect one.

---

## 2. Background and motivation

- I am apartment hunting across NYC (the five boroughs) and New Jersey (Jersey City, Hoboken, Newark, other NJ). In NYC most listings have no building name, just a street address.
- I find listings on StreetEasy, Zillow, Apartments.com, Facebook Marketplace, etc., contact the point of contact, and schedule in-person visits.
- I want one place to track each listing: where it is, the rent, the commute from that apartment to my office on public transit, who to contact and how, my notes after talking to them, and photos/videos.
- Family in India should be able to open a link and see everything, and ideally add a listing if they find one.
- I want to be able to export the whole thing to an Excel file when useful.

---

## 3. Functional requirements

### 3.1 Views (single-page app, tabbed or hash-routed)

1. **Listings (table) view** — the default. A spreadsheet-style table of all listings in the page itself. Sortable and filterable. Clicking a listing opens its Detail view.
2. **Add / Edit form** — a form to create a new listing or edit an existing one. The prototype's form is a good starting layout.
3. **Detail view (per listing)** — a dedicated page for one listing showing all its fields plus a media gallery (photos shown as images, videos shown with a player). Reachable by clicking a listing AND by a deep link of the form `#id=<listing-id>` so an external link can open it directly. This deep link is what the Excel export points to.

### 3.2 Fields per listing

Originals I asked for:
- **Address** — full street address (NYC listings have no name, just an address).
- **Rent** — dollars per month.
- **Location** — coarse area (Manhattan, Brooklyn, Queens, Bronx, Staten Island, Jersey City, Hoboken, Newark, Other NJ). Free text allowed.
- **D2D (door to door) details** — two parts:
  - A Google Maps directions link for apartment to office on **public transit** (the exact chosen route, not just a distance).
  - The commute time / route summary as text (e.g. "38 min, PATH + 6 min walk").
- **Point of contact** — name, number, and method (WhatsApp, iMessage, Call/Text, Facebook Marketplace, StreetEasy, Zillow, Apartments.com, Email, Other).

Fields I added because they fit this job (keep these):
- **Status** — pipeline: To contact, Contacted, Visit scheduled, Visited, Interested, Passed.
- **Visit date and time** — for scheduling the in-person visits during the trip.
- **Type / Beds** — e.g. "2BR apt", "Studio flex 1", "Townhouse".
- **Rating** — 1 to 5 stars, filled in after visiting.
- **Notes / remarks** — free text from conversations with contacts.
- **Media** — photos and videos (see 3.4).
- **Added by** (new, for the shared version) — optional name of who added the listing, so I can tell my entries from family's.

### 3.3 Excel export

- A button that exports the current (optionally filtered) listings to a real `.xlsx` file. The prototype uses SheetJS client-side and that approach is fine.
- The **commute** cell should be a clickable hyperlink to the Google Maps route URL.
- The **media** cell should be a clickable hyperlink that points back to that listing's Detail page on the live hosted site (e.g. `https://<my-site>/#id=<listing-id>`). This is the key change from the prototype: Excel cannot hold real images or video, so instead of dumping raw image URLs, the cell links to the listing page on the site where the gallery actually renders.
- Export base URL should come from config, and fall back to the current page origin + path when not set, so the links work once hosted.

### 3.4 Media (photos and videos)

- Each listing can have multiple media items, each either an image or a video.
- Two ways to add media:
  - **Upload a file** (preferred when the cloud backend is configured): the file uploads to storage and the returned public URL is stored on the listing.
  - **Paste a URL** (always available): for a listing photo link or an externally hosted image/video.
- Detect kind by extension: `.mp4 .webm .mov .m4v .ogg` are videos, everything else is an image.
- The Detail view renders images in a gallery grid and videos with a `<video controls>` player.

### 3.5 Sharing

- When the cloud backend is configured, all visitors of the URL read the same data, and anyone can add a listing through the form. (See the security note in section 5.4: the public key model means anyone with the link can edit. That is acceptable for a small family tool; treat stronger auth as optional/future.)

---

## 4. Non-functional requirements and constraints

- **Static hosting friendly.** The front end must run as static files on GitHub Pages with no server of my own. A single self-contained `index.html` is ideal for zero-config GitHub Pages hosting, but a small Vite build is acceptable if it improves code quality (see section 5.1 for the decision to confirm with me).
- **Works with no setup out of the box.** With no backend configured, it should run in a local-only mode (browser `localStorage`) so I can use it immediately and so the prototype previews anywhere. Configuring the backend should be the only thing that unlocks sharing.
- **Free backend.** No paid services.
- **Decent code quality and a real README**, since this doubles as a portfolio piece.
- **Style preference:** no em dashes in any user-facing copy or docs.

---

## 5. Recommended architecture

### 5.1 Stack (confirm with me before scaffolding)

My recommendation, optimized for fast hosting and low friction:

- **Front end:** a single self-contained `index.html` (vanilla JS, no build step). This hosts on GitHub Pages by just dropping the file in a repo, and it is the simplest thing for family to load. The prototype already proves this works.
- **Backend:** **Supabase** free tier. Postgres table for listings + Supabase Storage bucket for media. Supabase has a generous free tier, a simple JS client loadable from a CDN (so it fits the no-build single-file approach), and looks good on a resume.

Alternative worth offering me: a small **Vite + React + Tailwind** app for nicer structure and componentization, deployed to GitHub Pages via a build step or to Netlify/Vercel. Trade-off: more polished code and easier to extend, but more setup and a build pipeline for GitHub Pages. **Ask me which I want before scaffolding.** If I do not care, default to the single-file + Supabase approach.

Firebase Firestore is a fine substitute for Supabase if I prefer it; offer it but default to Supabase.

### 5.2 Data layer abstraction

Write a small store module with three async methods: `all()`, `upsert(record)`, `remove(id)`. It uses Supabase when configured, otherwise `localStorage`. Generate listing `id` client-side with `crypto.randomUUID()` in both modes so deep links work immediately and upsert logic is identical across modes.

### 5.3 Database schema (Supabase / Postgres)

```sql
create table if not exists public.listings (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  status        text,
  address       text,
  type          text,
  rent          numeric,
  location      text,
  visit         text,           -- store the datetime-local string as entered
  commute_url   text,
  commute_time  text,
  contact_name  text,
  contact_number text,
  contact_method text,
  rating        int,
  notes         text,
  media         jsonb default '[]'::jsonb,  -- array of { url, kind } where kind in ('image','video')
  added_by      text
);
```

### 5.4 Supabase access setup

Note: Supabase is moving toward revoking automatic table grants, so set grants explicitly. The anon key lives in the front end and is public by design; RLS controls what it can do. For this family tool we intentionally allow public read and write.

```sql
-- Enable row level security
alter table public.listings enable row level security;

-- Explicit grants for the public (anon) role
grant select, insert, update, delete on public.listings to anon, authenticated;

-- Permissive policies (small family tool, intentionally open)
create policy "Public read"   on public.listings for select to anon using (true);
create policy "Public insert" on public.listings for insert to anon with check (true);
create policy "Public update" on public.listings for update to anon using (true) with check (true);
create policy "Public delete" on public.listings for delete to anon using (true);
```

Storage for media: create a **public** bucket named `media`, then allow anon to read and upload.

```sql
create policy "media public read"   on storage.objects for select to anon using (bucket_id = 'media');
create policy "media public upload" on storage.objects for insert to anon with check (bucket_id = 'media');
```

**Security note for me:** because the anon key is shipped in the front-end, anyone who has the site URL can read and edit data. That is fine for a private-ish family tool, especially if I do not publicize the URL. If I later want real protection, options are: a simple shared passphrase gate in the UI (light deterrent, not real security), or Supabase Auth (magic link or anonymous sign-in) with policies scoped to authenticated users and an `added_by`/owner column. Treat this as optional future work, not part of v1.

### 5.5 Config

A clearly commented config block (top of the script, or a separate `config.js`) with:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SITE_URL` (used to build the Excel deep links; fall back to `location.origin + location.pathname` when blank)

Empty `SUPABASE_URL` means local-only mode.

### 5.6 Routing

Hash-based routing so it works on static hosting and supports deep links: `#list` (default), `#add`, `#id=<uuid>` (detail). Parse the hash on load so an Excel link to `#id=...` opens the right detail page.

---

## 6. Design direction

Keep the prototype's aesthetic: warm editorial / refined, not generic. Paper background, ink text, terracotta accent, teal secondary. Display font Fraunces, body font Hanken Grotesk (Google Fonts). Status pills, clean table, soft shadows. Reuse the prototype's CSS as the baseline and extend it for the tabs and the detail/gallery view. Avoid generic AI styling (no Inter, no purple-on-white gradients).

---

## 7. Deployment (GitHub Pages, single-file path)

1. Create a public repo (e.g. `apartment-hunt-tracker`).
2. Add `index.html` (and `README.md`, `supabase-schema.sql`).
3. Repo Settings > Pages > Deploy from branch > `main` / root.
4. Site goes live at `https://<username>.github.io/apartment-hunt-tracker/`.
5. Put that URL into `SITE_URL` in config so Excel deep links resolve.

For the Supabase setup: create a free project, run the SQL in section 5.3 to 5.4 in the SQL Editor, create the public `media` bucket, then copy the Project URL and anon key into config.

---

## 8. Instructions to Claude Code

1. **Read `apartment_tracker.html` first.** It is the working prototype with the fields, the warm aesthetic, the SheetJS export, and the autosave pattern. Build on it; do not start from scratch.
2. **Confirm two decisions with me before scaffolding:**
   - Stack: single-file vanilla + Supabase (my default) vs Vite + React + Tailwind.
   - Backend: Supabase (my default) vs Firebase, or local-only for now with cloud added later.
3. **Then build v1** in this order:
   a. Refactor the prototype into the three views (Listings table, Add/Edit form, Detail view with media gallery) with hash routing and deep links.
   b. Add the data layer abstraction (Supabase when configured, else localStorage).
   c. Add media: file upload to Supabase Storage when configured, plus paste-a-URL always; render gallery (images + video players) on the Detail view.
   d. Update the Excel export so the media cell links to the listing's Detail page (`SITE_URL + #id=<id>`) and the commute cell links to the Maps route.
   e. Add the `added_by` field for the shared version.
4. **Write the supporting files:** `README.md` (what it is, how to run locally, how to set up Supabase with the SQL, how to deploy to GitHub Pages, a short "why I built this" line) and `supabase-schema.sql` (the SQL from sections 5.3 and 5.4).
5. **Keep it working in local-only mode at every step** so I can use it during my trip even before Supabase is wired up.
6. **Honor the style preference:** no em dashes in user-facing copy or docs.
7. Surface decisions to me as you go rather than silently choosing; I want to stay in the loop on the build.

---

## 9. Files in this handoff

- `apartment_tracker.html` — the working prototype (visual and functional baseline).
- `CLAUDE_CODE_BRIEF.md` — this document.
