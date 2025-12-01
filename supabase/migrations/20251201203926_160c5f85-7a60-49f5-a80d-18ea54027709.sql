-- Create stock_reservations table
CREATE TABLE IF NOT EXISTS public.stock_reservations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  reserved_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'released', 'converted')),
  released_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_stock_reservations_product ON public.stock_reservations(product_id);
CREATE INDEX idx_stock_reservations_opportunity ON public.stock_reservations(opportunity_id);
CREATE INDEX idx_stock_reservations_status ON public.stock_reservations(status);
CREATE INDEX idx_stock_reservations_expires ON public.stock_reservations(expires_at) WHERE status = 'active';

-- Enable RLS
ALTER TABLE public.stock_reservations ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY stock_reservations_select
  ON public.stock_reservations
  FOR SELECT
  USING (
    is_admin() OR 
    EXISTS (
      SELECT 1 FROM opportunities o 
      WHERE o.id = opportunity_id 
      AND o.seller_auth_id = auth.uid()
    )
  );

CREATE POLICY stock_reservations_admin_all
  ON public.stock_reservations
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- Function to create stock reservation when opportunity item is created
CREATE OR REPLACE FUNCTION public.trg_create_stock_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only create reservation for product items (not services)
  IF NEW.item_type = 'product' AND NEW.product_id IS NOT NULL THEN
    INSERT INTO public.stock_reservations (
      product_id,
      opportunity_id,
      quantity,
      expires_at
    ) VALUES (
      NEW.product_id,
      NEW.opportunity_id,
      NEW.quantity,
      now() + INTERVAL '30 days'
    );
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger: Create reservation on opportunity item insert
DROP TRIGGER IF EXISTS trg_opportunity_item_reserve_stock ON public.opportunity_items;
CREATE TRIGGER trg_opportunity_item_reserve_stock
  AFTER INSERT ON public.opportunity_items
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_create_stock_reservation();

-- Function to update reservation when opportunity item quantity changes
CREATE OR REPLACE FUNCTION public.trg_update_stock_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only for product items
  IF NEW.item_type = 'product' AND NEW.product_id IS NOT NULL THEN
    -- Update existing reservation quantity
    UPDATE public.stock_reservations
    SET quantity = NEW.quantity
    WHERE opportunity_id = NEW.opportunity_id
      AND product_id = NEW.product_id
      AND status = 'active';
  END IF;
  
  RETURN NEW;
END;
$$;

-- Trigger: Update reservation on opportunity item update
DROP TRIGGER IF EXISTS trg_opportunity_item_update_reservation ON public.opportunity_items;
CREATE TRIGGER trg_opportunity_item_update_reservation
  AFTER UPDATE ON public.opportunity_items
  FOR EACH ROW
  WHEN (OLD.quantity IS DISTINCT FROM NEW.quantity)
  EXECUTE FUNCTION public.trg_update_stock_reservation();

-- Function to release reservations when opportunity is won or lost
CREATE OR REPLACE FUNCTION public.trg_release_stock_reservation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_new_status TEXT;
BEGIN
  -- Determine new reservation status
  IF NEW.stage = 'won' THEN
    v_new_status := 'converted';
  ELSIF NEW.stage = 'lost' THEN
    v_new_status := 'released';
  ELSE
    RETURN NEW; -- No status change needed
  END IF;
  
  -- Update all active reservations for this opportunity
  UPDATE public.stock_reservations
  SET 
    status = v_new_status,
    released_at = now()
  WHERE opportunity_id = NEW.id
    AND status = 'active';
  
  RETURN NEW;
END;
$$;

-- Trigger: Release reservation on opportunity stage change
DROP TRIGGER IF EXISTS trg_opportunity_release_reservation ON public.opportunities;
CREATE TRIGGER trg_opportunity_release_reservation
  AFTER UPDATE ON public.opportunities
  FOR EACH ROW
  WHEN (OLD.stage IS DISTINCT FROM NEW.stage AND NEW.stage IN ('won', 'lost'))
  EXECUTE FUNCTION public.trg_release_stock_reservation();

-- Function to get available stock (total - active reservations)
CREATE OR REPLACE FUNCTION public.get_available_stock(p_product_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
AS $$
  SELECT 
    COALESCE(p.stock, 0) - COALESCE(
      (SELECT SUM(quantity) 
       FROM stock_reservations 
       WHERE product_id = p_product_id 
       AND status = 'active'
      ), 0
    )::INTEGER
  FROM products p
  WHERE p.id = p_product_id;
$$;

-- Function to check if product has sufficient available stock
CREATE OR REPLACE FUNCTION public.has_sufficient_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
AS $$
  SELECT get_available_stock(p_product_id) >= p_quantity;
$$;