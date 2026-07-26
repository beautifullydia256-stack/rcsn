import { supabase } from './supabase';
import { isAuthApiError } from '@supabase/supabase-js';

const PROBE_TIMEOUT_MS = 5000;

/**
 * Positively confirms the current Supabase session is dead by asking the server
 * directly — supabase.auth.getUser() validates against the server when it has a
 * token to send, unlike getSession() which can hand back a stale local session
 * without any network round trip.
 *
 * Distinguishes "the refresh token is genuinely invalid" (server explicitly rejected it
 * — safe to force a clean logout) from "we can't reach the server right now" (likely
 * offline — must NOT log out, or offline support breaks). navigator.onLine alone can't
 * make this distinction reliably, especially right at app/window startup.
 *
 * Critical (verified against @supabase/auth-js source, not assumed): getUser() can
 * resolve *without throwing* in three quite different situations, and naively checking
 * "does the error have a numeric status" cannot tell them apart — auth-js's local
 * AuthSessionMissingError (no token to send at all — exactly the state a long-closed
 * desktop app can be in offline) hardcodes `status: 400`, and a genuine network failure
 * (AuthRetryableFetchError, thrown when fetch() itself fails while offline) is
 * constructed with `status: 0` — both are numbers, neither means the server was ever
 * reached. Only `AuthApiError` represents an actual HTTP response from the server, so
 * that specific type — via Supabase's own `isAuthApiError` guard — is the only valid
 * "confirmed dead" signal.
 *
 * Resolves false (the safe default — "not confirmed dead") on timeout, a thrown error,
 * a valid user, or any non-AuthApiError (local or network-level) error.
 */
export async function confirmSessionIsDead(): Promise<boolean> {
  try {
    const result = await Promise.race([
      supabase.auth.getUser(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), PROBE_TIMEOUT_MS)),
    ]);
    if (!result) return false;
    const { data, error } = result;
    if (data.user) return false;
    return isAuthApiError(error);
  } catch {
    return false;
  }
}
