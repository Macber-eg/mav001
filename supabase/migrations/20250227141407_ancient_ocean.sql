/*
  # Add tasks and collaboration tables

  1. New Tables
    - `tasks` - Store tasks assigned to EVEs
      - `id` (uuid, primary key)
      - `eve_id` (uuid, references eves)
      - `action_id` (uuid, references actions)
      - `description` (text)
      - `status` (text)
      - `parameters` (jsonb)
      - `priority` (text)
      - `due_date` (timestamptz)
      - `company_id` (uuid, references companies)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
      
    - `collaborations` - Store collaboration requests between EVEs
      - `id` (uuid, primary key)
      - `source_eve_id` (uuid, references eves)
      - `target_eve_id` (uuid, references eves)
      - `task_id` (uuid, references tasks)
      - `request_type` (text)
      - `message` (text)
      - `status` (text)
      - `priority` (text)
      - `due_date` (timestamptz)
      - `metadata` (jsonb)
      - `company_id` (uuid, references companies)
      - `created_at` (timestamptz, default now())
      - `updated_at` (timestamptz, default now())
    
  2. Security
    - Enable RLS on both tables
    - Add policies for authenticated users to see tasks/collaborations in their company
    - Add policies for creation and management
*/

-- Create tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eve_id UUID NOT NULL REFERENCES eves(id) ON DELETE CASCADE,
  action_id UUID REFERENCES actions(id) ON DELETE SET NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'in_progress', 'completed', 'failed', 'cancelled')),
  parameters JSONB DEFAULT '{}',
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  due_date TIMESTAMPTZ,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for tasks
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create tasks policies
CREATE POLICY "task_view" 
  ON tasks 
  FOR SELECT 
  TO authenticated 
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "task_create" 
  ON tasks 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "task_update" 
  ON tasks 
  FOR UPDATE
  TO authenticated 
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "task_delete" 
  ON tasks 
  FOR DELETE
  TO authenticated 
  USING (company_id = get_user_company(auth.uid()));

-- Create collaborations table
CREATE TABLE IF NOT EXISTS collaborations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_eve_id UUID NOT NULL REFERENCES eves(id) ON DELETE CASCADE,
  target_eve_id UUID NOT NULL REFERENCES eves(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
  request_type TEXT NOT NULL CHECK (request_type IN ('delegate', 'assist', 'review')),
  message TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  due_date TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for collaborations
ALTER TABLE collaborations ENABLE ROW LEVEL SECURITY;

-- Create collaborations policies
CREATE POLICY "collaboration_view" 
  ON collaborations 
  FOR SELECT 
  TO authenticated 
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "collaboration_create" 
  ON collaborations 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

CREATE POLICY "collaboration_update" 
  ON collaborations 
  FOR UPDATE
  TO authenticated 
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "collaboration_delete" 
  ON collaborations 
  FOR DELETE
  TO authenticated 
  USING (company_id = get_user_company(auth.uid()));

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_eve_id ON tasks(eve_id);
CREATE INDEX IF NOT EXISTS idx_tasks_company_id ON tasks(company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

CREATE INDEX IF NOT EXISTS idx_collaborations_source_eve_id ON collaborations(source_eve_id);
CREATE INDEX IF NOT EXISTS idx_collaborations_target_eve_id ON collaborations(target_eve_id);
CREATE INDEX IF NOT EXISTS idx_collaborations_task_id ON collaborations(task_id);
CREATE INDEX IF NOT EXISTS idx_collaborations_status ON collaborations(status);
CREATE INDEX IF NOT EXISTS idx_collaborations_company_id ON collaborations(company_id);