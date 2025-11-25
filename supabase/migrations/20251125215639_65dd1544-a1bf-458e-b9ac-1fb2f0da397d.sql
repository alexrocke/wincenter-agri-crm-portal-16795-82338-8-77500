-- Adicionar campos de forma de pagamento e parcelamento à tabela opportunities

ALTER TABLE opportunities 
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS card_brand TEXT,
ADD COLUMN IF NOT EXISTS installments INTEGER,
ADD COLUMN IF NOT EXISTS installment_fee NUMERIC,
ADD COLUMN IF NOT EXISTS final_value_with_fee NUMERIC;

-- Comentários explicativos
COMMENT ON COLUMN opportunities.payment_method IS 'Forma de pagamento: PIX, DINHEIRO, CARTAO_DEBITO, CARTAO_CREDITO, BOLETO, A_COMBINAR';
COMMENT ON COLUMN opportunities.card_brand IS 'Bandeira do cartão: MASTER/VISA ou ELO/OUTROS';
COMMENT ON COLUMN opportunities.installments IS 'Número de parcelas (1 a 18)';
COMMENT ON COLUMN opportunities.installment_fee IS 'Percentual de taxa aplicada';
COMMENT ON COLUMN opportunities.final_value_with_fee IS 'Valor final com a taxa incluída';