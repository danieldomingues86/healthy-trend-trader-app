-- Migration 043: Dual Strategy Architecture — Identificação de Estratégia em Trades e Simulações
-- Classifica 100% do histórico pré-existente como TREND_FOLLOWING e adiciona colunas de rastreamento de configuração e versão.

DO $$
BEGIN
  -- 1. Estender app.trades com colunas de identificação de estratégia
  ALTER TABLE app.trades
    ADD COLUMN IF NOT EXISTS strategy_type text DEFAULT 'TREND_FOLLOWING',
    ADD COLUMN IF NOT EXISTS strategy_config_id text,
    ADD COLUMN IF NOT EXISTS strategy_config_version text,
    ADD COLUMN IF NOT EXISTS entry_setup text,
    ADD COLUMN IF NOT EXISTS exit_reason text,
    ADD COLUMN IF NOT EXISTS rubric_version text DEFAULT '2';

  -- 2. Restrição CHECK em strategy_type garantindo valores canônicos (maiúsculas e minúsculas)
  ALTER TABLE app.trades DROP CONSTRAINT IF EXISTS trades_strategy_type_check;
  ALTER TABLE app.trades ADD CONSTRAINT trades_strategy_type_check
    CHECK (strategy_type IN ('TREND_FOLLOWING', 'VOLATILITY_TRADING', 'trend_following', 'volatility_trading'));

  -- 3. Índices para consultas e relatórios filtrados por estratégia
  CREATE INDEX IF NOT EXISTS idx_trades_user_strategy
    ON app.trades (user_id, strategy_type, created_at DESC);

  CREATE INDEX IF NOT EXISTS idx_trades_strategy_status
    ON app.trades (strategy_type, status);

  -- 4. Backfill idempotente dos dados históricos em app.trades
  -- Todos os trades históricos sem estratégia explícita são classificados como TREND_FOLLOWING
  UPDATE app.trades
    SET strategy_type = 'TREND_FOLLOWING'
    WHERE strategy_type IS NULL OR strategy_type = '';

  -- Garantir NOT NULL após backfill para assegurar obrigatoriedade em novos registros
  ALTER TABLE app.trades ALTER COLUMN strategy_type SET NOT NULL;

  -- Preencher entry_setup a partir de setup_trigger ou setup existente
  UPDATE app.trades
    SET entry_setup = COALESCE(setup_trigger, setup, 'MANUAL')
    WHERE entry_setup IS NULL;

  -- Preencher rubric_version a partir do metadata ou padrão 2
  UPDATE app.trades
    SET rubric_version = COALESCE(metadata->>'gradingVersion', '2')
    WHERE rubric_version IS NULL;

  -- Preencher exit_reason para trades encerrados a partir dos eventos de fechamento
  UPDATE app.trades t
    SET exit_reason = COALESCE(
      t.metadata->>'exitReason',
      (
        SELECT COALESCE(e.context->>'exitReason', NULLIF(e.note, ''))
        FROM app.trade_events e
        WHERE e.trade_id = t.id AND e.event_type = 'close'
        ORDER BY e.occurred_at DESC LIMIT 1
      )
    )
    WHERE t.status = 'closed' AND t.exit_reason IS NULL;

  -- 5. Estender app.trade_simulations para suporte multi-estratégia
  ALTER TABLE app.trade_simulations
    ADD COLUMN IF NOT EXISTS strategy_type text DEFAULT 'TREND_FOLLOWING',
    ADD COLUMN IF NOT EXISTS strategy_config_id text,
    ADD COLUMN IF NOT EXISTS strategy_config_version text,
    ADD COLUMN IF NOT EXISTS entry_setup text,
    ADD COLUMN IF NOT EXISTS rubric_version text DEFAULT '2';

  ALTER TABLE app.trade_simulations DROP CONSTRAINT IF EXISTS trade_simulations_strategy_type_check;
  ALTER TABLE app.trade_simulations ADD CONSTRAINT trade_simulations_strategy_type_check
    CHECK (strategy_type IN ('TREND_FOLLOWING', 'VOLATILITY_TRADING', 'trend_following', 'volatility_trading'));

  CREATE INDEX IF NOT EXISTS idx_simulations_user_strategy
    ON app.trade_simulations (user_id, strategy_type, signal_date DESC);

  UPDATE app.trade_simulations
    SET strategy_type = 'TREND_FOLLOWING'
    WHERE strategy_type IS NULL OR strategy_type = '';

  ALTER TABLE app.trade_simulations ALTER COLUMN strategy_type SET NOT NULL;

  UPDATE app.trade_simulations
    SET entry_setup = trigger_name
    WHERE entry_setup IS NULL;

END $$;
