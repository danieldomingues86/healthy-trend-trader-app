-- 025_market_daily_prices.sql
-- Storage for daily market prices across multiple providers and universes (e.g. Twelve Data / Nasdaq-100)

CREATE TABLE IF NOT EXISTS app.market_daily_prices (
  id BIGSERIAL PRIMARY KEY,
  provider VARCHAR(50) NOT NULL,
  universe VARCHAR(50) NOT NULL,
  symbol VARCHAR(20) NOT NULL,
  date DATE NOT NULL,
  open NUMERIC(14, 4),
  high NUMERIC(14, 4),
  low NUMERIC(14, 4),
  close NUMERIC(14, 4) NOT NULL,
  volume BIGINT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_market_daily_prices UNIQUE (provider, universe, symbol, date)
);

CREATE INDEX IF NOT EXISTS idx_market_daily_prices_lookup
  ON app.market_daily_prices (universe, symbol, date DESC);

CREATE INDEX IF NOT EXISTS idx_market_daily_prices_date
  ON app.market_daily_prices (universe, date DESC);
