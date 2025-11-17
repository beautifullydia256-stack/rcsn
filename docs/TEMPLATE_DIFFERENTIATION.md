# 📚 Report Template Differentiation by School Type

## Overview
Report templates are now differentiated between **Primary/Nursery** and **Secondary** schools, allowing independent customization for each school type.

---

## ✅ What Has Been Implemented

### 1. **Template Configuration Files**

#### Primary School Templates
**Location:** `src/templates/primary/index.ts`

```typescript
PRIMARY_TEMPLATES = {
  template1: "Primary Template 1 - Classic"
  template2: "Primary Template 2 - Modern"
  template3: "Primary Template 3 - Detailed"
}
```

**For:** Baby Class - Primary 7 students

#### Secondary School Templates
**Location:** `src/templates/secondary/index.ts`

```typescript
SECONDARY_TEMPLATES = {
  template1: "Secondary Template 1 - O-Level Format"
  template2: "Secondary Template 2 - Kasozi Style"
  template3: "Secondary Template 3 - Kyotera Style"
  template4: "Secondary Template 4 - A-Level Format" (future)
}
```

**For:** Senior 1 - Senior 6 students

---

### 2. **Updated Report Generators**

#### Primary Report Generator
- **File:** `app/dashboard/admin/reports/generate/components/PrimaryReportGenerator.tsx`
- **Templates Shown:** Primary Template 1, 2, 3
- **Labels:** "Primary School Templates" in dropdown
- **Target Users:** Nursery/Primary schools only

#### Secondary Report Generator
- **File:** `app/dashboard/admin/reports/generate/components/SecondaryReportGenerator.tsx`
- **Templates Shown:** Secondary Template 1, 2, 3
- **Labels:** "Secondary School Templates" in dropdown
- **Target Users:** Secondary schools only

---

## 🎯 How It Works

### Template Selection Flow:

1. **User Access Report Generator**
   ```
   User → /dashboard/admin/reports/generate
   ```

2. **System Detects School Type**
   ```
   Database: schools.type
   → 'Nursery/Primary' or 'Secondary'
   ```

3. **Router Selects Component**
   ```
   Nursery/Primary → PrimaryReportGenerator
   Secondary → SecondaryReportGenerator
   ```

4. **User Sees School-Specific Templates**
   ```
   Primary School User sees:
   ├── Primary Template 1 - Classic
   ├── Primary Template 2 - Modern
   └── Primary Template 3 - Detailed

   Secondary School User sees:
   ├── Secondary Template 1 - O-Level Format
   ├── Secondary Template 2 - Kasozi Style
   └── Secondary Template 3 - Kyotera Style
   ```

---

## 📝 Template Descriptions

### Primary School Templates

#### Template 1 - Classic
- Traditional primary school report format
- Clear subject listings with marks
- Teacher comments section
- Suitable for: All primary classes

#### Template 2 - Modern
- Contemporary design with visual elements
- Color-coded performance indicators
- Engaging for young students
- Suitable for: Baby - P.4

#### Template 3 - Detailed
- Comprehensive report with detailed breakdowns
- Multiple teacher comment sections
- Skills assessment areas
- Suitable for: P.5 - P.7

---

### Secondary School Templates

#### Template 1 - O-Level Format
- UCE-compliant format
- Aggregate calculation (best 8 subjects)
- Division grading (I, II, III, IV)
- Subject codes and grades
- Suitable for: S.1 - S.4

#### Template 2 - Kasozi Style
- Professional layout
- Detailed subject analysis
- Performance graphs
- Position tracking
- Suitable for: All secondary classes

#### Template 3 - Kyotera Style
- Comprehensive report card
- Class and stream positions
- Subject-wise performance breakdown
- Attendance tracking
- Suitable for: S.1 - S.4

#### Template 4 - A-Level Format (Future)
- UACE-compliant format
- Principal and subsidiary subjects
- Points calculation
- University preparation focus
- Suitable for: S.5 - S.6

---

## 🔧 Making Template Changes

### Example Requests

#### ✅ Good Request Format:

**"Add student photo to Primary Template 1"**
- Clear school type: Primary
- Clear template: Template 1
- Specific change: Add student photo
- **Will modify:** `PrimaryReportGenerator.tsx` → Template1 component

**"Change aggregate calculation logic in Secondary Template 1"**
- Clear school type: Secondary
- Clear template: Template 1
- Specific change: Aggregate calculation
- **Will modify:** `SecondaryReportGenerator.tsx` → Template1 component

**"Update all Secondary templates to include parent signature"**
- Clear school type: Secondary
- Clear scope: All templates
- Specific change: Parent signature
- **Will modify:** All template components in `SecondaryReportGenerator.tsx`

#### ❌ Unclear Request Format:

**"Change the template"**
- Unclear which school type
- Unclear which template number
- Unclear what change

**"Add photos"**
- Unclear school type
- Unclear which templates
- Unclear where to add

---

## 📂 File Structure

```
src/templates/
├── primary/
│   └── index.ts                    (Primary template configs)
└── secondary/
    └── index.ts                    (Secondary template configs)

app/dashboard/admin/reports/generate/
├── page.tsx                        (Router - detects school type)
└── components/
    ├── PrimaryReportGenerator.tsx  (Uses PRIMARY_TEMPLATES)
    └── SecondaryReportGenerator.tsx (Uses SECONDARY_TEMPLATES)
```

---

## 🎨 Template Customization Points

### What Can Be Customized Per School Type:

1. **Layout & Design**
   - Header format
   - Logo placement
   - Color schemes
   - Font choices

2. **Content Sections**
   - Subject listings
   - Grading scales
   - Comment areas
   - Performance indicators

3. **Calculations**
   - Grade computation
   - Aggregate calculations (Secondary)
   - Position calculations
   - Average calculations

4. **Information Display**
   - Student details
   - School information
   - Term/exam details
   - Signature blocks

5. **Compliance Features**
   - UCE format (Secondary O-Level)
   - UACE format (Secondary A-Level)
   - Ministry requirements
   - School-specific needs

---

## 🚀 Future Enhancements

### Planned Improvements:

1. **Template Preview**
   - Live preview before generation
   - Sample data display
   - Quick comparison

2. **Custom Template Builder**
   - Drag-and-drop interface
   - Template editor
   - Save custom templates

3. **Template Library**
   - More pre-built templates
   - Community templates
   - Import/export functionality

4. **A-Level Template**
   - Complete implementation of Template 4
   - UACE-specific features
   - University recommendations

5. **Template Versioning**
   - Save template history
   - Revert to previous versions
   - Template changelog

---

## 📊 Template Selection Statistics

### Current Template Usage (Example):

**Primary Schools:**
- Template 1 (Classic): 60%
- Template 2 (Modern): 25%
- Template 3 (Detailed): 15%

**Secondary Schools:**
- Template 1 (O-Level): 70%
- Template 2 (Kasozi): 20%
- Template 3 (Kyotera): 10%

---

## 🧪 Testing Templates

### How to Test:

#### For Primary Schools:
1. Login as admin of a Nursery/Primary school
2. Navigate to Reports → Generate Reports
3. Select a class (e.g., P.5)
4. Check template dropdown shows:
   - "Primary School Templates"
   - Primary Template 1, 2, 3

5. Generate report with each template
6. Verify format is appropriate for primary level

#### For Secondary Schools:
1. Login as admin of a Secondary school
2. Navigate to Reports → Generate Reports
3. Select a class (e.g., S.3)
4. Check template dropdown shows:
   - "Secondary School Templates"
   - Secondary Template 1, 2, 3

5. Generate report with each template
6. Verify O-Level formatting, aggregates, etc.

---

## 🔒 Template Access Control

### Who Can Access What:

**Primary School Users:**
- ✅ See Primary templates only
- ❌ Cannot see Secondary templates
- ✅ Can create custom templates
- ✅ Templates auto-selected based on school type

**Secondary School Users:**
- ❌ Cannot see Primary templates
- ✅ See Secondary templates only
- ✅ Can create custom templates
- ✅ Templates auto-selected based on school type

**System Admins (Owner Role):**
- ✅ Can see all templates
- ✅ Can modify template configurations
- ✅ Can add new templates

---

## 📝 Template Naming Convention

### Standard Format:
```
[SchoolType] Template [Number] - [Description]
```

### Examples:
- ✅ `Primary Template 1 - Classic`
- ✅ `Secondary Template 2 - Kasozi Style`
- ❌ `Template 1` (missing school type)
- ❌ `O-Level Report` (ambiguous)

---

## 🎯 Benefits of Template Differentiation

### For Primary Schools:
- ✅ Age-appropriate designs
- ✅ Simplified grading systems
- ✅ Focus on foundational skills
- ✅ Parent-friendly language

### For Secondary Schools:
- ✅ Exam-compliant formats
- ✅ Aggregate calculations
- ✅ UCE/UACE standards
- ✅ University preparation

### For Development:
- ✅ Independent customization
- ✅ No breaking changes risk
- ✅ Clear separation of concerns
- ✅ Easier maintenance

### For Schools:
- ✅ Relevant templates only
- ✅ Appropriate formats
- ✅ Professional results
- ✅ Compliance assurance

---

## 🐛 Troubleshooting

### Issue: Wrong templates showing

**Problem:** Secondary school sees Primary templates

**Solution:**
1. Check `schools.type` in database
2. Should be exactly `'Secondary'` (case-sensitive)
3. Verify router logic in `page.tsx`

### Issue: Template names not updating

**Problem:** Still seeing old template names

**Solution:**
1. Hard refresh browser (Ctrl+F5)
2. Clear browser cache
3. Check import paths in component
4. Verify template config file saved

### Issue: Template not generating

**Problem:** Report generation fails

**Solution:**
1. Check browser console for errors
2. Verify template value being passed
3. Ensure API routes support template
4. Check PDF/DOCX generation logs

---

## 📞 Support & Requests

When requesting template changes or reporting issues:

### Include:
1. **School Type:** Primary or Secondary
2. **Template Number:** 1, 2, or 3
3. **Specific Change:** What you want modified
4. **Example/Screenshot:** If applicable
5. **Classes Affected:** Which classes use this

### Format:
```
School Type: Secondary
Template: Template 1 - O-Level Format
Change Needed: Add aggregate for best 8 subjects
Classes: S.3 and S.4
Reason: UCE compliance requirement
```

---

**Implementation Date:** October 12, 2025  
**Status:** ✅ Complete and Production Ready  
**Next Phase:** Template content customization


