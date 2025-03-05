import { create } from 'zustand';
import supabase from '../lib/supabase';
import { Log } from '../types/database.types';

interface LogState {
  logs: Log[];
  isLoading: boolean;
  error: string | null;
  fetchLogs: (limit?: number) => Promise<void>;
  fetchEVELogs: (eveId: string, limit?: number) => Promise<Log[]>;
  fetchActionLogs: (actionId: string, limit?: number) => Promise<Log[]>;
  logEvent: (eveId: string | null, actionId: string | null, eventType: string, status: 'success' | 'error' | 'pending' | 'cancelled', message: string, metadata?: Record<string, any>) => Promise<void>;
}

export const useLogStore = create<LogState>((set, get) => ({
  logs: [],
  isLoading: false,
  error: null,
  
  fetchLogs: async (limit = 50) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        set({ error: `Failed to fetch logs: ${error.message}` });
        throw error;
      }
      set({ logs: data as Log[] });
      
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  fetchEVELogs: async (eveId: string, limit = 20) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('logs')
        .select('*')
        .eq('eve_id', eveId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        set({ error: `Failed to fetch EVE logs: ${error.message}` });
        throw error;
      }
      return data as Log[];
      
    } catch (error: any) {
      set({ error: error.message });
      return [];
    } finally {
      set({ isLoading: false });
    }
  },
  
  fetchActionLogs: async (actionId: string, limit = 20) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('logs')
        .select('*')
        .eq('action_id', actionId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        set({ error: `Failed to fetch action logs: ${error.message}` });
        throw error;
      }
      return data as Log[];
      
    } catch (error: any) {
      set({ error: error.message });
      return [];
    } finally {
      set({ isLoading: false });
    }
  },
  
  logEvent: async (eveId, actionId, eventType, status, message, metadata = {}) => {
    set({ isLoading: true, error: null });
    try {
      // Get the user's auth information
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      // Try to get the user's company_id
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle(); // Use maybeSingle to prevent 406 errors
      
      if (userError) {
        set({ error: `Failed to fetch user data: ${userError.message}` });
        throw userError;
      }
      
      if (!userData) {
        // Handle case where user record doesn't exist
        set({ error: "User record not found. Cannot log event." });
        return;
      }
      
      // Use the RPC function to log the event
      const { error } = await supabase.rpc('log_event', {
        p_eve_id: eveId,
        p_action_id: actionId,
        p_company_id: userData.company_id,
        p_event_type: eventType,
        p_status: status,
        p_message: message,
        p_metadata: metadata
      });
      
      if (error) {
        set({ error: `Failed to log event: ${error.message}` });
        throw error;
      }
      
      // Refresh logs if needed
      if (get().logs.length > 0) {
        await get().fetchLogs();
      }
      
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  }
}));