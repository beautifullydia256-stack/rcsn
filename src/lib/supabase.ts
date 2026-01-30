import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Use per-tab session isolation in the browser to avoid session overwrite across tabs/users.
// - Browser: sessionStorage-based auth with a unique storageKey per tab
// - Server: non-persistent client (no auth persistence)
const isBrowser = typeof window !== 'undefined';

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
    // Fallback if sessionStorage is unavailable
    return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
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
          // Persist session per tab to avoid cross-tab overwrites
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
          storageKey: `pwezacore-auth:${getOrCreateTabId()}`,
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