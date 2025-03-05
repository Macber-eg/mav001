import { useState, useEffect, useRef } from 'react';

type UseVoiceRecognitionProps = {
  enabled?: boolean;
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult?: (text: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
};

type UseVoiceRecognitionReturn = {
  isListening: boolean;
  text: string;
  interimText: string;
  startListening: () => void;
  stopListening: () => void;
  resetText: () => void;
  error: string | null;
  isSupported: boolean;
};

/**
 * Hook for voice recognition using the Web Speech API
 */
export function useVoiceRecognition({
  enabled = false,
  lang = 'en-US',
  continuous = false,
  interimResults = true,
  onResult,
  onError
}: UseVoiceRecognitionProps = {}): UseVoiceRecognitionReturn {
  const [isListening, setIsListening] = useState(false);
  const [text, setText] = useState('');
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  
  // Use refs to handle speech recognition
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  
  // Initialize speech recognition on mount
  useEffect(() => {
    // Check if speech recognition is supported
    if (window.SpeechRecognition || window.webkitSpeechRecognition) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      setIsSupported(true);
    } else {
      setError('Speech recognition is not supported in your browser.');
      setIsSupported(false);
      return;
    }
    
    if (recognitionRef.current) {
      recognitionRef.current.lang = lang;
      recognitionRef.current.continuous = continuous;
      recognitionRef.current.interimResults = interimResults;
      
      // Set up event handlers
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';
        
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }
        
        if (finalTranscript) {
          setText(prev => prev + ' ' + finalTranscript);
          if (onResult) onResult(finalTranscript, true);
        }
        
        if (interimTranscript) {
          setInterimText(interimTranscript);
          if (onResult) onResult(interimTranscript, false);
        }
      };
      
      recognitionRef.current.onerror = (event) => {
        const errorMessage = `Speech recognition error: ${event.error}`;
        setError(errorMessage);
        if (onError) onError(errorMessage);
      };
      
      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
    
    // Start listening if enabled prop is true
    if (enabled) {
      startListening();
    }
    
    // Clean up on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.onresult = null;
        recognitionRef.current.onerror = null;
        recognitionRef.current.onend = null;
        
        if (isListening) {
          recognitionRef.current.stop();
        }
      }
    };
  }, [lang, continuous, interimResults, enabled, onResult, onError]);
  
  // Start listening function
  const startListening = () => {
    if (!isSupported || !recognitionRef.current) {
      const unsupportedError = 'Speech recognition is not supported in your browser.';
      setError(unsupportedError);
      if (onError) onError(unsupportedError);
      return;
    }
    
    setError(null);
    
    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setError('Failed to start speech recognition.');
      if (onError) onError('Failed to start speech recognition.');
    }
  };
  
  // Stop listening function
  const stopListening = () => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };
  
  // Reset text
  const resetText = () => {
    setText('');
    setInterimText('');
  };
  
  return {
    isListening,
    text,
    interimText,
    startListening,
    stopListening,
    resetText,
    error,
    isSupported
  };
}

// Add a type declaration for SpeechRecognition for TypeScript
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

export default useVoiceRecognition;