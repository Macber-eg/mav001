import { Handler } from '@netlify/functions';
import { supabaseAdmin } from './supabase-client';
import { openai } from './openai-client';

// Type definitions
type MemoryOperation = 'store' | 'retrieve' | 'update' | 'delete' | 'search' | 'rank';

type MemoryRequest = {
  operation: MemoryOperation;
  eveId: string;
  key?: string;
  type?: 'conversation' | 'task' | 'fact' | 'preference' | 'relationship';
  value?: any;
  importance?: number;
  expiry?: string;
  metadata?: Record<string, any>;
  memoryId?: string;
  query?: string;
  context?: string;
};

// The main handler function for EVE memory operations
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
    const requestBody = JSON.parse(event.body || '{}') as MemoryRequest;
    const { operation, eveId } = requestBody;
    
    if (!eveId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing required parameter: eveId' }),
      };
    }

    // Get EVE details from the database to verify permissions
    const { data: eveData, error: eveError } = await supabaseAdmin
      .from('eves')
      .select('company_id')
      .eq('id', eveId)
      .single();

    if (eveError || !eveData) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: `EVE not found: ${eveError?.message || 'Unknown error'}` }),
      };
    }

    const companyId = eveData.company_id;

    // Perform the requested operation
    switch (operation) {
      case 'store':
        return await storeMemory(requestBody, companyId);
      case 'retrieve':
        return await retrieveMemory(requestBody);
      case 'update':
        return await updateMemory(requestBody);
      case 'delete':
        return await deleteMemory(requestBody);
      case 'search':
        return await searchMemory(requestBody);
      case 'rank':
        return await rankMemoriesByRelevance(requestBody);
      default:
        return {
          statusCode: 400,
          body: JSON.stringify({ error: `Unsupported operation: ${operation}` }),
        };
    }
  } catch (error) {
    console.error('Error in EVE memory function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};

// Store a new memory
async function storeMemory(request: MemoryRequest, companyId: string) {
  const { eveId, key, type, value, importance = 1, expiry, metadata } = request;
  
  if (!key || !type || value === undefined) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required parameters: key, type, and value are required' }),
    };
  }

  try {
    // Check if a memory with this key already exists
    const { data: existingMemory } = await supabaseAdmin
      .from('memories')
      .select('id')
      .eq('eve_id', eveId)
      .eq('key', key)
      .maybeSingle();
    
    if (existingMemory) {
      // Update the existing memory
      const { data, error } = await supabaseAdmin
        .from('memories')
        .update({
          type,
          value,
          importance,
          expiry,
          metadata,
          last_accessed: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', existingMemory.id)
        .select()
        .single();
      
      if (error) throw error;
      
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: 'Memory updated successfully',
          memory: data
        }),
      };
    } else {
      // Create a new memory
      const { data, error } = await supabaseAdmin
        .from('memories')
        .insert([{
          eve_id: eveId,
          key,
          type,
          value,
          importance,
          expiry,
          metadata,
          company_id: companyId,
          last_accessed: new Date().toISOString()
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      // Create memory embedding for vector search if text content is present
      if (typeof value === 'string' || (typeof value === 'object' && value.text)) {
        await createMemoryEmbedding(data.id, typeof value === 'string' ? value : value.text);
      }
      
      return {
        statusCode: 200,
        body: JSON.stringify({ 
          success: true, 
          message: 'Memory stored successfully',
          memory: data
        }),
      };
    }
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Failed to store memory: ${error.message}` }),
    };
  }
}

// Retrieve a memory by key
async function retrieveMemory(request: MemoryRequest) {
  const { eveId, key } = request;
  
  if (!key) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required parameter: key' }),
    };
  }

  try {
    const { data, error } = await supabaseAdmin
      .from('memories')
      .select('*')
      .eq('eve_id', eveId)
      .eq('key', key)
      .maybeSingle();
    
    if (error) throw error;
    
    if (!data) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Memory not found' }),
      };
    }
    
    // Update last_accessed time
    await supabaseAdmin
      .from('memories')
      .update({ last_accessed: new Date().toISOString() })
      .eq('id', data.id);
    
    return {
      statusCode: 200,
      body: JSON.stringify({ memory: data }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Failed to retrieve memory: ${error.message}` }),
    };
  }
}

// Update an existing memory
async function updateMemory(request: MemoryRequest) {
  const { eveId, memoryId, value, importance, expiry, metadata } = request;
  
  if (!memoryId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required parameter: memoryId' }),
    };
  }

  try {
    // Verify the memory belongs to this EVE
    const { data: existingMemory, error: checkError } = await supabaseAdmin
      .from('memories')
      .select('id')
      .eq('id', memoryId)
      .eq('eve_id', eveId)
      .maybeSingle();
    
    if (checkError || !existingMemory) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Memory not found or does not belong to this EVE' }),
      };
    }
    
    // Update fields that are provided
    const updates: any = { last_accessed: new Date().toISOString() };
    if (value !== undefined) updates.value = value;
    if (importance !== undefined) updates.importance = importance;
    if (expiry !== undefined) updates.expiry = expiry;
    if (metadata !== undefined) updates.metadata = metadata;
    
    const { data, error } = await supabaseAdmin
      .from('memories')
      .update(updates)
      .eq('id', memoryId)
      .select()
      .single();
    
    if (error) throw error;
    
    // Update memory embedding if value changed and contains text
    if (value !== undefined && (typeof value === 'string' || (typeof value === 'object' && value.text))) {
      await createMemoryEmbedding(memoryId, typeof value === 'string' ? value : value.text);
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: 'Memory updated successfully',
        memory: data
      }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Failed to update memory: ${error.message}` }),
    };
  }
}

// Delete a memory
async function deleteMemory(request: MemoryRequest) {
  const { eveId, memoryId } = request;
  
  if (!memoryId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required parameter: memoryId' }),
    };
  }

  try {
    // Verify the memory belongs to this EVE
    const { data: existingMemory, error: checkError } = await supabaseAdmin
      .from('memories')
      .select('id')
      .eq('id', memoryId)
      .eq('eve_id', eveId)
      .maybeSingle();
    
    if (checkError || !existingMemory) {
      return {
        statusCode: 404,
        body: JSON.stringify({ error: 'Memory not found or does not belong to this EVE' }),
      };
    }
    
    // Delete associated embeddings first
    await supabaseAdmin
      .from('memory_vectors')
      .delete()
      .eq('memory_id', memoryId);
    
    // Delete the memory
    const { error } = await supabaseAdmin
      .from('memories')
      .delete()
      .eq('id', memoryId);
    
    if (error) throw error;
    
    return {
      statusCode: 200,
      body: JSON.stringify({ 
        success: true, 
        message: 'Memory deleted successfully'
      }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Failed to delete memory: ${error.message}` }),
    };
  }
}

// Search for memories based on text similarity
async function searchMemory(request: MemoryRequest) {
  const { eveId, query, type } = request;
  
  if (!query) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required parameter: query' }),
    };
  }

  try {
    // If there are memory vectors, do a semantic search
    const hasVectors = await checkMemoryVectorsExist(eveId);
    
    if (hasVectors) {
      // Generate embedding for the query
      const embedding = await generateEmbedding(query);
      
      // Perform vector search using pgvector's <-> operator for Euclidean distance
      let queryBuilder = supabaseAdmin.rpc('search_memory_vectors', {
        query_embedding: embedding,
        eve_id_param: eveId,
        match_threshold: 0.7,
        match_count: 10
      });
      
      if (type) {
        queryBuilder = queryBuilder.eq('type', type);
      }
      
      const { data, error } = await queryBuilder;
      
      if (error) throw error;
      
      // Update last_accessed for all matched memories
      if (data?.length > 0) {
        const memoryIds = data.map(item => item.id);
        await supabaseAdmin
          .from('memories')
          .update({ last_accessed: new Date().toISOString() })
          .in('id', memoryIds);
      }
      
      return {
        statusCode: 200,
        body: JSON.stringify({ memories: data || [] }),
      };
    } else {
      // Fallback to simple text search
      let queryBuilder = supabaseAdmin
        .from('memories')
        .select('*')
        .eq('eve_id', eveId)
        .or(`key.ilike.%${query}%,value->text.ilike.%${query}%`)
        .order('importance', { ascending: false })
        .limit(10);
      
      if (type) {
        queryBuilder = queryBuilder.eq('type', type);
      }
      
      const { data, error } = await queryBuilder;
      
      if (error) throw error;
      
      // Update last_accessed for all matched memories
      if (data?.length > 0) {
        const memoryIds = data.map(item => item.id);
        await supabaseAdmin
          .from('memories')
          .update({ last_accessed: new Date().toISOString() })
          .in('id', memoryIds);
      }
      
      return {
        statusCode: 200,
        body: JSON.stringify({ memories: data || [] }),
      };
    }
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Failed to search memories: ${error.message}` }),
    };
  }
}

// Rank memories by relevance to the given context
async function rankMemoriesByRelevance(request: MemoryRequest) {
  const { eveId, context, type } = request;
  
  if (!context) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required parameter: context' }),
    };
  }

  try {
    // Get all memories for this EVE (optionally filtered by type)
    let queryBuilder = supabaseAdmin
      .from('memories')
      .select('*')
      .eq('eve_id', eveId);
    
    if (type) {
      queryBuilder = queryBuilder.eq('type', type);
    }
    
    const { data: memories, error } = await queryBuilder;
    
    if (error) throw error;
    
    if (!memories || memories.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({ memories: [] }),
      };
    }
    
    // Use OpenAI to rank memories by relevance
    const completion = await openai.chat.completions.create({
      model: 'gpt-4', // Use a capable model for reasoning
      messages: [
        {
          role: 'system',
          content: `You are a memory relevance ranker. 
          You will be given a list of memories and a context, and your task is to rank the memories 
          by relevance to the context. Consider both semantic relevance and importance.
          Return a JSON array of memory IDs in order of relevance, with the most relevant first.`
        },
        {
          role: 'user',
          content: `
          Context: ${context}
          
          Memories:
          ${memories.map(m => `ID: ${m.id}
          Type: ${m.type}
          Key: ${m.key}
          Value: ${JSON.stringify(m.value)}
          Importance: ${m.importance}
          `).join('\n\n')}
          
          Rank these memories by relevance to the context and return a JSON array of memory IDs.
          `
        }
      ],
      response_format: { type: "json_object" }
    });
    
    // Extract the ranked memory IDs
    const response = completion.choices[0]?.message?.content || '{"ranked_ids":[]}';
    const rankedIds = JSON.parse(response).ranked_ids || [];
    
    // Get the complete memories in ranked order
    const rankedMemories = rankedIds.map(id => memories.find(m => m.id === id)).filter(Boolean);
    
    // Update last_accessed for all ranked memories
    if (rankedMemories.length > 0) {
      const memoryIds = rankedMemories.map(memory => (memory as any).id);
      await supabaseAdmin
        .from('memories')
        .update({ last_accessed: new Date().toISOString() })
        .in('id', memoryIds);
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ memories: rankedMemories }),
    };
  } catch (error: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: `Failed to rank memories: ${error.message}` }),
    };
  }
}

// Helper function to check if memory vectors exist for an EVE
async function checkMemoryVectorsExist(eveId: string): Promise<boolean> {
  try {
    const { count, error } = await supabaseAdmin
      .from('memory_vectors')
      .select('id', { count: 'exact', head: true })
      .eq('memory_id', supabaseAdmin.rpc('get_eve_memory_ids', { eve_id_param: eveId }));
    
    if (error) throw error;
    
    return (count || 0) > 0;
  } catch (error) {
    console.error('Error checking memory vectors:', error);
    return false;
  }
}

// Helper function to create memory embeddings
async function createMemoryEmbedding(memoryId: string, text: string): Promise<void> {
  try {
    // Generate embedding
    const embedding = await generateEmbedding(text);
    
    // Delete any existing embeddings for this memory
    await supabaseAdmin
      .from('memory_vectors')
      .delete()
      .eq('memory_id', memoryId);
    
    // Store the new embedding
    await supabaseAdmin
      .from('memory_vectors')
      .insert([{
        memory_id: memoryId,
        embedding,
        text_content: text
      }]);
  } catch (error) {
    console.error('Error creating memory embedding:', error);
  }
}

// Helper function to generate text embeddings using OpenAI
async function generateEmbedding(text: string): Promise<number[]> {
  const response = await openai.embeddings.create({
    model: 'text-embedding-ada-002',
    input: text
  });
  
  return response.data[0].embedding;
}

export { handler };