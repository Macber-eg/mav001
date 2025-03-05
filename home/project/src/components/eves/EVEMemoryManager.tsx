import { useState, useEffect, useCallback } from 'react';
import { Brain, Plus, Search, Edit, Trash2, Calendar, Star, AlertCircle, Loader2, Save } from 'lucide-react';
import { EVE, Memory } from '../../types/database.types';
import { useEVEMemory } from '../../hooks/useEVEMemory';
import EVEMemoryVisualizer from './EVEMemoryVisualizer';

function EVEMemoryManager({ eve }: { eve: EVE }) {
  const [activeTab, setActiveTab] = useState<'facts' | 'conversations' | 'preferences' | 'relationships'>('facts');
  const [isAddingMemory, setIsAddingMemory] = useState(false);
  const [isEditingMemory, setIsEditingMemory] = useState(false);
  const [selectedMemory, setSelectedMemory] = useState<Memory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Memory[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  
  // Form state for new/edit memory
  const [formData, setFormData] = useState({
    key: '',
    value: '',
    type: 'fact' as 'fact' | 'conversation' | 'preference' | 'relationship',
    importance: 1,
    expiry: '',
    metadata: '{}'
  });
  
  const { 
    memories, 
    isLoading, 
    error, 
    addMemory, 
    updateMemory, 
    deleteMemory,
    searchMemories,
    getMemoriesByType
  } = useEVEMemory({ 
    eveId: eve.id,
    companyId: eve.company_id // Pass company ID from EVE object
  });
  
  const [displayedMemories, setDisplayedMemories] = useState<Memory[]>([]);
  
  // Memoize the loadMemories function to prevent infinite updates
  const loadMemories = useCallback(async () => {
    const type = activeTab.endsWith('s') 
      ? activeTab.substring(0, activeTab.length - 1) 
      : activeTab;
    
    const result = await getMemoriesByType(type as any);
    setDisplayedMemories(result);
  }, [activeTab, getMemoriesByType]);
  
  // Use the memoized function in useEffect
  useEffect(() => {
    loadMemories();
  }, [loadMemories]);
  
  // Search functionality
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    try {
      const results = await searchMemories(searchQuery);
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching memories:', error);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Handle form submission for new memory
  const handleAddMemory = async () => {
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
        // If parsing fails, use empty object
        console.warn('Failed to parse metadata JSON, using empty object');
      }
      
      const memory = await addMemory(
        formData.type,
        formData.key,
        valueToStore,
        formData.importance,
        formData.expiry || undefined,
        metadata
      );
      
      if (memory) {
        // Reset form and close the add memory panel
        setFormData({
          key: '',
          value: '',
          type: 'fact',
          importance: 1,
          expiry: '',
          metadata: '{}'
        });
        setIsAddingMemory(false);
        
        // Refresh displayed memories if the added memory matches the current tab
        if (formData.type.startsWith(activeTab.substring(0, activeTab.length - 1))) {
          setDisplayedMemories(prev => [memory, ...prev]);
        }
      }
    } catch (error) {
      console.error('Error adding memory:', error);
    }
  };
  
  // Handle editing a memory
  const handleEditMemory = async () => {
    if (!selectedMemory) return;
    
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
        // If parsing fails, use empty object
        console.warn('Failed to parse metadata JSON, using empty object');
      }
      
      const updatedMemory = await updateMemory(selectedMemory.id, {
        key: formData.key,
        value: valueToStore,
        importance: formData.importance,
        expiry: formData.expiry || undefined,
        metadata
      });
      
      if (updatedMemory) {
        // Reset form and close the edit memory panel
        setFormData({
          key: '',
          value: '',
          type: 'fact',
          importance: 1,
          expiry: '',
          metadata: '{}'
        });
        setIsEditingMemory(false);
        setSelectedMemory(null);
        
        // Refresh displayed memories
        setDisplayedMemories(prev => 
          prev.map(m => m.id === updatedMemory.id ? updatedMemory : m)
        );
      }
    } catch (error) {
      console.error('Error updating memory:', error);
    }
  };
  
  // Handle deleting a memory
  const handleDeleteMemory = async (memoryId: string) => {
    if (confirm('Are you sure you want to delete this memory? This action cannot be undone.')) {
      try {
        await deleteMemory(memoryId);
        // Remove from displayed memories
        setDisplayedMemories(prev => prev.filter(m => m.id !== memoryId));
      } catch (error) {
        console.error('Error deleting memory:', error);
      }
    }
  };
  
  // Set up form for editing
  const startEditing = (memory: Memory) => {
    setSelectedMemory(memory);
    
    const valueAsString = typeof memory.value === 'object' 
      ? JSON.stringify(memory.value, null, 2) 
      : memory.value.toString();
    
    const metadataAsString = memory.metadata 
      ? JSON.stringify(memory.metadata, null, 2) 
      : '{}';
    
    setFormData({
      key: memory.key,
      value: valueAsString,
      type: memory.type as any,
      importance: memory.importance,
      expiry: memory.expiry || '',
      metadata: metadataAsString
    });
    
    setIsEditingMemory(true);
  };
  
  // Format memory value for display
  const formatMemoryValue = (value: any): string => {
    if (typeof value === 'object') {
      return JSON.stringify(value, null, 2);
    }
    return value.toString();
  };
  
  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold text-secondary flex items-center">
          <Brain size={22} className="mr-2 text-neon-green" />
          Memory Management
        </h2>
        
        <div className="flex space-x-2">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search memories..."
              className="px-3 py-2 pl-9 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
            />
            <Search size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          </div>
          
          <button 
            onClick={handleSearch}
            disabled={isSearching || !searchQuery.trim()}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              isSearching || !searchQuery.trim()
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-black text-neon-green hover:bg-black/90 border border-neon-green'
            }`}
          >
            {isSearching ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              'Search'
            )}
          </button>
          
          <button 
            onClick={() => setIsAddingMemory(true)}
            className="px-3 py-2 bg-black text-neon-green rounded-md text-sm font-medium hover:bg-black/90 border border-neon-green"
          >
            <Plus size={16} className="inline mr-1" />
            Add Memory
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded flex items-start">
          <AlertCircle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
          <p>{error}</p>
        </div>
      )}
      
      {/* Memory search results */}
      {searchResults.length > 0 && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-4">
          <div className="px-4 py-3 bg-gray-50 border-b flex justify-between items-center">
            <h3 className="font-medium">Search Results</h3>
            <button 
              onClick={() => setSearchResults([])} 
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Clear
            </button>
          </div>
          
          <div className="divide-y">
            {searchResults.map(memory => (
              <div key={memory.id} className="p-4 hover:bg-gray-50">
                <div className="flex justify-between">
                  <h4 className="font-medium">{memory.key}</h4>
                  <div className="flex items-center space-x-1 text-sm text-gray-500">
                    <span>Type: {memory.type}</span>
                    <span>•</span>
                    <span>Importance: {memory.importance}</span>
                  </div>
                </div>
                <pre className="mt-2 p-2 bg-gray-50 rounded text-sm overflow-x-auto">
                  {formatMemoryValue(memory.value)}
                </pre>
                
                <div className="mt-2 flex justify-between items-center">
                  <div className="text-xs text-gray-500">
                    Last accessed: {formatDate(memory.last_accessed)}
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => startEditing(memory)}
                      className="p-1 text-blue-600 hover:text-blue-800"
                    >
                      <Edit size={16} />
                    </button>
                    <button 
                      onClick={() => handleDeleteMemory(memory.id)}
                      className="p-1 text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Memory tabs */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="border-b">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('facts')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
                activeTab === 'facts'
                  ? 'border-b-2 border-neon-green text-neon-green'
                  : 'text-gray-600 hover:text-neon-green'
              }`}
            >
              Facts & Knowledge
            </button>
            <button
              onClick={() => setActiveTab('conversations')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
                activeTab === 'conversations'
                  ? 'border-b-2 border-neon-green text-neon-green'
                  : 'text-gray-600 hover:text-neon-green'
              }`}
            >
              Conversations
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
                activeTab === 'preferences'
                  ? 'border-b-2 border-neon-green text-neon-green'
                  : 'text-gray-600 hover:text-neon-green'
              }`}
            >
              Preferences
            </button>
            <button
              onClick={() => setActiveTab('relationships')}
              className={`px-4 py-3 text-sm font-medium whitespace-nowrap ${
                activeTab === 'relationships'
                  ? 'border-b-2 border-neon-green text-neon-green'
                  : 'text-gray-600 hover:text-neon-green'
              }`}
            >
              Relationships
            </button>
          </nav>
        </div>
        
        <div className="p-4">
          {isLoading ? (
            <div className="py-12 text-center">
              <Loader2 size={24} className="animate-spin mx-auto text-neon-green" />
              <p className="mt-3 text-gray-500">Loading memories...</p>
            </div>
          ) : displayedMemories.length > 0 ? (
            <div className="divide-y">
              {displayedMemories.map(memory => (
                <div key={memory.id} className="py-4 first:pt-0 last:pb-0">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium flex items-center">
                      {memory.key}
                      {memory.importance > 2 && (
                        <Star size={14} className="ml-1 text-yellow-500 inline" fill="currentColor" />
                      )}
                    </h4>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-500 flex items-center">
                        <Calendar size={12} className="mr-1" />
                        {formatDate(memory.last_accessed)}
                      </span>
                      <button 
                        onClick={() => startEditing(memory)}
                        className="p-1 text-blue-600 hover:text-blue-800"
                        title="Edit memory"
                      >
                        <Edit size={16} />
                      </button>
                      <button 
                        onClick={() => handleDeleteMemory(memory.id)}
                        className="p-1 text-red-600 hover:text-red-800"
                        title="Delete memory"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                  
                  <div className="mt-2">
                    <pre className="p-2 bg-gray-50 rounded text-sm overflow-x-auto max-h-48">
                      {formatMemoryValue(memory.value)}
                    </pre>
                  </div>
                  
                  {memory.expiry && (
                    <div className="mt-2 text-xs text-gray-500">
                      Expires: {formatDate(memory.expiry)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center">
              <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                <Brain size={24} className="text-gray-400" />
              </div>
              <p className="text-gray-500 mb-2">No memories found</p>
              <button
                onClick={() => setIsAddingMemory(true)}
                className="text-neon-green hover:underline"
              >
                <Plus size={14} className="inline mr-1" />
                Add a new memory
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Add Memory Panel */}
      {isAddingMemory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Plus size={18} className="mr-2 text-neon-green" />
              Add New Memory
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Memory Key
                  </label>
                  <input
                    type="text"
                    value={formData.key}
                    onChange={(e) => setFormData({...formData, key: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                    placeholder="e.g., favorite_color"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Memory Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value as any})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                  >
                    <option value="fact">Fact</option>
                    <option value="conversation">Conversation</option>
                    <option value="preference">Preference</option>
                    <option value="relationship">Relationship</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Memory Value
                </label>
                <textarea
                  value={formData.value}
                  onChange={(e) => setFormData({...formData, value: e.target.value})}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green font-mono text-sm"
                  placeholder="Enter value or JSON object..."
                ></textarea>
                <p className="text-xs text-gray-500 mt-1">
                  For simple values, enter text. For structured data, enter valid JSON (e.g., {`{"text": "some content"}`}).
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
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.expiry}
                    onChange={(e) => setFormData({...formData, expiry: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                  />
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
                ></textarea>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => setIsAddingMemory(false)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleAddMemory}
                className="px-4 py-2 bg-black hover:bg-black/90 text-neon-green rounded-md font-medium border border-neon-green"
              >
                Add Memory
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Edit Memory Panel */}
      {isEditingMemory && selectedMemory && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4">
            <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Edit size={18} className="mr-2 text-blue-600" />
              Edit Memory
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Memory Key
                </label>
                <input
                  type="text"
                  value={formData.key}
                  onChange={(e) => setFormData({...formData, key: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Memory Value
                </label>
                <textarea
                  value={formData.value}
                  onChange={(e) => setFormData({...formData, value: e.target.value})}
                  rows={5}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green font-mono text-sm"
                ></textarea>
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
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Expiry Date (Optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={formData.expiry}
                    onChange={(e) => setFormData({...formData, expiry: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-neon-green focus:border-neon-green"
                  />
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
                ></textarea>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={() => {
                  setIsEditingMemory(false);
                  setSelectedMemory(null);
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-md text-gray-800 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleEditMemory}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium"
              >
                <Save size={16} className="inline mr-1" />
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Memory Visualizer */}
      <EVEMemoryVisualizer eve={eve} />
    </div>
  );
}

export default EVEMemoryManager;