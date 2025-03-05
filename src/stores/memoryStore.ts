import { create } from 'zustand';
import supabase, { verifySupabaseConnection } from '../lib/supabase';
import { Memory } from '../types/database.types';

interface MemoryState {
  memories: Memory[];
  isLoading: boolean;
  error: string | null;
  fetchMemories: (eveId: string) => Promise<Memory[]>;
  getMemory: (id: string) => Promise<Memory | null>;
  createMemory: (memoryData: Partial<Memory>) => Promise<Memory | null>;
  updateMemory: (id: string, memoryData: Partial<Memory>) => Promise<Memory | null>;
  deleteMemory: (id: string) => Promise<void>;
  searchMemories: (eveId: string, query: string, companyId: string) => Promise<Memory[]>;
  getMemoriesByType: (eveId: string, type: string, companyId: string) => Promise<Memory[]>;
}

export const useMemoryStore = create<MemoryState>((set, get) => ({
  memories: [],
  isLoading: false,
  error: null,
  
  fetchMemories: async (eveId: string) => {
    set({ isLoading: true, error: null });
    try {
      // Check connection first
      const isConnected = await verifySupabaseConnection();
      
      if (!isConnected) {
        // For development or as fallback, we'd use mock data
        set({ 
          memories: [], // We don't have mock memory data yet
          error: import.meta.env.DEV ? null : 'Connection error: Using offline data'
        });
        return [];
      }
      
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .eq('eve_id', eveId)
        .order('last_accessed', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      set({ memories: data as Memory[] });
      return data as Memory[];
      
    } catch (error: any) {
      set({ 
        memories: [],
        error: import.meta.env.DEV ? null : `Error fetching memories: ${error.message}`
      });
      return [];
    } finally {
      set({ isLoading: false });
    }
  },
  
  getMemory: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) {
        throw error;
      }
      
      if (!data) {
        throw new Error('Memory not found');
      }
      
      return data as Memory;
      
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  createMemory: async (memoryData: Partial<Memory>) => {
    set({ isLoading: true, error: null });
    try {
      // Create the memory
      const { data, error } = await supabase
        .from('memories')
        .insert([{
          ...memoryData,
          last_accessed: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) {
        set({ error: `Error creating memory: ${error.message}` });
        throw error;
      }
      
      // Update the store
      const { memories } = get();
      set({ memories: [data as Memory, ...memories] });
      
      return data as Memory;
      
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  updateMemory: async (id: string, memoryData: Partial<Memory>) => {
    set({ isLoading: true, error: null });
    try {
      // Check connection first
      const isConnected = await verifySupabaseConnection();
      if (!isConnected) {
        throw new Error('Database connection error. Unable to update memory at this time.');
      }
      
      // Update the memory's last_accessed time along with other changes
      const updatedData = {
        ...memoryData,
        last_accessed: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data, error } = await supabase
        .from('memories')
        .update(updatedData)
        .eq('id', id)
        .select()
        .maybeSingle();
      
      if (error) {
        set({ error: `Error updating memory: ${error.message}` });
        throw error;
      }
      
      // Update the store
      const { memories } = get();
      set({ 
        memories: memories.map(memory => 
          memory.id === id ? { ...memory, ...data } as Memory : memory
        ) 
      });
      
      return data as Memory;
      
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  deleteMemory: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      // Check connection first  
      const isConnected = await verifySupabaseConnection();
      if (!isConnected) {
        throw new Error('Database connection error. Unable to delete memory at this time.');
      }
      
      const { error } = await supabase
        .from('memories')
        .delete()
        .eq('id', id);
      
      if (error) {
        set({ error: `Error deleting memory: ${error.message}` });
        throw error;
      }
      
      // Update the store
      const { memories } = get();
      set({ memories: memories.filter(memory => memory.id !== id) });
      
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  searchMemories: async (eveId: string, query: string, companyId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .eq('eve_id', eveId)
        .eq('company_id', companyId)
        .ilike('key', `%${query}%`)
        .order('importance', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      return data as Memory[];
      
    } catch (error: any) {
      set({ error: error.message });
      return [];
    } finally {
      set({ isLoading: false });
    }
  },
  
  getMemoriesByType: async (eveId: string, type: string, companyId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('memories')
        .select('*')
        .eq('eve_id', eveId)
        .eq('company_id', companyId)
        .eq('type', type)
        .order('importance', { ascending: false });
      
      if (error) {
        throw error;
      }
      
      return data as Memory[];
      
    } catch (error: any) {
      set({ error: error.message });
      return [];
    } finally {
      set({ isLoading: false });
    }
  }
}));