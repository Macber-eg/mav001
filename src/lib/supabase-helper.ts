/**
 * Helper functions for Supabase interactions with robust error handling
 */

// Maximum number of retry attempts for Supabase operations
const MAX_RETRIES = 3;

// Backoff time between retries (in ms)
const RETRY_BACKOFF = 1000;

// Custom fetch with retry logic
export async function fetchWithRetry(url: string, options: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  try {
    const response = await fetch(url, options);
    if (!response.ok && retries > 0) {
      console.log(`Fetch attempt failed, retrying... (${retries} attempts left)`);
      await new Promise(resolve => setTimeout(resolve, RETRY_BACKOFF * (MAX_RETRIES - retries + 1)));
      return fetchWithRetry(url, options, retries - 1);
    }
    return response;
  } catch (error) {
    if (retries <= 0) throw error;
    console.log(`Fetch attempt failed, retrying... (${retries} attempts left)`);
    await new Promise(resolve => setTimeout(resolve, RETRY_BACKOFF * (MAX_RETRIES - retries + 1)));
    return fetchWithRetry(url, options, retries - 1);
  }
}

// Check Supabase connection health
export async function checkSupabaseConnection(url: string, anonKey: string): Promise<boolean> {
  if (!url || !anonKey) {
    if (import.meta.env.DEV) {
      console.warn('Supabase credentials not found, using mock data in development');
      return false;
    }
    throw new Error('Supabase URL and anon key are required');
  }
  
  try {
    // Try to access the Supabase health endpoint
    const response = await fetchWithRetry(`${url}/rest/v1/`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey
      }
    }, 1); // Only try once for the health check
    
    return response.status < 500; // Consider any non-server error as "connected"
  } catch (error) {
    console.error('Supabase connection check failed:', error);
    return false;
  }
}

// Mock data for offline development
export const mockData = {
  users: [
    {
      id: '12345',
      email: 'demo@example.com',
      company_id: '67890',
      role: 'company_admin'
    }
  ],
  companies: [
    {
      id: '67890',
      name: 'Demo Company',
      primary_color: '#00BFA6',
      secondary_color: '#1A1A40'
    }
  ],
  eves: [
    {
      id: 'eve-1',
      name: 'EVE-Assistant',
      description: 'Virtual assistant for general tasks',
      company_id: '67890',
      status: 'active',
      capabilities: ['Email management', 'Scheduling', 'Data analysis'],
      settings: { workingHours: '9:00 AM - 5:00 PM' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    },
    {
      id: 'eve-2',
      name: 'EVE-Analytics',
      description: 'Specialized in data analysis and reporting',
      company_id: '67890',
      status: 'active',
      capabilities: ['Data analysis', 'Report generation', 'Trend analysis'],
      settings: { workingHours: '24/7' },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ]
};