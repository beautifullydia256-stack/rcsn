# Plan: Rewrite Nursery Old Format to Match Lower Primary EXACTLY

## Problem
Current Template2OldNurseryReport doesn't match lower primary template at all.

## Solution
Copy Template3 (Lower Primary) EXACTLY, only change the subjects table.

## What to Copy from Template3:
1. ✅ Header (logo, school name, address, motto, divider)
2. ✅ Student info section (grid layout with photo)
3. ✅ Summary section (3 boxes: Total Marks, Class Position, Attendance)
4. ✅ Comments section
5. ✅ Grading system section
6. ✅ Footer

## What to Change:
**ONLY THE SUBJECTS TABLE**:
- Remove MID TERM and END OF TERM columns
- Keep: SUBJECT | FULL MARKS | MARKS | TEACHER'S REMARKS | INITIALS
- Add small images (32px) next to subject names
- Map nursery subjects to images:
  - Relating with others → sharing.png
  - Relating and knowing environment → colours.png
  - Taking care of myself → toilet.png
  - Development and using mathematical concepts → recognition_of_numbers.png
  - Development and using language → drawing.png

## Implementation:
Delete current Template2OldNurseryReport completely and replace with Template3 copy + modified table.
