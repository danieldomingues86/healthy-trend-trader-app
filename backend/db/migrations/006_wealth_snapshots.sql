CREATE TABLE IF NOT EXISTS app.wealth_snapshots (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.app_users(id) ON DELETE CASCADE,
  snapshot_type text NOT NULL CHECK (snapshot_type IN ('strategy_equity', 'real_wealth')),
  amount numeric NOT NULL,
  occurred_at date NOT NULL,
  source text NOT NULL DEFAULT 'manual',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, snapshot_type, occurred_at)
);
CREATE INDEX IF NOT EXISTS wealth_snapshots_user_type_date_idx ON app.wealth_snapshots(user_id, snapshot_type, occurred_at DESC);

CREATE TABLE IF NOT EXISTS app.wealth_settings (
  user_id uuid PRIMARY KEY REFERENCES app.app_users(id) ON DELETE CASCADE,
  strategy_base numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);
DROP TRIGGER IF EXISTS wealth_settings_touch_updated_at ON app.wealth_settings;
CREATE TRIGGER wealth_settings_touch_updated_at BEFORE UPDATE ON app.wealth_settings FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
