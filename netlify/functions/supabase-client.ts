import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export default supabaseAdmin;