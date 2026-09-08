CREATE TABLE IF NOT EXISTS app.habits (
  user_id uuid NOT NULL REFERENCES app.app_users(id) ON DELETE CASCADE,
  id text NOT NULL CHECK (id ~ '^[a-z0-9][a-z0-9_-]{0,79}$'),
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 48),
  category text NOT NULL CHECK (category IN ('health', 'exercise', 'sleep', 'food', 'study', 'mind', 'finance', 'fun', 'process')),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, id)
);
CREATE TABLE IF NOT EXISTS app.habit_checkins (
  user_id uuid NOT NULL,
  habit_id text NOT NULL,
  checkin_date date NOT NULL,
  status text NOT NULL CHECK (status IN ('done', 'skipped')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, habit_id, checkin_date),
  FOREIGN KEY (user_id, habit_id) REFERENCES app.habits(user_id, id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS app.habit_ignored_days (
  user_id uuid NOT NULL REFERENCES app.app_users(id) ON DELETE CASCADE,
  ignored_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, ignored_date)
);
CREATE INDEX IF NOT EXISTS habit_checkins_user_date_idx ON app.habit_checkins(user_id, checkin_date DESC);
