import { useEffect, useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { queryClient } from '../lib/queryClient';
import {
  adminSettingsSchoolRowQueryKey,
  ADMIN_SETTINGS_SCHOOL_ROW_STALE_MS,
  fetchAdminSettingsSchoolRow,
} from '../lib/adminSettingsSchoolContext';
import { markChatPresenceOffline } from '../lib/schoolChatApi';
import { useAuthStore } from '../store/authStore';
import { cacheSchoolData } from '../lib/offlineSync';
import { userMustChangePassword } from '../lib/postAuthRedirect';
import { usePwezaStore } from '../store/pwezaStore';
import { ensureCurrentAndNextAcademicYears } from '../lib/ensureAcademicYear';
import { refreshPermissionsForSession } from '../lib/refreshPermissions';
import ThemedLoadingView from '../components/ui/ThemedLoadingView';

export default function ProtectedRoute() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const { user, setUser, setRole, setSchoolId, setPermissions } = useAuthStore();
  const initPweza = usePwezaStore((s) => s.init); // pweza speed system
  const resetPweza = usePwezaStore((s) => s.reset); // pweza speed system

  useEffect(() => {
    const checkAuth = async () => {
      // Offline: trust persisted auth state (user/role/schoolId in localStorage) rather than hitting Supabase
      if (!navigator.onLine) {
        const stored = useAuthStore.getState();
        if (stored.user) {
          setLoading(false);
          return;
        }
        navigate('/login');
        return;
      }

      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          navigate('/login');
          return;
        }

        if (userMustChangePassword(session.user)) {
          navigate('/login/complete-password', { replace: true });
          return;
        }

        // Get user role from users table (and is_active for deactivated accounts)
        const { data: userData } = await supabase
          .from('users')
          .select('role, school_id, is_active')
          .eq('user_id', session.user.id)
          .single();

        if (userData) {
          if (userData.is_active === false) {
            await markChatPresenceOffline();
            await supabase.auth.signOut();
            navigate('/login');
            return;
          }
          setUser(session.user);
          setRole(userData.role);
          setSchoolId(userData.school_id);
          // Start caching all school data in the background immediately on login
          if (userData.school_id) {
            void cacheSchoolData(userData.school_id);
          }
          if (userData.school_id) {
            void queryClient.prefetchQuery({
              queryKey: adminSettingsSchoolRowQueryKey(userData.school_id),
              queryFn: () => fetchAdminSettingsSchoolRow(userData.school_id as string),
              staleTime: ADMIN_SETTINGS_SCHOOL_ROW_STALE_MS,
            });
          }
          if (
            userData.school_id &&
            ['admin', 'head_teacher'].includes(String(userData.role).toLowerCase().replace(/\s+/g, '_'))
          ) {
            initPweza(userData.school_id, session.user.id); // pweza speed system
          }
          await refreshPermissionsForSession(supabase, setPermissions);
          void ensureCurrentAndNextAcademicYears(); // Keep academic calendar ahead
        } else {
          // Fallback to metadata
          const role = session.user.user_metadata?.role || 
                      (session.user.user_metadata?.student_id ? 'student' : null);
          setUser(session.user);
          setRole(role);
          setPermissions([]);
        }

        setLoading(false);
      } catch (error) {
        console.error('Auth check failed:', error);
        // Network error while offline — fall back to persisted session
        const stored = useAuthStore.getState();
        if (!navigator.onLine && stored.user) {
          setLoading(false);
          return;
        }
        navigate('/login');
      }
    };

    checkAuth();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
          resetPweza(); // pweza speed system
          navigate('/login');
        } else if (session) {
          setUser(session.user);
          if (userMustChangePassword(session.user)) {
            navigate('/login/complete-password', { replace: true });
          }
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate, setUser, setRole, setSchoolId, initPweza, resetPweza]);

  if (loading) {
    return <ThemedLoadingView />;
  }

  return <Outlet />;
}




