import { Handler } from '@netlify/functions';
import { supabaseAdmin } from './supabase-client';
import { openai } from './openai-client';

/**
 * This function handles OpenAI voice operations
 * It supports both speech-to-text (transcription) and text-to-speech operations
 * with support for streaming responses
 */
export const handler: Handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse request body
    const requestBody = JSON.parse(event.body || '{}');
    const { operation, eveId, audioData, text, voice, stream } = requestBody;
    
    if (!operation || !eveId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required parameters: operation and eveId are required' }),
      };
    }
    
    // Get EVE details
    const { data: eve, error: eveError } = await supabaseAdmin
      .from('eves')
      .select(`
        *,
        company:companies(*)
      `)
      .eq('id', eveId)
      .single();
    
    if (eveError || !eve) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: `EVE not found: ${eveError?.message || 'Unknown error'}` }),
      };
    }
    
    // Get company AI settings
    const { data: aiSettings, error: aiError } = await supabaseAdmin
      .from('company_ai_settings')
      .select('*')
      .eq('company_id', eve.company_id)
      .maybeSingle();
    
    if (aiError) {
      console.warn('Error fetching company AI settings:', aiError);
      // Continue with default keys
    }
    
    // Initialize OpenAI with company key if available, otherwise use platform key
    const openaiApiKey = aiSettings?.openai_api_key || process.env.OPENAI_API_KEY;
    const openaiClient = new openai.OpenAI({ apiKey: openaiApiKey });
    
    // ============= SPEECH-TO-TEXT (TRANSCRIPTION) =============
    if (operation === 'transcribe') {
      if (!audioData) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing required parameter: audioData' }),
        };
      }
      
      // Convert base64 audio data to buffer
      const audioBuffer = Buffer.from(audioData, 'base64');
      
      // Save to temporary file (required by OpenAI API)
      const tempFilePath = `/tmp/audio-${Date.now()}.webm`;
      const fs = require('fs');
      fs.writeFileSync(tempFilePath, audioBuffer);
      
      try {
        // Use OpenAI Whisper API for transcription
        const transcription = await openaiClient.audio.transcriptions.create({
          file: fs.createReadStream(tempFilePath),
          model: 'whisper-1',
          language: 'en',
          response_format: 'json',
        });
        
        // Clean up temp file
        fs.unlinkSync(tempFilePath);
        
        // Return the transcription
        return {
          statusCode: 200,
          body: JSON.stringify({ 
            text: transcription.text,
            model: 'whisper-1'
          }),
        };
      } catch (error) {
        console.error('Error transcribing audio:', error);
        
        // Clean up temp file
        try {
          fs.unlinkSync(tempFilePath);
        } catch (e) {
          console.warn('Failed to clean up temp file:', e);
        }
        
        throw error;
      }
    }
    
    // ============= TEXT-TO-SPEECH =============
    if (operation === 'speak') {
      if (!text) {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Missing required parameter: text' }),
        };
      }
      
      // Get voice settings
      const { data: voiceSettings, error: voiceError } = await supabaseAdmin
        .from('eve_voice_settings')
        .select('*')
        .eq('eve_id', eveId)
        .maybeSingle();
      
      if (voiceError) {
        console.warn('Error fetching voice settings:', voiceError);
        // Continue with defaults
      }
      
      // Set the voice to use (default to a female voice if not specified)
      const voiceId = voice || voiceSettings?.openai_voice_model || 'alloy';
      
      // Determine if we should stream the response
      const shouldStream = stream === true;
      
      // If streaming is requested, set up streaming response
      if (shouldStream) {
        try {
          // Set up streaming response
          const audioStream = await openaiClient.audio.speech.create({
            model: 'tts-1', // or tts-1-hd for higher quality
            voice: voiceId,
            input: text,
            response_format: 'mp3',
            speed: 1.0,
          });
          
          // Return streaming response
          return {
            statusCode: 200,
            headers: {
              'Content-Type': 'audio/mpeg',
              'Transfer-Encoding': 'chunked',
            },
            body: JSON.stringify({ 
              audioStream: true,
              streamId: context.awsRequestId 
            }),
            isBase64Encoded: false,
          };
        } catch (error) {
          console.error('Error creating streaming speech:', error);
          throw error;
        }
      } else {
        // Non-streaming response
        try {
          // Generate speech
          const mp3Response = await openaiClient.audio.speech.create({
            model: 'tts-1',
            voice: voiceId,
            input: text,
            response_format: 'mp3',
            speed: 1.0,
          });
          
          // Convert to base64
          const audioData = await mp3Response.arrayBuffer();
          const base64Audio = Buffer.from(audioData).toString('base64');
          
          // Return the audio data
          return {
            statusCode: 200,
            body: JSON.stringify({ 
              audio: base64Audio,
              format: 'mp3',
              voice: voiceId
            }),
          };
        } catch (error) {
          console.error('Error creating speech:', error);
          throw error;
        }
      }
    }
    
    // Invalid operation
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid operation. Supported operations: transcribe, speak' }),
    };
    
  } catch (error) {
    console.error('Error in OpenAI voice handler:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error', 
        message: error.message || 'Unknown error'
      }),
    };
  }
};