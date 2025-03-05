-- Drop existing problematic policies
DO $$ 
BEGIN
  -- Drop companies policies
  DROP POLICY IF EXISTS "companies_insert" ON companies;
  DROP POLICY IF EXISTS "companies_select" ON companies;
  DROP POLICY IF EXISTS "companies_update" ON companies;
  DROP POLICY IF EXISTS "companies_delete" ON companies;

  -- Drop users policies
  DROP POLICY IF EXISTS "users_insert" ON users;
  DROP POLICY IF EXISTS "users_select_self" ON users;
  DROP POLICY IF EXISTS "users_select_company" ON users;
  DROP POLICY IF EXISTS "users_update_self" ON users;
  DROP POLICY IF EXISTS "users_update_admin" ON users;
END $$;

-- Create security definer function to check user role
CREATE OR REPLACE FUNCTION check_user_role(user_id UUID, required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = user_id
    AND role = required_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create security definer function to get user's company
CREATE OR REPLACE FUNCTION get_user_company_id_secure(user_id UUID)
RETURNS UUID AS $$
DECLARE
  company_id UUID;
BEGIN
  SELECT users.company_id INTO company_id
  FROM users
  WHERE users.id = user_id;
  RETURN company_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create non-recursive policies for companies table
CREATE POLICY "companies_insert_anon" ON companies
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "companies_select_own" ON companies
  FOR SELECT 
  USING (id = get_user_company_id_secure(auth.uid()));

CREATE POLICY "companies_update_admin" ON companies
  FOR UPDATE
  USING (
    id = get_user_company_id_secure(auth.uid()) 
    AND check_user_role(auth.uid(), 'company_admin')
  );

CREATE POLICY "companies_delete_admin" ON companies
  FOR DELETE
  USING (
    id = get_user_company_id_secure(auth.uid()) 
    AND check_user_role(auth.uid(), 'company_admin')
  );

-- Create non-recursive policies for users table
CREATE POLICY "users_insert_anon" ON users
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "users_select_self" ON users
  FOR SELECT 
  USING (id = auth.uid());

CREATE POLICY "users_select_company" ON users
  FOR SELECT 
  USING (company_id = get_user_company_id_secure(auth.uid()));

CREATE POLICY "users_update_self" ON users
  FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "users_update_company_admin" ON users
  FOR UPDATE
  USING (
    company_id = get_user_company_id_secure(auth.uid())
    AND check_user_role(auth.uid(), 'company_admin')
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_company_role ON users(company_id, role);
CREATE INDEX IF NOT EXISTS idx_users_auth_id ON users(id);