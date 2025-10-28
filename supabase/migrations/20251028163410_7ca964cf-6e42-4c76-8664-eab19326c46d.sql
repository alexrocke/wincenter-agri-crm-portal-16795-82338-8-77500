-- Adicionar campos para valores de pagamento na tabela sales
ALTER TABLE sales 
ADD COLUMN payment_value_1 NUMERIC,
ADD COLUMN payment_value_2 NUMERIC;

COMMENT ON COLUMN sales.payment_value_1 IS 'Valor pago na primeira forma de pagamento';
COMMENT ON COLUMN sales.payment_value_2 IS 'Valor pago na segunda forma de pagamento';