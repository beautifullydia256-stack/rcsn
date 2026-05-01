# Nursery Old Format Implementation

## Overview
Implemented a dual-format system for nursery reports:
- **Latest Format** (default): Holistic ratings (Very Good, Good, Needs Improvement, Tries)
- **Old Format**: Marks-based system like Primary 1-7 (percentages and grades)

## Changes Made

### 1. Exam Results Input Page (`src/pages/teacher/exam-results/LegacyExamResultsFullPage.tsx`)

#### Added Format Selector
- New UI section appears after exam set selection (only for nursery classes)
- Two options:
  - **Latest** (default): Holistic Ratings
  - **Old**: Marks-based (Percentages like Primary 1-7)
- Format choice is stored in `nurseryReportFormat` state variable

#### Modified Input UI
- **Latest Format**: Shows holistic rating buttons (Very Good, Good, Needs Improvement, Tries)
- **Old Format**: Shows marks input fields (0-100) with automatic grade calculation
- Input UI dynamically switches based on selected format

### 2. Report Template (`src/components/reports/templates/primaryReportTemplates.tsx`)

#### Added Subject Name Mapping Function
```typescript
function mapNurserySubjectForOldFormat(subjectName: string): string
```
Maps database names to display names for Old format:
- "Relating with others" → "Learning Area 1"
- "Relating and knowing environment" → "Learning Area 2"
- "Taking care of myself" → "Learning Area 3"
- "Mathematics and Concepts" → "Learning Area 4"
- "Development and using my language" → "Learning Area 5"

**Note**: Database names remain unchanged - only display names change in Old format template.

#### Created New Template: `Template2OldNurseryReport`
- Marks-based table structure matching the old nursery format
- Columns: SUBJECT | EXAM MARKS OBTAINED OUT OF | EXAM AGG | AGG. GRADE | REMARKS | INITIALS
- Automatic percentage calculation
- Grade calculation based on percentage (D1-F9 scale)
- Filters out "Gen. Knowledge" subject
- Uses mapped subject names (Learning Area 1-5)
- Average percentage calculation
- Same header/footer styling as Latest format

## Data Storage Strategy

### Two Separate Data Systems
1. **Latest Format Data**:
   - Uses `nursery_skill_performance` JSON field
   - Stores holistic ratings for each skill
   - Existing system (no changes needed)

2. **Old Format Data**:
   - Uses standard `marks_obtained` and `total_marks` fields
   - Stores numerical marks (0-100)
   - Same storage as Primary 1-7 classes
   - Needs NEW storage implementation (not yet implemented)

### Format Detection
- Format is determined at **exam input time** (not report generation)
- Cannot mix formats for the same exam set
- Report generation will auto-detect format from data structure

## Comment System Differences

### Latest Format Comments
- Based on **performance level** (Very Good, Good, etc.)
- Uses `class_teacher_nursery_comment_settings` table
- Uses `headteacher_nursery_comment_settings` table

### Old Format Comments
- Based on **average percentage**
- Uses `class_teacher_comments_settings` table (same as Primary 1-7)
- Uses `headteacher_comments_settings` table (same as Primary 1-7)

## Teacher Workflow

### Input Exam Results
1. Select Exam Set
2. **Select Report Format**: "Latest" (default) or "Old"
3. Select Subject/Learning Area
4. Input data based on format:
   - Latest: Click rating buttons
   - Old: Enter marks (0-100)
5. Save results

### Generate Reports
- No manual format selector needed
- System auto-detects format from data
- If Old format data exists → uses Old template
- If Latest format data exists → uses Latest template

## Next Steps (Not Yet Implemented)

### 1. Database Storage for Old Format
- Decide on storage approach:
  - Option A: Add `nursery_report_format` flag to exam results
  - Option B: Create new table for old format data
  - Option C: Use existing marks fields with format indicator

### 2. Save Functionality
- Modify save functions to handle Old format data
- Store marks in appropriate database fields
- Include format indicator with saved data

### 3. Report Generation Integration
- Add format detection logic in report generation
- Route to correct template based on detected format
- Implement in both admin and teacher report generation pages

### 4. Comment Resolution
- Implement percentage-based comment lookup for Old format
- Use existing Primary 1-7 comment settings
- Ensure comments are fetched from correct tables

## Files Modified
1. `src/pages/teacher/exam-results/LegacyExamResultsFullPage.tsx`
   - Added format selector UI
   - Modified nursery input section to support both formats

2. `src/components/reports/templates/primaryReportTemplates.tsx`
   - Added `mapNurserySubjectForOldFormat()` function
   - Created `Template2OldNurseryReport` component

## Testing Checklist
- [ ] Format selector appears only for nursery classes
- [ ] Default format is "Latest"
- [ ] Input UI switches correctly between formats
- [ ] Old format shows marks input (0-100)
- [ ] Latest format shows rating buttons
- [ ] Subject names map correctly in Old format
- [ ] "Gen. Knowledge" is filtered out in Old format
- [ ] Percentage calculation is accurate
- [ ] Grade calculation follows D1-F9 scale
- [ ] Average percentage displays correctly
- [ ] Template renders without errors
- [ ] Save functionality works (pending implementation)
- [ ] Report generation detects format (pending implementation)
- [ ] Comments resolve correctly for each format (pending implementation)
