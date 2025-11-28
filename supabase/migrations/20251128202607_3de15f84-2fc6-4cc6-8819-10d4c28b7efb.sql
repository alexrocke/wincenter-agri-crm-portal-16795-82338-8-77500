-- Atualizar apenas a venda com custo e lucro corretos
-- Custo: (2000*4) + 2586.4 + 3195.2 + (64*4) = 14037.6
-- Lucro: 21884 - 14037.6 = 7846.4
UPDATE sales
SET 
  total_cost = 14037.6,
  estimated_profit = 7846.4
WHERE id = '11190738-a400-4b34-a26a-b5f84ea76084';