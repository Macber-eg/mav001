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

-- Insert sample marketplace items
INSERT INTO marketplace_items 
(type, name, description, preview_image_url, price, is_subscription, subscription_interval, creator_company_id, is_public, metadata, configuration)
VALUES
-- Customer Service EVE
(
  'eve',
  'Customer Service Pro EVE™',
  'A pre-trained virtual employee specialized in customer service. Handles inquiries, support tickets, and customer communication with empathy and efficiency.',
  'https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d',
  49.99,
  true,
  'monthly',
  get_or_create_default_company(),
  true,
  jsonb_build_object(
    'capabilities', ARRAY['Ticket management', 'Email support', 'Chat support', 'FAQ handling'],
    'languages', ARRAY['English'],
    'response_time', '< 5 minutes',
    'training_data', 'Includes customer service best practices'
  ),
  jsonb_build_object(
    'initial_prompt', 'You are a customer service professional...',
    'personality', 'Friendly and professional',
    'knowledge_base', 'customer-service-basics'
  )
),

-- Data Analysis EVE
(
  'eve',
  'Data Analyst EVE™',
  'Powerful virtual employee for data analysis and reporting. Transforms raw data into actionable insights using advanced AI capabilities.',
  'https://images.unsplash.com/photo-1551288049-bebda4e38f71',
  99.99,
  true,
  'monthly',
  get_or_create_default_company(),
  true,
  jsonb_build_object(
    'capabilities', ARRAY['Data analysis', 'Report generation', 'Trend analysis', 'Data visualization'],
    'supported_formats', ARRAY['CSV', 'Excel', 'JSON', 'SQL'],
    'analysis_types', ARRAY['Statistical', 'Predictive', 'Descriptive']
  ),
  jsonb_build_object(
    'initial_prompt', 'You are a data analysis expert...',
    'analysis_templates', jsonb_build_array(
      'basic_stats',
      'trend_analysis',
      'correlation_study'
    )
  )
),

-- Email Marketing Workflow
(
  'workflow',
  'Advanced Email Marketing Workflow',
  'Complete email marketing workflow including campaign planning, content generation, A/B testing, and performance analysis.',
  'https://images.unsplash.com/photo-1516321318423-f06f85e504b3',
  29.99,
  false,
  null,
  get_or_create_default_company(),
  true,
  jsonb_build_object(
    'steps', ARRAY['Campaign Planning', 'Content Generation', 'A/B Testing', 'Analytics'],
    'integrations', ARRAY['Mailchimp', 'SendGrid', 'HubSpot'],
    'templates', 5,
    'automation_rules', 10
  ),
  jsonb_build_object(
    'workflow_steps', jsonb_build_array(
      jsonb_build_object('name', 'Plan Campaign', 'type', 'task', 'duration', 'P1D'),
      jsonb_build_object('name', 'Generate Content', 'type', 'ai_task', 'duration', 'P1D'),
      jsonb_build_object('name', 'Setup A/B Test', 'type', 'task', 'duration', 'P1D'),
      jsonb_build_object('name', 'Analyze Results', 'type', 'analysis', 'duration', 'P1D')
    )
  )
),

-- Social Media Tasks
(
  'task',
  'Social Media Management Tasks',
  'Collection of pre-configured tasks for effective social media management across multiple platforms.',
  'https://images.unsplash.com/photo-1611162617474-5b21e879e113',
  19.99,
  false,
  null,
  get_or_create_default_company(),
  true,
  jsonb_build_object(
    'platforms', ARRAY['Twitter', 'LinkedIn', 'Facebook', 'Instagram'],
    'task_types', ARRAY['Content Creation', 'Scheduling', 'Analytics', 'Engagement'],
    'templates', 15
  ),
  jsonb_build_object(
    'tasks', jsonb_build_array(
      jsonb_build_object(
        'name', 'Generate Social Post',
        'prompt', 'Create an engaging social media post about...',
        'platforms', ARRAY['Twitter', 'LinkedIn']
      ),
      jsonb_build_object(
        'name', 'Schedule Content',
        'prompt', 'Schedule the following content across platforms...',
        'platforms', ARRAY['All']
      ),
      jsonb_build_object(
        'name', 'Engagement Report',
        'prompt', 'Analyze engagement metrics for...',
        'platforms', ARRAY['All']
      )
    )
  )
),

-- API Integration Actions
(
  'action',
  'Universal API Integration Actions',
  'Set of pre-built actions for common API integrations with error handling and rate limiting.',
  'https://images.unsplash.com/photo-1451187580459-43490279c0fa',
  39.99,
  false,
  null,
  get_or_create_default_company(),
  true,
  jsonb_build_object(
    'supported_apis', ARRAY['REST', 'GraphQL', 'SOAP'],
    'features', ARRAY['Error Handling', 'Rate Limiting', 'Authentication', 'Logging'],
    'templates', 20
  ),
  jsonb_build_object(
    'actions', jsonb_build_array(
      jsonb_build_object(
        'name', 'REST API Call',
        'method', 'POST',
        'headers', jsonb_build_object('Content-Type', 'application/json'),
        'error_handling', true
      ),
      jsonb_build_object(
        'name', 'GraphQL Query',
        'method', 'POST',
        'headers', jsonb_build_object('Content-Type', 'application/json'),
        'error_handling', true
      ),
      jsonb_build_object(
        'name', 'API Authentication',
        'method', 'POST',
        'headers', jsonb_build_object('Content-Type', 'application/json'),
        'error_handling', true
      )
    )
  )
);

-- Add initial reviews with a subquery to avoid duplicates
WITH new_items AS (
  SELECT id, creator_company_id 
  FROM marketplace_items 
  WHERE created_at >= NOW() - INTERVAL '1 minute'
),
available_companies AS (
  SELECT id 
  FROM companies 
  WHERE id = get_or_create_default_company()
),
review_data AS (
  SELECT 
    i.id as item_id,
    c.id as company_id,
    4 + floor(random() * 2)::int as rating,
    CASE floor(random() * 3)::int
      WHEN 0 THEN 'Excellent product, highly recommended!'
      WHEN 1 THEN 'Works great for our needs. Easy to set up and use.'
      WHEN 2 THEN 'Good value for money. Support is responsive.'
    END as review_text
  FROM new_items i
  CROSS JOIN available_companies c
)
INSERT INTO marketplace_reviews (item_id, company_id, rating, review_text)
SELECT 
  item_id,
  company_id,
  rating,
  review_text
FROM review_data
WHERE random() < 0.7; -- Add reviews to 70% of items

-- Update items with review counts and ratings
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
WHERE created_at >= NOW() - INTERVAL '1 minute';

-- Add some download counts
UPDATE marketplace_items
SET downloads_count = floor(random() * 100 + 10)
WHERE created_at >= NOW() - INTERVAL '1 minute';