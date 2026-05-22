import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../store/authStore';
import { isDesktopApp } from '../lib/isDesktopApp';
import { isDesktopPublicPath } from './desktopPublicPaths';
import { roleToPath } from '../lib/postAuthRedirect';
import ThemedLoadingView from '../components/ui/ThemedLoadingView';

function dashboardForStoredRole(role: string | null): string {
  const normalized = String(role ?? '').trim().toLowerCase().replace(/\s+/g, '_');
  return roleToPath[normalized] ?? '/dashboard';
}

/**
 * Desktop only: redirect unknown routes to /login when there is no session.
 * Public auth flows remain reachable without a session.
 * Works offline by trusting the persisted authStore when Supabase cannot be reached.
 */
export default function DesktopAuthGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [ready, setReady] = useState(!isDesktopApp);

  useEffect(() => {
    if (!isDesktopApp) return;

    let cancelled = false;

    void (async () => {
      const path = location.pathname;
      if (isDesktopPublicPath(path)) {
        // Special case: if the app landed on /login while offline but the user
        // already has a persisted session, skip the login form entirely and go
        // straight to their dashboard. The PIN screen will then appear there.
        // Use a sessionStorage flag so this redirect only fires once per app session,
        // preventing any loop with the auth state listener.
        const alreadyRedirected = sessionStorage.getItem('pweza-login-redirected');
        if (!navigator.onLine && !alreadyRedirected) {
          const { user, role } = useAuthStore.getState();
          if (user && !cancelled) {
            sessionStorage.setItem('pweza-login-redirected', '1');
            navigate(dashboardForStoredRole(role), { replace: true });
            setReady(true);
            return;
          }
        }
        if (!cancelled) setReady(true);
        return;
      }

      // Offline: trust the persisted authStore — it's in localStorage and survives app close.
      // Don't call supabase.auth.getSession() offline because it will try to refresh an expired
      // JWT and fail, incorrectly kicking the user out to the login page.
      if (!navigator.onLine) {
        if (!cancelled) {
          const { user } = useAuthStore.getState();
          if (!user) navigate('/login', { replace: true });
          setReady(true);
        }
        return;
      }

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (cancelled) return;

        if (!session) {
          // Also check persisted store — handles the brief window where Supabase hasn't
          // synced yet but the user is legitimately authenticated.
          const { user } = useAuthStore.getState();
          if (!user) navigate('/login', { replace: true });
        }
      } catch {
        // Network error during getSession (e.g. flaky connection). Trust persisted store.
        if (!cancelled) {
          const { user } = useAuthStore.getState();
          if (!user) navigate('/login', { replace: true });
        }
      }

      if (!cancelled) setReady(true);
    })();

    return () => {
      cancelled = true;
    };
  }, [location.pathname, navigate]);

  if (!isDesktopApp) {
    return <>{children}</>;
  }

  if (!ready) {
    return <ThemedLoadingView />;
  }

  return <>{children}</>;
}
