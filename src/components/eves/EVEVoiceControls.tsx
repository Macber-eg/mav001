import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Volume2, AlertCircle, CheckCircle, Play, VolumeX } from 'lucide-react';
import useVoiceRecognition from '../../hooks/useVoiceRecognition';
import { useOpenAIVoice } from '../../hooks/useOpenAIVoice';
import { EVE } from '../../types/database.types';
import { useEVEIntelligence } from '../../hooks/useEVEIntelligence';

interface EVEVoiceControlsProps {
  eve: EVE;
}

function EVEVoiceControls({ eve }: EVEVoiceControlsProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isUsingOpenAI, setIsUsingOpenAI] = useState(true);
  const [isListeningWithMic, setIsListeningWithMic] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [lastRecognizedText, setLastRecognizedText] = useState('');
  const [aiResponse, setAiResponse] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [recordingState, setRecordingState] = useState<'inactive' | 'recording' | 'paused'>('inactive');

  // Media recorder reference
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // Browser's Web Speech API recognition
  const { 
    isListening, 
    text, 
    interimText, 
    startListening, 
    stopListening, 
    resetText, 
    isSupported: isBrowserSpeechSupported
  } = useVoiceRecognition({
    onResult: (result, isFinal) => {
      if (isFinal && result.trim().length > 0) {
        setLastRecognizedText(result.trim());
      }
    }
  });

  // OpenAI voice capabilities
  const {
    transcribeAudio,
    generateSpeech,
    streamSpeech,
    isProcessingAudio,
    isGeneratingSpeech,
    error: voiceError,
    stopSpeech
  } = useOpenAIVoice({ eveId: eve.id });

  // EVE Intelligence for processing text
  const {
    sendMessage,
    isLoading: aiLoading,
    error: aiError,
    partialResponse,
    isStreaming
  } = useEVEIntelligence({ 
    eveId: eve.id,
    useRealtime: true
  });

  // Start recording with OpenAI Whisper
  const startRecordingWithOpenAI = async () => {
    try {
      // Reset previous recording state
      audioChunksRef.current = [];
      setAudioBlob(null);
      setLastRecognizedText('');
      
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Create media recorder
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = async () => {
        // Create audio blob from chunks
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        
        // Close the media stream
        stream.getTracks().forEach(track => track.stop());

        // Process with OpenAI Whisper
        try {
          setIsListeningWithMic(false);
          const result = await transcribeAudio(blob);
          setLastRecognizedText(result.text);
          
          // Process with EVE AI
          if (result.text) {
            await processRecognizedText(result.text);
          }
        } catch (error) {
          console.error('Error transcribing audio:', error);
        }
      };
      
      // Start recording
      mediaRecorder.start();
      setRecordingState('recording');
      setIsListeningWithMic(true);
      
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check your browser permissions.');
    }
  };
  
  // Stop recording
  const stopRecordingWithOpenAI = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop();
      setRecordingState('inactive');
    }
  };
  
  // Process text with EVE AI
  const processRecognizedText = async (text: string) => {
    if (!text) return;
    
    try {
      const response = await sendMessage(text);
      setAiResponse(response);
      
      // Use OpenAI's TTS API for voice synthesis
      if (isUsingOpenAI) {
        setIsSpeaking(true);
        await streamSpeech(response);
        setIsSpeaking(false);
      } else {
        // Use browser's speech synthesis
        const speechSynthesis = window.speechSynthesis;
        const utterance = new SpeechSynthesisUtterance(response);
        
        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        
        speechSynthesis.speak(utterance);
      }
      
      // Show success message
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      
    } catch (error) {
      console.error('Error processing voice input:', error);
    }
  };
  
  // Handle toggle between OpenAI and browser speech
  const toggleVoiceTechnology = () => {
    setIsUsingOpenAI(!isUsingOpenAI);
    
    // Stop any ongoing speech or recordings
    if (isListening) stopListening();
    if (recordingState === 'recording') stopRecordingWithOpenAI();
    if (isSpeaking) stopSpeech();
    
    resetText();
    setLastRecognizedText('');
  };
  
  // Handle click on microphone button
  const handleMicrophoneClick = () => {
    if (isUsingOpenAI) {
      if (recordingState === 'recording') {
        stopRecordingWithOpenAI();
      } else {
        startRecordingWithOpenAI();
      }
    } else {
      if (isListening) {
        stopListening();
      } else {
        resetText();
        startListening();
      }
    }
  };
  
  // Process Web Speech API result when available
  useEffect(() => {
    if (lastRecognizedText && !isListening && !isUsingOpenAI) {
      processRecognizedText(lastRecognizedText);
    }
  }, [lastRecognizedText, isListening, isUsingOpenAI]);
  
  // Expand control panel when listening
  useEffect(() => {
    if (isListening || isListeningWithMic) {
      setIsExpanded(true);
    }
  }, [isListening, isListeningWithMic]);

  // Errors from multiple sources
  const error = aiError || voiceError;
  const isLoading = aiLoading || isProcessingAudio || isGeneratingSpeech;

  return (
    <div className={`fixed bottom-4 right-4 z-50 ${isExpanded ? 'w-80' : 'w-auto'}`}>
      {/* Main voice control panel */}
      <div className="bg-black text-white rounded-lg shadow-lg overflow-hidden">
        {isExpanded && (
          <div className="p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium text-neon-green">Voice Controls</h3>
              <button 
                onClick={() => setIsExpanded(false)}
                className="text-gray-400 hover:text-white"
              >
                &times;
              </button>
            </div>
            
            <div className="flex justify-between items-center mb-3">
              <label className="text-xs text-gray-400">Voice technology:</label>
              <div className="bg-gray-800 rounded-full p-1 flex">
                <button
                  onClick={() => setIsUsingOpenAI(true)}
                  className={`text-xs px-2 py-1 rounded-full ${
                    isUsingOpenAI 
                      ? 'bg-neon-green text-black font-medium' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  OpenAI
                </button>
                <button
                  onClick={() => setIsUsingOpenAI(false)}
                  className={`text-xs px-2 py-1 rounded-full ${
                    !isUsingOpenAI 
                      ? 'bg-white text-black font-medium' 
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  Browser
                </button>
              </div>
            </div>
            
            {(!isUsingOpenAI && !isBrowserSpeechSupported) && (
              <div className="bg-red-900/20 border border-red-500 text-red-300 p-2 rounded-md text-xs mb-3">
                <AlertCircle size={14} className="inline mr-1" />
                Web Speech API is not supported in your browser.
              </div>
            )}
            
            {showSuccess && (
              <div className="bg-green-900/20 border border-green-500 text-green-300 p-2 rounded-md text-xs mb-3">
                <CheckCircle size={14} className="inline mr-1" />
                Voice processed successfully!
              </div>
            )}
            
            {error && (
              <div className="bg-red-900/20 border border-red-500 text-red-300 p-2 rounded-md text-xs mb-3">
                <AlertCircle size={14} className="inline mr-1" />
                {error}
              </div>
            )}
            
            <div className="mb-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-gray-400">You said:</h4>
                {(isListening || isListeningWithMic) && (
                  <span className="text-xs text-neon-green animate-pulse">
                    Listening...
                  </span>
                )}
              </div>
              <div className="bg-gray-900 rounded p-2 mt-1 min-h-[60px] text-sm">
                {isListening && interimText ? (
                  <span className="text-gray-400">{interimText}</span>
                ) : lastRecognizedText ? (
                  lastRecognizedText
                ) : (
                  <span className="text-gray-600 italic">
                    {(isListening || isListeningWithMic) ? "Speak now..." : "Click the microphone button to speak"}
                  </span>
                )}
              </div>
              <div className="mt-1 text-right">
                <span className="text-xs text-gray-500">
                  Using: {isUsingOpenAI ? 'OpenAI Whisper' : 'Web Speech API'}
                </span>
              </div>
            </div>
            
            {(aiResponse || partialResponse) && (
              <div className="mb-3">
                <h4 className="text-xs font-medium text-gray-400">{eve.name} says:</h4>
                <div className="bg-gray-900 rounded p-2 mt-1 min-h-[60px] text-sm">
                  {isStreaming && partialResponse ? (
                    <>
                      {partialResponse}
                      <span className="inline-block h-3 w-1 ml-1 bg-neon-green animate-pulse"></span>
                    </>
                  ) : aiResponse ? (
                    aiResponse
                  ) : null}
                  
                  {!isSpeaking && aiResponse && (
                    <button 
                      onClick={() => isUsingOpenAI ? generateSpeech(aiResponse) : speakResponse(aiResponse)}
                      className="mt-2 text-xs text-neon-green flex items-center"
                    >
                      <Play size={12} className="mr-1" />
                      Speak again
                    </button>
                  )}
                  
                  {isSpeaking && (
                    <button 
                      onClick={() => {
                        stopSpeech();
                        setIsSpeaking(false);
                      }}
                      className="mt-2 text-xs text-red-400 flex items-center"
                    >
                      <VolumeX size={12} className="mr-1" />
                      Stop speaking
                    </button>
                  )}
                </div>
                <div className="mt-1 text-right">
                  <span className="text-xs text-gray-500">
                    Voice: {isUsingOpenAI ? 'OpenAI TTS' : 'Browser Speech'}
                  </span>
                </div>
              </div>
            )}
            
            <div className="flex justify-center mt-2">
              <button
                onClick={handleMicrophoneClick}
                disabled={(!isUsingOpenAI && !isBrowserSpeechSupported) || isLoading}
                className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  (!isUsingOpenAI && !isBrowserSpeechSupported) || isLoading
                    ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                    : isListening || isListeningWithMic
                    ? 'bg-red-600 text-white hover:bg-red-700'
                    : 'bg-neon-green text-black hover:bg-neon-green/90'
                }`}
              >
                {isListening || isListeningWithMic ? <MicOff size={20} /> : <Mic size={20} />}
              </button>
            </div>
          </div>
        )}
        
        {/* Collapsed button */}
        {!isExpanded && (
          <button
            onClick={() => setIsExpanded(true)}
            className="p-3 bg-black text-neon-green hover:bg-gray-900 flex items-center rounded-lg border border-neon-green"
          >
            <Volume2 size={20} className="mr-2" />
            <span className="text-sm font-medium">Voice Controls</span>
          </button>
        )}
      </div>
    </div>
  );
}

// Helper function for browser speech synthesis
function speakResponse(text: string) {
  if (!text) return;
  
  const speechSynthesis = window.speechSynthesis;
  const utterance = new SpeechSynthesisUtterance(text);
  
  // Try to find a nice voice
  const voices = speechSynthesis.getVoices();
  const voice = voices.find(v => 
    v.name.toLowerCase().includes('female') || 
    v.name.toLowerCase().includes('girl')
  ) || voices[0];
  
  if (voice) {
    utterance.voice = voice;
  }
  
  utterance.rate = 1;
  utterance.pitch = 1;
  
  speechSynthesis.speak(utterance);
}

export default EVEVoiceControls;