import { useState, useEffect } from 'react';
import { useEVEIntelligence } from './useEVEIntelligence';
import { useEVEMemory } from './useEVEMemory';
import { useEVELearning } from './useEVELearning';
import { Message } from '../types/database.types';

type UseEVEChatProps = {
  eveId: string;
  companyId: string;
  useRealtime?: boolean;
};

type UseEVEChatReturn = {
  sendMessage: (message: string) => Promise<string>;
  response: string | null;
  conversationHistory: Message[];
  isLoading: boolean;
  error: string | null;
  clearConversation: () => void;
  partialResponse: string;
  isStreaming: boolean;
  isLearning: boolean;
};

export function useEVEChat({ eveId, companyId, useRealtime = true }: UseEVEChatProps): UseEVEChatReturn {
  const [conversationContext, setConversationContext] = useState<string>('');
  
  // Use intelligence, memory, and learning hooks
  const intelligence = useEVEIntelligence({ eveId, useRealtime });
  const memory = useEVEMemory({ eveId, companyId });
  const learning = useEVELearning({ eveId });

  // Store conversation in memory
  const storeConversation = async (userMessage: string, aiResponse: string) => {
    try {
      const key = `conversation_${Date.now()}`;
      await memory.addMemory('conversation', key, {
        user: userMessage,
        assistant: aiResponse,
        timestamp: new Date().toISOString()
      }, 1); // Importance 1 for regular conversations
      
      // Extract and store insights from the conversation
      const insights = await learning.extractInsights(userMessage + '\n' + aiResponse);
      
      // Process each insight
      for (const insight of insights) {
        const isValid = await learning.validateInsight(insight);
        if (isValid) {
          await learning.storeInsight(insight);
        }
      }
    } catch (error) {
      console.error('Error storing conversation and insights:', error);
    }
  };

  // Get relevant memories for context
  const getRelevantContext = async (message: string) => {
    try {
      // Search for relevant memories
      const relevantMemories = await memory.searchMemories(message);
      
      // Format memories as context
      if (relevantMemories.length > 0) {
        const context = relevantMemories.map(mem => {
          if (mem.type === 'fact') {
            return `Known fact: ${mem.key} - ${JSON.stringify(mem.value)}`;
          } else if (mem.type === 'preference') {
            return `Preference: ${mem.key} - ${JSON.stringify(mem.value)}`;
          } else if (mem.type === 'relationship') {
            return `Relationship: ${mem.key} - ${JSON.stringify(mem.value)}`;
          }
          return `${mem.type}: ${mem.key} - ${JSON.stringify(mem.value)}`;
        }).join('\n');

        return context;
      }
    } catch (error) {
      console.error('Error getting relevant context:', error);
    }
    return '';
  };

  // Enhanced message sending with memory and learning integration
  const sendMessage = async (message: string): Promise<string> => {
    try {
      // Get relevant context from memories
      const context = await getRelevantContext(message);
      
      // Add context to the message if available
      const enhancedMessage = context 
        ? `[Context]\n${context}\n\n[User Message]\n${message}`
        : message;
      
      // Send message with context
      const response = await intelligence.sendMessage(enhancedMessage);
      
      // Store conversation and extract insights
      await storeConversation(message, response);
      
      return response;
    } catch (error) {
      throw error;
    }
  };

  return {
    sendMessage,
    response: intelligence.response,
    conversationHistory: intelligence.conversationHistory,
    isLoading: intelligence.isLoading,
    error: intelligence.error || memory.error || learning.error,
    clearConversation: intelligence.clearConversation,
    partialResponse: intelligence.partialResponse,
    isStreaming: intelligence.isStreaming,
    isLearning: learning.isLearning
  };
}