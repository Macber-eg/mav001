import { useState, useEffect } from 'react';
import { Book, Search, Plus, Edit, Trash2, AlertCircle, Globe, Lock, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useCompanyKnowledge } from '../../hooks/useCompanyKnowledge';
import { CompanyKnowledge } from '../../types/database.types';

function KnowledgeBase() {
  const { user, isInitializing } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [isAddingKnowledge, setIsAddingKnowledge] = useState(false);
  const [isEditingKnowledge, setIsEditingKnowledge] = useState(false);
  const [selectedKnowledge, setSelectedKnowledge] = useState<CompanyKnowledge | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    category: 'general',
    key: '',
    value: '',
    importance: 1,
    isPrivate: false,
    metadata: '{}'
  });
  
  const {
    knowledge,
    isLoading,
    error,
    addKnowledge,
    updateKnowledge,
    deleteKnowledge,
    searchKnowledge,
    getKnowledgeByCategory
  } = useCompanyKnowledge({ companyId: user?.company_id });

  // Load knowledge when category changes or user is loaded
  useEffect(() => {
    if (!isInitializing && user?.company_id) {
      getKnowledgeByCategory(selectedCategory);
    }
  }, [selectedCategory, user?.company_id, isInitializing, getKnowledgeByCategory]);
  
  // Load knowledge items when category changes
  useEffect(() => {
    getKnowledgeByCategory(selectedCategory);
  }, [selectedCategory, getKnowledgeByCategory]);
  
  // Categories for knowledge organization
  const categories = [
    { id: 'general', name: 'General Knowledge' },
    { id: 'policies', name: 'Policies & Procedures' },
    { id: 'domain', name: 'Domain Knowledge' },
    { id: 'rules', name: 'Business Rules' },
    { id: 'contacts', name: 'Important Contacts' },
    { id: 'custom', name: 'Custom Knowledge' }
  ];
  
  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Parse value if it's JSON
      let valueToStore: any = formData.value;
      try {
        if (formData.value.trim().startsWith('{') || formData.value.trim().startsWith('[')) {
          valueToStore = JSON.parse(formData.value);
        }
      } catch (e) {
        // If parsing fails, store as string
        valueToStore = formData.value;
      }
      
      // Parse metadata
      let metadata = {};
      try {
        metadata = JSON.parse(formData.metadata);
      } catch (e) {
        console.warn('Failed to parse metadata JSON, using empty object');
      }
      
      if (isEditingKnowledge && selectedKnowledge) {
        await updateKnowledge(selectedKnowledge.id, {
          category: formData.category,
          key: formData.key,
          value: valueToStore,
          importance: formData.importance,
          is_private: formData.isPrivate,
          metadata
        });
      } else {
        await addKnowledge(
          formData.category,
          formData.key,
          valueToStore,
          formData.importance,
          formData.isPrivate,
          metadata
        );
      }
      
      // Reset form
      setFormData({
        category: 'general',
        key: '',
        value: '',
        importance: 1,
        isPrivate: false,
        metadata: '{}'
      });
      
      setIsAddingKnowledge(false);
      setIsEditingKnowledge(false);
      setSelectedKnowledge(null);
      
      // Refresh the current category
      getKnowledgeByCategory(selectedCategory);
    } catch (error) {
      console.error('Error saving knowledge:', error);
    }
  };
  
  // Handle search
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      getKnowledgeByCategory(selectedCategory);
      return;
    }
    
    try {
      await searchKnowledge(searchQuery);
    } catch (error) {
      console.error('Error searching knowledge:', error);
    }
  };
  
  // Format value for display
  const formatValue = (value: any): string => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return value.toString();
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 pt-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Knowledge Base</h1>
          <p className="text-gray-400">Manage and organize company-wide knowledge</p>
        </div>
        <button 
          onClick={() => setIsAddingKnowledge(true)}
          className="inline-flex items-center bg-black hover:bg-black/90 text-primary font-medium py-2 px-4 rounded-md border border-primary hover:shadow-neon transition-all duration-300"
        >
          <Plus size={16} className="mr-2" />
          Add Knowledge
        </button>
      </div>
      
      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-300 px-4 py-3 rounded mb-6 flex items-start">
          <AlertCircle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      
      <div className="bg-dark-surface rounded-lg shadow-md border border-dark-border overflow-hidden mb-6">
        <div className="p-4 border-b border-dark-border flex flex-col md:flex-row gap-4">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search size={18} className="text-gray-400" />
            </div>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search knowledge base..."
              className="pl-10 pr-4 py-2 bg-black/50 border border-dark-border text-white rounded-md w-full focus:ring-primary focus:border-primary"
            />
          </div>
        </div>
        
        {/* Categories */}
        <div className="flex space-x-2 overflow-x-auto p-4 border-b border-dark-border">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap ${
                selectedCategory === category.id
                  ? 'bg-black text-primary border border-primary'
                  : 'bg-black/30 text-gray-400 hover:bg-black/50'
              }`}
            >
              {category.name}
            </button>
          ))}
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center">
            <Loader2 size={24} className="animate-spin mx-auto text-primary" />
            <p className="mt-2 text-gray-400">Loading knowledge base...</p>
          </div>
        ) : knowledge.length > 0 ? (
          <div className="divide-y divide-dark-border">
            {knowledge.map(item => (
              <div key={item.id} className="p-6 hover:bg-black/20">
                <div className="flex justify-between items-start">
                  <div className="flex items-center">
                    <h3 className="font-medium text-white flex items-center">
                      {item.key}
                      {item.is_private ? (
                        <Lock size={14} className="ml-2 text-gray-400" />
                      ) : (
                        <Globe size={14} className="ml-2 text-gray-400" />
                      )}
                    </h3>
                    <span className={`ml-3 px-2 py-1 text-xs font-medium rounded-full ${
                      item.importance >= 4 ? 'bg-error/20 text-error' :
                      item.importance === 3 ? 'bg-warning/20 text-warning' :
                      'bg-info/20 text-info'
                    }`}>
                      Importance: {item.importance}
                    </span>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => {
                        setSelectedKnowledge(item);
                        setFormData({
                          category: item.category,
                          key: item.key,
                          value: typeof item.value === 'object' ? JSON.stringify(item.value, null, 2) : item.value,
                          importance: item.importance,
                          isPrivate: item.is_private,
                          metadata: JSON.stringify(item.metadata || {}, null, 2)
                        });
                        setIsEditingKnowledge(true);
                      }}
                      className="p-1 text-gray-400 hover:text-info"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this knowledge item?')) {
                          deleteKnowledge(item.id);
                        }
                      }}
                      className="p-1 text-gray-400 hover:text-error"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="mt-2">
                  <pre className="text-sm bg-black/30 p-3 rounded-md overflow-x-auto text-gray-300">
                    {formatValue(item.value)}
                  </pre>
                </div>
                
                {item.metadata && Object.keys(item.metadata).length > 0 && (
                  <div className="mt-2 text-xs text-gray-400">
                    <details>
                      <summary className="cursor-pointer hover:text-gray-300">
                        Additional Metadata
                      </summary>
                      <pre className="mt-1 p-2 bg-black/30 rounded text-gray-300">
                        {JSON.stringify(item.metadata, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 text-center">
            <Book size={24} className="mx-auto text-gray-500 mb-3" />
            <p className="text-gray-400 mb-2">No knowledge items found</p>
            <button
              onClick={() => setIsAddingKnowledge(true)}
              className="text-primary hover:underline inline-flex items-center"
            >
              <Plus size={16} className="mr-1" />
              Add your first knowledge item
            </button>
          </div>
        )}
      </div>
      
      {/* Add/Edit Knowledge Modal */}
      {(isAddingKnowledge || isEditingKnowledge) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-dark-surface rounded-lg p-6 max-w-2xl w-full mx-4 border border-dark-border">
            <h3 className="text-xl font-bold text-white mb-4">
              {isEditingKnowledge ? 'Edit Knowledge' : 'Add New Knowledge'}
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-primary focus:border-primary"
                  >
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Key
                  </label>
                  <input
                    type="text"
                    value={formData.key}
                    onChange={(e) => setFormData({...formData, key: e.target.value})}
                    className="w-full px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-primary focus:border-primary"
                    placeholder="e.g., company_mission"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Value
                </label>
                <textarea
                  value={formData.value}
                  onChange={(e) => setFormData({...formData, value: e.target.value})}
                  rows={5}
                  className="w-full px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-primary focus:border-primary font-mono text-sm"
                  placeholder="Enter value or JSON object..."
                />
                <p className="text-xs text-gray-400 mt-1">
                  For simple values, enter text. For structured data, enter valid JSON.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Importance (1-5)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={formData.importance}
                    onChange={(e) => setFormData({...formData, importance: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-primary focus:border-primary"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPrivate"
                    checked={formData.isPrivate}
                    onChange={(e) => setFormData({...formData, isPrivate: e.target.checked})}
                    className="h-4 w-4 text-primary focus:ring-primary border-dark-border rounded bg-black/50"
                  />
                  <label htmlFor="isPrivate" className="ml-2 block text-sm text-gray-300">
                    Private Knowledge (Admin Only)
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Metadata (Optional JSON)
                </label>
                <textarea
                  value={formData.metadata}
                  onChange={(e) => setFormData({...formData, metadata: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-primary focus:border-primary font-mono text-sm"
                  placeholder="{}"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t border-dark-border">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingKnowledge(false);
                    setIsEditingKnowledge(false);
                    setSelectedKnowledge(null);
                  }}
                  className="px-4 py-2 bg-gray-800 text-gray-300 rounded-md hover:bg-gray-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black text-primary rounded-md hover:bg-black/90 border border-primary hover:shadow-neon transition-all duration-300"
                >
                  {isEditingKnowledge ? 'Save Changes' : 'Add Knowledge'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default KnowledgeBase;