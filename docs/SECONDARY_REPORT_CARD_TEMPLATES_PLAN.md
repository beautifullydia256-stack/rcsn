# Secondary report card templates — living implementation plan



This document is the **single source of truth** for rebuilding secondary (O-Level / A-Level) report layouts.  

**Systematic delivery order** (what to do first, gates, and Supabase SQL **one query at a time**): [SECONDARY_REPORT_MASTER_PLAN.md](./SECONDARY_REPORT_MASTER_PLAN.md).

**A-Level papers (S.5–S.6):** Schools configure **single vs multi-paper** subjects, **official paper codes** (e.g. P250/1), and **teacher-per-paper** — see master plan **§1b** (not inferred only from `uace_subject_catalog` names).

**Update rule:** Each time you send a sample (image/PDF/mockup), we append or refine the matching section below so nothing is lost.



**Canonical names**  

- **Standard** = O-Level sample (multi-page **PDF**, ECS-style layout). Repo: `standard-template.pdf`.  

- **Basic** = O-Level sample (single-page **scan/image**, St. Adrian Kasozi–style grid). Repo: `basic-template.png`.  

- **Progressive** = O-Level sample (single-page **scan/image**, end-of-term **progressive** layout with **C1/C2** columns; provenance on file is Kyotera Parents SS). Repo: `progressive-template.png`.  

- **Alevel** = A-Level sample **S.5–S.6** (single-page image: **Gangu SS** academic report — graphs + multi-paper subject table + Zoraki QR). Repo: `alevel-template.png`.  

**Class band (your rule)**  

- **Senior 1–Senior 4 (S.1–S.4, O-Level):** only **Standard**, **Basic**, and **Progressive** — mapped to **`template1`**, **`template2`**, **`template3`**.  

- **Senior 5–Senior 6 (S.5–S.6, A-Level):** only **Alevel** — **`template4`** (**A-1** slot). Sample **received** (`alevel-template.png`). No O-Level card should be offered for S.5/S.6 once routing is implemented.  

*(Earlier drafts called the PDF “Modern” and briefly saved the image as `standard-template.png`; filenames and §3 titles now match your naming.)*



---



## 1. Design split (non-negotiable)



| Region | Source | Action |

|--------|--------|--------|

| **School header** (logo, name, motto, contact, exam line, etc.) | **Primary report system** (current proven layout) | **Reuse as-is.** Do not copy headers from your sample cards. |

| **Student strip** (photo, name, class, admission, DOB, house, etc.) | **Primary report system** | **Reuse as-is.** |

| **Everything from the first academic table downward** | **Your samples** | **Recreate to match your sample pixel-for-pixel** (tables, grading blocks, remarks, signatures, footnotes, decorative rules, spacing). |



Your samples will **show** headers for context; we **ignore** header design when implementing and only mirror **table + below**.



---



## 2. Template set (target)



| Slot | Level | Code name | Sample received? | Notes |

|------|--------|-----------|------------------|--------|

| **O-1** | O-Level **S.1–S.4 only** | **Standard** | ☑ | `standard-template.pdf` → `template1` |

| **O-2** | O-Level **S.1–S.4 only** | **Basic** | ☑ | `basic-template.png` → `template2` |

| **O-3** | O-Level **S.1–S.4 only** | **Progressive** | ☑ | `progressive-template.png` → `template3` |

| **A-1** | A-Level **S.5–S.6 only** | **Alevel** | ☑ | `alevel-template.png` → `template4` |



Slots map in code as **`template1`–`template4`**: Standard, Basic, Progressive, **Alevel**.



---



## 2b. Inbound batch (1 PDF + 4 images)



When you send files, place them in the repo **or** attach them in chat. Prefer a stable folder, e.g. `docs/secondary-template-samples/`, with clear names.



| # | Format | Your label (required) | File name / path | Maps to slot |

|---|--------|------------------------|------------------|----------------|

| **1** | PDF | **Standard template** | `docs/secondary-template-samples/standard-template.pdf` | **O-1** _(confirm)_ |

| **2** | Image | **Basic template** | `docs/secondary-template-samples/basic-template.png` | **O-2** _(confirm)_ |

| **3** | Image | **Progressive template** | `docs/secondary-template-samples/progressive-template.png` | **O-3** _(confirm)_ |

| **4** | Image | **Alevel** (A-Level S.5–S.6) | `docs/secondary-template-samples/alevel-template.png` | **A-1** → **`template4`** |



**Rules for you when sending**  

- For **each** file, state explicitly: **which slot** (O-1, O-2, O-3, or A-1) it defines.  

- If the PDF has **multiple pages**, say whether page 1 is the only layout we copy or if later pages are continuations / different sections.



---



## 2c. How we analyze each artifact (so the plan stays accurate)



**PDF**  

- Note **page size** (assume A4 unless stated).  

- List **each page**: title area (for context only), **where the first marks table starts**, all **tables** and **blocks below** (summary, attendance, comments, signatures).  

- Flag **multi-page** reports: repeated headers vs true “continuation” of one card.  

- Capture **column headers** verbatim (including abbreviations: BOT/MOT/EOT, etc.).  

- Note **typography clues** (bold row labels, ruled boxes) — implementation will match visually, not necessarily the same font file.



**Image** (PNG/JPEG/WebP)  

- Record **orientation** and approximate **aspect** (portrait A4 vs cropped snippet).  

- If the image is a **photo of a paper** (skew, shadow), plan will call out **ambiguities** (crooked lines, cut-off text) and we may ask for a flat scan or crop.  

- Same table/below-table extraction as PDF: **columns L→R**, merged cells, blocks under the table.



**All samples**  

- **Cut line for implementation:** everything **from first subject/results table down** is in scope; **school header + student photo row** come from primary — we still **describe** what appears in the sample below the cut line only, in detail.



---



## 3. Per-template specification (fill in as samples arrive)



### Template: **O-1** — **Standard**



**Sample**  

- **Received:** 2026-04-07  

- **Repo file:** `docs/secondary-template-samples/standard-template.pdf`  

- **Original filename (your Downloads):** `TermReport_ECS-O-2025-0367_2_S.1_WEST_2025_4425_Phoenix (1).pdf`  

- **Hints from filename (not layout):** O-Level context (`ECS-O`), class **S.1**, stream/class label **WEST**, reporting year **2025**; student label **Phoenix**.  

- **Fidelity:** Match the PDF **exactly** from the **first subject/marks table** through the **bottom** (and any continuation pages). **Header + student strip** come from the primary report layouts, not from this PDF.



**PDF inventory** _(fill after visual audit — ~951 KB, multi-page likely)_  

- **Page count:** _TBD (open file and note)_  

- **Page size:** Assume A4 unless we measure otherwise.  

- **Where “results region” starts:** First table after student/meta block _(mark page § + rough position: top third / mid)_  

- **Multi-page behavior:** _TBD — same card continued vs different sections_



**Tables (from sample — verbatim headers L→R)**  

- **Table 1:** _TBD — list every column title as printed (e.g. Subject, M/M, EOT, Total, …)_  

- **Table 2+:** _TBD_  

- **Merged cells / rowspan:** _TBD_  

- **Borders / shading:** _TBD (single/double rules, grey bands, etc.)_



**Below the table(s)**  

- **Summary / aggregates / position / division:** _TBD_  

- **Attendance, conduct, skills, grading keys:** _TBD_  

- **Comments (class teacher / head teacher):** box style, line count, labels _TBD_  

- **Signatures / date / stamp:** _TBD_  

- **Footer / disclaimers / page numbers:** _TBD_



**Data mapping (implementation)** — **Stage C**  

- **Frozen layout detail:** PDF inventory (page count, verbatim headers, multi-page rules) remains _TBD_ until visual audit of `standard-template.pdf` — see **§7.4 (Standard / template1)** for the **data** contract assuming ECS-style columns.  
- **Full contract:** **§7** (*Stage C — Data contract*).  



**Implementation checklist**  

- [ ] Column list and below-table blocks signed off against PDF (visual parity).  

- [ ] HTML/CSS for **table + below** only; header/student block reused from primary.  

- [ ] Preview at A4 width matches sample.  

- [ ] PDF export matches preview.  

- [ ] Picker label: **Standard**; class band **O-Level** (S.1–S.4) unless you map this design to another slot.



---



### Template: **O-2** — **Basic**



**Sample**  

- **Received:** 2026-04-07  

- **Repo file:** `docs/secondary-template-samples/basic-template.png`  

- **Source:** WhatsApp image (scanned/filled **O LEVEL TERMLY REPORT** — St. Adrian Kasozi SS; learner **Kwagala Elijah**; **2022**, **Term Three**).  

- **Artifact:** Single-page **photo/scan** (not flat vector); possible skew, shadows, or obscured text — prefer a flat scan later if any label is ambiguous.  

- **Fidelity:** Match from **first academic/results table** through **bottom** per §1. **School header + student strip** from primary in implementation.



**First academic region — table title (printed above grid)**  

- **LEARNER'S END OF YEAR SUMMATIVE ASSESSMENT RESULTS 2022**



**Main results table (header row L→R)**  

1. **SUBJECT**  

2. **FORMATIVE SCORE (20%)**  

3. **EOY SUMMATIVE ASSESSMENT (80%)**  

4. **TOTAL 100%**  

5. **GRADE**  

6. **LEVEL OF ACHIEVEMENT/3**  

7. **DESCRIPTOR**  

8. **TR'S INITIAL**



**Subject rows (order on sample — 16 rows)**  

English, English Literatrue _(as printed; likely “Literature”)_, Mathematics, Physics, Chemistry, Biology, History & Pol. Educ, Geography, ICT, Entreprenuership _(as printed; likely “Entrepreneurship”)_, Luganda, CRE, Art, Agriculture, Swahili, Physical Education.



**Footer row (within main table)**  

- Label **OVERALL AVERAGE** spanning first **three** columns (per sample layout).  

- Values align under **TOTAL 100%** (**62**), **LEVEL OF ACHIEVEMENT/3** (**2**), **DESCRIPTOR** (**Moderate**) on the sample.



**Summary strip (below main table — three cells)**  

1. **IDENTIFIED** with value **2** (small centred sub-box in left cell on sample).  

2. Italic note: *Overall Learner's achievements for the subjects attended:*  

3. **Moderate** (bold).



**Key to terms used**  

- Section title: **KEY TO TERMS USED** (bold, centred).  

- **Row 1:** empty / dash column + **Learner does not do the subject/was absent**  

- **Row 2:** **0.9-1.49** | **(Basic):** Few learning outcomes achieved but not sufficient for overall learning achievement  

- **Row 3:** **1.5-2.49** | **(Moderate):** Many learning outcomes achieved, enough for overall learning achievement  

- **Row 4:** **2.5-3.00** | **(Outstanding):** Most or all learning outcomes achieved.



**Comments and signatures**  

- **Class Teacher's Comment:** comment line + **Signature** line (sample handwritten).  

- **Head Teacher's Comment:** comment line + **Signature** line; **circular blue school stamp** on sample.



**Footer**  

- **Next Term Begins:** **6TH FEBRUARY 2023** (sample).  

- **Ends On:** line (blank on sample).  

- Centred disclaimer: **This report is not valid without a school stamp**



**Visual / typography (for implementation)**  

- **Black** rules: thin solid borders on tables (sample is a scan; match perceived weight).  

- Table title bold, centred; column headers **bold caps**; subject column left-aligned; scores/grade/descriptor/initials centred.



**Data mapping (implementation)** — **Stage C**  

- **Concrete mapping:** **§7.5 (Basic / template2)**.  
- **Full contract & types:** **§7.1–§7.3**.  



**Implementation checklist**  

- [ ] Column headers and row order signed off against `basic-template.png`.  

- [ ] HTML/CSS for **table + below** only; header/student reused from primary.  

- [ ] Preview matches sample at A4 width.  

- [ ] PDF export matches preview.  

- [ ] Picker label: **Basic**; O-Level **S.1–S.4** unless slot remapped.



---



### Template: **O-3** — **Progressive**



**Sample**  

- **Received:** 2026-04-07  

- **Repo file:** `docs/secondary-template-samples/progressive-template.png`  

- **Source:** WhatsApp image — **KYOTERA PARENTS’ SECONDARY SCHOOL**; report type **END OF TERM ONE STUDENT’S PROGRESSIVE REPORT**; sample learner **KWAGALA ELIJAH**, **S4**, **2025**, stream **EAST**, print date **26/05/2025**; report **No. S418** (top-right on sample).  

- **Artifact:** Single-page scan; **low contrast / hard to read** in places — a **flat scan or crop** may be needed before final CSS parity.  

- **Fidelity:** Match from **first academic/results table** through **bottom** per §1. **School header + student strip** from primary in implementation (sample uses a **red** meta band — we still reuse primary strip visually unless you later require colour cues).



**Above the marks grid (context on sample only)**  

- **School block:** name, P.O. Box / Kyotera address, **TEL** lines, **email** (as printed).  

- **Student strip (red on sample):** **STUDENT'S NAME**, **CLASS**, **YEAR**, **STREAM**, **DATE**, **LIN** (blank on sample).  

- **Report serial:** e.g. **No. S418** (top right).



**Main results table — title (as printed on sample)**  

- **END OF TERM ONE STUDENT'S PROGRESSIVE REPORT** inside a **double-rule box** (verify exact punctuation on PNG).  

- **School crest:** circular logo top-left on sample _(header region — not copied in implementation per §1)._



**Main results table (header row L→R)**  

1. **SUBJECT**  

2. **C1**  

3. **C2**  

4. **AVG SCORE /20** _(label may wrap; full intent: average of continuous assessment out of 20)_  

5. **FINAL EXAM /80**  

6. **TOTAL SCORE 100%**  

7. **IDENTIFIER** _(LO band **1** / **2** / **3** on sample; some schools also show a letter grade in the same cell — confirm per PNG row.)_  

8. **INIT** _(teacher initials / short code)_



**Subject rows (sample shows mix of filled and empty)**  

- **Rows with marks on inventory:** Mathematics, English, Physics, Biology, Chemistry, Geography, History & Political Educ. (may read **HISTORY & POLITICAL EDUC.** on card), Religious Education, ICT.  

- **Rows listed but blank on sample:** Entrepreneurship, Fine Art, Agriculture, Kiswahili, Luganda _(exact subject spellings per PNG)._



**Summary row (foot of main grid)**  

- Labels along the lines of **AVERAGE SCORE** / **PTS (OUT OF 20)** / **IDENTIFIER** with sample values **17** \| **59.1** \| **2** _(layout may merge cells; verify on PNG)._



**Below-grid: overall achievement line**  

- **Overall Learner Achievement:** **Moderate** with **Identifier: 2** _(wording as printed)._



**Learning outcomes key (descriptor table)**  

- **\-** or dash row: **No Learning outcomes achieved (Learner was absent)** _(exact dash vs em-dash per PNG)._  

- **1:** Some LOs achieved but not sufficient for overall achievement — **Basic**.  

- **2:** Most LOs achieved, enough for overall learning achievement — **Moderate**.  

- **3:** All LOs achieved, achievement with ease — **Accomplished**.



**Abbreviation note (on sample)**  

- **LO** = Learning Outcomes.  

- **C1** = Chapter 1 Assessment _(etc. — full footnote line as printed)._



**Letter-grade scale block**  

- **A:** 80+  

- **B:** 70+  

- **C:** 60+  

- **D:** 50+  

- **E:** 0–49



**Footer / admin**  

- **NEXT TERM BEGINS ON:** **26/05/2025** (same date appears in meta on sample — confirm if intentional).  

- **Fees Balance:** **Ugx 0** (shown in **red** on sample).  

- **Class Teacher** and **Head Teacher** signature areas.  

- **Rectangular blue stamp:** “HEADTEACHER KYOTERA PARENTS' SCHOOL” with date **26 MAY 2025** _(wording per stamp)._



**Data mapping (implementation)** — **Stage C**  

- **Concrete mapping:** **§7.6 (Progressive / template3)**.  
- **Full contract & types:** **§7.1–§7.3**.  



**Implementation checklist**  

- [ ] All column headers, subject list, and merged summary row signed off against `progressive-template.png` (may need higher-res scan).  

- [ ] HTML/CSS for **table + below** only; header/student from primary.  

- [ ] Preview matches sample at A4 width.  

- [ ] PDF export matches preview.  

- [ ] Picker label: **Progressive**; maps to **template3** unless remapped.



---



### Template: **A-1** — **Alevel**



**Sample**  

- **Received:** 2026-04-07  

- **Repo file:** `docs/secondary-template-samples/alevel-template.png`  

- **Source:** WhatsApp image — **GANGU SECONDARY SCHOOL**; **ACADEMIC REPORT FORM** — sample shows **SENIOR 5** — **TERM TWO WINNERS** — **(2025 TERM 2)**; learner **Zolwango Maria Peace**; **ADMNO** GSS2923701; stream/section **SENIOR 5 Winners**; **COMBINATION** BAG/SM (Biology, Agriculture, Geography / Subsidiary Math — as printed).  

- **Artifact:** Single-page image; may need higher-res for chart/table parity.  

- **Fidelity:** Match from **first distinctive “results” region** (charts + subject table) through **bottom** per §1. **School header + student strip** from primary in implementation (sample includes rich header for context only).  



**Context on sample (header band — not copied from sample in app)**  

- School name, phones, email (as printed).  

- Report title line(s) including **ACADEMIC REPORT FORM**, **SENIOR 5**, class/stream label (**TERM TWO WINNERS**), session (**2025 TERM 2**).  

- Learner identifiers: name, **ADMNO**, senior/stream line, **COMBINATION** text.  



**Chart region — student vs class (line graph)**  

- **Subject performance — Student vs Class** (or equivalent title): line chart comparing **student** curve vs **class** (inventory: four data points across subjects/terms as drawn).  



**Summary stats (near chart)**  

- **Principal Passes:** numeric (sample: **1**).  

- **Subsidiary Passes:** numeric (sample: **2**).  

- **Total Points:** fraction form (sample: **6/20**).  



**Main subject / paper table (columns L→R)**  

1. **SUBJECTS**  

2. **PAPER** (e.g. UNEB-style codes **P530/1**, **P250/1**, **S475/1**, **S101/1**)  

3. **MARKS** (often with **%**; per-paper scores)  

4. **GRADE** (UACE-style letter + number, e.g. **F9**, **PB**, **D1**, **D2**, **O** for overall row)  

5. **COMMENT** (may be **two lines** per cell on sample)  

6. **TEACHER** (full name)  



**Row structure notes**  

- **Multi-paper subjects:** e.g. **Geography** with **two paper rows** plus an **overall** row (sample: overall **Grade O**, overall comment **Satisfactory Performance**).  

- **Single-paper rows:** Biology, Agriculture, Subsidiary Mathematics, General Paper (names as on card).  

- Sample comments/teachers cited in inventory: Sekanwagi Gerald, Ssemakula Joseph, Nabirye Mariam, Kampindi Felix, Emmanuel Katabazi — **verify spelling on PNG**.  



**Chart region — performance over time (bar chart)**  

- Bar chart for period label such as **S5 T2, 2025** (verify exact caption on file).  



**Remarks block**  

- **Class Teacher** (sample: **Balamaga Ivan**) — narrative comment.  

- **Principal** (sample: **Kampindi Felix**) — narrative comment.  



**School dates**  

- **Closing Date:** e.g. **22/08/2025**  

- **Opening Date:** e.g. **15/09/2025**  



**QR / third-party line**  

- **QR code** + copy such as **Scan to access your interactive student profile on Zoraki Analytics** + **username** pattern (sample: `gss2923701@gss` — may be school-specific; treat as data-driven in implementation).  



**Stamp / signature**  

- **Official stamp:** blue rectangular stamp (sample date **20 AUG 2025**) + signature area.  



**Footer motto**  

- **School Motto:** **Dedicate, Educate, Inspire** (as on sample).  



**Data mapping (implementation)** — **Stage C**  

- **Concrete mapping:** **§7.7 (Alevel / template4)** — subjects/papers, marks, charts, passes/points, remarks, Zoraki.  
- **UACE rules:** [UACE_ALEVEL_GRADING_LOGIC.md](./UACE_ALEVEL_GRADING_LOGIC.md).  
- **Full contract & types:** **§7.1–§7.3**.  



**Implementation checklist**  

- [ ] Table columns, multi-paper grouping, and both charts signed off against `alevel-template.png`.  

- [ ] HTML/CSS for **charts + table + remarks + footer** in scope below primary header/student strip.  

- [ ] Preview at A4 (or sample aspect) matches.  

- [ ] PDF export matches preview.  

- [ ] Picker label: **Alevel**; **S.5–S.6 only**; maps to **`template4`**.  



---



## 4. Workflow (systematic)



1. You send the batch (**1 PDF + 2 images**) and label **§2b** (file paths + which slot each file is).  

2. For **each** received sample, we complete **one block in §3** (full table + below-table spec). **A-1 (Alevel)** is now specified; refine §3 after a higher-res scan if needed.  

3. When **all four** slots have §3 filled, we implement in code in the order you choose.  

4. UI/template keys are agreed when all four specs are stable.



---



## 5. Open decisions (to resolve during the project)



- Final **template keys** in the app (`template1` … `template4` vs named IDs).  

- Whether O-Level classes pick **default** template by school setting or by class only.  

- **Enforce class band in UI/API:** S.1–S.4 → only `template1`–`template3`; S.5–S.6 → only `template4` (**Alevel**).  

- Any **legal text** or **logo** rules that must stay identical across all four.



---



## 6. Changelog



| Date | Change |

|------|--------|

| 2026-04-07 | Plan created. |

| 2026-04-07 | Added §2b–§2c for **1 PDF + 2 images** batch, analysis checklist, updated workflow. |

| 2026-04-07 | First sample PDF ingested; §3 **Standard** (O-1) block started — column/below-table detail pending visual audit. |

| 2026-04-07 | Second sample image ingested; §3 **Basic** (O-2) block from visual inventory. |

| 2026-04-07 | **Naming alignment:** PDF = **Standard** (`standard-template.pdf`); image = **Basic** (`basic-template.png`). _(Assistant error: did not confirm names vs “first = standard / second = basic” before saving the image as `standard-template.png`.)_ |

| 2026-04-07 | **Progressive template:** image `progressive-template.png`; **O-3** §3 block. Picker label: **Progressive** (`template3`). |

| 2026-04-07 | **Class bands:** **Standard / Basic / Progressive** = **S.1–S.4** only (`template1`–`3`). **A-Level** = **S.5–S.6** (`template4`). |

| 2026-04-07 | **Alevel** (`alevel-template.png`): **A-1** §3 block (Gangu SS S5 report — charts + paper table + Zoraki QR). Picker label **Alevel**, `template4`. |

| 2026-04-07 | **Stage C (draft):** Added **§7 Data contract** (canonical `reportData` shape, read paths, per-template mappings, A-Level charts, Progressive fees). Replaced §3 “Data mapping” TBDs with §7 pointers. |



---



## 7. Stage C — Data contract (draft for **Gate C** sign-off)



**Purpose:** One written mapping from **DB column, RPC, or computation** → **each implemented cell** (and chart series) for `template1`–`template4`, before **Stage D** migrations. Aligns with [SECONDARY_REPORT_MASTER_PLAN.md](./SECONDARY_REPORT_MASTER_PLAN.md) Stage C and [SECONDARY_REPORT_DATABASE_AUDIT.md](./SECONDARY_REPORT_DATABASE_AUDIT.md).



### 7.1 Global rules



| Rule | Decision |
|------|----------|
| **School header + student strip** | Reuse **primary** report payload/layout (§1). Not driven by this contract. |
| **O-Level class band** | S.1–S.4 → `template1`–`template3` only. |
| **A-Level class band** | S.5–S.6 → `template4` only. |
| **Multi-topic / multi-paper** | **Stage D** is implemented in repo: `20260526120000_exam_results_line_keys_uace_papers.sql` (line-level uniqueness + `paper_code` / `paper_number` + RPCs). Shaped payload: **one row per physical mark line** (topic and/or paper). Schools configure official codes in **`school_uace_class_subject_papers`** (admin UI); see audit *Post–Stage D*. |



### 7.2 Read paths: `exam_results` vs `processed_secondary_exam_results`



| Data need | Primary read | Fallback / dedupe |
|-----------|--------------|-------------------|
| ECS / O-Level numeric breakdown (activity, formative, exam, final, topic, initials) | **`exam_results`** | — |
| Letter **grade** on O-Level row | **`exam_results.grade`** | Processed may mirror; **exam_results** is authoritative for rich rows |
| **Class / head teacher narrative** for card | **`processed_secondary_exam_results`**: `class_teacher_comment`, `headteacher_comment` | Same text on every subject row — renderer **must take first non-null** (any row) |
| **Next term begins** (footer) | **`processed_secondary_exam_results.next_term_begins_date`** | Else **`schools.next_term_begins_date`** |
| **Marks on processed only** (simple path) | **`processed_secondary_exam_results`** | If template needs breakdown, still merge **`exam_results`** |



### 7.2b Progressive (**template3**) — **fees balance (single source)**



| Printed field | **Canonical source** | Resolution |
|---------------|----------------------|------------|
| **Fees Balance** (footer) | **`student_invoices.balance`** | Match **`school_id`**, **`student_id`**, and **`term_id`** = `school_terms.id` resolved from **`exam_sets.year`** + **`exam_sets.term`** + **`exam_sets.school_id`**. Use the row for the **main** (non-supplementary) invoice for that term if multiple exist. |
| **Fallback** if no invoice row | **`student_fees.balance`** | Same **`student_id`**, **`school_id`**, **`year`**, **`term`** as **`exam_sets`**. |



*Rationale:* Invoices track the official billing balance; `student_fees` is a simpler ledger — one printed number avoids double-counting. Implement one RPC or view that applies this order and exposes **`progressiveFeesBalance`** only.



### 7.3 Canonical shaped payload (`reportData` / `SecondaryReportData`)



Names are **logical**; TS types can live under `src/` in Stage F.



```typescript
/** Context for one generated card */
interface SecondaryReportContext {
  examSetId: string;
  schoolId: string;
  year: number;
  term: number;
  className: string;
  examSetName?: string;
}

/** One mark row after Stage D (today: one per subject for O-Level live) */
interface SecondarySubjectMarkRow {
  subject: string;
  topic?: string | null;
  paperNumber?: string | null;
  paperCode?: string | null; // UNEB-style; school-configured
  activityScore?: number | null;
  descriptor?: string | null;
  formativeScore?: number | null;
  examScore?: number | null;
  finalScore?: number | null;
  overallRemark?: string | null;
  teacherInitials?: string | null;
  grade?: string | null;
  marksObtained?: number | null;
  totalMarks?: number | null;
  /** Progressive: not in DB yet — Stage E / app until columns exist */
  continuousC1?: number | null;
  continuousC2?: number | null;
}

interface ProcessedSecondaryHeadlines {
  classTeacherComment: string | null;
  headteacherComment: string | null;
  nextTermBeginsDate: string | null;
}

interface AlevelPaperTableRow {
  subjectLabel: string;
  paperCode: string;
  marksPercent: number | null;
  gradeDisplay: string;
  comment: string | null;
  teacherDisplayName: string | null;
  rowKind: "paper" | "subject_overall";
}

interface AlevelChartPoint {
  xLabel: string;
  studentMetric: number;
  classMetric: number;
}

interface SecondaryReportData {
  context: SecondaryReportContext;
  subjectRows: SecondarySubjectMarkRow[];
  processed: ProcessedSecondaryHeadlines | null;
  /** Basic */
  basicOverallAveragePercent?: number | null;
  basicIdentifierBand?: 1 | 2 | 3 | null;
  /** Progressive */
  progressiveSummaryAverage?: number | null;
  progressivePtsOutOf20?: number | null;
  progressiveIdentifierBand?: 1 | 2 | 3 | null;
  progressiveFeesBalance?: number | null;
  progressiveFeesCurrencyLabel?: string;
  /** A-Level */
  alevel?: {
    principalPasses: number;
    subsidiaryPasses: number;
    totalPointsNumerator: number;
    totalPointsDenominator: number; // 20
    lineChartStudentVsClass: AlevelChartPoint[];
    barChartByPeriod: { periodLabel: string; studentMetric: number }[];
    paperRows: AlevelPaperTableRow[];
    classTeacherName?: string;
    principalName?: string;
    closingDate?: string;
    openingDate?: string;
    zorakiUsername?: string;
    zorakiQrImageUrl?: string;
  };
}
```



### 7.4 Template **Standard** (`template1`, O-1)



**Layout** (PDF column titles, multi-page rules) remains **TBD** until visual audit of `standard-template.pdf` — no change to §3 inventory TBDs here.



**Data — target mapping (ECS-style):**



| Region / cell | Source |
|----------------|--------|
| Subject / topic columns | **`subjectRows[].subject`**, **`topic`** |
| Activity / descriptor / formative / exam / final / overall remark / initials | Matching **`exam_results`** fields on each row |
| Primary-style **marks** columns (if shown) | **`marks_obtained`**, **`total_marks`**, **`grade`** |
| Class teacher / headteacher comments | **`processed`** (deduped) |
| Next term / closing | **`processed.next_term_begins_date`**, **`term_closures`**, **`schools`** as in primary |
| Attendance block | Aggregate **`student_attendance`** (date range from term) |
| Termly projects block | **`termly_projects`** (see audit gaps for teacher column) |



### 7.5 Template **Basic** (`template2`, O-2)



| Column (§3) | `reportData` / computation |
|-------------|----------------------------|
| **SUBJECT** | `subjectRows[].subject` |
| **FORMATIVE SCORE (20%)** | `subjectRows[].formativeScore` |
| **EOY SUMMATIVE ASSESSMENT (80%)** | `subjectRows[].examScore` |
| **TOTAL 100%** | `subjectRows[].finalScore` |
| **GRADE** | `subjectRows[].grade` |
| **LEVEL OF ACHIEVEMENT/3** | **`basicIdentifierBand`** per row: derive from descriptor (`Missed`→1, `Moderate`→2, `Outstanding`→3) or `activityScore` bands per school policy |
| **DESCRIPTOR** | `subjectRows[].descriptor` |
| **TR'S INITIAL** | `subjectRows[].teacherInitials` |
| **OVERALL AVERAGE** (footer) | Mean of **`finalScore`** over non-missed subjects → **`basicOverallAveragePercent`** |
| **Identified / italic line / Moderate** | Summary uses **`basicIdentifierBand`** + descriptor text |
| **Class / Headteacher comments** | **`processed`** |
| **Next term / disclaimer** | **`processed.nextTermBeginsDate`** + static disclaimer string |



### 7.6 Template **Progressive** (`template3`, O-3)



| Column (§3) | `reportData` / computation |
|-------------|----------------------------|
| **SUBJECT** | `subjectRows[].subject` |
| **C1** | **`subjectRows[].continuousC1`** — *not in `exam_results` today;* fill via Stage E split, manual weighting, or importer |
| **C2** | **`subjectRows[].continuousC2`** — *same* |
| **AVG SCORE /20** | If C1+C2 present: **`(continuousC1 + continuousC2) / 2`** (normalize if school stores out of 10 each); else map **`formativeScore`** to **/20** using school rule — **document chosen rule in Stage E** if not yet in DB |
| **FINAL EXAM /80** | `subjectRows[].examScore` |
| **TOTAL SCORE 100%** | `subjectRows[].finalScore` |
| **IDENTIFIER** | LO band **`1|2|3`**: map from `descriptor` or **`progressiveIdentifierBand`** rules (align with §3 key) |
| **INIT** | `subjectRows[].teacherInitials` |
| Summary row averages | **`progressiveSummaryAverage`**, **`progressivePtsOutOf20`**, **`progressiveIdentifierBand`** — computed over subject rows |
| **Overall Learner Achievement** | Text from identifier band (Basic / Moderate / Accomplished) |
| **Fees Balance** | **`progressiveFeesBalance`** per **§7.2b** |
| **NEXT TERM BEGINS ON** | **`processed.nextTermBeginsDate`** |
| Signatures / stamp | Static layout; comment text from **`processed`** |



### 7.7 Template **Alevel** (`template4`, A-1)



**Table (SUBJECTS / PAPER / MARKS / GRADE / COMMENT / TEACHER)**



| Cell | Source |
|------|--------|
| Subject / paper rows | **`alevel.paperRows`**: one row per paper + optional **`subject_overall`** row; built from **`exam_results`** with **`paper_code`** (preferred, from admin **`school_uace_class_subject_papers`**) and **`paper_number`**; **TEACHER** from **`school_uace_class_subject_papers.teacher_id`** when set, else **`exam_results.teacher_id`** / initials join to **`teachers`**. |
| **MARKS %** | Per-paper **`marksPercent`** (from row or aggregated) |
| **GRADE** | **`gradeDisplay`** — internal UACE letter per [UACE_ALEVEL_GRADING_LOGIC.md](./UACE_ALEVEL_GRADING_LOGIC.md); map to school print codes (F9, D1, …) in presenter layer |
| **COMMENT** | `exam_results.overall_remark` / teacher remark field **or** processed subject remark |
| **TEACHER** | Join **`teachers`** by teacher assigned to **class+subject+paper** (Stage F query); sample shows full name |



**Summary stats**



| Field | Computation |
|-------|-------------|
| **Principal Passes** | Count principal subjects with grade not **F** (per product definition of “pass”) |
| **Subsidiary Passes** | Count subsidiary passes (**O** band per spec) |
| **Total Points** | **`totalPointsNumerator` / `totalPointsDenominator`** (max **20**) per [UACE_ALEVEL_GRADING_LOGIC.md](./UACE_ALEVEL_GRADING_LOGIC.md) |



**Line chart — student vs class**



| Element | Definition |
|---------|------------|
| **X categories** | One point per **principal** subject label (subsidiaries optional if product wants). |
| **Student series** | **`studentMetric`** = that student’s **final %** (or points) for the subject **after** multi-paper aggregation for that subject. |
| **Class series** | **`classMetric`** = mean of same metric across all students in **`context.className`** + **`examSetId`** + same subject. |
| **Requires** | Stage D aggregation for multi-paper; until then, approximate with single row per subject. |



**Bar chart — over time**



| Element | Definition |
|---------|------------|
| **Bars** | One per **exam set** in a configured window (e.g. current academic year), same student. |
| **Value** | **`studentMetric`** = **total UACE points /20** for that exam set (or average % — **pick one** in sign-off; sample suggests term snapshot). |



**QR / Zoraki**



| Field | Source |
|-------|--------|
| **Username** | Config rule: e.g. `{admission_number.lower}@{school_code.lower}` (see audit *Zoraki / QR*) |
| **QR image** | Generated from URL in **`schools`** / settings + username |



**Remarks**



| Block | Source |
|-------|--------|
| **Class Teacher** | **`processed.classTeacherComment`** or class teacher name + manual field |
| **Principal** | **`processed.headteacherComment`** or dedicated principal comment column if added |



### 7.8 Gate C checklist (product)



- [x] **Progressive fees:** §7.2b (**`student_invoices.balance`** for term, then **`student_fees.balance`**) — adopted unless finance workflow requires a written exception.  
- [ ] **C1/C2** source timeline (Stage E vs interim formula) — still open until columns or importer exist.  
- [x] **Alevel bar chart (series metric):** use **total UACE points / 20** per exam set for the bar series (see §7.7 bar chart); line chart uses **subject-level % or points** after multi-paper roll-up per student — align implementer with [UACE_ALEVEL_GRADING_LOGIC.md](./UACE_ALEVEL_GRADING_LOGIC.md).  
- [ ] **Zoraki** URL + username pattern — confirm per school deployment (`schools` / branding).  
- [ ] Complete **Standard** §3 **verbatim** table headers when PDF is audited.  


### 7.9 Stage F — Golden QA (template1–4)

1. **School:** One secondary school with Senior 1–4 and Senior 5–6 classes; at least one student per band.  
2. **template1–3:** Generate/preview PDF for an O-Level class; assert **S.1–S.4** never route to **`template4`**.  
3. **template4:** Senior 5 or Senior 6; at least one subject with **two rows** in `exam_results` (two **`paper_code`** values from `school_uace_class_subject_papers`); preview HTML shows both **PAPER** cells.  
4. **Regression:** `renderTemplateHTML` + `SecondaryBuiltInHtmlPreview` match PDF path for the same `reportData` snapshot.  
5. **RPC smoke (CI/local):** `node scripts/check-secondary-exam-rpc-signatures.mjs`; on Supabase run `scripts/verify-secondary-stage-d-migrations.sql` after deploy.  



---



### Next step



1. **Gate C:** Sign off **§7** (mark deltas in §7.8).  

2. Fill **§3 Standard** layout TBDs for `standard-template.pdf` (visual audit).  

3. Optional: higher-res **Alevel** scan for chart/table parity.  

4. After Gate C: **Stage D** (marks uniqueness + RPC + processed policy).  

5. **Stage F:** Implement types + fetch + HTML per §7.


