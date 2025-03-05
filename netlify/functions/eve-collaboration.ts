import { Handler } from '@netlify/functions';
import { supabaseAdmin } from './supabase-client';

// Type definitions
type CollaborationRequest = {
  sourceEveId: string;
  targetEveId: string;
  taskId: string;
  requestType: 'delegate' | 'assist' | 'review';
  message: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  dueDate?: string;
  metadata?: Record<string, any>;
};

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
    const requestBody = JSON.parse(event.body || '{}') as CollaborationRequest;
    const { sourceEveId, targetEveId, taskId, requestType, message, priority = 'medium', dueDate, metadata } = requestBody;
    
    if (!sourceEveId || !targetEveId || !taskId || !requestType || !message) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required parameters' }),
      };
    }

    // Validate that both EVEs exist and are from the same company (security check)
    const { data: sourceEve, error: sourceError } = await supabaseAdmin
      .from('eves')
      .select('id, company_id, name')
      .eq('id', sourceEveId)
      .single();
    
    if (sourceError || !sourceEve) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: `Source EVE not found: ${sourceError?.message || 'Unknown error'}` }),
      };
    }

    const { data: targetEve, error: targetError } = await supabaseAdmin
      .from('eves')
      .select('id, company_id, name')
      .eq('id', targetEveId)
      .single();
    
    if (targetError || !targetEve) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: `Target EVE not found: ${targetError?.message || 'Unknown error'}` }),
      };
    }

    // Security check: Ensure both EVEs belong to the same company
    if (sourceEve.company_id !== targetEve.company_id) {
      return {
        statusCode: 403,
        body: JSON.stringify({ error: 'EVEs must belong to the same company' }),
      };
    }

    // Get the original task
    const { data: task, error: taskError } = await supabaseAdmin
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .single();
    
    if (taskError || !task) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: `Task not found: ${taskError?.message || 'Unknown error'}` }),
      };
    }

    // Create the collaboration request
    const { data: collaboration, error: collabError } = await supabaseAdmin
      .from('collaborations')
      .insert([
        {
          source_eve_id: sourceEveId,
          target_eve_id: targetEveId,
          task_id: taskId,
          request_type: requestType,
          message: message,
          status: 'pending',
          priority: priority,
          due_date: dueDate,
          metadata: metadata || {},
          company_id: sourceEve.company_id
        }
      ])
      .select()
      .single();
    
    if (collabError) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: `Failed to create collaboration request: ${collabError.message}` }),
      };
    }

    // Log the collaboration request
    const { error: logError } = await supabaseAdmin.rpc('log_event', {
      p_eve_id: sourceEveId,
      p_action_id: null,
      p_company_id: sourceEve.company_id,
      p_event_type: 'COLLABORATION_REQUESTED',
      p_status: 'pending',
      p_message: `${sourceEve.name} requested ${requestType} from ${targetEve.name}: ${message}`,
      p_metadata: {
        collaboration_id: collaboration.id,
        request_type: requestType,
        target_eve: targetEve.name,
        task_id: taskId
      }
    });

    if (logError) {
      console.error('Error logging collaboration request:', logError);
    }

    // Return success response
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        collaboration: {
          id: collaboration.id,
          sourceEve: sourceEve.name,
          targetEve: targetEve.name,
          taskId: taskId,
          requestType: requestType,
          status: 'pending',
          message: message,
          createdAt: collaboration.created_at
        }
      }),
    };
  } catch (error) {
    console.error('Error in EVE collaboration function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

export { handler };