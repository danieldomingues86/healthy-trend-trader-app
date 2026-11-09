-- PASSO 7 — Dual Trade Simulator: Tabela de Experimentos e Simulações de Volatilidade
-- Permite armazenar execuções de simulações, parâmetros, metadados e métricas comparativas
-- do motor de Volatility Trading de forma isolada do Trend Following.

CREATE TABLE IF NOT EXISTS app.volatility_simulation_experiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES app.app_users(id) ON DELETE CASCADE,
  name text NOT NULL,
  strategy_type text NOT NULL DEFAULT 'VOLATILITY_TRADING',
  simulator_version text NOT NULL DEFAULT 'volatility-sim-v1.0',
  universe text NOT NULL DEFAULT 'IBOV',
  market text NOT NULL DEFAULT 'B3',
  period_label text NOT NULL DEFAULT '120',
  start_date date,
  end_date date,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  config_hash text,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  trades_count integer NOT NULL DEFAULT 0,
  win_rate numeric(6,2),
  profit_factor numeric(8,2),
  expectancy_pct numeric(6,2),
  net_profit numeric(14,2),
  max_drawdown_pct numeric(6,2),
  trades jsonb NOT NULL DEFAULT '[]'::jsonb,
  equity_curve jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS volatility_sim_experiments_user_idx
  ON app.volatility_simulation_experiments(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS volatility_sim_experiments_strategy_idx
  ON app.volatility_simulation_experiments(strategy_type, universe);

DROP TRIGGER IF EXISTS volatility_sim_experiments_touch_updated_at ON app.volatility_simulation_experiments;
CREATE TRIGGER volatility_sim_experiments_touch_updated_at
  BEFORE UPDATE ON app.volatility_simulation_experiments
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
