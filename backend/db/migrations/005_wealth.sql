CREATE TABLE IF NOT EXISTS app.wealth_movements (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.app_users(id) ON DELETE CASCADE,
  movement_type text NOT NULL CHECK (movement_type IN ('deposit', 'withdrawal')),
  amount numeric NOT NULL CHECK (amount > 0),
  occurred_at timestamptz NOT NULL DEFAULT now(),
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wealth_movements_user_occurred_idx ON app.wealth_movements(user_id, occurred_at DESC);

CREATE TABLE IF NOT EXISTS app.wealth_allocations (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.app_users(id) ON DELETE CASCADE,
  label text NOT NULL,
  asset_class text NOT NULL,
  amount numeric NOT NULL CHECK (amount >= 0),
  target_pct numeric CHECK (target_pct >= 0 AND target_pct <= 100),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS wealth_allocations_user_sort_idx ON app.wealth_allocations(user_id, sort_order, created_at);
DROP TRIGGER IF EXISTS wealth_allocations_touch_updated_at ON app.wealth_allocations;
CREATE TRIGGER wealth_allocations_touch_updated_at BEFORE UPDATE ON app.wealth_allocations FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
