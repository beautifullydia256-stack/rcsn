# 🎓 PwezaCore Accounting System Redesign

## Overview
Complete redesign of the student accounting system to support **multiple payments per student**, **automatic balance tracking**, and **clear per-term records**.

---

## ✨ New Features

### 1. **Multi-Payment Support**
- Students can make multiple payments over time
- Each payment is tracked individually with full details
- Complete payment history per student

### 2. **Automatic Balance Calculation**
- Balances update automatically when payments are recorded
- No manual calculations needed
- Real-time accuracy guaranteed by database triggers

### 3. **Term-Based Tracking**
- Separate balance records for each term
- Easy term-over-term comparison
- Historical data preservation

### 4. **Enhanced Dashboard**
- **Two Views**: Student Balances & Payment History
- **Smart Filters**: By class, payment status, search
- **Real-Time KPIs**: Today's collections, term totals, outstanding balances

---

## 📊 Database Schema

### New Tables

#### 1. `classes`
Stores class information with official term fees
```sql
- class_id (UUID, PK)
- school_id (UUID, FK → schools)
- class_name (TEXT)
- total_fees (NUMERIC)
```

#### 2. `student_payments`
Individual payment records
```sql
- payment_id (UUID, PK)
- student_id (UUID, FK → students)
- school_id (UUID, FK → schools)
- term_id (UUID, FK → school_terms)
- class_id (UUID, FK → classes)
- amount_paid (NUMERIC)
- payment_method (TEXT: cash, bank, mobile_money, cheque, other)
- transaction_ref (TEXT)
- payment_date (DATE)
- recorded_by (UUID, FK → users)
- notes (TEXT)
```

#### 3. `student_balances`
Auto-calculated balance summary per student per term
```sql
- balance_id (UUID, PK)
- student_id (UUID, FK → students)
- school_id (UUID, FK → schools)
- term_id (UUID, FK → school_terms)
- class_id (UUID, FK → classes)
- total_fees (NUMERIC)
- total_paid (NUMERIC)
- balance (NUMERIC - GENERATED COLUMN = total_fees - total_paid)
- last_payment_date (DATE)
```

### Modified Tables

#### `students`
Added: `class_id` (UUID, FK → classes)

#### `school_terms`
Added: `academic_year` (TEXT)

---

## ⚙️ Automatic Balance Updates

### How It Works
A PostgreSQL trigger automatically updates `student_balances` whenever a payment is recorded:

1. **Payment Added** → Trigger fires
2. **Calculate Total Paid** → Sum all payments for student + term
3. **Get Expected Fees** → From class or student record
4. **Update Balance** → Insert or update `student_balances`
5. **Balance Auto-Calculates** → total_fees - total_paid

### Trigger Function
```sql
CREATE TRIGGER trigger_update_student_balance
  AFTER INSERT OR UPDATE ON student_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_student_balance();
```

---

## 🎨 Accountant Dashboard

### Two Main Views

#### 1. **Student Balances Tab**
Shows comprehensive balance information:

| Column | Description |
|--------|-------------|
| Student | Student full name |
| Admission # | Student admission number |
| Class | Current class |
| Term | Term (e.g., T1 2025) |
| Total Fees | Expected fees for the term |
| Total Paid | Sum of all payments made |
| Balance | Outstanding amount (RED if > 0) |
| Last Payment | Date of most recent payment |
| Status | Fully Paid / Partial / Not Paid |

**Filters:**
- Search by name or admission number
- Filter by class
- Filter by payment status (Fully Paid, Partial, Not Paid)

#### 2. **Payment History Tab**
Shows individual payment records:

| Column | Description |
|--------|-------------|
| Date | Payment date |
| Student | Student name |
| Admission # | Student admission number |
| Class | Student's class |
| Amount | Payment amount (GREEN) |
| Method | cash, bank, mobile_money, etc. |
| Transaction Ref | Reference number |
| Notes | Additional notes |

**Filters:**
- Search by student name/admission
- Filter by class

### KPI Cards
- **Collected Today**: Sum of all payments made today
- **Collected This Term**: Total collections for current term
- **Outstanding Balances**: Total unpaid amount across all students
- **Students with Balances**: Count of students who owe money

---

## 🚀 Installation & Deployment

### Step 1: Apply Database Migration
```sql
-- Run in Supabase SQL Editor
-- File: supabase/migrations/20251009_create_accounting_system.sql
```

This will:
- ✅ Create new tables (classes, student_payments, student_balances)
- ✅ Add triggers for auto-balance calculation
- ✅ Set up RLS policies
- ✅ Migrate existing payment data
- ✅ Create helpful views

### Step 2: Deploy Code Changes
```bash
git add .
git commit -m "Implement new multi-payment accounting system"
git push
```

### Step 3: Verify Deployment
1. Log in as accountant or admin
2. Navigate to Accountant Dashboard
3. Check that data displays correctly

---

## 📝 Usage Guide

### For Accountants

#### Recording a New Payment

```sql
-- Insert payment (balance auto-updates via trigger)
INSERT INTO student_payments (
  student_id,
  school_id,
  term_id,
  class_id,
  amount_paid,
  payment_method,
  transaction_ref,
  payment_date,
  recorded_by,
  notes
) VALUES (
  'student-uuid',
  'school-uuid',
  'term-uuid',
  'class-uuid',
  500000,
  'mobile_money',
  'MM2025001234',
  CURRENT_DATE,
  'accountant-user-uuid',
  'First installment for Term 1'
);
```

#### Checking Student Balance

```sql
-- Query student_balances
SELECT 
  s.name,
  sb.total_fees,
  sb.total_paid,
  sb.balance,
  sb.last_payment_date
FROM student_balances sb
JOIN students s ON sb.student_id = s.student_id
WHERE sb.term_id = 'current-term-uuid'
  AND sb.school_id = 'your-school-uuid';
```

#### View Payment History

```sql
-- All payments for a student
SELECT 
  payment_date,
  amount_paid,
  payment_method,
  transaction_ref
FROM student_payments
WHERE student_id = 'student-uuid'
  AND term_id = 'term-uuid'
ORDER BY payment_date DESC;
```

---

## 🔧 Configuration

### Setting Class Fees

```sql
-- Create or update class fees
INSERT INTO classes (school_id, class_name, total_fees)
VALUES ('school-uuid', 'Primary 5', 1500000)
ON CONFLICT (school_id, class_name)
DO UPDATE SET total_fees = 1500000;
```

### Creating Terms

```sql
-- Create academic term
INSERT INTO school_terms (school_id, year, term, start_date, end_date, academic_year)
VALUES (
  'school-uuid',
  2025,
  1,
  '2025-01-15',
  '2025-04-15',
  '2025'
);
```

---

## 📊 Reporting Queries

### Total Collections Report
```sql
SELECT 
  c.class_name,
  COUNT(DISTINCT sp.student_id) as students_paid,
  SUM(sp.amount_paid) as total_collected
FROM student_payments sp
JOIN classes c ON sp.class_id = c.class_id
WHERE sp.term_id = 'current-term-uuid'
GROUP BY c.class_name
ORDER BY total_collected DESC;
```

### Students with Outstanding Balances
```sql
SELECT 
  s.name,
  s.admission_number,
  c.class_name,
  sb.balance
FROM student_balances sb
JOIN students s ON sb.student_id = s.student_id
JOIN classes c ON sb.class_id = c.class_id
WHERE sb.balance > 0
  AND sb.term_id = 'current-term-uuid'
ORDER BY sb.balance DESC;
```

### Payment Method Summary
```sql
SELECT 
  payment_method,
  COUNT(*) as transaction_count,
  SUM(amount_paid) as total_amount
FROM student_payments
WHERE term_id = 'current-term-uuid'
GROUP BY payment_method;
```

---

## 🔐 Security & Permissions

### Row Level Security (RLS) Policies

**Accountants can:**
- ✅ View all students, classes, and balances in their school
- ✅ Insert new payments
- ✅ View payment history

**Admins can:**
- ✅ Full access to all accounting data
- ✅ Manage classes and fees
- ✅ View and insert payments

**Parents can:**
- ✅ View their student's balance
- ✅ View their student's payment history
- ❌ Cannot modify data

**Students can:**
- ✅ View their own balance
- ✅ View their own payment history
- ❌ Cannot modify data

---

## 🧪 Testing

### Test Data Creation

```sql
-- Create test class
INSERT INTO classes (school_id, class_name, total_fees)
VALUES ('your-school-id', 'Primary 5', 1500000);

-- Create test payments
INSERT INTO student_payments (
  student_id, school_id, term_id, amount_paid, payment_method
)
VALUES 
  ('student-1-id', 'school-id', 'term-id', 500000, 'cash'),
  ('student-1-id', 'school-id', 'term-id', 300000, 'mobile_money'),
  ('student-2-id', 'school-id', 'term-id', 1500000, 'bank');

-- Check auto-calculated balances
SELECT * FROM student_balances WHERE term_id = 'term-id';
```

### Expected Results
- Student 1: Total Paid = 800,000, Balance = 700,000
- Student 2: Total Paid = 1,500,000, Balance = 0 (Fully Paid)

---

## 🐛 Troubleshooting

### Balances Not Updating?
1. Check if trigger exists:
   ```sql
   SELECT * FROM pg_trigger WHERE tgname = 'trigger_update_student_balance';
   ```
2. Manually recalculate:
   ```sql
   -- Re-run trigger for all payments
   UPDATE student_payments SET payment_id = payment_id;
   ```

### Missing Data in Dashboard?
1. Verify current term is set
2. Check RLS policies are applied
3. Ensure user has correct role (accountant/admin)
4. Check browser console for errors

### Duplicate Balances?
The system enforces `UNIQUE(student_id, term_id)` - this should not happen.
If it does, check for database constraint violations.

---

## 📚 API Integration (Future)

### REST Endpoints (To Be Implemented)

```typescript
// Record payment
POST /api/accountant/payments
Body: {
  student_id, term_id, amount_paid, payment_method, transaction_ref, notes
}

// Get student balance
GET /api/accountant/balances/:student_id/:term_id

// Get payment history
GET /api/accountant/payments?student_id=xxx&term_id=xxx

// Export reports
GET /api/accountant/reports/collections.pdf?term_id=xxx
GET /api/accountant/reports/balances.pdf?term_id=xxx
```

---

## 🎯 Best Practices

1. **Always specify term_id** when recording payments
2. **Set class fees at the start of each term**
3. **Use transaction_ref** for tracking and reconciliation
4. **Add notes** for unusual payments
5. **Backup data** before bulk operations
6. **Verify balances** periodically against manual calculations

---

## 📈 Future Enhancements

- [ ] SMS notifications for payment confirmations
- [ ] Email receipts with PDF attachments
- [ ] Payment reminders for outstanding balances
- [ ] Installment payment plans
- [ ] Fee discounts and scholarships
- [ ] Mobile app for payment recording
- [ ] Integration with mobile money APIs
- [ ] Advanced analytics and forecasting

---

## 📞 Support

For issues or questions:
1. Check this documentation
2. Review the migration SQL file
3. Check Supabase logs for errors
4. Contact system administrator

---

**Version**: 1.0.0  
**Last Updated**: October 9, 2025  
**Migration File**: `20251009_create_accounting_system.sql`

