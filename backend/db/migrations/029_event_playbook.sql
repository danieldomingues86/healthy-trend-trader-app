-- Migration 029: Event Playbook & Central de Mercado Shared Events
-- Cria a tabela app.event_playbook compartilhada entre a Central de Mercado e a biblioteca Event Playbook.

CREATE TABLE IF NOT EXISTS app.event_playbook (
  id text PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.app_users(id) ON DELETE CASCADE,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 200),
  event_date date NOT NULL,
  event_time text NOT NULL DEFAULT '10:00',
  timezone text NOT NULL DEFAULT 'America/Sao_Paulo',
  category text NOT NULL DEFAULT 'Macro',
  impact integer NOT NULL DEFAULT 3 CHECK (impact BETWEEN 1 AND 5),
  impact_level text NOT NULL DEFAULT 'MÉDIO',
  country text NOT NULL DEFAULT 'Brasil',
  related_assets text NOT NULL DEFAULT '',
  affected_assets text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  what_happened text NOT NULL DEFAULT '',
  market_reaction text NOT NULL DEFAULT '',
  volatility_behavior text NOT NULL DEFAULT '',
  initial_direction text NOT NULL DEFAULT 'Neutra',
  gap text NOT NULL DEFAULT '',
  volume text NOT NULL DEFAULT '',
  atr text NOT NULL DEFAULT '',
  impact_duration text NOT NULL DEFAULT '',
  trading_implications text NOT NULL DEFAULT '',
  lessons_learned text NOT NULL DEFAULT '',
  cover_image text NOT NULL DEFAULT '',
  tags jsonb NOT NULL DEFAULT '[]'::jsonb,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  screenshots jsonb NOT NULL DEFAULT '[]'::jsonb,
  source text NOT NULL DEFAULT 'Manual (Usuário)',
  notes text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS event_playbook_user_date_idx
  ON app.event_playbook(user_id, event_date DESC);

CREATE INDEX IF NOT EXISTS event_playbook_user_category_idx
  ON app.event_playbook(user_id, category);

CREATE INDEX IF NOT EXISTS event_playbook_user_impact_idx
  ON app.event_playbook(user_id, impact DESC);

DROP TRIGGER IF EXISTS event_playbook_touch_updated_at ON app.event_playbook;
CREATE TRIGGER event_playbook_touch_updated_at
  BEFORE UPDATE ON app.event_playbook
  FOR EACH ROW EXECUTE FUNCTION app.touch_updated_at();
