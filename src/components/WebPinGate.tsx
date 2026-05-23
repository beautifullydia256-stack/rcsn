import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePinLock } from '../desktop/pin/usePinLock';
import PinSetupScreen from '../desktop/pin/PinSetupScreen';
import PinLockScreen from '../desktop/pin/PinLockScreen';

// Paths that are always public — PIN gate never shows here
// Note: /login is intentionally excluded from this list in standalone mode
// so the PIN screen replaces the login form when the PWA opens.
const NON_AUTH_PREFIXES = [
  '/register',
  '/auth/',
  '/jobs',
  '/contact',
  '/help',
  '/privacy-policy',
  '/security',
  '/affiliate',
  '/library',
  '/apps',
];

function isNonAuthPath(path: string) {
  return NON_AUTH_PREFIXES.some((p) => path === p || path.startsWith(p + '/'));
}

function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  if ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true) return true;
  return window.matchMedia('(display-mode: standalone)').matches;
}

/**
 * Web-only PIN gate: wraps the whole app in installed PWA mode.
 *
 * In a regular browser tab — does nothing.
 * In standalone (installed PWA):
 *   - Non-auth pages (/register, /library, etc.) always pass through.
 *   - /login is intercepted: shows PIN lock/setup instead of the login form
 *     so the user never has to re-enter their email + password.
 *   - After unlocking on /login, redirects to /dashboard automatically.
 */
export default function WebPinGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { phase, pinUser, failCount, lockedOut, setupPin, attemptUnlock, signOutAndClear } =
    usePinLock();
  const [pinSetupSkipped, setPinSetupSkipped] = useState(false);

  const standalone = isStandalonePWA();
  const atLogin = location.pathname === '/login' || location.pathname.startsWith('/login/');

  // Once unlocked while sitting on /login (standalone), send the user to their dashboard.
  // This handles the case where /login is the start_url — the PIN screen shows first,
  // and after the correct PIN is entered we forward them without ever showing the login form.
  useEffect(() => {
    if (!standalone || phase !== 'unlocked' || !atLogin) return;
    navigate('/dashboard', { replace: true });
  }, [standalone, phase, atLogin, navigate]);

  // In a regular browser tab the gate is always open
  if (!standalone) return <>{children}</>;

  // Always pass through pages that have nothing to do with authentication
  if (isNonAuthPath(location.pathname)) return <>{children}</>;

  // While the session is being resolved (async) or there is genuinely no session,
  // let the normal auth flow handle it (ProtectedRoute / Login page)
  if (phase === 'loading' || phase === 'no-session') return <>{children}</>;

  // ── Session confirmed ────────────────────────────────────────────────────────

  if (phase === 'setup' && !pinSetupSkipped && pinUser) {
    return (
      <PinSetupScreen
        userName={pinUser.userName}
        onComplete={setupPin}
        onSkipForNow={() => setPinSetupSkipped(true)}
      />
    );
  }

  if (phase === 'locked' && pinUser) {
    return (
      <PinLockScreen
        userName={pinUser.userName}
        failCount={failCount}
        lockedOut={lockedOut}
        onAttempt={attemptUnlock}
        onSignOut={signOutAndClear}
      />
    );
  }

  return <>{children}</>;
}
