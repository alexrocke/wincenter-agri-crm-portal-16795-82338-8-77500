-- ================================================
-- ATUALIZAR TRIGGERS DE NOTIFICAÇÃO COM METADATA COMPLETO
-- ================================================

-- 1. TRIGGER: trg_notify_demonstration_insert
-- Adiciona metadata completo para demonstrações agendadas
CREATE OR REPLACE FUNCTION public.trg_notify_demonstration_insert()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client_name TEXT;
  v_client_phone TEXT;
  v_client_city TEXT;
  v_client_state TEXT;
  v_seller_auth_id UUID;
  v_user_ids UUID[];
  v_user_id UUID;
  v_user_names TEXT;
  v_types_formatted TEXT;
  v_message TEXT;
  v_metadata JSONB;
BEGIN
  -- Buscar informações completas do cliente
  SELECT contact_name, seller_auth_id, phone, city, state
  INTO v_client_name, v_seller_auth_id, v_client_phone, v_client_city, v_client_state
  FROM public.clients
  WHERE id = NEW.client_id;
  
  -- Buscar nomes dos usuários designados
  SELECT string_agg(u.name, ', ')
  INTO v_user_names
  FROM public.users u
  WHERE u.auth_user_id = ANY(NEW.assigned_users);
  
  -- Formatar tipos de demonstração
  SELECT string_agg(initcap(t), ', ') INTO v_types_formatted FROM unnest(NEW.demo_types) t;
  
  -- Construir metadata estruturado
  v_metadata := jsonb_build_object(
    'demonstration_id', NEW.id,
    'client_id', NEW.client_id,
    'client_name', v_client_name,
    'client_phone', v_client_phone,
    'client_city', v_client_city,
    'client_state', v_client_state,
    'date', NEW.date,
    'date_formatted', to_char(NEW.date, 'DD/MM/YYYY HH24:MI'),
    'demo_types', NEW.demo_types,
    'demo_types_formatted', v_types_formatted,
    'crop', NEW.crop,
    'hectares', NEW.hectares,
    'property_name', NEW.property_name,
    'city', NEW.city,
    'assigned_users', NEW.assigned_users,
    'assigned_user_names', v_user_names,
    'notes', NEW.notes
  );
  
  -- Montar mensagem organizada
  v_message := format('📅 *Nova Demonstração Agendada*%s%s', E'\n', E'\n');
  v_message := v_message || format('👤 *Cliente:* %s%s', COALESCE(v_client_name, 'Cliente'), E'\n');
  v_message := v_message || format('📆 *Data:* %s%s', to_char(NEW.date, 'DD/MM/YYYY HH24:MI'), E'\n');
  
  IF v_user_names IS NOT NULL THEN
    v_message := v_message || format('👥 *Responsáveis:* %s%s', v_user_names, E'\n');
  END IF;
  
  IF v_types_formatted IS NOT NULL THEN
    v_message := v_message || format('📊 *Tipos:* %s%s', v_types_formatted, E'\n');
  END IF;
  
  IF NEW.crop IS NOT NULL AND NEW.crop <> '' THEN
    v_message := v_message || format('🌾 *Cultura:* %s%s', NEW.crop, E'\n');
  END IF;
  
  IF COALESCE(NEW.city, v_client_city) IS NOT NULL THEN
    v_message := v_message || format('📍 *Cidade:* %s%s', 
      COALESCE(NEW.city, v_client_city) || CASE WHEN v_client_state IS NOT NULL THEN ', ' || v_client_state ELSE '' END,
      E'\n'
    );
  END IF;
  
  IF NEW.hectares IS NOT NULL THEN
    v_message := v_message || format('📏 *Hectares:* %s ha%s', NEW.hectares, E'\n');
  END IF;
  
  IF NEW.notes IS NOT NULL AND NEW.notes <> '' THEN
    v_message := v_message || format('%s📝 *Observações:* %s', E'\n', NEW.notes);
  END IF;
  
  -- Montar array de usuários a notificar
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
      'Nova Demonstração Agendada 📅',
      v_message,
      'demonstration',
      v_metadata
    );
  END LOOP;
  
  RETURN NEW;
END;
$function$;

-- 2. TRIGGER: trg_notify_opportunity
-- Adiciona metadata completo para oportunidades
CREATE OR REPLACE FUNCTION public.trg_notify_opportunity()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client_name TEXT;
  v_client_phone TEXT;
  v_client_city TEXT;
  v_client_state TEXT;
  v_admin_id UUID;
  v_stage_label TEXT;
  v_seller_name TEXT;
  v_products_array JSONB;
  v_message TEXT;
  v_metadata JSONB;
BEGIN
  -- Buscar informações completas do cliente
  SELECT contact_name, phone, city, state 
  INTO v_client_name, v_client_phone, v_client_city, v_client_state
  FROM public.clients
  WHERE id = COALESCE(NEW.client_id, OLD.client_id);
  
  -- Buscar nome do vendedor
  SELECT name INTO v_seller_name
  FROM public.users
  WHERE auth_user_id = NEW.seller_auth_id;
  
  -- Buscar produtos da oportunidade
  SELECT jsonb_agg(jsonb_build_object(
    'product_id', oi.product_id,
    'product_name', p.name,
    'quantity', oi.quantity,
    'unit_price', oi.unit_price,
    'discount_percent', oi.discount_percent
  ))
  INTO v_products_array
  FROM public.opportunity_items oi
  JOIN public.products p ON p.id = oi.product_id
  WHERE oi.opportunity_id = NEW.id;
  
  -- Mapear estágios para labels
  v_stage_label := CASE NEW.stage
    WHEN 'lead' THEN 'Lead'
    WHEN 'qualified' THEN 'Qualificado'
    WHEN 'proposal' THEN 'Proposta'
    WHEN 'closing' THEN 'Fechamento'
    WHEN 'won' THEN 'Ganha'
    WHEN 'lost' THEN 'Perdida'
    ELSE NEW.stage::text
  END;
  
  -- Construir metadata estruturado
  v_metadata := jsonb_build_object(
    'opportunity_id', NEW.id,
    'client_id', NEW.client_id,
    'client_name', v_client_name,
    'client_phone', v_client_phone,
    'client_city', v_client_city,
    'client_state', v_client_state,
    'stage', NEW.stage,
    'stage_label', v_stage_label,
    'gross_value', NEW.gross_value,
    'estimated_margin', NEW.estimated_margin,
    'expected_close_date', NEW.expected_close_date,
    'expected_close_date_formatted', to_char(NEW.expected_close_date, 'DD/MM/YYYY'),
    'payment_method', NEW.payment_method,
    'installments', NEW.installments,
    'final_value_with_fee', NEW.final_value_with_fee,
    'probability', NEW.probability,
    'loss_reason', NEW.loss_reason,
    'seller_auth_id', NEW.seller_auth_id,
    'seller_name', v_seller_name,
    'products', COALESCE(v_products_array, '[]'::jsonb),
    'created_at', NEW.created_at,
    'updated_at', NEW.updated_at
  );
  
  -- INSERT: Nova oportunidade
  IF TG_OP = 'INSERT' THEN
    -- Montar mensagem
    v_message := format('📊 *Nova Oportunidade Criada*%s%s', E'\n', E'\n');
    v_message := v_message || format('👤 *Cliente:* %s%s', COALESCE(v_client_name, 'Cliente'), E'\n');
    v_message := v_message || format('💰 *Valor:* R$ %s%s', format_currency(COALESCE(NEW.gross_value, 0)), E'\n');
    v_message := v_message || format('📈 *Estágio:* %s%s', v_stage_label, E'\n');
    
    IF v_seller_name IS NOT NULL THEN
      v_message := v_message || format('👥 *Vendedor:* %s%s', v_seller_name, E'\n');
    END IF;
    
    IF v_client_city IS NOT NULL THEN
      v_message := v_message || format('📍 *Cidade:* %s%s', 
        v_client_city || CASE WHEN v_client_state IS NOT NULL THEN ', ' || v_client_state ELSE '' END,
        E'\n'
      );
    END IF;
    
    IF NEW.expected_close_date IS NOT NULL THEN
      v_message := v_message || format('📅 *Previsão:* %s%s', to_char(NEW.expected_close_date, 'DD/MM/YYYY'), E'\n');
    END IF;
    
    -- Verificar deduplicação e notificar vendedor
    IF should_create_notification(NEW.seller_auth_id, 'opportunity', 'Nova Oportunidade Criada', 1) THEN
      INSERT INTO public.notifications (user_auth_id, kind, title, message, category, metadata)
      VALUES (NEW.seller_auth_id, 'info', 'Nova Oportunidade Criada', v_message, 'opportunity', v_metadata);
    END IF;
    
    -- Notificar admins
    FOR v_admin_id IN SELECT auth_user_id FROM public.get_admin_user_ids() LOOP
      IF v_admin_id != NEW.seller_auth_id THEN
        IF should_create_notification(v_admin_id, 'opportunity', 'Nova Oportunidade', 1) THEN
          INSERT INTO public.notifications (user_auth_id, kind, title, message, category, metadata)
          VALUES (v_admin_id, 'info', 'Nova Oportunidade', v_message, 'opportunity', v_metadata);
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  -- UPDATE: Mudança de estágio
  IF TG_OP = 'UPDATE' AND OLD.stage IS DISTINCT FROM NEW.stage THEN
    IF NEW.stage = 'won' THEN
      v_message := format('🎉 *Oportunidade Ganha!*%s%s', E'\n', E'\n');
      v_message := v_message || format('👤 *Cliente:* %s%s', COALESCE(v_client_name, 'Cliente'), E'\n');
      v_message := v_message || format('💰 *Valor:* R$ %s%s', format_currency(COALESCE(NEW.gross_value, 0)), E'\n');
      
      INSERT INTO public.notifications (user_auth_id, kind, title, message, category, metadata)
      VALUES (NEW.seller_auth_id, 'success', 'Oportunidade Ganha! 🎉', v_message, 'opportunity', v_metadata);
      
    ELSIF NEW.stage = 'lost' THEN
      v_message := format('😔 *Oportunidade Perdida*%s%s', E'\n', E'\n');
      v_message := v_message || format('👤 *Cliente:* %s%s', COALESCE(v_client_name, 'Cliente'), E'\n');
      v_message := v_message || format('💰 *Valor:* R$ %s%s', format_currency(COALESCE(NEW.gross_value, 0)), E'\n');
      IF NEW.loss_reason IS NOT NULL THEN
        v_message := v_message || format('❌ *Motivo:* %s%s', NEW.loss_reason, E'\n');
      END IF;
      
      INSERT INTO public.notifications (user_auth_id, kind, title, message, category, metadata)
      VALUES (NEW.seller_auth_id, 'warning', 'Oportunidade Perdida', v_message, 'opportunity', v_metadata);
      
    ELSE
      v_message := format('📈 *Oportunidade Avançou*%s%s', E'\n', E'\n');
      v_message := v_message || format('👤 *Cliente:* %s%s', COALESCE(v_client_name, 'Cliente'), E'\n');
      v_message := v_message || format('📊 *Novo Estágio:* %s%s', v_stage_label, E'\n');
      v_message := v_message || format('💰 *Valor:* R$ %s%s', format_currency(COALESCE(NEW.gross_value, 0)), E'\n');
      
      INSERT INTO public.notifications (user_auth_id, kind, title, message, category, metadata)
      VALUES (NEW.seller_auth_id, 'success', 'Oportunidade Avançou', v_message, 'opportunity', v_metadata);
    END IF;
    
    -- Notificar admins
    FOR v_admin_id IN SELECT auth_user_id FROM public.get_admin_user_ids() LOOP
      IF v_admin_id != NEW.seller_auth_id THEN
        INSERT INTO public.notifications (user_auth_id, kind, title, message, category, metadata)
        VALUES (
          v_admin_id,
          CASE WHEN NEW.stage = 'won' THEN 'success' WHEN NEW.stage = 'lost' THEN 'warning' ELSE 'info' END,
          format('Oportunidade: %s', v_stage_label),
          v_message,
          'opportunity',
          v_metadata
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 3. TRIGGER: trg_notify_sale
-- Adiciona metadata completo para vendas manuais
CREATE OR REPLACE FUNCTION public.trg_notify_sale()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client_name TEXT;
  v_client_phone TEXT;
  v_client_city TEXT;
  v_client_state TEXT;
  v_admin_id UUID;
  v_seller_name TEXT;
  v_items_array JSONB;
  v_message TEXT;
  v_metadata JSONB;
BEGIN
  -- Apenas notificar quando venda MANUAL é criada (service_id IS NULL)
  IF TG_OP = 'INSERT' AND NEW.status = 'closed' AND NEW.service_id IS NULL THEN
    -- Buscar informações completas do cliente
    SELECT contact_name, phone, city, state 
    INTO v_client_name, v_client_phone, v_client_city, v_client_state
    FROM public.clients
    WHERE id = NEW.client_id;
    
    -- Buscar nome do vendedor
    SELECT name INTO v_seller_name
    FROM public.users
    WHERE auth_user_id = NEW.seller_auth_id;
    
    -- Buscar itens da venda
    SELECT jsonb_agg(jsonb_build_object(
      'product_id', si.product_id,
      'product_name', p.name,
      'qty', si.qty,
      'unit_price', si.unit_price,
      'discount_percent', si.discount_percent,
      'subtotal', (si.unit_price * si.qty) * (1 - si.discount_percent / 100.0)
    ))
    INTO v_items_array
    FROM public.sale_items si
    JOIN public.products p ON p.id = si.product_id
    WHERE si.sale_id = NEW.id;
    
    -- Construir metadata estruturado
    v_metadata := jsonb_build_object(
      'sale_id', NEW.id,
      'client_id', NEW.client_id,
      'client_name', v_client_name,
      'client_phone', v_client_phone,
      'client_city', v_client_city,
      'client_state', v_client_state,
      'sold_at', NEW.sold_at,
      'sold_at_formatted', to_char(NEW.sold_at, 'DD/MM/YYYY HH24:MI'),
      'gross_value', NEW.gross_value,
      'total_cost', NEW.total_cost,
      'estimated_profit', NEW.estimated_profit,
      'payment_method_1', NEW.payment_method_1,
      'payment_value_1', NEW.payment_value_1,
      'payment_method_2', NEW.payment_method_2,
      'payment_value_2', NEW.payment_value_2,
      'final_discount_percent', NEW.final_discount_percent,
      'region', NEW.region,
      'seller_auth_id', NEW.seller_auth_id,
      'seller_name', v_seller_name,
      'items', COALESCE(v_items_array, '[]'::jsonb),
      'payment_received', NEW.payment_received
    );
    
    -- Montar mensagem organizada
    v_message := format('🛒 *Nova Venda Registrada*%s%s', E'\n', E'\n');
    v_message := v_message || format('👤 *Cliente:* %s%s', COALESCE(v_client_name, 'Cliente'), E'\n');
    v_message := v_message || format('💰 *Valor:* R$ %s%s', format_currency(NEW.gross_value), E'\n');
    v_message := v_message || format('📅 *Data:* %s%s', to_char(NEW.sold_at, 'DD/MM/YYYY HH24:MI'), E'\n');
    
    IF v_seller_name IS NOT NULL THEN
      v_message := v_message || format('👥 *Vendedor:* %s%s', v_seller_name, E'\n');
    END IF;
    
    IF v_client_city IS NOT NULL THEN
      v_message := v_message || format('📍 *Cidade:* %s%s', 
        v_client_city || CASE WHEN v_client_state IS NOT NULL THEN ', ' || v_client_state ELSE '' END,
        E'\n'
      );
    END IF;
    
    IF NEW.payment_method_1 IS NOT NULL THEN
      v_message := v_message || format('💳 *Pagamento:* %s%s', NEW.payment_method_1, E'\n');
    END IF;
    
    IF NEW.estimated_profit > 0 THEN
      v_message := v_message || format('📊 *Lucro Est.:* R$ %s%s', format_currency(NEW.estimated_profit), E'\n');
    END IF;
    
    -- Notificar vendedor
    INSERT INTO public.notifications (user_auth_id, kind, title, message, category, metadata)
    VALUES (NEW.seller_auth_id, 'success', 'Nova Venda Registrada 🛒', v_message, 'sale', v_metadata);
    
    -- Notificar todos os admins
    FOR v_admin_id IN SELECT auth_user_id FROM public.get_admin_user_ids() LOOP
      INSERT INTO public.notifications (user_auth_id, kind, title, message, category, metadata)
      VALUES (v_admin_id, 'info', 'Nova Venda', v_message, 'sale', v_metadata);
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 4. TRIGGER: trg_notify_commission
-- Adiciona metadata completo para comissões
CREATE OR REPLACE FUNCTION public.trg_notify_commission()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_manual_sale BOOLEAN;
  v_client_name TEXT;
  v_client_phone TEXT;
  v_seller_name TEXT;
  v_gross_value NUMERIC;
  v_service_type TEXT;
  v_base_label TEXT;
  v_message TEXT;
  v_metadata JSONB;
BEGIN
  -- Buscar dados da venda
  SELECT 
    (s.service_id IS NULL),
    c.contact_name,
    c.phone,
    s.gross_value,
    srv.service_type::text
  INTO v_is_manual_sale, v_client_name, v_client_phone, v_gross_value, v_service_type
  FROM sales s
  JOIN clients c ON c.id = s.client_id
  LEFT JOIN services srv ON srv.id = s.service_id
  WHERE s.id = COALESCE(NEW.sale_id, OLD.sale_id);
  
  -- Buscar nome do vendedor
  SELECT name INTO v_seller_name
  FROM public.users
  WHERE auth_user_id = NEW.seller_auth_id;
  
  -- Mapear base para label
  v_base_label := CASE NEW.base
    WHEN 'gross' THEN 'Valor Bruto'
    WHEN 'profit' THEN 'Lucro'
    WHEN 'maintenance' THEN 'Manutenção'
    WHEN 'revision' THEN 'Revisão'
    WHEN 'spraying' THEN 'Pulverização'
    ELSE NEW.base::text
  END;
  
  -- Construir metadata estruturado
  v_metadata := jsonb_build_object(
    'commission_id', NEW.id,
    'sale_id', NEW.sale_id,
    'seller_auth_id', NEW.seller_auth_id,
    'seller_name', v_seller_name,
    'client_name', v_client_name,
    'client_phone', v_client_phone,
    'amount', NEW.amount,
    'percent', NEW.percent,
    'base', NEW.base,
    'base_label', v_base_label,
    'pay_status', NEW.pay_status,
    'gross_value', v_gross_value,
    'service_type', v_service_type,
    'is_manual_sale', v_is_manual_sale,
    'notes', NEW.notes,
    'created_at', NEW.created_at
  );
  
  -- INSERT: Nova comissão criada (só notificar se for venda manual)
  IF TG_OP = 'INSERT' AND v_is_manual_sale THEN
    v_message := format('💰 *Nova Comissão Gerada*%s%s', E'\n', E'\n');
    v_message := v_message || format('💵 *Valor:* R$ %s%s', format_currency(NEW.amount), E'\n');
    v_message := v_message || format('📊 *Percentual:* %s%%%s', NEW.percent, E'\n');
    v_message := v_message || format('📈 *Base:* %s%s', v_base_label, E'\n');
    v_message := v_message || format('👤 *Cliente:* %s%s', COALESCE(v_client_name, 'Cliente'), E'\n');
    v_message := v_message || format('🛒 *Valor Venda:* R$ %s%s', format_currency(COALESCE(v_gross_value, 0)), E'\n');
    
    INSERT INTO public.notifications (user_auth_id, kind, title, message, category, metadata)
    VALUES (NEW.seller_auth_id, 'success', 'Nova Comissão Gerada! 💰', v_message, 'commission', v_metadata);
  END IF;
  
  -- UPDATE: Mudança de status de pagamento
  IF TG_OP = 'UPDATE' AND OLD.pay_status != NEW.pay_status THEN
    IF NEW.pay_status = 'paid' THEN
      v_message := format('🎉 *Comissão Paga!*%s%s', E'\n', E'\n');
      v_message := v_message || format('💵 *Valor:* R$ %s%s', format_currency(NEW.amount), E'\n');
      v_message := v_message || format('👤 *Cliente:* %s%s', COALESCE(v_client_name, 'Cliente'), E'\n');
      
      INSERT INTO public.notifications (user_auth_id, kind, title, message, category, metadata)
      VALUES (NEW.seller_auth_id, 'success', 'Comissão Paga! 🎉', v_message, 'commission', v_metadata);
      
    ELSIF NEW.pay_status = 'canceled' THEN
      v_message := format('❌ *Comissão Cancelada*%s%s', E'\n', E'\n');
      v_message := v_message || format('💵 *Valor:* R$ %s%s', format_currency(NEW.amount), E'\n');
      IF NEW.notes IS NOT NULL AND NEW.notes <> '' THEN
        v_message := v_message || format('📝 *Motivo:* %s%s', NEW.notes, E'\n');
      END IF;
      
      INSERT INTO public.notifications (user_auth_id, kind, title, message, category, metadata)
      VALUES (NEW.seller_auth_id, 'warning', 'Comissão Cancelada', v_message, 'commission', v_metadata);
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- 5. TRIGGER: trg_notify_service (UPDATE para scheduled)
-- Adiciona metadata quando serviço é reagendado
CREATE OR REPLACE FUNCTION public.trg_notify_service()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_client_name TEXT;
  v_client_phone TEXT;
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
  -- UPDATE para agendado: gerar nova notificação completa quando editar serviço
  IF TG_OP = 'UPDATE' AND NEW.status = 'scheduled' THEN
    -- Disparar apenas se campos principais alterarem
    IF (NEW.date IS DISTINCT FROM OLD.date)
       OR (NEW.service_type IS DISTINCT FROM OLD.service_type)
       OR (NEW.client_id IS DISTINCT FROM OLD.client_id)
       OR (NEW.assigned_users IS DISTINCT FROM OLD.assigned_users)
       OR (NEW.notes IS DISTINCT FROM OLD.notes)
       OR (NEW.hectares IS DISTINCT FROM OLD.hectares)
       OR (NEW.value_per_hectare IS DISTINCT FROM OLD.value_per_hectare)
       OR (NEW.fixed_value IS DISTINCT FROM OLD.fixed_value) THEN

      -- Buscar informações completas do cliente
      SELECT contact_name, seller_auth_id, phone, city, state 
      INTO v_client_name, v_seller_auth_id, v_client_phone, v_client_city, v_client_state
      FROM public.clients
      WHERE id = NEW.client_id;

      v_service_label := CASE NEW.service_type
        WHEN 'maintenance' THEN 'Manutenção'
        WHEN 'revision' THEN 'Revisão'
        WHEN 'spraying' THEN 'Pulverização'
        ELSE NEW.service_type::text
      END;

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
        'client_phone', v_client_phone,
        'client_city', v_client_city,
        'client_state', v_client_state,
        'date', NEW.date,
        'date_formatted', to_char(NEW.date, 'DD/MM/YYYY HH24:MI'),
        'assigned_users', NEW.assigned_users,
        'assigned_user_names', v_user_names,
        'crop', NEW.crop,
        'city', COALESCE(NEW.city, v_client_city),
        'hectares', NEW.hectares,
        'value_per_hectare', NEW.value_per_hectare,
        'fixed_value', NEW.fixed_value,
        'total_value', NEW.total_value,
        'notes', NEW.notes,
        'is_update', true
      );

      -- Montar mensagem organizada
      v_message := format('🔄 *%s Atualizada*%s%s', v_service_label, E'\n', E'\n');
      v_message := v_message || format('👤 *Cliente:* %s%s', COALESCE(v_client_name, 'Cliente'), E'\n');
      v_message := v_message || format('📆 *Data:* %s%s', to_char(NEW.date, 'DD/MM/YYYY HH24:MI'), E'\n');
      
      IF v_user_names IS NOT NULL THEN
        v_message := v_message || format('👥 *Responsáveis:* %s%s', v_user_names, E'\n');
      END IF;
      
      IF NEW.crop IS NOT NULL AND NEW.crop <> '' THEN
        v_message := v_message || format('🌾 *Cultura:* %s%s', NEW.crop, E'\n');
      END IF;
      
      IF COALESCE(NEW.city, v_client_city) IS NOT NULL THEN
        v_message := v_message || format('📍 *Cidade:* %s%s', 
          COALESCE(NEW.city, v_client_city) || CASE WHEN v_client_state IS NOT NULL THEN ', ' || v_client_state ELSE '' END,
          E'\n'
        );
      END IF;
      
      IF NEW.hectares IS NOT NULL THEN
        v_message := v_message || format('📏 *Hectares:* %s ha%s', NEW.hectares, E'\n');
      END IF;
      
      IF NEW.value_per_hectare IS NOT NULL THEN
        v_message := v_message || format('💵 *Valor/ha:* R$ %s%s', format_currency(NEW.value_per_hectare), E'\n');
      END IF;
      
      IF NEW.fixed_value IS NOT NULL THEN
        v_message := v_message || format('💵 *Valor fixo:* R$ %s%s', format_currency(NEW.fixed_value), E'\n');
      END IF;
      
      IF NEW.total_value IS NOT NULL THEN
        v_message := v_message || format('💰 *Total:* R$ %s%s', format_currency(NEW.total_value), E'\n');
      END IF;
      
      IF NEW.notes IS NOT NULL AND NEW.notes <> '' THEN
        v_message := v_message || format('%s📝 *Obs.:* %s', E'\n', NEW.notes);
      END IF;

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
          format('%s Atualizada 🔄', v_service_label),
          v_message,
          'service_' || NEW.service_type::text,
          v_metadata
        );
      END LOOP;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;