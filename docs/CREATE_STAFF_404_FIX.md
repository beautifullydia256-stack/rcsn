# Create Staff 404 / "The page could not be found"

If Create Staff shows **Server error (404). The page could not be found**, the frontend (Vite app) is calling `/api/admin/create-user-account` on the same host, but that path is not available (e.g. you deploy only the Vite build, so there is no API server).

## Fix options

### Option 1: Use `VITE_API_URL` (recommended if API is elsewhere)

1. Deploy the **Next.js** part of this repo so that `/api/admin/create-user-account` exists (e.g. a second Vercel project using the same repo with Next.js build, or any host that runs the `app` API routes).
2. In your **Vite app** deployment (Vercel / env), set:
   ```bash
   VITE_API_URL=https://your-api-origin.com
   ```
   Use the full origin where the Next.js API is served (no trailing slash), e.g. `https://www.pwezacore.com` if the same domain serves the API, or `https://api.pwezacore.com` if the API is on a subdomain.
3. Rebuild and redeploy the Vite app so the env is baked in.

The Create Staff page will then call `{VITE_API_URL}/api/admin/create-user-account` instead of `/api/admin/create-user-account`.

### Option 2: Serve API on the same host

Deploy with **Next.js** as the main app (so the same deployment serves both the dashboard and `app/api/*`). Then `/api/admin/create-user-account` will work without setting `VITE_API_URL`. This may require changing your build/deploy from Vite-only to Next.js (e.g. in Vercel, use the Next.js framework and ensure `app/api` is part of the build).
