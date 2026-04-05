# Receipt Numbering (Professional / ERP-Standard)

## Format

**Structure:** `{SchoolCode}{YYYYMMDD}{Term×10000 + Sequence}` — compact, no dashes, no `RCT-` prefix.

**Example:** `RIP2026040410003` — school code `RIP`, date `2026-04-04`, term **1**, sequence **3** → suffix `10003` (= 1×10000 + 3).

| Part | Meaning | Notes |
|------|---------|--------|
| RIP | School code | From `schools.school_code` (uppercase); fallback first 4 hex chars of `school_id` |
| 20260404 | Calendar date | `CURRENT_DATE` on the database server when the receipt is issued (`YYYYMMDD`) |
| 10003 | Term + sequence | Term **n** (1–3) and per-term sequence **s** (1–9999): **`n * 10000 + s`**. Examples: term 1 seq 1 → `10001`; term 2 seq 5 → `20005` |

## Rules

- **Sequence** resets at the start of each **academic term** per school (same bucket as `receipt_sequences_per_term`).
- **Uniqueness:** School code + date + suffix keeps numbers distinguishable across schools; suffix increments per term.
- **Storage:** Full number is stored in `student_payments.receipt_number` (use for printing, PDF, email).
- **Generation:** `get_next_receipt_number(p_school_id, p_term_id)` returns the next number for that school and term.

## Database

- **Table:** `receipt_sequences_per_term` — `(school_id, academic_year, term, last_number)`, PK `(school_id, academic_year, term)`.
- **Function:** `get_next_receipt_number(p_school_id UUID, p_term_id UUID)` → `TEXT`.

## Running these migrations in Supabase

Migrations live in your repo under **`supabase/migrations/`**. To apply them in Supabase:

1. **Supabase Dashboard → SQL Editor**  
   Open each migration file (in order by name, e.g. `20260219160000_...` then `20260219170000_...`), copy its contents, paste into a new query, and click **Run**.

2. **Or use Supabase CLI** (if linked to your project):
   ```bash
   supabase db push
   ```
   This runs any migrations that haven’t been applied yet.

3. **Receipt-related migrations (run in this order):**
   - `20260219160000_receipt_numbering_rct_year_term_seq.sql` — table + first version of `get_next_receipt_number`
   - `20260219170000_receipt_number_include_school_code.sql` — RCT-… format with school code
   - `20260511120000_receipt_number_compact_date_termseq.sql` — current compact format `{code}{YYYYMMDD}{term×10000+seq}`

## Optional (future)

- **Multi-campus:** Add campus segment to the compact string if needed.
- **Stored parts:** Add columns `receipt_academic_year`, `receipt_term`, `receipt_sequence_number` if reporting by part is needed.
