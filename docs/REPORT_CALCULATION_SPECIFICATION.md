# Report Calculation Specification

This document defines the **exact report calculation formulas** used across the Web, Android, and Windows apps. All three platforms MUST implement these rules so report results are identical.

**Related:** [MASTER_ARCHITECTURE_DIRECTIVE.md](./MASTER_ARCHITECTURE_DIRECTIVE.md) §1.1 (Consistency requirement).

---

## 1. Primary grades (D1–F9)

Used for primary-level subject grades on reports.

| Percentage (min) | Percentage (max) | Grade | Remark |
|------------------|------------------|-------|--------|
| 75 | 100 | D1 | Pass |
| 70 | 74 | D2 | Pass |
| 65 | 69 | C3 | Pass |
| 60 | 64 | C4 | Pass |
| 55 | 59 | C5 | Pass |
| 50 | 54 | C6 | Pass |
| 45 | 49 | P7 | Pass |
| 40 | 44 | P8 | Pass |
| 0 | 39 | F9 | Fail |

**Formula:** `percentage = (marks_obtained / total_marks) * 100`. If `total_marks <= 0`, use grade **F9** and remark **Fail**. Otherwise find the row where `percentage >= min` and `percentage <= max`; use that grade and remark (Pass for all except F9).

**Boundaries:** Inclusive on both ends (e.g. 75.0 → D1, 74.99 → D2).

---

## 2. Uganda secondary grade scale (A–E)

Used for aggregate calculation and secondary-level grading.

| Percentage (min) | Percentage (max) | Grade | Points |
|------------------|------------------|-------|--------|
| 80 | 100 | A | 6 |
| 70 | 79 | B | 5 |
| 60 | 69 | C | 4 |
| 50 | 59 | D | 3 |
| 0 | 49 | E | 1 |

**Formula:** Same as primary: `percentage = (marks_obtained / total_marks) * 100`. If `total_marks <= 0`, treat as 0% → E (1 point). Map percentage to grade/points using the table above (inclusive boundaries).

---

## 3. Division (from average percentage)

Used for overall performance division on primary reports.

| Average % (min) | Division |
|-----------------|----------|
| 80 | Division 1 |
| 60 | Division 2 |
| 40 | Division 3 |
| 20 | Division 4 |
| &lt; 20 | Ungraded |

**Formula:** Given a single average percentage (e.g. mean of subject percentages):

- `average >= 80` → **Division 1**
- `average >= 60` → **Division 2**
- `average >= 40` → **Division 3**
- `average >= 20` → **Division 4**
- else → **Ungraded**

---

## 4. Aggregate (Uganda secondary points)

Used when combining multiple subjects into one aggregate score (average of grade points).

**Formula:**

1. For each subject result: compute `percentage = (marks_obtained / total_marks) * 100` (use `total_marks = 100` if missing or zero).
2. Map each percentage to points using the Uganda secondary scale (§2): A=6, B=5, C=4, D=3, E=1.
3. **Aggregate = sum(points) / count(subjects)**. If there are no subjects, aggregate = 0.

So aggregate is the **mean of the grade points**, not the sum.

---

## 5. Class position

- **Definition:** Position 1 = best performance in the class, higher numbers = lower performance.
- **Ordering:** Sort students in the **same class** by **average percentage** (descending). Ties: same average → same position; next distinct position = number of students ahead + 1 (e.g. two students tie for 1st → both position 1, next student position 3).
- **Missing data:** If a student has no exam results (or no valid average), treat average as 0 for sorting; they rank last. Position is 1-based (1st, 2nd, 3rd, …).

**Scope:** Class position MUST be computed against the **full class** (all students in that class with results for the same exam set), even when previewing a single student. All platforms must use the same rule so positions match.

---

## 6. Stream position (optional)

- Same as class position but restricted to students in the same **stream** (e.g. derived from class name like S1A, S1B). If stream cannot be determined or has no peers, return null.

---

## 7. Attendance percentage

**Simple definition (for spec consistency):**

- `attendance_percentage = (present_days / total_school_days) * 100`, rounded to integer.
- **present_days:** Count of attendance records where `present === true` (or status equivalent to present) within the period.
- **total_school_days:** Number of weekdays (Monday–Friday) between the **first attendance date** for the class (or term) and the **last school day** used for the report (e.g. last exam set activation date for that term).
- If `total_school_days <= 0` or no attendance data, attendance percentage is **null** (or 0 when a number is required).

**Attendance remark (optional display):**

- `>= 95` → Excellent  
- `>= 85` → Very Good  
- `>= 75` → Good  
- `>= 65` → Fair  
- else → Poor  

---

## 8. Performance remark (optional display)

Free-text remark from average percentage:

- `>= 80` → Outstanding performance. Keep up the excellent work!
- `>= 70` → Very good performance. Continue working hard.
- `>= 60` → Good performance. There is room for improvement.
- `>= 50` → Satisfactory performance. More effort needed.
- `>= 40` → Below average performance. Significant improvement required.
- else → Poor performance. Immediate attention and support needed.

---

## 9. Implementation references

- **Web:** `src/lib/reportUtils.ts` (calculatePrimaryGrade, calculateGrade, calculateDivision, calculateAggregate, getClassPosition, getStreamPosition, calculateAttendancePercentage, getAttendanceRemark, getPerformanceRemark).
- **Kotlin (Desktop/Android):** Shared report module `GradeCalculator`, `AggregateCalculator`, `PositionCalculator`; and `ReportUtils.kt` until fully replaced — all must follow this spec.

Any change to formulas MUST be updated here first, then applied on all platforms.
