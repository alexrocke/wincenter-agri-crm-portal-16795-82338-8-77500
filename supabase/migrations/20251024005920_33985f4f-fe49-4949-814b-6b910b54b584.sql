-- Migration 2: Expandir tabela demonstrations

-- Adicionar campos para upload de imagens e avaliação
ALTER TABLE demonstrations ADD COLUMN IF NOT EXISTS images text[];
ALTER TABLE demonstrations ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE demonstrations ADD COLUMN IF NOT EXISTS property_name text;
ALTER TABLE demonstrations ADD COLUMN IF NOT EXISTS client_evaluation text;

-- Adicionar índices
CREATE INDEX IF NOT EXISTS idx_demonstrations_city ON demonstrations(city);