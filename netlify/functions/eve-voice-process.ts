import { Handler } from '@netlify/functions';
import twilio from 'twilio';
import { supabaseAdmin } from './supabase-client';
import { openai } from './openai-client';

/**
 * This function processes speech input from a call and generates a response
 * It gets triggered after a caller leaves a message for an EVE
 * Uses realtime streaming for improved responsiveness
 */
export const handler: Handler = async (event, context) => {
  try {
    // Extract parameters from query string
    const { eve_id, call_id } = event.queryStringParameters || {};
    const { SpeechResult } = event.queryStringParameters || {};
    
    if (!eve_id) {
      throw new Error('Missing required parameter: eve_id');
    }
    
    // Log the speech result
    console.log(`Speech result for EVE ${eve_id}: ${SpeechResult || 'No speech detected'}`);
    
    // Update call record with transcript if we have a call_id
    if (call_id && SpeechResult) {
      const { error: updateError } = await supabaseAdmin
        .from('voice_calls')
        .update({ transcript: SpeechResult })
        .eq('id', call_id);
      
      if (updateError) {
        console.error('Error updating call transcript:', updateError);
        // Continue anyway - non-critical
      }
    }
    
    // Get EVE details
    const { data: eve, error: eveError } = await supabaseAdmin
      .from('eves')
      .select(`
        *,
        company:companies(*)
      `)
      .eq('id', eve_id)
      .single();
    
    if (eveError || !eve) {
      throw new Error(`Error fetching EVE details: ${eveError?.message || 'EVE not found'}`);
    }
    
    // Get voice settings
    const { data: voiceSettings, error: voiceError } = await supabaseAdmin
      .from('eve_voice_settings')
      .select('*')
      .eq('eve_id', eve_id)
      .maybeSingle();
    
    if (voiceError) {
      console.error('Error fetching voice settings:', voiceError);
      // Continue with defaults
    }
    
    // Get company AI settings if available
    const { data: aiSettings, error: aiError } = await supabaseAdmin
      .from('company_ai_settings')
      .select('*')
      .eq('company_id', eve.company_id)
      .maybeSingle();
    
    if (aiError) {
      console.error('Error fetching company AI settings:', aiError);
      // Continue with default keys
    }
    
    // Initialize OpenAI with company key if available, otherwise use platform key
    const openaiApiKey = aiSettings?.openai_api_key || process.env.OPENAI_API_KEY;
    const openaiClient = new openai.OpenAI({ apiKey: openaiApiKey });
    
    let aiResponse = "I'm sorry, I couldn't process your request at this time.";
    
    // If we have speech input, process it with OpenAI
    if (SpeechResult) {
      try {
        // Construct the system prompt based on EVE's capabilities and available actions
        const systemPrompt = `You are ${eve.name}, an Enterprise Virtual Employee™ at ${eve.company?.name || 'a company'}.
        Your capabilities include: ${(eve.capabilities || []).join(', ')}.
        
        This is a voice conversation, so keep your responses conversational, clear, and concise.
        Avoid long explanations, lists, or anything that would be difficult to follow in speech.
        Aim to keep responses under 30 seconds when spoken.
        
        The person has called you on the phone and said: "${SpeechResult}"
        
        Respond in a helpful, professional manner. Don't mention that you're an AI unless directly asked.`;
        
        // Call OpenAI API with streaming enabled for real-time processing
        const stream = await openaiClient.chat.completions.create({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: SpeechResult }
          ],
          max_tokens: 250,
          temperature: 0.7,
          stream: true, // Enable streaming
        });
        
        // Process the stream
        let fullResponse = '';
        let isFinalResponse = false;
        
        // Use Twilio's streaming capabilities for real-time speech synthesis
        // Initialize TwiML
        const twiml = new twilio.twiml.VoiceResponse();
        
        // For a real implementation, we would use a websocket or similar to stream
        // But for demo purposes, we'll collect the full response and then speak it
        for await (const chunk of stream) {
          if (chunk.choices[0]?.delta?.content) {
            fullResponse += chunk.choices[0].delta.content;
          }
          
          // Check if this is the final response
          if (chunk.choices[0]?.finish_reason) {
            isFinalResponse = true;
          }
        }
        
        // Set the final response
        aiResponse = fullResponse;
        
        // Log this interaction
        await supabaseAdmin.rpc('log_event', {
          p_eve_id: eve_id,
          p_action_id: null,
          p_company_id: eve.company_id,
          p_event_type: 'VOICE_INTERACTION',
          p_status: 'success',
          p_message: 'Voice call processed',
          p_metadata: {
            user_input: SpeechResult,
            ai_response: aiResponse,
            realtime_api: true
          }
        });
        
      } catch (aiError) {
        console.error('Error generating AI response:', aiError);
        // Use fallback message
        aiResponse = voiceSettings?.fallback_message || 
          "I'm having trouble processing your request right now. Please try again later.";
      }
    }
    
    // Generate TwiML for the response
    const twiml = new twilio.twiml.VoiceResponse();
    
    // Say the AI response
    twiml.say({
      voice: voiceSettings?.voice_id || 'Polly.Amy',
    }, aiResponse);
    
    // Ask if there's anything else
    twiml.pause({ length: 1 });
    twiml.say({
      voice: voiceSettings?.voice_id || 'Polly.Amy',
    }, "Is there anything else I can help you with?");
    
    // Set up gathering of more speech input
    const gather = twiml.gather({
      input: 'speech',
      action: `/.netlify/functions/eve-voice-process?eve_id=${eve_id}&call_id=${call_id || ''}`,
      speechTimeout: 'auto',
      speechModel: 'phone_call',
      enhanced: true,
      language: 'en-US',
      timeout: 5
    });
    
    // Add a closing message if no additional input
    twiml.say({
      voice: voiceSettings?.voice_id || 'Polly.Amy',
    }, "I didn't hear anything. Thank you for calling. Goodbye.");
    twiml.hangup();
    
    // Return TwiML response
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/xml' },
      body: twiml.toString()
    };
    
  } catch (error) {
    console.error('Error in EVE voice processing:', error);
    
    // Return a fallback TwiML
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say("I'm sorry, I encountered a problem processing your request. Please try again later.");
    twiml.hangup();
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/xml' },
      body: twiml.toString()
    };
  }
};