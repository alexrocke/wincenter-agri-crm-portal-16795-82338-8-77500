-- Drop and recreate clients policies to allow technicians to see all clients
DROP POLICY IF EXISTS "clients_select" ON public.clients;

CREATE POLICY "clients_select" 
ON public.clients 
FOR SELECT 
USING (
  is_admin() 
  OR seller_auth_id = auth.uid() 
  OR owner_user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid() 
    AND users.role = 'technician'
  )
);

-- Ensure sales policies restrict technicians to only their own sales
DROP POLICY IF EXISTS "sales_select" ON public.sales;

CREATE POLICY "sales_select" 
ON public.sales 
FOR SELECT 
USING (
  is_admin() 
  OR seller_auth_id = auth.uid()
);

-- Update services policy to ensure technicians can edit services they're assigned to
DROP POLICY IF EXISTS "services_seller_iud" ON public.services;

CREATE POLICY "services_seller_iud" 
ON public.services 
FOR ALL
USING (
  is_admin() 
  OR client_id IN (
    SELECT id FROM clients 
    WHERE seller_auth_id = auth.uid()
  ) 
  OR auth.uid() = ANY(assigned_users)
  OR EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid() 
    AND users.role = 'technician'
  )
)
WITH CHECK (
  is_admin() 
  OR client_id IN (
    SELECT id FROM clients 
    WHERE seller_auth_id = auth.uid()
  ) 
  OR auth.uid() = ANY(assigned_users)
  OR EXISTS (
    SELECT 1 FROM users 
    WHERE users.auth_user_id = auth.uid() 
    AND users.role = 'technician'
  )
);