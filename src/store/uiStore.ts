import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIState {
  sidebarOpen: boolean;
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  activeModal: string | null;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark') => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setActiveModal: (modal: string | null) => void;
  toggleSidebar: () => void;
  toggleTheme: () => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: 'light',
      sidebarCollapsed: false,
      activeModal: null,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setTheme: (theme) => {
        if (typeof window !== 'undefined') {
          document.documentElement.classList.remove('light', 'dark');
          document.documentElement.classList.add(theme);
          localStorage.setItem('pwezacore-theme', theme);
        }
        set({ theme });
      },
      setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
      setActiveModal: (modal) => set({ activeModal: modal }),
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      toggleTheme: () =>
        set((state) => {
          const next = state.theme === 'light' ? 'dark' : 'light';
          if (typeof window !== 'undefined') {
            document.documentElement.classList.remove('light', 'dark');
            document.documentElement.classList.add(next);
            localStorage.setItem('pwezacore-theme', next);
          }
          return { theme: next };
        }),
    }),
    {
      name: 'pwezacore-ui-storage',
    }
  )
);




