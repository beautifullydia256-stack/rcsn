import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuthStore } from '@/store/authStore';
import {
  isPinSet,
  checkPin,
  clearPin,
  savePin,
  touchLastActive,
  getLastActive,
  getFailCount,
  getStoredDisplayName,
  LOCK_AFTER_MS,
  PIN_MAX_FAILS,
} from './pinStorage';

export type PinPhase = 'loading' | 'no-session' | 'setup' | 'locked' | 'unlocked';

export interface PinUser {
  userId: string;
  userName: string;
}

const CHECK_MS = 60_000; // check inactivity every 60 s

// ── Cold-start detection ──────────────────────────────────────────────────────
// sessionStorage is cleared every time the Electron window closes.
// If the flag is missing it's a fresh cold start → always require PIN.
function isColdStart(): boolean {
  return !sessionStorage.getItem('pweza-app-started');
}
function markAppStarted(): void {
  sessionStorage.setItem('pweza-app-started', '1');
}

// ── User name helper ──────────────────────────────────────────────────────────
// Prefers users.name from DB (set via the create-user-account API) over
// auth metadata, which doesn't always contain the full name.
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
  const resolvePhaseForUser = useCallback(
    (userId: string, userName: string, isLoginEvent = false) => {
      if (!mountedRef.current) return;
      setPinUser({ userId, userName });

      if (!isPinSet(userId)) {
        // No PIN set yet — show setup screen
        safe('setup');
        return;
      }

      if (isLoginEvent) {
        // User just completed the login form → count as active, skip lock
        touchLastActive();
        markAppStarted();
        safe('unlocked');
        return;
      }

      // Cold start (Electron window was closed and re-opened) → always lock
      if (isColdStart()) {
        markAppStarted();
        if (mountedRef.current) setFailCount(getFailCount());
        safe('locked');
        return;
      }

      // Already running in the same session — use inactivity timer
      const elapsed = Date.now() - getLastActive();
      if (getLastActive() === 0 || elapsed >= LOCK_AFTER_MS) {
        if (mountedRef.current) setFailCount(getFailCount());
        safe('locked');
      } else {
        safe('unlocked');
      }
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
          // Prefer the name from the users table — it's the authoritative display name.
          // Fall back to auth metadata, then email if the DB query fails (e.g. offline).
          const dbName = await fetchProfileName(session.user.id);
          if (cancelled) return;
          const displayName = dbName || extractName(session.user);
          resolvePhaseForUser(session.user.id, displayName);
          return;
        }
      } catch {
        // getSession can throw when offline with an expired JWT refresh attempt
      }

      if (cancelled) return;

      // Offline / getSession failed — fall back to persisted authStore.
      // Use the name saved in pinStorage (stored when PIN was first set) as
      // it's more reliable than falling back to the email address.
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
  // Without this, if the user was on /login (no session yet) when the component
  // mounted, phase is 'no-session' forever and the PIN setup screen is never shown.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mountedRef.current) return;

      if (event === 'SIGNED_IN' && session?.user) {
        const u = session.user;
        void fetchProfileName(u.id).then((dbName) => {
          if (!mountedRef.current) return;
          resolvePhaseForUser(u.id, dbName || extractName(u), true);
        });
      } else if (event === 'SIGNED_OUT') {
        if (mountedRef.current) {
          setPinUser(null);
          safe('no-session');
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [resolvePhaseForUser, safe]);

  // ── Activity tracking (only while unlocked) ───────────────────────────────
  useEffect(() => {
    if (phase !== 'unlocked') return;
    touchLastActive();
    const handler = () => touchLastActive();
    const evts = ['mousedown', 'keydown', 'touchstart', 'scroll'];
    evts.forEach((e) => document.addEventListener(e, handler, { passive: true, capture: true }));
    return () => evts.forEach((e) => document.removeEventListener(e, handler, { capture: true }));
  }, [phase]);

  // ── Periodic inactivity check ─────────────────────────────────────────────
  useEffect(() => {
    if (phase !== 'unlocked') return;
    const id = setInterval(() => {
      if (Date.now() - getLastActive() >= LOCK_AFTER_MS && mountedRef.current) {
        setFailCount(0);
        setPhase('locked');
      }
    }, CHECK_MS);
    return () => clearInterval(id);
  }, [phase]);

  // ── Visibility change (returning to the app after 30+ min away) ───────────
  useEffect(() => {
    if (phase !== 'unlocked') return;
    const onVis = () => {
      if (!document.hidden && Date.now() - getLastActive() >= LOCK_AFTER_MS && mountedRef.current) {
        setFailCount(0);
        setPhase('locked');
      }
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [phase]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const setupPin = useCallback(
    async (pin: string) => {
      if (!pinUser) return;
      await savePin(pinUser.userId, pin, pinUser.userName);
      touchLastActive();
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
    // User deferred PIN setup — unlock for this session without saving a PIN.
    // On the next cold start, isPinSet() is still false → setup screen shows again.
    touchLastActive();
    markAppStarted();
    safe('unlocked');
  }, [safe]);

  const signOutAndClear = useCallback(async () => {
    clearPin();
    await supabase.auth.signOut();
    safe('no-session');
  }, [safe]);

  return { phase, pinUser, failCount, lockedOut, setupPin, skipPinSetup, changePin, attemptUnlock, signOutAndClear };
}
