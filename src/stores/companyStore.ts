import { create } from 'zustand';
import supabase from '../lib/supabase';
import { Company, User } from '../types/database.types';

interface CompanyState {
  company: Company | null;
  users: User[];
  isLoading: boolean;
  error: string | null;
  fetchCompany: () => Promise<Company | null>;
  updateCompany: (companyData: Partial<Company>) => Promise<Company | null>;
  fetchUsers: () => Promise<void>;
  addUser: (email: string, role: 'company_admin' | 'staff') => Promise<void>;
  updateUserRole: (userId: string, role: 'company_admin' | 'staff') => Promise<void>;
  deactivateUser: (userId: string) => Promise<void>;
}

export const useCompanyStore = create<CompanyState>((set, get) => ({
  company: null,
  users: [],
  isLoading: false,
  error: null,
  
  fetchCompany: async () => {
    set({ isLoading: true, error: null });
    try {
      // First get the current user's company_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle(); // Use maybeSingle instead of single
      
      if (userError) {
        set({ error: `Failed to fetch user data: ${userError.message}` });
        throw userError;
      }
      
      if (!userData) {
        throw new Error('User record not found. Please complete profile setup.');
      }
      
      // Now fetch the company
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('id', userData.company_id)
        .maybeSingle();
      
      if (error) {
        set({ error: `Failed to fetch company: ${error.message}` });
        throw error;
      }
      
      const company = data as Company;
      set({ company });
      return company;
      
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  updateCompany: async (companyData: Partial<Company>) => {
    set({ isLoading: true, error: null });
    try {
      const { company } = get();
      if (!company) throw new Error('No company loaded');
      
      const { data, error } = await supabase
        .from('companies')
        .update(companyData)
        .eq('id', company.id)
        .select()
        .maybeSingle();
      
      if (error) {
        set({ error: `Failed to update company: ${error.message}` });
        throw error;
      }
      
      const updatedCompany = data as Company;
      set({ company: updatedCompany });
      return updatedCompany;
      
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  fetchUsers: async () => {
    set({ isLoading: true, error: null });
    try {
      // First get the current user's company_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle(); // Use maybeSingle instead of single
      
      if (userError) {
        set({ error: `Failed to fetch user data: ${userError.message}` });
        throw userError;
      }
      
      if (!userData) {
        throw new Error('User record not found. Please complete profile setup.');
      }
      
      // Now fetch all users for this company
      const { data, error } = await supabase
        .from('users')
        .select(`
          *,
          profiles(*)
        `)
        .eq('company_id', userData.company_id)
        .order('created_at', { ascending: false });
      
      if (error) {
        set({ error: `Failed to fetch company users: ${error.message}` });
        throw error;
      }
      
      set({ users: data as User[] });
      
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  addUser: async (email: string, role: 'company_admin' | 'staff') => {
    set({ isLoading: true, error: null });
    try {
      // This would normally send an invite email, but for demo we'll simulate it
      // In a real app, you'd use a server function to create the user in Auth
      // and then add them to the users table
      
      // Here we just log the fact that we'd do this
      console.log(`Inviting ${email} with role ${role}`);
      
      set({ error: 'User invitation functionality requires server-side implementation' });
      
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  updateUserRole: async (userId: string, role: 'company_admin' | 'staff') => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('users')
        .update({ role })
        .eq('id', userId);
      
      if (error) {
        set({ error: `Failed to update user role: ${error.message}` });
        throw error;
      }
      
      // Update local state
      const { users } = get();
      set({ 
        users: users.map(user => 
          user.id === userId ? { ...user, role } : user
        ) 
      });
      
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  deactivateUser: async (userId: string) => {
    set({ isLoading: true, error: null });
    try {
      // This would normally deactivate the user in Auth
      // In a real app, you'd use a server function with admin rights to do this
      
      // Here we just log the fact that we'd do this
      console.log(`Deactivating user ${userId}`);
      
      set({ error: 'User deactivation functionality requires server-side implementation' });
      
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  }
}));