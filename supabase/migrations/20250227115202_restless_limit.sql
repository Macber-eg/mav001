/*
  # Mavrika EVE Platform - Initial Schema

  1. Core Tables
    - `companies` - Stores tenant information
    - `auth.users` - Supabase authentication (already exists)
    - `users` - Custom user data linked to auth.users
    - `profiles` - Additional user profile information
    - `eves` - Enterprise Virtual Employees
    - `actions` - Repository of available actions
    - `eve_actions` - Maps actions to EVEs
    - `logs` - Activity logging

  2. Security
    - Enable RLS on all tables
    - Add appropriate policies for multi-tenant access control
    - Create indexes for performance optimization
*/

-- Companies (Tenants) Table
CREATE TABLE IF NOT EXISTS companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#00BFA6',
  secondary_color TEXT DEFAULT '#1A1A40',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for companies
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

-- Users Table (extending auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('company_admin', 'staff', 'system_admin')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create policies for companies AFTER users table exists
CREATE POLICY "Company admins can manage their company" 
  ON companies 
  FOR ALL 
  TO authenticated 
  USING (id IN (
    SELECT company_id FROM users 
    WHERE users.id = auth.uid() AND users.role = 'company_admin'
  ));

CREATE POLICY "Users can view their company" 
  ON companies 
  FOR SELECT 
  TO authenticated 
  USING (id IN (
    SELECT company_id FROM users 
    WHERE users.id = auth.uid()
  ));

-- Enable RLS for users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for users
CREATE POLICY "Users can view themselves" 
  ON users 
  FOR SELECT 
  TO authenticated 
  USING (id = auth.uid());

CREATE POLICY "Company admins can manage users in their company" 
  ON users 
  FOR ALL 
  TO authenticated 
  USING (company_id IN (
    SELECT company_id FROM users 
    WHERE users.id = auth.uid() AND users.role = 'company_admin'
  ));

CREATE POLICY "System admins can manage all users" 
  ON users 
  FOR ALL 
  TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM users 
    WHERE users.id = auth.uid() AND users.role = 'system_admin'
  ));

-- Profiles Table for additional user information
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT,
  avatar_url TEXT,
  job_title TEXT,
  bio TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view and manage their own profile" 
  ON profiles 
  FOR ALL 
  TO authenticated 
  USING (id = auth.uid());

CREATE POLICY "Users can view profiles in their company" 
  ON profiles 
  FOR SELECT 
  TO authenticated 
  USING (id IN (
    SELECT u.id FROM users u 
    WHERE u.company_id = (
      SELECT company_id FROM users WHERE id = auth.uid()
    )
  ));

-- EVEs (Enterprise Virtual Employees) Table
CREATE TABLE IF NOT EXISTS eves (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  avatar_url TEXT,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('active', 'inactive', 'training', 'error')),
  capabilities JSONB DEFAULT '[]',
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id)
);

-- Enable RLS for eves
ALTER TABLE eves ENABLE ROW LEVEL SECURITY;

-- Create policies for eves
CREATE POLICY "Users can view EVEs in their company" 
  ON eves 
  FOR SELECT 
  TO authenticated 
  USING (company_id = (
    SELECT company_id FROM users 
    WHERE id = auth.uid()
  ));

CREATE POLICY "Company admins can manage EVEs in their company" 
  ON eves 
  FOR ALL 
  TO authenticated 
  USING (company_id IN (
    SELECT company_id FROM users 
    WHERE users.id = auth.uid() AND users.role = 'company_admin'
  ));

-- Actions Repository Table
CREATE TABLE IF NOT EXISTS actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  endpoint_url TEXT,
  method TEXT DEFAULT 'POST',
  required_params JSONB DEFAULT '[]',
  headers JSONB DEFAULT '{}',
  is_global BOOLEAN DEFAULT false,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id)
);

-- Enable RLS for actions
ALTER TABLE actions ENABLE ROW LEVEL SECURITY;

-- Create policies for actions
CREATE POLICY "Users can view global actions and actions in their company" 
  ON actions 
  FOR SELECT 
  TO authenticated 
  USING (is_global OR company_id = (
    SELECT company_id FROM users 
    WHERE id = auth.uid()
  ));

CREATE POLICY "Company admins can manage actions in their company" 
  ON actions 
  FOR ALL 
  TO authenticated 
  USING (company_id IN (
    SELECT company_id FROM users 
    WHERE users.id = auth.uid() AND users.role = 'company_admin'
  ));

-- EVE Actions Mapping Table
CREATE TABLE IF NOT EXISTS eve_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eve_id UUID NOT NULL REFERENCES eves(id) ON DELETE CASCADE,
  action_id UUID NOT NULL REFERENCES actions(id) ON DELETE CASCADE,
  parameters JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id),
  UNIQUE(eve_id, action_id)
);

-- Enable RLS for eve_actions
ALTER TABLE eve_actions ENABLE ROW LEVEL SECURITY;

-- Create policies for eve_actions
CREATE POLICY "Users can view EVE actions in their company" 
  ON eve_actions 
  FOR SELECT 
  TO authenticated 
  USING (eve_id IN (
    SELECT id FROM eves 
    WHERE company_id = (
      SELECT company_id FROM users 
      WHERE id = auth.uid()
    )
  ));

CREATE POLICY "Company admins can manage EVE actions in their company" 
  ON eve_actions 
  FOR ALL 
  TO authenticated 
  USING (eve_id IN (
    SELECT id FROM eves 
    WHERE company_id IN (
      SELECT company_id FROM users 
      WHERE users.id = auth.uid() AND users.role = 'company_admin'
    )
  ));

-- Logs Table for monitoring and auditing
CREATE TABLE IF NOT EXISTS logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eve_id UUID REFERENCES eves(id) ON DELETE SET NULL,
  action_id UUID REFERENCES actions(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  company_id UUID NOT NULL REFERENCES companies(id),
  event_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('success', 'error', 'pending', 'cancelled')),
  message TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for logs
ALTER TABLE logs ENABLE ROW LEVEL SECURITY;

-- Create policies for logs
CREATE POLICY "Users can view logs in their company" 
  ON logs 
  FOR SELECT 
  TO authenticated 
  USING (company_id = (
    SELECT company_id FROM users 
    WHERE id = auth.uid()
  ));

CREATE POLICY "System can insert logs" 
  ON logs 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Create function to log events
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

-- Add some default global actions
INSERT INTO actions (name, description, endpoint_url, method, required_params, is_global)
VALUES 
  ('Send Email', 'Sends an email via SMTP', '/api/send-email', 'POST', '["to", "subject", "body"]', true),
  ('Create Task', 'Creates a task in the system', '/api/create-task', 'POST', '["title", "description", "due_date"]', true),
  ('Post to Social Media', 'Posts a message to social media', '/api/post-social', 'POST', '["platform", "message", "media_url"]', true),
  ('Generate AI Content', 'Generates content using OpenAI', '/api/generate-content', 'POST', '["prompt", "max_tokens", "temperature"]', true),
  ('Schedule Meeting', 'Schedules a meeting in calendar', '/api/schedule-meeting', 'POST', '["title", "start_time", "end_time", "attendees"]', true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS users_company_id_idx ON users (company_id);
CREATE INDEX IF NOT EXISTS eves_company_id_idx ON eves (company_id);
CREATE INDEX IF NOT EXISTS logs_company_id_idx ON logs (company_id);
CREATE INDEX IF NOT EXISTS logs_created_at_idx ON logs (created_at);
CREATE INDEX IF NOT EXISTS actions_company_id_idx ON actions (company_id);
CREATE INDEX IF NOT EXISTS eve_actions_eve_id_idx ON eve_actions (eve_id);