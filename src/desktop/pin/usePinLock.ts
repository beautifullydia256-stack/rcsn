import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import {
  isPinSet,
  checkPin,
  clearPin,
  savePin,
  touchLastActive,
  getLastActive,
  getFailCount,
  LOCK_AFTER_MS,
  PIN_MAX_FAILS,
} from './pinStorage';

export type PinPhase = 'loading' | 'no-session' | 'setup' | 'locked' | 'unlocked';

export interface PinUser {
  userId: string;
  userName: string;
}

const CHECK_MS = 60_000; // check inactivity every 60 s

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

  // ── Initial resolution ────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (cancelled) return;

      if (!session?.user) {
        safe('no-session');
        return;
      }

      const userId = session.user.id;
      const userName =
        (session.user.user_metadata?.full_name as string | undefined) ??
        (session.user.user_metadata?.name as string | undefined) ??
        session.user.email ??
        'User';

      if (mountedRef.current) setPinUser({ userId, userName });

      if (!isPinSet(userId)) {
        safe('setup');
        return;
      }

      const lastActive = getLastActive();
      const elapsed = Date.now() - lastActive;
      if (lastActive === 0 || elapsed >= LOCK_AFTER_MS) {
        if (mountedRef.current) setFailCount(getFailCount());
        safe('locked');
      } else {
        safe('unlocked');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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
        // Brief delay so the UI can show the lockout message
        setTimeout(async () => {
          clearPin();
          await supabase.auth.signOut();
          if (mountedRef.current) safe('no-session');
        }, 2_500);
        return 'locked-out';
      }

      // wrong
      if (mountedRef.current) setFailCount((c) => c + 1);
      return 'wrong';
    },
    [pinUser, safe],
  );

  const signOutAndClear = useCallback(async () => {
    clearPin();
    await supabase.auth.signOut();
    safe('no-session');
  }, [safe]);

  return { phase, pinUser, failCount, lockedOut, setupPin, attemptUnlock, signOutAndClear };
}
