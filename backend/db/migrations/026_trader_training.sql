-- Treinamento de Trader: um objetivo comportamental ativo por usuário e
-- registros de comportamento vinculados às operações do Diário.
CREATE TABLE IF NOT EXISTS app.trader_training_goals (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.app_users(id) ON DELETE CASCADE,
  catalog_id text NOT NULL DEFAULT '',
  title text NOT NULL CHECK (char_length(title) BETWEEN 3 AND 160),
  category text NOT NULL CHECK (category IN ('execution', 'psychology', 'process', 'risk')),
  start_date date NOT NULL,
  end_date date NOT NULL,
  duration_days integer NOT NULL CHECK (duration_days BETWEEN 1 AND 365),
  target_pct integer NOT NULL CHECK (target_pct BETWEEN 1 AND 100),
  status text NOT NULL CHECK (status IN ('active', 'consolidated', 'developing', 'switched')),
  final_adherence numeric(5,2),
  extensions integer NOT NULL DEFAULT 0,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date >= start_date)
);

CREATE UNIQUE INDEX IF NOT EXISTS trader_training_goals_user_active_idx
  ON app.trader_training_goals(user_id)
  WHERE status = 'active';

CREATE INDEX IF NOT EXISTS trader_training_goals_user_created_idx
  ON app.trader_training_goals(user_id, created_at DESC);

DROP TRIGGER IF EXISTS trader_training_goals_touch_updated_at ON app.trader_training_goals;
CREATE TRIGGER trader_training_goals_touch_updated_at
  BEFORE UPDATE ON app.trader_training_goals
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();

CREATE TABLE IF NOT EXISTS app.trader_training_records (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.app_users(id) ON DELETE CASCADE,
  goal_id uuid NOT NULL REFERENCES app.trader_training_goals(id) ON DELETE CASCADE,
  source_ref text NOT NULL CHECK (char_length(source_ref) BETWEEN 1 AND 120),
  record_date date NOT NULL,
  ticker text NOT NULL DEFAULT '',
  outcome text NOT NULL DEFAULT 'open' CHECK (outcome IN ('gain', 'loss', 'breakeven', 'open')),
  r_multiple numeric(8,2),
  assessment text NOT NULL CHECK (assessment IN ('correct', 'incorrect', 'not_applicable')),
  note text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, goal_id, source_ref)
);

CREATE INDEX IF NOT EXISTS trader_training_records_goal_idx
  ON app.trader_training_records(user_id, goal_id, record_date);

DROP TRIGGER IF EXISTS trader_training_records_touch_updated_at ON app.trader_training_records;
CREATE TRIGGER trader_training_records_touch_updated_at
  BEFORE UPDATE ON app.trader_training_records
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
