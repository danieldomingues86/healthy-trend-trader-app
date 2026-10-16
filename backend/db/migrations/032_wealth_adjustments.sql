CREATE TABLE IF NOT EXISTS app.wealth_adjustments (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.app_users(id) ON DELETE CASCADE,
  previous_amount numeric NOT NULL,
  new_amount numeric NOT NULL CHECK (new_amount > 0),
  reason text NOT NULL DEFAULT '',
  adjusted_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wealth_adjustments_user_idx ON app.wealth_adjustments(user_id, adjusted_at DESC);
