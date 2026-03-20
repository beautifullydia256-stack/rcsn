import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  role: string | null;
  schoolId: string | null;
  /** Delegated permission keys from user_school_permissions (not full admin powers). */
  permissions: string[];
  setUser: (user: User | null) => void;
  setRole: (role: string | null) => void;
  setSchoolId: (schoolId: string | null) => void;
  setPermissions: (permissions: string[]) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      schoolId: null,
      permissions: [],
      setUser: (user) => set({ user }),
      setRole: (role) => set({ role }),
      setSchoolId: (schoolId) => set({ schoolId }),
      setPermissions: (permissions) => set({ permissions }),
      logout: () => set({ user: null, role: null, schoolId: null, permissions: [] }),
    }),
    {
      name: 'pwezacore-auth-storage',
      partialize: (state) => ({
        user: state.user,
        role: state.role,
        schoolId: state.schoolId,
      }),
    }
  )
);




