-- Fix security warnings: Add search_path to functions

-- Fix get_available_stock function
CREATE OR REPLACE FUNCTION public.get_available_stock(p_product_id UUID)
RETURNS INTEGER
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
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

-- Fix has_sufficient_stock function
CREATE OR REPLACE FUNCTION public.has_sufficient_stock(p_product_id UUID, p_quantity INTEGER)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT get_available_stock(p_product_id) >= p_quantity;
$$;