import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  role: string | null;
  /** The role the user actively selected in the role-picker (null = use primary role). */
  activeRole: string | null;
  schoolId: string | null;
  /** Delegated permission keys from user_school_permissions (not full admin powers). */
  permissions: string[];
  /**
   * True only after Supabase's auth listener has confirmed a live session this page load.
   * NOT persisted — starts false on every fresh page load so background sync / presence
   * never fire against a stale/expired JWT.
   */
  sessionConfirmed: boolean;
  setUser: (user: User | null) => void;
  setRole: (role: string | null) => void;
  setActiveRole: (role: string | null) => void;
  setSchoolId: (schoolId: string | null) => void;
  setPermissions: (permissions: string[]) => void;
  setSessionConfirmed: (confirmed: boolean) => void;
  /**
   * Select a school for the current session. Awaits the server-side activation (which writes
   * `users.school_id`/`role`, not just a side table) before resolving, and only updates local
   * state on success — callers must await this and navigate only after it resolves true, or a
   * page mounted before the DB write lands will re-fetch the OLD school and silently revert it.
   */
  setActiveSchool: (schoolId: string, role: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      activeRole: null,
      schoolId: null,
      permissions: [],
      sessionConfirmed: false,
      setUser: (user) => set({ user }),
      setRole: (role) => set({ role }),
      setActiveRole: (activeRole) => set({ activeRole }),
      setSchoolId: (schoolId) => set({ schoolId }),
      setPermissions: (permissions) => set({ permissions }),
      setSessionConfirmed: (confirmed) => set({ sessionConfirmed: confirmed }),
      setActiveSchool: async (schoolId, role) => {
        // Write the choice into `users.school_id`/`role` (not just a side table) so every RLS
        // policy — not only the ones that already know to consult user_active_schools — sees
        // the picked school, via a server-side endpoint (never trust a raw client update for
        // this: it validates the school is actually one of the caller's active memberships).
        // MUST be awaited by the caller before navigating: a page mounted before this DB write
        // lands will re-fetch the still-old school_id and silently revert the choice.
        try {
          const [{ supabase }, { registerApiUrl }] = await Promise.all([
            import('@/lib/supabase'),
            import('@/lib/registerApiOrigin'),
          ]);
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          if (!token) return false;
          const res = await fetch(registerApiUrl('/api/misc?action=auth-activate-school-role'), {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ schoolId }),
          });
          if (!res.ok) return false;
          const json = (await res.json().catch(() => ({}))) as { role?: string };
          set({ schoolId, role: json.role || role, activeRole: null });
          return true;
        } catch {
          return false;
        }
      },
      logout: () => set({ user: null, role: null, activeRole: null, schoolId: null, permissions: [], sessionConfirmed: false }),
    }),
    {
      name: 'pwezacore-auth-storage',
      // sessionConfirmed intentionally omitted — must never be persisted
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        activeRole: state.activeRole,
        schoolId: state.schoolId,
      }),
    }
  )
);




