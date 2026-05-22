import React from 'react';
import { useNavigate } from 'react-router-dom';
import { logoutWithSyncCheck } from '@/lib/logoutWithSyncCheck';

type Props = {
  className?: string;
  children?: React.ReactNode;
  clearClientState?: () => void;
};

export default function LogoutButton({ className, children, clearClientState }: Props) {
  const navigate = useNavigate();

  const handleLogout = () => {
    void logoutWithSyncCheck(() => {
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
    });
  };

  return (
    <button type="button" onClick={handleLogout} className={className}>
      {children || 'Logout'}
    </button>
  );
}


