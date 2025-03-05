/*
  # Voice Capabilities for EVEs

  1. New Tables
     - `eve_voice_settings` - Stores voice configuration for EVEs
     - `voice_calls` - Stores call history and transcripts
     - `company_ai_settings` - Stores company-specific AI configuration

  2. Security
     - Enable RLS on all new tables
     - Add appropriate policies for CRUD operations
*/

-- Create table for EVE voice settings
CREATE TABLE IF NOT EXISTS eve_voice_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eve_id UUID NOT NULL REFERENCES eves(id) ON DELETE CASCADE,
  phone_number TEXT,
  greeting_message TEXT,
  fallback_message TEXT,
  voice_id TEXT DEFAULT 'Polly.Amy',
  enabled BOOLEAN DEFAULT false,
  use_openai_voice BOOLEAN DEFAULT false,
  openai_voice_model TEXT,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create table for voice call history
CREATE TABLE IF NOT EXISTS voice_calls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  eve_id UUID NOT NULL REFERENCES eves(id) ON DELETE CASCADE,
  call_sid TEXT NOT NULL,
  caller_number TEXT NOT NULL,
  transcript TEXT,
  audio_url TEXT,
  status TEXT NOT NULL,
  duration INTEGER,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Create table for company AI settings
CREATE TABLE IF NOT EXISTS company_ai_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE UNIQUE,
  openai_api_key TEXT,
  openai_org_id TEXT,
  use_company_keys BOOLEAN DEFAULT false,
  default_model TEXT DEFAULT 'gpt-4',
  token_quota INTEGER,
  tokens_used INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE eve_voice_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE company_ai_settings ENABLE ROW LEVEL SECURITY;

-- Create policies for eve_voice_settings
CREATE POLICY "view_eve_voice_settings" 
  ON eve_voice_settings 
  FOR SELECT 
  TO authenticated 
  USING (
    company_id = get_user_company(auth.uid())
  );

CREATE POLICY "insert_eve_voice_settings" 
  ON eve_voice_settings 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    company_id = get_user_company(auth.uid())
  );

CREATE POLICY "update_eve_voice_settings" 
  ON eve_voice_settings 
  FOR UPDATE 
  TO authenticated 
  USING (
    company_id = get_user_company(auth.uid())
  );

-- Create policies for voice_calls
CREATE POLICY "view_voice_calls" 
  ON voice_calls 
  FOR SELECT 
  TO authenticated 
  USING (
    company_id = get_user_company(auth.uid())
  );

CREATE POLICY "insert_voice_calls" 
  ON voice_calls 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Create policies for company_ai_settings
CREATE POLICY "view_company_ai_settings" 
  ON company_ai_settings 
  FOR SELECT 
  TO authenticated 
  USING (
    company_id = get_user_company(auth.uid())
  );

CREATE POLICY "manage_company_ai_settings" 
  ON company_ai_settings 
  FOR ALL 
  TO authenticated 
  USING (
    company_id = get_user_company(auth.uid()) AND
    exists (
      SELECT 1 FROM users u 
      WHERE u.id = auth.uid() AND u.role = 'company_admin'
    )
  );

-- Create function to log AI usage for billing/quotas
CREATE OR REPLACE FUNCTION log_ai_usage(
  p_company_id UUID,
  p_tokens_used INTEGER,
  p_model TEXT,
  p_endpoint TEXT
)
RETURNS VOID AS $$
BEGIN
  -- Update company's token usage
  UPDATE company_ai_settings
  SET tokens_used = tokens_used + p_tokens_used,
      updated_at = now()
  WHERE company_id = p_company_id;
  
  -- Log usage event
  PERFORM log_event(
    NULL, -- eve_id
    NULL, -- action_id
    p_company_id,
    'AI_USAGE',
    'success',
    'AI tokens used: ' || p_tokens_used::TEXT,
    jsonb_build_object(
      'tokens', p_tokens_used,
      'model', p_model,
      'endpoint', p_endpoint
    )
  );

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_eve_voice_settings_eve_id ON eve_voice_settings(eve_id);
CREATE INDEX IF NOT EXISTS idx_eve_voice_settings_phone_number ON eve_voice_settings(phone_number);
CREATE INDEX IF NOT EXISTS idx_voice_calls_eve_id ON voice_calls(eve_id);
CREATE INDEX IF NOT EXISTS idx_voice_calls_call_sid ON voice_calls(call_sid);
CREATE INDEX IF NOT EXISTS idx_voice_calls_started_at ON voice_calls(started_at);
CREATE INDEX IF NOT EXISTS idx_company_ai_settings_company_id ON company_ai_settings(company_id);