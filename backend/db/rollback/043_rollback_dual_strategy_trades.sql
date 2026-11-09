-- Rollback Migration 043: Dual Strategy Architecture
-- Remove restrições, índices e colunas adicionadas em app.trades e app.trade_simulations

DO $$
BEGIN
  DROP INDEX IF EXISTS app.idx_trades_user_strategy;
  DROP INDEX IF EXISTS app.idx_trades_strategy_status;
  DROP INDEX IF EXISTS app.idx_simulations_user_strategy;

  ALTER TABLE app.trades DROP CONSTRAINT IF EXISTS trades_strategy_type_check;
  ALTER TABLE app.trade_simulations DROP CONSTRAINT IF EXISTS trade_simulations_strategy_type_check;

  ALTER TABLE app.trades
    DROP COLUMN IF EXISTS strategy_type,
    DROP COLUMN IF EXISTS strategy_config_id,
    DROP COLUMN IF EXISTS strategy_config_version,
    DROP COLUMN IF EXISTS entry_setup,
    DROP COLUMN IF EXISTS exit_reason,
    DROP COLUMN IF EXISTS rubric_version;

  ALTER TABLE app.trade_simulations
    DROP COLUMN IF EXISTS strategy_type,
    DROP COLUMN IF EXISTS strategy_config_id,
    DROP COLUMN IF EXISTS strategy_config_version,
    DROP COLUMN IF EXISTS entry_setup,
    DROP COLUMN IF EXISTS rubric_version;
END $$;
