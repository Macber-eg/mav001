-- Fix for ambiguous users table reference error when creating EVEs
-- This migration addresses the "table reference users is ambiguous" error

-- First, let's fix the get_user_company_id function to be more explicit
CREATE OR REPLACE FUNCTION get_user_company_id(user_id UUID) 
RETURNS UUID AS $$
DECLARE
  user_company_id UUID;
BEGIN
  -- Make the table reference explicit with alias
  SELECT u.company_id INTO user_company_id
  FROM users u
  WHERE u.id = user_id;
  
  RETURN user_company_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Now fix the EVE policies to avoid ambiguous references

-- First drop the existing policies
DROP POLICY IF EXISTS "eve_company_view" ON eves;
DROP POLICY IF EXISTS "eve_admin_manage" ON eves;

-- Create updated policies with explicit table aliases
CREATE POLICY "eve_company_view" 
  ON eves 
  FOR SELECT 
  TO authenticated 
  USING (
    -- Use a direct subquery with explicit alias
    company_id = (
      SELECT u.company_id 
      FROM users u 
      WHERE u.id = auth.uid()
    )
  );

CREATE POLICY "eve_admin_manage" 
  ON eves 
  FOR ALL 
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

-- Add insert permission for authenticated users to create EVEs
CREATE POLICY "eve_insert_any" 
  ON eves 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Make sure all other policies that might affect EVE creation are fixed

-- Fix log_event function to avoid ambiguous users reference
CREATE OR REPLACE FUNCTION log_event(
  p_eve_id UUID,
  p_action_id UUID,
  p_company_id UUID,
  p_event_type TEXT,
  p_status TEXT,
  p_message TEXT,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO logs (
    eve_id, action_id, user_id, company_id, event_type, status, message, metadata
  ) VALUES (
    p_eve_id, p_action_id, auth.uid(), p_company_id, p_event_type, p_status, p_message, p_metadata
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update check_same_company function to avoid ambiguity
CREATE OR REPLACE FUNCTION check_same_company(user_id UUID, company_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM users u
    WHERE u.id = user_id
    AND u.company_id = company_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update check_company_admin function to avoid ambiguity
CREATE OR REPLACE FUNCTION check_company_admin(user_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM users u
    WHERE u.id = user_id
    AND u.role = 'company_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update check_system_admin function to avoid ambiguity
CREATE OR REPLACE FUNCTION check_system_admin(user_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM users u
    WHERE u.id = user_id
    AND u.role = 'system_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;