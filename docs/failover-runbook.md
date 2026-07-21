# Disaster-recovery failover runbook

A second Supabase project is kept as a near-live mirror of production by
`.github/workflows/db-backup.yml`, which runs `scripts/backupToSecondary.mjs` every
4 hours. This document is what to do if the primary project ever needs to be abandoned
and the app switched to the backup.

**Worst-case data loss:** whatever changed since the last successful scheduled run.
Check the [Actions tab](../../actions/workflows/db-backup.yml) for the most recent green
run's timestamp before deciding to switch — that's your actual loss window, not
necessarily the full 4 hours.

## Before switching: is it actually necessary?

This is a one-way, disruptive action (below). Confirm the primary project is genuinely
unusable — not a transient outage — before proceeding. Check the primary project's
status in the Supabase dashboard first.

## Switching the web app (instant — takes effect for every browser session)

1. In the Vercel dashboard (`rakaiinfants-gif` account) → project → Settings →
   Environment Variables, update these to the **backup** project's values:
   - `VITE_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_URL` (also set in `vercel.json`'s `env` block — override
     takes precedence, but update the file too so the next deploy doesn't revert it)
   - `VITE_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
2. Trigger a redeploy (push a commit, or use "Redeploy" in the Vercel dashboard).
3. Verify: open the live site, log in as a test user, confirm data loads and a write
   (e.g. marking attendance) succeeds.

## The desktop app cannot switch the same way — read this before assuming it's covered

`src/lib/supabase.ts` reads `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` at **build
time** (Vite bakes them into the compiled bundle). Every already-installed copy of the
desktop app keeps talking to the **old** database until it installs a new build compiled
against the backup project's URL — changing Vercel env vars does nothing for desktop
users. As of this writing there is no mechanism to push that switch to installed desktop
copies automatically.

To actually move desktop users over, you would need to:
1. Update `.env.local` (or the build environment) with the backup project's
   `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`.
2. Run `npm run pack:win` to build a new installer against the backup project.
3. Get every desktop install updated to that new build — currently a manual reinstall
   per machine, since GitHub Releases auto-publishing isn't wired up (see
   `package.json`'s `publish` config — builds are local-only unless explicitly
   published).

If seamless desktop failover matters, the real fix is changing `src/lib/supabase.ts` to
fetch the Supabase URL/anon key from a small runtime config endpoint on startup instead
of baking it into the build — that's a separate, deliberate piece of work, not something
this backup system does today.

## After switching

- The backup workflow's `SOURCE_DB_URL` / `SOURCE_SUPABASE_URL` /
  `SOURCE_SERVICE_ROLE_KEY` secrets now point at the *old* (failed) project. Until the
  old project is repaired or retired, either disable the workflow (Actions tab → this
  workflow → "..." → Disable) or repoint `SOURCE_*` at the new primary and `TARGET_*` at
  a freshly created third project — otherwise it'll keep trying to back up a dead source.
