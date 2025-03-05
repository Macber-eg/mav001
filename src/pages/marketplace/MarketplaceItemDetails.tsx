import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Star, Download, Clock, Tag, Globe, 
  AlertCircle, CheckCircle, Loader2, Edit, Trash2 
} from 'lucide-react';
import { useMarketplaceStore } from '../../stores/marketplaceStore';
import { useAuthStore } from '../../stores/authStore';

function MarketplaceItemDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const { 
    getItem, 
    fetchReviews,
    purchaseItem,
    deleteItem,
    isLoading, 
    error 
  } = useMarketplaceStore();
  
  const [item, setItem] = useState<any>(null);
  const [reviews, setReviews] = useState<any[]>([]);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState(false);
  
  useEffect(() => {
    if (id) {
      const loadItem = async () => {
        const itemData = await getItem(id);
        if (itemData) {
          setItem(itemData);
          const reviewsData = await fetchReviews(id);
          setReviews(reviewsData || []);
        }
      };
      loadItem();
    }
  }, [id, getItem, fetchReviews]);
  
  const handlePurchase = async () => {
    if (!id) return;
    
    setIsPurchasing(true);
    setPurchaseError(null);
    
    try {
      const purchase = await purchaseItem(id, item.is_subscription);
      if (purchase) {
        setPurchaseSuccess(true);
        setTimeout(() => {
          navigate('/app/marketplace/purchases');
        }, 2000);
      }
    } catch (error: any) {
      setPurchaseError(error.message);
    } finally {
      setIsPurchasing(false);
    }
  };
  
  const handleDelete = async () => {
    if (!id) return;
    
    if (confirm('Are you sure you want to delete this item? This action cannot be undone.')) {
      try {
        await deleteItem(id);
        navigate('/app/marketplace');
      } catch (error) {
        console.error('Error deleting item:', error);
      }
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-neon-green mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading item details...</p>
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
            <h3 className="font-medium text-lg">Error loading item</h3>
            <p>{error}</p>
            <Link to="/app/marketplace" className="mt-3 inline-block text-neon-green hover:underline">
              Return to marketplace
            </Link>
          </div>
        </div>
      </div>
    );
  }
  
  if (!item) return null;

  return (
    <div>
      <div className="mb-6 pt-4">
        <Link to="/app/marketplace" className="inline-flex items-center text-neon-green hover:underline mb-4">
          <ArrowLeft size={16} className="mr-1" />
          Back to Marketplace
        </Link>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-secondary">{item.name}</h1>
            <div className="flex items-center mt-1 space-x-2">
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                item.type === 'eve' ? 'bg-purple-100 text-purple-800' :
                item.type === 'workflow' ? 'bg-blue-100 text-blue-800' :
                item.type === 'task' ? 'bg-green-100 text-green-800' :
                'bg-orange-100 text-orange-800'
              }`}>
                {item.type.toUpperCase()}
              </span>
              <span className="text-gray-500">•</span>
              <div className="flex items-center">
                <Star size={14} className="text-yellow-400 fill-current mr-1" />
                <span>{item.average_rating.toFixed(1)}</span>
              </div>
              <span className="text-gray-500">•</span>
              <div className="flex items-center text-gray-600">
                <Download size={14} className="mr-1" />
                <span>{item.downloads_count} downloads</span>
              </div>
            </div>
          </div>
          
          {user?.id === item.creator_id ? (
            <div className="flex space-x-2">
              <Link
                to={`/app/marketplace/edit/${item.id}`}
                className="px-4 py-2 bg-black text-neon-green rounded-md font-medium border border-neon-green hover:bg-black/90"
              >
                <Edit size={16} className="inline mr-1" />
                Edit Item
              </Link>
              <button
                onClick={handleDelete}
                className="px-4 py-2 border border-red-500 text-red-500 rounded-md font-medium hover:bg-red-50"
              >
                <Trash2 size={16} className="inline mr-1" />
                Delete
              </button>
            </div>
          ) : (
            <div>
              {item.is_subscription ? (
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    ${item.price}/{item.subscription_interval === 'monthly' ? 'mo' : 'yr'}
                  </div>
                  <button
                    onClick={handlePurchase}
                    disabled={isPurchasing}
                    className="px-6 py-2 bg-black text-neon-green rounded-md font-medium border border-neon-green hover:bg-black/90 w-full"
                  >
                    {isPurchasing ? (
                      <Loader2 size={16} className="inline mr-1 animate-spin" />
                    ) : (
                      <Clock size={16} className="inline mr-1" />
                    )}
                    Subscribe Now
                  </button>
                </div>
              ) : (
                <div className="text-right">
                  <div className="text-2xl font-bold text-gray-900 mb-1">
                    {item.price === 0 ? 'Free' : `$${item.price}`}
                  </div>
                  <button
                    onClick={handlePurchase}
                    disabled={isPurchasing}
                    className="px-6 py-2 bg-black text-neon-green rounded-md font-medium border border-neon-green hover:bg-black/90 w-full"
                  >
                    {isPurchasing ? (
                      <Loader2 size={16} className="inline mr-1 animate-spin" />
                    ) : (
                      <Download size={16} className="inline mr-1" />
                    )}
                    {item.price === 0 ? 'Get Now' : 'Buy Now'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {purchaseError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-6 flex items-start">
          <AlertCircle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
          <p>{purchaseError}</p>
        </div>
      )}
      
      {purchaseSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded mb-6 flex items-start">
          <CheckCircle size={20} className="mr-2 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium">Purchase successful!</p>
            <p className="text-sm">Redirecting to your purchases...</p>
          </div>
        </div>
      )}
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Preview Image */}
          {item.preview_image_url && (
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <img 
                src={item.preview_image_url} 
                alt={item.name}
                className="w-full h-auto"
              />
            </div>
          )}
          
          {/* Description */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Description</h2>
              <div className="prose max-w-none">
                {item.description}
              </div>
            </div>
          </div>
          
          {/* Configuration */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Configuration</h2>
              <pre className="bg-gray-50 p-4 rounded-md overflow-x-auto">
                {JSON.stringify(item.configuration, null, 2)}
              </pre>
            </div>
          </div>
          
          {/* Reviews */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Reviews</h2>
                <button className="text-neon-green hover:underline">
                  Write a Review
                </button>
              </div>
              
              {reviews.length > 0 ? (
                <div className="space-y-4">
                  {reviews.map(review => (
                    <div key={review.id} className="border-b last:border-0 pb-4 last:pb-0">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                size={16}
                                className={i < review.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}
                              />
                            ))}
                          </div>
                          <span className="ml-2 text-sm text-gray-600">
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      {review.review_text && (
                        <p className="mt-2 text-gray-700">{review.review_text}</p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No reviews yet. Be the first to review this item!
                </p>
              )}
            </div>
          </div>
        </div>
        
        <div className="space-y-6">
          {/* Creator Info */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              <h3 className="font-medium text-gray-900 mb-4">About the Creator</h3>
              <div className="flex items-center">
                <Globe size={16} className="text-gray-400 mr-2" />
                <span className="text-gray-600">{item.creator_name}</span>
              </div>
              <div className="mt-4">
                <Link 
                  to={`/app/marketplace/creator/${item.creator_id}`}
                  className="text-neon-green hover:underline text-sm"
                >
                  View all items by this creator
                </Link>
              </div>
            </div>
          </div>
          
          {/* Stats */}
          <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="p-6">
              <h3 className="font-medium text-gray-900 mb-4">Item Statistics</h3>
              <dl className="space-y-2">
                <div className="flex justify-between">
                  <dt className="text-gray-600">Downloads</dt>
                  <dd className="font-medium">{item.downloads_count}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Rating</dt>
                  <dd className="font-medium flex items-center">
                    <Star size={14} className="text-yellow-400 fill-current mr-1" />
                    {item.average_rating.toFixed(1)} ({item.ratings_count} reviews)
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Published</dt>
                  <dd className="font-medium">
                    {new Date(item.created_at).toLocaleDateString()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-600">Last Updated</dt>
                  <dd className="font-medium">
                    {new Date(item.updated_at).toLocaleDateString()}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MarketplaceItemDetails;