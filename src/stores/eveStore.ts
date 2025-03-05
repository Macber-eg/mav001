import { create } from 'zustand';
import supabase, { verifySupabaseConnection } from '../lib/supabase';
import { EVE } from '../types/database.types';
import { mockData } from '../lib/supabase-helper';

interface EVEState {
  eves: EVE[];
  isLoading: boolean;
  error: string | null;
  fetchEVEs: () => Promise<void>;
  getEVE: (id: string) => Promise<EVE | null>;
  createEVE: (eveData: Partial<EVE>) => Promise<EVE | null>;
  updateEVE: (id: string, eveData: Partial<EVE>) => Promise<EVE | null>;
  deleteEVE: (id: string) => Promise<void>;
}

export const useEVEStore = create<EVEState>((set, get) => ({
  eves: [],
  isLoading: false,
  error: null,
  
  fetchEVEs: async () => {
    set({ isLoading: true, error: null });
    try {
      // First verify connection to Supabase
      const isConnected = await verifySupabaseConnection();
      
      if (!isConnected) {
        // In development mode, use mock data
        if (import.meta.env.DEV) {
          console.log('Using mock EVE data in development mode');
          set({ 
            eves: mockData.eves as EVE[],
            error: null // Don't show error in dev mode
          });
          return;
        }
        throw new Error('Cannot connect to database');
      }

      // Get the user's company_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      if (userError) {
        throw userError;
      }

      if (!userData?.company_id) {
        // If in development, use mock data
        if (import.meta.env.DEV) {
          set({ eves: mockData.eves as EVE[] });
          return;
        }
        throw new Error('User company not found');
      }

      // Fetch EVEs for this company
      const { data, error } = await supabase
        .from('eves')
        .select('*')
        .eq('company_id', userData.company_id)
        .order('created_at', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      set({ eves: data as EVE[] });
      
    } catch (error: any) {
      console.error('Error fetching EVEs:', error);
      // In development, fall back to mock data
      if (import.meta.env.DEV) {
        console.log('Using mock EVE data');
        set({ 
          eves: mockData.eves as EVE[],
          error: null // Don't show error in dev mode
        });
      } else {
        set({ error: error.message });
      }
    } finally {
      set({ isLoading: false });
    }
  },
  
  getEVE: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      // First check connection
      const isConnected = await verifySupabaseConnection();
      
      if (!isConnected && import.meta.env.DEV) {
        // In development mode, return mock EVE
        const mockEve = mockData.eves.find(eve => eve.id === id);
        return mockEve as EVE || null;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      if (userError) {
        throw userError;
      }

      if (!userData?.company_id) {
        if (import.meta.env.DEV) {
          const mockEve = mockData.eves.find(eve => eve.id === id);
          return mockEve as EVE || null;
        }
        throw new Error('User company not found');
      }

      const { data, error } = await supabase
        .from('eves')
        .select('*')
        .eq('id', id)
        .eq('company_id', userData.company_id)
        .maybeSingle();
      
      if (error) {
        throw error;
      }
      
      if (!data) {
        throw new Error('EVE not found');
      }
      
      return data as EVE;
      
    } catch (error: any) {
      console.error('Error fetching EVE:', error);
      if (import.meta.env.DEV) {
        const mockEve = mockData.eves.find(eve => eve.id === id);
        return mockEve as EVE || null;
      }
      set({ error: error.message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  createEVE: async (eveData: Partial<EVE>) => {
    set({ isLoading: true, error: null });
    try {
      // First check connection
      const isConnected = await verifySupabaseConnection();
      
      if (!isConnected && import.meta.env.DEV) {
        // In development mode, simulate EVE creation
        const newEve = {
          id: `eve-${Date.now()}`,
          ...eveData,
          company_id: mockData.companies[0].id,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          created_by: mockData.users[0].id
        } as EVE;
        
        set(state => ({ eves: [newEve, ...state.eves] }));
        return newEve;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();

      if (userError) {
        throw userError;
      }

      if (!userData?.company_id) {
        throw new Error('User company not found');
      }

      const { data, error } = await supabase
        .from('eves')
        .insert([{
          ...eveData,
          company_id: userData.company_id,
          created_by: user.id
        }])
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      const newEVE = data as EVE;
      set(state => ({ eves: [newEVE, ...state.eves] }));
      return newEVE;
      
    } catch (error: any) {
      console.error('Error creating EVE:', error);
      set({ error: error.message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  updateEVE: async (id: string, eveData: Partial<EVE>) => {
    set({ isLoading: true, error: null });
    try {
      // First check connection
      const isConnected = await verifySupabaseConnection();
      
      if (!isConnected && import.meta.env.DEV) {
        // In development mode, simulate EVE update
        const updatedEve = {
          ...get().eves.find(eve => eve.id === id),
          ...eveData,
          updated_at: new Date().toISOString()
        } as EVE;
        
        set(state => ({
          eves: state.eves.map(eve => 
            eve.id === id ? updatedEve : eve
          )
        }));
        return updatedEve;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      const { data, error } = await supabase
        .from('eves')
        .update(eveData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        throw error;
      }
      
      const updatedEVE = data as EVE;
      set(state => ({
        eves: state.eves.map(eve => 
          eve.id === id ? updatedEVE : eve
        )
      }));
      return updatedEVE;
      
    } catch (error: any) {
      console.error('Error updating EVE:', error);
      set({ error: error.message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  deleteEVE: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      // First check connection
      const isConnected = await verifySupabaseConnection();
      
      if (!isConnected && import.meta.env.DEV) {
        // In development mode, simulate EVE deletion
        set(state => ({
          eves: state.eves.filter(eve => eve.id !== id)
        }));
        return;
      }

      const { error } = await supabase
        .from('eves')
        .delete()
        .eq('id', id);
      
      if (error) {
        throw error;
      }
      
      set(state => ({
        eves: state.eves.filter(eve => eve.id !== id)
      }));
      
    } catch (error: any) {
      console.error('Error deleting EVE:', error);
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  }
}));