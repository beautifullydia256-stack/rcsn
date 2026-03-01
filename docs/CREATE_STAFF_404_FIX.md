# Create Staff 404 / "The page could not be found"

If Create Staff shows **Server error (404). The page could not be found**, the frontend (Vite app) is calling `/api/admin/create-user-account` on the same host, but that path is not available (e.g. you deploy only the Vite build, so there is no API server).

## Fix options

### Option 1: Use `VITE_API_URL` (recommended if API is elsewhere)

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

**Important:** The project that serves api.pwezacore.com must be built and run with **Next.js** (e.g. in Vercel: Framework Preset = Next.js, or Build Command = `next build`). The repo has both Vite and Next.js (app/, next.config.ts, middleware.ts). If the API project uses the same Vite build as www, `/api/*` does not exist there and you will get 404/CORS errors. Use a separate Vercel project for the API with Next.js so that middleware and API routes run.

### Option 2: Serve API on the same host

Deploy with **Next.js** as the main app (so the same deployment serves both the dashboard and `app/api/*`). Then `/api/admin/create-user-account` will work without setting `VITE_API_URL`. This may require changing your build/deploy from Vite-only to Next.js (e.g. in Vercel, use the Next.js framework and ensure `app/api` is part of the build).
