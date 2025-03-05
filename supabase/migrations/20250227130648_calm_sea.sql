/*
  # Consolidated Database Fixes for Mavrika EVE Platform
  
  This SQL file contains all fixes for the database issues encountered:
  1. Ambiguous table references in policies
  2. Row-level security policy issues
  3. User registration workflow fixes
  
  ## Instructions for applying the migration:
  1. Go to your Supabase dashboard: https://app.supabase.com
  2. Select your project
  3. Go to the SQL Editor section
  4. Create a new query
  5. Paste this entire file into the editor
  6. Run the query
*/

-- Create helper functions for policies to avoid circular references

-- Function to safely check if a user belongs to a company
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

-- Function to safely check if a user is a company admin
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

-- Function to safely check if a user is a system admin
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

-- Function to get a user's company_id
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

-- Fix the log_event function to avoid ambiguous users reference
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

-- =============================================
-- STEP 1: Drop ALL existing policies from relevant tables
-- =============================================

-- Drop all user table policies
DROP POLICY IF EXISTS "Users can view themselves" ON users;
DROP POLICY IF EXISTS "Company admins can manage users in their company" ON users;
DROP POLICY IF EXISTS "System admins can manage all users" ON users;
DROP POLICY IF EXISTS "Company admins can view users in their company" ON users;
DROP POLICY IF EXISTS "Company admins can update users in their company" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;
DROP POLICY IF EXISTS "Users can view others in same company" ON users;
DROP POLICY IF EXISTS "Company admins can view all users in their company" ON users;
DROP POLICY IF EXISTS "Users can update themselves" ON users;
DROP POLICY IF EXISTS "System admins can select any user" ON users;
DROP POLICY IF EXISTS "System admins can update any user" ON users;
DROP POLICY IF EXISTS "System admins can insert users" ON users;
DROP POLICY IF EXISTS "System admins can delete users" ON users;
DROP POLICY IF EXISTS "users_self_access" ON users;
DROP POLICY IF EXISTS "users_insert_policy" ON users;
DROP POLICY IF EXISTS "users_company_select" ON users;
DROP POLICY IF EXISTS "users_company_admin_all" ON users;
DROP POLICY IF EXISTS "users_system_admin_all" ON users;
DROP POLICY IF EXISTS "user_self_access" ON users;
DROP POLICY IF EXISTS "user_registration" ON users;
DROP POLICY IF EXISTS "user_company_visibility" ON users;
DROP POLICY IF EXISTS "user_admin_management" ON users;
DROP POLICY IF EXISTS "user_company_creation" ON users;

-- Drop all company table policies
DROP POLICY IF EXISTS "Company admins can manage their company" ON companies;
DROP POLICY IF EXISTS "Users can view their company" ON companies;
DROP POLICY IF EXISTS "companies_admin_all" ON companies;
DROP POLICY IF EXISTS "companies_user_select" ON companies;
DROP POLICY IF EXISTS "company_view_own" ON companies;
DROP POLICY IF EXISTS "company_admin_manage" ON companies;
DROP POLICY IF EXISTS "company_registration" ON companies;
DROP POLICY IF EXISTS "initial_setup_permission" ON companies;

-- Drop all EVE table policies
DROP POLICY IF EXISTS "Users can view EVEs in their company" ON eves;
DROP POLICY IF EXISTS "Company admins can manage EVEs in their company" ON eves;
DROP POLICY IF EXISTS "eves_user_select" ON eves;
DROP POLICY IF EXISTS "eves_admin_all" ON eves;
DROP POLICY IF EXISTS "eve_company_view" ON eves;
DROP POLICY IF EXISTS "eve_admin_manage" ON eves;
DROP POLICY IF EXISTS "eve_insert_any" ON eves;

-- Drop all action table policies
DROP POLICY IF EXISTS "Users can view global actions and actions in their company" ON actions;
DROP POLICY IF EXISTS "Company admins can manage actions in their company" ON actions;
DROP POLICY IF EXISTS "action_view" ON actions;
DROP POLICY IF EXISTS "action_admin_manage" ON actions;

-- Drop all eve_actions table policies
DROP POLICY IF EXISTS "Users can view EVE actions in their company" ON eve_actions;
DROP POLICY IF EXISTS "Company admins can manage EVE actions in their company" ON eve_actions;
DROP POLICY IF EXISTS "eve_action_view" ON eve_actions;
DROP POLICY IF EXISTS "eve_action_admin_manage" ON eve_actions;

-- Drop all log table policies
DROP POLICY IF EXISTS "Users can view logs in their company" ON logs;
DROP POLICY IF EXISTS "System can insert logs" ON logs;
DROP POLICY IF EXISTS "logs_user_select" ON logs;
DROP POLICY IF EXISTS "log_company_view" ON logs;
DROP POLICY IF EXISTS "log_insert" ON logs;

-- Drop all profile table policies
DROP POLICY IF EXISTS "Users can view and manage their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their company" ON profiles;
DROP POLICY IF EXISTS "profile_self_manage" ON profiles;
DROP POLICY IF EXISTS "profile_company_view" ON profiles;

-- =============================================
-- STEP 2: Create new, fixed policies
-- =============================================

-- ---- USER TABLE POLICIES ----

-- Self access policy
CREATE POLICY "user_self_access" 
  ON users 
  FOR ALL
  TO authenticated 
  USING (id = auth.uid());

-- User registration policy
CREATE POLICY "user_registration" 
  ON users 
  FOR INSERT
  TO authenticated 
  WITH CHECK (true);

-- User company-wide visibility
CREATE POLICY "user_company_visibility" 
  ON users 
  FOR SELECT
  TO authenticated 
  USING (
    -- Use an explicit alias to avoid ambiguity
    EXISTS (
      SELECT 1 
      FROM users u
      WHERE u.id = auth.uid() 
      AND u.company_id = users.company_id
    )
  );

-- ---- COMPANY TABLE POLICIES ----

-- Allow company creation during signup
CREATE POLICY "company_registration" 
  ON companies 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Allow users to view their own company
CREATE POLICY "company_view_own" 
  ON companies 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM users u
      WHERE u.id = auth.uid() 
      AND u.company_id = companies.id
    )
  );

-- Allow company admins to manage their company
CREATE POLICY "company_admin_manage" 
  ON companies 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM users u
      WHERE u.id = auth.uid() 
      AND u.role = 'company_admin' 
      AND u.company_id = companies.id
    )
  );

-- ---- EVE TABLE POLICIES ----

-- Allow users to view EVEs in their company
CREATE POLICY "eve_company_view" 
  ON eves 
  FOR SELECT 
  TO authenticated 
  USING (
    -- Use explicit alias to avoid ambiguity
    EXISTS (
      SELECT 1 
      FROM users u
      WHERE u.id = auth.uid() 
      AND u.company_id = eves.company_id
    )
  );

-- Allow company admins to manage EVEs
CREATE POLICY "eve_admin_manage" 
  ON eves 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM users u
      WHERE u.id = auth.uid() 
      AND u.role = 'company_admin' 
      AND u.company_id = eves.company_id
    )
  );

-- Allow creation of EVEs by any authenticated user
CREATE POLICY "eve_insert_any" 
  ON eves 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- ---- ACTION TABLE POLICIES ----

-- Allow users to view actions that are global or in their company
CREATE POLICY "action_view" 
  ON actions 
  FOR SELECT 
  TO authenticated 
  USING (
     
    is_global OR EXISTS (
      SELECT 1 
      FROM users u
      WHERE u.id = auth.uid() 
      AND u.company_id = actions.company_id
    )
  );

-- Allow company admins to manage actions in their company
CREATE POLICY "action_admin_manage" 
  ON actions 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM users u
      WHERE u.id = auth.uid() 
      AND u.role = 'company_admin' 
      AND u.company_id = actions.company_id
    )
  );

-- Allow creation of actions by any authenticated user
CREATE POLICY "action_insert_any" 
  ON actions 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- ---- EVE_ACTIONS TABLE POLICIES ----

-- Allow users to view EVE actions in their company
CREATE POLICY "eve_action_view" 
  ON eve_actions 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1
      FROM eves e
      JOIN users u ON u.company_id = e.company_id
      WHERE u.id = auth.uid()
      AND e.id = eve_actions.eve_id
    )
  );

-- Allow company admins to manage EVE actions
CREATE POLICY "eve_action_admin_manage" 
  ON eve_actions 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1
      FROM eves e
      JOIN users u ON u.company_id = e.company_id
      WHERE u.id = auth.uid()
      AND u.role = 'company_admin'
      AND e.id = eve_actions.eve_id
    )
  );

-- Allow creation of EVE actions by any authenticated user
CREATE POLICY "eve_action_insert_any" 
  ON eve_actions 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- ---- LOGS TABLE POLICIES ----

-- Allow users to view logs in their company
CREATE POLICY "log_company_view" 
  ON logs 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1
      FROM users u
      WHERE u.id = auth.uid()
      AND u.company_id = logs.company_id
    )
  );

-- Allow any authenticated user to insert logs
CREATE POLICY "log_insert" 
  ON logs 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- ---- PROFILE TABLE POLICIES ----

-- Allow users to manage their own profile
CREATE POLICY "profile_self_manage" 
  ON profiles 
  FOR ALL 
  TO authenticated 
  USING (id = auth.uid());

-- Allow users to view profiles in their company
CREATE POLICY "profile_company_view" 
  ON profiles 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1
      FROM users u1
      JOIN users u2 ON u1.company_id = u2.company_id
      WHERE u1.id = auth.uid()
      AND u2.id = profiles.id
    )
  );

-- Add DEFAULT values for companies table columns
ALTER TABLE companies 
ALTER COLUMN primary_color SET DEFAULT '#00BFA6',
ALTER COLUMN secondary_color SET DEFAULT '#1A1A40';

-- Create helpful index for better performance
CREATE INDEX IF NOT EXISTS idx_users_company_role ON users(company_id, role);
CREATE INDEX IF NOT EXISTS idx_eves_company_id ON eves(company_id);
CREATE INDEX IF NOT EXISTS idx_logs_company_id ON logs(company_id);
CREATE INDEX IF NOT EXISTS idx_eve_actions_eve_id ON eve_actions(eve_id);