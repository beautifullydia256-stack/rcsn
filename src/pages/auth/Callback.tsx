import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { applyReturnUrlOverride, resolvePostLoginPath, userMustChangePassword } from '@/lib/postAuthRedirect';

function isRecoveryImplicitFromHash(): boolean {
  const h = window.location.hash;
  if (!h || h.length < 2) return false;
  const p = new URLSearchParams(h.slice(1));
  return p.get('type') === 'recovery';
}

/**
 * Email confirmation, magic links, OAuth, and password recovery (PKCE).
 * Recovery uses `?flow=recovery` on redirect so we can send users to set-password (exchange reports SIGNED_IN).
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const params = new URLSearchParams(window.location.search);
    const flowRecovery = params.get('flow') === 'recovery';
    const code = params.get('code');

    async function finishRecoveryOrDashboard() {
      const { data: { session } } = await supabase.auth.getSession();
      if (cancelled) return;
      if (!session) {
        navigate('/login', { replace: true });
        return;
      }
      if (flowRecovery || isRecoveryImplicitFromHash()) {
        navigate('/auth/update-password', { replace: true });
        return;
      }
      if (userMustChangePassword(session.user)) {
        navigate('/login/complete-password', { replace: true });
        return;
      }
      navigate(applyReturnUrlOverride(await resolvePostLoginPath(session.user)), { replace: true });
    }

    async function run() {
      if (code) {
        const { data, error } = await supabase.auth.exchangeCodeForSession(code);
        if (cancelled) return;
        if (error) {
          console.warn('[auth/callback] exchangeCodeForSession', error);
          await finishRecoveryOrDashboard();
          return;
        }
        const redirectType = (data as { redirectType?: string | null })?.redirectType;
        if (flowRecovery || redirectType === 'PASSWORD_RECOVERY') {
          navigate('/auth/update-password', { replace: true });
          return;
        }
        if (data.session) {
          if (userMustChangePassword(data.session.user)) {
            navigate('/login/complete-password', { replace: true });
          } else {
            navigate(applyReturnUrlOverride(await resolvePostLoginPath(data.session.user)), { replace: true });
          }
          return;
        }
      }

      for (let i = 0; i < 12; i++) {
        if (cancelled) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          if (flowRecovery || isRecoveryImplicitFromHash()) {
            navigate('/auth/update-password', { replace: true });
          } else if (userMustChangePassword(session.user)) {
            navigate('/login/complete-password', { replace: true });
          } else {
            navigate(applyReturnUrlOverride(await resolvePostLoginPath(session.user)), { replace: true });
          }
          return;
        }
        await new Promise((r) => setTimeout(r, 120));
      }

      if (!cancelled) {
        navigate('/login', { replace: true });
      }
    }

    void run();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
    </div>
  );
}
