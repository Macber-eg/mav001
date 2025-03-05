-- Fix for company creation permissions
-- This migration addresses the RLS policy violation when creating a company

-- Create a new policy that allows authenticated users to insert into companies table
-- during the initial account setup/registration flow
DROP POLICY IF EXISTS "company_registration" ON companies;
CREATE POLICY "company_registration" 
  ON companies 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Create a transitional policy for user creation to avoid circular dependencies
-- This allows users to create their record and connect to a company
DROP POLICY IF EXISTS "user_company_creation" ON users;
CREATE POLICY "user_company_creation" 
  ON users 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Make sure the get_user_company_id function handles NULL cases gracefully
CREATE OR REPLACE FUNCTION get_user_company_id(user_id UUID) 
RETURNS UUID AS $$
DECLARE
  user_company_id UUID;
BEGIN
  -- Handle the case where the user record doesn't exist yet
  BEGIN
    SELECT company_id INTO user_company_id
    FROM users
    WHERE id = user_id;
    
    RETURN user_company_id;
  EXCEPTION
    WHEN OTHERS THEN
      RETURN NULL;
  END;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a more permissive policy for the initial user setup flow
DROP POLICY IF EXISTS "initial_setup_permission" ON companies;
CREATE POLICY "initial_setup_permission" 
  ON companies 
  FOR ALL 
  TO authenticated 
  USING (
    -- Either the company belongs to the user
    (id = get_user_company_id(auth.uid()))
    -- Or the user has no company yet (during registration)
    OR get_user_company_id(auth.uid()) IS NULL
  );