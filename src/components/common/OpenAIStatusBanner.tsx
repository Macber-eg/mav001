import { useState } from 'react';
import { Zap, RefreshCw } from 'lucide-react';
import { useOpenAIStatus } from '../../hooks/useOpenAIStatus';

export const OpenAIStatusBanner = () => {
  const { isConnected, isChecking, error, checkConnection } = useOpenAIStatus();
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show anything if connected or if manually dismissed
  if ((isConnected === true || isDismissed) && !error) {
    return null;
  }

  return (
    <div className="bg-blue-50 border-b border-blue-200 px-4 py-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center text-blue-800">
          <Zap size={16} className="mr-2" />
          <span className="text-sm font-medium">
            {isConnected === null ? (
              'Checking OpenAI connection...'
            ) : isConnected === false ? (
              error ? `OpenAI connection error: ${error}` : 'Running in offline mode. Using simulated AI responses.'
            ) : (
              'Connected to OpenAI API'
            )}
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={checkConnection}
            disabled={isChecking}
            className="text-xs px-2 py-1 rounded bg-blue-100 hover:bg-blue-200 text-blue-800 flex items-center"
          >
            <RefreshCw size={12} className={`mr-1 ${isChecking ? 'animate-spin' : ''}`} />
            {isChecking ? 'Checking...' : 'Retry'}
          </button>
          {isConnected === false && (
            <button
              onClick={() => setIsDismissed(true)}
              className="text-xs px-2 py-1 rounded text-blue-800"
            >
              Dismiss
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default OpenAIStatusBanner;