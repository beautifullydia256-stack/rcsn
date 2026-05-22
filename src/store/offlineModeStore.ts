import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type OfflineMode = 'offline' | 'online-only' | null;
export type CacheStatus = 'idle' | 'downloading' | 'done' | 'error';

interface OfflineModeState {
  mode: OfflineMode;
  cacheStatus: CacheStatus;
  cacheProgress: number;
  lastSynced: string | null;
  setMode: (mode: OfflineMode) => void;
  setCacheStatus: (status: CacheStatus) => void;
  setCacheProgress: (progress: number) => void;
  setLastSynced: (date: string) => void;
}

export const useOfflineModeStore = create<OfflineModeState>()(
  persist(
    (set) => ({
      mode: null,
      cacheStatus: 'idle',
      cacheProgress: 0,
      lastSynced: null,
      setMode: (mode) => set({ mode }),
      setCacheStatus: (cacheStatus) => set({ cacheStatus }),
      setCacheProgress: (cacheProgress) => set({ cacheProgress }),
      setLastSynced: (lastSynced) => set({ lastSynced }),
    }),
    {
      name: 'pweza-offline-mode',
      partialize: (state) => ({
        mode: state.mode,
        lastSynced: state.lastSynced,
      }),
    }
  )
);
