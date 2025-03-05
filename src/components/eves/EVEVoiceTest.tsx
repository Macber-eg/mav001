import { useState, useRef, useEffect } from 'react';
import { Mic, MicOff, Play, Pause, AlertCircle, Loader2, Download } from 'lucide-react';
import { useEVEIntelligence } from '../../hooks/useEVEIntelligence';
import { useOpenAIVoice } from '../../hooks/useOpenAIVoice';
import { EVE } from '../../types/database.types';

interface EVEVoiceTestProps {
  eve: EVE;
}

export function EVEVoiceTest({ eve }: EVEVoiceTestProps) {
  // States for recording
  const [recordingState, setRecordingState] = useState<'inactive' | 'recording' | 'paused'>('inactive');
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [processingMessage, setProcessingMessage] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [responseText, setResponseText] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recognizedText, setRecognizedText] = useState<string | null>(null);

  // Audio player reference
  const audioRef = useRef<HTMLAudioElement>(null);
  
  // Media recorder reference
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  // EVE Intelligence hook for processing user input
  const { sendMessage, isLoading: aiLoading, error: aiError } = useEVEIntelligence({ 
    eveId: eve.id,
    useRealtime: true  // Use realtime streaming for responses
  });
  
  // OpenAI Voice hook for speech-to-text and text-to-speech
  const { 
    transcribeAudio, 
    generateSpeech,
    streamSpeech,
    isProcessingAudio, 
    isGeneratingSpeech,
    error: voiceError,
    stopSpeech
  } = useOpenAIVoice({ eveId: eve.id });

  // Start recording function
  const startRecording = async () => {
    try {
      // Reset previous recording state
      audioChunksRef.current = [];
      setRecordedAudio(null);
      setAudioUrl(null);
      setResponseText(null);
      setRecognizedText(null);
      
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
      
      mediaRecorder.onstop = () => {
        // Create audio blob from chunks
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setRecordedAudio(audioBlob);
        
        // Create URL for the blob
        const url = URL.createObjectURL(audioBlob);
        setAudioUrl(url);
        
        // Close the media stream
        stream.getTracks().forEach(track => track.stop());

        // Automatically start processing for voice recognition
        processAudio(audioBlob);
      };
      
      // Start recording
      mediaRecorder.start();
      setRecordingState('recording');
      
    } catch (error) {
      console.error('Error starting recording:', error);
      alert('Could not access microphone. Please check your browser permissions.');
    }
  };
  
  // Stop recording function
  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.stop();
      setRecordingState('inactive');
    }
  };
  
  // Pause recording function
  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'recording') {
      mediaRecorderRef.current.pause();
      setRecordingState('paused');
    }
  };
  
  // Resume recording function
  const resumeRecording = () => {
    if (mediaRecorderRef.current && recordingState === 'paused') {
      mediaRecorderRef.current.resume();
      setRecordingState('recording');
    }
  };

  // Process the recorded audio using OpenAI's Whisper API
  const processAudio = async (audioBlob: Blob) => {
    setIsProcessing(true);
    setProcessingMessage('Transcribing your audio with OpenAI Whisper...');
    
    try {
      // Use OpenAI's Whisper API for transcription via our hook
      const result = await transcribeAudio(audioBlob);
      setRecognizedText(result.text);
      setProcessingMessage('Processing your request with OpenAI...');
      
      // After text recognition, send to EVE AI
      await processRecognizedText(result.text);
    } catch (error) {
      console.error('Error processing audio:', error);
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  // Process recognized text with EVE AI
  const processRecognizedText = async (text: string) => {
    if (!text) return;
    
    try {
      // Send the recognized text to EVE's intelligence
      const response = await sendMessage(text);
      setResponseText(response);
      
      // Use OpenAI's TTS API to speak the response
      setIsSpeaking(true);
      await streamSpeech(response);
      setIsSpeaking(false);
      
      setIsProcessing(false);
      setProcessingMessage('');
    } catch (error) {
      console.error('Error sending message to EVE:', error);
      setIsProcessing(false);
      setProcessingMessage('');
    }
  };

  // Play the response again
  const playResponseAgain = async () => {
    if (!responseText) return;
    
    try {
      setIsSpeaking(true);
      await generateSpeech(responseText);
      setIsSpeaking(false);
    } catch (error) {
      console.error('Error playing response:', error);
      setIsSpeaking(false);
    }
  };

  // Stop speech playback
  const handleStopSpeech = () => {
    stopSpeech();
    setIsSpeaking(false);
  };

  // Make sure voices are loaded (sometimes needed for Chrome)
  useEffect(() => {
    if (typeof speechSynthesis !== 'undefined') {
      speechSynthesis.onvoiceschanged = () => {
        speechSynthesis.getVoices();
      };
    }
    
    // Clean up function
    return () => {
      stopSpeech();
    };
  }, []);

  // Combined error from both hooks
  const error = aiError || voiceError;
  const isLoading = aiLoading || isProcessingAudio || isGeneratingSpeech;

  return (
    <div className="bg-gray-50 p-4 rounded-md">
      <p className="text-sm text-gray-700 mb-4">
        Test talking to {eve.name} using OpenAI's voice technology:
      </p>
      
      <div className="flex flex-col items-center space-y-6">
        {/* Recording controls */}
        <div className="flex justify-center items-center space-x-3">
          {recordingState === 'inactive' ? (
            <button
              onClick={startRecording}
              className="flex items-center px-4 py-2 bg-black text-neon-green border border-neon-green rounded-full hover:bg-black/90"
            >
              <Mic size={18} className="mr-2" />
              Start Recording
            </button>
          ) : (
            <div className="flex space-x-2">
              {recordingState === 'recording' ? (
                <button
                  onClick={pauseRecording}
                  className="flex items-center px-3 py-2 bg-yellow-500 text-white rounded-full hover:bg-yellow-600"
                >
                  <Pause size={18} className="mr-1" />
                  Pause
                </button>
              ) : (
                <button
                  onClick={resumeRecording}
                  className="flex items-center px-3 py-2 bg-blue-500 text-white rounded-full hover:bg-blue-600"
                >
                  <Mic size={18} className="mr-1" />
                  Resume
                </button>
              )}
              
              <button
                onClick={stopRecording}
                className="flex items-center px-3 py-2 bg-red-500 text-white rounded-full hover:bg-red-600"
              >
                <MicOff size={18} className="mr-1" />
                Stop
              </button>
            </div>
          )}
        </div>
        
        {/* Recording indicator */}
        {recordingState === 'recording' && (
          <div className="w-full max-w-md">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div className="h-full bg-neon-green animate-pulse rounded-full"></div>
            </div>
            <p className="text-center text-sm text-gray-500 mt-1">Recording with OpenAI Whisper... Speak now</p>
          </div>
        )}
        
        {/* Audio playback */}
        {audioUrl && (
          <div className="w-full max-w-md bg-white p-3 rounded-md shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <h4 className="text-sm font-medium">Your recorded message</h4>
              <a 
                href={audioUrl} 
                download="recording.webm"
                className="text-neon-green hover:underline text-sm flex items-center"
              >
                <Download size={14} className="mr-1" />
                Download
              </a>
            </div>
            <audio ref={audioRef} controls className="w-full" src={audioUrl}></audio>
          </div>
        )}
        
        {/* Processing status */}
        {(isProcessing || isLoading) && (
          <div className="flex items-center justify-center space-x-2 text-gray-600">
            <Loader2 size={20} className="animate-spin text-neon-green" />
            <span>{processingMessage || 'Processing...'}</span>
          </div>
        )}
        
        {/* Error message */}
        {error && (
          <div className="w-full max-w-md bg-red-50 border border-red-200 p-3 rounded-md text-red-700 flex items-start">
            <AlertCircle size={18} className="mr-2 mt-0.5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}
        
        {/* Recognized text and response */}
        {recognizedText && (
          <div className="w-full max-w-md">
            <div className="bg-gray-100 p-3 rounded-t-md border-b border-gray-200">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-medium text-gray-700 mb-1">OpenAI Whisper recognized:</h4>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                  Whisper API
                </span>
              </div>
              <p className="text-gray-600">{recognizedText}</p>
            </div>
            
            {responseText && (
              <div className="bg-black text-neon-green p-3 rounded-b-md">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium">
                    {eve.name}'s response:
                    {isSpeaking && <span className="ml-2 text-xs opacity-75">(Speaking...)</span>}
                  </h4>
                  
                  <div className="flex space-x-2">
                    {isSpeaking ? (
                      <button 
                        onClick={handleStopSpeech}
                        className="text-xs px-2 py-0.5 bg-red-500/20 text-red-300 rounded hover:bg-red-500/30"
                      >
                        Stop
                      </button>
                    ) : (
                      <button 
                        onClick={playResponseAgain}
                        className="text-xs px-2 py-0.5 bg-neon-green/20 text-neon-green rounded hover:bg-neon-green/30"
                      >
                        <Play size={10} className="inline mr-1" />
                        Play with OpenAI TTS
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm">{responseText}</p>
                <div className="mt-2 text-xs opacity-75">
                  <span className="bg-gray-800 px-1.5 py-0.5 rounded text-neon-green/80">
                    OpenAI TTS API
                  </span>
                </div>
              </div>
            )}
          </div>
        )}
        
        <div className="text-xs text-gray-500 italic max-w-md text-center">
          Using OpenAI's Whisper API for speech recognition and TTS API for voice synthesis.
          Streaming responses provide a more natural conversation experience.
        </div>
      </div>
    </div>
  );
}

export default EVEVoiceTest;