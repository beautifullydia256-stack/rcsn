# Critical Analysis: SEC-BY-SCHOOL.pdf

## 1. Document Overview

**File:** SEC-BY-SCHOOL.pdf  
**Content:** Ugandan education institutions register (cost centers) with administrative and enrollment data.  
**Length:** 194 pages.  
**Sections:** The document mixes **two levels** of education in one file:

| Section        | Approx. pages | Content                                                                 |
|----------------|---------------|-------------------------------------------------------------------------|
| **Secondary**  | 1–~46         | Secondary schools (S.S., SS, H.S.) with **UPE o-level (S1–S4)** and **A-level** enrollment |
| **Primary**    | ~47–194       | Primary schools (P.S., P/S) with **single enrollment** (pupil numbers) |

**Column structure (secondary):**  
Cost center ID | District code | District | LLG (subcounty/town council) | MIS number | Supplier number | Cost center name (school) | UPE o-level (S1–S4) | A-level  

**Column structure (primary):**  
Same administrative columns; last column is enrollment (no A-level split).

---

## 2. Data Quality Issues

### 2.1 Missing or Placeholder Geography

- **“Missing Subcounty”** is used as a placeholder for LLG/subcounty across many districts (e.g. Adjumani, Apac, Arua, Gulu, Kabale, Luwero, Apac Municipal, Nebbi Municipal). This limits location-based analysis and suggests incomplete or unlinked administrative data.
- **“NA” / “N/A” / “not available”** appear in MIS number and related fields (e.g. KISONKO SS – Ndugutu NA; OMORU P.S.; KYABANDARA MADRASAT P/S; KARERA COPE. SCH; Bugabo P/S – “not available”, supplier 0). These rows are not usable for identifier-based joins or reporting without rules.

### 2.2 Identifier Gaps

- **Supplier number = 0** for many schools (e.g. MUNGULA SS, BILTON FOREST H.S, BUKONZO SSS, PALARO SS, TERYET HIGH ALTITUDE SS, BUDONGO SS, WAMATOVU MUSLIM SSS, NAMANOGA SS). This can affect procurement/finance workflows and any analysis that assumes a valid supplier code.
- **MIS number = 0 or missing** in several records.
- **Last row (page 194):** `122 KCCA CENTRAL 003112 4590 Bat Valley Primary School 548` — cost center ID appears missing or merged with district code (122), which breaks the standard column layout.

### 2.3 Inconsistent Enrollment Columns (Secondary Section)

- Some secondary rows have **only one numeric value** at the end (e.g. “AKOKORO S.S 383”, “ST STEPHEN BUGIRI S.S 926”), so it is unclear whether the value is UPE o-level only or a total; A-level is effectively missing.
- **St.Joseph's College Ombaci (Wage only)** has 0 for enrollment — likely a payroll-only cost center; treating it as a normal school would understate enrollment or misclassify the unit.
- **Zero enrollments** (e.g. MWENGURA S.S 0; TOLORO P.S. 0; Musa P/s 0; MUYALLEN HIGH SCHOOL 0) may indicate new/closed schools, data not yet reported, or reporting errors — they need a clear policy (exclude vs. flag).

### 2.4 Naming and Formatting Inconsistencies

- **School name variants:** “S.S”, “S.S.”, “SS”, “H.S”, “P.S”, “P/S”, “P.S.”, “COU”, “C.O.U”, “R.C”, “S.D.A”, “UMEA”, “Madarasati”, “DEMO”, “Demonstration”, etc. complicate grouping and search.
- **Spacing/typos:** e.g. “MABANGA STANDARD P.S298”, “ELEGU 114”, “Irwaniro P.S.chool”, “Gaba Demonstartion”, “DistrictKaberamaido” (no space), “DistrictBulange” — affect parsing and matching.
- **District casing:** Most “District”, but “KATAKWI DISTRICT” in full caps.

### 2.5 Structural Mixing and Naming of the File

- The **filename “SEC-BY-SCHOOL”** suggests secondary (sector) by school, but a large part of the document is **primary** schools. Without a clear split or title in the PDF, users may assume the whole file is secondary only.
- **Municipal councils** (e.g. Ibanda, Njeru, Apac, Nebbi, Bugiri, Sheema, Kotido) and **KCCA** (Kampala) use divisions instead of subcounties; the same column is used for different administrative concepts.

---

## 3. Coverage and Completeness

- **Coverage:** Districts and municipalities across Uganda appear (e.g. Adjumani, Apac, Arua, Bugiri, Bundibugyo, Bushenyi, Busia, Gulu, Hoima, Iganga, Jinja, Kabale, Kabarole, Kasese, Lira, Luwero, Masaka, Mbale, Mbarara, Moyo, Mpigi, Mukono, Rakai, Rukungiri, plus many more and municipals/KCCA). So the document appears to aim at **national** coverage.
- **No grand totals or district summaries** were found in the sampled pages. This makes it hard to validate row counts or enrollment totals without reprocessing the full PDF.
- **Uncertain reference date:** No visible “as at” or “census date” for enrollments, so the figures cannot be interpreted in time without metadata.

---

## 4. Consistency and Usability

- **District codes** look numeric and relatively consistent (501, 502, … 797, 122 for KCCA).
- **Cost center IDs** are numeric; some 25xxxx, 25xxxx, 257xxx, 272xxx, 242xxx, 244xxx, 237xxx suggest different vintages or types of units (e.g. 272xxx for some newer or special cases).
- **No machine-friendly version:** The document is a PDF (likely tabular text), so reuse requires extraction and cleaning. Column alignment over page breaks and “-- X of 194 --” lines need to be stripped for automated use.

---

## 5. Recommendations

1. **Clarify document scope:** Add a cover/title that states “Secondary and Primary Schools by Cost Center” and clearly separate secondary vs primary sections (or split into two reports).
2. **Fix placeholders:** Replace “Missing Subcounty” with a proper code or “Unknown” and document it; resolve NA/N/A/not available in MIS and supplier fields or flag them in a separate quality report.
3. **Standardise enrollment:** For secondary, always report both UPE o-level and A-level (use 0 or blank by convention); document meaning of “Wage only” and zero-enrollment rows.
4. **Standardise names:** Adopt a single convention for school type (e.g. S.S., P.S.) and denomination (COU, RC, UMEA, etc.) and fix obvious typos and spacing.
5. **Add metadata:** Include reference date, data source, and (if possible) district/country totals for validation.
6. **Provide structured data:** Offer the same content as CSV/Excel with clear column names and validation rules to avoid re-extraction and parsing errors from PDF.

---

## 6. Summary

The PDF is a **nationwide list of Ugandan secondary and primary schools (cost centers)** with identifiers (cost center, district, MIS, supplier) and enrollment figures. It is **useful for reference and basic counts** but has **significant data quality and structure issues**: missing/placeholder geography, missing or zero identifiers, inconsistent enrollment columns in the secondary section, naming and formatting inconsistencies, and mixing of secondary and primary in one file without clear labeling. For any analytical or system use (e.g. linking to other datasets, reporting, or integration with an app like Pwezacore), the data should be **extracted, validated, and cleaned** with explicit rules for missing values and school types.
