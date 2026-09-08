CREATE TABLE IF NOT EXISTS app.journal_attachments (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES app.app_users(id) ON DELETE CASCADE,
  journal_record_id text NOT NULL,
  original_name text NOT NULL,
  content_type text NOT NULL,
  byte_size integer NOT NULL CHECK (byte_size > 0 AND byte_size <= 20971520),
  storage_key text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS journal_attachments_user_record_idx
  ON app.journal_attachments(user_id, journal_record_id, created_at DESC);
