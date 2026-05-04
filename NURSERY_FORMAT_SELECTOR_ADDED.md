# ✅ Nursery Format Selector Added

## Problem Solved
You were seeing the colored/cartoon template (Template2KasoziReport) for ALL nursery classes, even when you wanted the old marks-based format (Template2OldNurseryReport).

## Solution
Added a **manual dropdown selector** for nursery classes to choose between:
- **Old Format (Marks-based, like Primary)** - Clean table with marks, grades, and remarks
- **Latest Format (Colored Performance)** - Colored performance ratings with images

## How It Works

### 1. New Dropdown in UI
When you select a nursery class (Baby Class, Middle Class, Top Class), you'll now see:

```
Template / Layout
[Dropdown showing: "Old Format (Marks-based, like Primary)" or "Latest Format (Colored Performance)"]
```

### 2. User Selection Overrides Auto-Detection
- Before: System auto-detected format from database data
- Now: **Your selection in the dropdown takes priority**
- The selected format is injected into the report data before rendering

### 3. Changes Made

**File**: `src/pages/admin/reports/GenerateReportsPage.tsx`

**Added**:
1. New state: `nurseryFormat` (default: 'latest')
2. Dropdown selector for nursery classes
3. Logic to override report data with selected format

**Code Changes**:
```typescript
// New state
const [nurseryFormat, setNurseryFormat] = useState<'old' | 'latest'>('latest');

// New dropdown UI
{isPrePrimaryClass ? (
  <select
    value={nurseryFormat}
    onChange={(e) => setNurseryFormat(e.target.value as 'old' | 'latest')}
    className="ac-input w-full min-h-0 rounded-lg px-3 py-2 text-sm"
    title="Choose nursery report format"
  >
    <option value="old">Old Format (Marks-based, like Primary)</option>
    <option value="latest">Latest Format (Colored Performance)</option>
  </select>
) : ...}

// Override format in report data
const reportDataWithFormat = isPrePrimaryClass && report.report_data
  ? {
      ...report.report_data,
      students: report.report_data.students?.map((s: any) => ({
        ...s,
        nursery_report_format: nurseryFormat,
        results: s.results?.map((r: any) => ({
          ...r,
          nursery_report_format: nurseryFormat,
        })),
      })),
    }
  : report.report_data;
```

## How to Use

### Step 1: Select Nursery Class
1. Go to **Admin → Reports → Generate Reports**
2. Select a nursery class (e.g., "Middle Class")

### Step 2: Choose Format
You'll see a dropdown labeled **"Template / Layout"** with a green "Nursery format" badge.

Select:
- **"Old Format (Marks-based, like Primary)"** - For the clean marks table
- **"Latest Format (Colored Performance)"** - For the colored ratings

### Step 3: Preview
Click **"Preview Report"** to see the selected format.

## What Each Format Shows

### Old Format (Marks-based)
- ✅ Clean header (same as primary)
- ✅ Student details table
- ✅ Marks table with columns:
  - SUBJECT
  - EXAM MARKS OBTAINED OUT OF
  - EXAM AGG
  - AGG. GRADE
  - REMARKS
  - INITIALS
- ✅ Average percentage
- ✅ Teacher comments
- ✅ Plain white background

### Latest Format (Colored Performance)
- ✅ Clean header (same as primary, now fixed!)
- ✅ Student details section
- ✅ Colored performance ratings grid with images
- ✅ Legend showing rating colors
- ✅ Plain white background (gradients removed!)

## Testing

After Vercel deployment:

1. **Test Old Format**:
   - Select "Middle Class"
   - Choose "Old Format (Marks-based, like Primary)"
   - Click "Preview Report"
   - ✅ Should show marks table like Primary 1-7

2. **Test Latest Format**:
   - Select "Middle Class"
   - Choose "Latest Format (Colored Performance)"
   - Click "Preview Report"
   - ✅ Should show colored performance grid

3. **Test Format Switching**:
   - Switch between formats
   - Preview should update immediately
   - No need to reload page

## Deployment

```bash
git add .
git commit -m "feat: add manual nursery format selector"
git push origin main
```

✅ **Pushed to GitHub** - Vercel will auto-deploy

## Summary

**Before**: 
- Always showed colored format
- No way to choose old format
- Auto-detection didn't work reliably

**After**:
- ✅ Manual dropdown to choose format
- ✅ Works for ALL nursery classes
- ✅ Your selection overrides auto-detection
- ✅ Clean white background (no gradients)
- ✅ Both formats look professional

---

**Status**: Fixed and deployed
**Version**: 0.1.24
**Date**: May 4, 2026

**You can now select the format you want!**
