# Receipt Numbering (Professional / ERP-Standard)

## Format

**Structure:** `{DocumentType}-{SchoolCode}-{AcademicYear}-{Term}-{SequenceNumber}`

**Example:** `RCT-KLA-2026-T1-0003` (school code KLA) or `RCT-RAK-2026-T1-0003` (school code RAK)

| Part | Meaning | Notes |
|------|---------|--------|
| RCT | Document type | Fixed for receipts; INV = invoice, CRN = credit note |
| KLA | School code | From `schools.school_code`; unique per school so **no two schools share the same receipt number** |
| 2026 | Academic year | From school calendar / term |
| T1 | Term | T1, T2, T3 only |
| 0003 | Sequence | 4 digits, zero-padded; resets each term per school |

## Rules

- **Sequence** resets at the start of each term per school (e.g. first receipt in Term 2 is `RCT-KLA-2026-T2-0001`).
- **Uniqueness:** Receipt numbers are **globally unique** — school code ensures no two schools ever get the same number (e.g. School A never has the same RCT as School B).
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
   - `20260219170000_receipt_number_include_school_code.sql` — same function updated to include school code so receipt numbers are unique across all schools

## Optional (future)

- **Multi-campus:** Add campus code, e.g. `RCT-KLA-2026-T1-0001`.
- **Stored parts:** Add columns `receipt_academic_year`, `receipt_term`, `receipt_sequence_number` if reporting by part is needed.
