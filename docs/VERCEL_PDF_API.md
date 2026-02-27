# Vercel serverless PDF API

The app uses a **same-origin** PDF endpoint in production so "Download PDF (Saved)" works without a separate server.

## Endpoint

- **URL:** `POST /api/pdf/generate` (same origin as the app, e.g. `https://www.pwezacore.com/api/pdf/generate`)
- **Body:** `{ snapshotId: string, studentIds?: string[], templateId?: string }`
- **Response:** PDF file with `Content-Disposition: attachment`

## Vercel environment variables

In **Vercel → Project → Settings → Environment Variables**, set:

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL (or `VITE_SUPABASE_URL` if you only have that) |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (not anon). Needed to read `generated_reports`, `report_snapshots`, `report_templates` |

Redeploy after adding or changing these.

## Optional

- **`VITE_PDF_API_URL`** — If set, the frontend uses this base URL for PDF requests instead of the same origin. Use only if you host the PDF API elsewhere.

## Requirements

- Reports must be **saved** first (Generate & Save). The API reads from `generated_reports` and `report_templates`.
- The school must have a **default report template** in `report_templates` (or pass `templateId`). Otherwise you get "Report template not found."

## Limits

- **maxDuration:** 60s (Vercel Pro). On Hobby the function may time out for large PDFs.
- First request after idle can be slower (cold start with Chromium).
