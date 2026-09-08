CREATE TABLE IF NOT EXISTS app.zen_practice_sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.app_users(id) ON DELETE CASCADE,
  practice_id text NOT NULL,
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  CHECK (completed_at IS NULL OR completed_at >= started_at)
);

CREATE INDEX IF NOT EXISTS zen_practice_sessions_user_started_idx
  ON app.zen_practice_sessions(user_id, started_at DESC);
