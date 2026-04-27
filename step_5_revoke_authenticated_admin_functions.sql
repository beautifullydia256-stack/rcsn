-- STEP 5: Revoke EXECUTE from authenticated role on admin-only functions
-- These functions should only be callable by admins, not by any authenticated user
-- Admins will retain access through their specific admin role permissions

-- Admin Discipline Functions (admin-only)
REVOKE EXECUTE ON FUNCTION public.admin_add_discipline_action(uuid, text, text, date, date) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.admin_list_students_discipline_filtered(text) FROM authenticated;

-- Registration Functions (should be called during signup, not by regular users)
REVOKE EXECUTE ON FUNCTION public.register_school_admin_final(uuid, text, text, text, text, text, text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.register_school_admin_with_referral(uuid, text, text, text, text, text, text, uuid) FROM authenticated;

-- Owner Check Function (should only be used internally or by owners)
REVOKE EXECUTE ON FUNCTION public.is_current_user_owner() FROM authenticated;

-- Owner Dashboard Functions (owner-only)
REVOKE EXECUTE ON FUNCTION public.get_owner_dashboard_metrics() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_owner_dashboard_metrics_realtime() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_owner_revenue_metrics() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_owner_system_alerts() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_owner_user_stats() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_secure_owner_dashboard_metrics() FROM authenticated;

-- Owner-Only Student Operations
REVOKE EXECUTE ON FUNCTION public.owner_restore_soft_deleted_student(uuid, text) FROM authenticated;

-- System Audit & Statistics (admin-only)
REVOKE EXECUTE ON FUNCTION public.get_audit_logs(integer, integer, uuid, text, text, timestamp with time zone, timestamp with time zone) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_role_statistics() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_database_size() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_login_activity_stats() FROM authenticated;

-- Phone Lookup Functions (sensitive - should be restricted)
REVOKE EXECUTE ON FUNCTION public.find_parents_by_phone_last9(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.find_staff_users_by_phone_last9(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.find_teachers_by_phone_last9(text) FROM authenticated;
