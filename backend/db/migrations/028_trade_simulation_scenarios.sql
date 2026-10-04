-- Adiciona coluna management_scenario na tabela app.trade_simulations
-- para permitir simulação sob diferentes políticas de gestão de risco
-- ('2R', '2.5R', 'PYRAMID_1R_2R'), além de scale_in para dados de piramidagem.
ALTER TABLE app.trade_simulations
  ADD COLUMN IF NOT EXISTS management_scenario text NOT NULL DEFAULT '2R';

ALTER TABLE app.trade_simulations
  ADD COLUMN IF NOT EXISTS scale_in jsonb;

CREATE INDEX IF NOT EXISTS trade_simulations_user_scenario_idx
  ON app.trade_simulations(user_id, management_scenario);
