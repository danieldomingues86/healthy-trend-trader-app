-- 046_capital_intelligence_pipeline.sql
-- Pipeline de Dados, Séries Históricas, Snapshots Diários e Observabilidade do Capital Intelligence
-- Regra de idempotência: chave única (indicator_id, reference_date) impede duplicação em reprocessamentos.

CREATE TABLE IF NOT EXISTS app.ci_indicator_series (
  id BIGSERIAL PRIMARY KEY,
  indicator_id VARCHAR(80) NOT NULL,
  symbol VARCHAR(40) NOT NULL,
  market VARCHAR(20) NOT NULL,
  currency VARCHAR(16) NOT NULL DEFAULT 'USD',
  unit VARCHAR(24) NOT NULL DEFAULT 'pts',
  metric_nature VARCHAR(32) NOT NULL DEFAULT 'price_performance',
  reference_date DATE NOT NULL,
  open_value NUMERIC(18, 6),
  high_value NUMERIC(18, 6),
  low_value NUMERIC(18, 6),
  close_value NUMERIC(18, 6) NOT NULL,
  volume NUMERIC(20, 2),
  source_provider VARCHAR(60) NOT NULL,
  source_timestamp TIMESTAMPTZ,
  collected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  quality_status VARCHAR(24) NOT NULL DEFAULT 'valid',
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  CONSTRAINT uq_ci_indicator_series UNIQUE (indicator_id, reference_date)
);

CREATE INDEX IF NOT EXISTS idx_ci_indicator_series_lookup
  ON app.ci_indicator_series (indicator_id, reference_date DESC);

CREATE INDEX IF NOT EXISTS idx_ci_indicator_series_market_date
  ON app.ci_indicator_series (market, reference_date DESC);

CREATE TABLE IF NOT EXISTS app.ci_daily_snapshots (
  id BIGSERIAL PRIMARY KEY,
  snapshot_date DATE NOT NULL,
  schema_version VARCHAR(16) NOT NULL DEFAULT '1.0',
  overall_status VARCHAR(24) NOT NULL,
  payload JSONB NOT NULL,
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT uq_ci_daily_snapshots UNIQUE (snapshot_date, schema_version)
);

CREATE INDEX IF NOT EXISTS idx_ci_daily_snapshots_date
  ON app.ci_daily_snapshots (snapshot_date DESC);

CREATE TABLE IF NOT EXISTS app.ci_pipeline_runs (
  id UUID PRIMARY KEY,
  job_key VARCHAR(64) NOT NULL,
  market VARCHAR(24) NOT NULL,
  status VARCHAR(24) NOT NULL,
  expected_reference_date DATE,
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  duration_ms INTEGER,
  records_upserted INTEGER NOT NULL DEFAULT 0,
  indicators_updated JSONB NOT NULL DEFAULT '[]'::jsonb,
  errors JSONB NOT NULL DEFAULT '[]'::jsonb,
  credits_used INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ci_pipeline_runs_job_started
  ON app.ci_pipeline_runs (job_key, started_at DESC);
