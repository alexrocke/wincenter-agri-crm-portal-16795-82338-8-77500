-- Adicionar campos de clima na tabela services
ALTER TABLE public.services 
ADD COLUMN IF NOT EXISTS weather_temperature numeric,
ADD COLUMN IF NOT EXISTS weather_humidity numeric,
ADD COLUMN IF NOT EXISTS weather_wind_speed numeric,
ADD COLUMN IF NOT EXISTS weather_description text,
ADD COLUMN IF NOT EXISTS weather_city text,
ADD COLUMN IF NOT EXISTS weather_fetched_at timestamp with time zone;