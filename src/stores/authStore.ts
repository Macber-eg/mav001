import { create } from 'zustand';
import supabase from '../lib/supabase';
import { User as AuthUser } from '@supabase/supabase-js';
import { verifySupabaseConnection } from '../lib/supabase';

interface AuthState {
  user: AuthUser | null;
  isInitializing: boolean;
  isLoading: boolean;
  error: string | null;
  setUser: (user: AuthUser | null) => void;
  setIsInitializing: (isInitializing: boolean) => void;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, companyName: string) => Promise<void>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isInitializing: true,
  isLoading: false,
  error: null,
  setUser: (user) => set({ user }),
  setIsInitializing: (isInitializing) => set({ isInitializing }),
  
  signIn: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      // First check if we're connected to Supabase
      const isConnected = await verifySupabaseConnection();
      if (!isConnected) {
        throw new Error('Unable to connect to the authentication service. Please check your network connection and try again.');
      }
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) throw error;
      window.location.href = '/app/dashboard';
      
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to sign in. Please check your connection and try again.';
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  signUp: async (email, password, companyName) => {
    set({ isLoading: true, error: null });
    try {
      // First check if we're connected to Supabase
      const isConnected = await verifySupabaseConnection();
      if (!isConnected) {
        throw new Error('Unable to connect to the authentication service. Please check your network connection and try again.');
      }
      
      // 1. Register the user with auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            company_name: companyName
          }
        }
      });

      if (authError) throw authError;

      if (authData.user) {
        try {
          // 2. Create company record
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .insert([{ 
              name: companyName,
              primary_color: '#00FFB2',
              secondary_color: '#1A1A40'
            }])
            .select('*')
            .single();

          if (companyError) {
            throw new Error(`Failed to create company: ${companyError.message}`);
          }

          if (!companyData) {
            throw new Error('Failed to create company record');
          }

          // 3. Create user record with company association
          const { data: userData, error: userError } = await supabase
            .from('users')
            .insert([{ 
              id: authData.user.id,
              email: authData.user.email || '',
              company_id: companyData.id,
              role: 'company_admin'
            }])
            .select('*')
            .single();

          if (userError) {
            throw new Error(`Failed to create user record: ${userError.message}`);
          }

          set({ user: authData.user });
          window.location.href = '/app/dashboard';
        } catch (error: any) {
          // If database setup fails, clean up by signing out
          await supabase.auth.signOut();
          throw error;
        }
      }
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to sign up. Please check your connection and try again.';
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  signOut: async () => {
    set({ isLoading: true, error: null });
    try {
      // First clear all local state
      set({ user: null });
      
      // Clear any stored data
      localStorage.clear();
      sessionStorage.clear();
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      
      // Force a page reload to clear any remaining state
      window.location.href = '/';
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to sign out. Please try again.';
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  },
  
  resetPassword: async (email) => {
    set({ isLoading: true, error: null });
    try {
      // First check if we're connected to Supabase
      const isConnected = await verifySupabaseConnection();
      if (!isConnected) {
        throw new Error('Unable to connect to the authentication service. Please check your network connection and try again.');
      }
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
    } catch (error: any) {
      const errorMessage = error.message || 'Failed to send reset password email. Please check your connection and try again.';
      set({ error: errorMessage });
      throw error;
    } finally {
      set({ isLoading: false });
    }
  }
}));