-- Rollback Migration 044: Strategy Configuration Center
-- Remove trigger, índices, tabela app.strategy_configurations e colunas de snapshot

DO $$
BEGIN
  DROP TRIGGER IF EXISTS strategy_configurations_touch_updated_at ON app.strategy_configurations;
  DROP INDEX IF EXISTS app.idx_strategy_configs_user_strat;
  DROP INDEX IF EXISTS app.idx_strategy_configs_user_status;
  DROP INDEX IF EXISTS app.idx_strategy_configs_hash;
  DROP TABLE IF EXISTS app.strategy_configurations;

  ALTER TABLE app.trade_simulations
    DROP COLUMN IF EXISTS strategy_parameters_snapshot,
    DROP COLUMN IF EXISTS strategy_parameters_hash;

  ALTER TABLE app.trades
    DROP COLUMN IF EXISTS strategy_parameters_snapshot,
    DROP COLUMN IF EXISTS strategy_parameters_hash;
END $$;
