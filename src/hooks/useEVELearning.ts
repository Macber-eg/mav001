import { useState } from 'react';
import { useEVEMemory } from './useEVEMemory';
import { Memory } from '../types/database.types';

type UseEVELearningProps = {
  eveId: string;
};

type LearningInsight = {
  type: 'fact' | 'preference' | 'relationship';
  key: string;
  value: any;
  confidence: number;
  source: 'conversation' | 'observation' | 'inference';
};

type UseEVELearningReturn = {
  extractInsights: (text: string) => Promise<LearningInsight[]>;
  storeInsight: (insight: LearningInsight) => Promise<Memory | null>;
  validateInsight: (insight: LearningInsight) => Promise<boolean>;
  isLearning: boolean;
  error: string | null;
};

/**
 * Hook for EVE learning capabilities - extracting and storing insights from interactions
 */
export function useEVELearning({ eveId }: UseEVELearningProps): UseEVELearningReturn {
  const [isLearning, setIsLearning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { addMemory, searchMemories } = useEVEMemory({ eveId });
  
  // Extract potential insights from text using AI
  const extractInsights = async (text: string): Promise<LearningInsight[]> => {
    setIsLearning(true);
    setError(null);
    
    try {
      const response = await fetch('/api/eve-intelligence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eveId,
          operation: 'extract_insights',
          text,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to extract insights');
      }
      
      const data = await response.json();
      return data.insights;
    } catch (err: any) {
      setError(err.message || 'Failed to extract insights');
      return [];
    } finally {
      setIsLearning(false);
    }
  };
  
  // Store a validated insight as a memory
  const storeInsight = async (insight: LearningInsight): Promise<Memory | null> => {
    try {
      // First check if we already have a similar memory
      const similarMemories = await searchMemories(insight.key);
      
      // If we have a similar memory with high confidence, don't store a new one
      const existingHighConfidence = similarMemories.find(
        m => m.metadata?.confidence > insight.confidence
      );
      
      if (existingHighConfidence) {
        return null;
      }
      
      // Store as a new memory
      return await addMemory(
        insight.type,
        insight.key,
        insight.value,
        Math.ceil(insight.confidence * 5), // Convert confidence (0-1) to importance (1-5)
        undefined, // No expiry for learned insights
        {
          confidence: insight.confidence,
          source: insight.source,
          learned_at: new Date().toISOString()
        }
      );
    } catch (err: any) {
      setError(err.message || 'Failed to store insight');
      return null;
    }
  };
  
  // Validate an insight before storing
  const validateInsight = async (insight: LearningInsight): Promise<boolean> => {
    try {
      // Check for contradictions in existing memories
      const relatedMemories = await searchMemories(insight.key);
      
      // If we have no related memories, consider it valid
      if (relatedMemories.length === 0) {
        return true;
      }
      
      // Check for direct contradictions
      const contradictions = relatedMemories.filter(memory => {
        // For simple values, direct comparison
        if (typeof memory.value === 'string' || typeof memory.value === 'number') {
          return memory.value !== insight.value && memory.metadata?.confidence > insight.confidence;
        }
        
        // For objects, check if they have conflicting properties
        if (typeof memory.value === 'object' && typeof insight.value === 'object') {
          return Object.keys(memory.value).some(key => 
            memory.value[key] !== insight.value[key] && memory.metadata?.confidence > insight.confidence
          );
        }
        
        return false;
      });
      
      // If we have contradictions with higher confidence, reject the insight
      if (contradictions.length > 0) {
        return false;
      }
      
      // If the insight has high confidence, accept it
      if (insight.confidence > 0.8) {
        return true;
      }
      
      // For medium confidence insights, check if they align with existing knowledge
      if (insight.confidence > 0.5) {
        const supportingMemories = relatedMemories.filter(memory => {
          if (typeof memory.value === 'string' || typeof memory.value === 'number') {
            return memory.value === insight.value;
          }
          
          if (typeof memory.value === 'object' && typeof insight.value === 'object') {
            return Object.keys(memory.value).some(key => 
              memory.value[key] === insight.value[key]
            );
          }
          
          return false;
        });
        
        return supportingMemories.length > 0;
      }
      
      // For low confidence insights, require multiple supporting memories
      const supportingMemories = relatedMemories.filter(memory => {
        if (typeof memory.value === 'string' || typeof memory.value === 'number') {
          return memory.value === insight.value;
        }
        
        if (typeof memory.value === 'object' && typeof insight.value === 'object') {
          return Object.keys(memory.value).some(key => 
            memory.value[key] === insight.value[key]
          );
        }
        
        return false;
      });
      
      return supportingMemories.length >= 2;
      
    } catch (err: any) {
      setError(err.message || 'Failed to validate insight');
      return false;
    }
  };

  return {
    extractInsights,
    storeInsight,
    validateInsight,
    isLearning,
    error
  };
}