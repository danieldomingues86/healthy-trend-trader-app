CREATE SCHEMA IF NOT EXISTS app;

CREATE TABLE IF NOT EXISTS app.app_users (
  id uuid PRIMARY KEY,
  email text NOT NULL UNIQUE,
  password_hash text NOT NULL,
  display_name text NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin', 'member')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app.app_sessions (
  token_hash text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.app_users(id) ON DELETE CASCADE,
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS app_sessions_user_id_idx ON app.app_sessions(user_id);

CREATE TABLE IF NOT EXISTS app.trades (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.app_users(id) ON DELETE CASCADE,
  ticker text NOT NULL,
  market text,
  direction text,
  setup text,
  entry_price numeric,
  stop_price numeric,
  atr numeric,
  planned_quantity numeric,
  risk_pct numeric,
  rubric_score numeric,
  rubric_max_score numeric,
  rubric_grade text,
  rubric_responses jsonb NOT NULL DEFAULT '{}'::jsonb,
  status text NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'open', 'closed', 'cancelled')),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS trades_user_created_idx ON app.trades(user_id, created_at DESC);

CREATE TABLE IF NOT EXISTS app.trade_rubric_ratings (
  id uuid PRIMARY KEY,
  trade_id uuid NOT NULL REFERENCES app.trades(id) ON DELETE CASCADE,
  criterion_key text NOT NULL,
  selected_rating text NOT NULL CHECK (selected_rating IN ('bad', 'medium', 'good')),
  score numeric NOT NULL,
  max_score numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(trade_id, criterion_key)
);

CREATE TABLE IF NOT EXISTS app.fundamental_analyses (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.app_users(id) ON DELETE CASCADE,
  ticker text NOT NULL,
  provider text NOT NULL,
  score numeric,
  classification text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  analyzed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS fundamental_analyses_user_ticker_idx ON app.fundamental_analyses(user_id, ticker, analyzed_at DESC);

CREATE TABLE IF NOT EXISTS app.watchlist_items (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.app_users(id) ON DELETE CASCADE,
  ticker text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, ticker)
);

CREATE OR REPLACE FUNCTION app.touch_updated_at() RETURNS trigger AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS app_users_touch_updated_at ON app.app_users;
CREATE TRIGGER app_users_touch_updated_at BEFORE UPDATE ON app.app_users FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
DROP TRIGGER IF EXISTS trades_touch_updated_at ON app.trades;
CREATE TRIGGER trades_touch_updated_at BEFORE UPDATE ON app.trades FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
