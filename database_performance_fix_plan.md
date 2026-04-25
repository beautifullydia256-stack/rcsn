# Database Performance and Security Fix Plan

## Current Status
We're continuing to fix Supabase database performance and security warnings. The profiles table RLS performance has been fixed successfully.

## Completed Steps
- ✅ **Step 7**: Fixed profiles table RLS performance issues
- ✅ **Step 3**: Removed materialized view permissions  
- ✅ Fixed security warnings by enabling RLS on tables
- ✅ Removed fake/placeholder data from owner dashboard
- ✅ Fixed referral codes database persistence and TypeScript errors

## Next Steps to Run

### 1. Fix Referral Codes RLS Performance
**File**: `step8_fix_referral_codes_rls_performance.sql`
- Fixes RLS policies for referral_codes table
- Replaces direct `auth.uid()` calls with `(select auth.uid())`

### 2. Fix Extension Schema Warning (May Fail)
**File**: `step4_fix_extension_schema.sql`
- Attempts to move `btree_gist` extension from public schema
- **Note**: May fail due to superuser privilege requirements
- If it fails, document that Supabase support is needed

### 3. Fix Remaining Tables RLS Performance
Run these in order to fix remaining `auth_rls_initplan` warnings:

- **Step 9**: `step9_fix_users_rls_performance.sql` - Fix users table
- **Step 10**: `step10_fix_user_sessions_rls_performance.sql` - Fix user_sessions table  
- **Step 11**: `step11_fix_login_activities_rls_performance.sql` - Fix login_activities table
- **Step 12**: `step12_fix_school_subscriptions_rls_performance.sql` - Fix school_subscriptions table
- **Step 13**: `step13_fix_system_health_metrics_rls_performance.sql` - Fix system_health_metrics table
- **Step 14**: `step14_fix_audit_logs_rls_performance.sql` - Fix audit_logs table
- **Step 15**: `step15_fix_school_requests_rls_performance.sql` - Fix school_requests table

### 4. Check Multiple Permissive Policies
**File**: `step16_check_multiple_permissive_policies.sql`
- Identifies tables with conflicting RLS policies
- Shows which policies need to be consolidated

## Important Notes

### Safety First
- ⚠️ **CRITICAL**: Never reset database or run destructive operations
- ✅ All scripts check existing policies before making changes
- ✅ Scripts use `DROP POLICY IF EXISTS` to avoid errors
- ✅ Step-by-step approach to avoid long failing scripts

### Expected Issues
1. **Extension Warning**: The `btree_gist` extension warning may require Supabase support to fix
2. **Policy Conflicts**: Some tables may have multiple permissive policies that need consolidation
3. **Column Mismatches**: Some RLS policies may reference columns that don't exist

### How to Proceed
1. Run `step8_fix_referral_codes_rls_performance.sql` first
2. Try `step4_fix_extension_schema.sql` (document if it fails)
3. Run the remaining RLS performance fixes (steps 9-15) one by one
4. Run `step16_check_multiple_permissive_policies.sql` to identify remaining conflicts
5. Address any policy conflicts found in step 16

## Expected Outcome
After completing these steps:
- ✅ All `auth_rls_initplan` performance warnings should be resolved
- ✅ Most security warnings should be fixed
- ⚠️ Extension warning may remain (requires Supabase support)
- ⚠️ Some policy conflicts may need manual resolution

Let me know when you're ready to proceed with the next step!