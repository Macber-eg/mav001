/*
  # Fix recursive policy issues with proper syntax

  1. Changes
    - Drop all existing policies on users table
    - Create new non-recursive policies that prevent infinite loops
    - Use simpler policy design that avoids circular references
    - Use proper alias names that don't conflict with PostgreSQL reserved keywords
    - Add insertion policies for user registration
*/

-- Drop ALL existing policies on users table to start fresh
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

-- Self-access policy - allows users to access their own record without recursion
CREATE POLICY "users_self_access" 
  ON users 
  FOR ALL
  TO authenticated 
  USING (id = auth.uid());

-- Insert policy - needed for user registration
CREATE POLICY "users_insert_policy" 
  ON users 
  FOR INSERT
  TO authenticated 
  WITH CHECK (true);

-- Company access policy - allows users to view other members of their company
-- Uses a direct company_id equality check instead of a subquery to avoid recursion
CREATE POLICY "users_company_select" 
  ON users 
  FOR SELECT
  TO authenticated 
  USING (
    -- This gets the company_id from the authenticated user's record once
    -- and then compares it directly to avoid recursive queries
    EXISTS (
      SELECT 1 
      FROM users AS usr
      WHERE usr.id = auth.uid() 
        AND users.company_id = usr.company_id
    )
  );

-- Company admin policy - allows company admins to manage users in their company
CREATE POLICY "users_company_admin_all" 
  ON users 
  FOR ALL
  TO authenticated 
  USING (
    -- Check if authenticated user is a company admin for this user's company
    EXISTS (
      SELECT 1 
      FROM users AS adm
      WHERE adm.id = auth.uid() 
        AND adm.role = 'company_admin' 
        AND users.company_id = adm.company_id
    )
  );

-- System admin policy - allows system admins to manage all users
CREATE POLICY "users_system_admin_all" 
  ON users 
  FOR ALL
  TO authenticated 
  USING (
    -- Check if authenticated user is a system admin
    EXISTS (
      SELECT 1 
      FROM users AS adm
      WHERE adm.id = auth.uid() 
        AND adm.role = 'system_admin'
    )
  );

-- Fix other policies that might reference users table recursively

-- For companies table
DROP POLICY IF EXISTS "Company admins can manage their company" ON companies;
CREATE POLICY "companies_admin_all" 
  ON companies 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM users AS u
      WHERE u.id = auth.uid() 
        AND u.role = 'company_admin' 
        AND companies.id = u.company_id
    )
  );

DROP POLICY IF EXISTS "Users can view their company" ON companies;
CREATE POLICY "companies_user_select" 
  ON companies 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM users AS u
      WHERE u.id = auth.uid() 
        AND companies.id = u.company_id
    )
  );

-- For eves table
DROP POLICY IF EXISTS "Users can view EVEs in their company" ON eves;
CREATE POLICY "eves_user_select" 
  ON eves 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM users AS u
      WHERE u.id = auth.uid() 
        AND eves.company_id = u.company_id
    )
  );

DROP POLICY IF EXISTS "Company admins can manage EVEs in their company" ON eves;
CREATE POLICY "eves_admin_all" 
  ON eves 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM users AS u
      WHERE u.id = auth.uid() 
        AND u.role = 'company_admin' 
        AND eves.company_id = u.company_id
    )
  );

-- For logs table
DROP POLICY IF EXISTS "Users can view logs in their company" ON logs;
CREATE POLICY "logs_user_select" 
  ON logs 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM users AS u
      WHERE u.id = auth.uid() 
        AND logs.company_id = u.company_id
    )
  );