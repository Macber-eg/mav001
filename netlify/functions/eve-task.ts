import { Handler } from '@netlify/functions';
import { supabaseAdmin } from './supabase-client';
import { openai } from './openai-client';

// Type definitions
type EVETaskRequest = {
  eveId: string;
  taskDescription: string;
  actionId?: string;
  parameters?: Record<string, any>;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string;
};

// The main handler function for EVE task execution
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
    const requestBody = JSON.parse(event.body || '{}') as EVETaskRequest;
    const { eveId, taskDescription, actionId, parameters, priority = 'medium', dueDate } = requestBody;
    
    if (!eveId || !taskDescription) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required parameters: eveId and taskDescription are required' }),
      };
    }

    // Get EVE details from the database
    const { data: eveData, error: eveError } = await supabaseAdmin
      .from('eves')
      .select('*')
      .eq('id', eveId)
      .single();

    if (eveError || !eveData) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: `EVE not found: ${eveError?.message || 'Unknown error'}` }),
      };
    }

    // If actionId is provided, get action details
    let actionDetails = null;
    if (actionId) {
      const { data: actionData, error: actionError } = await supabaseAdmin
        .from('actions')
        .select('*')
        .eq('id', actionId)
        .single();

      if (actionError || !actionData) {
        return {
          statusCode: 404,
          body: JSON.stringify({ error: `Action not found: ${actionError?.message || 'Unknown error'}` }),
        };
      }
      
      actionDetails = actionData;
    }

    // Initial status will be pending
    const taskStatus = 'pending';
    
    // Create a task record in the database
    const { data: taskData, error: taskError } = await supabaseAdmin
      .from('tasks')
      .insert([
        {
          eve_id: eveId,
          action_id: actionId,
          description: taskDescription,
          status: taskStatus,
          parameters: parameters || {},
          priority: priority,
          due_date: dueDate ? new Date(dueDate).toISOString() : null,
          company_id: eveData.company_id
        }
      ])
      .select()
      .single();

    if (taskError) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: `Failed to create task: ${taskError.message}` }),
      };
    }

    // Log the task creation
    const { data: logData, error: logError } = await supabaseAdmin.rpc('log_event', {
      p_eve_id: eveId,
      p_action_id: actionId,
      p_company_id: eveData.company_id,
      p_event_type: 'TASK_CREATED',
      p_status: taskStatus,
      p_message: `Task created: ${taskDescription}`,
      p_metadata: {
        task_id: taskData.id,
        priority: priority,
        due_date: dueDate
      }
    });

    if (logError) {
      console.error('Error logging task creation:', logError);
    }

    // If this is a standard action with an endpoint, we could execute it here
    // For now, we'll just analyze the task with AI to provide insights
    const prompt = `
    As an Enterprise Virtual Employee™, I've been assigned this task:
    "${taskDescription}"
    
    ${actionId ? `I should use the ${actionDetails?.name} action to complete it.` : ''}
    
    Based on this information, what steps should I take to complete this task effectively?
    What information might I need that's missing?
    Are there any potential issues I should be aware of?

    Provide a concise analysis with clear next steps.
    `;

    // Call OpenAI API for task analysis
    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `You are a task analysis module for ${eveData.name}, an Enterprise Virtual Employee™. 
                    Your job is to analyze tasks and provide clear, structured insights.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 500,
      temperature: 0.7,
    });

    // Extract the response
    const analysis = completion.choices[0]?.message?.content || 'No analysis available.';

    // Return the successful response with task info and analysis
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        task: {
          id: taskData.id,
          eveId: eveData.id,
          eveName: eveData.name,
          description: taskDescription,
          status: taskStatus,
          actionId: actionId,
          parameters: parameters,
          priority: priority,
          dueDate: dueDate,
          createdAt: taskData.created_at
        },
        analysis: analysis
      }),
    };
  } catch (error) {
    console.error('Error in EVE task function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

export { handler };