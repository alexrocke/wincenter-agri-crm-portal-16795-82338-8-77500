-- Adicionar coluna para desconto final percentual nas vendas
ALTER TABLE public.sales 
ADD COLUMN final_discount_percent numeric DEFAULT 0;

COMMENT ON COLUMN public.sales.final_discount_percent IS 'Desconto percentual aplicado sobre o valor total da venda';