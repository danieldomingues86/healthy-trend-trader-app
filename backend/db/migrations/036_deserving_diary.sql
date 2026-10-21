-- 036_deserving_diary.sql
-- Diário do Merecimento: Registro e reflexão psicológica ao embolsar lucros

CREATE TABLE IF NOT EXISTS app.deserving_diary (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.app_users(id) ON DELETE CASCADE,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  entry_time time,
  trade_id uuid REFERENCES app.trades(id) ON DELETE SET NULL,
  ticker text NOT NULL DEFAULT '',
  result_type text NOT NULL DEFAULT 'target_reached',
  emotions jsonb NOT NULL DEFAULT '[]'::jsonb,
  emotion_intensity integer CHECK (emotion_intensity IS NULL OR (emotion_intensity >= 0 AND emotion_intensity <= 10)),
  thought text NOT NULL DEFAULT '',
  professional_action text NOT NULL DEFAULT '',
  learning text NOT NULL DEFAULT '',
  gratitude text NOT NULL DEFAULT '',
  revisit_quote text NOT NULL DEFAULT '',
  attachment_url text,
  attachment_name text,
  attachment_size integer,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deserving_diary_user_date_idx
  ON app.deserving_diary(user_id, entry_date DESC, created_at DESC);
