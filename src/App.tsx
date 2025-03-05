import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import supabase, { verifySupabaseConnection } from './lib/supabase';
import LandingPage from './pages/LandingPage';
import { User } from './types/database.types';
import { mockData } from './lib/supabase-helper';

// Auth Components
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForgotPassword from './pages/auth/ForgotPassword';

// Main Components
import Dashboard from './pages/dashboard/Dashboard';
import EVEsList from './pages/eves/EVEsList';
import EVEDetails from './pages/eves/EVEDetails';
import CreateEVE from './pages/eves/CreateEVE';
import ActionsList from './pages/actions/ActionsList';
import ActionDetails from './pages/actions/ActionDetails';
import CreateAction from './pages/actions/CreateAction';
import TasksList from './pages/tasks/TasksList';
import CreateTask from './pages/tasks/CreateTask';
import TaskDetails from './pages/tasks/TaskDetails';
import CollaborationsList from './pages/collaborations/CollaborationsList';
import CreateCollaboration from './pages/collaborations/CreateCollaboration';
import NotificationsList from './pages/notifications/NotificationsList';
import LogsList from './pages/logs/LogsList';
import KnowledgeBase from './pages/knowledge/KnowledgeBase';
import Settings from './pages/settings/Settings';
import ProfileSettings from './pages/settings/ProfileSettings';
import Layout from './components/layout/Layout';
import NotFound from './pages/NotFound';
import ConnectionStatusBanner from './components/common/ConnectionStatusBanner';
import OpenAIStatusBanner from './components/common/OpenAIStatusBanner';

// Marketplace Components
import MarketplacePage from './pages/marketplace/MarketplacePage';
import MarketplaceItemDetails from './pages/marketplace/MarketplaceItemDetails';
import PublishItemPage from './pages/marketplace/PublishItemPage';
import PurchasesPage from './pages/marketplace/PurchasesPage';

// Auth Store
import { useAuthStore } from './stores/authStore';

function App() {
  const { user, setUser, isInitializing, setIsInitializing, signOut } = useAuthStore();
  const [userDetails, setUserDetails] = useState<User | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [isUsingMockData, setIsUsingMockData] = useState(false);
  const [connectionRetryCount, setConnectionRetryCount] = useState(0);

  useEffect(() => {
    async function getInitialSession() {
      setIsInitializing(true);

      try {
        // First, check if we can connect to Supabase
        const isConnected = await verifySupabaseConnection();
        
        if (!isConnected) {
          console.warn('Cannot connect to Supabase, using development mode with mock data');
          setIsUsingMockData(true);
          
          // In development, use mock data instead of failing
          if (import.meta.env.DEV) {
            setUser({
              id: mockData.users[0].id,
              email: mockData.users[0].email,
              user_metadata: { company_name: mockData.companies[0].name }
            } as any);
            setUserDetails(mockData.users[0] as User);
            setIsInitializing(false);
            return;
          } else {
            setConnectionError('Cannot connect to the database. Please check your connection and try again.');
            setIsInitializing(false);
            return;
          }
        }

        // Check for existing session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error fetching session:', sessionError);
          setConnectionError('Unable to connect to the authentication service. Please check your connection and try again.');
          setIsInitializing(false);
          return;
        }
        
        if (session?.user) {
          setUser(session.user);

          try {
            // Get user details from the users table
            const { data: userData, error: userError } = await supabase
              .from('users')
              .select('*')
              .eq('id', session.user.id)
              .maybeSingle();

            if (userError) {
              console.error('Error fetching user details:', userError);
              
              if (connectionRetryCount < 3) {
                // Retry a few times
                setConnectionRetryCount(prev => prev + 1);
                setTimeout(getInitialSession, 1000 * (connectionRetryCount + 1));
                return;
              }
              // Continue anyway - user might need to be created
            }

            if (userData) {
              setUserDetails(userData as User);
            } else {
              // User exists in Auth but not in the users table
              console.warn('User authenticated but no record found in users table');
              
              // Try to create the user record
              try {
                // Default to staff role and try to determine company from user metadata
                const companyName = session.user.user_metadata?.company_name || 'Default Company';
                
                // First check if company exists or create it
                const { data: companyData, error: companyError } = await supabase
                  .from('companies')
                  .insert([{ 
                    name: companyName,
                    primary_color: '#00FFB2',
                    secondary_color: '#1A1A40'
                  }])
                  .select()
                  .maybeSingle();
                
                if (companyError && !companyError.message.includes('duplicate key')) {
                  console.error('Company creation error:', companyError);
                  throw companyError;
                }
                
                const companyId = companyData?.id;
                
                if (companyId) {
                  // Create user record
                  const { data: newUserData, error: createError } = await supabase
                    .from('users')
                    .insert([{ 
                      id: session.user.id,
                      email: session.user.email || '',
                      company_id: companyId,
                      role: 'company_admin' // Default to admin for first user
                    }])
                    .select()
                    .single();
                  
                  if (createError) {
                    console.error('User record creation error:', createError);
                    throw createError;
                  }
                  
                  if (newUserData) {
                    setUserDetails(newUserData as User);
                  }
                } else {
                  console.error('Failed to get company ID');
                  throw new Error('Failed to get company ID');
                }
              } catch (err) {
                console.error('Failed to create user record:', err);
                // If we failed to create the user record, sign out
                await signOut();
              }
            }
          } catch (fetchError) {
            console.error('Error in user data fetch:', fetchError);
            // Continue with session but no user details
          }
        }

        // Listen for auth changes
        const { data: { subscription } } = await supabase.auth.onAuthStateChange(
          async (_event, session) => {
            setUser(session?.user ?? null);
            
            if (session?.user) {
              // Get user details when auth state changes
              try {
                const { data, error } = await supabase
                  .from('users')
                  .select('*')
                  .eq('id', session.user.id)
                  .maybeSingle();
                
                if (error) {
                  console.error('Error fetching user details on auth change:', error);
                }
                
                if (data) {
                  setUserDetails(data as User);
                } else {
                  // If user was manually deleted from users table but still exists in Auth
                  console.warn('User authenticated but no record found on auth change');
                  
                  // Try to recreate the user record
                  try {
                    const companyName = session.user.user_metadata?.company_name || 'Default Company';
                    
                    // First create/get company
                    const { data: companyData, error: companyError } = await supabase
                      .from('companies')
                      .insert([{ 
                        name: companyName,
                        primary_color: '#00FFB2',
                        secondary_color: '#1A1A40'
                      }])
                      .select()
                      .maybeSingle();
                    
                    if (companyError && !companyError.message.includes('duplicate key')) {
                      throw companyError;
                    }
                    
                    const companyId = companyData?.id;
                    
                    if (companyId) {
                      // Create user record
                      const { data: newUserData, error: createError } = await supabase
                        .from('users')
                        .insert([{ 
                          id: session.user.id,
                          email: session.user.email || '',
                          company_id: companyId,
                          role: 'company_admin'
                        }])
                        .select()
                        .maybeSingle();
                      
                      if (createError) {
                        throw createError;
                      }
                      
                      if (newUserData) {
                        setUserDetails(newUserData as User);
                      }
                    }
                  } catch (err) {
                    console.error('Failed to recreate user record:', err);
                  }
                }
              } catch (err) {
                console.error('Error in auth change handler:', err);
              }
            } else {
              setUserDetails(null);
            }
          }
        );

        return () => {
          subscription.unsubscribe();
        };
      } catch (error) {
        console.error('Error in auth initialization:', error);
        setConnectionError('Unable to initialize the application. Please check your connection and try again.');
      } finally {
        setIsInitializing(false);
      }
    }

    getInitialSession();
  }, [setUser, setIsInitializing, signOut, connectionRetryCount]);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral">
        <div className="p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-400">Loading Mavrika EVE Platform...</p>
        </div>
      </div>
    );
  }

  if (connectionError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-neutral">
        <div className="max-w-md p-6 bg-dark-surface rounded-lg shadow-neon text-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h2 className="text-xl font-bold text-white mb-2">Connection Error</h2>
          <p className="text-gray-400 mb-4">{connectionError}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-black text-primary rounded-md font-medium border border-primary hover:bg-black/90 hover:shadow-neon transition-all duration-300"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return (
    <Router>
      {/* Connection status banners */}
      <ConnectionStatusBanner />
      <OpenAIStatusBanner />
      
      {isUsingMockData && import.meta.env.DEV && (
        <div className="bg-blue-900/50 border-b border-blue-800 px-4 py-2">
          <div className="flex items-center justify-between text-blue-300">
            <span className="text-sm font-medium">
              Running in development mode with mock data. Database connection is not available.
            </span>
          </div>
        </div>
      )}
      
      <Routes>
        {/* Landing Page */}
        <Route path="/" element={!user ? <LandingPage /> : <Navigate to="/app/dashboard" replace />} />
        
        {/* Auth Routes */}
        <Route
          path="/login"
          element={!user ? <Login /> : <Navigate to="/app/dashboard" replace />}
        />
        <Route
          path="/register"
          element={!user ? <Register /> : <Navigate to="/app/dashboard" replace />}
        />
        <Route
          path="/forgot-password"
          element={!user ? <ForgotPassword /> : <Navigate to="/app/dashboard" replace />}
        />

        {/* Protected Routes */}
        <Route
          path="/app"
          element={user ? <Layout user={userDetails} /> : <Navigate to="/login" replace />}
        >
          <Route index element={<Navigate to="/app/dashboard" />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="eves" element={<EVEsList />} />
          <Route path="eves/new" element={<CreateEVE />} />
          <Route path="eves/:id" element={<EVEDetails />} />
          <Route path="actions" element={<ActionsList />} />
          <Route path="actions/new" element={<CreateAction />} />
          <Route path="actions/:id" element={<ActionDetails />} />
          
          {/* Task Routes */}
          <Route path="tasks" element={<TasksList />} />
          <Route path="tasks/new" element={<CreateTask />} />
          <Route path="tasks/:id" element={<TaskDetails />} />
          
          {/* Collaboration Routes */}
          <Route path="collaborations" element={<CollaborationsList />} />
          <Route path="collaborations/new" element={<CreateCollaboration />} />
          
          {/* Notification Routes */}
          <Route path="notifications" element={<NotificationsList />} />
          
          {/* Knowledge Base Route */}
          <Route path="knowledge" element={<KnowledgeBase />} />
          
          {/* Marketplace Routes */}
          <Route path="marketplace" element={<MarketplacePage />} />
          <Route path="marketplace/:id" element={<MarketplaceItemDetails />} />
          <Route path="marketplace/publish" element={<PublishItemPage />} />
          <Route path="marketplace/purchases" element={<PurchasesPage />} />
          
          <Route path="logs" element={<LogsList />} />
          <Route path="settings" element={<Settings />} />
          <Route path="profile" element={<ProfileSettings />} />
        </Route>

        {/* 404 Route */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Router>
  );
}

export default App;