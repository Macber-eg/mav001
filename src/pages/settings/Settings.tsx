import { useState } from 'react';
import { 
  Globe, Building, PaintBucket, Bell, Users, Lock, Save, 
  AlertCircle, Loader2, Plus, Trash2, CheckCircle, Brain 
} from 'lucide-react';
import { useCompanyStore } from '../../stores/companyStore';
import DeploySettings from './DeploySettings';
import OpenAISettings from './OpenAISettings';

function Settings() {
  const [activeTab, setActiveTab] = useState('company');
  const { company, users, updateCompany, addUser, updateUserRole, deactivateUser, isLoading, error } = useCompanyStore();
  
  // Form state for company settings
  const [formData, setFormData] = useState({
    name: company?.name || '',
    logo: company?.logo_url || '',
    colors: {
      primary: company?.primary_color || '#00FFB2',
      secondary: company?.secondary_color || '#1A1A40'
    },
    timezone: 'America/New_York',
    defaultLanguage: 'en',
    workingHours: '9:00 AM - 5:00 PM',
    notifications: {
      email: true,
      push: true,
      slack: false
    }
  });

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!company) return;

    try {
      await updateCompany({
        name: formData.name,
        logo_url: formData.logo,
        primary_color: formData.colors.primary,
        secondary_color: formData.colors.secondary
      });
    } catch (error) {
      console.error('Error updating company settings:', error);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Settings</h1>
        <p className="text-gray-400">Manage your company settings and preferences</p>
      </div>
      
      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-300 px-4 py-3 rounded mb-6 flex items-start">
          <AlertCircle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      
      <div className="bg-dark-surface rounded-lg shadow-md border border-dark-border overflow-hidden mb-6">
        <div className="sm:flex sm:items-start">
          <div className="border-b sm:border-b-0 sm:border-r border-dark-border sm:w-64 sm:h-full">
            <nav className="flex sm:flex-col">
              <button
                onClick={() => setActiveTab('company')}
                className={`px-4 py-3 text-sm font-medium w-full text-left flex items-center ${
                  activeTab === 'company'
                    ? 'bg-black/30 text-primary border-b-2 sm:border-b-0 sm:border-l-2 border-primary'
                    : 'text-gray-400 hover:text-primary'
                }`}
              >
                <Building size={18} className="mr-2" />
                Company Profile
              </button>
              
              <button
                onClick={() => setActiveTab('branding')}
                className={`px-4 py-3 text-sm font-medium w-full text-left flex items-center ${
                  activeTab === 'branding'
                    ? 'bg-black/30 text-primary border-b-2 sm:border-b-0 sm:border-l-2 border-primary'
                    : 'text-gray-400 hover:text-primary'
                }`}
              >
                <PaintBucket size={18} className="mr-2" />
                Branding
              </button>
              
              <button
                onClick={() => setActiveTab('notifications')}
                className={`px-4 py-3 text-sm font-medium w-full text-left flex items-center ${
                  activeTab === 'notifications'
                    ? 'bg-black/30 text-primary border-b-2 sm:border-b-0 sm:border-l-2 border-primary'
                    : 'text-gray-400 hover:text-primary'
                }`}
              >
                <Bell size={18} className="mr-2" />
                Notifications
              </button>
              
              <button
                onClick={() => setActiveTab('users')}
                className={`px-4 py-3 text-sm font-medium w-full text-left flex items-center ${
                  activeTab === 'users'
                    ? 'bg-black/30 text-primary border-b-2 sm:border-b-0 sm:border-l-2 border-primary'
                    : 'text-gray-400 hover:text-primary'
                }`}
              >
                <Users size={18} className="mr-2" />
                Users & Permissions
              </button>
              
              <button
                onClick={() => setActiveTab('integrations')}
                className={`px-4 py-3 text-sm font-medium w-full text-left flex items-center ${
                  activeTab === 'integrations'
                    ? 'bg-black/30 text-primary border-b-2 sm:border-b-0 sm:border-l-2 border-primary'
                    : 'text-gray-400 hover:text-primary'
                }`}
              >
                <Globe size={18} className="mr-2" />
                Integrations
              </button>
              
              <button
                onClick={() => setActiveTab('security')}
                className={`px-4 py-3 text-sm font-medium w-full text-left flex items-center ${
                  activeTab === 'security'
                    ? 'bg-black/30 text-primary border-b-2 sm:border-b-0 sm:border-l-2 border-primary'
                    : 'text-gray-400 hover:text-primary'
                }`}
              >
                <Lock size={18} className="mr-2" />
                Security
              </button>
              
              <button
                onClick={() => setActiveTab('deploy')}
                className={`px-4 py-3 text-sm font-medium w-full text-left flex items-center ${
                  activeTab === 'deploy'
                    ? 'bg-black/30 text-primary border-b-2 sm:border-b-0 sm:border-l-2 border-primary'
                    : 'text-gray-400 hover:text-primary'
                }`}
              >
                <Globe size={18} className="mr-2" />
                Deployment
              </button>
              
              <button
                onClick={() => setActiveTab('ai')}
                className={`px-4 py-3 text-sm font-medium w-full text-left flex items-center ${
                  activeTab === 'ai'
                    ? 'bg-black/30 text-primary border-b-2 sm:border-b-0 sm:border-l-2 border-primary'
                    : 'text-gray-400 hover:text-primary'
                }`}
              >
                <Brain size={18} className="mr-2" />
                AI Settings
              </button>
            </nav>
          </div>
          
          <div className="p-6 flex-1">
            {activeTab === 'company' && (
              <div>
                <h2 className="text-xl font-semibold text-white mb-4">Company Profile</h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Company Name
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-primary focus:border-primary"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Timezone
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
                        Default Language
                      </label>
                      <select 
                        value={formData.defaultLanguage}
                        onChange={(e) => setFormData({...formData, defaultLanguage: e.target.value})}
                        className="w-full px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-primary focus:border-primary"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish</option>
                        <option value="fr">French</option>
                        <option value="de">German</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Working Hours
                      </label>
                      <input
                        type="text"
                        value={formData.workingHours}
                        onChange={(e) => setFormData({...formData, workingHours: e.target.value})}
                        className="w-full px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-primary focus:border-primary"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-1">
                        Company Logo
                      </label>
                      <div className="flex items-center gap-4">
                        <img 
                          src={formData.logo} 
                          alt="Company Logo" 
                          className="h-16 w-auto bg-black/30 rounded-md p-2" 
                        />
                        <button className="text-primary hover:text-primary/80 text-sm font-medium">
                          Upload New Logo
                        </button>
                      </div>
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
                        Save Changes
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
            
            {activeTab === 'security' && (
              <div>
                <h2 className="text-xl font-semibold text-white mb-4">Security Settings</h2>
                
                <div className="space-y-6">
                  <div>
                    <h3 className="font-medium text-white mb-3">Password Requirements</h3>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          id="min-length"
                          type="checkbox"
                          defaultChecked={true}
                          className="h-4 w-4 text-primary focus:ring-primary border-dark-border rounded bg-black/50"
                        />
                        <label htmlFor="min-length" className="ml-2 block text-sm text-gray-300">
                          Minimum password length (8 characters)
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          id="special-chars"
                          type="checkbox"
                          defaultChecked={true}
                          className="h-4 w-4 text-primary focus:ring-primary border-dark-border rounded bg-black/50"
                        />
                        <label htmlFor="special-chars" className="ml-2 block text-sm text-gray-300">
                          Require special characters
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          id="password-expiry"
                          type="checkbox"
                          defaultChecked={false}
                          className="h-4 w-4 text-primary focus:ring-primary border-dark-border rounded bg-black/50"
                        />
                        <label htmlFor="password-expiry" className="ml-2 block text-sm text-gray-300">
                          Password expiry (90 days)
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-white mb-3">Two-Factor Authentication</h3>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <input
                          id="require-2fa"
                          type="checkbox"
                          defaultChecked={false}
                          className="h-4 w-4 text-primary focus:ring-primary border-dark-border rounded bg-black/50"
                        />
                        <label htmlFor="require-2fa" className="ml-2 block text-sm text-gray-300">
                          Require 2FA for all users
                        </label>
                      </div>
                      <div className="flex items-center">
                        <input
                          id="require-admin-2fa"
                          type="checkbox"
                          defaultChecked={true}
                          className="h-4 w-4 text-primary focus:ring-primary border-dark-border rounded bg-black/50"
                        />
                        <label htmlFor="require-admin-2fa" className="ml-2 block text-sm text-gray-300">
                          Require 2FA for admin users
                        </label>
                      </div>
                    </div>
                  </div>
                  
                  <div>
                    <h3 className="font-medium text-white mb-3">Session Settings</h3>
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="session-timeout" className="block text-sm text-gray-300 mb-1">
                          Session timeout (minutes)
                        </label>
                        <input
                          id="session-timeout"
                          type="number"
                          min="5"
                          max="240"
                          defaultValue={30}
                          className="w-full sm:w-1/3 px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-primary focus:border-primary"
                        />
                      </div>
                      <div className="flex items-center">
                        <input
                          id="force-logout"
                          type="checkbox"
                          defaultChecked={true}
                          className="h-4 w-4 text-primary focus:ring-primary border-dark-border rounded bg-black/50"
                        />
                        <label htmlFor="force-logout" className="ml-2 block text-sm text-gray-300">
                          Force logout after session timeout
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 border-t border-dark-border pt-6 flex justify-end">
                  <button className="bg-black hover:bg-black/90 text-primary font-medium py-2 px-4 rounded-md border border-primary hover:shadow-neon transition-all duration-300 flex items-center">
                    <Save size={16} className="mr-2" />
                    Save Changes
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'deploy' && (
              <DeploySettings />
            )}

            {activeTab === 'ai' && (
              <OpenAISettings />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;