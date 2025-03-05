import { useState, useEffect, useRef } from 'react';

type UseOpenAIVoiceProps = {
  eveId: string;
};

type TranscriptionResult = {
  text: string;
  model: string;
};

type UseOpenAIVoiceReturn = {
  transcribeAudio: (audioBlob: Blob) => Promise<TranscriptionResult>;
  generateSpeech: (text: string, voice?: string) => Promise<string>; // Returns audio URL
  streamSpeech: (text: string, voice?: string) => Promise<void>;
  isProcessingAudio: boolean;
  isGeneratingSpeech: boolean;
  error: string | null;
  stopSpeech: () => void;
};

/**
 * Hook for using OpenAI's voice capabilities (speech-to-text and text-to-speech)
 */
export function useOpenAIVoice({ eveId }: UseOpenAIVoiceProps): UseOpenAIVoiceReturn {
  const [isProcessingAudio, setIsProcessingAudio] = useState(false);
  const [isGeneratingSpeech, setIsGeneratingSpeech] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Audio references
  const audioElementRef = useRef<HTMLAudioElement | null>(null);
  
  useEffect(() => {
    // Create an audio element for speech playback
    const audioElement = new Audio();
    audioElementRef.current = audioElement;
    
    // Clean up on unmount
    return () => {
      if (audioElementRef.current) {
        audioElementRef.current.pause();
        audioElementRef.current = null;
      }
    };
  }, []);
  
  // Stop speech playback
  const stopSpeech = () => {
    if (audioElementRef.current) {
      audioElementRef.current.pause();
      audioElementRef.current.currentTime = 0;
    }
  };
  
  // Transcribe audio using OpenAI Whisper API
  const transcribeAudio = async (audioBlob: Blob): Promise<TranscriptionResult> => {
    setIsProcessingAudio(true);
    setError(null);
    
    try {
      // For development environment, use a mock implementation if needed
      if (import.meta.env.DEV && !import.meta.env.VITE_OPENAI_API_KEY) {
        // Simulate API delay
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Return mock transcription
        return {
          text: "This is a simulated transcription for development purposes. In production, this would be processed by OpenAI's Whisper API.",
          model: "whisper-1-mock"
        };
      }
      
      // Convert audio blob to base64
      const base64Audio = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64 = reader.result as string;
          // Remove the data URL prefix
          const base64Data = base64.split(',')[1];
          resolve(base64Data);
        };
        reader.readAsDataURL(audioBlob);
      });
      
      // Send to OpenAI voice endpoint
      const response = await fetch('/api/openai-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'transcribe',
          eveId,
          audioData: base64Audio,
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to transcribe audio');
      }
      
      const data = await response.json();
      return {
        text: data.text,
        model: data.model,
      };
      
    } catch (err: any) {
      setError(err.message || 'An error occurred while transcribing audio');
      console.error("Error transcribing audio:", err);
      throw err;
    } finally {
      setIsProcessingAudio(false);
    }
  };
  
  // Generate speech using OpenAI TTS API
  const generateSpeech = async (text: string, voice?: string): Promise<string> => {
    setIsGeneratingSpeech(true);
    setError(null);
    
    try {
      // For development environment, use a mock implementation if needed
      if (import.meta.env.DEV && !import.meta.env.VITE_OPENAI_API_KEY) {
        return mockGenerateSpeech(text);
      }
      
      // Send to OpenAI voice endpoint
      const response = await fetch('/api/openai-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'speak',
          eveId,
          text,
          voice,
          stream: false, // Request non-streaming response
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate speech');
      }
      
      const data = await response.json();
      
      // Convert base64 audio to blob and create URL
      const binaryData = atob(data.audio);
      const bytes = new Uint8Array(binaryData.length);
      for (let i = 0; i < binaryData.length; i++) {
        bytes[i] = binaryData.charCodeAt(i);
      }
      
      const audioBlob = new Blob([bytes.buffer], { type: 'audio/mp3' });
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Play the audio
      if (audioElementRef.current) {
        audioElementRef.current.src = audioUrl;
        audioElementRef.current.play();
      }
      
      return audioUrl;
      
    } catch (err: any) {
      setError(err.message || 'An error occurred while generating speech');
      throw err;
    } finally {
      setIsGeneratingSpeech(false);
    }
  };
  
  // Mock implementation for development purposes
  const mockGenerateSpeech = async (text: string): Promise<string> => {
    // Use browser's speech synthesis for development
    const utterance = new SpeechSynthesisUtterance(text);
    
    // Try to find a nice voice
    const voices = window.speechSynthesis.getVoices();
    const voice = voices.find(v => 
      v.name.toLowerCase().includes('female') || 
      v.name.toLowerCase().includes('girl')
    ) || voices[0];
    
    if (voice) {
      utterance.voice = voice;
    }
    
    // Speak the text
    window.speechSynthesis.speak(utterance);
    
    // Return a dummy URL
    return 'mock-speech-url';
  };
  
  // Stream speech using OpenAI TTS API
  const streamSpeech = async (text: string, voice?: string): Promise<void> => {
    setIsGeneratingSpeech(true);
    setError(null);
    
    try {
      // For development environment, use a mock implementation
      if (import.meta.env.DEV && !import.meta.env.VITE_OPENAI_API_KEY) {
        await mockGenerateSpeech(text);
        return;
      }
      
      // Send to OpenAI voice endpoint with streaming option
      const response = await fetch('/api/openai-voice', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: 'speak',
          eveId,
          text,
          voice,
          stream: true, // Request streaming response
        }),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to stream speech');
      }
      
      // Due to limitations in browser environment for handling streaming audio,
      // we'll treat this as a non-streaming request for simplicity
      const data = await response.json();
      
      if (data.audio) {
        // Convert base64 audio to blob and create URL
        const binaryData = atob(data.audio);
        const bytes = new Uint8Array(binaryData.length);
        for (let i = 0; i < binaryData.length; i++) {
          bytes[i] = binaryData.charCodeAt(i);
        }
        
        const audioBlob = new Blob([bytes.buffer], { type: 'audio/mp3' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        // Play the audio
        if (audioElementRef.current) {
          audioElementRef.current.src = audioUrl;
          audioElementRef.current.play();
        }
      } else {
        // Fall back to browser TTS for development
        return mockGenerateSpeech(text);
      }
      
    } catch (err: any) {
      setError(err.message || 'An error occurred while streaming speech');
      // Fall back to basic speech synthesis in case of error
      return mockGenerateSpeech(text);
    } finally {
      setIsGeneratingSpeech(false);
    }
  };
  
  return {
    transcribeAudio,
    generateSpeech,
    streamSpeech,
    isProcessingAudio,
    isGeneratingSpeech,
    error,
    stopSpeech,
  };
}

export default useOpenAIVoice;