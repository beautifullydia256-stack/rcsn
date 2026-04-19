import { createClient, SupabaseClient } from '@supabase/supabase-js';

function envStr(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env && typeof process.env[key] === 'string') {
    const v = process.env[key];
    if (v) return v;
  }
  return undefined;
}

const supabaseUrl =
  envStr('NEXT_PUBLIC_SUPABASE_URL') ||
  envStr('VITE_SUPABASE_URL') ||
  envStr('SUPABASE_URL') ||
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL;

const supabaseAnonKey =
  envStr('NEXT_PUBLIC_SUPABASE_ANON_KEY') ||
  envStr('VITE_SUPABASE_ANON_KEY') ||
  envStr('SUPABASE_ANON_KEY') ||
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

/** Service role: never available in the browser bundle. */
function getServiceRoleKey(): string | undefined {
  if (typeof window !== 'undefined') return undefined;
  return (
    envStr('SUPABASE_SERVICE_ROLE_KEY') ||
    import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
    import.meta.env.SUPABASE_SERVICE_ROLE_KEY
  );
}

const supabaseServiceKey = getServiceRoleKey();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// - Web: sessionStorage + per-tab key (avoid cross-tab session bleed)
// - Desktop (VITE_DESKTOP_MODE): localStorage + fixed key so session survives app restarts
// - Server: non-persistent client (no auth persistence)
const isBrowser = typeof window !== 'undefined';
const isDesktopBuild = import.meta.env.VITE_DESKTOP_MODE === 'true';
const DESKTOP_AUTH_STORAGE_KEY = 'pwezacore-auth';

function getOrCreateTabId(): string {
  if (!isBrowser) return 'server';
  const tabKey = 'pwezacore_tab_id';
  try {
    let tabId = window.sessionStorage.getItem(tabKey);
    if (!tabId) {
      tabId = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      window.sessionStorage.setItem(tabKey, tabId);
    }
    return tabId;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  }
}

/** Same storage key/value the Supabase client uses (for Electron/Puppeteer session injection). */
export function getAuthSessionStorageSnapshot(): { storageKey: string; storageJson: string | null } {
  if (!isBrowser) {
    return { storageKey: 'pwezacore-auth:server', storageJson: null };
  }
  if (isDesktopBuild) {
    try {
      return {
        storageKey: DESKTOP_AUTH_STORAGE_KEY,
        storageJson: window.localStorage.getItem(DESKTOP_AUTH_STORAGE_KEY),
      };
    } catch {
      return { storageKey: DESKTOP_AUTH_STORAGE_KEY, storageJson: null };
    }
  }
  const storageKey = `pwezacore-auth:${getOrCreateTabId()}`;
  try {
    return { storageKey, storageJson: window.sessionStorage.getItem(storageKey) };
  } catch {
    return { storageKey, storageJson: null };
  }
}

// Singleton instance cache to prevent multiple client creations
let _supabaseInstance: SupabaseClient | null = null;

function createSupabaseClient(): SupabaseClient {
  if (_supabaseInstance) {
    return _supabaseInstance;
  }

  _supabaseInstance = isBrowser
    ? createClient(supabaseUrl!, supabaseAnonKey!, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage:
            typeof window !== 'undefined'
              ? isDesktopBuild
                ? window.localStorage
                : window.sessionStorage
              : undefined,
          storageKey: isDesktopBuild ? DESKTOP_AUTH_STORAGE_KEY : `pwezacore-auth:${getOrCreateTabId()}`,
        },
      })
    : createClient(supabaseUrl!, supabaseAnonKey!, {
        auth: {
          // On the server, do not persist or auto-refresh
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

  return _supabaseInstance;
}

export const supabase = createSupabaseClient();

// Admin client for service role operations (only use on server-side)
let _supabaseAdminInstance: SupabaseClient | null = null;

function createSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseServiceKey) return null;
  
  if (_supabaseAdminInstance) {
    return _supabaseAdminInstance;
  }

  _supabaseAdminInstance = createClient(supabaseUrl!, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  return _supabaseAdminInstance;
}

export const supabaseAdmin = createSupabaseAdmin();

// Database types
export interface School {
  school_id: string;
  name: string;
  location: string;
  type: 'Nursery/Primary' | 'Secondary';
  admin_id: string;
  subscription_plan: string;
  student_count: number;
  created_at: string;
}

export interface User {
  user_id: string;
  role: 'owner' | 'admin' | 'teacher' | 'parent' | 'student' | 'accountant' | 'librarian' | 'head_teacher';
  email: string;
  school_id?: string;
  name: string;
  phone?: string;
  department?: string;
  position?: string;
  created_at: string;
}

export interface Student {
  student_id: string;
  school_id: string;
  name: string;
  current_class: string;
  status: 'active' | 'graduated';
  graduation_year?: number;
  repeat_year: boolean;
  created_at: string;
}

export interface Teacher {
  teacher_id: string;
  name: string;
  email: string;
  school_id: string;
  created_at: string;
}

export interface Parent {
  parent_id: string;
  name: string;
  email: string;
  student_id: string;
  school_id: string;
  created_at: string;
}