/*
  # Add Knowledge Base System

  1. New Tables
    - `company_knowledge` - Company-wide knowledge base
      - `id` (uuid, primary key)
      - `company_id` (uuid, references companies)
      - `category` (text) - e.g., 'policy', 'procedure', 'domain'
      - `key` (text)
      - `value` (jsonb)
      - `importance` (integer)
      - `is_private` (boolean)
      - `metadata` (jsonb)
      - `created_at`, `updated_at` (timestamptz)
    
    - `company_knowledge_vectors` - Vector embeddings for company knowledge
      - `id` (uuid, primary key)
      - `knowledge_id` (uuid, references company_knowledge)
      - `embedding` (vector)
      - `text_content` (text)
    
    - `eve_knowledge` - EVE-specific knowledge base
      - `id` (uuid, primary key)
      - `eve_id` (uuid, references eves)
      - `category` (text)
      - `key` (text)
      - `value` (jsonb)
      - `importance` (integer)
      - `is_private` (boolean)
      - `metadata` (jsonb)
      - `created_at`, `updated_at` (timestamptz)
    
    - `eve_knowledge_vectors` - Vector embeddings for EVE knowledge
      - `id` (uuid, primary key)
      - `knowledge_id` (uuid, references eve_knowledge)
      - `embedding` (vector)
      - `text_content` (text)

  2. Security
    - Enable RLS on all tables
    - Add policies for proper access control
    - Ensure company isolation

  3. Functions
    - Vector search functions for both company and EVE knowledge
    - Knowledge management helper functions
*/

-- Create company knowledge table
CREATE TABLE IF NOT EXISTS company_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  importance INTEGER NOT NULL DEFAULT 1 CHECK (importance BETWEEN 1 AND 5),
  is_private BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, key)
);

-- Create company knowledge vectors table
CREATE TABLE IF NOT EXISTS company_knowledge_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_id UUID NOT NULL REFERENCES company_knowledge(id) ON DELETE CASCADE,
  embedding VECTOR(1536), -- OpenAI's text-embedding-ada-002 dimensions
  text_content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create EVE knowledge table
CREATE TABLE IF NOT EXISTS eve_knowledge (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eve_id UUID NOT NULL REFERENCES eves(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  key TEXT NOT NULL,
  value JSONB NOT NULL,
  importance INTEGER NOT NULL DEFAULT 1 CHECK (importance BETWEEN 1 AND 5),
  is_private BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(eve_id, key)
);

-- Create EVE knowledge vectors table
CREATE TABLE IF NOT EXISTS eve_knowledge_vectors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  knowledge_id UUID NOT NULL REFERENCES eve_knowledge(id) ON DELETE CASCADE,
  embedding VECTOR(1536),
  text_content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE company_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_knowledge_vectors ENABLE ROW LEVEL SECURITY;
ALTER TABLE eve_knowledge ENABLE ROW LEVEL SECURITY;
ALTER TABLE eve_knowledge_vectors ENABLE ROW LEVEL SECURITY;

-- Company Knowledge Policies

-- View policy for company knowledge
CREATE POLICY "company_knowledge_view" 
  ON company_knowledge 
  FOR SELECT 
  TO authenticated 
  USING (
    company_id = (
      SELECT u.company_id 
      FROM users u 
      WHERE u.id = auth.uid()
    )
    AND (
      NOT is_private 
      OR EXISTS (
        SELECT 1 
        FROM users u 
        WHERE u.id = auth.uid() 
        AND u.role = 'company_admin'
      )
    )
  );

-- Create policy for company knowledge
CREATE POLICY "company_knowledge_create" 
  ON company_knowledge 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    company_id = (
      SELECT u.company_id 
      FROM users u 
      WHERE u.id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 
      FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'company_admin'
    )
  );

-- Update policy for company knowledge
CREATE POLICY "company_knowledge_update" 
  ON company_knowledge 
  FOR UPDATE
  TO authenticated 
  USING (
    company_id = (
      SELECT u.company_id 
      FROM users u 
      WHERE u.id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 
      FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'company_admin'
    )
  );

-- Delete policy for company knowledge
CREATE POLICY "company_knowledge_delete" 
  ON company_knowledge 
  FOR DELETE
  TO authenticated 
  USING (
    company_id = (
      SELECT u.company_id 
      FROM users u 
      WHERE u.id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 
      FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'company_admin'
    )
  );

-- Company Knowledge Vectors Policies

-- View policy for company knowledge vectors
CREATE POLICY "company_knowledge_vectors_view" 
  ON company_knowledge_vectors 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1
      FROM company_knowledge ck
      WHERE ck.id = company_knowledge_vectors.knowledge_id
      AND ck.company_id = (
        SELECT u.company_id 
        FROM users u 
        WHERE u.id = auth.uid()
      )
      AND (
        NOT ck.is_private 
        OR EXISTS (
          SELECT 1 
          FROM users u 
          WHERE u.id = auth.uid() 
          AND u.role = 'company_admin'
        )
      )
    )
  );

-- Create policy for company knowledge vectors
CREATE POLICY "company_knowledge_vectors_create" 
  ON company_knowledge_vectors 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM company_knowledge ck
      WHERE ck.id = company_knowledge_vectors.knowledge_id
      AND ck.company_id = (
        SELECT u.company_id 
        FROM users u 
        WHERE u.id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 
        FROM users u 
        WHERE u.id = auth.uid() 
        AND u.role = 'company_admin'
      )
    )
  );

-- Delete policy for company knowledge vectors
CREATE POLICY "company_knowledge_vectors_delete" 
  ON company_knowledge_vectors 
  FOR DELETE
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1
      FROM company_knowledge ck
      WHERE ck.id = company_knowledge_vectors.knowledge_id
      AND ck.company_id = (
        SELECT u.company_id 
        FROM users u 
        WHERE u.id = auth.uid()
      )
      AND EXISTS (
        SELECT 1 
        FROM users u 
        WHERE u.id = auth.uid() 
        AND u.role = 'company_admin'
      )
    )
  );

-- EVE Knowledge Policies

-- View policy for EVE knowledge
CREATE POLICY "eve_knowledge_view" 
  ON eve_knowledge 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1
      FROM eves e
      WHERE e.id = eve_knowledge.eve_id
      AND e.company_id = (
        SELECT u.company_id 
        FROM users u 
        WHERE u.id = auth.uid()
      )
      AND (
        NOT eve_knowledge.is_private 
        OR EXISTS (
          SELECT 1 
          FROM users u 
          WHERE u.id = auth.uid() 
          AND u.role = 'company_admin'
        )
      )
    )
  );

-- Create policy for EVE knowledge
CREATE POLICY "eve_knowledge_create" 
  ON eve_knowledge 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM eves e
      WHERE e.id = eve_knowledge.eve_id
      AND e.company_id = (
        SELECT u.company_id 
        FROM users u 
        WHERE u.id = auth.uid()
      )
    )
  );

-- Update policy for EVE knowledge
CREATE POLICY "eve_knowledge_update" 
  ON eve_knowledge 
  FOR UPDATE
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1
      FROM eves e
      WHERE e.id = eve_knowledge.eve_id
      AND e.company_id = (
        SELECT u.company_id 
        FROM users u 
        WHERE u.id = auth.uid()
      )
    )
  );

-- Delete policy for EVE knowledge
CREATE POLICY "eve_knowledge_delete" 
  ON eve_knowledge 
  FOR DELETE
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1
      FROM eves e
      WHERE e.id = eve_knowledge.eve_id
      AND e.company_id = (
        SELECT u.company_id 
        FROM users u 
        WHERE u.id = auth.uid()
      )
    )
  );

-- EVE Knowledge Vectors Policies

-- View policy for EVE knowledge vectors
CREATE POLICY "eve_knowledge_vectors_view" 
  ON eve_knowledge_vectors 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1
      FROM eve_knowledge ek
      JOIN eves e ON e.id = ek.eve_id
      WHERE ek.id = eve_knowledge_vectors.knowledge_id
      AND e.company_id = (
        SELECT u.company_id 
        FROM users u 
        WHERE u.id = auth.uid()
      )
      AND (
        NOT ek.is_private 
        OR EXISTS (
          SELECT 1 
          FROM users u 
          WHERE u.id = auth.uid() 
          AND u.role = 'company_admin'
        )
      )
    )
  );

-- Create policy for EVE knowledge vectors
CREATE POLICY "eve_knowledge_vectors_create" 
  ON eve_knowledge_vectors 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM eve_knowledge ek
      JOIN eves e ON e.id = ek.eve_id
      WHERE ek.id = eve_knowledge_vectors.knowledge_id
      AND e.company_id = (
        SELECT u.company_id 
        FROM users u 
        WHERE u.id = auth.uid()
      )
    )
  );

-- Delete policy for EVE knowledge vectors
CREATE POLICY "eve_knowledge_vectors_delete" 
  ON eve_knowledge_vectors 
  FOR DELETE
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1
      FROM eve_knowledge ek
      JOIN eves e ON e.id = ek.eve_id
      WHERE ek.id = eve_knowledge_vectors.knowledge_id
      AND e.company_id = (
        SELECT u.company_id 
        FROM users u 
        WHERE u.id = auth.uid()
      )
    )
  );

-- Create function to search company knowledge
CREATE OR REPLACE FUNCTION search_company_knowledge(
  query_embedding VECTOR(1536),
  company_id_param UUID,
  match_threshold FLOAT,
  match_count INT,
  include_private BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  key TEXT,
  value JSONB,
  importance INTEGER,
  is_private BOOLEAN,
  metadata JSONB,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ck.id,
    ck.category,
    ck.key,
    ck.value,
    ck.importance,
    ck.is_private,
    ck.metadata,
    1 - (ckv.embedding <=> query_embedding) AS similarity
  FROM
    company_knowledge ck
  JOIN
    company_knowledge_vectors ckv ON ckv.knowledge_id = ck.id
  WHERE
    ck.company_id = company_id_param
    AND (NOT ck.is_private OR include_private)
    AND 1 - (ckv.embedding <=> query_embedding) > match_threshold
  ORDER BY
    similarity DESC
  LIMIT
    match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to search EVE knowledge
CREATE OR REPLACE FUNCTION search_eve_knowledge(
  query_embedding VECTOR(1536),
  eve_id_param UUID,
  match_threshold FLOAT,
  match_count INT,
  include_private BOOLEAN DEFAULT false
)
RETURNS TABLE (
  id UUID,
  category TEXT,
  key TEXT,
  value JSONB,
  importance INTEGER,
  is_private BOOLEAN,
  metadata JSONB,
  similarity FLOAT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ek.id,
    ek.category,
    ek.key,
    ek.value,
    ek.importance,
    ek.is_private,
    ek.metadata,
    1 - (ekv.embedding <=> query_embedding) AS similarity
  FROM
    eve_knowledge ek
  JOIN
    eve_knowledge_vectors ekv ON ekv.knowledge_id = ek.id
  WHERE
    ek.eve_id = eve_id_param
    AND (NOT ek.is_private OR include_private)
    AND 1 - (ekv.embedding <=> query_embedding) > match_threshold
  ORDER BY
    similarity DESC
  LIMIT
    match_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_company_knowledge_company_id ON company_knowledge(company_id);
CREATE INDEX IF NOT EXISTS idx_company_knowledge_category ON company_knowledge(category);
CREATE INDEX IF NOT EXISTS idx_company_knowledge_key ON company_knowledge(key);
CREATE INDEX IF NOT EXISTS idx_company_knowledge_importance ON company_knowledge(importance);
CREATE INDEX IF NOT EXISTS idx_company_knowledge_vectors_knowledge_id ON company_knowledge_vectors(knowledge_id);

CREATE INDEX IF NOT EXISTS idx_eve_knowledge_eve_id ON eve_knowledge(eve_id);
CREATE INDEX IF NOT EXISTS idx_eve_knowledge_category ON eve_knowledge(category);
CREATE INDEX IF NOT EXISTS idx_eve_knowledge_key ON eve_knowledge(key);
CREATE INDEX IF NOT EXISTS idx_eve_knowledge_importance ON eve_knowledge(importance);
CREATE INDEX IF NOT EXISTS idx_eve_knowledge_vectors_knowledge_id ON eve_knowledge_vectors(knowledge_id);