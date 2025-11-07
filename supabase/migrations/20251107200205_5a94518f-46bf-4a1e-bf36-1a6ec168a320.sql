-- Atualizar trigger de notificação de serviço INSERT para incluir metadata estruturado
CREATE OR REPLACE FUNCTION public.trg_notify_service_insert()
 RETURNS trigger
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
  v_metadata JSONB;
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

  -- Buscar nomes dos usuários designados
  SELECT string_agg(u.name, ', ')
  INTO v_user_names
  FROM public.users u
  WHERE u.auth_user_id = ANY(NEW.assigned_users);

  -- Construir metadata estruturado
  v_metadata := jsonb_build_object(
    'service_id', NEW.id,
    'service_type', NEW.service_type,
    'service_type_label', v_service_label,
    'client_id', NEW.client_id,
    'client_name', v_client_name,
    'date', NEW.date,
    'date_formatted', to_char(NEW.date, 'DD/MM/YYYY HH24:MI'),
    'responsible_names', v_user_names,
    'crop', NEW.crop,
    'city', COALESCE(NEW.city, v_client_city),
    'state', v_client_state,
    'hectares', NEW.hectares,
    'value_per_hectare', NEW.value_per_hectare,
    'total_value', NEW.total_value,
    'notes', NEW.notes
  );

  -- Montar mensagem organizada
  v_message := format('📅 *%s Agendada*%s%s', 
    v_service_label,
    E'\n',
    E'\n'
  );
  v_message := v_message || format('👤 *Cliente:* %s%s', COALESCE(v_client_name, 'Cliente'), E'\n');
  v_message := v_message || format('📆 *Data:* %s%s', to_char(NEW.date, 'DD/MM/YYYY HH24:MI'), E'\n');
  
  IF v_user_names IS NOT NULL THEN
    v_message := v_message || format('👥 *Responsáveis:* %s%s', v_user_names, E'\n');
  END IF;
  
  IF NEW.crop IS NOT NULL AND NEW.crop <> '' THEN
    v_message := v_message || format('🌾 *Cultura:* %s%s', NEW.crop, E'\n');
  END IF;
  
  IF NEW.city IS NOT NULL AND NEW.city <> '' THEN
    v_message := v_message || format('📍 *Cidade:* %s%s', NEW.city, E'\n');
  ELSIF v_client_city IS NOT NULL AND v_client_city <> '' THEN
    v_message := v_message || format('📍 *Cidade:* %s%s', 
      v_client_city || CASE WHEN v_client_state IS NOT NULL THEN ', ' || v_client_state ELSE '' END,
      E'\n'
    );
  END IF;
  
  IF NEW.hectares IS NOT NULL THEN
    v_message := v_message || format('📏 *Hectares:* %s ha%s', NEW.hectares, E'\n');
  END IF;
  
  IF NEW.value_per_hectare IS NOT NULL THEN
    v_message := v_message || format('💵 *Valor/ha:* R$ %s%s', format_currency(NEW.value_per_hectare), E'\n');
  END IF;
  
  IF NEW.total_value IS NOT NULL THEN
    v_message := v_message || format('💰 *Valor Total:* R$ %s%s', format_currency(NEW.total_value), E'\n');
  END IF;
  
  IF NEW.notes IS NOT NULL AND NEW.notes <> '' THEN
    v_message := v_message || format('%s📝 *Observações:* %s', E'\n', NEW.notes);
  END IF;
  
  -- Criar notificação para cada usuário
  FOREACH v_user_id IN ARRAY v_user_ids LOOP
    INSERT INTO public.notifications (
      user_auth_id,
      kind,
      title,
      message,
      category,
      metadata
    ) VALUES (
      v_user_id,
      'info',
      format('%s Agendada 📅', v_service_label),
      v_message,
      'service_' || NEW.service_type::text,
      v_metadata
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- Atualizar trigger de notificação de serviço COMPLETED para incluir metadata estruturado
CREATE OR REPLACE FUNCTION public.trg_notify_service_completed()
 RETURNS trigger
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
  v_products_array JSONB;
  v_weather_text TEXT;
  v_message TEXT;
  v_metadata JSONB;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    
    SELECT contact_name, seller_auth_id
    INTO v_client_name, v_seller_auth_id
    FROM public.clients
    WHERE id = NEW.client_id;
    
    v_service_label := CASE NEW.service_type
      WHEN 'maintenance' THEN 'Manutenção'
      WHEN 'revision' THEN 'Revisão'
      WHEN 'spraying' THEN 'Pulverização'
      ELSE NEW.service_type::text
    END;
    
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

    SELECT string_agg(u.name, ', ')
    INTO v_user_names
    FROM public.users u
    WHERE u.auth_user_id = ANY(NEW.assigned_users);

    -- Buscar produtos utilizados como texto e array
    SELECT 
      string_agg(format('%s (%s mL/ha)', COALESCE(si.product_name, 'Produto'), COALESCE(si.dose_per_hectare::text, '0')), ', '),
      jsonb_agg(jsonb_build_object(
        'name', COALESCE(si.product_name, 'Produto'),
        'dose', si.dose_per_hectare,
        'qty', si.qty,
        'unit_price', si.unit_price
      ))
    INTO v_products_text, v_products_array
    FROM public.service_items si
    WHERE si.service_id = NEW.id;

    -- Construir metadata estruturado
    v_metadata := jsonb_build_object(
      'service_id', NEW.id,
      'service_type', NEW.service_type,
      'service_type_label', v_service_label,
      'client_id', NEW.client_id,
      'client_name', v_client_name,
      'date', NEW.date,
      'date_formatted', to_char(NEW.date, 'DD/MM/YYYY HH24:MI'),
      'responsible_names', v_user_names,
      'crop', NEW.crop,
      'hectares', NEW.hectares,
      'total_value', NEW.total_value,
      'products', COALESCE(v_products_array, '[]'::jsonb),
      'weather', jsonb_build_object(
        'temperature', NEW.weather_temperature,
        'description', NEW.weather_description,
        'humidity', NEW.weather_humidity,
        'wind_speed', NEW.weather_wind_speed
      ),
      'notes', NEW.notes
    );

    -- Montar mensagem organizada
    v_message := format('✅ *%s CONCLUÍDA*%s%s', 
      upper(v_service_label),
      E'\n',
      E'\n'
    );
    v_message := v_message || format('👤 *Cliente:* %s%s', COALESCE(v_client_name, 'Cliente'), E'\n');
    v_message := v_message || format('📆 *Data:* %s%s', to_char(NEW.date, 'DD/MM/YYYY HH24:MI'), E'\n');
    
    IF v_user_names IS NOT NULL THEN
      v_message := v_message || format('👥 *Responsáveis:* %s%s', v_user_names, E'\n');
    END IF;
    
    IF NEW.crop IS NOT NULL AND NEW.crop <> '' THEN
      v_message := v_message || format('🌾 *Cultura:* %s%s', NEW.crop, E'\n');
    END IF;
    
    IF NEW.hectares IS NOT NULL THEN
      v_message := v_message || format('📏 *Hectares:* %s ha%s', NEW.hectares, E'\n');
    END IF;
    
    IF NEW.weather_temperature IS NOT NULL OR NEW.weather_description IS NOT NULL THEN
      v_message := v_message || E'\n🌤️ *Clima:*' || E'\n';
      IF NEW.weather_description IS NOT NULL THEN
        v_message := v_message || format('  • %s%s', NEW.weather_description, E'\n');
      END IF;
      IF NEW.weather_temperature IS NOT NULL THEN
        v_message := v_message || format('  • Temp: %s°C%s', NEW.weather_temperature, E'\n');
      END IF;
      IF NEW.weather_humidity IS NOT NULL THEN
        v_message := v_message || format('  • Umidade: %s%%%s', NEW.weather_humidity, E'\n');
      END IF;
      IF NEW.weather_wind_speed IS NOT NULL THEN
        v_message := v_message || format('  • Vento: %s km/h%s', NEW.weather_wind_speed, E'\n');
      END IF;
    END IF;
    
    IF v_products_text IS NOT NULL THEN
      v_message := v_message || format('%s🧪 *Produtos:* %s%s', E'\n', v_products_text, E'\n');
    END IF;
    
    IF NEW.total_value IS NOT NULL THEN
      v_message := v_message || format('%s💰 *Valor Total:* R$ %s%s', E'\n', format_currency(NEW.total_value), E'\n');
    END IF;
    
    IF NEW.notes IS NOT NULL AND NEW.notes <> '' THEN
      v_message := v_message || format('%s📝 *Observações:* %s', E'\n', NEW.notes);
    END IF;

    FOREACH v_user_id IN ARRAY v_user_ids LOOP
      INSERT INTO public.notifications (
        user_auth_id,
        kind,
        title,
        message,
        category,
        metadata
      ) VALUES (
        v_user_id,
        'success',
        format('%s Concluída ✅', v_service_label),
        v_message,
        'service_' || NEW.service_type::text,
        v_metadata
      );
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Atualizar trigger de notificação de demonstração para incluir metadata estruturado
CREATE OR REPLACE FUNCTION public.trg_notify_demonstration()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client_name TEXT;
  v_seller_auth_id UUID;
  v_user_id UUID;
  v_user_ids UUID[];
  v_client_city TEXT;
  v_client_state TEXT;
  v_types TEXT;
  v_city TEXT;
  v_message TEXT;
  v_metadata JSONB;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status <> 'completed') THEN
    SELECT contact_name, seller_auth_id, city, state
      INTO v_client_name, v_seller_auth_id, v_client_city, v_client_state
    FROM public.clients
    WHERE id = NEW.client_id;

    SELECT string_agg(initcap(t), ', ') INTO v_types FROM unnest(NEW.demo_types) t;
    v_city := COALESCE(NULLIF(v_client_city, ''), NEW.weather_city);

    -- Construir metadata estruturado
    v_metadata := jsonb_build_object(
      'demonstration_id', NEW.id,
      'client_id', NEW.client_id,
      'client_name', v_client_name,
      'date', NEW.date,
      'date_formatted', to_char(NEW.date, 'DD/MM/YYYY HH24:MI'),
      'demo_types', NEW.demo_types,
      'demo_types_formatted', v_types,
      'crop', NEW.crop,
      'city', v_city,
      'state', v_client_state,
      'hectares', NEW.hectares,
      'notes', NEW.notes
    );

    -- Montar mensagem organizada
    v_message := format('✅ *Demonstração Concluída*%s%s', E'\n', E'\n');
    v_message := v_message || format('👤 *Cliente:* %s%s', COALESCE(v_client_name, 'Cliente'), E'\n');
    v_message := v_message || format('📆 *Data:* %s%s', to_char(NEW.date, 'DD/MM/YYYY HH24:MI'), E'\n');
    
    IF v_types IS NOT NULL THEN
      v_message := v_message || format('📊 *Tipo:* %s%s', v_types, E'\n');
    END IF;
    
    IF NEW.crop IS NOT NULL AND NEW.crop <> '' THEN
      v_message := v_message || format('🌾 *Cultura:* %s%s', NEW.crop, E'\n');
    END IF;
    
    IF v_city IS NOT NULL THEN
      v_message := v_message || format('📍 *Cidade:* %s%s', 
        v_city || CASE WHEN v_client_state IS NOT NULL AND v_client_state <> '' THEN ', ' || v_client_state ELSE '' END,
        E'\n'
      );
    END IF;
    
    IF NEW.hectares IS NOT NULL THEN
      v_message := v_message || format('📏 *Hectares:* %s ha%s', NEW.hectares, E'\n');
    END IF;
    
    IF NEW.notes IS NOT NULL AND NEW.notes <> '' THEN
      v_message := v_message || format('%s📝 *Observações:* %s', E'\n', NEW.notes);
    END IF;

    v_user_ids := ARRAY[]::UUID[];
    IF v_seller_auth_id IS NOT NULL THEN
      v_user_ids := array_append(v_user_ids, v_seller_auth_id);
    END IF;
    IF NEW.assigned_users IS NOT NULL THEN
      FOREACH v_user_id IN ARRAY NEW.assigned_users LOOP
        IF NOT (v_user_id = ANY(v_user_ids)) THEN
          v_user_ids := array_append(v_user_ids, v_user_id);
        END IF;
      END LOOP;
    END IF;

    FOREACH v_user_id IN ARRAY v_user_ids LOOP
      INSERT INTO public.notifications (
        user_auth_id,
        kind,
        title,
        message,
        category,
        metadata
      ) VALUES (
        v_user_id,
        'success',
        'Demonstração Concluída ✅',
        v_message,
        'demonstration',
        v_metadata
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;