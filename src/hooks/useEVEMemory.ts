import { useState, useCallback } from 'react';
import { useMemoryStore } from '../stores/memoryStore';
import { Memory } from '../types/database.types';

type UseEVEMemoryProps = {
  eveId: string;
  companyId: string;
};

type MemoryType = 'conversation' | 'task' | 'fact' | 'preference' | 'relationship';

type UseEVEMemoryReturn = {
  memories: Memory[];
  isLoading: boolean;
  error: string | null;
  addMemory: (type: MemoryType, key: string, value: any, importance?: number, expiry?: string, metadata?: Record<string, any>) => Promise<Memory | null>;
  updateMemory: (id: string, updates: Partial<Memory>) => Promise<Memory | null>;
  deleteMemory: (id: string) => Promise<void>;
  searchMemories: (query: string) => Promise<Memory[]>;
  getMemoriesByType: (type: MemoryType) => Promise<Memory[]>;
  retrieveMemory: (key: string) => Promise<Memory | null>;
};

/**
 * Hook for managing EVE memories - allowing EVEs to remember information over time
 */
export function useEVEMemory({ eveId, companyId }: UseEVEMemoryProps): UseEVEMemoryReturn {
  const { 
    memories,
    fetchMemories,
    createMemory,
    updateMemory,
    deleteMemory,
    searchMemories: searchMemoriesFromStore,
    getMemoriesByType: getMemoriesByTypeFromStore,
    isLoading,
    error
  } = useMemoryStore();
  
  const [localMemories, setLocalMemories] = useState<Memory[]>([]);

  // Memoize functions to prevent infinite loops
  const ensureMemoriesLoaded = useCallback(async () => {
    if (memories.length === 0) {
      const loadedMemories = await fetchMemories(eveId);
      setLocalMemories(loadedMemories);
      return loadedMemories;
    }
    return memories;
  }, [memories.length, fetchMemories, eveId]);

  const addMemory = useCallback(async (
    type: MemoryType,
    key: string,
    value: any,
    importance: number = 1,
    expiry?: string,
    metadata?: Record<string, any>
  ): Promise<Memory | null> => {
    return await createMemory({
      eve_id: eveId,
      company_id: companyId, // Add company ID
      type,
      key,
      value,
      importance,
      expiry,
      metadata,
      last_accessed: new Date().toISOString()
    });
  }, [createMemory, eveId, companyId]);

  const retrieveMemory = useCallback(async (key: string): Promise<Memory | null> => {
    await ensureMemoriesLoaded();
    
    const memory = memories.find(m => m.eve_id === eveId && m.key === key);
    
    if (memory) {
      await updateMemory(memory.id, { last_accessed: new Date().toISOString() });
      return memory;
    }
    
    try {
      const { data, error } = await fetch('/api/eve-memory', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'retrieve',
          eveId,
          companyId, // Add company ID
          key
        }),
      }).then(res => res.json());
      
      if (error) throw new Error(error);
      
      if (data && data.memory) {
        await updateMemory(data.memory.id, { last_accessed: new Date().toISOString() });
        return data.memory;
      }
      
      return null;
    } catch (error) {
      console.error('Error retrieving memory:', error);
      return null;
    }
  }, [memories, eveId, companyId, updateMemory, ensureMemoriesLoaded]);

  const getMemoriesByType = useCallback(async (type: MemoryType): Promise<Memory[]> => {
    return await getMemoriesByTypeFromStore(eveId, type, companyId); // Add company ID
  }, [getMemoriesByTypeFromStore, eveId, companyId]);

  const searchMemories = useCallback(async (query: string): Promise<Memory[]> => {
    return await searchMemoriesFromStore(eveId, query, companyId); // Add company ID
  }, [searchMemoriesFromStore, eveId, companyId]);

  return {
    memories: localMemories.length > 0 ? localMemories : memories,
    isLoading,
    error,
    addMemory,
    updateMemory,
    deleteMemory,
    searchMemories,
    getMemoriesByType,
    retrieveMemory
  };
}