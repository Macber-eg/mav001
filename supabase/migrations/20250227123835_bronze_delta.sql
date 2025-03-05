/*
  # Complete policy restructuring to eliminate recursion

  1. Changes
    - Drop ALL policies from ALL affected tables
    - Create new, simplified policies that eliminate recursion
    - Use direct user ID checks where possible
    - Restructure company-related queries to avoid circular references
    - Create a function to safely check company membership
*/

-- Create a function to safely check if a user belongs to a company
CREATE OR REPLACE FUNCTION check_same_company(user_id UUID, company_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM auth.users 
    JOIN users ON users.id = user_id
    WHERE users.company_id = company_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to safely check if a user is a company admin
CREATE OR REPLACE FUNCTION check_company_admin(user_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM auth.users 
    JOIN users ON users.id = user_id
    WHERE users.role = 'company_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to safely check if a user is a system admin
CREATE OR REPLACE FUNCTION check_system_admin(user_id UUID) 
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM auth.users 
    JOIN users ON users.id = user_id
    WHERE users.role = 'system_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a function to get a user's company_id
CREATE OR REPLACE FUNCTION get_user_company_id(user_id UUID) 
RETURNS UUID AS $$
DECLARE
  user_company_id UUID;
BEGIN
  SELECT company_id INTO user_company_id
  FROM users
  WHERE id = user_id;
  
  RETURN user_company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- STEP 1: Drop ALL policies from ALL tables
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

-- Drop all company table policies
DROP POLICY IF EXISTS "Company admins can manage their company" ON companies;
DROP POLICY IF EXISTS "Users can view their company" ON companies;
DROP POLICY IF EXISTS "companies_admin_all" ON companies;
DROP POLICY IF EXISTS "companies_user_select" ON companies;

-- Drop all EVE table policies
DROP POLICY IF EXISTS "Users can view EVEs in their company" ON eves;
DROP POLICY IF EXISTS "Company admins can manage EVEs in their company" ON eves;
DROP POLICY IF EXISTS "eves_user_select" ON eves;
DROP POLICY IF EXISTS "eves_admin_all" ON eves;

-- Drop all log table policies
DROP POLICY IF EXISTS "Users can view logs in their company" ON logs;
DROP POLICY IF EXISTS "System can insert logs" ON logs;
DROP POLICY IF EXISTS "logs_user_select" ON logs;

-- Drop all action table policies
DROP POLICY IF EXISTS "Users can view global actions and actions in their company" ON actions;
DROP POLICY IF EXISTS "Company admins can manage actions in their company" ON actions;

-- Drop all eve_actions table policies
DROP POLICY IF EXISTS "Users can view EVE actions in their company" ON eve_actions;
DROP POLICY IF EXISTS "Company admins can manage EVE actions in their company" ON eve_actions;

-- Drop all profile table policies
DROP POLICY IF EXISTS "Users can view and manage their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their company" ON profiles;

-- =============================================
-- STEP 2: Create simplified policies without recursion
-- =============================================

-- ---- USER TABLE POLICIES ----

-- Self access policy
CREATE POLICY "user_self_access" 
  ON users 
  FOR ALL
  TO authenticated 
  USING (id = auth.uid());

-- User registration policy (temporary)
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
  USING (company_id = get_user_company_id(auth.uid()));

-- Admin policies
CREATE POLICY "user_admin_management" 
  ON users 
  FOR ALL
  TO authenticated 
  USING (
    (check_company_admin(auth.uid()) AND company_id = get_user_company_id(auth.uid()))
    OR check_system_admin(auth.uid())
  );

-- ---- COMPANY TABLE POLICIES ----

-- View own company
CREATE POLICY "company_view_own" 
  ON companies 
  FOR SELECT 
  TO authenticated 
  USING (id = get_user_company_id(auth.uid()));

-- Manage company as admin
CREATE POLICY "company_admin_manage" 
  ON companies 
  FOR ALL 
  TO authenticated 
  USING (
    id = get_user_company_id(auth.uid()) AND check_company_admin(auth.uid())
  );

-- ---- EVE TABLE POLICIES ----

-- View EVEs in same company
CREATE POLICY "eve_company_view" 
  ON eves 
  FOR SELECT 
  TO authenticated 
  USING (company_id = get_user_company_id(auth.uid()));

-- Manage EVEs as admin
CREATE POLICY "eve_admin_manage" 
  ON eves 
  FOR ALL 
  TO authenticated 
  USING (
    company_id = get_user_company_id(auth.uid()) AND check_company_admin(auth.uid())
  );

-- ---- ACTION TABLE POLICIES ----

-- View actions (global or company-specific)
CREATE POLICY "action_view" 
  ON actions 
  FOR SELECT 
  TO authenticated 
  USING (
    is_global OR company_id = get_user_company_id(auth.uid())
  );

-- Manage actions as admin
CREATE POLICY "action_admin_manage" 
  ON actions 
  FOR ALL 
  TO authenticated 
  USING (
    company_id = get_user_company_id(auth.uid()) AND check_company_admin(auth.uid())
  );

-- ---- EVE_ACTIONS TABLE POLICIES ----

-- View EVE actions in same company
CREATE POLICY "eve_action_view" 
  ON eve_actions 
  FOR SELECT 
  TO authenticated 
  USING (
    eve_id IN (
      SELECT id FROM eves 
      WHERE company_id = get_user_company_id(auth.uid())
    )
  );

-- Manage EVE actions as admin
CREATE POLICY "eve_action_admin_manage" 
  ON eve_actions 
  FOR ALL 
  TO authenticated 
  USING (
    eve_id IN (
      SELECT id FROM eves 
      WHERE company_id = get_user_company_id(auth.uid())
    ) AND check_company_admin(auth.uid())
  );

-- ---- LOGS TABLE POLICIES ----

-- View logs in same company
CREATE POLICY "log_company_view" 
  ON logs 
  FOR SELECT 
  TO authenticated 
  USING (company_id = get_user_company_id(auth.uid()));

-- Allow log insertion
CREATE POLICY "log_insert" 
  ON logs 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- ---- PROFILE TABLE POLICIES ----

-- Self profile management
CREATE POLICY "profile_self_manage" 
  ON profiles 
  FOR ALL 
  TO authenticated 
  USING (id = auth.uid());

-- View profiles in same company
CREATE POLICY "profile_company_view" 
  ON profiles 
  FOR SELECT 
  TO authenticated 
  USING (
    id IN (
      SELECT id FROM users 
      WHERE company_id = get_user_company_id(auth.uid())
    )
  );