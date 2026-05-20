import { useState, type ReactNode } from 'react';
import { useLocation } from 'react-router-dom';
import { isDesktopPublicPath } from '@/router/desktopPublicPaths';
import ThemedLoadingView from '@/components/ui/ThemedLoadingView';
import { usePinLock } from './usePinLock';
import PinSetupScreen from './PinSetupScreen';
import PinLockScreen from './PinLockScreen';

/**
 * Desktop only: shows a PIN setup or lock screen when the user is idle for 30 minutes
 * or when the app is opened after a long absence. Wraps all authenticated content.
 */
export default function DesktopPinGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { phase, pinUser, failCount, lockedOut, setupPin, attemptUnlock, signOutAndClear } =
    usePinLock();
  const [pinSetupSkipped, setPinSetupSkipped] = useState(false);

  // Public paths (login, etc.) — never gate
  if (isDesktopPublicPath(location.pathname)) {
    return <>{children}</>;
  }

  if (phase === 'loading') return <ThemedLoadingView />;

  // No session — DesktopAuthGate parent handles the redirect
  if (phase === 'no-session') return <>{children}</>;

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
