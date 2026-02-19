# PwezaCore — Unpaid Balances Implementation Plan

This document outlines the implementation roadmap for the [Unpaid Balances spec](../../specs/unpaid-balances-spec.md).

## Phase 1 — Database (DONE via migration)

Run the migration:
```bash
supabase db push
# Or apply: supabase/migrations/20260219100000_unpaid_balances_spec.sql
```

**Tables created:**
- `student_ledger` — lifetime financial movements (invoice, payment, carry_forward, writeoff)
- `receivable_status` — total outstanding per student, aging, is_inactive_debtor
- `writeoff_log` — audit trail for debt forgiveness
- `balance_brought_forward` — BBF entries when new term opens

**Columns added:**
- `students.inactive_with_balance` — true when withdrawn but has debt
- `school_terms.is_closed` — locks invoice editing when term is closed

---

## Phase 2 — Term closing (to implement)

When admin marks a term as "Closed":

1. Set `school_terms.is_closed = true`
2. Update `student_invoices` for unpaid rows: `status = 'partial'` or `'unpaid'` (do not modify amounts)
3. Do NOT delete or regenerate invoices

**UI:** Add "Close term" button in Admin → Terms; require confirmation.

---

## Phase 3 — New term opening (Balance Brought Forward)

When a new term is opened and invoices are generated:

1. For each student with unpaid previous-term invoices:
   - Create `balance_brought_forward` row
   - Reference old `invoice_id`s in `reference_invoice_ids`
   - `amount_outstanding` = sum of unpaid balances
2. Add BBF to `student_ledger` as `entry_type = 'carry_forward'`
3. Display on student statement: `OLD BALANCE + NEW CHARGES = TOTAL PAYABLE`

**Logic:** BBF is NOT a new invoice; it's a ledger carry-forward. Does not affect income again.

---

## Phase 4 — Inactive debtor handling

When student status changes to Withdrawn/Inactive/Transferred:

1. Check if student has `balance > 0` in any term
2. If yes: set `students.inactive_with_balance = true`
3. Keep financial ledger ACTIVE
4. Show in reports: Debtors Register, AR Aging, Outstanding Debts

**UI:** Student Finance page shows badge "Inactive Debtor" when applicable.

---

## Phase 5 — Late payment after student left

Already supported by the search fix: Billing and Payments pages now include students with outstanding balances (debtors) in the search/select list, regardless of `status`. So accountants can:

1. Go to Payments
2. Search for the inactive student by name
3. Select term and apply payment to old invoice

No re-admission required.

---

## Phase 6 — Debt write-off (Admin only)

1. Add "Write off" action on invoice with balance (role = Finance Admin)
2. Require `reason` and confirmation
3. Insert into `writeoff_log`
4. Update `student_invoices.status = 'written_off'`
5. Post to `student_ledger` as `entry_type = 'writeoff'`
6. Accounting: DEBIT Bad Debt Expense, CREDIT AR
7. Irreversible; invoice remains visible with status WRITTEN_OFF

---

## Phase 7 — Student returns

When inactive student re-enrolls:

1. Reactivate profile (same `student_id`, do NOT create new)
2. Set `students.inactive_with_balance = false` when balance cleared
3. Restore previous ledger; show unpaid balance
4. Add new term invoices normally

---

## Reports to build

1. **Balance Brought Forward Summary** — BBF entries per term
2. **Student Debtors List** — students with balance > 0 (active or inactive)
3. **Inactive Students With Outstanding Fees** — `inactive_with_balance = true`
4. **Accounts Receivable Aging** — 30/60/90+ days using `receivable_status`
5. **Debt Write-Off Register** — from `writeoff_log`
6. **Recovered Debts Report** — payments on previously inactive debtors

---

## Strict prohibitions (enforce in app)

The system must NEVER allow:

- Deleting invoices with balances
- Editing historical financial records (when term is closed)
- Resetting a student's account
- Creating replacement invoices for old debt
- Re-admitting student as "new" to erase debt

Error message when blocked:  
`"مالية السجل غير قابل للتعديل بعد الترحيل"` (Financial records are locked after posting.)

---

## UI requirements (Student Finance page)

Display:

- [ ] Lifetime Balance
- [ ] Term Charges
- [ ] Balance B/F
- [ ] Payments
- [ ] Outstanding Amount

Status badges: Active | Inactive Debtor | Cleared | Written Off
