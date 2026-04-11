# UACE (A-Level) — logic recap & implementation plan (Senior 5–6)

This document is the **implementation roadmap** for PwezaCore. The numeric detail matches what you specified for **Uganda A-Level (UACE)**. The normative product spec remains **[UACE_ALEVEL_GRADING_LOGIC.md](./UACE_ALEVEL_GRADING_LOGIC.md)**; this file adds **phased delivery** and **engineering checklists**.

---

## Part A — Logic you want (source of truth for behaviour)

### A1. Grades and points (per subject, after marks → grade)

| Grade | Points | Meaning |
|-------|--------|---------|
| **A** | 6 | Excellent |
| **B** | 5 | |
| **C** | 4 | |
| **D** | 3 | |
| **E** | 2 | Minimum pass |
| **O** | 1 | Subsidiary pass |
| **F** | 0 | Fail |

### A2. Principal vs subsidiary subjects

- **Principal (main):** usually **3** subjects (e.g. Physics, Chemistry, Mathematics).  
  - Each principal contributes **up to 6** points.  
  - **Maximum from principals: 18** (6 + 6 + 6).

- **Subsidiary:** e.g. **General Paper**, **Subsidiary Mathematics** (when applicable).  
  - In your model, subsidiaries contribute **up to O (1 point)** each.  
  - **Maximum from typical two subsidiaries: 2** (1 + 1).

- **Grand total ceiling:** **18 + 2 = 20** points.

**Example**

| Subject   | Grade | Points |
|-----------|-------|--------|
| Physics   | A     | 6      |
| Chemistry | B     | 5      |
| Math      | C     | 4      |
| GP        | O     | 1      |
| Sub Math  | O     | 1      |
| **Total** |       | **17** |

**Admission context (product, not a hard rule in code):** universities often emphasise the **three principal** grades (out of 18); subsidiaries matter per programme.

### A3. Where grades come from (marks → grade)

Flow you described:

1. Student sits **papers** (Paper 1, Paper 2, …); each has a **raw %**.  
2. UNEB (or school internal policy) **combines** papers with **weights** → **final subject %**.  
3. Final % is mapped to a **letter grade** → then **points**.

**Typical % → grade bands** (UNEB may adjust year to year — treat as **default**; optional later: per-year configurable bands):

| Final % (subject) | Grade | Points |
|-------------------|-------|--------|
| 80–100            | A     | 6      |
| 70–79             | B     | 5      |
| 60–69             | C     | 4      |
| 50–59             | D     | 3      |
| 45–49             | E     | 2      |
| 40–44             | O     | 1      |
| Below 40          | F     | 0      |

**Example (Chemistry):** papers 65%, 72%, 68% → weighted final (e.g. **68%**) → **60–69** → **C** → **4** points.

### A4. Simple summary for implementers

- **Marks (per paper)** → **weighted final %** (per subject) → **grade** → **points**.  
- **Principal line:** sum of **three** principal subjects → **out of 18**.  
- **Add subsidiaries** → **out of 20**.  
- **Never** use **primary D1–F9** scales for Senior 5–6 subject grades in this model.

---

## Part B — Current codebase alignment (snapshot)

Use this to avoid rework:

| Area | Status / notes |
|------|----------------|
| **% → letter (default bands)** | **Postgres:** `uace_default_grade_from_percent` / `uace_default_points_from_grade`; **App:** `calculateUacePrincipalGradeFromMarks` in `src/lib/reportUtils.ts`. Keep in sync. `teacher_upsert_exam_result_alevel` writes `grade` and `uace_points` from marks/total. |
| **Teacher grid (legacy + draft)** | A-Level marks entry uses UACE letters; exam entry UI shows read-only band table + note about future per-school ranges. |
| **Per-paper rows** | `exam_results` supports `paper_code` / `paper_number`; uniqueness and “one row per paper” vs “aggregate row” must stay consistent with RPCs. |
| **Student programme** | `student_alevel_subjects` (and admin UI) drives which students sit which subjects. |
| **Principal vs subsidiary role** | Need explicit **subject role** (or catalogue flag) to enforce **subsidiary max O** and correct **point caps** in aggregations. |

---

## Part C — Implementation plan (phased)

### Phase 1 — Core library (pure functions, testable)

**Goal:** One place for “business rules” used by UI, APIs, and reports.

1. **`gradeFromUacePercent(percent: number): { grade, points }`**  
   - Implements **A3** (already largely present via `calculateUacePrincipalGradeFromMarks`; consider renaming or wrapping for clarity).  
2. **`pointsFromGrade(grade: string): number`**  
   - Implements **A1** (A=6 … F=0, O=1).  
3. **`uaceSubjectRole(subjectIdOrCode): 'principal' | 'subsidiary'`**  
   - Backed by DB or static UACE catalogue (`docs/UACE_SUBJECT_CATALOG.md` / migrations).  
4. **Subsidiary rule:** for `role === 'subsidiary'`, after computing grade from %, **cap displayed/stored points at 1** and **clamp grade** to **O or F** (confirm with you whether **E** can ever apply on a sub — default: **O/F only**).  
5. **Unit tests** for boundaries (79.99 → B, 40 → O, 39.99 → F, etc.).

### Phase 2 — Data model & migrations

**Goal:** Persist everything needed for papers, grades, points, and roles.

1. Ensure **A-Level** `exam_results` rows can represent:  
   - per-paper **%**, optional **aggregated final %**, **grade**, **points**, **paper** identifiers.  
2. Add or confirm columns if missing: e.g. **`uace_points`** (integer0–6 principal, 0–1 sub), **`subject_role`** or join to subject catalogue.  
3. **Constraints / checks:** allowed `grade` values for Senior 5–6: **A,B,C,D,E,O,F** (not D1–F9).  
4. **Backfill job (optional SQL):** recompute `grade`/`points` from stored marks for existing Senior 5–6 rows that still show primary grades.

### Phase 3 — Teacher exam entry (Senior 5–6)

**Goal:** Entry matches **A3** and paper structure.

1. **Per paper:** enter % per paper line; show **running / final aggregated %** when weights exist.  
2. **If only one mark column** (current): treat as **final subject %** out of 100; still map with **A3**.  
3. **Save path:** RPC `teacher_upsert_exam_result_alevel` (or successor) writes **grade + points** consistent with role (principal vs subsidiary).  
4. **UI copy:** brief note that bands are **typical**; school may align to UNEB notices per year.

### Phase 4 — Aggregation & dashboards

**Goal:** **18 + 2 = 20** model visible per student/exam.

1. **Principal subtotal:** sum points for subjects flagged **principal** (expect 3; handle missing subjects gracefully).  
2. **Subsidiary subtotal:** sum points for **subsidiary** subjects (cap each at 1).  
3. **Display:** “Principals: X / 18”, “Subsidiaries: Y / 2”, “Total: Z / 20”.  
4. **University-focused view (optional):** “Best 3 principals” / “Principal sum only” — **reporting only**, unless you want it as the default headline.

### Phase 5 — Reports & exports

**Goal:** Report cards and PDFs show **UACE letters and points**, not primary divisions.

1. Map internal storage → template fields (handle legacy **D1/F9** display codes only as **print aliases**, not as stored exam grades).  
2. Regenerate pipelines that still recompute grades from **primary** scales.

### Phase 6 — Configurable bands (optional, later)

1. Admin or migration: **per academic year** min/max % per grade (when UNEB shifts boundaries).  
2. `gradeFromUacePercent` reads from config with fallback to **A3** defaults.

---

## Part D — Decisions to confirm before Phase 2–4

1. **Subsidiary letter cap:** Strict **O/F only** from %, or allow **E** in edge cases?  
2. **Weighted aggregation:** Who defines paper weights — **per school**, **per subject**, or **single national default**?  
3. **Single mark vs multi-paper:** Until weights exist, is **one column = final %** acceptable for all schools?  
4. **Historical data:** One-off **SQL backfill** vs **re-save from teachers only**?

---

## Part E — Definition of done (MVP)

- [ ] Senior 5–6 subject grades are **never** computed with **primary D1–F9** rules.  
- [ ] Stored grades are **A–F + O**; points match **A1**.  
- [ ] Subsidiary subjects **cannot** contribute more than **1 point** each in totals.  
- [ ] Student totals show **principal /18** and **overall /20** where data exists.  
- [ ] Docs: this plan + [UACE_ALEVEL_GRADING_LOGIC.md](./UACE_ALEVEL_GRADING_LOGIC.md) stay in sync when rules change.

---

*Plan drafted for implementation; align Phase 2–4 with your answers in Part D.*
