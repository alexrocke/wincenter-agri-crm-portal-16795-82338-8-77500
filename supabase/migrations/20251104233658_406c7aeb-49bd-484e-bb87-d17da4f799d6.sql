-- Replace recalc_sale_totals to respect service-based sales (spraying)
CREATE OR REPLACE FUNCTION public.recalc_sale_totals(p_sale uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_service_type service_type;
  v_service_total numeric;
  v_items_gross numeric := 0;
  v_items_cost numeric := 0;
  v_gross numeric := 0;
  v_cost numeric := 0;
BEGIN
  -- Aggregate current sale_items totals
  SELECT 
    COALESCE(SUM((si.unit_price * si.qty) * (1 - si.discount_percent/100.0)), 0),
    COALESCE(SUM(p.cost * si.qty), 0)
  INTO v_items_gross, v_items_cost
  FROM public.sale_items si
  JOIN public.products p ON p.id = si.product_id
  WHERE si.sale_id = p_sale;

  -- Get service info (if any)
  SELECT s.service_type, s.total_value
  INTO v_service_type, v_service_total
  FROM public.sales sa
  JOIN public.services s ON s.id = sa.service_id
  WHERE sa.id = p_sale;

  IF v_service_type = 'spraying' THEN
    -- For spraying services, the sale value comes from the service total (hectares), ignore items cost
    v_gross := COALESCE(v_service_total, v_items_gross);
    v_cost := 0;  -- Do not consider product costs for spraying service sales
  ELSE
    -- For other cases, combine items with service total if present
    v_gross := COALESCE(v_items_gross, 0) + COALESCE(v_service_total, 0);
    v_cost := COALESCE(v_items_cost, 0);
  END IF;

  UPDATE public.sales s
  SET
    gross_value = v_gross,
    total_cost = v_cost,
    estimated_profit = v_gross - v_cost
  WHERE s.id = p_sale;
END;
$$;