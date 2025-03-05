import { Handler } from '@netlify/functions';
import twilio from 'twilio';
import { supabaseAdmin } from './supabase-client';

/**
 * This function handles incoming Twilio voice webhook requests
 * It's the first point of contact when someone calls an EVE's phone number
 */
export const handler: Handler = async (event, context) => {
  try {
    // Extract call data from Twilio webhook
    const { CallSid, From, To, CallStatus } = event.queryStringParameters || {};
    
    if (!CallSid || !From || !To) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required parameters' })
      };
    }

    console.log(`Incoming call from ${From} to ${To} (Status: ${CallStatus})`);
    
    // Find which EVE should handle this call based on the phone number
    const { data: eveVoiceData, error: voiceError } = await supabaseAdmin
      .from('eve_voice_settings')
      .select('eve_id, greeting_message, voice_id')
      .eq('phone_number', To)
      .maybeSingle();
    
    if (voiceError || !eveVoiceData) {
      console.error('Error finding EVE for phone number:', voiceError || 'No EVE found');
      
      // Return default TwiML if no EVE is found
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say('We could not locate a virtual employee for this number. Goodbye.');
      twiml.hangup();
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/xml' },
        body: twiml.toString()
      };
    }
    
    // Get EVE details
    const { data: eve, error: eveError } = await supabaseAdmin
      .from('eves')
      .select('*')
      .eq('id', eveVoiceData.eve_id)
      .single();
    
    if (eveError || !eve) {
      console.error('Error fetching EVE details:', eveError || 'EVE not found');
      
      // Return error TwiML
      const twiml = new twilio.twiml.VoiceResponse();
      twiml.say('Sorry, the virtual employee is currently unavailable. Please try again later.');
      twiml.hangup();
      
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/xml' },
        body: twiml.toString()
      };
    }
    
    // Log the call in our database
    const { data: callRecord, error: callError } = await supabaseAdmin
      .from('voice_calls')
      .insert([{
        eve_id: eve.id,
        call_sid: CallSid,
        caller_number: From,
        status: CallStatus,
        started_at: new Date().toISOString(),
        company_id: eve.company_id
      }])
      .select()
      .single();
    
    if (callError) {
      console.error('Error logging call:', callError);
      // Continue anyway - we don't want to fail the call just because logging failed
    }
    
    // Generate TwiML for the response
    const twiml = new twilio.twiml.VoiceResponse();
    
    // Add a greeting message
    const greeting = eveVoiceData.greeting_message || 
      `Hello, this is ${eve.name}, an Enterprise Virtual Employee from Mavrika. How can I help you today?`;
    
    twiml.say({
      voice: eveVoiceData.voice_id || 'Polly.Amy', // Use Amazon Polly voices for natural speech
    }, greeting);
    
    // Set up gathering of speech input
    const gather = twiml.gather({
      input: 'speech',
      action: `/.netlify/functions/eve-voice-process?eve_id=${eve.id}&call_id=${callRecord?.id || ''}`,
      speechTimeout: 'auto',
      speechModel: 'phone_call',
      enhanced: true,
      language: 'en-US',
      timeout: 5
    });
    
    // Add a fallback if no speech is detected
    twiml.say('I didn\'t hear anything. Please call back when you\'re ready to speak.');
    twiml.hangup();
    
    // Return TwiML response
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/xml' },
      body: twiml.toString()
    };
    
  } catch (error) {
    console.error('Error in EVE voice webhook:', error);
    
    // Return an error TwiML
    const twiml = new twilio.twiml.VoiceResponse();
    twiml.say('An error occurred. Please try again later.');
    twiml.hangup();
    
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/xml' },
      body: twiml.toString()
    };
  }
};