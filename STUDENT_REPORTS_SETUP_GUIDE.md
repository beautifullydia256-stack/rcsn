# Student Reports Setup Guide

## 🚀 Quick Setup Instructions

To ensure the Student Report feature works perfectly, you need to run some SQL scripts in your Supabase database. Here's the step-by-step process:

## 📋 Step 1: Run the Main Setup Script

1. **Open Supabase Dashboard**
   - Go to your Supabase project dashboard
   - Navigate to **SQL Editor**

2. **Run the Setup Script**
   - Copy the contents of `setup_student_reports.sql`
   - Paste it into the SQL Editor
   - Click **Run** to execute the script

   This script will:
   - ✅ Create all required tables (`exam_sets`, `exam_results`, `student_attendance`, `student_fees`)
   - ✅ Add missing columns to existing tables
   - ✅ Create necessary indexes for performance
   - ✅ Set up Row Level Security (RLS) policies
   - ✅ Insert sample exam sets for the current year
   - ✅ Create helpful views for reporting

## 🔍 Step 2: Verify Everything is Working

1. **Run the Verification Script**
   - Copy the contents of `verify_student_reports.sql`
   - Paste it into the SQL Editor
   - Click **Run** to check the setup

   This will show you:
   - ✅ Which tables exist
   - ✅ Which columns are available
   - ✅ What data is available
   - ✅ What still needs to be set up

## 📊 Step 3: Add Your Data

Based on the verification results, you may need to add:

### A. Student Admission Numbers
If students don't have admission numbers:
```sql
UPDATE students 
SET admission_number = 'STU' || LPAD(ROW_NUMBER() OVER (ORDER BY created_at)::TEXT, 4, '0')
WHERE admission_number IS NULL OR admission_number = '';
```

### B. School Information
Add school details for professional reports:
```sql
UPDATE schools 
SET 
    motto = 'Your School Motto Here',
    address = 'Your School Address',
    phone = 'Your School Phone',
    email = 'your-school@email.com'
WHERE school_id = 'your-school-id';
```

### C. Exam Results
Add exam results for students:
```sql
INSERT INTO public.exam_results (school_id, exam_set_id, student_id, class_name, subject, marks_obtained, total_marks)
VALUES 
    ('your-school-id', 'exam-set-id', 'student-id', 'Primary 5', 'Mathematics', 85, 100),
    ('your-school-id', 'exam-set-id', 'student-id', 'Primary 5', 'English', 78, 100);
```

### D. Student Attendance
Add attendance records:
```sql
INSERT INTO student_attendance (school_id, class_name, student_id, teacher_id, date, present)
VALUES 
    ('your-school-id', 'Primary 5', 'student-id', 'teacher-id', CURRENT_DATE, true);
```

### E. Student Fees
Add fees information:
```sql
INSERT INTO student_fees (school_id, student_id, term, year, total_fees, paid_amount)
VALUES 
    ('your-school-id', 'student-id', 1, 2024, 500000, 300000);
```

## 🎯 Step 4: Test the Feature

1. **Navigate to Reports**
   - Go to your app: `/dashboard/admin/reports/generate`

2. **Test Report Generation**
   - Select an exam set
   - Choose a class
   - Select a student
   - Click "Preview Report"

3. **Verify the Report**
   - Check that student information appears
   - Verify exam results are shown
   - Confirm attendance and fees data
   - Test download and print functions

## 🔧 Troubleshooting

### Common Issues and Solutions:

#### 1. "No exam sets available"
**Solution**: Run the setup script to create sample exam sets, or create your own:
```sql
INSERT INTO public.exam_sets (school_id, name, description, term, year, is_active)
VALUES ('your-school-id', 'Term 1 Exams', 'First term examinations', 1, 2024, true);
```

#### 2. "No students found"
**Solution**: Ensure you have active students in your database:
```sql
SELECT * FROM students WHERE status = 'active';
```

#### 3. "No exam results found"
**Solution**: Add exam results for the selected exam set:
```sql
INSERT INTO public.exam_results (school_id, exam_set_id, student_id, class_name, subject, marks_obtained, total_marks)
SELECT 
    s.school_id,
    es.id,
    st.student_id,
    st.current_class,
    'Mathematics',
    75,
    100
FROM students st
JOIN schools s ON st.school_id = s.school_id
JOIN public.exam_sets es ON es.school_id = s.school_id AND es.is_active = true
WHERE st.status = 'active';
```

#### 4. "Permission denied" errors
**Solution**: The setup script includes RLS policies. If you still get permission errors, check your user role and school association.

## 📝 Data Requirements Summary

For the Student Report feature to work, you need:

### Required Tables:
- ✅ `schools` - School information
- ✅ `students` - Student data
- ✅ `exam_sets` - Exam periods
- ✅ `exam_results` - Subject marks
- ✅ `student_attendance` - Attendance records
- ✅ `student_fees` - Fees information

### Required Data:
- ✅ At least one school
- ✅ Active students with admission numbers
- ✅ At least one active exam set
- ✅ Exam results for students
- ✅ Attendance records (optional but recommended)
- ✅ Fees information (optional but recommended)

## 🎉 You're Ready!

Once you've completed these steps, your Student Report feature will be fully functional and ready to generate professional academic reports in the Ugandan school format!

## 📞 Need Help?

If you encounter any issues:
1. Check the verification script results
2. Ensure all required data is present
3. Verify your user has the correct permissions
4. Check the browser console for any JavaScript errors

The feature is designed to be robust and will provide helpful error messages to guide you through any setup issues.
