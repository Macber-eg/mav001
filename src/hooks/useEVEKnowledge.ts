import { useState, useCallback } from 'react';
import { EVEKnowledge } from '../types/database.types';
import supabase from '../lib/supabase';

type UseEVEKnowledgeProps = {
  eveId: string;
  companyId?: string;
};

type UseEVEKnowledgeReturn = {
  knowledge: EVEKnowledge[];
  isLoading: boolean;
  error: string | null;
  addKnowledge: (
    category: string,
    key: string,
    value: any,
    importance?: number,
    isPrivate?: boolean,
    metadata?: Record<string, any>
  ) => Promise<EVEKnowledge | null>;
  updateKnowledge: (id: string, updates: Partial<EVEKnowledge>) => Promise<EVEKnowledge | null>;
  deleteKnowledge: (id: string) => Promise<void>;
  searchKnowledge: (query: string) => Promise<EVEKnowledge[]>;
  getKnowledgeByCategory: (category: string) => Promise<EVEKnowledge[]>;
};

export function useEVEKnowledge({ eveId, companyId }: UseEVEKnowledgeProps): UseEVEKnowledgeReturn {
  const [knowledge, setKnowledge] = useState<EVEKnowledge[]>([]);
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
  ): Promise<EVEKnowledge | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const company_id = await getCompanyId();

      const { data, error } = await supabase
        .from('eve_knowledge')
        .insert([{
          eve_id: eveId,
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

      const newKnowledge = data as EVEKnowledge;
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
    updates: Partial<EVEKnowledge>
  ): Promise<EVEKnowledge | null> => {
    setIsLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase
        .from('eve_knowledge')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const updatedKnowledge = data as EVEKnowledge;
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
        .from('eve_knowledge')
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

  const searchKnowledge = async (query: string): Promise<EVEKnowledge[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const company_id = await getCompanyId();

      const { data, error } = await supabase
        .from('eve_knowledge')
        .select('*')
        .eq('eve_id', eveId)
        .eq('company_id', company_id)
        .or(`key.ilike.%${query}%,value->>'text'.ilike.%${query}%`)
        .order('importance', { ascending: false });

      if (error) throw error;

      return data as EVEKnowledge[];
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  const getKnowledgeByCategory = useCallback(async (category: string): Promise<EVEKnowledge[]> => {
    setIsLoading(true);
    setError(null);

    try {
      const company_id = await getCompanyId();

      const { data, error } = await supabase
        .from('eve_knowledge')
        .select('*')
        .eq('eve_id', eveId)
        .eq('company_id', company_id)
        .eq('category', category)
        .order('importance', { ascending: false });

      if (error) throw error;

      setKnowledge(data as EVEKnowledge[]);
      return data as EVEKnowledge[];
    } catch (err: any) {
      setError(err.message);
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [eveId]);

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