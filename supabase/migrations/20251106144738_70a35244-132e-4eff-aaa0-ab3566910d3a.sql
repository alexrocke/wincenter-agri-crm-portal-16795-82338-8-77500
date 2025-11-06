-- Create opportunity_items table to store product details in proposals
CREATE TABLE IF NOT EXISTS public.opportunity_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  opportunity_id uuid NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE RESTRICT,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL,
  discount_percent numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT quantity_positive CHECK (quantity > 0),
  CONSTRAINT unit_price_positive CHECK (unit_price >= 0),
  CONSTRAINT discount_valid CHECK (discount_percent >= 0 AND discount_percent <= 100)
);

-- Enable RLS
ALTER TABLE public.opportunity_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for opportunity_items (match opportunity access)
CREATE POLICY "opportunity_items_select"
ON public.opportunity_items
FOR SELECT
USING (
  is_admin() OR 
  (EXISTS (
    SELECT 1 FROM opportunities o
    WHERE o.id = opportunity_items.opportunity_id 
    AND o.seller_auth_id = auth.uid()
  ))
);

CREATE POLICY "opportunity_items_iud"
ON public.opportunity_items
FOR ALL
USING (
  is_admin() OR 
  (EXISTS (
    SELECT 1 FROM opportunities o
    WHERE o.id = opportunity_items.opportunity_id 
    AND o.seller_auth_id = auth.uid()
  ))
)
WITH CHECK (
  is_admin() OR 
  (EXISTS (
    SELECT 1 FROM opportunities o
    WHERE o.id = opportunity_items.opportunity_id 
    AND o.seller_auth_id = auth.uid()
  ))
);

-- Create index for faster queries
CREATE INDEX idx_opportunity_items_opportunity_id ON public.opportunity_items(opportunity_id);
CREATE INDEX idx_opportunity_items_product_id ON public.opportunity_items(product_id);