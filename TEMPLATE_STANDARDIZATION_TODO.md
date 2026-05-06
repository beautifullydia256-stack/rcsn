# Nursery Template Standardization - Work in Progress

## Objective
Standardize all nursery templates (8, 9, 10, 11, 12) to have the same header and student details design as Template 7 (Junior Nursery Report Template).

## Template 7 Reference Design

### Header Structure:
- Logo: 132px x 132px, positioned absolute left, no border
- School info: Centered, margin-left: 132px
- School name: 20pt, bold, uppercase, Forest Green (#006b4d for Template 7, adapt color per template)
- Report title: 14pt, bold, underlined

### Student Details Structure:
- Flexbox layout with 2-column grid on left + photo box on right
- Photo box: 2.1cm x 2.9cm, no border
- Grid: 2 columns, displays student information with bold labels
- Background: Light color (#f8fafc for Template 7, adapt per template)
- Border: 1px solid with border-radius: 8px

## Completed:
✅ Template 7 - Logo and photo borders removed
✅ Template 9 - Header and student details standardized

## Remaining Work:

### Template 8 (Detail Colour Marks Report Template)
- Currently: Circular logo (60px), centered header
- Needs: Standardize to Template 7 header/student details layout
- Keep: Skills grid and color legend (unique to this template)

### Template 10 (Excellent Nursery Clean Template)
- Currently: 80px logo with border, 3-column student info grid
- Needs: Standardize to Template 7 header/student details layout
- Keep: Learning areas table and activities section

### Template 11 (Simple Nursery Template)
- Currently: 80px logo with border, different student info layout
- Needs: Standardize to Template 7 header/student details layout
- Keep: Activities list with illustrations

### Template 12 (Modern Nursery Template)
- Currently: 80px logo with border, different student info layout
- Needs: Standardize to Template 7 header/student details layout
- Keep: Learning areas with positions

## Implementation Notes:
1. Each template should keep its unique content sections (tables, grids, etc.)
2. Only header and student details sections need standardization
3. Color schemes can vary per template but structure should match Template 7
4. Logo size: 132px x 132px (no border)
5. Student photo: 2.1cm x 2.9cm (no border)

## Files to Update:
- `src/templates/nursery/generators.ts` - Update CSS and HTML for Templates 8, 10, 11, 12
- Tests may need updates if they check for specific styling
