# Setup guide (step by step)

For your trip you need none of this. `npm run dev` works in local mode with zero setup.
Do these when you want auto-fill and sharing.

There are four environment variables in total. Here is what each one is and where it comes from:

| Variable | What it is | Where you get it | Secret? |
| --- | --- | --- | --- |
| `ORS_API_KEY` | Routing key for distance/time auto-fill | OpenRouteService (Part 1) | Yes, backend only |
| `VITE_SUPABASE_URL` | Your cloud database address | Supabase (Part 3) | No |
| `VITE_SUPABASE_ANON_KEY` | Public cloud access key | Supabase (Part 3) | No, public by design |
| `VITE_SITE_URL` | Your live site URL, for Excel links | Vercel, after first deploy (Part 6) | No |

---

## Part 1: OpenRouteService key (about 5 minutes)

This powers the drive / walk / cycle distance and time auto-fill. Free, no credit card.

1. Go to https://openrouteservice.org/dev and click Sign up. You can use email or sign in with Google or GitHub.
2. Confirm your email if asked, then log in. You land on the Dashboard.
3. Find the "Request a token" or "Tokens" area. Enter a name like `apartment-hunt`, choose token type Standard, and click Create Token.
4. Copy the long token string. This is your `ORS_API_KEY`.

---

## Part 2: Run it locally with the key

1. In the project folder, make a copy of `.env.example` named `.env`.
   In the terminal: `Copy-Item .env.example .env`
2. Open `.env` and paste your token after `ORS_API_KEY=`. Leave the other lines blank for now.
3. Run `npm run dev` and open the URL.
4. Add a listing with a real address, make sure you have a "close to" area set, pick Drive, and click Auto-fill. The time and distance should appear. Auto-fill will not work for transit, by design.

You can stop here and use the app for your trip. Parts 3 to 6 are only for sharing with family.

---

## Part 3: Supabase (cloud database, sharing, and sign-in)

This is the longest part. It has three pieces: create the database, copy your keys, and set up Google sign-in.

### 3A. Create the project and tables

1. Go to https://supabase.com and click Start your project. Sign in with GitHub (easiest).
2. Click New project. Choose your organization (a default one exists). Give it a name like `apartment-hunt`. Set a database password and save it somewhere safe (you will rarely need it). Pick a region near you. Plan: Free. Click Create new project and wait one to two minutes while it provisions.
3. In the left sidebar, open SQL Editor and click New query.
4. Open the file `supabase-schema.sql` from this project, select all of it, copy, and paste it into the editor.
5. Click Run. You should see a success message. This creates the `listings` and `settings` tables with the correct permissions.

### 3B. Copy your two keys

1. In the left sidebar, open Project Settings (the gear icon), then API.
2. Copy the Project URL. This is your `VITE_SUPABASE_URL`.
3. Under Project API keys, copy the key labeled `anon` `public`. This is your `VITE_SUPABASE_ANON_KEY`.
   Do not use the `service_role` key. That one is secret and must never go in the frontend.
   Note: some newer projects label this a Publishable key instead of anon public. Either works as the anon key.

Put both into your `.env` file. You can test cloud mode locally now: restart `npm run dev`, and you will see a "Go remote and share" button appear.

### 3C. Google sign-in

This lets family sign in to add or edit. Viewing never needs sign-in. This step uses Google Cloud, which is the fiddly part. If you would rather skip it, see "Simpler option" at the end of this part.

1. In Supabase, open Authentication, then Providers, and click Google. Turn it on. It shows fields for Client ID and Client Secret, and a Callback URL. Copy that Callback URL, you will paste it into Google in a moment.
2. Go to https://console.cloud.google.com. In the top bar, open the project dropdown and click New Project. Name it and create it, then make sure it is selected.
3. Use the search bar for "OAuth consent screen" (under APIs and Services). Choose User type External and create. Fill in the app name, your email for user support, and your email for developer contact. Save and continue through the next screens. On the Test users screen, add your own email and your family members' Google emails, then finish.
4. Go to APIs and Services, then Credentials. Click Create Credentials, then OAuth client ID. Application type: Web application. Give it a name. Under Authorized redirect URIs, click Add URI and paste the Supabase Callback URL from step 1. Click Create.
5. Google shows a Client ID and a Client Secret. Copy both back into the Supabase Google provider fields, then click Save in Supabase.

Simpler option: if Google setup is too much right now, tell me and I will switch the app to an open model where anyone with the link can view and edit without signing in. That removes Part 3C entirely. It is less safe (a leaked link means anyone can edit), which is usually fine for a private family link.

---

## Part 4: Put it on GitHub

1. Go to https://github.com and log in or create an account.
2. Top right, click the plus, then New repository.
3. Name it `apartment-hunt-tracker`. Choose Public (good for a portfolio). Do not add a README, .gitignore, or license, since this project already has files. Click Create repository.
4. GitHub shows a URL like `https://github.com/yourname/apartment-hunt-tracker.git`. Copy it.
5. Either send me that URL and I will connect it and push for you, or run these yourself in the project folder:
   ```
   git remote add origin https://github.com/yourname/apartment-hunt-tracker.git
   git push -u origin main
   ```
   The first push opens a browser window to log in to GitHub. Approve it and the push completes.

---

## Part 5: Deploy on Vercel

1. Go to https://vercel.com and sign up or log in with GitHub. Authorize Vercel when asked.
2. Click Add New, then Project. Your GitHub repos appear. Find `apartment-hunt-tracker` and click Import. If it is not listed, click the option to adjust GitHub App permissions and grant access to the repo.
3. Vercel auto-detects Vite. Leave the build settings as they are.
4. Expand Environment Variables and add these (name on the left, value on the right):
   - `VITE_SUPABASE_URL` = your Supabase project URL
   - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
   - `ORS_API_KEY` = your OpenRouteService token
   - `VITE_SITE_URL` = leave blank for now, you fill this in Part 6
5. Click Deploy and wait about a minute. You get a live URL like `https://apartment-hunt-tracker.vercel.app`.

---

## Part 6: Final wiring after the first deploy

1. Copy your Vercel URL. In Vercel, go to your project, Settings, Environment Variables, and set `VITE_SITE_URL` to that URL. Then go to Deployments, open the menu on the latest one, and click Redeploy so the change takes effect. This makes the Excel deep links point at your live site.
2. In Supabase, go to Authentication, then URL Configuration. Set the Site URL to your Vercel URL, and add the same URL (and a version ending in `/*`) under Redirect URLs. This makes Google sign-in return to your site correctly.

Done. Open your Vercel URL, click Go remote and share, sign in, and send the copied link to your family.
