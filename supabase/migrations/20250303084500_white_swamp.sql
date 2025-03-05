-- Fix memory system SQL queries with explicit table references

-- Drop existing functions to recreate them with proper table references
DROP FUNCTION IF EXISTS search_memory_vectors(VECTOR(1536), UUID, FLOAT, INT);

-- Recreate search function with explicit table references
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

-- Update memory policies with simple subqueries
DROP POLICY IF EXISTS "memories_view" ON memories;
CREATE POLICY "memories_view" 
  ON memories 
  FOR SELECT 
  TO authenticated 
  USING (
    company_id = (SELECT u.company_id FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS "memories_create" ON memories;
CREATE POLICY "memories_create" 
  ON memories 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    company_id = (SELECT u.company_id FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS "memories_update" ON memories;
CREATE POLICY "memories_update" 
  ON memories 
  FOR UPDATE
  TO authenticated 
  USING (
    company_id = (SELECT u.company_id FROM users u WHERE u.id = auth.uid())
  );

DROP POLICY IF EXISTS "memories_delete" ON memories;
CREATE POLICY "memories_delete" 
  ON memories 
  FOR DELETE
  TO authenticated 
  USING (
    company_id = (SELECT u.company_id FROM users u WHERE u.id = auth.uid())
  );

-- Update memory vectors policies with simple subqueries
DROP POLICY IF EXISTS "memory_vectors_view" ON memory_vectors;
CREATE POLICY "memory_vectors_view" 
  ON memory_vectors 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1
      FROM memories m
      WHERE m.id = memory_vectors.memory_id
      AND m.company_id = (SELECT u.company_id FROM users u WHERE u.id = auth.uid())
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
      FROM memories m
      WHERE m.id = memory_vectors.memory_id
      AND m.company_id = (SELECT u.company_id FROM users u WHERE u.id = auth.uid())
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
      FROM memories m
      WHERE m.id = memory_vectors.memory_id
      AND m.company_id = (SELECT u.company_id FROM users u WHERE u.id = auth.uid())
    )
  );

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