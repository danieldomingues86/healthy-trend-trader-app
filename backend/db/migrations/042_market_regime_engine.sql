-- 042_market_regime_engine.sql
-- Motor Central de Regimes de Mercado (Market Regime Engine)
-- Classificação de 6 regimes (UP_QUIET, UP_VOLATILE, SIDEWAYS_QUIET, SIDEWAYS_VOLATILE, DOWN_QUIET, DOWN_VOLATILE)
-- Persistência idempotente e referência imutável na entrada de trades e simulações.

CREATE TABLE IF NOT EXISTS app.market_benchmarks (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  symbol VARCHAR(50) NOT NULL,
  market VARCHAR(50) NOT NULL,
  provider VARCHAR(50) NOT NULL DEFAULT 'b3',
  is_default BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Seed de benchmarks iniciais recomendados
INSERT INTO app.market_benchmarks (id, name, symbol, market, provider, is_default, active)
VALUES
  ('IBOV', 'Índice Bovespa (IBOV)', '^BVSP', 'BR', 'b3', true, true),
  ('SP500', 'S&P 500 Index', '^GSPC', 'US', 'brapi', true, true),
  ('NASDAQ', 'Nasdaq Composite Index', '^IXIC', 'NASDAQ', 'twelve_data', true, true),
  ('IFIX', 'Índice de FIIs (IFIX)', 'IFIX', 'BR', 'b3', false, true),
  ('BDRX', 'Índice de BDRs Não Patrocinados (BDRX)', 'BDRX', 'BR', 'b3', false, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  symbol = EXCLUDED.symbol,
  market = EXCLUDED.market,
  provider = EXCLUDED.provider,
  updated_at = now();

CREATE TABLE IF NOT EXISTS app.market_regime_daily (
  id BIGSERIAL PRIMARY KEY,
  benchmark_id VARCHAR(50) NOT NULL REFERENCES app.market_benchmarks(id) ON DELETE CASCADE,
  reference_date DATE NOT NULL,
  direction VARCHAR(20) NOT NULL,
  volatility VARCHAR(20) NOT NULL,
  regime VARCHAR(30) NOT NULL,
  close_price NUMERIC(14, 4),
  ema_10 NUMERIC(14, 4),
  ema_72 NUMERIC(14, 4),
  atr_21 NUMERIC(14, 4),
  atr_percentage NUMERIC(10, 4),
  atr_percentage_sma_252 NUMERIC(10, 4),
  volatility_deviation NUMERIC(10, 4),
  calculation_version VARCHAR(20) NOT NULL DEFAULT 'v1',
  calculated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_market_regime_daily UNIQUE (benchmark_id, reference_date, calculation_version)
);

CREATE INDEX IF NOT EXISTS idx_market_regime_daily_lookup
  ON app.market_regime_daily (benchmark_id, reference_date DESC);

CREATE INDEX IF NOT EXISTS idx_market_regime_daily_regime
  ON app.market_regime_daily (benchmark_id, regime);

-- Referência imutável ao regime na entrada de operações reais
ALTER TABLE app.trades
  ADD COLUMN IF NOT EXISTS entry_market_direction text,
  ADD COLUMN IF NOT EXISTS entry_market_volatility text,
  ADD COLUMN IF NOT EXISTS entry_market_regime text,
  ADD COLUMN IF NOT EXISTS entry_market_benchmark text,
  ADD COLUMN IF NOT EXISTS entry_regime_reference_date date;

CREATE INDEX IF NOT EXISTS idx_trades_entry_regime
  ON app.trades (user_id, entry_market_regime);

-- Referência imutável ao regime na entrada de simulações de trades
ALTER TABLE app.trade_simulations
  ADD COLUMN IF NOT EXISTS entry_market_direction text,
  ADD COLUMN IF NOT EXISTS entry_market_volatility text,
  ADD COLUMN IF NOT EXISTS entry_market_regime text,
  ADD COLUMN IF NOT EXISTS entry_market_benchmark text,
  ADD COLUMN IF NOT EXISTS entry_regime_reference_date date;

CREATE INDEX IF NOT EXISTS idx_trade_simulations_entry_regime
  ON app.trade_simulations (user_id, entry_market_regime);
