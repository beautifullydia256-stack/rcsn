# ⚠️ DEPRECATED - OLD REPORT GENERATION CODE

## This file marks old report generation code that MUST NOT be used

The old report generation system has been **COMPLETELY REPLACED** with the new Arbor MIS-style snapshot-based system.

---

## ❌ **FILES MARKED FOR REMOVAL**

### Old API Routes (DELETE THESE)
- `app/api/reports/generate-pdf/route.ts` - **DELETE** - Per-student PDF generation
- `app/api/reports/generate-docx/route.ts` - **DELETE** - DOCX generation (removed)

### Old UI Components (REPLACE WITH NEW)
- `app/dashboard/admin/reports/generate/components/PrimaryReportGenerator.tsx`
  - **DEPRECATED**: Contains `generateReport()` with live calculations
  - **REPLACEMENT**: Use `src/pages/admin/reports/SnapshotManager.tsx` and `BulkGenerator.tsx`
  
- `app/dashboard/admin/reports/generate/components/SecondaryReportGenerator.tsx`
  - **DEPRECATED**: Contains `generateReport()` with live calculations
  - **REPLACEMENT**: Use `src/pages/admin/reports/SnapshotManager.tsx` and `BulkGenerator.tsx`

- `app/dashboard/admin/components/AcademicReportGenerator.tsx`
  - **DEPRECATED**: Live calculations
  - **REPLACEMENT**: Use snapshot-based system

- `app/dashboard/admin/components/AttendanceAnalysisReportGenerator.tsx`
  - **DEPRECATED**: Live calculations
  - **REPLACEMENT**: Use snapshot-based system

---

## ✅ **NEW SYSTEM FILES**

### Snapshot System
- `src/services/snapshotLock.ts` - Complete snapshot creation with ALL data
- `src/services/snapshotService.ts` - Snapshot CRUD operations
- `src/services/reportDataTransformer.ts` - Transform snapshot to report format
- `src/services/templateRenderer.ts` - Presentation-only template rendering
- `src/services/templateHTMLGenerator.ts` - Extracted template HTML functions

### Bulk Generation
- `supabase/functions/generate-reports-bulk/index.ts` - Server-side bulk generation Edge Function

### PDF Generation
- `api-server/src/services/puppeteerService.ts` - PDF from cached reports ONLY
- `api-server/src/routes/pdf.ts` - PDF API endpoints

### New UI Components
- `src/pages/admin/reports/SnapshotManager.tsx` - Snapshot management
- `src/pages/admin/reports/BulkGenerator.tsx` - Bulk generation trigger
- `src/pages/admin/reports/ReportViewer.tsx` - View cached reports

---

## 🔑 **CRITICAL RULES**

1. **NEVER** call old `generateReport()` functions
2. **NEVER** use old API routes `/api/reports/generate-pdf` or `/api/reports/generate-docx`
3. **ALWAYS** use snapshot-based system:
   - Create snapshot → Lock snapshot → Bulk generate → View cached reports
4. **ALL** calculations done during snapshot creation
5. **TEMPLATES** are presentation-only, no calculations

---

## 📝 **MIGRATION CHECKLIST**

- [ ] Delete `app/api/reports/generate-pdf/route.ts`
- [ ] Delete `app/api/reports/generate-docx/route.ts`
- [ ] Replace `PrimaryReportGenerator.tsx` with new UI
- [ ] Replace `SecondaryReportGenerator.tsx` with new UI
- [ ] Update all imports to use new services
- [ ] Remove all calls to old `generateReport()` functions
- [ ] Test snapshot creation
- [ ] Test bulk generation
- [ ] Test report viewing from cache
- [ ] Verify performance targets met

---

**Last Updated**: Report engine replacement in progress
**Status**: Old code marked for removal, new system implemented




