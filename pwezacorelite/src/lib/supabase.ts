import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL ?? import.meta.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY ?? import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY). Copy .env.example to .env and add your PwezaCore Supabase credentials.');
}

const isBrowser = typeof window !== 'undefined';

function getOrCreateTabId(): string {
  if (!isBrowser) return 'server';
  const tabKey = 'pwezacorelite_tab_id';
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
          storage: typeof window !== 'undefined' ? window.sessionStorage : undefined,
          storageKey: `pwezacorelite-auth:${getOrCreateTabId()}`,
        },
      })
    : createClient(supabaseUrl!, supabaseAnonKey!, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      });

  return _supabaseInstance;
}

export const supabase = createSupabaseClient();

let _supabaseAdminInstance: SupabaseClient | null = null;

function createSupabaseAdmin(): SupabaseClient | null {
  if (!supabaseServiceKey) return null;
  if (_supabaseAdminInstance) return _supabaseAdminInstance;
  _supabaseAdminInstance = createClient(supabaseUrl!, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _supabaseAdminInstance;
}

export const supabaseAdmin = createSupabaseAdmin();

// Shared database types (same as main PwezaCore project)
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
