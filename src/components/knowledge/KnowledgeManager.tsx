import { useState } from 'react';
import { Brain, Plus, Search, Edit, Trash2, Lock, Globe, AlertCircle, Loader2 } from 'lucide-react';
import { useCompanyKnowledge } from '../../hooks/useCompanyKnowledge';
import { useEVEKnowledge } from '../../hooks/useEVEKnowledge';
import { EVE, CompanyKnowledge, EVEKnowledge } from '../../types/database.types';

interface KnowledgeManagerProps {
  eve?: EVE; // Optional EVE for EVE-specific knowledge
  companyId: string;
}

export function KnowledgeManager({ eve, companyId }: KnowledgeManagerProps) {
  const [activeTab, setActiveTab] = useState<'company' | 'eve'>('company');
  const [selectedCategory, setSelectedCategory] = useState('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddingKnowledge, setIsAddingKnowledge] = useState(false);
  const [isEditingKnowledge, setIsEditingKnowledge] = useState(false);
  const [selectedKnowledge, setSelectedKnowledge] = useState<CompanyKnowledge | EVEKnowledge | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    category: 'general',
    key: '',
    value: '',
    importance: 1,
    isPrivate: false,
    metadata: '{}'
  });
  
  // Company knowledge hook
  const {
    knowledge: companyKnowledge,
    isLoading: companyLoading,
    error: companyError,
    addKnowledge: addCompanyKnowledge,
    updateKnowledge: updateCompanyKnowledge,
    deleteKnowledge: deleteCompanyKnowledge,
    searchKnowledge: searchCompanyKnowledge,
    getKnowledgeByCategory: getCompanyKnowledgeByCategory
  } = useCompanyKnowledge({ companyId });
  
  // EVE knowledge hook (if EVE is provided)
  const {
    knowledge: eveKnowledge,
    isLoading: eveLoading,
    error: eveError,
    addKnowledge: addEVEKnowledge,
    updateKnowledge: updateEVEKnowledge,
    deleteKnowledge: deleteEVEKnowledge,
    searchKnowledge: searchEVEKnowledge,
    getKnowledgeByCategory: getEVEKnowledgeByCategory
  } = useEVEKnowledge({ 
    eveId: eve?.id || '', 
    companyId 
  });
  
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
      
      if (activeTab === 'company') {
        await addCompanyKnowledge(
          formData.category,
          formData.key,
          valueToStore,
          formData.importance,
          formData.isPrivate,
          metadata
        );
      } else if (eve) {
        await addEVEKnowledge(
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
    } catch (error) {
      console.error('Error adding knowledge:', error);
    }
  };
  
  // Handle knowledge deletion
  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this knowledge? This action cannot be undone.')) {
      try {
        if (activeTab === 'company') {
          await deleteCompanyKnowledge(id);
        } else if (eve) {
          await deleteEVEKnowledge(id);
        }
      } catch (error) {
        console.error('Error deleting knowledge:', error);
      }
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-secondary flex items-center">
          <Brain size={22} className="mr-2 text-neon-green" />
          Knowledge Base
        </h2>
        
        <div className="flex space-x-2">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search knowledge..."
              className="px-3 py-2 pl-9 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
            />
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
          
          <button 
            onClick={() => setIsAddingKnowledge(true)}
            className="px-3 py-2 bg-black text-neon-green rounded-md text-sm font-medium hover:bg-black/90 border border-neon-green"
          >
            <Plus size={16} className="inline mr-1" />
            Add Knowledge
          </button>
        </div>
      </div>
      
      {/* Error messages */}
      {(companyError || eveError) && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-start">
          <AlertCircle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
          <p>{companyError || eveError}</p>
        </div>
      )}
      
      {/* Knowledge type tabs */}
      {eve && (
        <div className="flex space-x-4 border-b">
          <button
            onClick={() => setActiveTab('company')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'company'
                ? 'border-b-2 border-neon-green text-neon-green'
                : 'text-gray-600 hover:text-neon-green'
            }`}
          >
            <Globe size={16} className="inline mr-1" />
            Company Knowledge
          </button>
          <button
            onClick={() => setActiveTab('eve')}
            className={`px-4 py-2 text-sm font-medium ${
              activeTab === 'eve'
                ? 'border-b-2 border-neon-green text-neon-green'
                : 'text-gray-600 hover:text-neon-green'
            }`}
          >
            <Brain size={16} className="inline mr-1" />
            EVE Knowledge
          </button>
        </div>
      )}
      
      {/* Categories */}
      <div className="flex space-x-2 overflow-x-auto pb-2">
        {categories.map(category => (
          <button
            key={category.id}
            onClick={() => setSelectedCategory(category.id)}
            className={`px-3 py-1.5 text-sm font-medium rounded-full whitespace-nowrap ${
              selectedCategory === category.id
                ? 'bg-black text-neon-green border border-neon-green'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {category.name}
          </button>
        ))}
      </div>
      
      {/* Knowledge list */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {(companyLoading || eveLoading) ? (
          <div className="p-8 text-center">
            <Loader2 size={24} className="animate-spin mx-auto text-neon-green" />
            <p className="mt-2 text-gray-600">Loading knowledge base...</p>
          </div>
        ) : (
          <div className="divide-y">
            {(activeTab === 'company' ? companyKnowledge : eveKnowledge).map(item => (
              <div key={item.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium text-gray-900 flex items-center">
                      {item.key}
                      {item.is_private && (
                        <Lock size={14} className="ml-2 text-gray-400" />
                      )}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      Category: {item.category}
                    </p>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      item.importance >= 4 ? 'bg-red-100 text-red-800' :
                      item.importance === 3 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      Importance: {item.importance}
                    </span>
                    <button
                      onClick={() => {
                        setSelectedKnowledge(item);
                        setIsEditingKnowledge(true);
                      }}
                      className="p-1 text-gray-400 hover:text-blue-600"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      className="p-1 text-gray-400 hover:text-red-600"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                
                <div className="mt-2">
                  <pre className="text-sm bg-gray-50 p-3 rounded-md overflow-x-auto">
                    {formatValue(item.value)}
                  </pre>
                </div>
                
                {item.metadata && Object.keys(item.metadata).length > 0 && (
                  <div className="mt-2 text-xs text-gray-500">
                    <details>
                      <summary className="cursor-pointer hover:text-gray-700">
                        Additional Metadata
                      </summary>
                      <pre className="mt-1 p-2 bg-gray-50 rounded">
                        {JSON.stringify(item.metadata, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Add Knowledge Modal */}
      {isAddingKnowledge && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Add New Knowledge
            </h3>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                  >
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Key
                  </label>
                  <input
                    type="text"
                    value={formData.key}
                    onChange={(e) => setFormData({...formData, key: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                    placeholder="e.g., company_mission"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Value
                </label>
                <textarea
                  value={formData.value}
                  onChange={(e) => setFormData({...formData, value: e.target.value})}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green font-mono text-sm"
                  placeholder="Enter value or JSON object..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  For simple values, enter text. For structured data, enter valid JSON.
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Importance (1-5)
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="5"
                    value={formData.importance}
                    onChange={(e) => setFormData({...formData, importance: parseInt(e.target.value)})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isPrivate"
                    checked={formData.isPrivate}
                    onChange={(e) => setFormData({...formData, isPrivate: e.target.checked})}
                    className="h-4 w-4 text-neon-green focus:ring-neon-green border-gray-300 rounded"
                  />
                  <label htmlFor="isPrivate" className="ml-2 block text-sm text-gray-700">
                    Private Knowledge (Admin Only)
                  </label>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Metadata (Optional JSON)
                </label>
                <textarea
                  value={formData.metadata}
                  onChange={(e) => setFormData({...formData, metadata: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green font-mono text-sm"
                  placeholder="{}"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setIsAddingKnowledge(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-black text-neon-green rounded-md hover:bg-black/90 border border-neon-green"
                >
                  Add Knowledge
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      
      {/* Edit Knowledge Modal */}
      {isEditingKnowledge && selectedKnowledge && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Edit Knowledge
            </h3>
            
            {/* Similar form as Add Knowledge, but pre-filled with selected knowledge */}
            {/* ... */}
          </div>
        </div>
      )}
    </div>
  );
}

export default KnowledgeManager;