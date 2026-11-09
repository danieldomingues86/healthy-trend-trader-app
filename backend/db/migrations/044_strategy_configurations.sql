-- Migration 044: Strategy Configuration Center — Perfis, Parâmetros e Versionamento por Estratégia
-- Cria a tabela app.strategy_configurations para gerenciar perfis independentes com versionamento e snapshots imutáveis.

DO $$
BEGIN
  CREATE TABLE IF NOT EXISTS app.strategy_configurations (
    id uuid PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES app.app_users(id) ON DELETE CASCADE,
    strategy_type text NOT NULL CHECK (strategy_type IN ('TREND_FOLLOWING', 'VOLATILITY_TRADING')),
    name text NOT NULL CHECK (char_length(name) BETWEEN 2 AND 120),
    description text NOT NULL DEFAULT '',
    version text NOT NULL DEFAULT '1.0',
    is_active boolean NOT NULL DEFAULT false,
    status text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    parameters jsonb NOT NULL,
    parameters_hash text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
  );

  -- Índices otimizados para busca de perfil ativo, histórico e listagem por estratégia
  CREATE INDEX IF NOT EXISTS idx_strategy_configs_user_strat
    ON app.strategy_configurations (user_id, strategy_type, is_active);

  CREATE INDEX IF NOT EXISTS idx_strategy_configs_user_status
    ON app.strategy_configurations (user_id, status);

  CREATE INDEX IF NOT EXISTS idx_strategy_configs_hash
    ON app.strategy_configurations (user_id, parameters_hash);

  -- Trigger para atualização automática de updated_at
  DROP TRIGGER IF EXISTS strategy_configurations_touch_updated_at ON app.strategy_configurations;
  CREATE TRIGGER strategy_configurations_touch_updated_at
    BEFORE UPDATE ON app.strategy_configurations
    FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

  -- Estender app.trade_simulations e app.trades com snapshot imutável e hash de parâmetros
  ALTER TABLE app.trade_simulations
    ADD COLUMN IF NOT EXISTS strategy_parameters_snapshot jsonb,
    ADD COLUMN IF NOT EXISTS strategy_parameters_hash text;

  ALTER TABLE app.trades
    ADD COLUMN IF NOT EXISTS strategy_parameters_snapshot jsonb,
    ADD COLUMN IF NOT EXISTS strategy_parameters_hash text;

END $$;
