'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/src/lib/supabase';

type Props = {
  className?: string;
  children?: React.ReactNode;
  clearClientState?: () => void; // optional callback to clear any extra client caches/stores
};

export default function LogoutButton({ className, children, clearClientState }: Props) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      // Sign out on client (clears sessionStorage-based auth)
      await supabase.auth.signOut();
    } finally {
      try {
        // Clear any custom per-tab/session keys if used
        if (typeof window !== 'undefined') {
          sessionStorage.clear();
          localStorage.removeItem('cookie-consent');
          // Also clear any remembered token cache used by login
          localStorage.removeItem('pwezacore_remember');
        }
      } catch {}
      // Ensure SSR cookies are cleared so middleware doesn't think we're still signed in
      try {
        await fetch('/api/auth/logout', { method: 'POST' });
      } catch {}
      if (clearClientState) {
        try { clearClientState(); } catch {}
      }
      router.replace('/login');
    }
  };

  return (
    <button onClick={handleLogout} className={className}>
      {children || 'Logout'}
    </button>
  );
}


