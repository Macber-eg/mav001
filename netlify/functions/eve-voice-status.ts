import { Handler } from '@netlify/functions';
import { supabaseAdmin } from './supabase-client';

/**
 * This function handles status callbacks from Twilio
 * It updates call records with final status and duration
 */
export const handler: Handler = async (event, context) => {
  try {
    // Extract call data from Twilio status callback
    const { CallSid, CallStatus, CallDuration } = event.queryStringParameters || {};
    
    if (!CallSid) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required parameter: CallSid' })
      };
    }
    
    console.log(`Call status update for ${CallSid}: ${CallStatus}, duration: ${CallDuration}`);
    
    // Update the call record with status and duration
    const { data, error } = await supabaseAdmin
      .from('voice_calls')
      .update({
        status: CallStatus,
        duration: CallDuration ? parseInt(CallDuration, 10) : null,
        ended_at: CallStatus === 'completed' ? new Date().toISOString() : null
      })
      .eq('call_sid', CallSid)
      .select();
    
    if (error) {
      throw new Error(`Error updating call record: ${error.message}`);
    }
    
    // Return success
    return {
      statusCode: 200,
      body: JSON.stringify({ success: true, updated: !!data })
    };
    
  } catch (error) {
    console.error('Error in call status handler:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};