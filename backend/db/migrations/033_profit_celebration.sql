-- Profit Celebration: Catálogo de recompensas, conquistas e recompensas especiais
CREATE TABLE IF NOT EXISTS app.rewards_catalog (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.app_users(id) ON DELETE CASCADE,
  title text NOT NULL CHECK (char_length(title) BETWEEN 2 AND 120),
  category text NOT NULL CHECK (category IN ('lazer', 'gastronomia', 'bem-estar', 'outras')),
  icon text NOT NULL DEFAULT '🎁',
  description text NOT NULL DEFAULT '',
  image_url text,
  is_default boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rewards_catalog_user_idx ON app.rewards_catalog(user_id, created_at ASC);

CREATE TABLE IF NOT EXISTS app.profit_conquests (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.app_users(id) ON DELETE CASCADE,
  trade_id uuid REFERENCES app.trades(id) ON DELETE SET NULL,
  event_id uuid REFERENCES app.trade_events(id) ON DELETE SET NULL,
  ticker text NOT NULL,
  direction text NOT NULL DEFAULT 'long',
  realized_amount numeric(12,2) NOT NULL,
  r_multiple numeric(8,2),
  target_reached boolean NOT NULL DEFAULT false,
  plan_adhered text NOT NULL CHECK (plan_adhered IN ('yes', 'partial', 'no')),
  feeling text NOT NULL CHECK (feeling IN ('pride', 'relief', 'greed_urge')),
  reward_id uuid REFERENCES app.rewards_catalog(id) ON DELETE SET NULL,
  reward_title text NOT NULL,
  reward_category text NOT NULL DEFAULT 'outras',
  reward_icon text NOT NULL DEFAULT '🎁',
  reward_reason text NOT NULL DEFAULT '',
  reward_status text NOT NULL DEFAULT 'pending' CHECK (reward_status IN ('pending', 'completed')),
  reward_completed_at timestamptz,
  entry_price numeric(12,4),
  exit_price numeric(12,4),
  initial_stop numeric(12,4),
  risk_amount numeric(12,2),
  conquest_date date NOT NULL DEFAULT CURRENT_DATE,
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT profit_conquests_user_trade_event_unique UNIQUE (user_id, trade_id, event_id)
);

CREATE INDEX IF NOT EXISTS profit_conquests_user_date_idx ON app.profit_conquests(user_id, conquest_date DESC, created_at DESC);

CREATE TABLE IF NOT EXISTS app.profit_special_reward (
  user_id uuid PRIMARY KEY REFERENCES app.app_users(id) ON DELETE CASCADE,
  title text NOT NULL,
  target_conquests integer NOT NULL DEFAULT 20 CHECK (target_conquests > 0),
  description text NOT NULL DEFAULT '',
  image_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
