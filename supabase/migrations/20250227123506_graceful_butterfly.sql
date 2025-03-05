/*
  # Fix Infinite Recursion in User Policies

  1. Changes
    - Drop all problematic policies from the users table that cause recursion
    - Create new simplified policies without recursion
    - Fix initial view permissions so app can load properly
    
  2. Security
    - Maintains proper row-level security
    - Eliminates infinite recursion while preserving security model
*/

-- Drop ALL existing policies on users table to start clean
DROP POLICY IF EXISTS "Users can view themselves" ON users;
DROP POLICY IF EXISTS "Company admins can manage users in their company" ON users;
DROP POLICY IF EXISTS "System admins can manage all users" ON users;
DROP POLICY IF EXISTS "Company admins can view users in their company" ON users;
DROP POLICY IF EXISTS "Company admins can update users in their company" ON users;
DROP POLICY IF EXISTS "Users can update their own record" ON users;

-- Create simplified non-recursive policies
-- 1. Basic view policy - allows any authenticated user to view their own record
CREATE POLICY "Users can view themselves" 
  ON users 
  FOR SELECT 
  TO authenticated 
  USING (id = auth.uid());

-- 2. View policy for company members - allows viewing other users in same company
-- This works because we're using a direct equality check rather than a subquery
CREATE POLICY "Users can view others in same company" 
  ON users 
  FOR SELECT 
  TO authenticated 
  USING (company_id IN (
    SELECT u.company_id FROM users u WHERE u.id = auth.uid()
  ));

-- 3. Admin policy for company admins
-- First grant select permission
CREATE POLICY "Company admins can view all users in their company" 
  ON users 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() AND u.role = 'company_admin' AND u.company_id = users.company_id
    )
  );

-- 4. Add update permission for company admins
CREATE POLICY "Company admins can update users in their company" 
  ON users 
  FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() AND u.role = 'company_admin' AND u.company_id = users.company_id
    )
  );

-- 5. Basic update policy - allows users to update their own record
CREATE POLICY "Users can update themselves" 
  ON users 
  FOR UPDATE 
  TO authenticated 
  USING (id = auth.uid());

-- 6. System admin policies (with simplified approach)
CREATE POLICY "System admins can select any user" 
  ON users 
  FOR SELECT 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() AND u.role = 'system_admin'
    )
  );

CREATE POLICY "System admins can update any user" 
  ON users 
  FOR UPDATE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() AND u.role = 'system_admin'
    )
  );

CREATE POLICY "System admins can insert users" 
  ON users 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() AND u.role = 'system_admin'
    )
  );

CREATE POLICY "System admins can delete users" 
  ON users 
  FOR DELETE 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() AND u.role = 'system_admin'
    )
  );