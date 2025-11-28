-- Atualizar vendas com custo zerado recalculando baseado nos sale_items
UPDATE sales s
SET 
  total_cost = COALESCE(item_costs.total_cost, 0),
  estimated_profit = s.gross_value - COALESCE(item_costs.total_cost, 0)
FROM (
  SELECT 
    si.sale_id,
    SUM(p.cost * si.qty) as total_cost
  FROM sale_items si
  JOIN products p ON p.id = si.product_id
  GROUP BY si.sale_id
) item_costs
WHERE s.id = item_costs.sale_id
  AND s.total_cost = 0
  AND s.gross_value > 0;