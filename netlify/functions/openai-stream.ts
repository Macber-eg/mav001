import { Handler } from '@netlify/functions';
import { supabaseAdmin } from './supabase-client';
import { OpenAI } from 'openai';

/**
 * This function handles streaming responses from OpenAI
 * It's specifically designed for real-time text generation and voice synthesis
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
    const { companyId, requestData } = requestBody;
    
    if (!companyId || !requestData) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required parameters: companyId and requestData' }),
      };
    }
    
    // Get company AI settings
    const { data: settings, error: settingsError } = await supabaseAdmin
      .from('company_ai_settings')
      .select('*')
      .eq('company_id', companyId)
      .maybeSingle();
    
    if (settingsError) {
      console.error('Error fetching company AI settings:', settingsError);
      // Continue with platform key
    }
    
    // Use company key if available, otherwise use platform key
    const apiKey = settings?.openai_api_key || process.env.OPENAI_API_KEY;
    
    if (!apiKey) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'No OpenAI API key available' }),
      };
    }
    
    // Initialize OpenAI with the appropriate key
    const openai = new OpenAI({ 
      apiKey,
      organization: settings?.openai_org_id
    });
    
    // Create a streaming response
    const stream = await openai.chat.completions.create({
      ...requestData.params,
      stream: true,
    });

    // Set up headers for streaming response
    const headers = {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    };

    // Initialize the response
    let streamedResponse = '';
    
    // Process the stream
    for await (const chunk of stream) {
      // Add content to the streamed response if content exists
      if (chunk.choices[0]?.delta?.content) {
        streamedResponse += chunk.choices[0].delta.content;
      }
      
      // Prepare the SSE format message
      const data = JSON.stringify({
        id: chunk.id,
        object: chunk.object,
        created: chunk.created,
        model: chunk.model,
        choices: chunk.choices,
      });
      
      // Directly return the chunk - Netlify will handle sending this to the client
      return {
        statusCode: 200,
        headers,
        body: `data: ${data}\n\n`,
        isBase64Encoded: false,
      };
    }
    
    // This path is only reached if the stream is empty or ends immediately
    return {
      statusCode: 200,
      headers,
      body: 'data: [DONE]\n\n',
      isBase64Encoded: false,
    };
    
  } catch (error: any) {
    console.error('Error in OpenAI stream:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      }),
    };
  }
};