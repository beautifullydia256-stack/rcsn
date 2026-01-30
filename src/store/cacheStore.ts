import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CacheEntry {
  key: string;
  data: any;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

interface CacheState {
  cache: Map<string, CacheEntry>;
  set: (key: string, data: any, ttl?: number) => void;
  get: (key: string) => any | null;
  clear: (key?: string) => void;
  clearExpired: () => void;
}

export const useCacheStore = create<CacheState>()(
  persist(
    (set, get) => ({
      cache: new Map(),
      set: (key, data, ttl = 3600000) => { // Default 1 hour
        const entry: CacheEntry = {
          key,
          data,
          timestamp: Date.now(),
          ttl,
        };
        set((state) => {
          const newCache = new Map(state.cache);
          newCache.set(key, entry);
          return { cache: newCache };
        });
      },
      get: (key) => {
        const entry = get().cache.get(key);
        if (!entry) return null;
        
        const now = Date.now();
        if (now - entry.timestamp > entry.ttl) {
          get().clear(key);
          return null;
        }
        
        return entry.data;
      },
      clear: (key) => {
        if (key) {
          set((state) => {
            const newCache = new Map(state.cache);
            newCache.delete(key);
            return { cache: newCache };
          });
        } else {
          set({ cache: new Map() });
        }
      },
      clearExpired: () => {
        const now = Date.now();
        set((state) => {
          const newCache = new Map(state.cache);
          state.cache.forEach((entry, key) => {
            if (now - entry.timestamp > entry.ttl) {
              newCache.delete(key);
            }
          });
          return { cache: newCache };
        });
      },
    }),
    {
      name: 'pwezacore-cache-storage',
    }
  )
);




