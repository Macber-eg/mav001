-- Enable pgvector extension for vector operations
CREATE EXTENSION IF NOT EXISTS vector;

-- Drop existing tables if they exist
DROP TABLE IF EXISTS memory_vectors;
DROP TABLE IF EXISTS memories;

-- Create memories table
CREATE TABLE memories (
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
CREATE TABLE memory_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id UUID NOT NULL REFERENCES memories(id) ON DELETE CASCADE,
  embedding VECTOR(1536), -- 1536 dimensions for OpenAI's text-embedding-ada-002
  text_content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for both tables
ALTER TABLE memories ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_vectors ENABLE ROW LEVEL SECURITY;

-- Create helper function to get company ID
CREATE OR REPLACE FUNCTION get_memory_company_id() 
RETURNS UUID AS $$
DECLARE
  company_id_result UUID;
BEGIN
  SELECT u.company_id INTO company_id_result
  FROM users u
  WHERE u.id = auth.uid();
  RETURN company_id_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to search memory vectors
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
DECLARE
  user_company_id UUID;
BEGIN
  -- Get the user's company_id first
  SELECT u.company_id INTO user_company_id
  FROM users u
  WHERE u.id = auth.uid();

  -- Return the query results
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
    memories m
  JOIN
    memory_vectors mv ON mv.memory_id = m.id
  WHERE
    m.eve_id = eve_id_param
    AND m.company_id = user_company_id
    AND 1 - (mv.embedding <=> query_embedding) > match_threshold
  ORDER BY
    similarity DESC
  LIMIT
    match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create RLS policies for memories table
CREATE POLICY "memories_view" ON memories FOR SELECT 
  TO authenticated 
  USING (company_id = get_memory_company_id());

CREATE POLICY "memories_insert" ON memories FOR INSERT 
  TO authenticated 
  WITH CHECK (company_id = get_memory_company_id());

CREATE POLICY "memories_update" ON memories FOR UPDATE
  TO authenticated 
  USING (company_id = get_memory_company_id());

CREATE POLICY "memories_delete" ON memories FOR DELETE
  TO authenticated 
  USING (company_id = get_memory_company_id());

-- Create RLS policies for memory_vectors table
CREATE POLICY "memory_vectors_view" ON memory_vectors FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1
      FROM memories m
      WHERE m.id = memory_vectors.memory_id
      AND m.company_id = get_memory_company_id()
    )
  );

CREATE POLICY "memory_vectors_insert" ON memory_vectors FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM memories m
      WHERE m.id = memory_vectors.memory_id
      AND m.company_id = get_memory_company_id()
    )
  );

CREATE POLICY "memory_vectors_delete" ON memory_vectors FOR DELETE
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1
      FROM memories m
      WHERE m.id = memory_vectors.memory_id
      AND m.company_id = get_memory_company_id()
    )
  );

-- Create indexes for better performance
CREATE INDEX idx_memories_eve_id ON memories(eve_id);
CREATE INDEX idx_memories_company_id ON memories(company_id);
CREATE INDEX idx_memories_type ON memories(type);
CREATE INDEX idx_memories_key ON memories(key);
CREATE INDEX idx_memories_last_accessed ON memories(last_accessed);
CREATE INDEX idx_memory_vectors_memory_id ON memory_vectors(memory_id);