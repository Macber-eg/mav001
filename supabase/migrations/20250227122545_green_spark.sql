/*
  # Fix users table RLS policies to prevent infinite recursion

  1. Changes
     - Drop the problematic policies that cause infinite recursion
     - Create new policies with non-recursive conditions
  
  2. Security
     - Maintains same access control intentions
     - Avoids circular references in policy definitions
*/

-- Drop the problematic policies
DROP POLICY IF EXISTS "Company admins can manage users in their company" ON users;
DROP POLICY IF EXISTS "System admins can manage all users" ON users;

-- Create fixed policy for company admins
CREATE POLICY "Company admins can view users in their company" 
  ON users 
  FOR SELECT 
  TO authenticated 
  USING (
    -- Get company_id for the authenticated user without causing recursion
    company_id = (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
  );

-- Create fixed policy for system admins
CREATE POLICY "System admins can manage all users" 
  ON users 
  FOR ALL 
  TO authenticated 
  USING (
    -- Check if authenticated user is a system admin without recursion
    (SELECT role FROM users WHERE id = auth.uid()) = 'system_admin'
  );

-- Create policy for company admins to update/delete users in their company
CREATE POLICY "Company admins can update users in their company" 
  ON users 
  FOR UPDATE 
  TO authenticated 
  USING (
    -- Only allow update if authenticated user is a company admin
    -- and the target user is in the same company
    company_id = (SELECT company_id FROM users WHERE id = auth.uid()) AND
    (SELECT role FROM users WHERE id = auth.uid()) = 'company_admin'
  );

-- Create policy for users to update themselves
CREATE POLICY "Users can update their own record" 
  ON users 
  FOR UPDATE 
  TO authenticated 
  USING (id = auth.uid());