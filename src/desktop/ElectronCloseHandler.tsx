import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/authStore';
import { flushQueue } from '@/lib/offlineSync';
import { queueCount } from '@/lib/offlineDb';

interface DesktopBridge {
  onBeforeClose?: (cb: () => void) => () => void;
  signalReadyToClose?: () => void;
}

function getDesktop(): DesktopBridge {
  return (window as unknown as { pwezaDesktop?: DesktopBridge }).pwezaDesktop ?? {};
}

/**
 * Desktop only — mounts once and listens for the Electron "before-close" event.
 *
 * When the user clicks the X button:
 *  1. Electron pauses the close and sends 'electron:before-close'
 *  2. If online and there's queued data, we flush it to Supabase
 *  3. We then signal 'electron:flush-complete' → Electron proceeds with close
 *
 * If offline, the queue is already on disk (IndexedDB) and will sync on next open.
 * The 6-second safety timeout in main.cjs ensures the app never hangs.
 */
export default function ElectronCloseHandler() {
  const schoolId = useAuthStore((s) => s.schoolId);
  const [closing, setClosing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const desktop = getDesktop();
    if (!desktop.onBeforeClose || !desktop.signalReadyToClose) return;

    const cleanup = desktop.onBeforeClose(async () => {
      const sid = useAuthStore.getState().schoolId;

      if (navigator.onLine && sid) {
        try {
          const count = await queueCount(sid);
          if (count > 0) {
            setPendingCount(count);
            setClosing(true);
            await flushQueue(sid);
          }
        } catch {
          // Flush failed — data is still safely in IndexedDB, will sync on next open
        }
      }

      // Tell Electron it's safe to close — data is either synced or on disk
      desktop.signalReadyToClose!();
    });

    return cleanup;
  }, []);

  if (!closing || pendingCount === 0) return null;

  // Brief overlay shown only during the flush (typically < 1 second)
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(5, 8, 15, 0.85)',
        backdropFilter: 'blur(6px)',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          borderRadius: '50%',
          border: '3px solid rgba(16,217,168,0.2)',
          borderTopColor: '#10d9a8',
          animation: 'spin 0.7s linear infinite',
        }}
      />
      <p style={{ color: '#c5d4ef', fontSize: 14, margin: 0 }}>
        Syncing {pendingCount} record{pendingCount !== 1 ? 's' : ''} before closing…
      </p>
      <p style={{ color: '#94a8d0', fontSize: 12, margin: 0 }}>
        This will only take a moment
      </p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
