-- Fix for Supabase database policy issues
-- This migration addresses multiple issues:
-- 1. Infinite recursion in user policies
-- 2. Row-level security violations during company creation
-- 3. Ambiguous table references causing errors

-- =============================================
-- STEP 1: Create helper functions to avoid recursion 
-- =============================================

-- Function to safely check if a user belongs to a company without recursion
DROP FUNCTION IF EXISTS check_user_company;
CREATE OR REPLACE FUNCTION check_user_company(user_id UUID, company_id UUID) 
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

-- Function to safely check if a user is a company admin without recursion
DROP FUNCTION IF EXISTS check_user_is_admin;
CREATE OR REPLACE FUNCTION check_user_is_admin(user_id UUID) 
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

-- Function to safely check if a user is a system admin without recursion
DROP FUNCTION IF EXISTS check_user_is_system_admin;
CREATE OR REPLACE FUNCTION check_user_is_system_admin(user_id UUID) 
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

-- Function to get a user's company_id without recursion
DROP FUNCTION IF EXISTS get_user_company;
CREATE OR REPLACE FUNCTION get_user_company(user_id UUID) 
RETURNS UUID AS $$
DECLARE
  company_id UUID;
BEGIN
  SELECT u.company_id INTO company_id
  FROM users u
  WHERE u.id = user_id;
  
  RETURN company_id;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =============================================
-- STEP 2: Drop ALL existing policies to start fresh
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
DROP POLICY IF EXISTS "user_company_view" ON users;

-- Drop all company table policies
DROP POLICY IF EXISTS "Company admins can manage their company" ON companies;
DROP POLICY IF EXISTS "Users can view their company" ON companies;
DROP POLICY IF EXISTS "companies_admin_all" ON companies;
DROP POLICY IF EXISTS "companies_user_select" ON companies;
DROP POLICY IF EXISTS "company_view_own" ON companies;
DROP POLICY IF EXISTS "company_admin_manage" ON companies;
DROP POLICY IF EXISTS "company_registration" ON companies;
DROP POLICY IF EXISTS "initial_setup_permission" ON companies;
DROP POLICY IF EXISTS "company_user_view" ON companies;
DROP POLICY IF EXISTS "company_admin_update" ON companies;
DROP POLICY IF EXISTS "company_admin_delete" ON companies;

-- Drop all EVE table policies
DROP POLICY IF EXISTS "Users can view EVEs in their company" ON eves;
DROP POLICY IF EXISTS "Company admins can manage EVEs in their company" ON eves;
DROP POLICY IF EXISTS "eves_user_select" ON eves;
DROP POLICY IF EXISTS "eves_admin_all" ON eves;
DROP POLICY IF EXISTS "eve_company_view" ON eves;
DROP POLICY IF EXISTS "eve_admin_manage" ON eves;
DROP POLICY IF EXISTS "eve_insert_any" ON eves;
DROP POLICY IF EXISTS "eve_create" ON eves;
DROP POLICY IF EXISTS "eve_admin_update" ON eves;
DROP POLICY IF EXISTS "eve_admin_delete" ON eves;

-- Drop all action table policies
DROP POLICY IF EXISTS "action_view" ON actions;
DROP POLICY IF EXISTS "action_create" ON actions;
DROP POLICY IF EXISTS "action_admin_update" ON actions;
DROP POLICY IF EXISTS "action_admin_delete" ON actions;
DROP POLICY IF EXISTS "action_admin_manage" ON actions;
DROP POLICY IF EXISTS "action_insert_any" ON actions;
DROP POLICY IF EXISTS "Users can view global actions and actions in their company" ON actions;
DROP POLICY IF EXISTS "Company admins can manage actions in their company" ON actions;

-- Drop all EVE action table policies
DROP POLICY IF EXISTS "eve_action_view" ON eve_actions;
DROP POLICY IF EXISTS "eve_action_create" ON eve_actions;
DROP POLICY IF EXISTS "eve_action_admin_update" ON eve_actions;
DROP POLICY IF EXISTS "eve_action_admin_delete" ON eve_actions;
DROP POLICY IF EXISTS "eve_action_admin_manage" ON eve_actions;
DROP POLICY IF EXISTS "eve_action_insert_any" ON eve_actions;
DROP POLICY IF EXISTS "Users can view EVE actions in their company" ON eve_actions;
DROP POLICY IF EXISTS "Company admins can manage EVE actions in their company" ON eve_actions;

-- Drop all log table policies
DROP POLICY IF EXISTS "log_company_view" ON logs;
DROP POLICY IF EXISTS "log_create" ON logs;
DROP POLICY IF EXISTS "log_insert" ON logs;
DROP POLICY IF EXISTS "Users can view logs in their company" ON logs;
DROP POLICY IF EXISTS "System can insert logs" ON logs;
DROP POLICY IF EXISTS "logs_user_select" ON logs;

-- Drop all profile table policies
DROP POLICY IF EXISTS "profile_self_manage" ON profiles;
DROP POLICY IF EXISTS "profile_company_view" ON profiles;
DROP POLICY IF EXISTS "Users can view and manage their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view profiles in their company" ON profiles;

-- =============================================
-- STEP 3: Create new, simplified policies
-- =============================================

-- ---- USERS TABLE POLICIES ----

-- Allow users to access their own record (most basic, always needed)
CREATE POLICY "user_self_access" 
  ON users 
  FOR ALL
  TO authenticated 
  USING (id = auth.uid());

-- Allow new user registration (needed for signup flow)
CREATE POLICY "user_registration" 
  ON users 
  FOR INSERT
  TO authenticated 
  WITH CHECK (true);

-- Allow users to see other users in their company
CREATE POLICY "user_company_view" 
  ON users 
  FOR SELECT
  TO authenticated 
  USING (
    -- This avoids recursion by using the helper function
    check_user_company(auth.uid(), company_id)
  );

-- ---- COMPANIES TABLE POLICIES ----

-- Critical: Allow company creation during signup
CREATE POLICY "company_registration" 
  ON companies 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Allow users to view their own company
CREATE POLICY "company_user_view" 
  ON companies 
  FOR SELECT 
  TO authenticated 
  USING (
    id = get_user_company(auth.uid()) OR
    get_user_company(auth.uid()) IS NULL
  );

-- Allow company admins to update their company
CREATE POLICY "company_admin_update" 
  ON companies 
  FOR UPDATE
  TO authenticated 
  USING (
    id = get_user_company(auth.uid()) AND 
    check_user_is_admin(auth.uid())
  );

-- Allow company admins to delete their company
CREATE POLICY "company_admin_delete" 
  ON companies 
  FOR DELETE
  TO authenticated 
  USING (
    id = get_user_company(auth.uid()) AND 
    check_user_is_admin(auth.uid())
  );

-- ---- EVES TABLE POLICIES ----

-- Allow users to view EVEs in their company
CREATE POLICY "eve_company_view" 
  ON eves 
  FOR SELECT 
  TO authenticated 
  USING (
    company_id = get_user_company(auth.uid())
  );

-- Allow creation of EVEs by any authenticated user
CREATE POLICY "eve_create" 
  ON eves 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Allow company admins to update EVEs
CREATE POLICY "eve_admin_update" 
  ON eves 
  FOR UPDATE
  TO authenticated 
  USING (
    company_id = get_user_company(auth.uid()) AND 
    check_user_is_admin(auth.uid())
  );

-- Allow company admins to delete EVEs
CREATE POLICY "eve_admin_delete" 
  ON eves 
  FOR DELETE
  TO authenticated 
  USING (
    company_id = get_user_company(auth.uid()) AND 
    check_user_is_admin(auth.uid())
  );

-- ---- ACTIONS TABLE POLICIES ----

-- Check if policy exists before creating
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'actions' 
    AND policyname = 'action_view'
  ) THEN
    -- Allow viewing global actions or company actions
    EXECUTE 'CREATE POLICY "action_view" 
      ON actions 
      FOR SELECT 
      TO authenticated 
      USING (
        is_global OR company_id = get_user_company(auth.uid())
      )';
  END IF;
END $$;

-- Check if policy exists before creating
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'actions' 
    AND policyname = 'action_create'
  ) THEN
    -- Allow creation of actions
    EXECUTE 'CREATE POLICY "action_create" 
      ON actions 
      FOR INSERT 
      TO authenticated 
      WITH CHECK (true)';
  END IF;
END $$;

-- Check if policy exists before creating
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'actions' 
    AND policyname = 'action_admin_update'
  ) THEN
    -- Allow company admins to update actions
    EXECUTE 'CREATE POLICY "action_admin_update" 
      ON actions 
      FOR UPDATE
      TO authenticated 
      USING (
        company_id = get_user_company(auth.uid()) AND 
        check_user_is_admin(auth.uid())
      )';
  END IF;
END $$;

-- Check if policy exists before creating
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'actions' 
    AND policyname = 'action_admin_delete'
  ) THEN
    -- Allow company admins to delete actions
    EXECUTE 'CREATE POLICY "action_admin_delete" 
      ON actions 
      FOR DELETE
      TO authenticated 
      USING (
        company_id = get_user_company(auth.uid()) AND 
        check_user_is_admin(auth.uid())
      )';
  END IF;
END $$;

-- ---- EVE_ACTIONS TABLE POLICIES ----

-- Check if policy exists before creating
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'eve_actions' 
    AND policyname = 'eve_action_view'
  ) THEN
    -- Allow viewing EVE actions in the same company
    EXECUTE 'CREATE POLICY "eve_action_view" 
      ON eve_actions 
      FOR SELECT 
      TO authenticated 
      USING (
        EXISTS (
          SELECT 1
          FROM eves e
          WHERE e.id = eve_actions.eve_id
          AND e.company_id = get_user_company(auth.uid())
        )
      )';
  END IF;
END $$;

-- Check if policy exists before creating
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'eve_actions' 
    AND policyname = 'eve_action_create'
  ) THEN
    -- Allow creation of EVE actions
    EXECUTE 'CREATE POLICY "eve_action_create" 
      ON eve_actions 
      FOR INSERT 
      TO authenticated 
      WITH CHECK (true)';
  END IF;
END $$;

-- Check if policy exists before creating
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'eve_actions' 
    AND policyname = 'eve_action_admin_update'
  ) THEN
    -- Allow managing EVE actions for admins - update
    EXECUTE 'CREATE POLICY "eve_action_admin_update" 
      ON eve_actions 
      FOR UPDATE
      TO authenticated 
      USING (
        EXISTS (
          SELECT 1
          FROM eves e
          WHERE e.id = eve_actions.eve_id
          AND e.company_id = get_user_company(auth.uid())
          AND check_user_is_admin(auth.uid())
        )
      )';
  END IF;
END $$;

-- Check if policy exists before creating
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'eve_actions' 
    AND policyname = 'eve_action_admin_delete'
  ) THEN
    -- Allow managing EVE actions for admins - delete
    EXECUTE 'CREATE POLICY "eve_action_admin_delete" 
      ON eve_actions 
      FOR DELETE
      TO authenticated 
      USING (
        EXISTS (
          SELECT 1
          FROM eves e
          WHERE e.id = eve_actions.eve_id
          AND e.company_id = get_user_company(auth.uid())
          AND check_user_is_admin(auth.uid())
        )
      )';
  END IF;
END $$;

-- ---- LOGS TABLE POLICIES ----

-- Check if policy exists before creating
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'logs' 
    AND policyname = 'log_company_view'
  ) THEN
    -- Allow viewing logs in the same company
    EXECUTE 'CREATE POLICY "log_company_view" 
      ON logs 
      FOR SELECT 
      TO authenticated 
      USING (
        company_id = get_user_company(auth.uid())
      )';
  END IF;
END $$;

-- Check if policy exists before creating
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'logs' 
    AND policyname = 'log_create'
  ) THEN
    -- Allow creating logs
    EXECUTE 'CREATE POLICY "log_create" 
      ON logs 
      FOR INSERT 
      TO authenticated 
      WITH CHECK (true)';
  END IF;
END $$;

-- ---- PROFILES TABLE POLICIES ----

-- Check if policy exists before creating
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'profile_self_manage'
  ) THEN
    -- Allow users to manage their own profile
    EXECUTE 'CREATE POLICY "profile_self_manage" 
      ON profiles 
      FOR ALL 
      TO authenticated 
      USING (id = auth.uid())';
  END IF;
END $$;

-- Check if policy exists before creating
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'profiles' 
    AND policyname = 'profile_company_view'
  ) THEN
    -- Allow viewing profiles in the same company
    EXECUTE 'CREATE POLICY "profile_company_view" 
      ON profiles 
      FOR SELECT 
      TO authenticated 
      USING (
        EXISTS (
          SELECT 1
          FROM users u
          WHERE u.id = profiles.id
          AND u.company_id = get_user_company(auth.uid())
        )
      )';
  END IF;
END $$;

-- Add DEFAULT values for companies table columns if they don't already exist
DO $$
BEGIN
  ALTER TABLE companies ALTER COLUMN primary_color SET DEFAULT '#00BFA6';
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

DO $$
BEGIN
  ALTER TABLE companies ALTER COLUMN secondary_color SET DEFAULT '#1A1A40';
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Create helpful indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_company_role ON users(company_id, role);
CREATE INDEX IF NOT EXISTS idx_eves_company_id ON eves(company_id);
CREATE INDEX IF NOT EXISTS idx_logs_company_id ON logs(company_id);
CREATE INDEX IF NOT EXISTS idx_eve_actions_eve_id ON eve_actions(eve_id);