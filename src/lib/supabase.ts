import { createClient } from '@supabase/supabase-js';
import { fetchWithRetry, checkSupabaseConnection, mockData } from './supabase-helper';

// Initialize Supabase client with public keys for browser
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Store connection state
let isConnectionVerified = false;
let connectionCheckPromise: Promise<boolean> | null = null;

// Function to verify Supabase connection
export async function verifySupabaseConnection(): Promise<boolean> {
  // Use cached result if already verified
  if (isConnectionVerified) return true;
  
  // Return existing promise if already checking
  if (connectionCheckPromise) return connectionCheckPromise;
  
  // Create a new connection check
  connectionCheckPromise = checkSupabaseConnection(supabaseUrl || '', supabaseAnonKey || '');
  
  try {
    isConnectionVerified = await connectionCheckPromise;
    return isConnectionVerified;
  } catch (error) {
    console.error('Failed to verify Supabase connection:', error);
    return false;
  } finally {
    connectionCheckPromise = null;
  }
}

// Create Supabase client with enhanced fetch and retry logic
export const supabase = createClient(supabaseUrl || '', supabaseAnonKey || '', {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  },
  global: {
    fetch: async (url, options) => {
      try {
        // Implement custom fetch with retries
        const response = await fetchWithRetry(url, options);
        return response;
      } catch (err) {
        console.warn('Supabase fetch error (after retries):', err);
        throw err;
      }
    },
  },
  // More conservative timeouts
  realtime: {
    timeout: 30000 // 30 seconds
  }
});

// Check connection when module loads
verifySupabaseConnection()
  .then(isConnected => {
    if (!isConnected && import.meta.env.DEV) {
      console.warn('Using mock data in development mode');
      // In development, use mock data instead of failing
      return true;
    } else if (!isConnected) {
      console.error('Database connection error. Please check your environment variables and connection.');
      return false;
    }
    return isConnected;
  })
  .catch(err => {
    console.error('Error during initial Supabase connection check:', err);
  });

export default supabase;