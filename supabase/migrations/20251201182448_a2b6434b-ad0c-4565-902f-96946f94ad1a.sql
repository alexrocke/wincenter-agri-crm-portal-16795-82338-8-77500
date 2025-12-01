-- Adicionar campos para controle de estoque interno
ALTER TABLE products
ADD COLUMN is_internal BOOLEAN DEFAULT false,
ADD COLUMN internal_category TEXT;

-- Criar índice para filtrar itens internos rapidamente
CREATE INDEX idx_products_is_internal ON products(is_internal) WHERE is_internal = true;

-- Criar tabela para rastrear itens internos usados em serviços
CREATE TABLE service_internal_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id UUID NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  qty INTEGER NOT NULL DEFAULT 1,
  charged_to_client BOOLEAN DEFAULT false,
  unit_price NUMERIC DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_service_internal_items_service ON service_internal_items(service_id);
CREATE INDEX idx_service_internal_items_product ON service_internal_items(product_id);

-- RLS policies para service_internal_items (mesmas regras que service_items)
ALTER TABLE service_internal_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_internal_items_select"
ON service_internal_items FOR SELECT
USING (
  is_admin() OR
  EXISTS (
    SELECT 1 FROM services s
    WHERE s.id = service_internal_items.service_id
    AND (
      s.client_id IN (SELECT id FROM clients WHERE seller_auth_id = auth.uid())
      OR auth.uid() = ANY(s.assigned_users)
      OR EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'technician')
    )
  )
);

CREATE POLICY "service_internal_items_iud"
ON service_internal_items FOR ALL
USING (
  is_admin() OR
  EXISTS (
    SELECT 1 FROM services s
    WHERE s.id = service_internal_items.service_id
    AND (
      s.client_id IN (SELECT id FROM clients WHERE seller_auth_id = auth.uid())
      OR auth.uid() = ANY(s.assigned_users)
      OR EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'technician')
    )
  )
)
WITH CHECK (
  is_admin() OR
  EXISTS (
    SELECT 1 FROM services s
    WHERE s.id = service_internal_items.service_id
    AND (
      s.client_id IN (SELECT id FROM clients WHERE seller_auth_id = auth.uid())
      OR auth.uid() = ANY(s.assigned_users)
      OR EXISTS (SELECT 1 FROM users WHERE auth_user_id = auth.uid() AND role = 'technician')
    )
  )
);

-- Comentários para documentação
COMMENT ON COLUMN products.is_internal IS 'Identifica se o produto é para uso interno (parafusos, limpa contato, etc.)';
COMMENT ON COLUMN products.internal_category IS 'Categoria de itens internos: Parafusos, Eletrônicos, Fixação, Lubrificantes, Outros';
COMMENT ON TABLE service_internal_items IS 'Rastreia itens de estoque interno usados em serviços de manutenção/revisão';