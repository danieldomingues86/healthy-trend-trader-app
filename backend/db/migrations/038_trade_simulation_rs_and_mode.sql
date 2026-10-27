ALTER TABLE app.trade_simulations
  ADD COLUMN IF NOT EXISTS rs_score NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS simulation_mode TEXT NOT NULL DEFAULT 'OFFICIAL',
  ADD COLUMN IF NOT EXISTS rule_version TEXT;

COMMENT ON COLUMN app.trade_simulations.rs_score IS 'Força Relativa (RS 0-99) histórica calculada na data de geração do sinal (sem look-ahead bias)';
COMMENT ON COLUMN app.trade_simulations.simulation_mode IS 'Modo da simulação: OFFICIAL (regras oficiais vigentes) ou RESEARCH (laboratório de pesquisa)';
COMMENT ON COLUMN app.trade_simulations.rule_version IS 'Versão da configuração de regras aplicada na execução';
