import { Handler } from '@netlify/functions';
import { supabaseAdmin } from './supabase-client';
import { OpenAI } from 'openai';
import { Readable } from 'stream';

/**
 * This function serves as a proxy for OpenAI API calls
 * It uses the company's OpenAI API key if available, otherwise falls back to the platform key
 * Supports both standard and realtime (streaming) API requests
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
    
    // Check if this is a streaming request
    const isStreaming = requestData.stream === true;
    
    // For streaming requests, we need to handle differently
    if (isStreaming) {
      // Streaming is only supported for chat completions right now
      if (requestData.endpoint !== 'chat.completions') {
        return {
          statusCode: 400,
          body: JSON.stringify({ error: 'Streaming is only supported for chat completions' }),
        };
      }
      
      // For Netlify functions, we need to use response streaming
      // This requires Netlify bundler v3 or higher
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
        body: JSON.stringify({ streamId: context.awsRequestId }),
        isBase64Encoded: false,
      };
    }
    
    // Handle standard (non-streaming) OpenAI requests
    let response;
    
    if (requestData.endpoint === 'chat.completions') {
      response = await openai.chat.completions.create(requestData.params);
    } else if (requestData.endpoint === 'embeddings') {
      response = await openai.embeddings.create(requestData.params);
    } else if (requestData.endpoint === 'audio.speech') {
      response = await openai.audio.speech.create(requestData.params);
    } else if (requestData.endpoint === 'audio.transcriptions') {
      response = await openai.audio.transcriptions.create(requestData.params);
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Unsupported OpenAI endpoint' }),
      };
    }
    
    // Track usage for billing/quotas
    // This will vary depending on the type of request
    let tokensUsed = 0;
    if ('usage' in response && response.usage && 'total_tokens' in response.usage) {
      tokensUsed = response.usage.total_tokens;
    }
    
    if (tokensUsed > 0) {
      try {
        await supabaseAdmin.rpc('log_ai_usage', {
          p_company_id: companyId,
          p_tokens_used: tokensUsed,
          p_model: requestData.params.model,
          p_endpoint: requestData.endpoint
        });
      } catch (usageError) {
        console.error('Error logging AI usage:', usageError);
        // Non-critical, continue
      }
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify(response)
    };
    
  } catch (error: any) {
    console.error('Error in OpenAI proxy:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message
      }),
    };
  }
};