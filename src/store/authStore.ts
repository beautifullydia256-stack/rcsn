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




