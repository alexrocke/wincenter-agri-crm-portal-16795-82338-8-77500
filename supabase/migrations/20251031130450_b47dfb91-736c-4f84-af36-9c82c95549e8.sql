-- Add new status to service_status enum
ALTER TYPE service_status ADD VALUE IF NOT EXISTS 'in_progress';
ALTER TYPE service_status ADD VALUE IF NOT EXISTS 'open';

-- Add new status to demo_status enum
ALTER TYPE demo_status ADD VALUE IF NOT EXISTS 'in_progress';

-- Add new fields to services table
ALTER TABLE services 
  ADD COLUMN IF NOT EXISTS equipment_checklist JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS client_items JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS completion_notes TEXT;

-- Add new fields to demonstrations table
ALTER TABLE demonstrations 
  ADD COLUMN IF NOT EXISTS equipment_checklist JSONB DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS completion_notes TEXT;

-- Update trigger to only create sales for maintenance/revision services
CREATE OR REPLACE FUNCTION public.trg_service_completed_create_sale()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_seller_auth_id uuid;
BEGIN
  -- Only process when status changes to 'completed'
  -- AND ONLY for maintenance and revision services (technical support)
  IF NEW.status = 'completed' 
     AND (OLD.status IS NULL OR OLD.status != 'completed')
     AND NEW.service_type IN ('maintenance', 'revision') THEN
    
    -- Check if sale already exists for this service
    IF EXISTS (SELECT 1 FROM public.sales WHERE service_id = NEW.id) THEN
      RETURN NEW;
    END IF;
    
    -- Determine who should receive the commission
    IF NEW.created_by IS NOT NULL THEN
      v_seller_auth_id := NEW.created_by;
    ELSE
      SELECT seller_auth_id INTO v_seller_auth_id
      FROM public.clients
      WHERE id = NEW.client_id;
    END IF;
    
    -- Create sale automatically
    INSERT INTO public.sales (
      client_id,
      seller_auth_id,
      service_id,
      gross_value,
      total_cost,
      estimated_profit,
      status,
      sold_at,
      payment_received
    ) VALUES (
      NEW.client_id,
      v_seller_auth_id,
      NEW.id,
      COALESCE(NEW.total_value, 0),
      0,
      COALESCE(NEW.total_value, 0),
      'closed',
      now(),
      false
    );
    
  END IF;
  
  RETURN NEW;
END;
$function$;