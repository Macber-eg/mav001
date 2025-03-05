-- Create a function to get or create a default company
CREATE OR REPLACE FUNCTION get_or_create_default_company()
RETURNS UUID AS $$
DECLARE
  company_id UUID;
BEGIN
  -- Try to get existing company
  SELECT id INTO company_id FROM companies LIMIT 1;
  
  -- If no company exists, create one
  IF company_id IS NULL THEN
    INSERT INTO companies (name, primary_color, secondary_color)
    VALUES ('Mavrika Demo Company', '#00FFB2', '#1A1A40')
    RETURNING id INTO company_id;
  END IF;
  
  RETURN company_id;
END;
$$ LANGUAGE plpgsql;

-- Insert additional marketplace items
WITH default_company AS (
  SELECT get_or_create_default_company() as id
)
INSERT INTO marketplace_items 
(type, name, description, preview_image_url, price, is_subscription, subscription_interval, creator_company_id, is_public, metadata, configuration)
SELECT
  'eve',
  'HR Assistant EVE™',
  'Intelligent virtual employee for HR operations. Handles employee onboarding, documentation, leave management, and basic HR inquiries.',
  'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40',
  79.99,
  true,
  'monthly',
  id,
  true,
  jsonb_build_object(
    'capabilities', ARRAY['Employee onboarding', 'Leave management', 'HR documentation', 'Policy inquiries'],
    'integrations', ARRAY['Workday', 'BambooHR', 'ADP'],
    'compliance', ARRAY['GDPR', 'CCPA', 'Employment Law'],
    'response_time', '< 10 minutes'
  ),
  jsonb_build_object(
    'initial_prompt', 'You are an experienced HR professional...',
    'document_templates', jsonb_build_array(
      'offer_letter',
      'onboarding_checklist',
      'performance_review'
    ),
    'policy_database', 'hr_policies_v1'
  )
FROM default_company
UNION ALL
SELECT
  'eve',
  'Content Writer EVE™',
  'Creative virtual employee specialized in content creation. Generates blog posts, social media content, and marketing copy with SEO optimization.',
  'https://images.unsplash.com/photo-1455390582262-044cdead277a',
  69.99,
  true,
  'monthly',
  id,
  true,
  jsonb_build_object(
    'capabilities', ARRAY['Blog writing', 'Social media content', 'Marketing copy', 'SEO optimization'],
    'content_types', ARRAY['Blog posts', 'Social media', 'Email newsletters', 'Product descriptions'],
    'writing_styles', ARRAY['Professional', 'Casual', 'Technical', 'Creative'],
    'seo_tools', ARRAY['Keyword research', 'Meta descriptions', 'Title optimization']
  ),
  jsonb_build_object(
    'initial_prompt', 'You are a skilled content writer...',
    'tone_settings', jsonb_build_object(
      'formal', 0.8,
      'creative', 0.7,
      'technical', 0.6
    ),
    'content_templates', jsonb_build_array(
      'blog_post',
      'social_update',
      'newsletter'
    )
  )
FROM default_company
UNION ALL
SELECT
  'workflow',
  'Sales Pipeline Automation',
  'Comprehensive sales pipeline workflow with lead scoring, automated follow-ups, and performance tracking.',
  'https://images.unsplash.com/photo-1460925895917-afdab827c52f',
  149.99,
  false,
  null,
  id,
  true,
  jsonb_build_object(
    'stages', ARRAY['Lead Generation', 'Qualification', 'Proposal', 'Negotiation', 'Closing'],
    'integrations', ARRAY['Salesforce', 'HubSpot', 'Pipedrive'],
    'automation_points', 10,
    'includes_analytics', true
  ),
  jsonb_build_object(
    'pipeline_stages', jsonb_build_array(
      jsonb_build_object(
        'name', 'Lead Scoring',
        'criteria', jsonb_build_object(
          'engagement', 'high',
          'budget', 'qualified',
          'timeline', 'immediate'
        )
      ),
      jsonb_build_object(
        'name', 'Follow-up Sequence',
        'steps', jsonb_build_array(
          'initial_contact',
          'value_proposition',
          'case_studies',
          'proposal'
        )
      )
    ),
    'analytics_config', jsonb_build_object(
      'metrics', ARRAY['conversion_rate', 'cycle_time', 'deal_value'],
      'reports', ARRAY['pipeline_velocity', 'stage_conversion', 'team_performance']
    )
  )
FROM default_company
UNION ALL
SELECT
  'task',
  'Agile Project Management Tasks',
  'Collection of pre-configured tasks for agile project management, including sprint planning, backlog grooming, and retrospectives.',
  'https://images.unsplash.com/photo-1507925921958-8a62f3d1a50d',
  89.99,
  false,
  null,
  id,
  true,
  jsonb_build_object(
    'methodologies', ARRAY['Scrum', 'Kanban', 'Scrumban'],
    'ceremonies', ARRAY['Sprint Planning', 'Daily Standup', 'Retrospective'],
    'templates', 25,
    'integrations', ARRAY['Jira', 'Trello', 'Asana']
  ),
  jsonb_build_object(
    'task_templates', jsonb_build_array(
      jsonb_build_object(
        'name', 'Sprint Planning',
        'duration', '2h',
        'checklist', ARRAY[
          'Review backlog',
          'Set sprint goal',
          'Estimate stories',
          'Commit to sprint scope'
        ]
      ),
      jsonb_build_object(
        'name', 'Backlog Grooming',
        'duration', '1h',
        'checklist', ARRAY[
          'Prioritize stories',
          'Refine acceptance criteria',
          'Break down large stories',
          'Update estimates'
        ]
      )
    ),
    'metrics_tracking', jsonb_build_object(
      'velocity', true,
      'burndown', true,
      'cycle_time', true
    )
  )
FROM default_company
UNION ALL
SELECT
  'action',
  'Enterprise CRM Integration Pack',
  'Comprehensive set of CRM integration actions for major platforms, including contact management, opportunity tracking, and analytics.',
  'https://images.unsplash.com/photo-1552664730-d307ca884978',
  199.99,
  false,
  null,
  id,
  true,
  jsonb_build_object(
    'supported_platforms', ARRAY['Salesforce', 'HubSpot', 'Microsoft Dynamics', 'Zoho'],
    'features', ARRAY['Contact sync', 'Opportunity management', 'Analytics', 'Automation'],
    'endpoints', 50,
    'includes_documentation', true
  ),
  jsonb_build_object(
    'actions', jsonb_build_array(
      jsonb_build_object(
        'name', 'Sync Contacts',
        'method', 'POST',
        'platforms', ARRAY['all'],
        'rate_limit', 5000,
        'error_handling', true
      ),
      jsonb_build_object(
        'name', 'Create Opportunity',
        'method', 'POST',
        'platforms', ARRAY['all'],
        'fields', jsonb_build_array(
          'name',
          'amount',
          'stage',
          'close_date'
        )
      ),
      jsonb_build_object(
        'name', 'Generate Report',
        'method', 'GET',
        'platforms', ARRAY['all'],
        'report_types', ARRAY[
          'pipeline_forecast',
          'activity_summary',
          'conversion_rates'
        ]
      )
    ),
    'authentication', jsonb_build_object(
      'oauth2', true,
      'api_key', true,
      'jwt', true
    )
  )
FROM default_company;

-- Add reviews for new items
WITH new_items AS (
  SELECT id 
  FROM marketplace_items 
  WHERE created_at >= NOW() - INTERVAL '1 minute'
),
default_company AS (
  SELECT get_or_create_default_company() as id
),
review_data AS (
  SELECT 
    i.id as item_id,
    c.id as company_id,
    4 + floor(random() * 2)::int as rating,
    CASE floor(random() * 5)::int
      WHEN 0 THEN 'Fantastic addition to our team! The AI capabilities are impressive.'
      WHEN 1 THEN 'Great value for money. Has streamlined our processes significantly.'
      WHEN 2 THEN 'Very intuitive and easy to set up. Support is excellent.'
      WHEN 3 THEN 'Powerful features and seamless integration with our existing tools.'
      WHEN 4 THEN 'Regular updates and improvements. Highly recommended!'
    END as review_text
  FROM new_items i
  CROSS JOIN default_company c
)
INSERT INTO marketplace_reviews (item_id, company_id, rating, review_text)
SELECT 
  item_id,
  company_id,
  rating,
  review_text
FROM review_data
WHERE random() < 0.8;

-- Update items with review counts and ratings
WITH new_items AS (
  SELECT id FROM marketplace_items 
  WHERE created_at >= NOW() - INTERVAL '1 minute'
)
UPDATE marketplace_items
SET 
  ratings_count = (
    SELECT COUNT(*) 
    FROM marketplace_reviews 
    WHERE item_id = marketplace_items.id
  ),
  average_rating = (
    SELECT COALESCE(AVG(rating)::numeric(3,2), 0)
    FROM marketplace_reviews 
    WHERE item_id = marketplace_items.id
  )
WHERE id IN (SELECT id FROM new_items);

-- Add realistic download counts
WITH new_items AS (
  SELECT id, price FROM marketplace_items 
  WHERE created_at >= NOW() - INTERVAL '1 minute'
)
UPDATE marketplace_items
SET downloads_count = 
  CASE 
    WHEN price < 50 THEN floor(random() * 300 + 100)  -- Lower priced items
    WHEN price < 100 THEN floor(random() * 200 + 50)  -- Mid-range items
    ELSE floor(random() * 100 + 25)                   -- Premium items
  END
WHERE id IN (SELECT id FROM new_items);