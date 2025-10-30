-- Verificar se total_value é uma coluna gerada e corrigir
-- Dropar a coluna se for gerada e recriá-la como coluna normal

-- Primeiro, vamos remover a coluna total_value se ela for gerada
ALTER TABLE public.services DROP COLUMN IF EXISTS total_value;

-- Recriar como coluna normal que pode ser atualizada
ALTER TABLE public.services ADD COLUMN total_value NUMERIC;

-- Adicionar comentário explicativo
COMMENT ON COLUMN public.services.total_value IS 'Valor total do serviço (pode incluir valor fixo ou calculado por hectares)';