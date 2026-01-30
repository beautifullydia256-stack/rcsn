import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  role: string | null;
  schoolId: string | null;
  setUser: (user: User | null) => void;
  setRole: (role: string | null) => void;
  setSchoolId: (schoolId: string | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      schoolId: null,
      setUser: (user) => set({ user }),
      setRole: (role) => set({ role }),
      setSchoolId: (schoolId) => set({ schoolId }),
      logout: () => set({ user: null, role: null, schoolId: null }),
    }),
    {
      name: 'pwezacore-auth-storage',
    }
  )
);




