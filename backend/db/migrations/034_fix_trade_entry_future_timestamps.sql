-- Migration 034: Fix Trade Entry Future Timestamps
-- Ensures that entry events in app.trade_events do not have occurred_at set to future dates/times
-- resulting from UTC timezone conversion or default noon timestamps, and syncs executed_at.

UPDATE app.trade_events
   SET occurred_at = created_at
 WHERE event_type = 'entry'
   AND occurred_at > created_at;

UPDATE app.trades
   SET executed_at = created_at
 WHERE executed_at > created_at;
