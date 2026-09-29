CREATE TABLE IF NOT EXISTS app.market_pauses (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.app_users(id) ON DELETE CASCADE,
  status text NOT NULL CHECK (status IN ('active', 'ended')),
  reason text NOT NULL,
  start_date date NOT NULL,
  expected_return_date date NOT NULL,
  notes text NOT NULL DEFAULT '',
  ended_at timestamptz,
  end_reflection text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS market_pauses_user_active_idx
  ON app.market_pauses(user_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS market_pauses_user_created_idx
  ON app.market_pauses(user_id, created_at DESC);

DROP TRIGGER IF EXISTS market_pauses_touch_updated_at ON app.market_pauses;
CREATE TRIGGER market_pauses_touch_updated_at
  BEFORE UPDATE ON app.market_pauses
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
