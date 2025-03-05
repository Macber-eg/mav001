import { create } from 'zustand';
import supabase from '../lib/supabase';
import { Action, EVEAction } from '../types/database.types';

interface ActionState {
  actions: Action[];
  isLoading: boolean;
  error: string | null;
  fetchActions: () => Promise<void>;
  getAction: (id: string) => Promise<Action | null>;
  createAction: (actionData: Partial<Action>) => Promise<Action | null>;
  updateAction: (id: string, actionData: Partial<Action>) => Promise<Action | null>;
  deleteAction: (id: string) => Promise<void>;
  
  // EVE Action relations
  assignActionToEVE: (eveId: string, actionId: string, parameters?: Record<string, any>) => Promise<void>;
  removeActionFromEVE: (eveId: string, actionId: string) => Promise<void>;
  getEVEActions: (eveId: string) => Promise<EVEAction[]>;
}

export const useActionStore = create<ActionState>((set, get) => ({
  actions: [],
  isLoading: false,
  error: null,
  
  fetchActions: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('actions')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        set({ error: `Failed to fetch actions: ${error.message}` });
        throw error;
      }
      set({ actions: data as Action[] });
      
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  getAction: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('actions')
        .select('*')
        .eq('id', id)
        .maybeSingle();
      
      if (error) {
        set({ error: `Failed to fetch action details: ${error.message}` });
        throw error;
      }
      
      if (!data) {
        set({ error: 'Action not found' });
        return null;
      }
      
      return data as Action;
      
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  createAction: async (actionData: Partial<Action>) => {
    set({ isLoading: true, error: null });
    try {
      // Get the user's company_id from auth if not global
      let companyId = null;
      if (!actionData.is_global) {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('Not authenticated');
        
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
          // If user record doesn't exist, create it
          // Similar to EVE creation logic
          const companyName = user.user_metadata?.company_name || 'Default Company';
          
          // First check if company exists or create it
          const { data: companyData, error: companyError } = await supabase
            .from('companies')
            .insert([{ 
              name: companyName,
              primary_color: '#00BFA6',
              secondary_color: '#1A1A40'
            }])
            .select()
            .maybeSingle();
          
          if (companyError && !companyError.message.includes('duplicate key')) {
            set({ error: `Failed to create company: ${companyError.message}` });
            throw companyError;
          }
          
          if (!companyData) {
            throw new Error('Failed to create or find company');
          }
          
          companyId = companyData.id;
          
          // Create user record
          const { error: createError } = await supabase
            .from('users')
            .insert([{ 
              id: user.id,
              email: user.email,
              company_id: companyId,
              role: 'company_admin' // Default to admin for first user
            }]);
          
          if (createError) {
            set({ error: `Failed to create user record: ${createError.message}` });
            throw createError;
          }
        } else {
          companyId = userData.company_id;
        }
      }
      
      // Create the action
      const { data, error } = await supabase
        .from('actions')
        .insert([{ 
          ...actionData,
          company_id: companyId,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }])
        .select()
        .maybeSingle();
      
      if (error) {
        set({ error: `Failed to create action: ${error.message}` });
        throw error;
      }
      
      // Update the store
      const { actions } = get();
      set({ actions: [data as Action, ...actions] });
      
      return data as Action;
      
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  updateAction: async (id: string, actionData: Partial<Action>) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('actions')
        .update(actionData)
        .eq('id', id)
        .select()
        .maybeSingle();
      
      if (error) {
        set({ error: `Failed to update action: ${error.message}` });
        throw error;
      }
      
      // Update the store
      const { actions } = get();
      set({ 
        actions: actions.map(action => 
          action.id === id ? { ...action, ...data } as Action : action
        ) 
      });
      
      return data as Action;
      
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  deleteAction: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('actions')
        .delete()
        .eq('id', id);
      
      if (error) {
        set({ error: `Failed to delete action: ${error.message}` });
        throw error;
      }
      
      // Update the store
      const { actions } = get();
      set({ actions: actions.filter(action => action.id !== id) });
      
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  // EVE Action relationship methods
  assignActionToEVE: async (eveId: string, actionId: string, parameters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('eve_actions')
        .insert([{ 
          eve_id: eveId, 
          action_id: actionId,
          parameters,
          created_by: (await supabase.auth.getUser()).data.user?.id
        }]);
      
      if (error) {
        set({ error: `Failed to assign action to EVE: ${error.message}` });
        throw error;
      }
      
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  removeActionFromEVE: async (eveId: string, actionId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('eve_actions')
        .delete()
        .eq('eve_id', eveId)
        .eq('action_id', actionId);
      
      if (error) {
        set({ error: `Failed to remove action from EVE: ${error.message}` });
        throw error;
      }
      
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  getEVEActions: async (eveId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('eve_actions')
        .select(`
          *,
          action:actions(*)
        `)
        .eq('eve_id', eveId);
      
      if (error) {
        set({ error: `Failed to fetch EVE actions: ${error.message}` });
        throw error;
      }
      return data as EVEAction[];
      
    } catch (error: any) {
      set({ error: error.message });
      return [];
    } finally {
      set({ isLoading: false });
    }
  }
}));