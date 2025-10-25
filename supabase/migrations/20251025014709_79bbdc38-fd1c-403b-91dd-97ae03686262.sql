-- Trigger para notificar conclusão de tarefas
CREATE OR REPLACE FUNCTION public.trg_notify_task_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id UUID;
  v_user_ids UUID[];
  v_client_name TEXT;
  v_task_label TEXT;
  v_message TEXT;
BEGIN
  -- Notificar apenas quando status mudar para completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    
    -- Buscar nome do cliente se houver
    IF NEW.client_id IS NOT NULL THEN
      SELECT contact_name INTO v_client_name
      FROM public.clients
      WHERE id = NEW.client_id;
    END IF;
    
    -- Label do tipo de tarefa
    v_task_label := CASE NEW.type
      WHEN 'schedule_visit' THEN 'Agendar Visita'
      WHEN 'stock_replenish' THEN 'Repor Estoque'
      WHEN 'service_precheck' THEN 'Pré-checar Serviço'
      WHEN 'demo_prepare' THEN 'Preparar Demonstração'
      WHEN 'followup' THEN 'Follow-up'
      ELSE NEW.type
    END;
    
    -- Montar array de usuários a notificar
    v_user_ids := ARRAY[]::UUID[];
    
    -- Adicionar responsável
    IF NEW.responsible_auth_id IS NOT NULL THEN
      v_user_ids := array_append(v_user_ids, NEW.responsible_auth_id);
    END IF;
    
    -- Adicionar usuários atribuídos
    IF NEW.assigned_users IS NOT NULL THEN
      FOREACH v_user_id IN ARRAY NEW.assigned_users LOOP
        IF NOT (v_user_id = ANY(v_user_ids)) THEN
          v_user_ids := array_append(v_user_ids, v_user_id);
        END IF;
      END LOOP;
    END IF;
    
    -- Montar mensagem
    v_message := format('Tarefa: %s', NEW.title);
    IF v_task_label IS NOT NULL THEN
      v_message := v_message || format(' • Tipo: %s', v_task_label);
    END IF;
    IF v_client_name IS NOT NULL THEN
      v_message := v_message || format(' • Cliente: %s', v_client_name);
    END IF;
    IF NEW.notes IS NOT NULL AND NEW.notes != '' THEN
      v_message := v_message || format(' • Observações: %s', NEW.notes);
    END IF;
    
    -- Criar notificação para cada usuário
    FOREACH v_user_id IN ARRAY v_user_ids LOOP
      INSERT INTO public.notifications (
        user_auth_id,
        kind,
        title,
        message,
        category
      ) VALUES (
        v_user_id,
        'success',
        'Tarefa Concluída ✅',
        v_message,
        'task'
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Criar trigger
DROP TRIGGER IF EXISTS notify_task_completed ON public.tasks;
CREATE TRIGGER notify_task_completed
  AFTER UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_task_completed();