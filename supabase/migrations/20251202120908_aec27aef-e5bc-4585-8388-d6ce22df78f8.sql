-- Converter dados de clientes existentes para maiúsculas
-- Esta migration atualiza os campos de texto dos clientes para uppercase

UPDATE public.clients
SET 
  farm_name = UPPER(farm_name),
  contact_name = UPPER(contact_name),
  city = UPPER(city),
  state = UPPER(state),
  address = UPPER(address),
  crops = ARRAY(SELECT UPPER(crop) FROM unnest(crops) AS crop)
WHERE 
  farm_name IS NOT NULL 
  OR contact_name IS NOT NULL 
  OR city IS NOT NULL 
  OR state IS NOT NULL 
  OR address IS NOT NULL
  OR crops IS NOT NULL;