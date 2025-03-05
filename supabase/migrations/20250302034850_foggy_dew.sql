-- Fix memory system with proper table references and no duplicate policies

-- Drop existing functions and policies to start clean
DROP FUNCTION IF EXISTS search_memory_vectors(VECTOR(1536), UUID, FLOAT, INT);
DROP FUNCTION IF EXISTS get_eve_memory_ids(UUID);

-- Drop existing policies if they exist
DO $$ 
BEGIN
  -- Drop memories policies
  DROP POLICY IF EXISTS "memories_view" ON memories;
  DROP POLICY IF EXISTS "memories_create" ON memories;
  DROP POLICY IF EXISTS "memories_update" ON memories;
  DROP POLICY IF EXISTS "memories_delete" ON memories;
  
  -- Drop memory_vectors policies
  DROP POLICY IF EXISTS "memory_vectors_view" ON memory_vectors;
  DROP POLICY IF EXISTS "memory_vectors_create" ON memory_vectors;
  DROP POLICY IF EXISTS "memory_vectors_delete" ON memory_vectors;
END $$;

-- Recreate the search function with explicit table references
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
    memories.id,
    memories.eve_id,
    memories.type,
    memories.key,
    memories.value,
    memories.importance,
    memories.last_accessed,
    memories.expiry,
    memories.metadata,
    1 - (mv.embedding <=> query_embedding) AS similarity
  FROM
    memory_vectors mv
  JOIN
    memories ON memories.id = mv.memory_id
  WHERE
    memories.eve_id = eve_id_param
    AND 1 - (mv.embedding <=> query_embedding) > match_threshold
  ORDER BY
    similarity DESC
  LIMIT
    match_count;
END;
$$ LANGUAGE plpgsql;

-- Recreate helper function with explicit table reference
CREATE OR REPLACE FUNCTION get_eve_memory_ids(eve_id_param UUID)
RETURNS TABLE (id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT memories.id
  FROM memories
  WHERE memories.eve_id = eve_id_param;
END;
$$ LANGUAGE plpgsql;

-- Recreate policies with explicit table aliases and unique names
CREATE POLICY "memories_view" 
  ON memories 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1
      FROM users AS u
      WHERE u.id = auth.uid()
      AND u.company_id = memories.company_id
    )
  );

CREATE POLICY "memories_create" 
  ON memories 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM users AS u
      WHERE u.id = auth.uid()
      AND u.company_id = memories.company_id
    )
  );

CREATE POLICY "memories_update" 
  ON memories 
  FOR UPDATE
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1
      FROM users AS u
      WHERE u.id = auth.uid()
      AND u.company_id = memories.company_id
    )
  );

CREATE POLICY "memories_delete" 
  ON memories 
  FOR DELETE
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1
      FROM users AS u
      WHERE u.id = auth.uid()
      AND u.company_id = memories.company_id
    )
  );

-- Recreate memory_vectors policies with explicit table aliases
CREATE POLICY "memory_vectors_view" 
  ON memory_vectors 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1
      FROM memories AS m
      JOIN users AS u ON u.company_id = m.company_id
      WHERE u.id = auth.uid()
      AND m.id = memory_vectors.memory_id
    )
  );

CREATE POLICY "memory_vectors_create" 
  ON memory_vectors 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM memories AS m
      JOIN users AS u ON u.company_id = m.company_id
      WHERE u.id = auth.uid()
      AND m.id = memory_vectors.memory_id
    )
  );

CREATE POLICY "memory_vectors_delete" 
  ON memory_vectors 
  FOR DELETE
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1
      FROM memories AS m
      JOIN users AS u ON u.company_id = m.company_id
      WHERE u.id = auth.uid()
      AND m.id = memory_vectors.memory_id
    )
  );

-- Ensure indexes exist with explicit names
DROP INDEX IF EXISTS idx_memories_eve_id;
DROP INDEX IF EXISTS idx_memories_company_id;
DROP INDEX IF EXISTS idx_memories_type;
DROP INDEX IF EXISTS idx_memories_key;
DROP INDEX IF EXISTS idx_memories_last_accessed;
DROP INDEX IF EXISTS idx_memory_vectors_memory_id;

CREATE INDEX idx_memories_eve_id ON memories(eve_id);
CREATE INDEX idx_memories_company_id ON memories(company_id);
CREATE INDEX idx_memories_type ON memories(type);
CREATE INDEX idx_memories_key ON memories(key);
CREATE INDEX idx_memories_last_accessed ON memories(last_accessed);
CREATE INDEX idx_memory_vectors_memory_id ON memory_vectors(memory_id);