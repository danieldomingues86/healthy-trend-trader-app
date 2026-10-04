-- Simulador de Trades: Simulações virtuais autônomas e independentes
-- de trades reais. Permite acompanhar oportunidades sem afetar diário real.
CREATE TABLE IF NOT EXISTS app.trade_simulations (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.app_users(id) ON DELETE CASCADE,
  symbol text NOT NULL CHECK (char_length(symbol) BETWEEN 1 AND 20),
  company_name text NOT NULL DEFAULT '',
  trigger_name text NOT NULL CHECK (char_length(trigger_name) BETWEEN 1 AND 100),
  grade text NOT NULL DEFAULT '',
  sector text NOT NULL DEFAULT '',
  signal_date date NOT NULL,
  entry_price numeric(12,4) NOT NULL CHECK (entry_price > 0),
  stop_loss numeric(12,4) NOT NULL CHECK (stop_loss > 0),
  status text NOT NULL DEFAULT 'WAITING_ENTRY' CHECK (status IN ('WAITING_ENTRY', 'IN_OPERATION', 'CLOSED_GAIN', 'CLOSED_LOSS', 'NOT_TRIGGERED')),
  executed_entry_price numeric(12,4),
  entry_date date,
  current_stop numeric(12,4),
  current_price numeric(12,4),
  exit_price numeric(12,4),
  exit_date date,
  exit_reason text,
  result_r numeric(8,2),
  mfe_r numeric(8,2),
  mae_r numeric(8,2),
  timeline jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trade_simulations_user_idx
  ON app.trade_simulations(user_id, signal_date DESC);

CREATE INDEX IF NOT EXISTS trade_simulations_user_status_idx
  ON app.trade_simulations(user_id, status);

DROP TRIGGER IF EXISTS trade_simulations_touch_updated_at ON app.trade_simulations;
CREATE TRIGGER trade_simulations_touch_updated_at
  BEFORE UPDATE ON app.trade_simulations
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
