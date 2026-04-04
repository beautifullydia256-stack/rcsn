# Automatic Student Balance Synchronization

## 🎯 Problem Solved

**Previously:**
- ❌ Students added BEFORE fee setup had no balances
- ❌ Had to manually update each student
- ❌ Outstanding balances were incorrect
- ❌ No retroactive fee application

**Now:**
- ✅ Balances automatically sync when fees are saved
- ✅ Works for ALL students (past and future)
- ✅ Retroactive fee updates
- ✅ Accurate outstanding balances instantly

---

## 🔄 How It Works

### **Automatic Sync (Recommended)**

**When you save fee structure:**
1. Admin goes to Settings > Financial Settings
2. Sets/changes tuition fees for classes
3. Clicks **"Save Fee Structure"**
4. System automatically:
   - Updates `expected_fee_amount` for ALL students
   - Creates/updates `student_balances` records
   - Calculates outstanding = fees - total paid
   - Shows success message with count updated

### **Manual Sync (Optional)**

**Use the "🔄 Sync Student Balances" button when:**
- After bulk student import
- After moving students between classes
- If automatic sync failed
- To verify balances are correct

**How to use:**
1. Click **"🔄 Sync Student Balances"**
2. Confirm the action
3. System processes all students
4. Shows success message with count

---

## Prior-system (external) balance

Debt carried from **another system** when there is no clean mapping to a Pweza term is stored in **`prior_system_balance_entries`**: one row per student per school (`amount_outstanding`, `source_note`, `entered_by_user_id`, `entered_at`). The database also **rejects** a new row if that student already has **any** `student_invoices` row for a **`school_terms`** record with **`is_closed = true`**—so this is only for **new onboarding**, not something to add again each term after the cohort has moved on. This is **not** an extra `student_invoices` row for the same term (the unique key `(school_id, student_id, term_id)` on invoices is unchanged). Accountants see term invoice remainder, prior-system sum, and a **combined** total on **Invoices & Billing** (single-student flow). **Admin → Finance → Outstanding balances** and **`loadOutstandingBalanceAggByStudentAllTerms`** include prior amounts in each student’s **balance** and in school-wide outstanding KPIs (`sumTotalOverallOutstandingBalance`); prior debt is not stored inside `student_balances` or a specific term row—it is summed from **`prior_system_balance_entries`**. Schools should **close terms** in settings when a period ends so this rule matches real academic boundaries.

**Phase 2 (not implemented in v1):** wiring prior-system totals into **Record Payment** allocation (e.g. oldest-term-first behaviour), finance dashboards, and other KPIs needs an explicit rule (such as “pay term invoices first” vs “treat prior balance as older than any term”). Term-scoped **`balance_brought_forward`** remains separate and is not replaced by this ledger.

---

## 🛠️ Technical Implementation

### **API Endpoint**
**File:** `app/api/admin/sync-student-balances/route.ts`

**Current term:** Resolves the term with `resolveCurrentSchoolTerm` (same rules as the `auto_initialize_student_balance` DB trigger: today inside term dates, else latest started term, else earliest configured term). It must **not** use “highest year + highest term number” only — that wrongly attached opening balances to Term 3 while the school calendar was in Term 1, so “Outstanding (this term)” showed zero but “Total overall balance” did not.

**What it does:**
1. Fetches fee structure for school
2. Gets all active students
3. For each student:
   - Gets tuition for their class
   - Updates `students.expected_fee_amount`
   - Calculates total paid from `student_payments` for the **calendar current term**
   - Creates/updates `student_balances` for that term
   - If tuition &gt; 0: creates or updates **`student_invoices`** (`issued` / `partial` / `paid`) for the same term so students added *before* fee structure was saved still get a matching invoice when the admin saves fees (same alignment as new-student auto-invoice).

**Parameters:**
- `schoolId` (required)

**Response:**
```json
{
  "success": true,
  "message": "Successfully synced balances for X students",
  "updated": 25,
  "balancesCreated": 10,
  "totalStudents": 25
}
```

### **Frontend Integration**
**File:** `app/dashboard/admin/settings/page.tsx`

**saveFeeStructure function:**
- Saves fee structure to database
- Automatically calls `/api/admin/sync-student-balances`
- Shows success with student count
- Graceful error handling

**Manual sync button:**
- Blue button next to Save
- Confirmation dialog
- Calls same sync API
- Shows results

---

## 📊 Database Updates

### **Tables Affected:**

**1. `students` table:**
```sql
UPDATE students
SET expected_fee_amount = {tuition_for_class}
WHERE school_id = {school_id}
  AND current_class = {class_name}
  AND status = 'active'
```

**2. `student_balances` table:**
```sql
INSERT INTO student_balances (
  student_id, school_id, term_id, class_id,
  total_fees, total_paid, balance, last_payment_date
)
VALUES (...)
ON CONFLICT (student_id, term_id)
DO UPDATE SET
  total_fees = EXCLUDED.total_fees,
  balance = EXCLUDED.balance
```

---

## 🎯 Use Cases

### **Scenario 1: Add Students First, Set Fees Later**
1. Admin adds 100 students in September
2. Admin sets up fee structure in October
3. Clicks "Save Fee Structure"
4. **Result:** All 100 students automatically get correct fees and balances ✅

### **Scenario 2: Change Fees Mid-Term**
1. School had fees at UGX 200,000
2. Admin changes to UGX 250,000
3. Clicks "Save Fee Structure"
4. **Result:** All students updated to UGX 250,000, balances recalculated ✅

### **Scenario 3: Add Students After Fee Setup**
1. Fees already configured
2. Admin adds new student
3. Selects class (e.g., Primary 4)
4. **Result:** Fee auto-fills from structure, balance created ✅

### **Scenario 4: Manual Verification**
1. Admin wants to verify all balances
2. Clicks "🔄 Sync Student Balances"
3. Confirms action
4. **Result:** All students re-synced with current fees ✅

---

## ✨ Benefits

**For Admins:**
- ✅ No manual fee updates needed
- ✅ Add students in any order
- ✅ Change fees anytime
- ✅ Always accurate balances

**For Accountants:**
- ✅ Correct outstanding amounts
- ✅ Accurate reports
- ✅ Easy collections tracking
- ✅ No missing balances

**For System:**
- ✅ Data consistency
- ✅ Automated calculations
- ✅ Reduced errors
- ✅ Better user experience

---

## 🔐 Security

**API Protection:**
- ✅ Requires authenticated user
- ✅ Verifies school ownership
- ✅ Role-based access (admin only)
- ✅ Transaction safety

**Data Integrity:**
- ✅ Uses UPSERT (no duplicates)
- ✅ Validates all amounts
- ✅ Preserves payment history
- ✅ Atomic operations

---

## 📋 UI Components

### **Financial Settings Page**

```
┌─────────────────────────────────────────┐
│  💰 Tuition Fees Per Class              │
│  [Class inputs with fees...]            │
│                                          │
│  [🔄 Sync Balances] [Save Fee Structure]│
│                                          │
│  ℹ️ How This Works                      │
│  • Set fees per term...                 │
│                                          │
│  ✨ Automatic Balance Updates           │
│  • Updates ALL existing students        │
│  • Recalculates balances                │
│  • 💡 Use Sync button to update anytime │
└─────────────────────────────────────────┘
```

---

## 🚀 Future Enhancements

**Potential additions:**
- [ ] Bulk fee adjustments (% increase/decrease)
- [ ] Fee history tracking
- [ ] Automatic notifications to parents
- [ ] Fee comparison reports
- [ ] Class transfer balance updates

---

**Last Updated:** October 13, 2024
**Status:** ✅ Fully Implemented & Tested

