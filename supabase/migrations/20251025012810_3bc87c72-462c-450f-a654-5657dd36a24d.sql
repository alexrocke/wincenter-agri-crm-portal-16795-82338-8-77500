-- Verificar e ajustar o constraint de tipo para tasks
-- Primeiro, remover o constraint antigo se existir
ALTER TABLE public.tasks DROP CONSTRAINT IF EXISTS tasks_type_check;

-- Adicionar novo constraint que aceita os tipos necessários
ALTER TABLE public.tasks ADD CONSTRAINT tasks_type_check 
  CHECK (type IN ('schedule_visit', 'stock_replenish', 'service_precheck', 'demo_prepare', 'followup', 'general', 'custom'));