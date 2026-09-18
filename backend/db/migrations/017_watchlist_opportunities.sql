ALTER TABLE app.watchlist_items
  ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'observando',
  ADD COLUMN IF NOT EXISTS thesis text,
  ADD COLUMN IF NOT EXISTS snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS waiting_conditions jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS why_observing jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS history jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE IF NOT EXISTS app.watchlist_archive (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.app_users(id) ON DELETE CASCADE,
  ticker text NOT NULL,
  origin text,
  sources jsonb NOT NULL DEFAULT '[]'::jsonb,
  thesis text,
  initial_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  final_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  exit_reason text,
  turned_trade boolean NOT NULL DEFAULT false,
  entered_at timestamptz NOT NULL,
  exited_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS watchlist_archive_user_idx ON app.watchlist_archive(user_id, exited_at DESC);
