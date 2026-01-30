# SPA Testing & Validation

This document describes how to validate the migrated SPA and report pipeline.

## 1. Report comparison

- **Goal**: Ensure new snapshot → cache → PDF output matches legacy PDF/DOCX layout and data.
- **Steps**:
  1. Create a locked snapshot for a term/class in the SPA (Admin → Snapshots).
  2. Run bulk generation (Admin → Bulk Generate).
  3. Generate PDF via Report Viewer or api-server `POST /api/pdf/generate` with `snapshotId`.
  4. Compare with a PDF generated from the legacy Next.js report generate page (if still available in a branch) for the same data: same headings, table layout, grades, comments, and school/student info.

## 2. Performance

- **Snapshot creation**: Measure time to create and lock a snapshot (target: reasonable for typical school size).
- **Bulk generation**: Target 300 reports &lt; 15s, 1000 reports &lt; 60s (Edge Function + generated_reports).
- **Report viewing**: Cached report load &lt; 1s; PDF from api-server from cache should be &lt; 5s per report.

## 3. E2E workflow

1. **Login** → Open SPA, log in as admin.
2. **Dashboard** → Land on `/dashboard/admin` with sidebar (Students, Teachers, Reports, etc.).
3. **Reports** → Go to Snapshots → create snapshot → lock → Bulk Generate → Report Viewer; open a report and optionally download PDF.
4. **Admin CRUD** → Students list loads; Teachers list loads; navigation between admin pages works.

## 4. Automated tests (optional)

To add Vitest for unit tests:

```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Add to `package.json`:

```json
"scripts": {
  "test": "vitest",
  "test:run": "vitest run"
}
```

Create `vitest.config.ts` and tests under `src/**/*.test.tsx` or `src/**/*.spec.ts` as needed.
