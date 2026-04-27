# Supabase Security Fix Execution Plan

## Overview
Your Supabase database has a critical security vulnerability where 80+ `SECURITY DEFINER` functions are accessible to both anonymous (`anon`) and authenticated users. This allows unauthorized access to sensitive operations.

## Security Issues Identified
- **80+ functions** accessible to `anon` role (unauthenticated users)
- **80+ functions** accessible to `authenticated` role (any signed-in user)
- Functions include: financial operations, user management, admin functions, system operations

## Execution Order

### 1. Backup First (CRITICAL)
```sql
-- Create a backup before making changes
pg_dump your_database > backup_before_security_fix.sql
```

### 2. Execute Scripts in Order

#### Option A: Use Individual Scripts (Recommended for testing)
1. `step_4_revoke_anon_batch_1.sql` - Revoke anon access to most functions
2. `step_5_revoke_authenticated_admin_functions.sql` - Revoke authenticated access to admin-only functions  
3. `step_6_revoke_authenticated_batch_2.sql` - Revoke authenticated access to remaining sensitive functions
4. `step_7_revoke_remaining_functions.sql` - Complete the anon revocations

#### Option B: Use Complete Script (Faster)
1. `complete_security_fix.sql` - All revocations in one script

### 3. Verification
Run the verification queries in `security_verification.sql`

## Impact Assessment

### Functions That Will Be Restricted
- **Financial Functions**: Invoice generation, payment processing, balance calculations
- **Admin Functions**: User management, discipline actions, system settings
- **Owner Functions**: Dashboard metrics, system statistics, audit logs
- **HR Functions**: Leave management, payroll access
- **Exam Functions**: Grade entry, report generation
- **System Functions**: Database maintenance, rollover operations

### Who Will Be Affected
- **Anonymous users**: Will lose access to ALL listed functions (this is intended)
- **Authenticated users**: Will lose access to admin/owner-only functions (this is intended)
- **Admins/Owners**: Should retain access through proper role assignments

## Post-Execution Steps

### 1. Verify Role-Based Access
Ensure your application has proper role-based access control:
```sql
-- Example: Grant specific functions to admin role
GRANT EXECUTE ON FUNCTION public.admin_add_discipline_action(uuid, text, text, date, date) TO admin_role;
```

### 2. Update Application Code
- Review API calls that use these functions
- Ensure proper authentication and authorization
- Update error handling for permission denied errors

### 3. Test Functionality
- Test all user flows as different user types
- Verify admin functions work for admin users
- Verify regular users can't access restricted functions

## Rollback Plan
If issues occur, you can restore from backup:
```sql
-- Restore from backup if needed
psql your_database < backup_before_security_fix.sql
```

## Security Best Practices Going Forward

1. **Principle of Least Privilege**: Only grant minimum necessary permissions
2. **Role-Based Access**: Use proper database roles instead of broad permissions
3. **Regular Audits**: Periodically review function permissions
4. **Security Testing**: Test with different user roles regularly

## Monitoring
After implementation, monitor for:
- Permission denied errors in application logs
- Failed function calls
- User complaints about missing functionality

## Next Steps
1. Execute the security fix
2. Implement proper role-based permissions
3. Update application code as needed
4. Test thoroughly
5. Monitor for issues