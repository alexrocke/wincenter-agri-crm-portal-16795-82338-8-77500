-- ============================================================================
-- PARTE 1: Remover Triggers Duplicados de Services
-- ============================================================================

-- Remover triggers que causam duplicação
DROP TRIGGER IF EXISTS trg_after_service_update ON services;
DROP TRIGGER IF EXISTS trg_notify_service ON services;

-- Manter apenas:
-- - trg_notify_service_completed (para conclusões)
-- - trg_notify_service_insert (para novos agendamentos)
-- - trg_service_completed_create_sale (para criar vendas)
-- - sync_service_to_sale (para sincronizar valores)

-- ============================================================================
-- PARTE 2: Sistema de Deduplicação Global
-- ============================================================================

-- Criar tabela de controle de notificações
CREATE TABLE IF NOT EXISTS notification_tracker (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_type TEXT NOT NULL,
  reference_id UUID NOT NULL,
  user_auth_id UUID NOT NULL,
  last_notified_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(notification_type, reference_id, user_auth_id)
);

-- Habilitar RLS
ALTER TABLE notification_tracker ENABLE ROW LEVEL SECURITY;

-- Política para admins gerenciarem tracker
CREATE POLICY "notification_tracker_admin"
ON notification_tracker
FOR ALL
USING (is_admin())
WITH CHECK (is_admin());

-- Criar índice para performance
CREATE INDEX IF NOT EXISTS idx_notification_tracker_lookup 
ON notification_tracker(notification_type, reference_id, user_auth_id);

-- Função helper para verificar se deve criar notificação
CREATE OR REPLACE FUNCTION should_create_notification(
  p_user_auth_id UUID,
  p_category TEXT,
  p_title TEXT,
  p_hours_threshold INTEGER DEFAULT 24
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM notifications
    WHERE user_auth_id = p_user_auth_id
      AND category = p_category
      AND title = p_title
      AND created_at > NOW() - (p_hours_threshold || ' hours')::INTERVAL
    LIMIT 1
  );
END;
$$;

-- ============================================================================
-- PARTE 3: Otimizar Trigger de Oportunidades
-- ============================================================================

-- Recriar trigger de oportunidades com melhor lógica
CREATE OR REPLACE FUNCTION trg_notify_opportunity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_client_name TEXT;
  v_admin_id UUID;
  v_stage_label TEXT;
BEGIN
  -- Buscar nome do cliente
  SELECT contact_name INTO v_client_name
  FROM public.clients
  WHERE id = COALESCE(NEW.client_id, OLD.client_id);
  
  -- INSERT: Nova oportunidade (verificar deduplicação)
  IF TG_OP = 'INSERT' THEN
    -- Verificar se não há notificação recente sobre criação para este vendedor
    IF should_create_notification(NEW.seller_auth_id, 'opportunity', 'Nova Oportunidade Criada', 1) THEN
      -- Notificar vendedor
      PERFORM public.create_notification(
        NEW.seller_auth_id,
        'info',
        'Nova Oportunidade Criada',
        format('Oportunidade para %s no valor de R$ %s criada', 
          COALESCE(v_client_name, 'Cliente'),
          format_currency(COALESCE(NEW.gross_value, 0))
        ),
        'opportunity'
      );
    END IF;
    
    -- Notificar admins (EXCETO o vendedor se ele também for admin)
    FOR v_admin_id IN SELECT auth_user_id FROM public.get_admin_user_ids() LOOP
      IF v_admin_id != NEW.seller_auth_id THEN
        IF should_create_notification(v_admin_id, 'opportunity', 'Nova Oportunidade', 1) THEN
          PERFORM public.create_notification(
            v_admin_id,
            'info',
            'Nova Oportunidade',
            format('Oportunidade de R$ %s para %s', 
              format_currency(COALESCE(NEW.gross_value, 0)),
              COALESCE(v_client_name, 'Cliente')
            ),
            'opportunity'
          );
        END IF;
      END IF;
    END LOOP;
  END IF;
  
  -- UPDATE: APENAS quando mudança SIGNIFICATIVA de estágio
  IF TG_OP = 'UPDATE' AND OLD.stage IS DISTINCT FROM NEW.stage THEN
    -- Mapear estágios para labels
    v_stage_label := CASE NEW.stage
      WHEN 'qualification' THEN 'Qualificação'
      WHEN 'proposal' THEN 'Proposta'
      WHEN 'negotiation' THEN 'Negociação'
      WHEN 'won' THEN 'Ganha'
      WHEN 'lost' THEN 'Perdida'
      ELSE NEW.stage
    END;
    
    -- Notificar vendedor
    IF NEW.stage = 'won' THEN
      PERFORM public.create_notification(
        NEW.seller_auth_id,
        'success',
        'Oportunidade Ganha! 🎉',
        format('Parabéns! Oportunidade de %s foi convertida em venda!', 
          COALESCE(v_client_name, 'Cliente')
        ),
        'opportunity'
      );
    ELSIF NEW.stage = 'lost' THEN
      PERFORM public.create_notification(
        NEW.seller_auth_id,
        'warning',
        'Oportunidade Perdida',
        format('Oportunidade de %s foi perdida. Motivo: %s', 
          COALESCE(v_client_name, 'Cliente'),
          COALESCE(NEW.loss_reason, 'Não informado')
        ),
        'opportunity'
      );
    ELSE
      PERFORM public.create_notification(
        NEW.seller_auth_id,
        'success',
        'Oportunidade Avançou',
        format('Oportunidade de %s avançou para: %s', 
          COALESCE(v_client_name, 'Cliente'),
          v_stage_label
        ),
        'opportunity'
      );
    END IF;
    
    -- Notificar admins (EXCETO o vendedor se ele também for admin)
    FOR v_admin_id IN SELECT auth_user_id FROM public.get_admin_user_ids() LOOP
      IF v_admin_id != NEW.seller_auth_id THEN
        PERFORM public.create_notification(
          v_admin_id,
          CASE WHEN NEW.stage = 'won' THEN 'success' 
               WHEN NEW.stage = 'lost' THEN 'warning' 
               ELSE 'info' END,
          format('Oportunidade: %s', v_stage_label),
          format('Oportunidade de %s agora está em: %s', 
            COALESCE(v_client_name, 'Cliente'),
            v_stage_label
          ),
          'opportunity'
        );
      END IF;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$;

-- ============================================================================
-- PARTE 4: Limpeza de Notificações Duplicadas Antigas
-- ============================================================================

-- Identificar e deletar duplicatas dos últimos 30 dias, mantendo a mais recente
WITH duplicates AS (
  SELECT id, 
    ROW_NUMBER() OVER (
      PARTITION BY user_auth_id, title, message, 
                   DATE_TRUNC('minute', created_at)
      ORDER BY created_at DESC
    ) as rn
  FROM notifications
  WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
)
DELETE FROM notifications
WHERE id IN (
  SELECT id FROM duplicates WHERE rn > 1
);