# UACE A-Level subject catalog (Uganda) — Principal vs Subsidiary

**Audience:** Engineering, admins, reports for **Senior 5 & Senior 6**.  
**Database:** Rows mirror `public.uace_subject_catalog` (seed migration).  
**Grading / points:** See **[`UACE_ALEVEL_GRADING_LOGIC.md`](./UACE_ALEVEL_GRADING_LOGIC.md)**.

---

## Rules (summary)

| Rule | Detail |
|------|--------|
| **Principals** | Exactly **3** for a full UACE programme (career combination). Max **18** points. |
| **Subsidiaries** | **General Paper (GP)** is **compulsory**. Often **one** other sub (Sub Math, Sub ICT, etc.). Subs contribute max **2** points total (each subsidiary grade capped at **O = 1** point in the standard model). |
| **Same name, different role** | E.g. **ICT** can be a **principal** (e.g. PCM variant) or **Subsidiary ICT** — different **rows** in the catalog (`subject_type` differs). |

---

## 1. Subsidiary subjects (UNEB — `subject_type = subsidiary`)

These are the official **subsidiary** offerings you specified. **GP** is compulsory nationally; others depend on combination / school.

| # | Subject name (canonical) | Common note |
|---|---------------------------|-------------|
| 1 | **General Paper** | Compulsory for all A-Level students. |
| 2 | **Subsidiary Mathematics** | For students **not** offering Mathematics as a principal. |
| 3 | **Subsidiary ICT** | Applications, theory, basics (subsidiary level). |
| 4 | **Subsidiary Computer Studies** | More technical than Sub ICT at subsidiary level. |
| 5 | **Subsidiary Economics** | Offered in some schools as a subsidiary. |

*Maximum subsidiary contribution to the **/20** total: **2 points** in your model (e.g. GP + one other sub at **O** each).*

---

## 2. Principal subjects (`subject_type = principal`)

Organised by **category** for timetabling and UI. A student **picks three** (subject to school + UNEB registration + overlap rules).

### Sciences

| Subject name |
|--------------|
| Mathematics |
| Physics |
| Chemistry |
| Biology |
| Agriculture |
| Food and Nutrition |

### Commercial / Business

| Subject name |
|--------------|
| Economics |
| Entrepreneurship Education |

### Arts / Humanities

| Subject name |
|--------------|
| History |
| Geography |
| Divinity (CRE) |
| Islamic Religious Education |
| Literature in English |
| Fine Art |

### Languages

| Subject name |
|--------------|
| English Language |
| French |
| Kiswahili |
| Luganda |
| Local Language (Other) |

*Use **Local Language (Other)** when the offering is not Luganda/Kiswahili/French (e.g. Runyankole, Ateso); school may store the specific name in class metadata later if needed.*

### Technical / Vocational (as principal)

| Subject name |
|--------------|
| ICT |
| Computer Studies |

* **Duplicate rule:** Students must not take **ICT + Computer Studies** together as overlapping principals (school validation).  
* **Agriculture + Biology:** some schools restrict — **validation**, not catalog duplication.

---

## 3. Common combination codes (reference only)

Not stored as separate rows; for UI labels and counselling.

| Code | Principals |
|------|------------|
| PCM | Physics, Chemistry, Mathematics |
| PCB | Physics, Chemistry, Biology |
| BCM | Biology, Chemistry, Mathematics |
| MEG | Mathematics, Economics, Geography |
| HEG | History, Economics, Geography |
| HEL | History, Economics, Literature in English |
| HGL | History, Geography, Literature in English |
| LEG | Literature in English, Economics, Geography |
| AEG | Agriculture, Economics, Geography |

---

## 4. Implementation

- **S.5 / S.6** class setup and exam entry should **restrict subject pickers**:
  - **Exactly 3** principals from `principal` rows (+ UNEB/school rules).
  - **Subsidiaries** from `subsidiary` rows (**GP** required + optional second per policy).
- **`exam_results.subject`** (and future `paper` rows) should use **`subject_name`** exactly as in **`uace_subject_catalog`** for consistency, unless you introduce a stable `code` column later.

---

*Aligned with product owner spec, 2026-04-08.*
