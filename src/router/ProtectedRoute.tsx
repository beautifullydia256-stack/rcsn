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
import { useOfflineModeStore } from '../store/offlineModeStore';
import { isDesktopApp } from '../lib/isDesktopApp';
import { confirmSessionIsDead } from '../lib/sessionHealth';
import { userMustChangePassword } from '../lib/postAuthRedirect';
import { usePwezaStore } from '../store/pwezaStore';
import { ensureCurrentAndNextAcademicYears } from '../lib/ensureAcademicYear';
import { refreshPermissionsForSession } from '../lib/refreshPermissions';
import ThemedLoadingView from '../components/ui/ThemedLoadingView';
import OfflineSetupDialog from '../components/OfflineSetupDialog';

export default function ProtectedRoute() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [showOfflineSetup, setShowOfflineSetup] = useState(false);
  const { user, setUser, setRole, setSchoolId, setPermissions, schoolId } = useAuthStore();
  const { mode } = useOfflineModeStore();
  const initPweza = usePwezaStore((s) => s.init); // pweza speed system
  const resetPweza = usePwezaStore((s) => s.reset); // pweza speed system

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();

        if (error || !session) {
          // No confirmed local session (or a benign local error). navigator.onLine is not
          // a reliable signal here — it can report "online" on a dead connection, or lag
          // right at app startup — so don't trust it either way. Positively confirm with
          // the server before forcing a logout; otherwise trust whatever's persisted.
          if (await confirmSessionIsDead()) {
            navigate('/login');
            return;
          }
          const stored = useAuthStore.getState();
          if (stored.user) {
            setLoading(false);
            return;
          }
          navigate('/login');
          return;
        }

        if (userMustChangePassword(session.user)) {
          navigate('/login/complete-password', { replace: true });
          return;
        }

        // Get user role from users table (and is_active for deactivated accounts)
        const { data: userData, error: userDbError } = await supabase
          .from('users')
          .select('role, school_id, is_active')
          .eq('user_id', session.user.id)
          .single();

        if (userDbError && navigator.onLine) {
          if (await confirmSessionIsDead()) {
            useAuthStore.getState().logout();
            navigate('/login', { replace: true });
            return;
          }
        }

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
          // Cache school data in the background if offline mode is enabled.
          // If mode is null (first ever login), we'll show the setup dialog instead.
          // Desktop: offline support isn't optional — always keep the local cache primed,
          // overriding any prior 'online-only' choice, so closing/reopening without
          // internet always has data to fall back on.
          if (userData.school_id) {
            if (isDesktopApp) {
              if (useOfflineModeStore.getState().mode !== 'offline') {
                useOfflineModeStore.getState().setMode('offline');
              }
              void cacheSchoolData(userData.school_id).then(() => {
                useOfflineModeStore.getState().setLastSynced(new Date().toISOString());
              });
            } else if (useOfflineModeStore.getState().mode === 'offline') {
              void cacheSchoolData(userData.school_id);
            }
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
        // Any thrown error here (e.g. the role/permissions fetch failing over a dead
        // connection) is itself proof we couldn't complete the online check — trust the
        // persisted session rather than gating on navigator.onLine, which isn't reliable.
        const stored = useAuthStore.getState();
        if (stored.user) {
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
          // Supabase fires this offline when it can't refresh an expired JWT, or when the
          // refresh token is genuinely dead — those need opposite handling. navigator.onLine
          // isn't reliable enough to tell them apart, so ask the server directly.
          const stored = useAuthStore.getState().user;
          if (stored) {
            void confirmSessionIsDead().then((dead) => {
              if (!dead) return;
              resetPweza(); // pweza speed system
              navigate('/login');
            });
            return;
          }
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

  // Show offline setup dialog on first login (mode === null means never chosen).
  // Desktop skips this entirely — offline caching is enabled automatically above.
  useEffect(() => {
    if (!loading && user && mode === null && navigator.onLine && !isDesktopApp) {
      setShowOfflineSetup(true);
    }
  }, [loading, user, mode]);

  // Refresh cache when coming back online (for users who chose offline mode)
  useEffect(() => {
    const sid = useAuthStore.getState().schoolId;
    if (!sid) return;
    const handleOnline = () => {
      if (useOfflineModeStore.getState().mode === 'offline') {
        void cacheSchoolData(sid);
        useOfflineModeStore.getState().setLastSynced(new Date().toISOString());
      }
    };
    window.addEventListener('online', handleOnline);
    return () => window.removeEventListener('online', handleOnline);
  }, []);

  if (loading) {
    return <ThemedLoadingView />;
  }

  return (
    <>
      <Outlet />
      {showOfflineSetup && schoolId && (
        <OfflineSetupDialog
          schoolId={schoolId}
          onDone={() => setShowOfflineSetup(false)}
        />
      )}
    </>
  );
}




