import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import {
  isPinSet,
  checkPin,
  clearPin,
  savePin,
  touchLastActive,
  getFailCount,
  getStoredDisplayName,
  PIN_MAX_FAILS,
  isSessionUnlocked,
  setSessionUnlocked,
} from './pinStorage';

export type PinPhase = 'loading' | 'no-session' | 'setup' | 'locked' | 'unlocked';

export interface PinUser {
  userId: string;
  userName: string;
}

// User name helper
function extractName(user: { user_metadata?: Record<string, unknown>; email?: string | null }): string {
  return (
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    user.email ??
    'User'
  );
}

async function fetchProfileName(userId: string): Promise<string | null> {
  try {
    const { data } = await supabase
      .from('users')
      .select('name')
      .eq('user_id', userId)
      .maybeSingle();
    const n = data && (data as { name?: string }).name ? String((data as { name?: string }).name).trim() : '';
    return n || null;
  } catch {
    return null;
  }
}

export function usePinLock() {
  const [phase, setPhase] = useState<PinPhase>('loading');
  const [pinUser, setPinUser] = useState<PinUser | null>(null);
  const [failCount, setFailCount] = useState(0);
  const [lockedOut, setLockedOut] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const safe = useCallback((p: PinPhase) => {
    if (mountedRef.current) setPhase(p);
  }, []);

  // ── Core: determine phase from a known user id + name ──────────────────────
  // Strict PIN rule:
  // - If no PIN is set (first-time login, or after sign in again / forgot PIN) -> 'setup'
  // - If PIN is set -> ALWAYS 'locked'. Must enter PIN to unlock.
  // - Never auto-unlocks or bypasses without entering the PIN.
  const resolvePhaseForUser = useCallback(
    (userId: string, userName: string) => {
      if (!mountedRef.current) return;
      setPinUser({ userId, userName });

      if (!isPinSet(userId)) {
        safe('setup');
        return;
      }

      // If user has already entered their PIN during this active session, keep them unlocked!
      if (isSessionUnlocked(userId)) {
        safe('unlocked');
        return;
      }

      if (mountedRef.current) setFailCount(getFailCount());
      safe('locked');
    },
    [safe],
  );

  // ── Initial resolution on mount ───────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const {
          data: { session },
          error,
        } = await supabase.auth.getSession();
        if (cancelled) return;

        if (!error && session?.user) {
          const dbName = await fetchProfileName(session.user.id);
          if (cancelled) return;
          const displayName = dbName || extractName(session.user);
          resolvePhaseForUser(session.user.id, displayName);
          return;
        }
      } catch {
        // getSession can throw when offline
      }

      if (cancelled) return;

      const stored = useAuthStore.getState();
      if (stored.user) {
        const savedName = getStoredDisplayName();
        const displayName = savedName || extractName(stored.user);
        resolvePhaseForUser(stored.user.id, displayName);
        return;
      }

      safe('no-session');
    })();

    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auth-state listener — catches SIGNED_IN after the login form submits ──
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return;

      if (event === 'SIGNED_IN' && session?.user) {
        const u = session.user;
        // If already unlocked in this active session, do not re-lock
        if (isSessionUnlocked(u.id)) {
          return;
        }
        void fetchProfileName(u.id).then((dbName) => {
          if (!mountedRef.current) return;
          resolvePhaseForUser(u.id, dbName || extractName(u));
        });
      } else if (event === 'SIGNED_OUT') {
        if (mountedRef.current) {
          if (pinUser) setSessionUnlocked(pinUser.userId, false);
          setPinUser(null);
          safe('no-session');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [resolvePhaseForUser, safe, pinUser]);

  // ── Activity tracking (only while unlocked) ───────────────────────────────
  useEffect(() => {
    if (phase !== 'unlocked') return;
    touchLastActive();
    const handler = () => touchLastActive();
    const evts = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    evts.forEach((e) => document.addEventListener(e, handler, { passive: true, capture: true }));
    return () => evts.forEach((e) => document.removeEventListener(e, handler, { capture: true }));
  }, [phase]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const setupPin = useCallback(
    async (pin: string) => {
      if (!pinUser) return;
      await savePin(pinUser.userId, pin, pinUser.userName);
      touchLastActive();
      setSessionUnlocked(pinUser.userId, true);
      safe('unlocked');
    },
    [pinUser, safe],
  );

  const changePin = useCallback(
    async (currentPin: string, newPin: string): Promise<'correct' | 'wrong' | 'no-user'> => {
      if (!pinUser) return 'no-user';
      const result = await checkPin(pinUser.userId, currentPin);
      if (result !== 'correct') return 'wrong';
      await savePin(pinUser.userId, newPin, pinUser.userName);
      touchLastActive();
      return 'correct';
    },
    [pinUser],
  );

  const attemptUnlock = useCallback(
    async (pin: string): Promise<'correct' | 'wrong' | 'locked-out'> => {
      if (!pinUser) return 'wrong';
      const result = await checkPin(pinUser.userId, pin);

      if (!mountedRef.current) return result === 'correct' ? 'correct' : 'wrong';

      if (result === 'correct') {
        touchLastActive();
        setSessionUnlocked(pinUser.userId, true);
        setFailCount(0);
        setLockedOut(false);
        safe('unlocked');
        return 'correct';
      }

      if (result === 'locked-out') {
        setLockedOut(true);
        setFailCount(PIN_MAX_FAILS);
        setTimeout(async () => {
          clearPin();
          await supabase.auth.signOut();
          if (mountedRef.current) safe('no-session');
        }, 2_500);
        return 'locked-out';
      }

      if (mountedRef.current) setFailCount((c) => c + 1);
      return 'wrong';
    },
    [pinUser, safe],
  );

  const skipPinSetup = useCallback(() => {
    touchLastActive();
    if (pinUser) setSessionUnlocked(pinUser.userId, true);
    safe('unlocked');
  }, [pinUser, safe]);

  const signOutAndClear = useCallback(async () => {
    if (pinUser) setSessionUnlocked(pinUser.userId, false);
    clearPin();
    await supabase.auth.signOut();
    safe('no-session');
  }, [pinUser, safe]);

  return { phase, pinUser, failCount, lockedOut, setupPin, skipPinSetup, changePin, attemptUnlock, signOutAndClear };
}
