-- Criar bucket para arquivos de suporte técnico
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'technical-support',
  'technical-support',
  true,
  52428800, -- 50MB
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'video/mp4', 'video/quicktime', 'video/x-msvideo', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Políticas de acesso ao bucket
CREATE POLICY "Usuários podem visualizar arquivos de suporte técnico"
ON storage.objects FOR SELECT
USING (bucket_id = 'technical-support');

CREATE POLICY "Usuários podem fazer upload de arquivos de suporte técnico"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'technical-support' AND auth.uid() IS NOT NULL);

CREATE POLICY "Usuários podem deletar seus próprios arquivos"
ON storage.objects FOR DELETE
USING (bucket_id = 'technical-support' AND auth.uid() IS NOT NULL);

-- Criar tabela para relacionar arquivos com serviços
CREATE TABLE IF NOT EXISTS public.service_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  service_id UUID NOT NULL REFERENCES public.services(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.service_files ENABLE ROW LEVEL SECURITY;

-- Políticas para visualizar arquivos
CREATE POLICY "Usuários podem visualizar arquivos de serviços"
ON public.service_files FOR SELECT
USING (true);

-- Políticas para inserir arquivos
CREATE POLICY "Usuários podem inserir arquivos em serviços"
ON public.service_files FOR INSERT
WITH CHECK (auth.uid() = uploaded_by);

-- Políticas para deletar arquivos
CREATE POLICY "Usuários podem deletar seus próprios arquivos"
ON public.service_files FOR DELETE
USING (auth.uid() = uploaded_by);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_service_files_service_id ON public.service_files(service_id);
CREATE INDEX IF NOT EXISTS idx_service_files_uploaded_by ON public.service_files(uploaded_by);