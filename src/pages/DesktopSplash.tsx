import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { userMustChangePassword } from '../lib/postAuthRedirect';
import ThemedLoadingView from '../components/ui/ThemedLoadingView';

/**
 * Desktop app entry: no marketing home — send users to login or the dashboard.
 */
export default function DesktopSplash() {
  const [target, setTarget] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        setTarget('/login');
        return;
      }
      if (userMustChangePassword(session.user)) {
        setTarget('/login/complete-password');
        return;
      }
      setTarget('/dashboard');
    })();
  }, []);

  if (!target) {
    return <ThemedLoadingView />;
  }

  return <Navigate to={target} replace />;
}
