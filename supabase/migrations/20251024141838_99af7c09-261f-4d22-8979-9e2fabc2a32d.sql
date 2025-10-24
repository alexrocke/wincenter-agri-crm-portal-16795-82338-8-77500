-- Criar trigger para incluir produtos na notificação quando serviço for completado
CREATE OR REPLACE FUNCTION public.trg_notify_service_completed()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_client_name TEXT;
  v_service_label TEXT;
  v_user_ids UUID[];
  v_user_id UUID;
  v_seller_auth_id UUID;
  v_user_names TEXT;
  v_products_text TEXT;
  v_weather_text TEXT;
  v_message TEXT;
BEGIN
  -- Só notificar quando status mudar para 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    
    -- Buscar informações do cliente e vendedor
    SELECT contact_name, seller_auth_id
    INTO v_client_name, v_seller_auth_id
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
    
    IF NEW.created_by IS NOT NULL THEN
      v_user_ids := array_append(v_user_ids, NEW.created_by);
    END IF;
    
    IF v_seller_auth_id IS NOT NULL AND NOT (v_seller_auth_id = ANY(v_user_ids)) THEN
      v_user_ids := array_append(v_user_ids, v_seller_auth_id);
    END IF;
    
    IF NEW.assigned_users IS NOT NULL THEN
      FOREACH v_user_id IN ARRAY NEW.assigned_users LOOP
        IF NOT (v_user_id = ANY(v_user_ids)) THEN
          v_user_ids := array_append(v_user_ids, v_user_id);
        END IF;
      END LOOP;
    END IF;

    -- Buscar nomes dos usuários responsáveis
    SELECT string_agg(u.name, ', ')
    INTO v_user_names
    FROM public.users u
    WHERE u.auth_user_id = ANY(NEW.assigned_users);

    -- Buscar produtos utilizados
    SELECT string_agg(
      format('%s (%s mL/ha)', 
        COALESCE(si.product_name, 'Produto'), 
        COALESCE(si.dose_per_hectare::text, '0')
      ), 
      ', '
    )
    INTO v_products_text
    FROM public.service_items si
    WHERE si.service_id = NEW.id;

    -- Montar texto do clima se disponível
    IF NEW.weather_temperature IS NOT NULL OR NEW.weather_description IS NOT NULL THEN
      v_weather_text := 'Clima: ';
      IF NEW.weather_description IS NOT NULL THEN
        v_weather_text := v_weather_text || NEW.weather_description;
      END IF;
      IF NEW.weather_temperature IS NOT NULL THEN
        v_weather_text := v_weather_text || format(' • Temp: %s°C', NEW.weather_temperature);
      END IF;
      IF NEW.weather_humidity IS NOT NULL THEN
        v_weather_text := v_weather_text || format(' • Umidade: %s%%', NEW.weather_humidity);
      END IF;
      IF NEW.weather_wind_speed IS NOT NULL THEN
        v_weather_text := v_weather_text || format(' • Vento: %s km/h', NEW.weather_wind_speed);
      END IF;
    END IF;

    -- Montar mensagem completa
    v_message := format('✅ %s CONCLUÍDA', upper(v_service_label));
    v_message := v_message || format(' • Cliente: %s', COALESCE(v_client_name, 'Cliente'));
    v_message := v_message || format(' • Data: %s', to_char(NEW.date, 'DD/MM/YYYY HH24:MI'));
    
    IF v_user_names IS NOT NULL THEN
      v_message := v_message || format(' • Responsáveis: %s', v_user_names);
    END IF;
    
    IF NEW.crop IS NOT NULL AND NEW.crop <> '' THEN
      v_message := v_message || format(' • Cultura: %s', NEW.crop);
    END IF;
    
    IF NEW.hectares IS NOT NULL THEN
      v_message := v_message || format(' • Hectares: %s ha', NEW.hectares);
    END IF;
    
    IF v_weather_text IS NOT NULL THEN
      v_message := v_message || ' • ' || v_weather_text;
    END IF;
    
    IF v_products_text IS NOT NULL THEN
      v_message := v_message || ' • Produtos: ' || v_products_text;
    END IF;
    
    IF NEW.total_value IS NOT NULL THEN
      v_message := v_message || format(' • Valor Total: R$ %s', format_currency(NEW.total_value));
    END IF;
    
    IF NEW.notes IS NOT NULL AND NEW.notes <> '' THEN
      v_message := v_message || format(' • Obs: %s', NEW.notes);
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
        format('%s Concluída ✅', v_service_label),
        v_message,
        'service_' || NEW.service_type::text
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Atualizar trigger para UPDATE para incluir tanto agendamento quanto conclusão
DROP TRIGGER IF EXISTS trg_notify_service ON public.services;
CREATE TRIGGER trg_notify_service
AFTER UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.trg_notify_service();

-- Separar em dois triggers específicos
DROP TRIGGER IF EXISTS trg_notify_service_update ON public.services;
CREATE TRIGGER trg_notify_service_update
AFTER UPDATE ON public.services
FOR EACH ROW
WHEN (NEW.status = 'scheduled' AND OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION public.trg_notify_service_insert();

DROP TRIGGER IF EXISTS trg_notify_service_complete ON public.services;
CREATE TRIGGER trg_notify_service_complete
AFTER UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION public.trg_notify_service_completed();