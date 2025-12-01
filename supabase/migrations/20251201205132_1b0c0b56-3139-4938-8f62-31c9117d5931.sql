-- Cron job para verificar reservas expiradas diariamente às 3h
SELECT cron.schedule(
  'check-expired-reservations',
  '0 3 * * *',
  $$
  SELECT net.http_post(
    url := 'https://hlyhgpjzosnxaxgpcayi.supabase.co/functions/v1/check-expired-reservations',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhseWhncGp6b3NueGF4Z3BjYXlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NzE5NzMsImV4cCI6MjA3NTM0Nzk3M30.vkyUw_MTEbWRCjJ0YQHOaBQZYJR6n4zWgzjua3jmb5Y"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);

-- Tabela para conquistas/badges da gamificação
CREATE TABLE IF NOT EXISTS public.achievements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_auth_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  achievement_type TEXT NOT NULL,
  earned_at TIMESTAMPTZ DEFAULT now(),
  period_ym TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_achievements_seller ON public.achievements(seller_auth_id);
CREATE INDEX IF NOT EXISTS idx_achievements_period ON public.achievements(period_ym);
CREATE INDEX IF NOT EXISTS idx_achievements_type ON public.achievements(achievement_type);

-- RLS Policies para achievements
ALTER TABLE public.achievements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas próprias conquistas"
  ON public.achievements
  FOR SELECT
  USING (auth.uid() = seller_auth_id);

CREATE POLICY "Admins podem ver todas as conquistas"
  ON public.achievements
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE auth_user_id = auth.uid()
      AND role = 'admin'
    )
  );

CREATE POLICY "Sistema pode inserir conquistas"
  ON public.achievements
  FOR INSERT
  WITH CHECK (true);

-- Cron job para follow-up automático diariamente às 8h
SELECT cron.schedule(
  'auto-followup',
  '0 8 * * *',
  $$
  SELECT net.http_post(
    url := 'https://hlyhgpjzosnxaxgpcayi.supabase.co/functions/v1/auto-followup',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhseWhncGp6b3NueGF4Z3BjYXlpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk3NzE5NzMsImV4cCI6MjA3NTM0Nzk3M30.vkyUw_MTEbWRCjJ0YQHOaBQZYJR6n4zWgzjua3jmb5Y"}'::jsonb,
    body := '{}'::jsonb
  )
  $$
);