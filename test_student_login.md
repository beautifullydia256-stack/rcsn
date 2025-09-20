# Student Login Debugging Guide

## Steps to Debug Student Dashboard Issue

### 1. Check Browser Console
1. Open the student dashboard page
2. Open browser developer tools (F12)
3. Go to Console tab
4. Look for the debug messages starting with "=== STUDENT DASHBOARD DEBUG ==="
5. Check what values are being logged

### 2. Run SQL Queries in Supabase
Run the queries in `debug_student_data.sql` to check:
- What students exist in the database
- What auth users have student role
- If there are mismatches between students and auth users

### 3. Check Student Login Process
1. Try logging in with a student account
2. Check if the login redirects to student dashboard
3. Verify the user metadata contains student information

### 4. Common Issues and Solutions

#### Issue: No student_id in user metadata
**Solution**: The student login creation might not have set the metadata properly
- Check the `/api/admin/create-student-login` API
- Verify the `user_metadata` is being set correctly

#### Issue: Student exists but not found by student_id
**Solution**: Check if the student_id format matches
- Compare the student_id in the students table vs auth metadata
- Check for data type mismatches (string vs UUID)

#### Issue: Student found but dashboard still shows error
**Solution**: Check the student data structure
- Verify all required fields exist (first_name, last_name, etc.)
- Check if the student status is 'active'

### 5. Test with Known Student
If you have a student account that should work:
1. Note the admission number
2. Check if it exists in the students table
3. Check if there's a corresponding auth user
4. Verify the metadata is set correctly

### 6. Manual Fix (if needed)
If the student exists but auth metadata is missing:
```sql
-- Update auth user metadata with student information
UPDATE auth.users 
SET raw_user_meta_data = raw_user_meta_data || '{"student_id": "STUDENT_ID_HERE", "admission_number": "ADMISSION_NUMBER_HERE"}'
WHERE email = 'STUDENT_EMAIL_HERE';
```

## Expected Debug Output
When working correctly, you should see:
```
=== STUDENT DASHBOARD DEBUG ===
User object: {id: "...", email: "...", ...}
User metadata: {student_id: "...", admission_number: "...", role: "student"}
Student ID from metadata: [UUID]
Admission number from metadata: [ADMISSION_NUMBER]
User email: [EMAIL]
Found student by student_id: [STUDENT_DATA]
```

## Next Steps
1. Run the debug queries
2. Check the browser console output
3. Share the results to identify the specific issue
4. Apply the appropriate fix
