-- Drop existing policies
DROP POLICY IF EXISTS "company_registration" ON companies;
DROP POLICY IF EXISTS "companies_insert_during_registration" ON companies;
DROP POLICY IF EXISTS "companies_select_own" ON companies;
DROP POLICY IF EXISTS "companies_admin_manage" ON companies;

-- Create new permissive policies for companies
CREATE POLICY "companies_insert_anon" ON companies
  FOR INSERT TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "companies_select_own" ON companies
  FOR SELECT TO authenticated
  USING (id IN (
    SELECT company_id FROM users WHERE users.id = auth.uid()
  ));

CREATE POLICY "companies_manage_admin" ON companies
  FOR ALL TO authenticated
  USING (id IN (
    SELECT company_id FROM users 
    WHERE users.id = auth.uid() 
    AND users.role = 'company_admin'
  ));

-- Create default company if none exists
INSERT INTO companies (name, primary_color, secondary_color)
SELECT 'Mavrika Demo Company', '#00FFB2', '#1A1A40'
WHERE NOT EXISTS (SELECT 1 FROM companies LIMIT 1);

-- Get the default company ID
WITH default_company AS (
  SELECT id FROM companies LIMIT 1
)
-- Insert marketplace items without reviews
INSERT INTO marketplace_items 
(type, name, description, preview_image_url, price, is_subscription, subscription_interval, creator_company_id, is_public, metadata, configuration)
SELECT
  'eve',
  'Sales Call Prep EVE™',
  'Generates detailed sales call briefs, including participant details and relevant insights.',
  'https://images.unsplash.com/photo-1542744173-8e7e53415bb0',
  49.99,
  true,
  'monthly',
  id,
  true,
  jsonb_build_object(
    'capabilities', ARRAY['Call brief generation', 'Participant research', 'Company insights', 'Meeting scheduling'],
    'integrations', ARRAY['CRM systems', 'LinkedIn', 'Calendar'],
    'automation_features', ARRAY['Auto-brief generation', 'Real-time updates']
  ),
  jsonb_build_object(
    'initial_prompt', 'You are a sales preparation specialist...',
    'templates', jsonb_build_array(
      'call_brief',
      'participant_profile',
      'company_research'
    )
  )
FROM default_company;

-- Update items with initial stats
UPDATE marketplace_items
SET 
  downloads_count = floor(random() * 100 + 10),
  ratings_count = 0,
  average_rating = 0
WHERE created_at >= NOW() - INTERVAL '1 minute';