import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { isDesktopApp } from '../lib/isDesktopApp';
import { isDesktopPublicPath } from './desktopPublicPaths';
import ThemedLoadingView from '../components/ui/ThemedLoadingView';

/**
 * Desktop only: redirect unknown routes to /login when there is no session.
 * Public auth flows remain reachable without a session.
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
        if (!cancelled) setReady(true);
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!session) {
        navigate('/login', { replace: true });
      }
      setReady(true);
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
