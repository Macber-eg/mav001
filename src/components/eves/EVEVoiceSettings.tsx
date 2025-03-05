import { useState, useEffect } from 'react';
import { Phone, Mic, VolumeX, Play, MessageSquare, Settings, AlertCircle, Loader2, Download, Pause } from 'lucide-react';
import { useVoiceStore } from '../../stores/voiceStore';
import { useOpenAIVoice } from '../../hooks/useOpenAIVoice';
import { EVE, VoiceSettings, VoiceCall } from '../../types/database.types';

interface EVEVoiceSettingsProps {
  eve: EVE;
}

function EVEVoiceSettings({ eve }: EVEVoiceSettingsProps) {
  const [isEnabled, setIsEnabled] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [greetingMessage, setGreetingMessage] = useState('');
  const [fallbackMessage, setFallbackMessage] = useState('');
  const [selectedVoice, setSelectedVoice] = useState('Polly.Amy');
  const [useOpenAIVoice, setUseOpenAIVoice] = useState(false);
  const [openAIVoiceModel, setOpenAIVoiceModel] = useState('alloy');
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const { 
    voiceSettings, 
    voiceCalls,
    fetchVoiceSettings, 
    fetchVoiceCalls,
    updateVoiceSettings, 
    enableVoice, 
    disableVoice,
    isLoading: storeLoading,
    error: storeError
  } = useVoiceStore();
  
  // Load voice settings when component mounts
  useEffect(() => {
    const loadVoiceSettings = async () => {
      try {
        const settings = await fetchVoiceSettings(eve.id);
        if (settings) {
          setIsEnabled(settings.enabled);
          setPhoneNumber(settings.phone_number || '');
          setGreetingMessage(settings.greeting_message || '');
          setFallbackMessage(settings.fallback_message || '');
          setSelectedVoice(settings.voice_id || 'Polly.Amy');
          setUseOpenAIVoice(settings.use_openai_voice || false);
          setOpenAIVoiceModel(settings.openai_voice_model || 'alloy');
        } else {
          // Default values for new settings
          setIsEnabled(false);
          setPhoneNumber('');
          setGreetingMessage(`Hello, this is ${eve.name}, an Enterprise Virtual Employee from Mavrika. How can I help you today?`);
          setFallbackMessage("I'm sorry, I'm having trouble understanding. Please try again.");
          setSelectedVoice('Polly.Amy');
          setUseOpenAIVoice(false);
          setOpenAIVoiceModel('alloy');
        }
        
        // Also load voice calls history
        await fetchVoiceCalls(eve.id);
      } catch (err: any) {
        setError(err.message || 'Failed to load voice settings');
      }
    };
    
    loadVoiceSettings();
  }, [eve.id, fetchVoiceSettings, fetchVoiceCalls, eve.name]);
  
  // Handle enabling/disabling voice capabilities
  const handleToggleVoice = async () => {
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      if (isEnabled) {
        // Disable voice capabilities
        await disableVoice(eve.id);
        setIsEnabled(false);
        setSuccessMessage('Voice capabilities disabled successfully');
      } else {
        // Enable voice capabilities
        if (!phoneNumber) {
          setError('Please enter a phone number');
          setIsLoading(false);
          return;
        }
        
        await enableVoice(eve.id, phoneNumber);
        setIsEnabled(true);
        setSuccessMessage('Voice capabilities enabled successfully');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update voice settings');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle saving voice settings
  const handleSaveSettings = async () => {
    if (!voiceSettings) return;
    
    setIsLoading(true);
    setError(null);
    setSuccessMessage(null);
    
    try {
      await updateVoiceSettings({
        id: voiceSettings.id,
        eve_id: eve.id,
        phone_number: phoneNumber,
        greeting_message: greetingMessage,
        fallback_message: fallbackMessage,
        voice_id: selectedVoice,
        use_openai_voice: useOpenAIVoice,
        openai_voice_model: openAIVoiceModel,
        enabled: isEnabled
      });
      
      setIsEditing(false);
      setSuccessMessage('Voice settings updated successfully');
    } catch (err: any) {
      setError(err.message || 'Failed to update voice settings');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Available voices
  const availableVoices = [
    { id: 'Polly.Amy', name: 'Amy (Female)' },
    { id: 'Polly.Brian', name: 'Brian (Male)' },
    { id: 'Polly.Joanna', name: 'Joanna (Female)' },
    { id: 'Polly.Matthew', name: 'Matthew (Male)' }
  ];
  
  // OpenAI voices
  const openAIVoices = [
    { id: 'alloy', name: 'Alloy (Neutral)' },
    { id: 'echo', name: 'Echo (Male)' },
    { id: 'fable', name: 'Fable (Male)' },
    { id: 'onyx', name: 'Onyx (Male)' },
    { id: 'nova', name: 'Nova (Female)' },
    { id: 'shimmer', name: 'Shimmer (Female)' }
  ];
  
  return (
    <div className="space-y-6">
      {/* Voice capability toggle */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Voice Capabilities {isEnabled && <span className="text-sm text-green-600 ml-2">(Enabled)</span>}
          </h3>
          
          <div className="flex items-center space-x-4">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveSettings}
                  disabled={isLoading}
                  className="px-3 py-1.5 bg-black text-neon-green border border-neon-green rounded-md hover:bg-black/90"
                >
                  {isLoading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Settings size={16} className="inline mr-1" />
                      Save Settings
                    </>
                  )}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                <Settings size={16} className="inline mr-1" />
                Edit Settings
              </button>
            )}
          </div>
        </div>
        
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md mb-4 flex items-center">
            <AlertCircle size={16} className="mr-2" />
            {error}
          </div>
        )}
        
        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-md mb-4 flex items-center">
            <CheckCircle size={16} className="mr-2" />
            {successMessage}
          </div>
        )}
        
        {storeError && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-md mb-4 flex items-center">
            <AlertCircle size={16} className="mr-2" />
            {storeError}
          </div>
        )}
        
        <div className="flex items-center mb-4">
          <div className="flex-1">
            <p className="text-sm text-gray-600">
              Enable voice capabilities to allow {eve.name} to interact via phone calls.
            </p>
          </div>
          <div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={isEnabled}
                onChange={handleToggleVoice}
                disabled={isLoading || storeLoading}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-neon-green/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-neon-green"></div>
            </label>
          </div>
        </div>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <Phone size={16} className="inline mr-1" /> Phone Number
            </label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              disabled={!isEditing}
              placeholder="+1 (555) 123-4567"
              className={`w-full px-3 py-2 border border-gray-300 rounded-md ${!isEditing && 'bg-gray-50'}`}
            />
            <p className="mt-1 text-xs text-gray-500">Format: +1 (555) 123-4567</p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              <MessageSquare size={16} className="inline mr-1" /> Greeting Message
            </label>
            <textarea
              value={greetingMessage}
              onChange={(e) => setGreetingMessage(e.target.value)}
              disabled={!isEditing}
              rows={2}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md ${!isEditing && 'bg-gray-50'}`}
            ></textarea>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fallback Message
            </label>
            <textarea
              value={fallbackMessage}
              onChange={(e) => setFallbackMessage(e.target.value)}
              disabled={!isEditing}
              rows={2}
              className={`w-full px-3 py-2 border border-gray-300 rounded-md ${!isEditing && 'bg-gray-50'}`}
            ></textarea>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center mb-2">
                <input
                  type="radio"
                  checked={!useOpenAIVoice}
                  onChange={() => setUseOpenAIVoice(false)}
                  disabled={!isEditing}
                  className="mr-2 h-4 w-4 text-neon-green border-gray-300 focus:ring-neon-green"
                />
                <span className="text-sm font-medium text-gray-700">Use Amazon Polly Voice</span>
              </label>
              <select
                value={selectedVoice}
                onChange={(e) => setSelectedVoice(e.target.value)}
                disabled={!isEditing || useOpenAIVoice}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md ${(!isEditing || useOpenAIVoice) && 'bg-gray-50'}`}
              >
                {availableVoices.map(voice => (
                  <option key={voice.id} value={voice.id}>{voice.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="flex items-center mb-2">
                <input
                  type="radio"
                  checked={useOpenAIVoice}
                  onChange={() => setUseOpenAIVoice(true)}
                  disabled={!isEditing}
                  className="mr-2 h-4 w-4 text-neon-green border-gray-300 focus:ring-neon-green"
                />
                <span className="text-sm font-medium text-gray-700">Use OpenAI TTS Voice</span>
              </label>
              <select
                value={openAIVoiceModel}
                onChange={(e) => setOpenAIVoiceModel(e.target.value)}
                disabled={!isEditing || !useOpenAIVoice}
                className={`w-full px-3 py-2 border border-gray-300 rounded-md ${(!isEditing || !useOpenAIVoice) && 'bg-gray-50'}`}
              >
                {openAIVoices.map(voice => (
                  <option key={voice.id} value={voice.id}>{voice.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
      
      {/* Call history */}
      <div className="bg-white p-6 rounded-lg border border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Call History</h3>
        
        {storeLoading ? (
          <div className="py-8 text-center">
            <Loader2 size={24} className="animate-spin mx-auto mb-2 text-neon-green" />
            <p className="text-gray-500">Loading call history...</p>
          </div>
        ) : voiceCalls && voiceCalls.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date & Time
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Caller
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Duration
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {voiceCalls.map(call => (
                  <tr key={call.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(call.started_at).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {call.caller_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {call.duration ? `${call.duration} seconds` : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        call.status === 'completed' 
                          ? 'bg-green-100 text-green-800' 
                          : call.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {call.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button 
                        className="text-neon-green hover:text-neon-green/80"
                        onClick={() => {
                          if (call.transcript) {
                            alert(`Transcript: ${call.transcript}`);
                          } else {
                            alert('No transcript available for this call');
                          }
                        }}
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-8 text-center">
            <Phone size={24} className="mx-auto mb-2 text-gray-400" />
            <p className="text-gray-500">No call history available</p>
            <p className="text-sm text-gray-400 mt-1">
              {isEnabled 
                ? 'Call history will appear here when calls are received'
                : 'Enable voice capabilities to receive calls'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Add this missing component for displaying success messages
const CheckCircle = ({ size = 24, className = "" }) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
      <polyline points="22 4 12 14.01 9 11.01"></polyline>
    </svg>
  );
};

export default EVEVoiceSettings;

export { EVEVoiceSettings }