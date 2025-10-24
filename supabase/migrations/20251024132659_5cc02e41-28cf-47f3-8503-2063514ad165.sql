-- Adicionar campos necessários para produtos/defensivos se não existirem
ALTER TABLE service_items ADD COLUMN IF NOT EXISTS product_name TEXT;
ALTER TABLE service_items ADD COLUMN IF NOT EXISTS dose_per_hectare NUMERIC;
ALTER TABLE service_items ADD COLUMN IF NOT EXISTS volume_total NUMERIC;
ALTER TABLE service_items ADD COLUMN IF NOT EXISTS bottles_qty INTEGER;