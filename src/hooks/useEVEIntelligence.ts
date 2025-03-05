import { useState, useEffect } from 'react';
import { verifySupabaseConnection } from '../lib/supabase';
import { verifyOpenAIConnection, generateMockResponse } from '../lib/openai-helper';
import { useEVEMemory } from './useEVEMemory';
import { useEVELearning } from './useEVELearning';
import { Memory } from '../types/database.types';

type UseEVEIntelligenceProps = {
  eveId: string;
  useRealtime?: boolean;
  contextWindow?: number; // Number of previous messages to include
  reasoningDepth?: 'basic' | 'advanced' | 'expert';
};

type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

type UseEVEIntelligenceReturn = {
  sendMessage: (message: string) => Promise<string>;
  response: string | null;
  conversationHistory: Message[];
  isLoading: boolean;
  error: string | null;
  clearConversation: () => void;
  partialResponse: string;
  isStreaming: boolean;
  isThinking: boolean; // New state for reasoning phase
  thoughtProcess: string | null; // Shows EVE's reasoning process
  confidenceScore: number; // Confidence in the response
  relevantContext: Memory[]; // Relevant memories used
};

/**
 * Enhanced hook for EVE intelligence with advanced reasoning and memory integration
 */
export function useEVEIntelligence({ 
  eveId, 
  useRealtime = true,
  contextWindow = 10,
  reasoningDepth = 'advanced'
}: UseEVEIntelligenceProps): UseEVEIntelligenceReturn {
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  const [response, setResponse] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partialResponse, setPartialResponse] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [thoughtProcess, setThoughtProcess] = useState<string | null>(null);
  const [confidenceScore, setConfidenceScore] = useState(0);
  const [relevantContext, setRelevantContext] = useState<Memory[]>([]);
  const [isOpenAIConnected, setIsOpenAIConnected] = useState<boolean | null>(null);

  // Use memory and learning hooks
  const memory = useEVEMemory({ eveId, companyId: 'default' }); // Company ID should be passed
  const learning = useEVELearning({ eveId });

  // Check OpenAI connection on mount
  useEffect(() => {
    async function checkOpenAI() {
      try {
        const isConnected = await verifyOpenAIConnection();
        setIsOpenAIConnected(isConnected);
      } catch (error) {
        console.warn('Failed to check OpenAI connection:', error);
        setIsOpenAIConnected(false);
      }
    }
    
    checkOpenAI();
  }, []);

  // Function to get relevant context from memory
  const getRelevantContext = async (message: string): Promise<Memory[]> => {
    try {
      // Search for relevant memories
      const relevantMemories = await memory.searchMemories(message);
      
      // Sort by importance and recency
      return relevantMemories.sort((a, b) => {
        const importanceWeight = 0.7;
        const recencyWeight = 0.3;
        
        const importanceScore = (b.importance - a.importance) * importanceWeight;
        const recencyScore = (new Date(b.last_accessed).getTime() - new Date(a.last_accessed).getTime()) * recencyWeight;
        
        return importanceScore + recencyScore;
      }).slice(0, 5); // Get top 5 most relevant memories
    } catch (error) {
      console.error('Error getting relevant context:', error);
      return [];
    }
  };

  // Function to analyze message and generate reasoning
  const analyzeMessage = async (message: string, context: Memory[]): Promise<{
    thoughts: string;
    confidence: number;
  }> => {
    try {
      const response = await fetch('/api/eve-intelligence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eveId,
          operation: 'analyze',
          message,
          context: context.map(m => ({
            type: m.type,
            key: m.key,
            value: m.value,
            importance: m.importance
          })),
          reasoningDepth
        })
      });

      if (!response.ok) {
        throw new Error('Failed to analyze message');
      }

      const data = await response.json();
      return {
        thoughts: data.thoughts,
        confidence: data.confidence
      };
    } catch (error) {
      console.error('Error analyzing message:', error);
      return {
        thoughts: 'Unable to analyze message',
        confidence: 0.5
      };
    }
  };

  const sendMessage = async (message: string): Promise<string> => {
    setIsLoading(true);
    setError(null);
    setIsThinking(true);
    setIsStreaming(useRealtime);
    
    if (useRealtime) {
      setPartialResponse('');
    }

    try {
      // First verify connection to avoid HTML error responses
      const isConnected = await verifySupabaseConnection();
      const isOpenAIReady = isOpenAIConnected !== false;
      
      if (!isConnected || !isOpenAIReady) {
        return handleOfflineMode(message);
      }

      // Get relevant context from memory
      const context = await getRelevantContext(message);
      setRelevantContext(context);

      // Analyze message and generate reasoning
      const analysis = await analyzeMessage(message, context);
      setThoughtProcess(analysis.thoughts);
      setConfidenceScore(analysis.confidence);

      // Add the user message to conversation history
      const userMessage: Message = { role: 'user', content: message };
      setConversationHistory(prev => [...prev, userMessage]);

      // Format context for the AI
      const contextPrompt = context.map(m => {
        if (m.type === 'fact') {
          return `Known fact: ${m.key} - ${JSON.stringify(m.value)}`;
        } else if (m.type === 'preference') {
          return `Preference: ${m.key} - ${JSON.stringify(m.value)}`;
        } else if (m.type === 'relationship') {
          return `Relationship: ${m.key} - ${JSON.stringify(m.value)}`;
        }
        return `${m.type}: ${m.key} - ${JSON.stringify(m.value)}`;
      }).join('\n');

      // Get recent conversation history
      const recentHistory = conversationHistory
        .slice(-contextWindow)
        .map(msg => ({ role: msg.role, content: msg.content }));

      if (useRealtime) {
        return handleRealtimeRequest(message, contextPrompt, recentHistory);
      } else {
        return handleStandardRequest(message, contextPrompt, recentHistory);
      }
    } catch (err: any) {
      const errorMessage = err.message || 'An error occurred while communicating with the EVE';
      setError(errorMessage);
      
      if (import.meta.env.DEV) {
        console.error('EVE Intelligence Error:', err);
        return handleOfflineMode(message);
      }
      
      return errorMessage;
    } finally {
      setIsLoading(false);
      setIsThinking(false);
    }
  };

  // Handle offline/development mode
  const handleOfflineMode = async (message: string): Promise<string> => {
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 1000));
    const mockResponse = generateMockResponse(message, { name: `EVE ${eveId}` });
    
    const assistantMessage: Message = {
      role: 'assistant',
      content: mockResponse
    };
    
    setConversationHistory(prev => [...prev, assistantMessage]);
    setResponse(mockResponse);
    setIsLoading(false);
    setIsStreaming(false);
    
    return mockResponse;
  };

  // Handle standard (non-streaming) request
  const handleStandardRequest = async (
    message: string, 
    context: string, 
    history: Message[]
  ): Promise<string> => {
    try {
      const response = await fetch('/api/eve-intelligence', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eveId,
          prompt: message,
          context,
          history,
          reasoningDepth
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to communicate with EVE');
      }

      const data = await response.json();
      
      if (data.newMessage) {
        setConversationHistory(prev => [...prev, data.newMessage]);
      }
      
      setResponse(data.response);
      return data.response;
    } catch (error) {
      console.error("Failed in standard request:", error);
      throw error;
    }
  };

  // Handle realtime streaming request
  const handleRealtimeRequest = async (
    message: string, 
    context: string, 
    history: Message[]
  ): Promise<string> => {
    try {
      const response = await fetch('/api/openai-stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId: 'default',
          requestData: {
            endpoint: 'chat.completions',
            stream: true,
            params: {
              model: 'gpt-4',
              messages: [
                {
                  role: 'system',
                  content: `You are an advanced AI assistant with access to the following context:\n${context}`
                },
                ...history,
                { role: 'user', content: message }
              ],
              temperature: 0.7,
              max_tokens: 500,
            }
          }
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start streaming response');
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Stream reader not available');
      }

      let fullResponse = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = new TextDecoder().decode(value);
        const lines = chunk.split('\n\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.substring(6);
            
            if (jsonStr.trim() === '[DONE]') continue;
            
            try {
              const parsed = JSON.parse(jsonStr);
              if (parsed.choices && parsed.choices[0]?.delta?.content) {
                const content = parsed.choices[0].delta.content;
                fullResponse += content;
                setPartialResponse(fullResponse);
              }
            } catch (e) {
              console.warn('Error parsing streaming response chunk:', e);
            }
          }
        }
      }
      
      // Add the complete response to conversation history
      const assistantMessage: Message = { 
        role: 'assistant', 
        content: fullResponse 
      };
      setConversationHistory(prev => [...prev, assistantMessage]);
      setResponse(fullResponse);
      setIsStreaming(false);
      
      // Extract and store insights
      const insights = await learning.extractInsights(message + '\n' + fullResponse);
      for (const insight of insights) {
        if (await learning.validateInsight(insight)) {
          await learning.storeInsight(insight);
        }
      }
      
      return fullResponse;
    } catch (error) {
      console.warn('Streaming failed, falling back to standard request:', error);
      setIsStreaming(false);
      return handleStandardRequest(message, context, history);
    }
  };

  const clearConversation = () => {
    setConversationHistory([]);
    setResponse(null);
    setError(null);
    setPartialResponse('');
    setIsStreaming(false);
    setThoughtProcess(null);
    setConfidenceScore(0);
    setRelevantContext([]);
  };

  return {
    sendMessage,
    response,
    conversationHistory,
    isLoading,
    error,
    clearConversation,
    partialResponse,
    isStreaming,
    isThinking,
    thoughtProcess,
    confidenceScore,
    relevantContext
  };
}