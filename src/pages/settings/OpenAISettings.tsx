import { useState, useEffect } from 'react';
import { Save, Key, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import supabase from '../../lib/supabase';
import { CompanyAISettings } from '../../types/database.types';

function OpenAISettings() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [settings, setSettings] = useState<CompanyAISettings | null>(null);
  
  // Form state
  const [apiKey, setApiKey] = useState('');
  const [orgId, setOrgId] = useState('');
  const [useCompanyKeys, setUseCompanyKeys] = useState(false);
  const [defaultModel, setDefaultModel] = useState('gpt-4');
  const [tokenQuota, setTokenQuota] = useState<number | undefined>(undefined);
  
  // Available models
  const availableModels = [
    { id: 'gpt-4', name: 'GPT-4' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
  ];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      // First, get the user's company ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();
      
      if (userError) throw userError;
      if (!userData) throw new Error('User record not found');
      
      // Then, get the company's AI settings
      const { data, error: settingsError } = await supabase
        .from('company_ai_settings')
        .select('*')
        .eq('company_id', userData.company_id)
        .maybeSingle();
      
      if (settingsError) throw settingsError;
      
      // If settings exist, populate the form
      if (data) {
        setSettings(data as CompanyAISettings);
        setApiKey(data.openai_api_key || '');
        setOrgId(data.openai_org_id || '');
        setUseCompanyKeys(data.use_company_keys || false);
        setDefaultModel(data.default_model || 'gpt-4');
        setTokenQuota(data.token_quota || undefined);
      }
    } catch (error: any) {
      console.error('Error fetching OpenAI settings:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const saveSettings = async () => {
    setIsSaving(true);
    setError(null);
    setSuccess(false);
    
    try {
      // First, get the user's company ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .maybeSingle();
      
      if (userError) throw userError;
      if (!userData) throw new Error('User record not found');
      
      const settingsData = {
        company_id: userData.company_id,
        openai_api_key: apiKey,
        openai_org_id: orgId,
        use_company_keys: useCompanyKeys,
        default_model: defaultModel,
        token_quota: tokenQuota
      };
      
      if (settings?.id) {
        // Update existing record
        const { error: updateError } = await supabase
          .from('company_ai_settings')
          .update(settingsData)
          .eq('id', settings.id);
        
        if (updateError) throw updateError;
      } else {
        // Create new record
        const { error: insertError } = await supabase
          .from('company_ai_settings')
          .insert([settingsData]);
        
        if (insertError) throw insertError;
      }
      
      // Refresh settings
      await fetchSettings();
      setSuccess(true);
      
      // Clear success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
      
    } catch (error: any) {
      console.error('Error saving OpenAI settings:', error);
      setError(error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await fetch('/api/test-openai-connection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiKey: apiKey,
          orgId: orgId
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to test OpenAI connection');
      }
      
      alert('OpenAI connection successful! Your API key is valid.');
      
    } catch (error: any) {
      console.error('Error testing OpenAI connection:', error);
      setError(`Connection test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading && !settings) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 size={24} className="animate-spin text-neon-green mr-2" />
        <span>Loading OpenAI settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-secondary">OpenAI Integration</h2>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-start">
          <AlertCircle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded flex items-start">
          <CheckCircle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
          <span>Settings saved successfully!</span>
        </div>
      )}
      
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-medium text-gray-900">API Configuration</h3>
            <div className="flex items-center text-sm">
              <input
                id="use-company-keys"
                type="checkbox"
                checked={useCompanyKeys}
                onChange={(e) => setUseCompanyKeys(e.target.checked)}
                className="h-4 w-4 text-neon-green focus:ring-neon-green border-gray-300 rounded"
              />
              <label htmlFor="use-company-keys" className="ml-2 block text-gray-700">
                Use company API keys (instead of platform keys)
              </label>
            </div>
          </div>
          
          <div className="text-sm text-gray-500 mb-4">
            {useCompanyKeys 
              ? "Your company's OpenAI API key will be used for all AI operations." 
              : "The platform's OpenAI API key will be used. Configure your own key to customize AI operations."}
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="api-key" className="block text-sm font-medium text-gray-700 mb-1">
                OpenAI API Key
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key size={16} className="text-gray-400" />
                </div>
                <input
                  type="password"
                  id="api-key"
                  className="focus:ring-neon-green focus:border-neon-green block w-full pl-10 pr-12 sm:text-sm border-gray-300 rounded-md"
                  placeholder="sk-..."
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">
                Your OpenAI API key is stored securely and used for AI operations.
              </p>
            </div>
            
            <div>
              <label htmlFor="org-id" className="block text-sm font-medium text-gray-700 mb-1">
                OpenAI Organization ID (Optional)
              </label>
              <input
                type="text"
                id="org-id"
                className="focus:ring-neon-green focus:border-neon-green block w-full sm:text-sm border-gray-300 rounded-md"
                placeholder="org-..."
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
              />
              <p className="mt-1 text-xs text-gray-500">
                If you're part of an organization in OpenAI, enter your org ID here.
              </p>
            </div>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="font-medium text-gray-900 mb-4">Model Settings</h3>
          
          <div>
            <label htmlFor="default-model" className="block text-sm font-medium text-gray-700 mb-1">
              Default Model
            </label>
            <select
              id="default-model"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-neon-green focus:border-neon-green sm:text-sm rounded-md"
              value={defaultModel}
              onChange={(e) => setDefaultModel(e.target.value)}
            >
              {availableModels.map(model => (
                <option key={model.id} value={model.id}>{model.name}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">
              This model will be used by default when no specific model is requested.
            </p>
          </div>
        </div>
        
        <div className="mb-6">
          <h3 className="font-medium text-gray-900 mb-4">Usage & Billing</h3>
          
          <div>
            <label htmlFor="token-quota" className="block text-sm font-medium text-gray-700 mb-1">
              Monthly Token Quota (Optional)
            </label>
            <input
              type="number"
              id="token-quota"
              className="focus:ring-neon-green focus:border-neon-green block w-full sm:text-sm border-gray-300 rounded-md"
              placeholder="e.g., 1000000"
              value={tokenQuota !== undefined ? tokenQuota : ''}
              onChange={(e) => setTokenQuota(e.target.value ? parseInt(e.target.value) : undefined)}
            />
            <p className="mt-1 text-xs text-gray-500">
              Set a monthly token quota to control costs. Leave empty for unlimited usage.
            </p>
          </div>
          
          {settings && (
            <div className="mt-4 bg-gray-50 p-4 rounded-md">
              <div className="text-sm text-gray-700">
                <p><strong>Tokens Used This Month:</strong> {settings.tokens_used?.toLocaleString() || 0}</p>
                {settings.token_quota && (
                  <div className="mt-2">
                    <p className="mb-1">Usage: {Math.round((settings.tokens_used || 0) / settings.token_quota * 100)}%</p>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-neon-green h-2.5 rounded-full" 
                        style={{ width: `${Math.min(100, Math.round((settings.tokens_used || 0) / settings.token_quota * 100))}%` }}
                      ></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="border-t pt-4 flex justify-between">
          <button
            type="button"
            onClick={testConnection}
            disabled={!apiKey || isSaving || isLoading}
            className={`px-4 py-2 border rounded-md text-sm font-medium ${
              !apiKey || isSaving || isLoading
                ? 'border-gray-300 bg-gray-100 text-gray-500 cursor-not-allowed'
                : 'border-neon-green text-neon-green hover:bg-neon-green/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neon-green'
            }`}
          >
            Test Connection
          </button>
          
          <button
            type="button"
            onClick={saveSettings}
            disabled={isSaving || isLoading}
            className={`px-4 py-2 rounded-md text-sm font-medium ${
              isSaving || isLoading
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : 'bg-black text-neon-green hover:bg-black/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-neon-green border border-neon-green'
            }`}
          >
            {isSaving ? (
              <>
                <Loader2 size={16} className="inline-block mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save size={16} className="inline-block mr-2" />
                Save Settings
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default OpenAISettings;