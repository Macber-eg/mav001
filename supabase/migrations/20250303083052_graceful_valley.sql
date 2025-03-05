-- Fix memory system SQL queries with explicit table aliases and CTEs

-- Drop existing functions to recreate them with proper table references
DROP FUNCTION IF EXISTS search_memory_vectors(VECTOR(1536), UUID, FLOAT, INT);

-- Recreate search function with explicit table aliases and CTEs
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
  -- Get the user's company_id first to avoid ambiguity
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

-- Update memory policies to use subqueries for company_id checks
DROP POLICY IF EXISTS "memories_view" ON memories;
CREATE POLICY "memories_view" 
  ON memories 
  FOR SELECT 
  TO authenticated 
  USING (
    memories.company_id = (
      SELECT u.company_id 
      FROM users u 
      WHERE u.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "memories_create" ON memories;
CREATE POLICY "memories_create" 
  ON memories 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    memories.company_id = (
      SELECT u.company_id 
      FROM users u 
      WHERE u.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "memories_update" ON memories;
CREATE POLICY "memories_update" 
  ON memories 
  FOR UPDATE
  TO authenticated 
  USING (
    memories.company_id = (
      SELECT u.company_id 
      FROM users u 
      WHERE u.id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "memories_delete" ON memories;
CREATE POLICY "memories_delete" 
  ON memories 
  FOR DELETE
  TO authenticated 
  USING (
    memories.company_id = (
      SELECT u.company_id 
      FROM users u 
      WHERE u.id = auth.uid()
    )
  );

-- Update memory vectors policies to use explicit table references
DROP POLICY IF EXISTS "memory_vectors_view" ON memory_vectors;
CREATE POLICY "memory_vectors_view" 
  ON memory_vectors 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1
      FROM memories mem
      WHERE mem.id = memory_vectors.memory_id
      AND mem.company_id = (
        SELECT usr.company_id 
        FROM users usr 
        WHERE usr.id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "memory_vectors_create" ON memory_vectors;
CREATE POLICY "memory_vectors_create" 
  ON memory_vectors 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM memories mem
      WHERE mem.id = memory_vectors.memory_id
      AND mem.company_id = (
        SELECT usr.company_id 
        FROM users usr 
        WHERE usr.id = auth.uid()
      )
    )
  );

DROP POLICY IF EXISTS "memory_vectors_delete" ON memory_vectors;
CREATE POLICY "memory_vectors_delete" 
  ON memory_vectors 
  FOR DELETE
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1
      FROM memories mem
      WHERE mem.id = memory_vectors.memory_id
      AND mem.company_id = (
        SELECT usr.company_id 
        FROM users usr 
        WHERE usr.id = auth.uid()
      )
    )
  );

-- Create helper function to get company ID with explicit alias
CREATE OR REPLACE FUNCTION get_memory_company_id() 
RETURNS UUID AS $$
DECLARE
  company_id_result UUID;
BEGIN
  SELECT usr.company_id INTO company_id_result
  FROM users usr
  WHERE usr.id = auth.uid();
  RETURN company_id_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;