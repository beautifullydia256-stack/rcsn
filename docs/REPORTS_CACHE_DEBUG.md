# If you still see the old Reports (snapshot) layout

## Page we’re fixing

- **URL:** `https://www.pwezacore.com/dashboard/admin/reports/generate`
- **Code:** `src/pages/admin/reports/ReportsGeneratePage.tsx`
- **Expected:** Gradient background, “Generate Reports” header, “Back to Reports” button, one card with “Select exam set” dropdown and “Generate Reports” button. Subtitle includes “· Select exam set below” when the new build is live.

## What we fixed

1. **Service worker cache** – The app’s service worker was caching JS with fixed cache names (`pwezacore-v1`). After a deploy, browsers could keep serving **old** JS (which still had the snapshot layout). We bumped the cache version to **v2** in `public/sw.js` so the next deploy will clear old caches and load the new Reports hub.

2. **Snapshot layout removed** – SnapshotManager page was removed; `/reports/snapshots` now redirects to the Reports hub. All links (sidebar, Quick Actions, Settings, Recent Reports) point to `/dashboard/admin/reports` (hub).

## What you can do to confirm / fix it

### 1. Force fresh assets (recommended)

- **Chrome/Edge:** Open the site → `F12` → **Application** tab → **Storage** (left) → click **Clear site data**. Then reload.
- Or: **Hard refresh** – `Ctrl+Shift+R` (Windows) / `Cmd+Shift+R` (Mac).
- Or: Open the site in an **Incognito/Private** window (no cache).

### 2. Unregister the service worker

- `F12` → **Application** → **Service Workers**.
- If you see a worker for this site, click **Unregister**.
- Reload the page. You should then get the latest JS from the server.

### 3. Help debug (if it still happens)

Please note and share:

1. **Exact URL** when the wrong layout appears (e.g. `.../reports` or `.../reports/snapshots`).
2. **When it happens** – e.g. first load, after clicking “Reports”, after refresh.
3. **Browser and device** – e.g. Chrome on Windows, Safari on iPhone.

That will show whether the issue is routing, caching, or something else.

## If you cleared data and still see no change: deployment not updating

Then **pwezacore.com may not be serving the latest build**. Check:

1. **Vercel dashboard** – [vercel.com](https://vercel.com) → your project → **Deployments**. Confirm the latest commit (e.g. “Bump service worker cache…”) is deployed and **Production** is using it.
2. **Production branch** – **Settings** → **Git** → Production Branch should be `main` (or the branch you push to).
3. **Redeploy** – In Deployments, open the latest deployment and use **Redeploy** (no cache) so Vercel builds again and serves the new `dist/`.
4. **Confirm new code on the generate page** – After a fresh deploy, open `https://www.pwezacore.com/dashboard/admin/reports/generate`. You should see the subtitle “Create student academic reports for exams and terms **· Select exam set below**”. If that line is there, the new build is live.
