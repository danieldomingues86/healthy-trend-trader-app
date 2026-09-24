CREATE TABLE IF NOT EXISTS app.asset_blacklist (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.app_users(id) ON DELETE CASCADE,
  market text NOT NULL,
  symbol text NOT NULL,
  name text NOT NULL DEFAULT '',
  reason text NOT NULL,
  category text NOT NULL,
  restriction_level text NOT NULL CHECK (restriction_level IN ('alert', 'block')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, symbol)
);
CREATE INDEX IF NOT EXISTS asset_blacklist_user_created_idx ON app.asset_blacklist(user_id, created_at DESC);
DROP TRIGGER IF EXISTS asset_blacklist_touch_updated_at ON app.asset_blacklist;
CREATE TRIGGER asset_blacklist_touch_updated_at BEFORE UPDATE ON app.asset_blacklist FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
