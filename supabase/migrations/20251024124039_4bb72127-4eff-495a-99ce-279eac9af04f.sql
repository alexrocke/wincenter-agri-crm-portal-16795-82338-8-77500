-- Criar tabela para produtos utilizados em serviços técnicos
CREATE TABLE IF NOT EXISTS public.service_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES public.products(id),
  qty INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC NOT NULL DEFAULT 0,
  discount_percent NUMERIC NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.service_items ENABLE ROW LEVEL SECURITY;

-- Política de SELECT: mesmas regras que services
CREATE POLICY "service_items_select" 
ON public.service_items 
FOR SELECT 
USING (
  is_admin() 
  OR EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = service_items.service_id
    AND (
      s.client_id IN (SELECT id FROM public.clients WHERE seller_auth_id = auth.uid())
      OR auth.uid() = ANY(s.assigned_users)
      OR EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = auth.uid() AND role = 'technician')
    )
  )
);

-- Política de INSERT/UPDATE/DELETE: mesmas regras que services
CREATE POLICY "service_items_iud" 
ON public.service_items 
FOR ALL 
USING (
  is_admin() 
  OR EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = service_items.service_id
    AND (
      s.client_id IN (SELECT id FROM public.clients WHERE seller_auth_id = auth.uid())
      OR auth.uid() = ANY(s.assigned_users)
      OR EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = auth.uid() AND role = 'technician')
    )
  )
)
WITH CHECK (
  is_admin() 
  OR EXISTS (
    SELECT 1 FROM public.services s
    WHERE s.id = service_items.service_id
    AND (
      s.client_id IN (SELECT id FROM public.clients WHERE seller_auth_id = auth.uid())
      OR auth.uid() = ANY(s.assigned_users)
      OR EXISTS (SELECT 1 FROM public.users WHERE auth_user_id = auth.uid() AND role = 'technician')
    )
  )
);

-- Criar índice para melhorar performance
CREATE INDEX idx_service_items_service_id ON public.service_items(service_id);
CREATE INDEX idx_service_items_product_id ON public.service_items(product_id);