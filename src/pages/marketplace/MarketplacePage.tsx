import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Filter, Star, Download, Clock, Tag, AlertCircle } from 'lucide-react';
import { useMarketplaceStore } from '../../stores/marketplaceStore';
import { MarketplaceItem } from '../../types/database.types';

function MarketplacePage() {
  const { items, fetchItems, isLoading, error } = useMarketplaceStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [priceFilter, setPriceFilter] = useState<'all' | 'free' | 'paid'>('all');
  
  useEffect(() => {
    fetchItems();
  }, [fetchItems]);
  
  const filteredItems = items.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === 'all' || item.type === selectedType;
    const matchesPrice = priceFilter === 'all' || 
                        (priceFilter === 'free' && item.price === 0) ||
                        (priceFilter === 'paid' && item.price > 0);
    
    return matchesSearch && matchesType && matchesPrice;
  });
  
  const itemTypes = [
    { id: 'all', name: 'All Items' },
    { id: 'eve', name: 'Virtual Employees' },
    { id: 'workflow', name: 'Workflows' },
    { id: 'task', name: 'Tasks' },
    { id: 'action', name: 'Actions' }
  ];

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4 pt-4">
        <div>
          <h1 className="text-3xl font-bold text-white">Marketplace</h1>
          <p className="text-gray-400">Discover and acquire pre-built EVEs™, workflows, tasks, and actions</p>
        </div>
        <Link 
          to="/app/marketplace/publish" 
          className="inline-flex items-center bg-black hover:bg-black/90 text-neon-green font-medium py-2 px-4 rounded-md border border-neon-green"
        >
          <Plus size={16} className="mr-2" />
          Publish Item
        </Link>
      </div>
      
      {error && (
        <div className="bg-red-900/20 border border-red-800 text-red-300 px-4 py-3 rounded mb-6 flex items-start">
          <AlertCircle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Error loading marketplace items</p>
            <p className="text-sm">{error}</p>
          </div>
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
              placeholder="Search marketplace..."
              className="pl-10 pr-4 py-2 bg-black/50 border border-dark-border text-white rounded-md w-full focus:ring-primary focus:border-primary"
            />
          </div>
          
          <div className="flex space-x-2">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-primary focus:border-primary"
            >
              {itemTypes.map(type => (
                <option key={type.id} value={type.id}>{type.name}</option>
              ))}
            </select>
            
            <select
              value={priceFilter}
              onChange={(e) => setPriceFilter(e.target.value as any)}
              className="px-3 py-2 bg-black/50 border border-dark-border text-white rounded-md focus:ring-primary focus:border-primary"
            >
              <option value="all">All Prices</option>
              <option value="free">Free</option>
              <option value="paid">Paid</option>
            </select>
          </div>
        </div>
        
        {isLoading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="mt-3 text-gray-400">Loading marketplace items...</p>
          </div>
        ) : filteredItems.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
            {filteredItems.map((item: MarketplaceItem) => (
              <Link 
                key={item.id} 
                to={`/app/marketplace/${item.id}`}
                className="bg-black/30 border border-dark-border rounded-lg overflow-hidden hover:shadow-neon transition-all duration-300"
              >
                {item.preview_image_url ? (
                  <img 
                    src={item.preview_image_url} 
                    alt={item.name}
                    className="w-full h-48 object-cover"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
                    <Filter size={48} className="text-gray-300" />
                  </div>
                )}
                
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-white">{item.name}</h3>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      item.type === 'eve' ? 'bg-purple-100 text-purple-800' :
                      item.type === 'workflow' ? 'bg-blue-100 text-blue-800' :
                      item.type === 'task' ? 'bg-green-100 text-green-800' :
                      'bg-orange-100 text-orange-800'
                    }`}>
                      {item.type.toUpperCase()}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-400 mb-4 line-clamp-2">
                    {item.description}
                  </p>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center text-gray-400">
                      <Star size={16} className="text-yellow-400 fill-current" />
                      <span className="ml-1">{item.average_rating.toFixed(1)}</span>
                      <span className="mx-1">•</span>
                      <Download size={14} className="mr-1" />
                      <span>{item.downloads_count}</span>
                    </div>
                    
                    <div className="flex items-center">
                      {item.is_subscription ? (
                        <div className="flex items-center">
                          <Clock size={14} className="mr-1 text-gray-400" />
                          <span className="font-medium text-white">
                            ${item.price}/{item.subscription_interval === 'monthly' ? 'mo' : 'yr'}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center">
                          <Tag size={14} className="mr-1 text-gray-400" />
                          <span className="font-medium text-white">
                            {item.price === 0 ? 'Free' : `$${item.price}`}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <Filter size={48} className="mx-auto text-gray-500 mb-3" />
            <p className="text-gray-400 mb-2">No items found</p>
            {searchQuery || selectedType !== 'all' || priceFilter !== 'all' ? (
              <p className="text-sm text-gray-500">Try adjusting your search filters</p>
            ) : (
              <Link 
                to="/app/marketplace/publish" 
                className="text-primary hover:underline inline-flex items-center"
              >
                <Plus size={16} className="mr-1" />
                Publish your first item
              </Link>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default MarketplacePage;