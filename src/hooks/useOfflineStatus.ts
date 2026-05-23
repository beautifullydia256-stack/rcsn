import { useEffect, useState, useCallback } from 'react';
import { useAuthStore } from '../store/authStore';
import { flushQueue, cacheSchoolData } from '../lib/offlineSync';
import { queueCount } from '../lib/offlineDb';

export function useOfflineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [pendingCount, setPendingCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState<Date | null>(null);
  const schoolId = useAuthStore((s) => s.schoolId);
  const sessionConfirmed = useAuthStore((s) => s.sessionConfirmed);

  const refreshPending = useCallback(async () => {
    if (!schoolId || !sessionConfirmed) return;
    const n = await queueCount(schoolId);
    setPendingCount(n);
  }, [schoolId]);

  const sync = useCallback(async () => {
    if (!schoolId || !sessionConfirmed || !navigator.onLine || syncing) return;
    setSyncing(true);
    try {
      const result = await flushQueue(schoolId);
      if (result.flushed > 0) setLastSynced(new Date());
      await refreshPending();
    } finally {
      setSyncing(false);
    }
  }, [schoolId, syncing, refreshPending]);

  useEffect(() => {
    const goOnline = async () => {
      setIsOnline(true);
      await sync();
    };
    const goOffline = () => setIsOnline(false);

    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, [sync]);

  // Prime cache and flush — only once we have confirmed a live Supabase session
  useEffect(() => {
    if (!schoolId || !sessionConfirmed) return;
    void refreshPending();
    if (navigator.onLine) {
      void cacheSchoolData(schoolId);
      void sync();
    }
  }, [schoolId, sessionConfirmed]); // eslint-disable-line react-hooks/exhaustive-deps

  return { isOnline, pendingCount, syncing, lastSynced, sync, refreshPending };
}
