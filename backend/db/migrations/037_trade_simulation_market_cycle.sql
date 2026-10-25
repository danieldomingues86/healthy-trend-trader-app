-- Migration 037: Armazena o ciclo de mercado histórico e metadados de permissão na simulação
-- Garante rastreabilidade operacional do ambiente de mercado na data do sinal.

ALTER TABLE app.trade_simulations
  ADD COLUMN IF NOT EXISTS market_cycle text NOT NULL DEFAULT 'Positivo',
  ADD COLUMN IF NOT EXISTS market_permission jsonb;

CREATE INDEX IF NOT EXISTS trade_simulations_user_market_cycle_idx
  ON app.trade_simulations(user_id, market_cycle);
