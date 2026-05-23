import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  role: string | null;
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
  setSchoolId: (schoolId: string | null) => void;
  setPermissions: (permissions: string[]) => void;
  setSessionConfirmed: (confirmed: boolean) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      schoolId: null,
      permissions: [],
      sessionConfirmed: false,
      setUser: (user) => set({ user }),
      setRole: (role) => set({ role }),
      setSchoolId: (schoolId) => set({ schoolId }),
      setPermissions: (permissions) => set({ permissions }),
      setSessionConfirmed: (confirmed) => set({ sessionConfirmed: confirmed }),
      logout: () => set({ user: null, role: null, schoolId: null, permissions: [], sessionConfirmed: false }),
    }),
    {
      name: 'pwezacore-auth-storage',
      // sessionConfirmed intentionally omitted — must never be persisted
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        schoolId: state.schoolId,
      }),
    }
  )
);




