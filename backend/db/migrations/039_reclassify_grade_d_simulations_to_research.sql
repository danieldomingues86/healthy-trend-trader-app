-- Reclassifica simulações com Grade D que estavam marcadas como OFFICIAL para RESEARCH,
-- pois no Modo Oficial a regra de ouro do método proíbe categoricamente a execução de setups Grade D (orçamento de risco zero).
UPDATE app.trade_simulations
SET simulation_mode = 'RESEARCH'
WHERE grade = 'D' AND simulation_mode = 'OFFICIAL';
