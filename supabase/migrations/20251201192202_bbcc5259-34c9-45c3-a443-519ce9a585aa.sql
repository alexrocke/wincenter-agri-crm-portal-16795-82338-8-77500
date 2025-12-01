-- Criar tabela de catálogo de serviços vendáveis
CREATE TABLE IF NOT EXISTS public.service_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  default_price NUMERIC NOT NULL DEFAULT 0,
  price_type TEXT NOT NULL DEFAULT 'fixed',
  estimated_duration_hours NUMERIC,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Adicionar colunas em opportunity_items para suportar diferentes tipos
ALTER TABLE public.opportunity_items 
ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'product';

ALTER TABLE public.opportunity_items
ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES public.service_catalog(id) ON DELETE CASCADE;

-- RLS para service_catalog
ALTER TABLE public.service_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "service_catalog_read_authenticated"
ON public.service_catalog
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "service_catalog_admin_write"
ON public.service_catalog
FOR ALL
TO authenticated
USING (is_admin())
WITH CHECK (is_admin());

-- Trigger para updated_at
CREATE TRIGGER set_updated_at_service_catalog
BEFORE UPDATE ON public.service_catalog
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

-- Comentários
COMMENT ON TABLE public.service_catalog IS 'Catálogo de serviços que podem ser vendidos em orçamentos';
COMMENT ON COLUMN public.opportunity_items.item_type IS 'Tipo do item: product, internal, service';
COMMENT ON COLUMN public.opportunity_items.service_id IS 'Referência ao serviço quando item_type = service';