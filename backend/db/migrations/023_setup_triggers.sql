ALTER TABLE app.trades ADD COLUMN IF NOT EXISTS setup_trigger text;

ALTER TABLE app.trades DROP CONSTRAINT IF EXISTS trades_setup_trigger_check;
ALTER TABLE app.trades ADD CONSTRAINT trades_setup_trigger_check
  CHECK (setup_trigger IS NULL OR setup_trigger IN ('INSIDE_BAR', 'PFR_COMPRA', '123_COMPRA', 'DAVE_LANDRY', 'RBI'));

CREATE INDEX IF NOT EXISTS trades_user_setup_trigger_idx ON app.trades(user_id, setup_trigger);
