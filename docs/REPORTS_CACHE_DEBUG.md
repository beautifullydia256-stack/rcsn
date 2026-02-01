# If you still see the old Reports (snapshot) layout

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
