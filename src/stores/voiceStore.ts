import { create } from 'zustand';
import supabase from '../lib/supabase';
import { VoiceSettings, VoiceCall } from '../types/database.types';

interface VoiceState {
  voiceSettings: VoiceSettings | null;
  voiceCalls: VoiceCall[];
  isLoading: boolean;
  error: string | null;
  fetchVoiceSettings: (eveId: string) => Promise<VoiceSettings | null>;
  fetchVoiceCalls: (eveId: string, limit?: number) => Promise<VoiceCall[]>;
  updateVoiceSettings: (settings: Partial<VoiceSettings>) => Promise<VoiceSettings | null>;
  enableVoice: (eveId: string, phoneNumber: string) => Promise<VoiceSettings | null>;
  disableVoice: (eveId: string) => Promise<boolean>;
}

export const useVoiceStore = create<VoiceState>((set, get) => ({
  voiceSettings: null,
  voiceCalls: [],
  isLoading: false,
  error: null,
  
  fetchVoiceSettings: async (eveId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('eve_voice_settings')
        .select('*')
        .eq('eve_id', eveId)
        .maybeSingle();
      
      if (error) {
        set({ error: `Failed to fetch voice settings: ${error.message}` });
        throw error;
      }
      
      set({ voiceSettings: data as VoiceSettings | null });
      return data as VoiceSettings | null;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  fetchVoiceCalls: async (eveId: string, limit = 20) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('voice_calls')
        .select('*')
        .eq('eve_id', eveId)
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        set({ error: `Failed to fetch voice calls: ${error.message}` });
        throw error;
      }
      
      set({ voiceCalls: data as VoiceCall[] });
      return data as VoiceCall[];
    } catch (error: any) {
      set({ error: error.message });
      return [];
    } finally {
      set({ isLoading: false });
    }
  },
  
  updateVoiceSettings: async (settings: Partial<VoiceSettings>) => {
    set({ isLoading: true, error: null });
    try {
      if (!settings.id) {
        throw new Error('Voice settings ID is required for updates');
      }
      
      const { data, error } = await supabase
        .from('eve_voice_settings')
        .update(settings)
        .eq('id', settings.id)
        .select()
        .single();
      
      if (error) {
        set({ error: `Failed to update voice settings: ${error.message}` });
        throw error;
      }
      
      set({ voiceSettings: data as VoiceSettings });
      return data as VoiceSettings;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  enableVoice: async (eveId: string, phoneNumber: string) => {
    set({ isLoading: true, error: null });
    try {
      // Check if settings already exist
      const { data: existingSettings } = await supabase
        .from('eve_voice_settings')
        .select('*')
        .eq('eve_id', eveId)
        .maybeSingle();
      
      if (existingSettings) {
        // Update existing settings
        const { data, error } = await supabase
          .from('eve_voice_settings')
          .update({
            phone_number: phoneNumber,
            enabled: true
          })
          .eq('id', existingSettings.id)
          .select()
          .single();
        
        if (error) {
          set({ error: `Failed to update voice settings: ${error.message}` });
          throw error;
        }
        
        set({ voiceSettings: data as VoiceSettings });
        return data as VoiceSettings;
      } else {
        // Get EVE details for company_id
        const { data: eveData, error: eveError } = await supabase
          .from('eves')
          .select('company_id, name')
          .eq('id', eveId)
          .single();
        
        if (eveError) {
          set({ error: `Failed to fetch EVE details: ${eveError.message}` });
          throw eveError;
        }
        
        // Create new settings
        const defaultGreeting = `Hello, this is ${eveData.name}, an Enterprise Virtual Employee from Mavrika. How can I help you today?`;
        
        const { data, error } = await supabase
          .from('eve_voice_settings')
          .insert([{
            eve_id: eveId,
            phone_number: phoneNumber,
            greeting_message: defaultGreeting,
            fallback_message: "I'm sorry, I'm having trouble understanding. Please try again.",
            voice_id: 'Polly.Amy',
            enabled: true,
            company_id: eveData.company_id
          }])
          .select()
          .single();
        
        if (error) {
          set({ error: `Failed to create voice settings: ${error.message}` });
          throw error;
        }
        
        set({ voiceSettings: data as VoiceSettings });
        return data as VoiceSettings;
      }
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  disableVoice: async (eveId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('eve_voice_settings')
        .update({ enabled: false })
        .eq('eve_id', eveId);
      
      if (error) {
        set({ error: `Failed to disable voice: ${error.message}` });
        throw error;
      }
      
      // Update local state
      const { voiceSettings } = get();
      if (voiceSettings && voiceSettings.eve_id === eveId) {
        set({ voiceSettings: { ...voiceSettings, enabled: false } });
      }
      
      return true;
    } catch (error: any) {
      set({ error: error.message });
      return false;
    } finally {
      set({ isLoading: false });
    }
  }
}));