import { useState, useEffect } from 'react';
import { User, Mail, Briefcase, Image, Save, Loader2, AlertCircle, Globe, Clock } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import supabase from '../../lib/supabase';

function ProfileSettings() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('profile');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Form data state
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    jobTitle: '',
    bio: '',
    avatarUrl: '',
    phone: '',
    timezone: 'America/New_York',
    language: 'en',
    notifications: {
      email: true,
      push: false
    }
  });

  // Fetch or create user profile data
  useEffect(() => {
    async function fetchOrCreateProfile() {
      if (!user) return;

      setIsLoading(true);
      try {
        // First try to get existing profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (profileError && profileError.code !== 'PGRST116') {
          throw profileError;
        }

        if (!profile) {
          // Profile doesn't exist, create it
          const { data: newProfile, error: createError } = await supabase
            .from('profiles')
            .insert([{ 
              id: user.id,
              full_name: '',
              notification_preferences: {
                email: true,
                push: false
              }
            }])
            .select()
            .single();

          if (createError) throw createError;

          // Use the newly created profile
          setFormData({
            fullName: '',
            email: user.email || '',
            jobTitle: '',
            bio: '',
            avatarUrl: '',
            phone: '',
            timezone: 'America/New_York',
            language: 'en',
            notifications: {
              email: true,
              push: false
            }
          });
        } else {
          // Use existing profile
          setFormData({
            fullName: profile.full_name || '',
            email: user.email || '',
            jobTitle: profile.job_title || '',
            bio: profile.bio || '',
            avatarUrl: profile.avatar_url || '',
            phone: profile.phone || '',
            timezone: profile.timezone || 'America/New_York',
            language: profile.language || 'en',
            notifications: profile.notification_preferences || {
              email: true,
              push: false
            }
          });
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrCreateProfile();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsLoading(true);
    setError(null);
    setSuccess(false);

    try {
      const { error: updateError } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          full_name: formData.fullName,
          job_title: formData.jobTitle,
          bio: formData.bio,
          avatar_url: formData.avatarUrl,
          phone: formData.phone,
          timezone: formData.timezone,
          language: formData.language,
          notification_preferences: formData.notifications,
          updated_at: new Date().toISOString()
        });

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Profile Settings</h1>
        <p className="text-gray-400">Manage your personal profile and preferences</p>
      </div>
      
      <div className="bg-dark-surface rounded-lg shadow-md overflow-hidden">
        <div className="border-b border-dark-border">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('profile')}
              className={`px-4 py-3 text-sm font-medium ${
                activeTab === 'profile'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-400 hover:text-primary'
              }`}
            >
              Profile Information
            </button>
            <button
              onClick={() => setActiveTab('account')}
              className={`px-4 py-3 text-sm font-medium ${
                activeTab === 'account'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-400 hover:text-primary'
              }`}
            >
              Account Preferences
            </button>
            <button
              onClick={() => setActiveTab('password')}
              className={`px-4 py-3 text-sm font-medium ${
                activeTab === 'password'
                  ? 'border-b-2 border-primary text-primary'
                  : 'text-gray-400 hover:text-primary'
              }`}
            >
              Password
            </button>
          </nav>
        </div>
        
        <div className="p-6">
          {error && (
            <div className="bg-red-900/20 border border-red-800 text-red-300 px-4 py-3 rounded mb-6 flex items-start">
              <AlertCircle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-900/20 border border-green-800 text-green-300 px-4 py-3 rounded mb-6 flex items-start">
              <Save size={20} className="mr-2 mt-0.5 flex-shrink-0" />
              <p>Profile updated successfully</p>
            </div>
          )}

          {activeTab === 'profile' && (
            <form onSubmit={handleSubmit}>
              <div className="flex flex-col md:flex-row md:items-center gap-6 mb-6">
                <div className="flex-shrink-0">
                  <div className="relative">
                    <img 
                      src={formData.avatarUrl || 'https://via.placeholder.com/96'} 
                      alt="Profile" 
                      className="h-24 w-24 rounded-full object-cover border-4 border-dark-border" 
                    />
                    <button className="absolute bottom-0 right-0 bg-dark-surface rounded-full p-1 shadow-md border border-dark-border">
                      <Image size={16} className="text-primary" />
                    </button>
                  </div>
                </div>
                
                <div className="flex-1">
                  <h2 className="text-xl font-semibold text-white">{formData.fullName || user?.email}</h2>
                  <p className="text-gray-400">{formData.email}</p>
                  <p className="text-gray-500 text-sm mt-1">{formData.jobTitle}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      <User size={16} className="inline mr-1" /> Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) => setFormData({...formData, fullName: e.target.value})}
                      className="w-full px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-primary focus:border-primary"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      <Mail size={16} className="inline mr-1" /> Email Address
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      readOnly
                      className="w-full px-3 py-2 bg-black/30 border border-dark-border text-gray-400 rounded-md cursor-not-allowed"
                    />
                    <p className="mt-1 text-xs text-gray-500">Contact your administrator to change email address</p>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      <Briefcase size={16} className="inline mr-1" /> Job Title
                    </label>
                    <input
                      type="text"
                      value={formData.jobTitle}
                      onChange={(e) => setFormData({...formData, jobTitle: e.target.value})}
                      className="w-full px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      <Globe size={16} className="inline mr-1" /> Language
                    </label>
                    <select 
                      value={formData.language}
                      onChange={(e) => setFormData({...formData, language: e.target.value})}
                      className="w-full px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-primary focus:border-primary"
                    >
                      <option value="en">English</option>
                      <option value="es">Spanish</option>
                      <option value="fr">French</option>
                      <option value="de">German</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      <Clock size={16} className="inline mr-1" /> Timezone
                    </label>
                    <select 
                      value={formData.timezone}
                      onChange={(e) => setFormData({...formData, timezone: e.target.value})}
                      className="w-full px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-primary focus:border-primary"
                    >
                      <option value="America/New_York">Eastern Time (ET)</option>
                      <option value="America/Chicago">Central Time (CT)</option>
                      <option value="America/Denver">Mountain Time (MT)</option>
                      <option value="America/Los_Angeles">Pacific Time (PT)</option>
                      <option value="Europe/London">Greenwich Mean Time (GMT)</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Bio
                    </label>
                    <textarea
                      value={formData.bio}
                      onChange={(e) => setFormData({...formData, bio: e.target.value})}
                      rows={4}
                      className="w-full px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-primary focus:border-primary"
                    ></textarea>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 border-t border-dark-border pt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="bg-black hover:bg-black/90 text-primary font-medium py-2 px-4 rounded-md border border-primary hover:shadow-neon transition-all duration-300 flex items-center"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save size={16} className="mr-2" />
                      Save Changes
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
          
          {activeTab === 'account' && (
            <div>
              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-300 mb-2">Notification Preferences</h3>
                  <div className="space-y-2">
                    <div className="flex items-center">
                      <input
                        id="email-notif"
                        type="checkbox"
                        checked={formData.notifications.email}
                        onChange={(e) => setFormData({
                          ...formData, 
                          notifications: {
                            ...formData.notifications,
                            email: e.target.checked
                          }
                        })}
                        className="h-4 w-4 text-primary focus:ring-primary border-dark-border rounded bg-black/50"
                      />
                      <label htmlFor="email-notif" className="ml-2 block text-sm text-gray-300">
                        Email notifications
                      </label>
                    </div>
                    <div className="flex items-center">
                      <input
                        id="push-notif"
                        type="checkbox"
                        checked={formData.notifications.push}
                        onChange={(e) => setFormData({
                          ...formData,
                          notifications: {
                            ...formData.notifications,
                            push: e.target.checked
                          }
                        })}
                        className="h-4 w-4 text-primary focus:ring-primary border-dark-border rounded bg-black/50"
                      />
                      <label htmlFor="push-notif" className="ml-2 block text-sm text-gray-300">
                        Push notifications
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 border-t border-dark-border pt-6 flex justify-end">
                  <button
                    onClick={handleSubmit}
                    disabled={isLoading}
                    className="bg-black hover:bg-black/90 text-primary font-medium py-2 px-4 rounded-md border border-primary hover:shadow-neon transition-all duration-300 flex items-center"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 size={16} className="mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save size={16} className="mr-2" />
                        Save Preferences
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'password' && (
            <div>
              <div className="max-w-md mx-auto">
                <p className="text-sm text-gray-400 mb-4">
                  Change your password by entering your current password and a new password below.
                </p>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Current Password
                    </label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-primary focus:border-primary"
                      placeholder="••••••••"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      New Password
                    </label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-primary focus:border-primary"
                      placeholder="••••••••"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      className="w-full px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-primary focus:border-primary"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
                
                <div className="mt-6 border-t border-dark-border pt-6 flex justify-end">
                  <button className="bg-black hover:bg-black/90 text-primary font-medium py-2 px-4 rounded-md border border-primary hover:shadow-neon transition-all duration-300 flex items-center">
                    <Save size={16} className="mr-2" />
                    Update Password
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProfileSettings;