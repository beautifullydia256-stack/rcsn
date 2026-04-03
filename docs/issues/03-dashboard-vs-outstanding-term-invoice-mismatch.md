# Issue: Dashboard vs outstanding page mismatch; invoices on wrong term

**Status:** Documented (awaiting fix plan)  
**Last updated:** 2026-04-03  

## User’s understanding (summary)

Adding a student should create fee expectations for the **term in which the student is enrolled**, not a past or future term the student was never in. For a **first-time join in Term 2**, invoices should align with **Term 2** only—not prior terms (no fabricated “previous” balance), and not an arbitrary later term like Term 3.

## What is observed (same school, same admin)

### Outstanding Balances page (`/dashboard/admin/finance/outstanding`)

- Shows **non-zero** totals (e.g. total outstanding **UGX 350,000**, **1** student owing).
- Table lists the student with balance, amount paid, balance, etc.

### Admin dashboard (`/dashboard/admin`)

- **Fees collected:** **USh 0** (“This term”).
- **Outstanding fees:** **USh 0** (“Balance due”), with warning styling—still reads as zero outstanding for that card.

So: the **dedicated outstanding page** reflects balances the user treats as **real**; the **dashboard finance cards** do **not** match (they show zero for this term / balance due).

## Suspected cause (reporter hypothesis)

When a student is added with current school fees, the system creates the fee **invoice on the wrong academic term**—specifically **Term 3 2026** while the school is still in **Term 1 2026**. That would explain:

- Dashboard widgets that are scoped to **“this term”** showing **no** outstanding / no collection for Term 1, while
- An outstanding list that still shows the student (depending on how that page queries or labels terms), and
- Payment flows referencing “outstanding for third term 2026” even though that term has not started.

**Note:** Exact query filters for dashboard vs. outstanding page are to be verified in code; this document records the user-visible behavior and the term-placement theory.

## Expected behavior

1. **Term accuracy:** Invoices (or primary fee obligations) for a newly added student attach to the **current operational term** at time of enrollment (or the term explicitly selected if the UI allows)—not a future term like Term 3 when the school is in Term 1.
2. **New joiners:** If the student **first joins in Term N**, fee setup should not imply unpaid prior terms unless business rules explicitly require it.
3. **Consistency:** Metrics on the **admin dashboard** and the **outstanding balances** experience should **agree** for the same school, same user, and same underlying data (or any difference must be explicitly intentional and documented in UI).

## Relationship to other listed problems

- Overlaps with: student added in current term but invoice appears under **Term 3 2026**; outstanding / record-payment glitches may be downstream of wrong-term ledger data.

## Source

User explanation + screenshots (Outstanding Balances page vs Admin dashboard), same tenant, 2026-04-03.
