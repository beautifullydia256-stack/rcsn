# Receipt Numbering (Professional / ERP-Standard)

## Format

**Structure:** `{DocumentType}-{AcademicYear}-{Term}-{SequenceNumber}`

**Example:** `RCT-2026-T1-0003`

| Part | Meaning | Notes |
|------|---------|--------|
| RCT | Document type | Fixed for receipts; INV = invoice, CRN = credit note |
| 2026 | Academic year | From school calendar / term |
| T1 | Term | T1, T2, T3 only |
| 0003 | Sequence | 4 digits, zero-padded; resets each term |

## Rules

- **Sequence** resets at the start of each term (e.g. first receipt in Term 2 is `RCT-2026-T2-0001`).
- **Uniqueness:** No duplicate receipt numbers per term (enforced by `receipt_sequences_per_term`).
- **Storage:** Full number is stored in `student_payments.receipt_number` (use for printing, PDF, email).
- **Generation:** `get_next_receipt_number(p_school_id, p_term_id)` returns the next number for that school and term.

## Database

- **Table:** `receipt_sequences_per_term` — `(school_id, academic_year, term, last_number)`, PK `(school_id, academic_year, term)`.
- **Function:** `get_next_receipt_number(p_school_id UUID, p_term_id UUID)` → `TEXT`.

## Optional (future)

- **Multi-campus:** Add campus code, e.g. `RCT-KLA-2026-T1-0001`.
- **Stored parts:** Add columns `receipt_academic_year`, `receipt_term`, `receipt_sequence_number` if reporting by part is needed.
