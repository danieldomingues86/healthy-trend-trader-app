ALTER TABLE app.trade_events
  ADD COLUMN IF NOT EXISTS context jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Existing events retain their original prices, quantities and timestamps.
-- Their context is empty; historic summaries can still be derived from the event ledger.
