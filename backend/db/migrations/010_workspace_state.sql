CREATE TABLE IF NOT EXISTS app.workspace_state (
  user_id uuid PRIMARY KEY REFERENCES app.app_users(id) ON DELETE CASCADE,
  state jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS workspace_state_touch_updated_at ON app.workspace_state;
CREATE TRIGGER workspace_state_touch_updated_at
  BEFORE UPDATE ON app.workspace_state
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TABLE IF NOT EXISTS app.material_entitlements (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.app_users(id) ON DELETE CASCADE,
  material_id text NOT NULL,
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'purchase', 'migration')),
  acquired_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, material_id)
);
CREATE INDEX IF NOT EXISTS material_entitlements_user_acquired_idx
  ON app.material_entitlements(user_id, acquired_at DESC);
