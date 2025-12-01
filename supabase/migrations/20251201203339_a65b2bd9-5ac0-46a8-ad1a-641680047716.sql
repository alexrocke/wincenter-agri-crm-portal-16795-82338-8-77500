-- Corrigir venda do Edilberto
-- Passo 1: Adicionar estoque temporário para permitir a inserção
UPDATE products 
SET stock = stock + 2 
WHERE id = '0ba9bad3-5a05-421f-9d87-3f3703996f75'; -- CLIP HÉLICES

-- Passo 2: Inserir os itens (o trigger vai decrementar automaticamente)
INSERT INTO sale_items (sale_id, product_id, qty, unit_price, discount_percent)
VALUES 
  ('94f2219c-33e6-455a-8fb3-f6b315933b0e', '9fd772af-d86e-4602-88ea-f170930268d1', 1, 1090, 10),
  ('94f2219c-33e6-455a-8fb3-f6b315933b0e', 'b6fa6521-62cf-4c8a-9b06-f806f51265d6', 3, 700, 12),
  ('94f2219c-33e6-455a-8fb3-f6b315933b0e', '7f2a47ae-e72b-4c09-90c8-a8efe967dbf3', 1, 3820, 10),
  ('94f2219c-33e6-455a-8fb3-f6b315933b0e', '515c09bb-43ef-483c-a9fc-48af83a92183', 1, 3820, 10),
  ('94f2219c-33e6-455a-8fb3-f6b315933b0e', '0c336c10-e8df-44cc-a2ba-0014b20721f5', 1, 3200, 20),
  ('94f2219c-33e6-455a-8fb3-f6b315933b0e', '12ad5432-b3e4-4d9d-b6a7-9366dc70cd6b', 3, 700, 12),
  ('94f2219c-33e6-455a-8fb3-f6b315933b0e', '1e1b0126-adfa-47a7-8747-1e0fff85c272', 1, 166, 10),
  ('94f2219c-33e6-455a-8fb3-f6b315933b0e', '0ba9bad3-5a05-421f-9d87-3f3703996f75', 2, 240, 10);