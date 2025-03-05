import { create } from 'zustand';
import supabase from '../lib/supabase';
import { Collaboration } from '../types/database.types';

interface CollaborationState {
  collaborations: Collaboration[];
  isLoading: boolean;
  error: string | null;
  fetchCollaborations: () => Promise<void>;
  getCollaboration: (id: string) => Promise<Collaboration | null>;
  updateCollaboration: (id: string, data: Partial<Collaboration>) => Promise<Collaboration | null>;
  deleteCollaboration: (id: string) => Promise<void>;
}

export const useCollaborationStore = create<CollaborationState>((set, get) => ({
  collaborations: [],
  isLoading: false,
  error: null,
  
  fetchCollaborations: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('collaborations')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        set({ error: `Failed to fetch collaborations: ${error.message}` });
        throw error;
      }
      
      set({ collaborations: data as Collaboration[] });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  getCollaboration: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('collaborations')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) {
        set({ error: `Failed to fetch collaboration: ${error.message}` });
        throw error;
      }
      
      if (!data) {
        set({ error: 'Collaboration not found' });
        return null;
      }
      
      return data as Collaboration;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  updateCollaboration: async (id: string, data: Partial<Collaboration>) => {
    set({ isLoading: true, error: null });
    try {
      const { data: updatedData, error } = await supabase
        .from('collaborations')
        .update(data)
        .eq('id', id)
        .select()
        .single();
      
      if (error) {
        set({ error: `Failed to update collaboration: ${error.message}` });
        throw error;
      }
      
      // Update the store
      const { collaborations } = get();
      set({ 
        collaborations: collaborations.map(collab => 
          collab.id === id ? { ...collab, ...updatedData } as Collaboration : collab
        ) 
      });
      
      return updatedData as Collaboration;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  deleteCollaboration: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('collaborations')
        .delete()
        .eq('id', id);
      
      if (error) {
        set({ error: `Failed to delete collaboration: ${error.message}` });
        throw error;
      }
      
      // Update the store
      const { collaborations } = get();
      set({ collaborations: collaborations.filter(collab => collab.id !== id) });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  }
}));