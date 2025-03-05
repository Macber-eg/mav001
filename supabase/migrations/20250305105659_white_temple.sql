-- Drop existing policies on companies table
DROP POLICY IF EXISTS "company_registration" ON companies;
DROP POLICY IF EXISTS "company_view_own" ON companies;
DROP POLICY IF EXISTS "company_admin_manage" ON companies;
DROP POLICY IF EXISTS "companies_admin_all" ON companies;
DROP POLICY IF EXISTS "companies_user_select" ON companies;
DROP POLICY IF EXISTS "initial_setup_permission" ON companies;

-- Create new, more permissive policies for companies
-- Allow company creation during registration
CREATE POLICY "companies_insert_during_registration" 
  ON companies 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Allow users to view their own company
CREATE POLICY "companies_select_own" 
  ON companies 
  FOR SELECT 
  TO authenticated 
  USING (
    id IN (
      SELECT company_id 
      FROM users 
      WHERE users.id = auth.uid()
    )
  );

-- Allow company admins to manage their company
CREATE POLICY "companies_admin_manage" 
  ON companies 
  FOR ALL 
  TO authenticated 
  USING (
    id IN (
      SELECT company_id 
      FROM users 
      WHERE users.id = auth.uid() 
      AND users.role = 'company_admin'
    )
  );

-- Drop existing policies on users table
DROP POLICY IF EXISTS "user_registration" ON users;
DROP POLICY IF EXISTS "user_company_creation" ON users;

-- Create new, more permissive policies for users
-- Allow user creation during registration
CREATE POLICY "users_insert_during_registration" 
  ON users 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Allow users to view and update their own record
CREATE POLICY "users_manage_own" 
  ON users 
  FOR ALL 
  TO authenticated 
  USING (id = auth.uid());

-- Allow company admins to manage users in their company
CREATE POLICY "users_company_admin_manage" 
  ON users 
  FOR ALL 
  TO authenticated 
  USING (
    EXISTS (
      SELECT 1 
      FROM users u 
      WHERE u.id = auth.uid() 
      AND u.role = 'company_admin' 
      AND u.company_id = users.company_id
    )
  );