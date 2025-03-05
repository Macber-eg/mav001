-- Add notification_preferences column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT jsonb_build_object(
  'email', true,
  'push', false
);

-- Add other missing columns to profiles table
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS timezone TEXT DEFAULT 'America/New_York',
  ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'en';

-- Create or replace function to get profile with defaults
CREATE OR REPLACE FUNCTION get_profile_with_defaults(profile_id UUID)
RETURNS TABLE (
  id UUID,
  full_name TEXT,
  avatar_url TEXT,
  job_title TEXT,
  bio TEXT,
  phone TEXT,
  timezone TEXT,
  language TEXT,
  notification_preferences JSONB,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id,
    COALESCE(p.full_name, '') as full_name,
    COALESCE(p.avatar_url, '') as avatar_url,
    COALESCE(p.job_title, '') as job_title,
    COALESCE(p.bio, '') as bio,
    COALESCE(p.phone, '') as phone,
    COALESCE(p.timezone, 'America/New_York') as timezone,
    COALESCE(p.language, 'en') as language,
    COALESCE(p.notification_preferences, jsonb_build_object(
      'email', true,
      'push', false
    )) as notification_preferences,
    COALESCE(p.created_at, NOW()) as created_at,
    COALESCE(p.updated_at, NOW()) as updated_at
  FROM profiles p
  WHERE p.id = profile_id;
END;
$$ LANGUAGE plpgsql;

-- Create or replace function to ensure profile exists
CREATE OR REPLACE FUNCTION ensure_profile_exists()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id)
  VALUES (NEW.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to ensure profile exists when user is created
DROP TRIGGER IF EXISTS ensure_profile_exists_trigger ON users;
CREATE TRIGGER ensure_profile_exists_trigger
  AFTER INSERT ON users
  FOR EACH ROW
  EXECUTE FUNCTION ensure_profile_exists();

-- Update existing profiles with default notification preferences if null
UPDATE profiles 
SET notification_preferences = jsonb_build_object(
  'email', true,
  'push', false
)
WHERE notification_preferences IS NULL;