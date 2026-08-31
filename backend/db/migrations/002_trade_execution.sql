ALTER TABLE app.trades
  ADD COLUMN IF NOT EXISTS execution_price numeric,
  ADD COLUMN IF NOT EXISTS executed_quantity numeric,
  ADD COLUMN IF NOT EXISTS executed_at timestamptz;

CREATE INDEX IF NOT EXISTS trades_user_status_idx ON app.trades(user_id, status, created_at DESC);
