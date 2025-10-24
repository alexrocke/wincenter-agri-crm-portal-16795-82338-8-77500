-- Adicionar coluna id como chave primária na tabela client_drone_info
-- Isso permite múltiplos dispositivos por cliente

-- 1. Remover a constraint de chave primária atual (client_id)
ALTER TABLE client_drone_info DROP CONSTRAINT IF EXISTS client_drone_info_pkey;

-- 2. Adicionar coluna id como UUID com default
ALTER TABLE client_drone_info ADD COLUMN IF NOT EXISTS id UUID DEFAULT gen_random_uuid() PRIMARY KEY;

-- 3. Criar índice para client_id para performance
CREATE INDEX IF NOT EXISTS idx_client_drone_info_client_id ON client_drone_info(client_id);

-- 4. Adicionar foreign key constraint para client_id
ALTER TABLE client_drone_info 
  ADD CONSTRAINT fk_client_drone_info_client 
  FOREIGN KEY (client_id) 
  REFERENCES clients(id) 
  ON DELETE CASCADE;