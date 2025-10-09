# Accountant Dashboard Fix - Summary

## Problem Identified
The Accountant Dashboard was showing all zeros (UGX 0) for:
- Collected Today
- Collected This Term
- Outstanding Balances
- Students with Balances

## Root Cause
The dashboard was querying non-existent database tables:
- ❌ `student_fees` table (doesn't exist)
- ❌ `school_fees_expected` table (doesn't exist)

The correct tables in the schema are:
- ✅ `payments` table
- ✅ `students` table (with `expected_fee_amount` field)

## Changes Made

### 1. Fixed Data Fetching (`app/dashboard/accountant/page.tsx`)
- Changed query from `student_fees` to `payments` table
- Updated field names from `amount_paid` to `amount` (correct schema field)
- Changed payment ID from `p.id` to `p.payment_id` (correct schema field)
- Added proper calculation for expected fees using `students.expected_fee_amount`
- Added term-aware calculations using `school_terms` table
- Fixed outstanding balance calculation: expected - paid per active student

### 2. Created Database Migration (`supabase/migrations/20251009_add_accountant_policies.sql`)
Added missing Row Level Security (RLS) policies for accountants:
- Accountants can now read students from their school
- Accountants can read and insert payments for their school
- Accountants can read school_terms for their school
- Admin can now insert payments (previously could only select)

## What You Need to Do

### Step 1: Apply the Database Migration
You need to run the new migration in your Supabase database:

1. Open your Supabase Dashboard
2. Go to **SQL Editor**
3. Copy and paste the contents of `supabase/migrations/20251009_add_accountant_policies.sql`
4. Click **Run** to execute the SQL

### Step 2: Ensure Data Exists
Make sure your database has:
1. **Students with expected fees**: Check that students have `expected_fee_amount` set
   ```sql
   UPDATE students 
   SET expected_fee_amount = 1000000 -- example: 1 million UGX per student
   WHERE school_id = 'your-school-id' AND expected_fee_amount IS NULL;
   ```

2. **Payment records**: Ensure payments exist in the `payments` table
   ```sql
   SELECT * FROM payments WHERE school_id = 'your-school-id';
   ```

3. **Current term defined**: Make sure you have a current term in `school_terms`
   ```sql
   SELECT * FROM school_terms WHERE school_id = 'your-school-id' 
   ORDER BY year DESC, term DESC LIMIT 1;
   ```

### Step 3: Test the Dashboard
1. Log in as an accountant or admin
2. Navigate to the Accountant Dashboard
3. Verify that KPIs now show real data:
   - **Collected Today**: Sum of payments made today
   - **Collected This Term**: Sum of payments in the current term
   - **Outstanding Balances**: Total unpaid fees (expected - paid)
   - **Students with Balances**: Count of students who owe money

## Technical Details

### KPI Calculations
- **Collected Today**: Filters payments where `created_at` date = today's date
- **Collected This Term**: Filters payments between term's `start_date` and `end_date`
- **Outstanding Balances**: For each active student: `expected_fee_amount - SUM(payments.amount)`
- **Students with Balances**: Count of students with outstanding > 0

### Database Schema Reference
```sql
-- payments table structure
CREATE TABLE payments (
  payment_id UUID PRIMARY KEY,
  student_id UUID REFERENCES students(student_id),
  school_id UUID REFERENCES schools(school_id),
  amount NUMERIC NOT NULL,
  payment_method TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- students table (relevant fields)
CREATE TABLE students (
  student_id UUID PRIMARY KEY,
  school_id UUID REFERENCES schools(school_id),
  name TEXT NOT NULL,
  current_class TEXT NOT NULL,
  status TEXT DEFAULT 'active',
  expected_fee_amount NUMERIC,
  admission_number TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## Testing Checklist
- [ ] Migration applied successfully
- [ ] Students have `expected_fee_amount` values set
- [ ] Payment records exist in the database
- [ ] Current term is defined in `school_terms`
- [ ] Accountant dashboard shows real numbers (not zeros)
- [ ] Payment table displays student names and amounts correctly
- [ ] PDF exports still work

## Troubleshooting

### Still Showing Zeros?
1. Check if you're logged in as the correct user (accountant or admin role)
2. Verify the user's `school_id` matches the school with data
3. Check browser console for any error messages
4. Verify RLS policies are applied (run the migration SQL)

### Permission Errors?
- Make sure the migration was applied successfully
- The accountant user must have a valid `school_id` in the `users` table
- Check that `users.role = 'accountant'` for your accountant account

## Need Help?
If issues persist, check:
1. Browser console for JavaScript errors
2. Supabase logs for database query errors
3. Network tab to see if API calls are failing


