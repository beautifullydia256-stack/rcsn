import { useEffect, useState, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePinLock } from '../desktop/pin/usePinLock';
import PinSetupScreen from '../desktop/pin/PinSetupScreen';
import PinLockScreen from '../desktop/pin/PinLockScreen';
import GlassBackground from './layout/GlassBackground';

// Paths that are always public — PIN gate never shows here
// Note: /login is intentionally excluded from this list in standalone mode
// so the PIN screen replaces the login form when the PWA opens.
const NON_AUTH_PREFIXES = [
  '/register',
  '/auth/',
  '/jobs',
  '/careers',
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
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  // Also enable if developer / user testing in browser with ?pin=1
  if (window.location.search.includes('pin=1')) return true;
  return false;
}

/**
 * Web-only PIN gate: wraps the whole app in installed PWA mode.
 *
 * In a regular browser tab — does nothing (unless ?pin=1 is set for testing).
 * In standalone (installed PWA):
 *   - Non-auth pages (/register, /library, etc.) always pass through.
 *   - /login is intercepted: shows PIN lock/setup instead of the login form.
 *   - Strictly blocks the dashboard until the 4-digit PIN is entered.
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
  useEffect(() => {
    if (!standalone || phase !== 'unlocked' || !atLogin) return;
    navigate('/dashboard', { replace: true });
  }, [standalone, phase, atLogin, navigate]);

  // In a regular browser tab the gate is always open (unless ?pin=1)
  if (!standalone) return <>{children}</>;

  // Always pass through pages that have nothing to do with authentication
  if (isNonAuthPath(location.pathname)) return <>{children}</>;

  // While the session is resolving, show neutral wallpaper so no background page or login form can mount and redirect prematurely
  if (phase === 'loading') {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center">
        <GlassBackground />
      </div>
    );
  }

  // Genuinely no session — let the normal auth flow handle it (Login page)
  if (phase === 'no-session') return <>{children}</>;

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
