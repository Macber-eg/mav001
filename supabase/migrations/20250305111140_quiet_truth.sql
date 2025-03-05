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

-- Insert marketplace items using a single transaction
DO $$ 
DECLARE
  default_company_id UUID;
BEGIN
  -- Get the default company ID
  SELECT get_or_create_default_company() INTO default_company_id;

  -- Insert marketplace items one at a time to avoid conflicts
  INSERT INTO marketplace_items 
  (type, name, description, preview_image_url, price, is_subscription, subscription_interval, creator_company_id, is_public, metadata, configuration)
  VALUES
  (
    'eve',
    'Sales Call Prep EVE™',
    'Generates detailed sales call briefs, including participant details and relevant insights.',
    'https://images.unsplash.com/photo-1542744173-8e7e53415bb0',
    49.99,
    true,
    'monthly',
    default_company_id,
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
  );

  -- Add a review for the first item
  INSERT INTO marketplace_reviews (
    item_id,
    company_id,
    rating,
    review_text
  )
  SELECT 
    id,
    default_company_id,
    5,
    'Excellent tool for our sales team! Has significantly improved our outreach efficiency.'
  FROM marketplace_items
  WHERE name = 'Sales Call Prep EVE™'
  AND creator_company_id = default_company_id;

  -- Insert second item
  INSERT INTO marketplace_items 
  (type, name, description, preview_image_url, price, is_subscription, subscription_interval, creator_company_id, is_public, metadata, configuration)
  VALUES
  (
    'eve',
    'Whatsapp Lead Outreach EVE™',
    'Automates Whatsapp Outreach messages, responds to customers, and book sales meetings',
    'https://images.unsplash.com/photo-1611162617474-5b21e879e113',
    79.99,
    true,
    'monthly',
    default_company_id,
    true,
    jsonb_build_object(
      'capabilities', ARRAY['Automated messaging', 'Response handling', 'Meeting scheduling', 'Lead qualification'],
      'platforms', ARRAY['Whatsapp Business API'],
      'message_templates', 15,
      'analytics', true
    ),
    jsonb_build_object(
      'initial_prompt', 'You are a professional sales outreach specialist...',
      'response_templates', jsonb_build_array(
        'initial_contact',
        'follow_up',
        'meeting_booking'
      )
    )
  );

  -- Update items with initial stats
  UPDATE marketplace_items
  SET 
    downloads_count = floor(random() * 100 + 10),
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

END $$;