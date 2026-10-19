-- Migration 035: Paper Trading Pending Orders
-- Permite o status 'pending' em app.trades e adiciona colunas de auditoria de snapshot e descarte.

ALTER TABLE app.trades DROP CONSTRAINT IF EXISTS trades_status_check;
ALTER TABLE app.trades ADD CONSTRAINT trades_status_check CHECK (status IN ('planned', 'pending', 'open', 'closed', 'cancelled'));

ALTER TABLE app.trades ADD COLUMN IF NOT EXISTS pending_snapshot jsonb DEFAULT '{}'::jsonb;
ALTER TABLE app.trades ADD COLUMN IF NOT EXISTS discard_reason text;
ALTER TABLE app.trades ADD COLUMN IF NOT EXISTS verified_at timestamptz;

CREATE INDEX IF NOT EXISTS trades_user_pending_idx ON app.trades(user_id, status) WHERE status = 'pending';
