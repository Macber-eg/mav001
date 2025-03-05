import { useState, useEffect } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';
import { verifySupabaseConnection } from '../../lib/supabase';

export const ConnectionStatusBanner = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [supabaseConnected, setSupabaseConnected] = useState<boolean | null>(null);
  const [isChecking, setIsChecking] = useState(false);

  useEffect(() => {
    // Check browser online status
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check Supabase connection
    checkConnection();

    // Set up periodic connection checks
    const intervalId = setInterval(checkConnection, 60000); // Check every minute

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(intervalId);
    };
  }, []);

  const checkConnection = async () => {
    if (!isOnline) return; // Skip check if browser is offline
    
    setIsChecking(true);
    try {
      const connected = await verifySupabaseConnection();
      setSupabaseConnected(connected);
    } catch (error) {
      console.error('Failed to check Supabase connection:', error);
      setSupabaseConnected(false);
    } finally {
      setIsChecking(false);
    }
  };

  // Don't show anything if everything is fine
  if (isOnline && supabaseConnected) {
    return null;
  }

  return (
    <div className="bg-yellow-50 border-b border-yellow-200 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center text-yellow-800">
          <WifiOff size={16} className="mr-2" />
          <span className="text-sm font-medium">
            {!isOnline ? (
              'You are offline. Some features may not work correctly.'
            ) : !supabaseConnected ? (
              import.meta.env.DEV ? (
                'Running in development mode with mock data. Database connection is not available.'
              ) : (
                'Database connection issues. Using offline mode. Some data may not be available.'
              )
            ) : (
              'Checking connection status...'
            )}
          </span>
        </div>
        <button
          onClick={checkConnection}
          disabled={isChecking}
          className="text-xs px-2 py-1 rounded bg-yellow-100 hover:bg-yellow-200 text-yellow-800 flex items-center"
        >
          <RefreshCw size={12} className={`mr-1 ${isChecking ? 'animate-spin' : ''}`} />
          {isChecking ? 'Checking...' : 'Retry'}
        </button>
      </div>
    </div>
  );
};

export default ConnectionStatusBanner;