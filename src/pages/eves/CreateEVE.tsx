import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Activity, AlertCircle, Loader2 } from 'lucide-react';
import { useEVEStore } from '../../stores/eveStore';

function CreateEVE() {
  const navigate = useNavigate();
  const { createEVE, isLoading, error } = useEVEStore();
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: 'training',
    workingHours: '9:00 AM - 5:00 PM',
    language: 'English',
    processingPriority: 'Medium',
    responseTime: 'Under 5 minutes',
    capabilities: ''
  });
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Split capabilities into an array
      const capabilities = formData.capabilities
        ? formData.capabilities.split(',').map(cap => cap.trim())
        : [];
      
      const newEVE = await createEVE({
        name: formData.name,
        description: formData.description,
        status: formData.status as 'active' | 'inactive' | 'training' | 'error',
        capabilities,
        settings: {
          workingHours: formData.workingHours,
          language: formData.language,
          processingPriority: formData.processingPriority,
          responseTime: formData.responseTime
        }
      });
      
      if (newEVE) {
        navigate(`/app/eves/${newEVE.id}`);
      }
    } catch (error) {
      console.error('Error creating EVE:', error);
    }
  };
  
  return (
    <div>
      <div className="mb-6 pt-4">
        <Link to="/app/eves" className="inline-flex items-center text-primary hover:text-primary/80 mb-4">
          <ArrowLeft size={16} className="mr-1" />
          Back to EVEs™
        </Link>
        
        <div className="flex items-center">
          <div className="h-12 w-12 rounded-full bg-black border border-primary flex items-center justify-center mr-4">
            <Activity size={24} className="text-primary" />
          </div>
          <h1 className="text-3xl font-bold text-white">Create New EVE™</h1>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-300 px-4 py-3 rounded mb-6 flex items-start">
          <AlertCircle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Error</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
      
      <div className="bg-dark-surface rounded-lg shadow-md border border-dark-border overflow-hidden mb-6">
        <div className="p-6">
          <form onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-300 mb-1">
                    EVE™ Name <span className="text-error">*</span>
                  </label>
                  <input
                    id="name"
                    name="name"
                    type="text"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-primary focus:border-primary"
                    placeholder="e.g., EVE-Assistant"
                  />
                </div>
                
                <div>
                  <label htmlFor="description" className="block text-sm font-medium text-gray-300 mb-1">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-primary focus:border-primary"
                    placeholder="Describe what this EVE™ will do..."
                  ></textarea>
                </div>
                
                <div>
                  <label htmlFor="capabilities" className="block text-sm font-medium text-gray-300 mb-1">
                    Capabilities (comma-separated)
                  </label>
                  <input
                    id="capabilities"
                    name="capabilities"
                    type="text"
                    value={formData.capabilities}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-primary focus:border-primary"
                    placeholder="e.g., Email management, Data analysis, Meeting scheduling"
                  />
                </div>
                
                <div>
                  <label htmlFor="workingHours" className="block text-sm font-medium text-gray-300 mb-1">
                    Working Hours
                  </label>
                  <input
                    id="workingHours"
                    name="workingHours"
                    type="text"
                    value={formData.workingHours}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-primary focus:border-primary"
                  />
                </div>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-300 mb-1">
                    Initial Status
                  </label>
                  <select
                    id="status"
                    name="status"
                    value={formData.status}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-primary focus:border-primary"
                  >
                    <option value="training">Training</option>
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="language" className="block text-sm font-medium text-gray-300 mb-1">
                    Language
                  </label>
                  <select
                    id="language"
                    name="language"
                    value={formData.language}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-primary focus:border-primary"
                  >
                    <option>English</option>
                    <option>Spanish</option>
                    <option>French</option>
                    <option>German</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="processingPriority" className="block text-sm font-medium text-gray-300 mb-1">
                    Processing Priority
                  </label>
                  <select
                    id="processingPriority"
                    name="processingPriority"
                    value={formData.processingPriority}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-primary focus:border-primary"
                  >
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Critical</option>
                  </select>
                </div>
                
                <div>
                  <label htmlFor="responseTime" className="block text-sm font-medium text-gray-300 mb-1">
                    Response Time
                  </label>
                  <select
                    id="responseTime"
                    name="responseTime"
                    value={formData.responseTime}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-primary focus:border-primary"
                  >
                    <option>Under 5 minutes</option>
                    <option>Under 15 minutes</option>
                    <option>Under 30 minutes</option>
                    <option>Under 1 hour</option>
                  </select>
                </div>
              </div>
            </div>
            
            <div className="mt-8 border-t border-dark-border pt-6 flex justify-end">
              <Link 
                to="/app/eves"
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-md font-medium mr-2"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-black hover:bg-black/90 text-primary rounded-md font-medium flex items-center border border-primary hover:shadow-neon transition-all duration-300"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Creating...
                  </>
                ) : (
                  'Create EVE™'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CreateEVE;