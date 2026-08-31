INSERT INTO app.trade_events (id, trade_id, event_type, quantity, price, stop_price, atr, note, occurred_at)
SELECT gen_random_uuid(), t.id, 'entry', t.executed_quantity, t.execution_price, t.stop_price, t.atr,
       'Trade registrado no workspace.', COALESCE(t.executed_at, t.created_at)
FROM app.trades t
WHERE t.status IN ('open', 'closed')
  AND t.executed_quantity IS NOT NULL
  AND t.execution_price IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM app.trade_events e WHERE e.trade_id = t.id AND e.event_type = 'entry'
  );
