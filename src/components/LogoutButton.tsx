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
      await supabase.auth.signOut();
    } finally {
      try {
        // Clear any custom per-tab/session keys if used
        if (typeof window !== 'undefined') {
          sessionStorage.clear();
          localStorage.removeItem('cookie-consent');
        }
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


