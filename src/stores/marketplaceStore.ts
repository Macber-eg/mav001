import { create } from 'zustand';
import supabase from '../lib/supabase';
import { MarketplaceItem, MarketplacePurchase, MarketplaceReview } from '../types/database.types';

interface MarketplaceState {
  items: MarketplaceItem[];
  purchases: MarketplacePurchase[];
  reviews: MarketplaceReview[];
  isLoading: boolean;
  error: string | null;
  
  // Item management
  fetchItems: (type?: string) => Promise<void>;
  getItem: (id: string) => Promise<MarketplaceItem | null>;
  createItem: (itemData: Partial<MarketplaceItem>) => Promise<MarketplaceItem | null>;
  updateItem: (id: string, itemData: Partial<MarketplaceItem>) => Promise<MarketplaceItem | null>;
  deleteItem: (id: string) => Promise<void>;
  
  // Purchase management
  fetchPurchases: () => Promise<void>;
  purchaseItem: (itemId: string, isSubscription?: boolean) => Promise<MarketplacePurchase | null>;
  cancelSubscription: (purchaseId: string) => Promise<void>;
  
  // Review management
  fetchReviews: (itemId: string) => Promise<void>;
  addReview: (itemId: string, rating: number, reviewText?: string) => Promise<MarketplaceReview | null>;
  updateReview: (reviewId: string, rating: number, reviewText?: string) => Promise<MarketplaceReview | null>;
  deleteReview: (reviewId: string) => Promise<void>;
}

export const useMarketplaceStore = create<MarketplaceState>((set, get) => ({
  items: [],
  purchases: [],
  reviews: [],
  isLoading: false,
  error: null,
  
  fetchItems: async (type?: string) => {
    set({ isLoading: true, error: null });
    try {
      let query = supabase
        .from('marketplace_items')
        .select('*')
        .eq('is_public', true)
        .order('created_at', { ascending: false });
      
      if (type) {
        query = query.eq('type', type);
      }
      
      const { data, error } = await query;
      
      if (error) throw error;
      set({ items: data as MarketplaceItem[] });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  getItem: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('marketplace_items')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error) throw error;
      return data as MarketplaceItem;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  createItem: async (itemData: Partial<MarketplaceItem>) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();
      
      if (!userData) throw new Error('Company not found');
      
      const { data, error } = await supabase
        .from('marketplace_items')
        .insert([{
          ...itemData,
          creator_company_id: userData.company_id
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      const newItem = data as MarketplaceItem;
      set(state => ({ items: [newItem, ...state.items] }));
      return newItem;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  updateItem: async (id: string, itemData: Partial<MarketplaceItem>) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('marketplace_items')
        .update(itemData)
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      
      const updatedItem = data as MarketplaceItem;
      set(state => ({
        items: state.items.map(item => 
          item.id === id ? updatedItem : item
        )
      }));
      return updatedItem;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  deleteItem: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('marketplace_items')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
      
      set(state => ({
        items: state.items.filter(item => item.id !== id)
      }));
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  fetchPurchases: async () => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('marketplace_purchases')
        .select('*')
        .order('purchase_date', { ascending: false });
      
      if (error) throw error;
      set({ purchases: data as MarketplacePurchase[] });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  purchaseItem: async (itemId: string, isSubscription = false) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();
      
      if (!userData) throw new Error('Company not found');
      
      // Calculate subscription end date if applicable
      let subscriptionEndDate = null;
      if (isSubscription) {
        const item = get().items.find(i => i.id === itemId);
        if (item?.subscription_interval === 'monthly') {
          subscriptionEndDate = new Date();
          subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1);
        } else if (item?.subscription_interval === 'yearly') {
          subscriptionEndDate = new Date();
          subscriptionEndDate.setFullYear(subscriptionEndDate.getFullYear() + 1);
        }
      }
      
      const { data, error } = await supabase
        .from('marketplace_purchases')
        .insert([{
          item_id: itemId,
          buyer_company_id: userData.company_id,
          subscription_end_date: subscriptionEndDate,
          status: 'active'
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      const purchase = data as MarketplacePurchase;
      set(state => ({ purchases: [purchase, ...state.purchases] }));
      return purchase;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  cancelSubscription: async (purchaseId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('marketplace_purchases')
        .update({ status: 'cancelled' })
        .eq('id', purchaseId);
      
      if (error) throw error;
      
      set(state => ({
        purchases: state.purchases.map(p => 
          p.id === purchaseId ? { ...p, status: 'cancelled' } : p
        )
      }));
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  fetchReviews: async (itemId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('marketplace_reviews')
        .select('*')
        .eq('item_id', itemId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      set({ reviews: data as MarketplaceReview[] });
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  },
  
  addReview: async (itemId: string, rating: number, reviewText?: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');
      
      const { data: userData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', user.id)
        .single();
      
      if (!userData) throw new Error('Company not found');
      
      const { data, error } = await supabase
        .from('marketplace_reviews')
        .insert([{
          item_id: itemId,
          company_id: userData.company_id,
          rating,
          review_text: reviewText
        }])
        .select()
        .single();
      
      if (error) throw error;
      
      const review = data as MarketplaceReview;
      set(state => ({ reviews: [review, ...state.reviews] }));
      return review;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  updateReview: async (reviewId: string, rating: number, reviewText?: string) => {
    set({ isLoading: true, error: null });
    try {
      const { data, error } = await supabase
        .from('marketplace_reviews')
        .update({ rating, review_text: reviewText })
        .eq('id', reviewId)
        .select()
        .single();
      
      if (error) throw error;
      
      const updatedReview = data as MarketplaceReview;
      set(state => ({
        reviews: state.reviews.map(review => 
          review.id === reviewId ? updatedReview : review
        )
      }));
      return updatedReview;
    } catch (error: any) {
      set({ error: error.message });
      return null;
    } finally {
      set({ isLoading: false });
    }
  },
  
  deleteReview: async (reviewId: string) => {
    set({ isLoading: true, error: null });
    try {
      const { error } = await supabase
        .from('marketplace_reviews')
        .delete()
        .eq('id', reviewId);
      
      if (error) throw error;
      
      set(state => ({
        reviews: state.reviews.filter(review => review.id !== reviewId)
      }));
    } catch (error: any) {
      set({ error: error.message });
    } finally {
      set({ isLoading: false });
    }
  }
}));