# Comments & remarks in PwezaCore — inventory

This document lists **where comment-like text comes from** in the database and app, **what it applies to**, and **when it is used**. Use it when you want to change wording or behaviour without hunting through migrations.

For nursery learning-area alignment (five strands vs detailed stems), see also [`NURSERY_LEARNING_AREAS_COMMENT_ALIGNMENT.md`](./NURSERY_LEARNING_AREAS_COMMENT_ALIGNMENT.md).

---

## Quick reference

| System | Main table / object | Scoped by | Typical use |
|--------|----------------------|-----------|-------------|
| Nursery observation paragraphs | `public.nursery_detailed_observation_items` | **Global** (all schools share one catalogue) | Pre-primary **reports**: turn holistic ratings into sentences |
| Holistic exam ratings (not prose) | `exam_results.nursery_skill_performance` | Student × exam set × **strand subject** | Teacher **exam entry**; stores `VERY_GOOD` / `GOOD` / … per skill key |
| Primary subject remarks | `teacher_remarks_settings` | School × **subject** × % band | Primary teacher marks → **remarks** from average % |
| Class teacher report comment | `class_teacher_comments_settings` | School × **class** × % band | Report **class teacher** comment from overall % |
| Head teacher report comment | `headteacher_comments_settings` | School × % band | Report **head teacher** comment from overall % |
| Saved exam row (primary) | `exam_results.remarks`, `exam_results.overall_remark` | Per result row | Whatever the RPC / UI saved for that subject line |
| Processed primary mirror | `processed_primary_exam_results` | Per processed row | Denormalised report data; nursery may get a **placeholder** remark |

---

## 1. “He/she observes and obeys rules” (your example)

**Source:** Database table `public.nursery_detailed_observation_items`, seeded in migration `supabase/migrations/20260325100000_nursery_detailed_observation_items.sql`.

| Column | Value (for this item) |
|--------|------------------------|
| `item_key` | `social_observes_rules` |
| `strand` | `social_development` |
| `subsection` | `behaviors_emotions` |
| `prompt_text` | `He/she observes and obeys rules.` |
| `response_yes` | Same as prompt (affirmed “yes” / **VERY_GOOD** path in reports) |
| `response_tries` | `Usually follows rules; slips when excited or tired.` |
| `response_never` | `Rules are not yet understood or followed in a steady way.` |
| `response_good` | Added in `20260330120000_snapshot_and_observation_text_columns.sql`; backfilled from `response_tries` until you edit per row |
| `response_needs_improvement` | Same backfill pattern |

**Important mapping quirk:** In code, the holistic skill key `relating_with_others` (skill under **Relating with others (Social development)**) is mapped to catalogue row **`social_observes_rules`** — i.e. the **“observes and obeys rules”** stem is the paragraph template for that **one** skill cell, not for every social skill. Single source: [`src/templates/primary/prePrimaryDetailedCommentMapping.ts`](../src/templates/primary/prePrimaryDetailedCommentMapping.ts).

**When it appears:** When a report (or UI that resolves detailed text) loads the catalogue row for a stored rating and picks `response_yes` / `response_good` / `response_needs_improvement` / `response_never` from [`getResponseTextForGrade`](../src/templates/primary/prePrimaryDetailedCommentMapping.ts) (see mapping VERY_GOOD → `response_yes`, GOOD → `response_good` with fallback, etc.).

**When it does *not* appear:** Choosing “Very Good” in the **holistic exam grid** only updates `exam_results.nursery_skill_performance` JSON; it does **not** copy this sentence into `exam_results.remarks` or `overall_remark` on the current teacher save path.

---

## 2. `nursery_detailed_observation_items` (full catalogue)

- **Table:** `public.nursery_detailed_observation_items`
- **Scope:** **Global** — not per school; every school reads the same rows.
- **Purpose:** Verbatim / teacher-style **observation stems** and **three response levels** (`response_tries`, `response_never`; plus optional `response_good`, `response_needs_improvement`) for detailed pre-primary reporting.
- **Migrations:**  
  - `20260325100000_nursery_detailed_observation_items.sql` — create + seed  
  - `20260330120000_snapshot_and_observation_text_columns.sql` — `response_good` / `response_needs_improvement`
- **When used:** Pre-primary **reports** and any feature that joins holistic JSON + `item_key` to these texts (see alignment doc and `prePrimaryDetailedCommentMapping.ts`).

---

## 3. Holistic exam storage (`exam_results.nursery_skill_performance`)

- **Column:** `exam_results.nursery_skill_performance` (JSONB)
- **Content:** Map of **skill key** → enum: `VERY_GOOD`, `GOOD`, `NEEDS_IMPROVEMENT`, `TRIES` (see [`prePrimaryHolisticRatings.ts`](../src/templates/primary/prePrimaryHolisticRatings.ts)).
- **When written:** Teacher saves on nursery path via RPC `teacher_upsert_exam_result_primary` with `p_nursery_skills` (see [`LegacyExamResultsFullPage.tsx`](../src/pages/teacher/exam-results/LegacyExamResultsFullPage.tsx)).
- **Relation to comments:** The **catalogue** in §1–2 turns these enums into **paragraphs** on reports; the raw JSON is not human prose.

---

## 4. `teacher_remarks_settings` (primary-style subject remarks)

- **Table:** `public.teacher_remarks_settings`
- **Scope:** Per **school**, per **subject**, bands of `min_percent` / `max_percent` with `comment_text`.
- **When seeded:** e.g. `setup_default_teacher_remarks_for_school` (called from new-school defaults); various fix migrations.
- **When used:** When primary (non-nursery) teachers enter **marks**; remarks can be chosen or derived from **percentage** rules per subject (UI / RPC pass `p_remarks`).

---

## 5. `class_teacher_comments_settings`

- **Table:** `public.class_teacher_comments_settings`
- **Scope:** Per **school**, per **class name**, % bands → `comment_text` (legacy `comment` column may exist on older DBs; see headteacher legacy migration).
- **When seeded:** e.g. `setup_default_class_teacher_comments_settings` — defaults for Primary 1–7 and O-Level seniors in [`fix_setup_default_class_teacher_comments_ambiguous.sql`](../supabase/migrations/fix_setup_default_class_teacher_comments_ambiguous.sql); Senior 5–6 extensions in `20260619120000_class_teacher_comments_senior56_defaults.sql`.
- **When used:** **Class teacher** narrative on reports, typically from student **overall percentage** falling into a band.

---

## 6. `headteacher_comments_settings`

- **Table:** `public.headteacher_comments_settings`
- **Scope:** Per **school**, % bands → `comment_text`.
- **When seeded:** e.g. `20250928_create_headteacher_comments_settings.sql` (Nursery/Primary schools); Secondary defaults in `20260621120000_headteacher_comments_defaults_secondary.sql` + trigger on new Secondary schools.
- **When used:** **Head teacher** comment on reports from overall performance band.

---

## 7. `exam_results` text columns (saved per row)

| Column | Meaning |
|--------|---------|
| `remarks` | General remarks field on the result row (primary marks path uses it; nursery holistic path often **null** from teacher UI). |
| `overall_remark` | Maps from RPC param `p_teacher_comment`; nursery holistic save often passes **null**. |

Upsert implementation (including term guard): `supabase/migrations/20260630120000_exam_set_teacher_entry_current_term_guard.sql` (function `teacher_upsert_exam_result_primary`).

---

## 8. `processed_primary_exam_results.teacher_remark` (mirror)

- **Table:** `public.processed_primary_exam_results`
- **Purpose:** Denormalised rows for reporting; syncs from `exam_results` for primary/nursery flows.
- **Nursery note:** Migration `20251109_update_processed_results_for_nursery.sql` can set `teacher_remark` to the fixed phrase **`Performance recorded via checklist`** when nursery JSON exists (backfill / mirror logic), **not** the per-skill catalogue sentences.

---

## 9. Report snapshots

- **Table:** `report_snapshot_data` has `nursery_skill_performance` JSONB (frozen copy for that snapshot) — see `20260330120000_snapshot_and_observation_text_columns.sql`.
- **When used:** Generated reports that must not change if live `exam_results` change later.

---

## 10. Files to change for wording

| Goal | Where to edit |
|------|----------------|
| Change “observes and obeys rules” or its GOOD / TRIES / NEVER lines | DB row `item_key = 'social_observes_rules'` or new migration `UPDATE nursery_detailed_observation_items …` |
| Change which skill uses which catalogue row | [`prePrimaryDetailedCommentMapping.ts`](../src/templates/primary/prePrimaryDetailedCommentMapping.ts) + review alignment doc |
| Default head / class / subject remark bands | Respective `*_settings` tables + seed functions in `supabase/migrations/` |
| Holistic rating labels (Very Good, …) | [`prePrimaryHolisticRatings.ts`](../src/templates/primary/prePrimaryHolisticRatings.ts) |

---

## 11. Verify in the database (optional SQL)

```sql
-- Catalogue row for “observes and obeys rules”
SELECT item_key, strand, prompt_text, response_yes, response_good, response_tries, response_needs_improvement, response_never
FROM public.nursery_detailed_observation_items
WHERE item_key = 'social_observes_rules';

-- How many global observation stems exist
SELECT strand, COUNT(*) FROM public.nursery_detailed_observation_items GROUP BY strand ORDER BY strand;
```

---

*Generated for internal product work; adjust migrations and this doc together when you change comment behaviour.*
