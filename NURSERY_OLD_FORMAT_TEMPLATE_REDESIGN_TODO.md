# Nursery Old Format Template Redesign - TODO

## Current Status
✅ **Format detection is now working correctly!**
- Latest format (colors) shows correct template
- Old format (numbers) shows Old format template
- Console log confirms: `🎯 Template Router: Auto-detected LATEST format (has nursery_skill_performance)`

## Next Task: Redesign Old Format Template

### User Requirements:
1. **Match Primary 1 report card design** (not the colorful nursery style)
2. **Remove blue gradient backgrounds** - use simple white/light backgrounds
3. **Remove grading scale table** (D1-F9 reference table)
4. **Keep same sections as Primary 1**:
   - Header section (school info)
   - Student details section
   - Subjects table
   - Summary section
   - Comments section
   - Next term section
5. **Table design should match Primary 1** but with nursery-specific columns

### Current Template Issues:
- Uses colorful gradients (blue, pink, yellow)
- Has rounded corners and shadows everywhere
- Uses "kidsFontStack" (Comic Sans style)
- Table has too many decorative elements
- Grading scale section exists (needs removal)

### Target Design (Primary 1 Style):
- Clean, professional look
- Simple borders (1px solid #cbd5e1)
- White/light gray backgrounds
- Standard fonts (Calibri, Arial)
- Minimal shadows
- Flat design

### Template Location:
**File**: `src/components/reports/templates/primaryReportTemplates.tsx`
**Function**: `Template2OldNurseryReport` (lines 1130-1550)

### Changes Needed:

#### 1. Header Section
**Current**: Colorful with large logo, rounded corners
**Target**: Simple header like Primary 1 with border-bottom

#### 2. Student Info Section
**Current**: Gradient background box with rounded corners
**Target**: Simple table with alternating row colors (like Primary 1)

#### 3. Subjects Table
**Current**:
- Columns: SUBJECT | EXAM MARKS OBTAINED OUT OF | EXAM AGG | AGG. GRADE | REMARKS | INITIALS
- Blue gradient wrapper
- Dark blue header (#1e3a8a background)

**Target**:
- Columns: LEARNING AREA | MARKS | GRADE | TEACHER'S REMARKS | INITIALS
- Light blue header (bg-blue-100/70)
- Simple borders (border-blue-100)
- Alternating row colors (white / bg-blue-50/35)

#### 4. Summary Section
**Current**: Gradient green box with rounded corners
**Target**: Simple box with light background (bg-blue-50/30)

#### 5. Comments Section
**Current**: Gradient pink/blue box
**Target**: White box with simple border (border-blue-100)

#### 6. Next Term Section
**Current**: Gradient green box
**Target**: Light green box (bg-green-50/50) with simple border

### Implementation Plan:

1. **Remove all gradient backgrounds**
   - Replace with solid colors or light tints
   
2. **Simplify borders**
   - Remove thick borders (4px → 1px)
   - Remove border-radius on most elements
   - Use consistent border color (border-blue-100)

3. **Change fonts**
   - Remove kidsFontStack
   - Use: `fontFamily: "'Calibri', 'Arial', sans-serif"`

4. **Simplify table**
   - Use Tailwind classes like Primary 1
   - Remove inline styles where possible
   - Match Primary 1 table structure

5. **Remove decorative elements**
   - Remove box-shadow
   - Remove z-index layers
   - Remove innerPaperStyle wrapper

6. **Update column headers**
   - "SUBJECT" → "LEARNING AREA"
   - Remove "EXAM AGG" column
   - Simplify "EXAM MARKS OBTAINED OUT OF" → "MARKS"

### Code Structure:

```typescript
function Template2OldNurseryReport({ student, examSet, school }) {
  // Remove kidsFontStack, innerPaperStyle
  // Keep calculateGrade, filteredResults, averagePercentage logic
  
  return (
    <div style={{ 
      fontFamily: "'Calibri', 'Arial', sans-serif",  // Changed
      width: '210mm',
      minHeight: '297mm',
      padding: '15mm',  // Simplified
      backgroundColor: '#ffffff',
      color: '#1f2937'
    }}>
      {/* Simple header with border-bottom */}
      {/* Student info as simple table */}
      {/* Subjects table matching Primary 1 style */}
      {/* Simple summary box */}
      {/* Simple comments box */}
      {/* Simple next term box */}
    </div>
  );
}
```

### Testing:
1. Save Old format data for a nursery student
2. Generate report
3. Verify it looks like Primary 1 style (clean, professional)
4. Verify all data displays correctly
5. Test PDF generation

### Priority: HIGH
User specifically requested this redesign to match Primary 1 style.

## Current Fixes Completed:
✅ Format detection priority fixed (checks nursery_skill_performance FIRST)
✅ Debug logging added to identify data structure issues
✅ Latest format now shows correct colorful template
✅ Old format detection working correctly

## Next Steps:
1. Push current fixes to git
2. Implement template redesign
3. Test with real data
4. Push redesigned template
