CREATE TABLE IF NOT EXISTS app.risk_policies (
  user_id uuid PRIMARY KEY REFERENCES app.app_users(id) ON DELETE CASCADE,
  policy jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS risk_policies_touch_updated_at ON app.risk_policies;
CREATE TRIGGER risk_policies_touch_updated_at
  BEFORE UPDATE ON app.risk_policies
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
