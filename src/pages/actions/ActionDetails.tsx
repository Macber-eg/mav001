import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Zap, Edit, Code, Globe, Building, Plus, Trash2, AlertCircle } from 'lucide-react';
import { useActionStore } from '../../stores/actionStore';
import { useEVEStore } from '../../stores/eveStore';
import { Action, EVE } from '../../types/database.types';

function ActionDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('details');
  
  const { getAction, updateAction, deleteAction, isLoading, error } = useActionStore();
  const { eves, fetchEVEs } = useEVEStore();
  
  const [action, setAction] = useState<Action | null>(null);
  const [selectedEveId, setSelectedEveId] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [usedByEves, setUsedByEves] = useState<EVE[]>([]);
  
  // Form data for editing
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    endpoint_url: '',
    method: 'POST',
    is_global: false,
    requiredParams: '',
    headersJson: ''
  });
  
  useEffect(() => {
    const loadData = async () => {
      if (id) {
        // Fetch action details
        const actionData = await getAction(id);
        if (actionData) {
          setAction(actionData);
          
          // Set form data
          setFormData({
            name: actionData.name,
            description: actionData.description || '',
            endpoint_url: actionData.endpoint_url || '',
            method: actionData.method || 'POST',
            is_global: actionData.is_global || false,
            requiredParams: actionData.required_params ? JSON.stringify(actionData.required_params, null, 2) : '[]',
            headersJson: actionData.headers ? JSON.stringify(actionData.headers, null, 2) : '{}'
          });
        } else {
          // Action not found
          navigate('/app/actions');
        }
        
        // Fetch EVEs
        await fetchEVEs();
      }
    };
    
    loadData();
  }, [id, getAction, fetchEVEs, navigate]);
  
  const handleSaveChanges = async () => {
    if (!id || !action) return;
    
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
      
      const updatedAction = await updateAction(id, {
        name: formData.name,
        description: formData.description,
        endpoint_url: formData.endpoint_url,
        method: formData.method,
        is_global: formData.is_global,
        required_params: requiredParams,
        headers: headers
      });
      
      if (updatedAction) {
        setAction(updatedAction);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Error updating action:', error);
    }
  };
  
  const handleDeleteAction = async () => {
    if (!id) return;
    
    try {
      await deleteAction(id);
      navigate('/actions');
    } catch (error) {
      console.error('Error deleting action:', error);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-green mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading action details...</p>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
        <div className="flex items-start">
          <AlertCircle size={24} className="mr-3 mt-0.5" />
          <div>
            <h3 className="font-medium text-lg">Error loading action</h3>
            <p>{error}</p>
            <Link to="/app/actions" className="mt-3 inline-block text-neon-green hover:underline">
              Return to actions list
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  if (!action) return null;

  return (
    <div>
      <div className="mb-6 pt-4">
        <Link to="/app/actions" className="inline-flex items-center text-neon-green hover:underline mb-4">
          <ArrowLeft size={16} className="mr-1" />
          Back to Actions
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center">
            <div className="h-12 w-12 rounded-full bg-black border border-neon-green flex items-center justify-center mr-4">
              <Zap size={24} className="text-neon-green" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-secondary">{action.name}</h1>
              <div className="flex items-center mt-1">
                {action.is_global ? (
                  <div className="flex items-center text-sm text-blue-600">
                    <Globe size={16} className="mr-1" />
                    Global Action
                  </div>
                ) : (
                  <div className="flex items-center text-sm text-gray-600">
                    <Building size={16} className="mr-1" />
                    Company-Specific Action
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button 
              onClick={() => setIsEditing(true)}
              className="bg-black hover:bg-black/90 text-neon-green font-medium py-2 px-4 rounded-md inline-flex items-center border border-neon-green"
            >
              <Edit size={16} className="mr-2" />
              Edit Action
            </button>
            
            <button 
              onClick={() => setIsDeleting(true)}
              className="border border-red-500 text-red-500 hover:bg-red-50 font-medium py-2 px-4 rounded-md inline-flex items-center"
            >
              <Trash2 size={16} className="mr-2" />
              Delete
            </button>
          </div>
        </div>
      </div>
      
      {/* Delete confirmation modal */}
      {isDeleting && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">Delete Action</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{action.name}"? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setIsDeleting(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAction}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="border-b">
          <nav className="flex overflow-x-auto">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
                activeTab === 'details'
                  ? 'border-b-2 border-neon-green text-neon-green'
                  : 'text-gray-600 hover:text-neon-green'
              }`}
            >
              Details
            </button>
            <button
              onClick={() => setActiveTab('parameters')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
                activeTab === 'parameters'
                  ? 'border-b-2 border-neon-green text-neon-green'
                  : 'text-gray-600 hover:text-neon-green'
              }`}
            >
              Parameters
            </button>
            <button
              onClick={() => setActiveTab('configuration')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
                activeTab === 'configuration'
                  ? 'border-b-2 border-neon-green text-neon-green'
                  : 'text-gray-600 hover:text-neon-green'
              }`}
            >
              Configuration
            </button>
            <button
              onClick={() => setActiveTab('usage')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
                activeTab === 'usage'
                  ? 'border-b-2 border-neon-green text-neon-green'
                  : 'text-gray-600 hover:text-neon-green'
              }`}
            >
              Usage
            </button>
          </nav>
        </div>
        
        <div className="p-6">
          {activeTab === 'details' && (
            <div>
              <h2 className="text-xl font-semibold text-secondary mb-4">Action Details</h2>
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <dt className="text-sm font-medium text-gray-500">Description</dt>
                  <dd className="mt-1 text-sm text-gray-900">{action.description || 'No description provided'}</dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500">Endpoint URL</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">{action.endpoint_url || 'Not defined'}</dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500">Method</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">{action.method}</dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500">Action Type</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {action.is_global ? 'Global' : 'Company-Specific'}
                  </dd>
                </div>
                
                <div>
                  <dt className="text-sm font-medium text-gray-500">Created</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {new Date(action.created_at).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>
          )}
          
          {activeTab === 'parameters' && (
            <div>
              <h2 className="text-xl font-semibold text-secondary mb-4">Required Parameters</h2>
              
              {action.required_params && (action.required_params as any[]).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Parameter
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Type
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Description
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {(action.required_params as any[]).map((param, index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-mono font-medium text-gray-900">
                              {typeof param === 'string' ? param : param.name}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {typeof param === 'string' ? 'string' : (param.type || 'any')}
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-500">
                              {typeof param === 'string' ? '' : (param.description || '')}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">No required parameters defined for this action.</p>
              )}
              
              <h2 className="text-xl font-semibold text-secondary mt-8 mb-4">Headers</h2>
              
              {action.headers && Object.keys(action.headers).length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Header
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Value
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(action.headers as Record<string, string>).map(([key, value], index) => (
                        <tr key={index}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-mono font-medium text-gray-900">{key}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm font-mono text-gray-900">{value}</div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500">No headers defined for this action.</p>
              )}
            </div>
          )}
          
          {activeTab === 'configuration' && isEditing ? (
            <div>
              <h2 className="text-xl font-semibold text-secondary mb-4">Action Configuration</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Action Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                    ></textarea>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Endpoint URL
                    </label>
                    <input
                      type="text"
                      value={formData.endpoint_url}
                      onChange={(e) => setFormData({...formData, endpoint_url: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green font-mono"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Method
                    </label>
                    <select 
                      value={formData.method}
                      onChange={(e) => setFormData({...formData, method: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                    >
                      <option>GET</option>
                      <option>POST</option>
                      <option>PUT</option>
                      <option>DELETE</option>
                      <option>PATCH</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Action Type
                    </label>
                    <select 
                      value={formData.is_global ? 'global' : 'company'}
                      onChange={(e) => setFormData({...formData, is_global: e.target.value === 'global'})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                    >
                      <option value="global">Global</option>
                      <option value="company">Company-Specific</option>
                    </select>
                  </div>
                  
                  <div className="pt-4">
                    <button 
                      onClick={() => setIsEditing(false)}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-medium py-2 px-4 rounded-md mr-2"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSaveChanges}
                      className="bg-black hover:bg-black/90 text-neon-green font-medium py-2 px-4 rounded-md border border-neon-green"
                    >
                      Save Changes
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Required Parameters (JSON)</h3>
                  <textarea
                    value={formData.requiredParams}
                    onChange={(e) => setFormData({...formData, requiredParams: e.target.value})}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green font-mono text-sm"
                    placeholder='[
  {
    "name": "param1",
    "type": "string",
    "description": "First parameter"
  }
]'
                  ></textarea>
                  <p className="text-xs text-gray-500 mt-1">Enter parameters as a JSON array. Simple strings or objects with name, type, description.</p>
                </div>
                
                <div>
                  <h3 className="font-medium text-gray-700 mb-2">Headers (JSON)</h3>
                  <textarea
                    value={formData.headersJson}
                    onChange={(e) => setFormData({...formData, headersJson: e.target.value})}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green font-mono text-sm"
                    placeholder='{
  "Content-Type": "application/json",
  "Authorization": "Bearer {token}"
}'
                  ></textarea>
                  <p className="text-xs text-gray-500 mt-1">Enter headers as a JSON object with key-value pairs.</p>
                </div>
              </div>
            </div>
          ) : activeTab === 'configuration' ? (
            <div>
              <h2 className="text-xl font-semibold text-secondary mb-4">Action Configuration</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Action Name
                    </label>
                    <input
                      type="text"
                      value={action.name}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={action.description || ''}
                      readOnly
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    ></textarea>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Endpoint URL
                    </label>
                    <input
                      type="text"
                      value={action.endpoint_url || ''}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md font-mono bg-gray-50"
                    />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Method
                    </label>
                    <input
                      type="text"
                      value={action.method}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Action Type
                    </label>
                    <input 
                      type="text"
                      value={action.is_global ? 'Global' : 'Company-Specific'}
                      readOnly
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                  </div>
                  
                  <div className="pt-4">
                    <button 
                      onClick={() => setIsEditing(true)}
                      className="bg-black hover:bg-black/90 text-neon-green font-medium py-2 px-4 rounded-md border border-neon-green"
                    >
                      <Edit size={16} className="mr-2 inline" />
                      Edit Action
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          
          {activeTab === 'usage' && (
            <div>
              <h2 className="text-xl font-semibold text-secondary mb-4">Used By</h2>
              
              {usedByEves.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          EVE™
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {usedByEves.map((eve) => (
                        <tr key={eve.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="font-medium text-gray-900">{eve.name}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              eve.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : eve.status === 'error'
                                ? 'bg-red-100 text-red-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {eve.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <Link to={`/eves/${eve.id}`} className="text-neon-green 
 hover:text-neon-green/80">
                              View EVE™
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 mb-6">This action is not currently used by any EVEs™.</p>
              )}
              
              <div className="mt-6">
                <h3 className="text-lg font-medium text-secondary mb-4">Add To EVE™</h3>
                <div className="flex gap-4">
                  <select 
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                    value={selectedEveId}
                    onChange={(e) => setSelectedEveId(e.target.value)}
                  >
                    <option value="">Select an EVE™...</option>
                    {eves.filter(eve => !usedByEves.some(used => used.id === eve.id)).map(eve => (
                      <option key={eve.id} value={eve.id}>{eve.name}</option>
                    ))}
                  </select>
                  <button 
                    className={`px-4 py-2 rounded-md flex items-center ${
                      selectedEveId 
                        ? 'bg-black hover:bg-black/90 text-neon-green border border-neon-green'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                    disabled={!selectedEveId}
                  >
                    <Plus size={16} className="mr-2" />
                    Add
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

export default ActionDetails;