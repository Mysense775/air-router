-- Полная миграция: корректируем расчеты и балансы к новой схеме (price_per_token)
BEGIN;

-- 1) Привести все cost поля в request_logs к корректной шкале: умножение на 1000
UPDATE request_logs
SET
  cost_to_client_usd = COALESCE(cost_to_client_usd, 0) * 1000,
  cost_to_us_usd = COALESCE(cost_to_us_usd, 0) * 1000,
  openrouter_cost_usd = COALESCE(openrouter_cost_usd, 0) * 1000,
  profit_usd = COALESCE(profit_usd, 0) * 1000;

-- 2) Пересчитать lifetime_spent per user на балансе, как сумма cost_to_client_usd
UPDATE balances b
SET lifetime_spent = COALESCE((SELECT SUM(rl.cost_to_client_usd) FROM request_logs rl WHERE rl.user_id = b.user_id), 0);

-- 3) Пересчитать lifetime_savings per user: SUM(openrouter_cost_usd - cost_to_client_usd) при >0
UPDATE balances b
SET lifetime_savings = COALESCE((SELECT SUM(LEAST(openrouter_cost_usd - cost_to_client_usd, 0) * 0 + GREATEST(openrouter_cost_usd - cost_to_client_usd, 0) FROM request_logs rl WHERE rl.user_id = b.user_id), 0);

-- 4) (Опционально): синхронизация master_accounts balance — по факту стоит пересчитать по logs
-- Пример: начисления по master_account_id равняются сумме cost_to_us_usd по логам
UPDATE master_accounts ma
SET balance_usd = ma.balance_usd - (SELECT COALESCE(SUM(rl.cost_to_us_usd), 0) FROM request_logs rl WHERE rl.master_account_id = ma.id);

COMMIT;
