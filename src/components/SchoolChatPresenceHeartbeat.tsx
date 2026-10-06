import { useEffect } from 'react';
import { useAuthStore } from '@/store/authStore';
import { pingChatPresence } from '@/lib/schoolChatApi';

/** Ping while the user has the app open (visible tab) so chat "online / last seen" reflects any dashboard. */
const HEARTBEAT_MS = 90_000;

export default function SchoolChatPresenceHeartbeat() {
  const schoolId = useAuthStore((s) => s.schoolId);
  const userId = useAuthStore((s) => s.user?.id) ?? null;
  const sessionConfirmed = useAuthStore((s) => s.sessionConfirmed);

  useEffect(() => {
    if (!sessionConfirmed || !schoolId || !userId) return;

    const tick = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') return;
      void pingChatPresence(schoolId);
    };

    tick();
    const id = window.setInterval(tick, HEARTBEAT_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') tick();
    };
    const onOnline = () => tick();
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('online', onOnline);
    return () => {
      window.clearInterval(id);
      document.removeEventListener('visibilitychange', onVis);
      window.removeEventListener('online', onOnline);
    };
  }, [schoolId, userId, sessionConfirmed]);

  return null;
}
