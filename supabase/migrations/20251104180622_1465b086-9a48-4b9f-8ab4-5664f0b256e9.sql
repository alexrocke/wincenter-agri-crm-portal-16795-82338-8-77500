-- Função para sincronizar serviços com vendas
CREATE OR REPLACE FUNCTION sync_service_to_sale()
RETURNS TRIGGER AS $$
DECLARE
  v_sale_id uuid;
  v_total_cost numeric;
  v_gross_value numeric;
BEGIN
  -- Buscar venda associada ao serviço
  SELECT id INTO v_sale_id 
  FROM sales 
  WHERE service_id = NEW.id;
  
  -- Se não existe venda, não fazer nada
  IF v_sale_id IS NULL THEN
    RETURN NEW;
  END IF;
  
  -- Calcular valor bruto dos produtos do serviço
  SELECT 
    COALESCE(SUM(
      (unit_price * qty) * (1 - discount_percent / 100.0)
    ), 0)
  INTO v_gross_value
  FROM service_items
  WHERE service_id = NEW.id;
  
  -- Adicionar valor do serviço se existir
  IF NEW.total_value IS NOT NULL THEN
    v_gross_value := v_gross_value + NEW.total_value;
  END IF;
  
  -- Calcular custo total dos produtos
  SELECT 
    COALESCE(SUM(p.cost * si.qty), 0)
  INTO v_total_cost
  FROM service_items si
  JOIN products p ON si.product_id = p.id
  WHERE si.service_id = NEW.id;
  
  -- Atualizar venda
  UPDATE sales
  SET 
    gross_value = v_gross_value,
    total_cost = v_total_cost,
    estimated_profit = v_gross_value - v_total_cost,
    sold_at = NEW.date
  WHERE id = v_sale_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar trigger para sincronizar ao atualizar serviço
CREATE TRIGGER trigger_sync_service_to_sale
AFTER UPDATE ON services
FOR EACH ROW
WHEN (OLD.total_value IS DISTINCT FROM NEW.total_value 
      OR OLD.date IS DISTINCT FROM NEW.date)
EXECUTE FUNCTION sync_service_to_sale();

-- Função para sincronizar itens do serviço com itens da venda
CREATE OR REPLACE FUNCTION sync_service_items_to_sale_items()
RETURNS TRIGGER AS $$
DECLARE
  v_sale_id uuid;
BEGIN
  -- Buscar venda associada ao serviço
  SELECT id INTO v_sale_id 
  FROM sales 
  WHERE service_id = COALESCE(NEW.service_id, OLD.service_id);
  
  -- Se não existe venda, não fazer nada
  IF v_sale_id IS NULL THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  
  -- Recriar todos os sale_items baseado nos service_items atuais
  DELETE FROM sale_items WHERE sale_id = v_sale_id;
  
  INSERT INTO sale_items (sale_id, product_id, qty, unit_price, discount_percent)
  SELECT 
    v_sale_id,
    product_id,
    qty,
    unit_price,
    discount_percent
  FROM service_items
  WHERE service_id = COALESCE(NEW.service_id, OLD.service_id)
    AND product_id IS NOT NULL;
  
  -- Recalcular valores da venda
  UPDATE sales
  SET 
    gross_value = (
      SELECT COALESCE(SUM(
        (unit_price * qty) * (1 - discount_percent / 100.0)
      ), 0)
      FROM sale_items
      WHERE sale_id = v_sale_id
    ),
    total_cost = (
      SELECT COALESCE(SUM(p.cost * si.qty), 0)
      FROM sale_items si
      JOIN products p ON si.product_id = p.id
      WHERE si.sale_id = v_sale_id
    )
  WHERE id = v_sale_id;
  
  -- Recalcular lucro
  UPDATE sales
  SET estimated_profit = gross_value - total_cost
  WHERE id = v_sale_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar triggers para INSERT, UPDATE e DELETE de service_items
CREATE TRIGGER trigger_sync_service_items_insert
AFTER INSERT ON service_items
FOR EACH ROW
EXECUTE FUNCTION sync_service_items_to_sale_items();

CREATE TRIGGER trigger_sync_service_items_update
AFTER UPDATE ON service_items
FOR EACH ROW
EXECUTE FUNCTION sync_service_items_to_sale_items();

CREATE TRIGGER trigger_sync_service_items_delete
AFTER DELETE ON service_items
FOR EACH ROW
EXECUTE FUNCTION sync_service_items_to_sale_items();