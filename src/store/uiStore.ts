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

const getInitialTheme = (): 'light' | 'dark' => {
  if (typeof window === 'undefined') return 'light';
  try {
    const direct = localStorage.getItem('pwezacore-theme');
    if (direct === 'dark' || direct === 'light') return direct;
    const rawUi = localStorage.getItem('pwezacore-ui-storage');
    if (rawUi) {
      const parsed = JSON.parse(rawUi);
      if (parsed?.state?.theme === 'dark' || parsed?.state?.theme === 'light') {
        return parsed.state.theme;
      }
    }
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  } catch {}
  return 'light';
};

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: true,
      theme: getInitialTheme(),
      sidebarCollapsed: false,
      activeModal: null,
      setSidebarOpen: (open) => set({ sidebarOpen: open }),
      setTheme: (theme) => {
        if (typeof window !== 'undefined') {
          const root = document.documentElement;
          root.classList.remove('light', 'dark');
          root.classList.add(theme);
          root.setAttribute('data-theme', theme);
          root.style.backgroundColor = theme === 'dark' ? '#05080f' : '#F5F5F5';
          root.style.colorScheme = theme;
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
            const root = document.documentElement;
            root.classList.remove('light', 'dark');
            root.classList.add(next);
            root.setAttribute('data-theme', next);
            root.style.backgroundColor = next === 'dark' ? '#05080f' : '#F5F5F5';
            root.style.colorScheme = next;
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




