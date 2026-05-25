// Placeholder — overwritten by `npm run build:pdf-api` (esbuild) during Vercel build.
// Do NOT commit the full esbuild bundle in place of this file.
export const config = { maxDuration: 60, memory: 3008 };
export default async function handler(_req, res) {
  res.status(503).json({ error: 'Function not built yet — run npm run build:pdf-api' });
}
