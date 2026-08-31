CREATE TABLE IF NOT EXISTS app.trade_events (
  id uuid PRIMARY KEY,
  trade_id uuid NOT NULL REFERENCES app.trades(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('entry', 'update', 'peeloff', 'close')),
  quantity numeric,
  price numeric,
  stop_price numeric,
  atr numeric,
  note text NOT NULL DEFAULT '',
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trade_events_trade_occurred_idx
  ON app.trade_events(trade_id, occurred_at, created_at);
