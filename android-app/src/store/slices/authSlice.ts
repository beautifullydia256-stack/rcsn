import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import SupabaseService from '../../services/SupabaseService';
import DatabaseService from '../../services/DatabaseService';

interface User {
  user_id: string;
  role: string;
  email: string;
  name: string;
  school_id?: string;
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

export const signIn = createAsyncThunk(
  'auth/signIn',
  async ({ email, password }: { email: string; password: string }) => {
    const { user, session } = await SupabaseService.signIn(email, password);
    
    if (!user || !session) {
      throw new Error('Invalid credentials');
    }

    // Try to fetch user details from local database first
    let userData: User | null = null;
    try {
      userData = await DatabaseService.findById<User>('users', user.id);
    } catch (error) {
      console.warn('Failed to fetch user from local DB, trying Supabase:', error);
    }

    // Fallback to Supabase if local DB fails or returns null
    if (!userData) {
      try {
        // Fetch from Supabase using user_id column
        const { data, error } = await SupabaseService.getClient()
          .from('users')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (error) {
          throw error;
        }
        
        if (data) {
          userData = data as User;
          // Cache in local database for future use
          try {
            await DatabaseService.insert('users', userData);
          } catch (cacheError) {
            // Non-fatal - user data is still available from Supabase
            console.warn('Failed to cache user in local DB:', cacheError);
          }
        }
      } catch (supabaseError) {
        console.error('Failed to fetch user from Supabase:', supabaseError);
        throw new Error('User data not found. Please contact support.');
      }
    }

    if (!userData) {
      throw new Error('User data not found');
    }

    return userData;
  }
);

export const signOut = createAsyncThunk('auth/signOut', async () => {
  await SupabaseService.signOut();
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signIn.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(signIn.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Sign in failed';
        state.isAuthenticated = false;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.user = null;
        state.isAuthenticated = false;
      });
  },
});

export const { clearError } = authSlice.actions;
export default authSlice.reducer;


