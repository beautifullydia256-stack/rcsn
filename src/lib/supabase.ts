import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client for service role operations (only use on server-side)
export const supabaseAdmin = supabaseServiceKey 
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })
  : null;

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
  role: 'owner' | 'admin' | 'teacher' | 'parent' | 'student';
  email: string;
  school_id?: string;
  name: string;
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