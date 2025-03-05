import { useState, useCallback } from 'react';
import { CompanyKnowledge } from '../types/database.types';
import supabase from '../lib/supabase';

type UseCompanyKnowledgeProps = {
  companyId?: string;
};

type UseCompanyKnowledgeReturn = {
  knowledge: CompanyKnowledge[];
  isLoading: boolean;
  error: string | null;
  addKnowledge: (
    category: string,
    key: string,
    value: any,
    importance?: number,
    isPrivate?: boolean,
    metadata?: Record<string, any>
  ) => Promise<CompanyKnowledge | null>;
  updateKnowledge: (id: string, updates: Partial<CompanyKnowledge>) => Promise<CompanyKnowledge | null>;
  deleteKnowledge: (id: string) => Promise<void>;
  searchKnowledge: (query: string) => Promise<CompanyKnowledge[]>;
  getKnowledgeByCategory: (category: string) => Promise<CompanyKnowledge[]>;
};

export function useCompanyKnowledge({ companyId }: UseCompanyKnowledgeProps): UseCompanyKnowledgeReturn {
  const [knowledge, setKnowledge] = useState<CompanyKnowledge[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get current user's company_id if not provided
  const getCompanyId = async (): Promise<string> => {
    if (companyId) return companyId;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (userError) throw userError;
    if (!userData?.company_id) throw new Error('User company not found');

    return userData.company_id;
  };

  const addKnowledge = async (
    category: string,
    key: string,
    value: any,
    importance: number = 1,
    isPrivate: boolean = false,
    metadata: Record<string, any> = {}
  ): Promise<CompanyKnowledge | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const company_id = await getCompanyId();

      const { data, error } = await supabase
        .from('company_knowledge')
        .insert([{
          company_id,
          category,
          key,
          value,
          importance,
          is_private: isPrivate,
          metadata
        }])
        .select()
        .single();

      if (error) throw error;

      const newKnowledge = data as CompanyKnowledge;
      setKnowledge(prev => [newKnowledge, ...prev]);
      return newKnowledge;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateKnowledge = async (
    id: string,
    updates: Partial<CompanyKnowledge>
  ): Promise<CompanyKnowledge | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('company_knowledge')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const updatedKnowledge = data as CompanyKnowledge;
      setKnowledge(prev => 
        prev.map(k => k.id === id ? updatedKnowledge : k)
      );
      return updatedKnowledge;
    } catch (err: any) {
      setError(err.message);
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteKnowledge = async (id: string): Promise<void> => {
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('company_knowledge')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setKnowledge(prev => prev.filter(k => k.id !== id));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const searchKnowledge = async (query: string): Promise<CompanyKnowledge[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const company_id = await getCompanyId();

      const { data, error } = await supabase
        .from('company_knowledge')
        .select('*')
        .eq('company_id', company_id)
        .or(`key.ilike.%${query}%,value->>'text'.ilike.%${query}%`)
        .order('importance', { ascending: false });

      if (error) throw error;

      setKnowledge(data as CompanyKnowledge[]);
      return data as CompanyKnowledge[];
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const getKnowledgeByCategory = useCallback(async (category: string): Promise<CompanyKnowledge[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const company_id = await getCompanyId();

      const { data, error } = await supabase
        .from('company_knowledge')
        .select('*')
        .eq('company_id', company_id)
        .eq('category', category)
        .order('importance', { ascending: false });

      if (error) throw error;

      setKnowledge(data as CompanyKnowledge[]);
      return data as CompanyKnowledge[];
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [companyId]);

  return {
    knowledge,
    isLoading,
    error,
    addKnowledge,
    updateKnowledge,
    deleteKnowledge,
    searchKnowledge,
    getKnowledgeByCategory
  };
}