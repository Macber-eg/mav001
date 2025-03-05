-- Create marketplace items table
CREATE TABLE IF NOT EXISTS marketplace_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL CHECK (type IN ('eve', 'workflow', 'task', 'action')),
  name TEXT NOT NULL,
  description TEXT,
  preview_image_url TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0,
  is_subscription BOOLEAN DEFAULT false,
  subscription_interval TEXT CHECK (subscription_interval IN ('monthly', 'yearly') OR subscription_interval IS NULL),
  creator_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  is_public BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  ratings_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0,
  downloads_count INTEGER DEFAULT 0,
  configuration JSONB NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create marketplace purchases table
CREATE TABLE IF NOT EXISTS marketplace_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
  buyer_company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  purchase_date TIMESTAMPTZ DEFAULT now(),
  subscription_end_date TIMESTAMPTZ,
  status TEXT NOT NULL CHECK (status IN ('active', 'cancelled', 'expired')),
  metadata JSONB DEFAULT '{}'
);

-- Create marketplace reviews table
CREATE TABLE IF NOT EXISTS marketplace_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id UUID NOT NULL REFERENCES marketplace_items(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(item_id, company_id)
);

-- Enable RLS
ALTER TABLE marketplace_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketplace_reviews ENABLE ROW LEVEL SECURITY;

-- Create policies for marketplace_items
CREATE POLICY "marketplace_items_view_public" 
  ON marketplace_items 
  FOR SELECT 
  TO authenticated 
  USING (is_public = true);

CREATE POLICY "marketplace_items_view_own" 
  ON marketplace_items 
  FOR SELECT 
  TO authenticated 
  USING (creator_company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "marketplace_items_create" 
  ON marketplace_items 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (creator_company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "marketplace_items_update_own" 
  ON marketplace_items 
  FOR UPDATE
  TO authenticated 
  USING (creator_company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "marketplace_items_delete_own" 
  ON marketplace_items 
  FOR DELETE
  TO authenticated 
  USING (creator_company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Create policies for marketplace_purchases
CREATE POLICY "marketplace_purchases_view" 
  ON marketplace_purchases 
  FOR SELECT 
  TO authenticated 
  USING (
    buyer_company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM marketplace_items 
      WHERE id = marketplace_purchases.item_id 
      AND creator_company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    )
  );

CREATE POLICY "marketplace_purchases_create" 
  ON marketplace_purchases 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (buyer_company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Create policies for marketplace_reviews
CREATE POLICY "marketplace_reviews_view" 
  ON marketplace_reviews 
  FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "marketplace_reviews_create" 
  ON marketplace_reviews 
  FOR INSERT 
  TO authenticated 
  WITH CHECK (
    company_id = (SELECT company_id FROM users WHERE id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM marketplace_purchases 
      WHERE item_id = marketplace_reviews.item_id 
      AND buyer_company_id = company_id
    )
  );

CREATE POLICY "marketplace_reviews_update_own" 
  ON marketplace_reviews 
  FOR UPDATE
  TO authenticated 
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

CREATE POLICY "marketplace_reviews_delete_own" 
  ON marketplace_reviews 
  FOR DELETE
  TO authenticated 
  USING (company_id = (SELECT company_id FROM users WHERE id = auth.uid()));

-- Create function to update item ratings
CREATE OR REPLACE FUNCTION update_marketplace_item_ratings()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE marketplace_items
  SET 
    ratings_count = (
      SELECT COUNT(*) 
      FROM marketplace_reviews 
      WHERE item_id = NEW.item_id
    ),
    average_rating = (
      SELECT AVG(rating)::DECIMAL(3,2) 
      FROM marketplace_reviews 
      WHERE item_id = NEW.item_id
    )
  WHERE id = NEW.item_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updating ratings
CREATE TRIGGER update_item_ratings
AFTER INSERT OR UPDATE OR DELETE ON marketplace_reviews
FOR EACH ROW
EXECUTE FUNCTION update_marketplace_item_ratings();

-- Create indexes for better performance
CREATE INDEX idx_marketplace_items_type ON marketplace_items(type);
CREATE INDEX idx_marketplace_items_creator ON marketplace_items(creator_company_id);
CREATE INDEX idx_marketplace_items_public ON marketplace_items(is_public);
CREATE INDEX idx_marketplace_purchases_buyer ON marketplace_purchases(buyer_company_id);
CREATE INDEX idx_marketplace_purchases_item ON marketplace_purchases(item_id);
CREATE INDEX idx_marketplace_reviews_item ON marketplace_reviews(item_id);
CREATE INDEX idx_marketplace_reviews_company ON marketplace_reviews(company_id);