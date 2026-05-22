import { supabase } from './supabase';
import { markChatPresenceOffline } from './schoolChatApi';
import { flushQueue } from './offlineSync';
import { queueCount } from './offlineDb';
import { useAuthStore } from '../store/authStore';

/**
 * Signs the user out, but first checks for unsynced offline data.
 * - Online + pending: offers to sync first, warns if any remain.
 * - Offline + pending: reassures user data is safe in IndexedDB and will sync on next login.
 * - afterSignOut: caller clears any local UI state (navigate, clear store fields, etc.)
 */
export async function logoutWithSyncCheck(afterSignOut: () => void): Promise<void> {
  const schoolId = useAuthStore.getState().schoolId;

  if (schoolId) {
    const pending = await queueCount(schoolId);

    if (pending > 0) {
      if (navigator.onLine) {
        const ok = window.confirm(
          `You have ${pending} unsynced record${pending === 1 ? '' : 's'}.\n\nSync to the server now before logging out?`
        );
        if (ok) {
          await flushQueue(schoolId);
          const remaining = await queueCount(schoolId);
          if (remaining > 0) {
            window.alert(
              `${remaining} record${remaining === 1 ? '' : 's'} could not be synced right now.\nThey are safely stored on this device and will sync automatically next time you log in.`
            );
          }
        }
      } else {
        window.alert(
          `You are offline, but your ${pending} unsynced record${pending === 1 ? '' : 's'} are safely stored on this device.\nThey will sync automatically the next time you log in.`
        );
      }
    }
  }

  try {
    await markChatPresenceOffline();
    await supabase.auth.signOut();
  } finally {
    afterSignOut();
  }
}
