# Uganda A-Level (UACE) — grading & points logic (product spec)

**Status:** Authoritative reference for fixing how **Senior 5–6** results are **saved**, **graded**, and **aggregated** in PwezaCore.  
**Note:** Report card **display** (e.g. template samples) may show school-specific letter codes; **this doc** is the **core UACE points model** you specified.

---

## 1. Grade → points (per subject)

| Grade | Points | Meaning (your wording) |
|-------|--------|-------------------------|
| **A** | 6 | Excellent |
| **B** | 5 | |
| **C** | 4 | |
| **D** | 3 | |
| **E** | 2 | Minimum pass |
| **O** | 1 | Subsidiary pass |
| **F** | 0 | Fail |

---

## 2. Principal vs subsidiary subjects

- **Principal subjects (main):** typically **3** (e.g. Physics, Chemistry, Mathematics).  
  - Each can score up to **6** points.  
  - **Maximum from principals:** **18** points.

- **Subsidiary subjects:** e.g. **General Paper (GP)**, **Subsidiary Mathematics** (when applicable).  
  - Graded up to **O (1 point)** each in your model (subsidiary band).  
  - **Maximum from subsidiaries (GP + Sub Math):** **1 + 1 = 2** points.

- **Total maximum UACE points (your model):** **18 + 2 = 20** points.

**Example (your numbers):**

| Subject        | Grade | Points |
|----------------|-------|--------|
| Physics        | A     | 6      |
| Chemistry      | B     | 5      |
| Math           | C     | 4      |
| GP             | O     | 1      |
| Sub Math       | O     | 1      |
| **Total**      |       | **17** |

**University admission (context):** often only the **three principal** grades/points (out of 18) matter most; subsidiaries matter per programme rules.

---

## 3. From marks (%) to letter grade (approximate bands)

You described **typical** percentage → grade mapping (UNEB may adjust year to year):

| Final % (aggregated subject score) | Grade | Points |
|------------------------------------|-------|--------|
| 80–100%                            | A     | 6      |
| 70–79%                             | B     | 5      |
| 60–69%                             | C     | 4      |
| 50–59%                             | D     | 3      |
| 45–49%                             | E     | 2      |
| 40–44%                             | O     | 1      |
| Below 40%                          | F     | 0      |

**Multi-paper subjects:** student sits **Paper 1, Paper 2, …** (each with raw **%**). UNEB (or school internal policy) **combines** papers with weights → **final subject %** → **grade** → **points**.

**Example (your Chemistry narrative):** papers 65%, 72%, 68% → weighted average ≈ **68%** → **60–69** → **C** → **4** points.

---

## 3b. Authoritative default % → grade (PwezaCore)

For the **default** national-style bands (before per-school overrides exist), the **same** thresholds must be implemented in:

- **Postgres:** `public.uace_default_grade_from_percent` and `public.uace_default_points_from_grade` (migration `20260602120000_uace_default_grade_server_exam_points.sql`). `teacher_upsert_exam_result_alevel` sets `exam_results.grade` and `exam_results.uace_points` from marks/total using these functions.
- **App:** `calculateUacePrincipalGradeFromMarks` in `src/lib/reportUtils.ts` (teacher grid preview).

**Future:** per-school UACE % bands will use `teacher_exam_grade_bands` with `scale_kind = 'uace'` (reserved); until then, all schools use the default above.

---

## 4. Implementation implications (for engineering)

1. **Storage:** For A-Level we need at least: **subject role** (principal vs subsidiary), **per-paper marks (%)** or pre-aggregated **final %**, **final grade** (A–F, O), **points** (0–6 for principals; subsidiaries capped at **1** in your rules), and **totals** (principal sum /18, **grand total /20**).
2. **Uniqueness:** Current **`exam_results`** unique key is **`(exam_set_id, student_id, subject)`** — **not** sufficient for **multiple papers** under one subject without **`paper_number`** in the key or one row per paper with composite `subject` naming.
3. **Subsidiary cap:** Logic must enforce **subsidiary** subjects only receiving **O or F** (or your school’s equivalent) for **point contribution** — clarify if **E** can appear on a sub in edge cases.
4. **UI:** A-Level grid today may use **primary-style** `marks_obtained` / 100 — replace with **UACE-aware** entry (papers + aggregation + grade/points).
5. **Configurable bands:** Optionally store **min/max %** per grade per school year (UNEB adjustment) instead of hard-coding only the table above.

---

## 5. Relation to sample **Alevel** PDF (Gangu)

The sample showed codes like **F9**, **D1**, **PB** — treat as **school report display** or legacy codes; **this document** defines the **target UACE letter + points** model for **correct saving**. Mapping tables can translate **internal mark/grade** ↔ **UNEB-style** for print.

---

*Recorded from product owner spec, 2026-04-07.*
