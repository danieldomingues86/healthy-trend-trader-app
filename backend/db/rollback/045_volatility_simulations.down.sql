-- Rollback da migração 045: remove tabela de experimentos de volatilidade
DROP TRIGGER IF EXISTS volatility_sim_experiments_touch_updated_at ON app.volatility_simulation_experiments;
DROP TABLE IF EXISTS app.volatility_simulation_experiments;
