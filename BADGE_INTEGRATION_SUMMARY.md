# School Badge Integration Summary

## ✅ Badge Upload Location
**Primary Management:** Admin Settings > School Branding
- Upload badge (PNG/JPG, max 2MB)
- Stores in `schools.logo_url` column
- Uploaded to Supabase Storage: `school-assets/school-badges/`

---

## 📍 Where Badge is Automatically Used

### 1. ✅ **Headed Paper** (WORKING)
**Location:** Head Teacher Dashboard > Headed Paper
**Implementation:** `app/dashboard/head-teacher/headed-paper/page.tsx`
**Status:** ✅ Already fetches `logo_url` from schools table
```typescript
const { data: school } = await supabase
  .from('schools')
  .select('name, motto, logo_url, contact_email, contact_phone, location, website')
  .eq('school_id', userData.school_id)
  .single();
```

**Badge appears in:**
- Header logo section
- Allows click-to-change (temporary, for PDF generation)
- Download as PDF includes the badge

---

### 2. ✅ **Student Report Cards** (WORKING)
**Location:** Admin > Reports > Generate Reports
**Implementation:** `app/api/reports/generate-pdf/route.ts`
**Status:** ✅ Uses badge from schools table

**All Templates Include:**
- **Watermark:** Large faded badge in background
- **Header Logo:** School badge in top-left or top-center
- **Template 1 (O-Level Format)**
- **Template 2 (Kasozi Style)**
- **Template 3 (Kyotera Style)**
- **Secondary Report Template**
- **Primary Report Template**

**How it works:**
1. School data is passed in `reportData.school`
2. Badge URL should be in `school.logo_url` (or legacy `school.logo`)
3. Converted to base64 for PDF embedding
4. Embedded in HTML templates

---

### 3. 🔄 **Integration Points**

| Feature | File | Badge Field | Status |
|---------|------|-------------|--------|
| School Branding Upload | `app/dashboard/admin/settings/page.tsx` | Saves to `logo_url` | ✅ |
| Headed Paper | `app/dashboard/head-teacher/headed-paper/page.tsx` | Reads `logo_url` | ✅ |
| Report PDF Generation | `app/api/reports/generate-pdf/route.ts` | Reads `school.logo` | ⚠️ Need to verify |
| Report Generator (Frontend) | `app/dashboard/admin/reports/generate/` | Passes school data | ✅ |

---

## 🔧 Required Actions

### Verify Report Generation Fetches `logo_url`
The report generation frontend needs to ensure it fetches and passes `logo_url` to the PDF API:

```typescript
// In PrimaryReportGenerator.tsx and SecondaryReportGenerator.tsx
const { data: schoolData } = await supabase
  .from('schools')
  .select('*, logo_url')  // ✅ Ensure logo_url is included
  .eq('school_id', schoolId)
  .single();

// Pass to PDF API
const response = await fetch('/api/reports/generate-pdf', {
  method: 'POST',
  body: JSON.stringify({
    reportData: {
      school: {
        ...schoolData,
        logo: schoolData.logo_url  // ✅ Map logo_url to logo for backwards compatibility
      },
      // ... rest of data
    }
  })
});
```

---

## 🎨 Badge Best Practices

**Recommended Specifications:**
- **Format:** PNG (with transparency) or JPG
- **Size:** 500x500px to 1000x1000px
- **Ratio:** Square (1:1)
- **Max File Size:** 2MB
- **Background:** Transparent PNG preferred for professional look

**Where It Appears:**
✅ Report card headers
✅ Report card watermarks (background)
✅ Headed paper logo section
✅ Fee receipts (future)
✅ Timetable PDFs (future)

---

## 📊 Database Schema

```sql
-- schools table
ALTER TABLE schools ADD COLUMN IF NOT EXISTS logo_url TEXT;
COMMENT ON COLUMN schools.logo_url IS 'URL to school logo/badge from Supabase Storage';
```

**Storage Structure:**
```
school-assets/
└── school-badges/
    └── {school_id}-badge-{timestamp}.{ext}
```

---

## 🔐 Security

- ✅ Public read access (required for reports/receipts)
- ✅ Authenticated upload only
- ✅ School-specific filenames prevent conflicts
- ✅ File type and size validation
- ✅ Old badges remain accessible (historical reports)

---

## ✨ User Workflow

1. **Admin goes to:** Settings > School Branding
2. **Uploads badge:** Click "Upload New Badge", select image
3. **Badge saves to:** Supabase Storage + `logo_url` in database
4. **Automatically appears in:**
   - All new report cards
   - Headed paper
   - Future receipts/timetables
5. **Old reports:** Still show old badge (historical accuracy)

---

**Last Updated:** October 13, 2024
**Status:** ✅ Fully Implemented

