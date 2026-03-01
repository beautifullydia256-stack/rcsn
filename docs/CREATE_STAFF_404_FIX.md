# Create Staff 404 / CORS / "Failed to fetch"

## Recommended: Use same origin (no CORS)

The repo now includes a **Vercel serverless function** at `api/admin/create-user-account.ts`. When you deploy the **www** project (Vite build), Vercel also deploys this function, so **https://www.pwezacore.com/api/admin/create-user-account** exists on the same host as the app.

**Do this:**
1. **Remove the env var `VITE_API_URL`** from your www project in Vercel (or leave it empty). The Create Staff page will then call `/api/admin/create-user-account` on the same origin → no CORS, no second domain.
2. In the **www** project, ensure these env vars are set (same as today): `NEXT_PUBLIC_SUPABASE_URL` (or `VITE_SUPABASE_URL`), `NEXT_PUBLIC_SUPABASE_ANON_KEY` (or `VITE_SUPABASE_ANON_KEY`), `SUPABASE_SERVICE_ROLE_KEY`.
3. Redeploy. Create Staff should work.

---

## If you still use a separate API domain (api.pwezacore.com)

If Create Staff shows **Server error (404)** or **CORS / Failed to fetch**, and you want to keep calling api.pwezacore.com:

1. Deploy the **Next.js** part of this repo so that `/api/admin/create-user-account` exists (e.g. a second Vercel project using the same repo with Next.js build, or any host that runs the `app` API routes).
2. **CORS:** The API allows requests from `https://www.pwezacore.com` by default. On the **API** deployment (e.g. api.pwezacore.com), set in Environment Variables:
   ```bash
   CORS_ORIGIN=https://www.pwezacore.com
   ```
   (Optional; this is the default. Use if your frontend is on a different origin.)
3. In your **Vite app** deployment (Vercel / env), set:
   ```bash
   VITE_API_URL=https://api.pwezacore.com
   ```
   Use the full origin where the Next.js API is served (no trailing slash), e.g. `https://www.pwezacore.com` if the same domain serves the API, or `https://api.pwezacore.com` if the API is on a subdomain.
4. Rebuild and redeploy both the API and the Vite app so env is applied.

The Create Staff page will then call `{VITE_API_URL}/api/admin/create-user-account` and the API will respond with CORS headers so the browser allows the request.

**Important:** The project that serves api.pwezacore.com must be built and run with **Next.js** (e.g. in Vercel: Framework Preset = Next.js, or Build Command = `next build`). The repo has both Vite (main app) and Next.js (app/, next.config.ts). Root `middleware.ts` was removed because the main Vercel build is Vite-only; Vercel would try to run middleware as an Edge Function and fail (no `next` dependency). CORS for the API is handled in `app/api/admin/create-user-account/route.ts` (OPTIONS + response headers) and in `next.config.ts` headers when you deploy with Next.js. If the API project uses the same Vite build as www, `/api/*` does not exist there and you will get 404/CORS errors.

### Option 2: Serve API on the same host

Deploy with **Next.js** as the main app (so the same deployment serves both the dashboard and `app/api/*`). Then `/api/admin/create-user-account` will work without setting `VITE_API_URL`. This may require changing your build/deploy from Vite-only to Next.js (e.g. in Vercel, use the Next.js framework and ensure `app/api` is part of the build).
