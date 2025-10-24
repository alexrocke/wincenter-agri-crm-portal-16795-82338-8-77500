-- Atualizar as triggers de notificação para incluir informações completas
-- Incluir: usuários designados, clima, produtos utilizados

-- Recriar trigger para INSERT de serviços com notificações completas
CREATE OR REPLACE FUNCTION public.trg_notify_service_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_client_name TEXT;
  v_client_city TEXT;
  v_client_state TEXT;
  v_service_label TEXT;
  v_user_ids UUID[];
  v_user_id UUID;
  v_seller_auth_id UUID;
  v_user_names TEXT;
  v_message TEXT;
BEGIN
  -- Buscar informações do cliente
  SELECT contact_name, seller_auth_id, city, state 
  INTO v_client_name, v_seller_auth_id, v_client_city, v_client_state
  FROM public.clients
  WHERE id = NEW.client_id;
  
  -- Label do serviço
  v_service_label := CASE NEW.service_type
    WHEN 'maintenance' THEN 'Manutenção'
    WHEN 'revision' THEN 'Revisão'
    WHEN 'spraying' THEN 'Pulverização'
    ELSE NEW.service_type::text
  END;
  
  -- Montar array de usuários a notificar
  v_user_ids := ARRAY[]::UUID[];
  
  -- Adicionar criador
  IF NEW.created_by IS NOT NULL THEN
    v_user_ids := array_append(v_user_ids, NEW.created_by);
  END IF;
  
  -- Adicionar vendedor do cliente
  IF v_seller_auth_id IS NOT NULL AND NOT (v_seller_auth_id = ANY(v_user_ids)) THEN
    v_user_ids := array_append(v_user_ids, v_seller_auth_id);
  END IF;
  
  -- Adicionar usuários atribuídos
  IF NEW.assigned_users IS NOT NULL THEN
    FOREACH v_user_id IN ARRAY NEW.assigned_users LOOP
      IF NOT (v_user_id = ANY(v_user_ids)) THEN
        v_user_ids := array_append(v_user_ids, v_user_id);
      END IF;
    END LOOP;
  END IF;

  -- Buscar nomes dos usuários designados
  SELECT string_agg(u.name, ', ')
  INTO v_user_names
  FROM public.users u
  WHERE u.auth_user_id = ANY(NEW.assigned_users);

  -- Montar mensagem completa
  v_message := format('Cliente: %s', COALESCE(v_client_name, 'Cliente'));
  v_message := v_message || format(' • Data e Hora: %s', to_char(NEW.date, 'DD/MM/YYYY HH24:MI'));
  
  IF v_user_names IS NOT NULL THEN
    v_message := v_message || format(' • Responsáveis: %s', v_user_names);
  END IF;
  
  IF NEW.crop IS NOT NULL AND NEW.crop <> '' THEN
    v_message := v_message || format(' • Cultura: %s', NEW.crop);
  END IF;
  
  IF NEW.city IS NOT NULL AND NEW.city <> '' THEN
    v_message := v_message || format(' • Cidade: %s', NEW.city);
  ELSIF v_client_city IS NOT NULL AND v_client_city <> '' THEN
    IF v_client_state IS NOT NULL AND v_client_state <> '' THEN
      v_message := v_message || format(' • Cidade: %s, %s', v_client_city, v_client_state);
    ELSE
      v_message := v_message || format(' • Cidade: %s', v_client_city);
    END IF;
  END IF;
  
  IF NEW.hectares IS NOT NULL THEN
    v_message := v_message || format(' • Hectares: %s ha', NEW.hectares);
  END IF;
  
  IF NEW.value_per_hectare IS NOT NULL THEN
    v_message := v_message || format(' • Valor/ha: R$ %s', format_currency(NEW.value_per_hectare));
  END IF;
  
  IF NEW.total_value IS NOT NULL THEN
    v_message := v_message || format(' • Valor Total: R$ %s', format_currency(NEW.total_value));
  END IF;
  
  IF NEW.notes IS NOT NULL AND NEW.notes <> '' THEN
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
      'info',
      format('%s Agendada 📅', v_service_label),
      v_message,
      'service_' || NEW.service_type::text
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;