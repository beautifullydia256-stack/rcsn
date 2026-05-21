import { useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { usePinLock } from '../desktop/pin/usePinLock';
import PinSetupScreen from '../desktop/pin/PinSetupScreen';
import PinLockScreen from '../desktop/pin/PinLockScreen';

const PUBLIC_PREFIXES = [
  '/login',
  '/register',
  '/auth/',
  '/jobs',
  '/contact',
  '/help',
  '/privacy-policy',
  '/security',
  '/affiliate',
  '/library',
];

function isPublicPath(path: string) {
  return PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p + '/') || path === p);
}

function isStandalonePWA(): boolean {
  if (typeof window === 'undefined') return false;
  // iOS Safari standalone
  if ('standalone' in navigator && (navigator as { standalone?: boolean }).standalone === true) {
    return true;
  }
  // Chrome / Android standalone
  return window.matchMedia('(display-mode: standalone)').matches;
}

/**
 * Web-only PIN gate: wraps authenticated content in installed PWA mode.
 * Reuses the same pin storage and lock/setup screens as the desktop app.
 * Does nothing in regular browser tabs (non-standalone).
 */
export default function WebPinGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { phase, pinUser, failCount, lockedOut, setupPin, attemptUnlock, signOutAndClear } =
    usePinLock();
  const [pinSetupSkipped, setPinSetupSkipped] = useState(false);

  // Never gate public auth pages
  if (isPublicPath(location.pathname)) return <>{children}</>;

  // Only activate when running as an installed PWA
  if (!isStandalonePWA()) return <>{children}</>;

  // While resolving session / no session — pass through (auth gates handle this)
  if (phase === 'loading' || phase === 'no-session') return <>{children}</>;

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
