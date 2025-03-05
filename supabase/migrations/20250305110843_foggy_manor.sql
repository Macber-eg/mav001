-- Drop all existing policies to start fresh
DROP POLICY IF EXISTS "companies_insert_anon" ON companies;
DROP POLICY IF EXISTS "companies_select_own" ON companies;
DROP POLICY IF EXISTS "companies_manage_admin" ON companies;
DROP POLICY IF EXISTS "users_insert_during_registration" ON users;
DROP POLICY IF EXISTS "users_manage_own" ON users;
DROP POLICY IF EXISTS "users_company_admin_manage" ON users;

-- Create non-recursive policies for companies
CREATE POLICY "companies_insert" ON companies
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "companies_select" ON companies
  FOR SELECT 
  USING (true);

CREATE POLICY "companies_update" ON companies
  FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.company_id = companies.id 
    AND users.role = 'company_admin'
  ));

CREATE POLICY "companies_delete" ON companies
  FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() 
    AND users.company_id = companies.id 
    AND users.role = 'company_admin'
  ));

-- Create non-recursive policies for users
CREATE POLICY "users_insert" ON users
  FOR INSERT 
  WITH CHECK (true);

CREATE POLICY "users_select_self" ON users
  FOR SELECT 
  USING (id = auth.uid());

CREATE POLICY "users_select_company" ON users
  FOR SELECT 
  USING (company_id IN (
    SELECT company_id FROM users WHERE id = auth.uid()
  ));

CREATE POLICY "users_update_self" ON users
  FOR UPDATE
  USING (id = auth.uid());

CREATE POLICY "users_update_admin" ON users
  FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM users 
      WHERE id = auth.uid() AND role = 'company_admin'
    )
  );

-- Create helper function to check user role without recursion
CREATE OR REPLACE FUNCTION is_company_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = user_id
    AND role = 'company_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create helper function to get user's company without recursion  
CREATE OR REPLACE FUNCTION get_user_company(user_id UUID)
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

-- Create default company if none exists
INSERT INTO companies (name, primary_color, secondary_color)
SELECT 'Mavrika Demo Company', '#00FFB2', '#1A1A40'
WHERE NOT EXISTS (SELECT 1 FROM companies LIMIT 1);