import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Download, AlertCircle, XCircle } from 'lucide-react';
import { useMarketplaceStore } from '../../stores/marketplaceStore';

function PurchasesPage() {
  const { purchases, fetchPurchases, cancelSubscription, isLoading, error } = useMarketplaceStore();
  const [filter, setFilter] = useState<'all' | 'active' | 'cancelled'>('all');
  
  useEffect(() => {
    fetchPurchases();
  }, [fetchPurchases]);
  
  const filteredPurchases = purchases.filter(purchase => {
    if (filter === 'all') return true;
    return purchase.status === filter;
  });
  
  const handleCancelSubscription = async (purchaseId: string) => {
    if (confirm('Are you sure you want to cancel this subscription?')) {
      try {
        await cancelSubscription(purchaseId);
      } catch (error) {
        console.error('Error cancelling subscription:', error);
      }
    }
  };

  return (
    <div>
      <div className="mb-6 pt-4">
        <h1 className="text-3xl font-bold text-secondary">My Purchases</h1>
        <p className="text-gray-600">Manage your marketplace purchases and subscriptions</p>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 flex items-start">
          <AlertCircle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Error loading purchases</p>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      )}
      
      <div className="bg-white rounded-lg shadow-md overflow-hidden mb-6">
        <div className="p-4 border-b">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-3 py-2 border border-gray-300 rounded-md bg-white focus:ring-neon-green focus:border-neon-green"
          >
            <option value="all">All Purchases</option>
            <option value="active">Active</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
        
        {isLoading ? (
          <div className="py-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-neon-green mx-auto"></div>
            <p className="mt-3 text-gray-500">Loading purchases...</p>
          </div>
        ) : filteredPurchases.length > 0 ? (
          <div className="divide-y">
            {filteredPurchases.map(purchase => (
              <div key={purchase.id} className="p-6 hover:bg-gray-50">
                <div className="flex justify-between items-start">
                  <div>
                    <Link 
                      to={`/app/marketplace/${purchase.item_id}`}
                      className="text-lg font-medium text-gray-900 hover:text-neon-green"
                    >
                      {purchase.item_name}
                    </Link>
                    <div className="flex items-center mt-1 space-x-2 text-sm text-gray-500">
                      <span>Purchased: {new Date(purchase.purchase_date).toLocaleDateString()}</span>
                      <span>•</span>
                      <span className={`${
                        purchase.status === 'active' ? 'text-green-600' :
                        purchase.status === 'cancelled' ? 'text-red-600' :
                        'text-gray-600'
                      }`}>
                        {purchase.status.charAt(0).toUpperCase() + purchase.status.slice(1)}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {purchase.subscription_end_date ? (
                      <div className="text-sm text-gray-500">
                        <Clock size={14} className="inline mr-1" />
                        Renews: {new Date(purchase.subscription_end_date).toLocaleDateString()}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        <Download size={14} className="inline mr-1" />
                        One-time purchase
                      </div>
                    )}
                    
                    {purchase.status === 'active' && purchase.subscription_end_date && (
                      <button
                        onClick={() => handleCancelSubscription(purchase.id)}
                        className="px-3 py-1 text-sm text-red-600 hover:text-red-800 border border-red-200 rounded-md hover:bg-red-50"
                      >
                        <XCircle size={14} className="inline mr-1" />
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
                
                {purchase.metadata && Object.keys(purchase.metadata).length > 0 && (
                  <div className="mt-4">
                    <details className="text-sm">
                      <summary className="cursor-pointer text-gray-600 hover:text-gray-900">
                        View Details
                      </summary>
                      <pre className="mt-2 p-3 bg-gray-50 rounded-md overflow-x-auto">
                        {JSON.stringify(purchase.metadata, null, 2)}
                      </pre>
                    </details>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="py-12 text-center">
            <Download size={48} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 mb-2">No purchases found</p>
            <Link 
              to="/app/marketplace" 
              className="text-neon-green hover:underline"
            >
              Browse the marketplace
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

export default PurchasesPage;