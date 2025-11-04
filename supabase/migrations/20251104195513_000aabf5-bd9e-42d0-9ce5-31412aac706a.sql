-- One-time data fix: Create sale for completed spraying service (Adilton Benfato)
-- This service was completed before automatic sale creation was implemented

INSERT INTO sales (
  service_id,
  client_id,
  seller_auth_id,
  status,
  gross_value,
  total_cost,
  estimated_profit,
  sold_at,
  payment_received,
  created_at
) 
SELECT 
  'b52914c5-7b9a-4328-80e7-44221eaae5a8'::uuid,
  'fd4ecf41-ffd5-477f-8375-0a8a893e1147'::uuid,
  '8a01cfbe-6a81-4cba-85a8-fad2590f958e'::uuid,
  'closed'::sale_status,
  3300,
  0,
  3300,
  '2025-10-24 15:07:00+00'::timestamp with time zone,
  false,
  now()
WHERE NOT EXISTS (
  SELECT 1 FROM sales WHERE service_id = 'b52914c5-7b9a-4328-80e7-44221eaae5a8'
);