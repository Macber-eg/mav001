import { Handler } from '@netlify/functions';
import { supabaseAdmin } from './supabase-client';
import { openai } from './openai-client';

// Type definitions
type EVERequest = {
  eveId: string;
  prompt: string;
  context?: string;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  stream?: boolean;
};

// The main handler function for EVE intelligence requests
const handler: Handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse the request body
    const requestBody = JSON.parse(event.body || '{}') as EVERequest;
    const { eveId, prompt, context, maxTokens = 500, temperature = 0.7, systemPrompt, stream = false } = requestBody;
    
    if (!eveId || !prompt) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required parameters: eveId and prompt are required' }),
      };
    }

    // Get EVE details from the database to customize the interaction
    const { data: eveData, error: eveError } = await supabaseAdmin
      .from('eves')
      .select(`
        *,
        users!eves_created_by_fkey(email),
        companies(*)
      `)
      .eq('id', eveId)
      .single();

    if (eveError || !eveData) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: `EVE not found: ${eveError?.message || 'Unknown error'}` }),
      };
    }

    // Get all actions available to this EVE
    const { data: eveActions, error: actionsError } = await supabaseAdmin
      .from('eve_actions')
      .select(`
        *,
        action:actions(*)
      `)
      .eq('eve_id', eveId);

    if (actionsError) {
      console.error('Error fetching EVE actions:', actionsError);
      // Continue anyway, as we can still provide intelligence without actions
    }

    // Construct the system prompt based on EVE's capabilities and available actions
    const defaultSystemPrompt = `You are ${eveData.name}, an Enterprise Virtual Employee™ created by Mavrika. 
    Your primary functions are: ${(eveData.capabilities || []).join(', ')}.
    You work for ${eveData.companies?.name || 'a company'} and help them automate tasks and improve efficiency.
    You are professional, accurate, and constantly learning to improve your abilities.
    
    Available Actions:
    ${eveActions?.map(ea => `- ${ea.action.name}: ${ea.action.description || 'No description'}`).join('\n') || 'No specific actions assigned yet.'}
    
    When asked to perform a task, you should:
    1. Understand the request
    2. Identify if you have the capability to fulfill it
    3. Choose the most appropriate action if available
    4. Request any missing information
    5. Execute the task or provide a clear explanation of what you would do
    
    Your working hours are ${eveData.settings?.workingHours || 'standard business hours'}.
    `;

    // Use the provided system prompt or the default one
    const finalSystemPrompt = systemPrompt || defaultSystemPrompt;

    // Create conversation history if context was provided
    const messages = [
      {
        role: 'system',
        content: finalSystemPrompt
      },
      ...(context ? JSON.parse(context) : []),
      {
        role: 'user',
        content: prompt
      }
    ];

    // Check if this is a streaming request
    if (stream) {
      // Return a streaming response
      // This will be handled by the netlify-edge function
      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
        body: JSON.stringify({
          stream: true,
          eveId: eveId,
          eveName: eveData.name,
          messages: messages,
          model: 'gpt-4', // Or use a different model based on needs
          max_tokens: maxTokens,
          temperature: temperature,
        }),
      };
    }

    // For non-streaming, use regular API call
    // Call OpenAI API
    const completion = await openai.chat.completions.create({
      model: 'gpt-4', // Or use a different model based on needs
      messages: messages,
      max_tokens: maxTokens,
      temperature: temperature,
    });

    // Extract the response
    const response = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

    // Log this interaction in the logs table
    const { data: logData, error: logError } = await supabaseAdmin.rpc('log_event', {
      p_eve_id: eveId,
      p_action_id: null, // No specific action associated yet
      p_company_id: eveData.company_id,
      p_event_type: 'AI_INTERACTION',
      p_status: 'success',
      p_message: 'AI response generated',
      p_metadata: {
        prompt: prompt,
        response: response,
        tokens_used: completion.usage?.total_tokens || 0
      }
    });

    if (logError) {
      console.error('Error logging EVE interaction:', logError);
      // Continue anyway as the main functionality worked
    }

    // Return the successful response
    return {
      statusCode: 200,
      body: JSON.stringify({
        response: response,
        eveId: eveId,
        eveName: eveData.name,
        tokensUsed: completion.usage?.total_tokens || 0,
        // Include the latest message to be added to conversation history
        newMessage: {
          role: 'assistant',
          content: response
        }
      }),
    };
  } catch (error) {
    console.error('Error in EVE intelligence function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

export { handler };