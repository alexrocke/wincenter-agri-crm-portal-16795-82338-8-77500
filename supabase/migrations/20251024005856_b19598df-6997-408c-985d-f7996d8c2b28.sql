-- Migration 1: Expandir tabela services para Serviço e Assistência Técnica

-- Adicionar novos campos para Serviço (Pulverização)
ALTER TABLE services ADD COLUMN IF NOT EXISTS crop text;
ALTER TABLE services ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE services ADD COLUMN IF NOT EXISTS property_name text;
ALTER TABLE services ADD COLUMN IF NOT EXISTS payment_method_1 text;
ALTER TABLE services ADD COLUMN IF NOT EXISTS payment_method_2 text;
ALTER TABLE services ADD COLUMN IF NOT EXISTS installments integer;
ALTER TABLE services ADD COLUMN IF NOT EXISTS installment_dates jsonb;
ALTER TABLE services ADD COLUMN IF NOT EXISTS images text[];
ALTER TABLE services ADD COLUMN IF NOT EXISTS invoiced boolean DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS invoice_number text;

-- Adicionar novos campos para Assistência Técnica
ALTER TABLE services ADD COLUMN IF NOT EXISTS equipment_model text;
ALTER TABLE services ADD COLUMN IF NOT EXISTS equipment_serial text;
ALTER TABLE services ADD COLUMN IF NOT EXISTS equipment_year integer;
ALTER TABLE services ADD COLUMN IF NOT EXISTS service_category text;
ALTER TABLE services ADD COLUMN IF NOT EXISTS under_warranty boolean DEFAULT false;
ALTER TABLE services ADD COLUMN IF NOT EXISTS client_signature text;
ALTER TABLE services ADD COLUMN IF NOT EXISTS technical_checklist text;
ALTER TABLE services ADD COLUMN IF NOT EXISTS followup_objective text;
ALTER TABLE services ADD COLUMN IF NOT EXISTS followup_results text;
ALTER TABLE services ADD COLUMN IF NOT EXISTS client_present boolean;

-- Adicionar índices para performance
CREATE INDEX IF NOT EXISTS idx_services_service_category ON services(service_category);
CREATE INDEX IF NOT EXISTS idx_services_crop ON services(crop);
CREATE INDEX IF NOT EXISTS idx_services_city ON services(city);