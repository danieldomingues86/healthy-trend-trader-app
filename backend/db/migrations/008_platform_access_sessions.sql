CREATE TABLE IF NOT EXISTS app.platform_access_sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.app_users(id) ON DELETE CASCADE,
  app_version text,
  opened_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  closed_at timestamptz,
  duration_seconds integer,
  CHECK (duration_seconds IS NULL OR duration_seconds >= 0)
);

CREATE INDEX IF NOT EXISTS platform_access_sessions_user_opened_idx
  ON app.platform_access_sessions(user_id, opened_at DESC);
CREATE INDEX IF NOT EXISTS platform_access_sessions_active_idx
  ON app.platform_access_sessions(user_id) WHERE closed_at IS NULL;

CREATE TABLE IF NOT EXISTS app.platform_access_preferences (
  user_id uuid PRIMARY KEY REFERENCES app.app_users(id) ON DELETE CASCADE,
  preferences jsonb NOT NULL DEFAULT '{"countOpenings": true, "trackDuration": true, "trackWindowEvents": false}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS platform_access_preferences_touch_updated_at ON app.platform_access_preferences;
CREATE TRIGGER platform_access_preferences_touch_updated_at
  BEFORE UPDATE ON app.platform_access_preferences
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TABLE IF NOT EXISTS app.platform_access_events (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.app_users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES app.platform_access_sessions(id) ON DELETE SET NULL,
  event_type text NOT NULL CHECK (event_type IN ('opened', 'minimized', 'restored', 'maximized', 'normal', 'closed')),
  occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS platform_access_events_user_occurred_idx ON app.platform_access_events(user_id, occurred_at DESC);
