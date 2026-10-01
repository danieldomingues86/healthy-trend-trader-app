-- Migration 024: Scale-In (Trade Additions & Consolidated Risk Management)
-- Preserves complete history, records individual entries in app.trade_entries,
-- updates app.trades with consolidated tracking, and allows 'scale_in' in app.trade_events.

-- 1. Extend app.trades with scale-in tracking columns
ALTER TABLE app.trades
  ADD COLUMN IF NOT EXISTS scale_in_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS scale_in_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_quantity numeric,
  ADD COLUMN IF NOT EXISTS average_entry_price numeric,
  ADD COLUMN IF NOT EXISTS total_allocated_capital numeric,
  ADD COLUMN IF NOT EXISTS current_risk_percent numeric;

-- 2. Create app.trade_entries table for granular entry tracking
CREATE TABLE IF NOT EXISTS app.trade_entries (
  id uuid PRIMARY KEY,
  trade_id uuid NOT NULL REFERENCES app.trades(id) ON DELETE CASCADE,
  entry_type text NOT NULL CHECK (entry_type IN ('INITIAL', 'SCALE_IN')),
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  entry_time time NOT NULL DEFAULT CURRENT_TIME,
  price numeric NOT NULL,
  quantity numeric NOT NULL,
  capital_allocated numeric NOT NULL,
  initial_stop numeric,
  risk_amount numeric,
  risk_percent numeric,
  r_multiple_at_entry numeric,
  note text NOT NULL DEFAULT '',
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trade_entries_trade_idx ON app.trade_entries(trade_id, created_at);

-- 3. Allow 'scale_in' as a valid event_type in app.trade_events
ALTER TABLE app.trade_events DROP CONSTRAINT IF EXISTS trade_events_event_type_check;
ALTER TABLE app.trade_events ADD CONSTRAINT trade_events_event_type_check
  CHECK (event_type IN ('entry', 'scale_in', 'update', 'peeloff', 'close'));

-- 4. Backfill initial entries for existing trades into app.trade_entries
INSERT INTO app.trade_entries (
  id, trade_id, entry_type, entry_date, entry_time, price, quantity,
  capital_allocated, initial_stop, risk_amount, risk_percent,
  r_multiple_at_entry, note, created_at, updated_at
)
SELECT
  gen_random_uuid(),
  t.id,
  'INITIAL',
  COALESCE(t.executed_at::date, t.created_at::date, CURRENT_DATE),
  COALESCE(t.executed_at::time, t.created_at::time, '12:00:00'::time),
  COALESCE(t.execution_price, t.entry_price, 0),
  COALESCE(t.executed_quantity, t.planned_quantity, 0),
  (COALESCE(t.execution_price, t.entry_price, 0) * COALESCE(t.executed_quantity, t.planned_quantity, 0)),
  t.stop_price,
  ABS(COALESCE(t.execution_price, t.entry_price, 0) - COALESCE(t.stop_price, 0)) * COALESCE(t.executed_quantity, t.planned_quantity, 0),
  t.risk_pct,
  0,
  'Entrada inicial registrada no plano.',
  COALESCE(t.executed_at, t.created_at, now()),
  COALESCE(t.executed_at, t.created_at, now())
FROM app.trades t
WHERE NOT EXISTS (
  SELECT 1 FROM app.trade_entries e WHERE e.trade_id = t.id AND e.entry_type = 'INITIAL'
);

-- 5. Backfill consolidated metrics on app.trades where null
UPDATE app.trades
SET total_quantity = COALESCE(executed_quantity, planned_quantity),
    average_entry_price = COALESCE(execution_price, entry_price),
    total_allocated_capital = COALESCE(execution_price, entry_price) * COALESCE(executed_quantity, planned_quantity),
    current_risk_percent = risk_pct
WHERE total_quantity IS NULL;
