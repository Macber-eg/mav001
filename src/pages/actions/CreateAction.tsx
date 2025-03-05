import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, AlertCircle, Loader2 } from 'lucide-react';
import { useActionStore } from '../../stores/actionStore';

function CreateAction() {
  const navigate = useNavigate();
  const { createAction, isLoading, error } = useActionStore();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    endpoint_url: '',
    method: 'POST',
    is_global: false,
    requiredParams: '[]',
    headersJson: '{}'
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: name === 'is_global' ? value === 'global' : value 
    }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Parse JSON fields
      let requiredParams = [];
      let headers = {};
      
      try {
        requiredParams = JSON.parse(formData.requiredParams);
      } catch (e) {
        alert('Required parameters must be a valid JSON array');
        return;
      }
      
      try {
        headers = JSON.parse(formData.headersJson);
      } catch (e) {
        alert('Headers must be a valid JSON object');
        return;
      }
      
      const newAction = await createAction({
        name: formData.name,
        description: formData.description,
        endpoint_url: formData.endpoint_url,
        method: formData.method,
        is_global: formData.is_global,
        required_params: requiredParams,
        headers: headers
      });
      
      if (newAction) {
        navigate(`/app/actions/${newAction.id}`);
      }
    } catch (error) {
      console.error('Error creating action:', error);
    }
  };
  
  return (
    <div>
      <div className="mb-6 pt-4">
        <Link to="/app/actions" className="inline-flex items-center text-neon-green hover:underline mb-4">
          <ArrowLeft size={16} className="mr-1" />
          Back to Actions
        </Link>
        
        <div className="flex items-center">
          <div className="h-12 w-12 rounded-full bg-black border border-neon-green flex items-center justify-center mr-4">
            <Zap size={24} className="text-neon-green" />
          </div>
          <h1 className="text-3xl font-bold text-secondary">Create New Action</h1>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 flex items-start">
          <AlertCircle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Action Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                    placeholder="e.g., Send Email"
                  />
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                    placeholder="Describe what this action does..."
                  ></textarea>
                </div>
                
                <div>
                  <label htmlFor="endpoint_url" className="block text-sm font-medium text-gray-700 mb-1">
                    Endpoint URL <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="endpoint_url"
                    name="endpoint_url"
                    type="text"
                    required
                    value={formData.endpoint_url}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green font-mono"
                    placeholder="e.g., /api/send-email"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="method" className="block text-sm font-medium text-gray-700 mb-1">
                    HTTP Method
                  </label>
                  <select
                    id="method"
                    name="method"
                    value={formData.method}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="is_global" className="block text-sm font-medium text-gray-700 mb-1">
                    Action Type
                  </label>
                  <select
                    id="is_global"
                    name="is_global"
                    value={formData.is_global ? 'global' : 'company'}
                    onChange={handleChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                  >
                    <option value="global">Global</option>
                    <option value="company">Company-Specific</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="requiredParams" className="block text-sm font-medium text-gray-700 mb-1">
                  Required Parameters (JSON Array)
                </label>
                <textarea
                  id="requiredParams"
                  name="requiredParams"
                  rows={8}
                  value={formData.requiredParams}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green font-mono text-sm"
                  placeholder='[
  {
    "name": "email",
    "type": "string",
    "description": "Recipient email address"
  },
  {
    "name": "subject",
    "type": "string",
    "description": "Email subject line"
  }
]'
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">Enter parameters as a JSON array. Simple strings or objects with name, type, description.</p>
              </div>
              
              <div>
                <label htmlFor="headersJson" className="block text-sm font-medium text-gray-700 mb-1">
                  Headers (JSON Object)
                </label>
                <textarea
                  id="headersJson"
                  name="headersJson"
                  rows={8}
                  value={formData.headersJson}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green font-mono text-sm"
                  placeholder='{
  "Content-Type": "application/json",
  "Authorization": "Bearer {token}"
}'
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">Enter headers as a JSON object with key-value pairs.</p>
              </div>
            </div>
            
            <div className="mt-8 border-t pt-6 flex justify-end">
              <Link 
                to="/actions"
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md font-medium mr-2"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-black hover:bg-black/90 text-neon-green rounded-md font-medium flex items-center border border-neon-green"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create Action'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateAction;