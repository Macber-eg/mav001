import { useState, useEffect } from 'react';
import { verifyOpenAIConnection } from '../lib/openai-helper';

/**
 * Hook for checking and monitoring OpenAI connectivity status
 */
export function useOpenAIStatus() {
  const [isConnected, setIsConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check connection on mount and periodically
  useEffect(() => {
    checkConnection();
    
    // Set up periodic checks (every 5 minutes)
    const intervalId = setInterval(checkConnection, 5 * 60 * 1000);
    
    return () => {
      clearInterval(intervalId);
    };
  }, []);
  
  const checkConnection = async () => {
    setIsChecking(true);
    setError(null);
    
    try {
      const connected = await verifyOpenAIConnection();
      setIsConnected(connected);
      setLastChecked(new Date());
    } catch (err: any) {
      setError(err.message || 'Failed to check OpenAI connection');
      setIsConnected(false);
    } finally {
      setIsChecking(false);
    }
  };

  return {
    isConnected,
    isChecking,
    lastChecked,
    error,
    checkConnection
  };
}