import { useState, useEffect, useRef } from 'react';
import { Send, Sparkles, Loader2, RefreshCw, Brain } from 'lucide-react';
import { useEVEChat } from '../../hooks/useEVEChat';
import { EVE } from '../../types/database.types';

interface EVEChatProps {
  eve: EVE;
}

export function EVEChat({ eve }: EVEChatProps) {
  const [userMessage, setUserMessage] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { 
    sendMessage, 
    conversationHistory, 
    isLoading, 
    error,
    clearConversation,
    partialResponse,
    isStreaming,
    isLearning
  } = useEVEChat({ 
    eveId: eve.id,
    companyId: eve.company_id,
    useRealtime: true
  });

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [conversationHistory, partialResponse]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userMessage.trim() || isLoading) return;

    try {
      await sendMessage(userMessage);
      setUserMessage('');
    } catch (err) {
      console.error('Error sending message:', err);
    }
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 rounded-lg overflow-hidden border border-gray-200 shadow-sm">
      <div className="flex items-center justify-between bg-black text-white px-4 py-3">
        <div className="flex items-center">
          <div className="h-8 w-8 rounded-full bg-neon-green text-black flex items-center justify-center mr-2">
            <Sparkles size={16} />
          </div>
          <div>
            <h2 className="font-medium">{eve.name}</h2>
            <div className="text-xs text-gray-300">
              {eve.status === 'active' ? (
                <span className="flex items-center">
                  <span className="h-2 w-2 rounded-full bg-neon-green mr-1"></span>
                  Active
                </span>
              ) : (
                <span>{eve.status.charAt(0).toUpperCase() + eve.status.slice(1)}</span>
              )}
            </div>
          </div>
        </div>
        <button 
          onClick={clearConversation}
          className="p-1 rounded-full hover:bg-gray-700 text-gray-300 hover:text-white"
          title="Clear conversation"
        >
          <RefreshCw size={16} />
        </button>
      </div>
      
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {conversationHistory.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500 text-center">
            <div>
              <Sparkles size={24} className="mx-auto mb-2 text-neon-green" />
              <p>Start a conversation with {eve.name}</p>
              <p className="text-sm mt-1">I remember our past conversations and learn from them!</p>
            </div>
          </div>
        ) : (
          conversationHistory.map((message, index) => (
            message.role !== 'system' && (
              <div 
                key={index} 
                className={`${
                  message.role === 'user' 
                    ? 'bg-gray-100 ml-8 rounded-tl-lg rounded-tr-lg rounded-bl-lg' 
                    : 'bg-black text-white mr-8 rounded-tl-lg rounded-tr-lg rounded-br-lg'
                } p-3 shadow-sm`}
              >
                <p className="text-sm">
                  {message.content.split('\n').map((line, i) => (
                    <span key={i}>
                      {line}
                      {i < message.content.split('\n').length - 1 && <br />}
                    </span>
                  ))}
                </p>
              </div>
            )
          ))
        )}
        
        {/* Show realtime streaming response */}
        {isStreaming && partialResponse && (
          <div className="bg-black text-white mr-8 rounded-tl-lg rounded-tr-lg rounded-br-lg p-3 shadow-sm">
            <p className="text-sm">
              {partialResponse.split('\n').map((line, i) => (
                <span key={i}>
                  {line}
                  {i < partialResponse.split('\n').length - 1 && <br />}
                </span>
              ))}
              <span className="inline-block h-4 w-1 ml-1 bg-neon-green animate-pulse"></span>
            </p>
          </div>
        )}
        
        {isLoading && !isStreaming && (
          <div className="bg-gray-100 mr-8 p-3 rounded-tl-lg rounded-tr-lg rounded-br-lg shadow-sm">
            <div className="flex items-center">
              <Loader2 size={16} className="animate-spin text-neon-green mr-2" />
              <p className="text-sm text-gray-500">Thinking...</p>
            </div>
          </div>
        )}
        
        {isLearning && (
          <div className="bg-purple-50 mr-8 p-3 rounded-lg shadow-sm">
            <div className="flex items-center">
              <Brain size={16} className="text-purple-500 mr-2" />
              <p className="text-sm text-purple-700">Learning from our conversation...</p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg shadow-sm">
            <p className="text-sm">{error}</p>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
      
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-200 bg-white">
        <div className="flex items-center">
          <input
            type="text"
            value={userMessage}
            onChange={(e) => setUserMessage(e.target.value)}
            placeholder={`Message ${eve.name}...`}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-neon-green"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!userMessage.trim() || isLoading}
            className={`ml-2 p-2.5 rounded-lg ${
              !userMessage.trim() || isLoading
                ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                : 'bg-black text-neon-green hover:bg-gray-800'
            }`}
          >
            <Send size={18} />
          </button>
        </div>
      </form>
    </div>
  );
}