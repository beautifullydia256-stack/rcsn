import React from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { markChatPresenceOffline } from '@/lib/schoolChatApi';

type Props = {
  className?: string;
  children?: React.ReactNode;
  clearClientState?: () => void;
};

export default function LogoutButton({ className, children, clearClientState }: Props) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await markChatPresenceOffline();
      await supabase.auth.signOut();
    } finally {
      try {
        if (typeof window !== 'undefined') {
          sessionStorage.clear();
          localStorage.removeItem('cookie-consent');
          localStorage.removeItem('pwezacore_remember');
        }
      } catch {}
      if (clearClientState) {
        try { clearClientState(); } catch {}
      }
      navigate('/login', { replace: true });
    }
  };

  return (
    <button type="button" onClick={handleLogout} className={className}>
      {children || 'Logout'}
    </button>
  );
}


