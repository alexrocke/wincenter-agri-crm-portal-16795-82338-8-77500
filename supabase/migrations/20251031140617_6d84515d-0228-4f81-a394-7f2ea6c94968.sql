-- Atualizar policies de services para permitir que todos os sellers vejam (não apenas os seus)
DROP POLICY IF EXISTS "services_seller_view" ON services;
DROP POLICY IF EXISTS "services_seller_iud" ON services;

-- Policy de SELECT: todos os sellers e admins podem ver todos os serviços
CREATE POLICY "services_seller_view" ON services
FOR SELECT
USING (
  is_admin() 
  OR (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'seller'))
  OR (auth.uid() = ANY (assigned_users))
  OR (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'technician'))
);

-- Policy de IUD: apenas o seller dono, assigned users, technicians e admins podem modificar
CREATE POLICY "services_seller_iud" ON services
FOR ALL
USING (
  is_admin() 
  OR (client_id IN (SELECT clients.id FROM clients WHERE clients.seller_auth_id = auth.uid()))
  OR (auth.uid() = ANY (assigned_users))
  OR (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'technician'))
)
WITH CHECK (
  is_admin() 
  OR (client_id IN (SELECT clients.id FROM clients WHERE clients.seller_auth_id = auth.uid()))
  OR (auth.uid() = ANY (assigned_users))
  OR (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'technician'))
);

-- Atualizar policies de demonstrations para permitir que todos os sellers vejam
DROP POLICY IF EXISTS "demo_seller_view" ON demonstrations;
DROP POLICY IF EXISTS "demo_seller_insert" ON demonstrations;
DROP POLICY IF EXISTS "demo_seller_update" ON demonstrations;
DROP POLICY IF EXISTS "demo_seller_delete" ON demonstrations;

-- Policy de SELECT: todos os sellers e admins podem ver todas as demonstrações
CREATE POLICY "demo_seller_view" ON demonstrations
FOR SELECT
USING (
  is_admin()
  OR (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'seller'))
  OR (auth.uid() = ANY (assigned_users))
);

-- Policy de INSERT: apenas sellers com clientes próprios, assigned users e technicians
CREATE POLICY "demo_seller_insert" ON demonstrations
FOR INSERT
WITH CHECK (
  (client_id IN (SELECT c.id FROM clients c WHERE c.seller_auth_id = auth.uid()))
  OR (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'technician'))
);

-- Policy de UPDATE: apenas o seller dono, assigned users, technicians e admins
CREATE POLICY "demo_seller_update" ON demonstrations
FOR UPDATE
USING (
  (client_id IN (SELECT c.id FROM clients c WHERE c.seller_auth_id = auth.uid()))
  OR (auth.uid() = ANY (assigned_users))
  OR (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'technician'))
)
WITH CHECK (
  (client_id IN (SELECT c.id FROM clients c WHERE c.seller_auth_id = auth.uid()))
  OR (auth.uid() = ANY (assigned_users))
  OR (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'technician'))
);

-- Policy de DELETE: apenas o seller dono, technicians e admins
CREATE POLICY "demo_seller_delete" ON demonstrations
FOR DELETE
USING (
  (client_id IN (SELECT c.id FROM clients c WHERE c.seller_auth_id = auth.uid()))
  OR (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND users.role = 'technician'))
);

-- Atualizar policy de clients para permitir que todos os sellers vejam (apenas para leitura)
DROP POLICY IF EXISTS "clients_select" ON clients;

CREATE POLICY "clients_select" ON clients
FOR SELECT
USING (
  is_admin() 
  OR seller_auth_id = auth.uid() 
  OR owner_user_id = auth.uid() 
  OR (EXISTS (SELECT 1 FROM users WHERE users.auth_user_id = auth.uid() AND (users.role = 'technician' OR users.role = 'seller')))
);