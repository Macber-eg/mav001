import { Handler } from '@netlify/functions';
import { openai } from './openai-client';

/**
 * Simple function to test OpenAI API connectivity
 * It attempts to make a minimal API call to verify the connection
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
    // Check if OpenAI API key is configured
    if (!process.env.OPENAI_API_KEY) {
      return {
        statusCode: 500,
        body: JSON.stringify({ 
          error: 'OpenAI API key is not configured on the server',
          success: false
        }),
      };
    }

    // Make a minimal API call to verify connection
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo', // Use a cheaper model for the test
      messages: [{ role: 'user', content: 'Hello' }],
      max_tokens: 5, // Minimal tokens to save costs
      temperature: 0,
    });

    // If we get here, the connection was successful
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        model: completion.model,
        message: 'Successfully connected to OpenAI API'
      }),
    };
  } catch (error: any) {
    console.error('Error testing OpenAI connection:', error);
    
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: error.message || 'Failed to connect to OpenAI API',
        success: false,
        details: error.response || error.cause || 'Unknown error'
      }),
    };
  }
};