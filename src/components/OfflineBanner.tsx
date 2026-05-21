import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { WifiOff, RefreshCw } from 'lucide-react';
import { queueCount } from '../lib/offlineDb';
import { useAuthStore } from '../store/authStore';

export default function OfflineBanner() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const schoolId = useAuthStore((s) => s.schoolId);

  const refreshPending = useCallback(async () => {
    if (!schoolId) return;
    setPending(await queueCount(schoolId));
  }, [schoolId]);

  // Refresh pending count on mount and every 15 s
  useEffect(() => {
    void refreshPending();
    const id = setInterval(() => void refreshPending(), 15_000);
    return () => clearInterval(id);
  }, [refreshPending]);

  // Track online / offline transitions
  useEffect(() => {
    const goOnline = () => {
      setIsOnline(true);
      setSyncing(true);
    };
    const goOffline = () => {
      setIsOnline(false);
      setSyncing(false);
    };
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Listen for service-worker sync events
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    const handler = (event: MessageEvent) => {
      if (event.data?.type === 'PWEZA_SYNC_REQUESTED') {
        setSyncing(true);
      }
    };
    navigator.serviceWorker.addEventListener('message', handler);
    return () => navigator.serviceWorker.removeEventListener('message', handler);
  }, []);

  // Auto-hide syncing indicator after 4 s and refresh pending count
  useEffect(() => {
    if (!syncing) return;
    const id = setTimeout(() => {
      setSyncing(false);
      void refreshPending();
    }, 4_000);
    return () => clearTimeout(id);
  }, [syncing, refreshPending]);

  return (
    <AnimatePresence>
      {!isOnline && (
        <motion.div
          key="offline-bar"
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            padding: '0 12px 12px',
          }}
        >
          <div
            style={{
              background: 'rgba(10,10,18,0.96)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderRadius: 16,
              border: '1px solid rgba(255,255,255,0.08)',
              padding: '12px 16px',
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(239,68,68,0.18)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}
            >
              <WifiOff size={16} color="#f87171" />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#f1f5f9', marginBottom: 2 }}>
                Working offline
              </div>
              <div style={{ fontSize: 11, color: 'rgba(241,245,249,0.45)', lineHeight: 1.4 }}>
                {pending > 0
                  ? `${pending} action${pending !== 1 ? 's' : ''} queued — will sync when reconnected`
                  : 'Cached data available. New changes will sync when connected.'}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {isOnline && syncing && (
        <motion.div
          key="syncing-pill"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 320, damping: 32 }}
          style={{
            position: 'fixed',
            bottom: 20,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 9999,
            whiteSpace: 'nowrap',
          }}
        >
          <div
            style={{
              background: 'rgba(16,217,168,0.14)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              borderRadius: 999,
              border: '1px solid rgba(16,217,168,0.28)',
              padding: '7px 18px',
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              boxShadow: '0 4px 20px rgba(16,217,168,0.18)',
            }}
          >
            <RefreshCw size={13} color="#10d9a8" className="animate-spin" />
            <span style={{ fontSize: 12, fontWeight: 600, color: '#10d9a8' }}>
              Syncing offline data…
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
