import { createClient, SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

// Supabase configuration - Replace with your actual credentials
const SUPABASE_URL = 'https://ibnyclqobbrnjyxbbfsg.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlibnljbHFvYmJybmp5eGJiZnNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTgwMzA4NTksImV4cCI6MjA3MzYwNjg1OX0.JR5mcF3o8zDsl65KUgeAsPDDAf8qVhla_wm6gTadeVw';

class SupabaseService {
  private static client: SupabaseClient | null = null;

  static getClient(): SupabaseClient {
    if (!this.client) {
      this.client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      });
    }
    return this.client;
  }

  static async signIn(email: string, password: string) {
    const { data, error } = await this.getClient().auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
    return data;
  }

  static async signOut() {
    const { error } = await this.getClient().auth.signOut();
    if (error) throw error;
  }

  static async getCurrentUser() {
    const { data: { user } } = await this.getClient().auth.getUser();
    return user;
  }

  static async getSession() {
    const { data: { session } } = await this.getClient().auth.getSession();
    return session;
  }

  // Generic table operations
  static async fetchAll<T>(table: string, filters?: Record<string, any>): Promise<T[]> {
    let query = this.getClient().from(table).select('*');
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
    }

    const { data, error } = await query;
    if (error) throw error;
    return data as T[];
  }

  static async fetchById<T>(table: string, id: string): Promise<T | null> {
    // Handle table-specific primary key columns
    let idColumn = 'id';
    if (table === 'users') {
      idColumn = 'user_id';
    } else if (table === 'schools') {
      idColumn = 'school_id';
    } else if (table === 'students') {
      idColumn = 'student_id';
    } else if (table === 'teachers') {
      idColumn = 'teacher_id';
    } else if (table === 'parents') {
      idColumn = 'parent_id';
    } else if (table === 'exam_sets') {
      idColumn = 'exam_set_id';
    } else if (table === 'attendance') {
      idColumn = 'attendance_id';
    } else if (table === 'payments') {
      idColumn = 'payment_id';
    } else if (table === 'receipts') {
      idColumn = 'receipt_id';
    } else if (table === 'expenses') {
      idColumn = 'expense_id';
    }

    const { data, error } = await this.getClient()
      .from(table)
      .select('*')
      .eq(idColumn, id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }
    return data as T;
  }

  static async insert<T>(table: string, data: Partial<T>): Promise<T> {
    const { data: result, error } = await this.getClient()
      .from(table)
      .insert(data)
      .select()
      .single();

    if (error) throw error;
    return result as T;
  }

  static async update<T>(table: string, id: string, data: Partial<T>): Promise<T> {
    // Handle table-specific primary key columns
    let idColumn = 'id';
    if (table === 'users') {
      idColumn = 'user_id';
    } else if (table === 'schools') {
      idColumn = 'school_id';
    } else if (table === 'students') {
      idColumn = 'student_id';
    } else if (table === 'teachers') {
      idColumn = 'teacher_id';
    } else if (table === 'parents') {
      idColumn = 'parent_id';
    } else if (table === 'exam_sets') {
      idColumn = 'exam_set_id';
    } else if (table === 'attendance') {
      idColumn = 'attendance_id';
    } else if (table === 'payments') {
      idColumn = 'payment_id';
    } else if (table === 'receipts') {
      idColumn = 'receipt_id';
    } else if (table === 'expenses') {
      idColumn = 'expense_id';
    }

    const { data: result, error } = await this.getClient()
      .from(table)
      .update(data)
      .eq(idColumn, id)
      .select()
      .single();

    if (error) throw error;
    return result as T;
  }

  static async delete(table: string, id: string): Promise<void> {
    // Handle table-specific primary key columns
    let idColumn = 'id';
    if (table === 'users') {
      idColumn = 'user_id';
    } else if (table === 'schools') {
      idColumn = 'school_id';
    } else if (table === 'students') {
      idColumn = 'student_id';
    } else if (table === 'teachers') {
      idColumn = 'teacher_id';
    } else if (table === 'parents') {
      idColumn = 'parent_id';
    } else if (table === 'exam_sets') {
      idColumn = 'exam_set_id';
    } else if (table === 'attendance') {
      idColumn = 'attendance_id';
    } else if (table === 'payments') {
      idColumn = 'payment_id';
    } else if (table === 'receipts') {
      idColumn = 'receipt_id';
    } else if (table === 'expenses') {
      idColumn = 'expense_id';
    }

    const { error } = await this.getClient()
      .from(table)
      .delete()
      .eq(idColumn, id);

    if (error) throw error;
  }

  // Real-time subscriptions
  static subscribe(
    table: string,
    callback: (payload: any) => void,
    filters?: Record<string, any>
  ) {
    let channel = this.getClient().channel(`${table}_changes`);

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        channel = channel.on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table,
            filter: `${key}=eq.${value}`,
          },
          callback
        );
      });
    } else {
      channel = channel.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table,
        },
        callback
      );
    }

    return channel.subscribe();
  }
}

export default SupabaseService;


