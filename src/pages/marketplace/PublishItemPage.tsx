import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, AlertCircle, Loader2, Image } from 'lucide-react';
import { useMarketplaceStore } from '../../stores/marketplaceStore';

function PublishItemPage() {
  const navigate = useNavigate();
  const { createItem, isLoading, error } = useMarketplaceStore();
  
  const [formData, setFormData] = useState({
    type: 'eve',
    name: '',
    description: '',
    preview_image_url: '',
    price: 0,
    is_subscription: false
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Create basic configuration based on type
      const configuration = {
        capabilities: [],
        settings: {},
        initial_prompt: `You are ${formData.name}, a specialized virtual employee...`,
        metadata: {}
      };
      
      const newItem = await createItem({
        ...formData,
        configuration,
        is_public: true // Always public by default
      });
      
      if (newItem) {
        navigate(`/app/marketplace/${newItem.id}`);
      }
    } catch (error) {
      console.error('Error publishing item:', error);
    }
  };

  return (
    <div>
      <div className="mb-6 pt-4">
        <Link to="/app/marketplace" className="inline-flex items-center text-neon-green hover:underline mb-4">
          <ArrowLeft size={16} className="mr-1" />
          Back to Marketplace
        </Link>
        
        <div className="flex items-center">
          <div className="h-12 w-12 rounded-full bg-black border border-neon-green flex items-center justify-center mr-4">
            <Plus size={24} className="text-neon-green" />
          </div>
          <h1 className="text-3xl font-bold text-secondary">Publish New Item</h1>
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
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Type <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({...formData, type: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                  required
                >
                  <option value="eve">Virtual Employee</option>
                  <option value="workflow">Workflow</option>
                  <option value="task">Task</option>
                  <option value="action">Action</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                  placeholder="Give your item a name"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                placeholder="Describe what your item does and its key features"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Preview Image URL
              </label>
              <div className="mt-1 flex items-center gap-4">
                <div className="flex-1">
                  <input
                    type="url"
                    value={formData.preview_image_url}
                    onChange={(e) => setFormData({...formData, preview_image_url: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                    placeholder="https://example.com/image.jpg"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Add an image URL to showcase your item in the marketplace
                  </p>
                </div>
                {formData.preview_image_url && (
                  <div className="h-20 w-20 border rounded-md overflow-hidden">
                    <img 
                      src={formData.preview_image_url} 
                      alt="Preview"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        e.currentTarget.src = 'https://via.placeholder.com/80?text=Invalid+URL';
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Price <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-gray-500">
                    $
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({...formData, price: parseFloat(e.target.value)})}
                    className="w-full pl-7 pr-4 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                    required
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Set to 0 for free items
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Pricing Model
                </label>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="is_subscription"
                    checked={formData.is_subscription}
                    onChange={(e) => setFormData({...formData, is_subscription: e.target.checked})}
                    className="h-4 w-4 text-neon-green focus:ring-neon-green border-gray-300 rounded"
                  />
                  <label htmlFor="is_subscription" className="text-sm text-gray-700">
                    Subscription (monthly billing)
                  </label>
                </div>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3 pt-6 border-t">
              <Link 
                to="/app/marketplace"
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isLoading}
                className="px-4 py-2 bg-black text-neon-green rounded-md hover:bg-black/90 border border-neon-green flex items-center"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    Publishing...
                  </>
                ) : (
                  <>
                    <Plus size={16} className="mr-2" />
                    Publish Item
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default PublishItemPage;