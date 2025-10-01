import { createClient } from '@supabase/supabase-js';

// TODO: Replace with actual environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-key';

// Initialize Supabase client (stub for now, not actually used)
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Auth helpers (stubs - will be implemented when backend is ready)
export const authService = {
  async signIn(email: string, password: string) {
    // TODO: Implement actual Supabase auth
    console.debug('[Auth] Sign in attempt:', { email });
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    // Mock success
    return {
      data: { user: { id: '1', email }, session: { access_token: 'mock-token' } },
      error: null
    };
  },

  async signUp(email: string, password: string) {
    // TODO: Implement actual Supabase auth
    console.debug('[Auth] Sign up attempt:', { email });
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    // Mock success
    return {
      data: { user: { id: '1', email }, session: { access_token: 'mock-token' } },
      error: null
    };
  },

  async signOut() {
    // TODO: Implement actual Supabase auth
    console.debug('[Auth] Sign out');
    
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    return { error: null };
  },

  async getSession() {
    // TODO: Implement actual Supabase session retrieval
    console.debug('[Auth] Get session');
    
    // Mock session for development
    return {
      data: { session: { access_token: 'mock-token', user: { id: '1', email: 'user@example.com' } } },
      error: null
    };
  }
};

