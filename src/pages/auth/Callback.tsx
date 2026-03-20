import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';

/**
 * Handles email confirmation, magic links, and password-recovery redirects.
 * Tokens may arrive in the URL hash or as a ?code= (PKCE); we poll briefly for a session.
 */
export default function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate('/dashboard', { replace: true });
      }
    });

    async function run() {
      if (typeof window !== 'undefined' && window.location.search.includes('code=')) {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) console.warn('[auth/callback] exchangeCodeForSession', error);
      }

      for (let i = 0; i < 8; i++) {
        if (cancelled) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate('/dashboard', { replace: true });
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
      subscription.unsubscribe();
    };
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
    </div>
  );
}
