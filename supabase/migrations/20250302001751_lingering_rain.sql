/*
  # EVE Memory System

  1. New Tables
    - `memories` - Stores memories for EVEs
      - `id` (uuid, primary key)
      - `eve_id` (uuid, reference to eves table)
      - `type` (text, enum of memory types)
      - `key` (text, unique identifier for the memory)
      - `value` (jsonb, the actual memory content)
      - `importance` (integer, 1-5 importance ranking)
      - `last_accessed` (timestamp)
      - `expiry` (timestamp, optional)
      - `metadata` (jsonb, optional additional data)
      - `company_id` (uuid, reference to companies table)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `memory_vectors` - Stores vector embeddings for memories
      - `id` (uuid, primary key)
      - `memory_id` (uuid, reference to memories table)
      - `embedding` (vector, stores embedding for similarity search)
      - `text_content` (text, the text used to generate the embedding)
      - `created_at` (timestamp)

  2. Functions
    - Helper function to get memory IDs for an EVE
    - Vector search function for semantic memory retrieval

  3. Security
    - RLS policies for memories and memory vectors
*/

-- Enable pgvector extension for vector operations (if not already enabled)
CREATE EXTENSION IF NOT EXISTS vector;

-- Create memories table
CREATE TABLE IF NOT EXISTS memories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eve_id UUID NOT NULL REFERENCES eves(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('conversation', 'task', 'fact', 'preference', 'relationship')),
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  importance INTEGER NOT NULL DEFAULT 1 CHECK (importance BETWEEN 1 AND 5),
  last_accessed TIMESTAMPTZ NOT NULL DEFAULT now(),
  expiry TIMESTAMPTZ,
  metadata JSONB,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(eve_id, key)
);

-- Create memory_vectors table for vector embeddings
CREATE TABLE IF NOT EXISTS memory_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  embedding VECTOR(1536), -- 1536 dimensions for OpenAI's text-embedding-ada-002
  text_content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for memories
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;

-- Create policies for memories
CREATE POLICY "memory_view" 
  ON memories 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = memories.company_id
    )
  );

CREATE POLICY "memory_create" 
  ON memories 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = memories.company_id
    )
  );

CREATE POLICY "memory_update" 
  ON memories 
  FOR UPDATE
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = memories.company_id
    )
  );

CREATE POLICY "memory_delete" 
  ON memories 
  FOR DELETE
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = memories.company_id
    )
  );

-- Enable RLS for memory_vectors
ALTER TABLE memory_vectors ENABLE ROW LEVEL SECURITY;

-- Create policies for memory_vectors
CREATE POLICY "memory_vector_view" 
  ON memory_vectors 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1
      FROM memories m
      JOIN users u ON u.company_id = m.company_id
      WHERE u.id = auth.uid()
      AND m.id = memory_vectors.memory_id
    )
  );

CREATE POLICY "memory_vector_create" 
  ON memory_vectors 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM memories m
      JOIN users u ON u.company_id = m.company_id
      WHERE u.id = auth.uid()
      AND m.id = memory_vectors.memory_id
    )
  );

CREATE POLICY "memory_vector_delete" 
  ON memory_vectors 
  FOR DELETE
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1
      FROM memories m
      JOIN users u ON u.company_id = m.company_id
      WHERE u.id = auth.uid()
      AND m.id = memory_vectors.memory_id
    )
  );

-- Helper function to get all memory IDs for an EVE
CREATE OR REPLACE FUNCTION get_eve_memory_ids(eve_id_param UUID)
RETURNS TABLE (id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT m.id
  FROM memories m
  WHERE m.eve_id = eve_id_param;
END;
$$ LANGUAGE plpgsql;

-- Function to search memory vectors by similarity
CREATE OR REPLACE FUNCTION search_memory_vectors(
  query_embedding VECTOR(1536),
  eve_id_param UUID,
  match_threshold FLOAT,
  match_count INT
)
RETURNS TABLE (
  id UUID,
  eve_id UUID,
  type TEXT,
  key TEXT,
  value JSONB,
  importance INTEGER,
  last_accessed TIMESTAMPTZ,
  expiry TIMESTAMPTZ,
  metadata JSONB,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    m.id,
    m.eve_id,
    m.type,
    m.key,
    m.value,
    m.importance,
    m.last_accessed,
    m.expiry,
    m.metadata,
    1 - (mv.embedding <=> query_embedding) AS similarity
  FROM
    memory_vectors mv
  JOIN
    memories m ON m.id = mv.memory_id
  WHERE
    m.eve_id = eve_id_param
    AND 1 - (mv.embedding <=> query_embedding) > match_threshold
  ORDER BY
    similarity DESC
  LIMIT
    match_count;
END;
$$ LANGUAGE plpgsql;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_memories_eve_id ON memories(eve_id);
CREATE INDEX IF NOT EXISTS idx_memories_company_id ON memories(company_id);
CREATE INDEX IF NOT EXISTS idx_memories_type ON memories(type);
CREATE INDEX IF NOT EXISTS idx_memories_key ON memories(key);
CREATE INDEX IF NOT EXISTS idx_memories_last_accessed ON memories(last_accessed);
CREATE INDEX IF NOT EXISTS idx_memory_vectors_memory_id ON memory_vectors(memory_id);