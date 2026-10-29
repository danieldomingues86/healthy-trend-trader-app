-- Migration 041: Add BREAKOUT to app.trades setup_trigger CHECK constraint
ALTER TABLE app.trades DROP CONSTRAINT IF EXISTS trades_setup_trigger_check;
ALTER TABLE app.trades ADD CONSTRAINT trades_setup_trigger_check
  CHECK (setup_trigger IS NULL OR setup_trigger IN ('INSIDE_BAR', 'PFR_COMPRA', '123_COMPRA', 'DAVE_LANDRY', 'RBI', 'BREAKOUT'));
