import { useState, type ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import { isDesktopPublicPath } from '@/router/desktopPublicPaths';
import ThemedLoadingView from '@/components/ui/ThemedLoadingView';
import { usePinLock } from './usePinLock';
import PinSetupScreen from './PinSetupScreen';
import PinLockScreen from './PinLockScreen';
import DesktopChangePinDialog from './DesktopChangePinDialog';

/**
 * Desktop only — wraps all authenticated content with PIN security:
 *  - Shows PIN setup on first login (and after skipping, reminds on each cold start)
 *  - Requires PIN on every cold start (fresh app open) and after 30 min of inactivity
 *  - Exposes a floating "Change PIN" button for users who want to update their PIN
 */
export default function DesktopPinGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const { phase, pinUser, failCount, lockedOut, setupPin, skipPinSetup, changePin, attemptUnlock, signOutAndClear } =
    usePinLock();
  const [showChangePinDialog, setShowChangePinDialog] = useState(false);

  // Public paths (login, etc.) — never gate
  if (isDesktopPublicPath(location.pathname)) {
    return <>{children}</>;
  }

  if (phase === 'loading') return <ThemedLoadingView />;

  // No session — DesktopAuthGate parent handles the redirect
  if (phase === 'no-session') return <>{children}</>;

  if (phase === 'setup' && pinUser) {
    return (
      <PinSetupScreen
        userName={pinUser.userName}
        onComplete={setupPin}
        onSkipForNow={skipPinSetup}
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

  // Unlocked — show the app + a subtle "Change PIN" button
  return (
    <>
      {children}

      {/* Floating "Change PIN" button — only visible when unlocked */}
      <button
        onClick={() => setShowChangePinDialog(true)}
        title="Change desktop PIN"
        style={{
          position: 'fixed',
          bottom: 14,
          right: 14,
          zIndex: 8000,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          padding: '5px 10px',
          borderRadius: 8,
          background: 'rgba(0,0,0,0.45)',
          border: '1px solid rgba(255,255,255,0.1)',
          color: 'rgba(255,255,255,0.35)',
          fontSize: 11,
          fontWeight: 600,
          cursor: 'pointer',
          backdropFilter: 'blur(8px)',
          fontFamily: 'inherit',
          transition: 'all 0.15s',
          letterSpacing: '0.3px',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.color = 'rgba(255,255,255,0.75)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.25)';
          e.currentTarget.style.background = 'rgba(0,0,0,0.65)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.color = 'rgba(255,255,255,0.35)';
          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
          e.currentTarget.style.background = 'rgba(0,0,0,0.45)';
        }}
      >
        🔐 Change PIN
      </button>

      <AnimatePresence>
        {showChangePinDialog && (
          <DesktopChangePinDialog
            onChangePin={changePin}
            onClose={() => setShowChangePinDialog(false)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
