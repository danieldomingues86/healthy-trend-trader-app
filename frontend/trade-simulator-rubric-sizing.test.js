const test = require('node:test');
const assert = require('node:assert/strict');

const TradeSimulatorModel = require('./trade-simulator-model');
const TradingRubrics = require('./trading-rubrics');

test('Motor Compartilhado — 1. classifyRsCapitalPriority categoriza as 4 faixas oficiais', () => {
  // Faixa 1: RS 95-100 (Líder Excepcional / Prioridade Máxima)
  const rs98 = TradeSimulatorModel.classifyRsCapitalPriority(98);
  assert.equal(rs98.bandLabel, '95-100');
  assert.equal(rs98.priorityRank, 1);
  assert.equal(rs98.sizingMultiplier, 1.00);
  assert.equal(rs98.isOfficialEligible, true);
  assert.equal(rs98.rubricRating, 'good');

  // Faixa 2: RS 90-94 (Líder / Prioridade Muito Alta)
  const rs92 = TradeSimulatorModel.classifyRsCapitalPriority(92);
  assert.equal(rs92.bandLabel, '90-94');
  assert.equal(rs92.priorityRank, 2);
  assert.equal(rs92.sizingMultiplier, 1.00);
  assert.equal(rs92.isOfficialEligible, true);
  assert.equal(rs92.rubricRating, 'good');

  // Faixa 3: RS 80-89 (Força Alta / Prioridade Alta)
  const rs84 = TradeSimulatorModel.classifyRsCapitalPriority(84);
  assert.equal(rs84.bandLabel, '80-89');
  assert.equal(rs84.priorityRank, 3);
  assert.equal(rs84.sizingMultiplier, 0.90);
  assert.equal(rs84.isOfficialEligible, true);
  assert.equal(rs84.rubricRating, 'good');

  // Faixa 4: RS < 80 (Sem benefício de Bet Sizing por RS / Bloqueado no Modo Oficial)
  const rs72 = TradeSimulatorModel.classifyRsCapitalPriority(72);
  assert.equal(rs72.bandLabel, '<80');
  assert.equal(rs72.priorityRank, 4);
  assert.equal(rs72.sizingMultiplier, 0.65);
  assert.equal(rs72.isOfficialEligible, false);

  const rsNull = TradeSimulatorModel.classifyRsCapitalPriority(null);
  assert.equal(rsNull.isOfficialEligible, false);
  assert.equal(rsNull.sizingMultiplier, 0.50);
});

test('Motor Compartilhado — 2. evaluateTradeRubricAndSizing bloqueia Grade D no Modo Oficial', () => {
  const simGradeD = {
    symbol: 'PETR4',
    signalDate: '2026-05-10',
    entryPrice: 30.00,
    stopLoss: 28.50,
    grade: 'D',
    rubricScore: 42,
    rsScore: 92,
    marketCycle: 'healthy'
  };

  const evalOfficial = TradeSimulatorModel.evaluateTradeRubricAndSizing(simGradeD, {}, { officialMode: true });
  assert.equal(evalOfficial.isEligible, false, 'No Modo Oficial, Grade D deve ser estritamente bloqueado');
  assert.equal(evalOfficial.blockCode, 'GRADE_D');
  assert.equal(evalOfficial.quantity, 0);
  assert.match(evalOfficial.blockReason, /Nota D possui orçamento de risco 0,00%/i);

  // No modo pesquisa / permissivo, não é bloqueado
  const evalLab = TradeSimulatorModel.evaluateTradeRubricAndSizing(simGradeD, {}, { officialMode: false });
  assert.equal(evalLab.isEligible, true);
});

test('Motor Compartilhado — 3. evaluateTradeRubricAndSizing bloqueia RS < 80 e Ciclo Defensivo no Modo Oficial', () => {
  const simSub80 = {
    symbol: 'VALE3',
    signalDate: '2026-05-10',
    entryPrice: 60.00,
    stopLoss: 57.00,
    grade: 'A',
    rubricScore: 88,
    rsScore: 74, // Abaixo do mínimo de 80
    marketCycle: 'healthy'
  };
  const evalSub80 = TradeSimulatorModel.evaluateTradeRubricAndSizing(simSub80, {}, { officialMode: true });
  assert.equal(evalSub80.isEligible, false);
  assert.equal(evalSub80.blockCode, 'RS_BELOW_80');
  assert.equal(evalSub80.quantity, 0);

  const simDefensive = {
    symbol: 'WEGE3',
    signalDate: '2026-05-10',
    entryPrice: 40.00,
    stopLoss: 38.00,
    grade: 'A',
    rubricScore: 90,
    rsScore: 94,
    marketCycle: 'defensive' // Mercado em modo defesa
  };
  const evalDef = TradeSimulatorModel.evaluateTradeRubricAndSizing(simDefensive, {}, { officialMode: true });
  assert.equal(evalDef.isEligible, false);
  assert.equal(evalDef.blockCode, 'DEFENSIVE_CYCLE');
  assert.equal(evalDef.quantity, 0);
});

test('Motor Compartilhado — 4. Position Sizing aplica a menor quantidade entre as camadas de restrição', () => {
  const simA = {
    symbol: 'PRIO3',
    signalDate: '2026-05-10',
    entryPrice: 50.00,
    stopLoss: 48.00, // Distância = 2.00 (4%)
    atr: 1.25, // ATR moderado = 2.5%
    grade: 'A',
    rubricScore: 90,
    rsScore: 96,
    marketCycle: 'healthy'
  };

  // Capital R$ 100.000
  // Orçamento Risco: 0.4% = R$ 400 / 2.00 = 200 ações (lote 100)
  // Limite Capital: 10% = R$ 10.000 / 50.00 = 200 ações
  // Limite ATR: 0.3% = R$ 300 / 1.25 = 240 ações -> 200
  const evalSizing = TradeSimulatorModel.evaluateTradeRubricAndSizing(simA, { currentEquity: 100000 }, { officialMode: true });
  assert.equal(evalSizing.isEligible, true);
  assert.equal(evalSizing.quantity, 200, 'A menor quantidade entre risco (200), capital (200) e ATR (200) deve prevalecer');
  assert.equal(evalSizing.limitingLayer, 'budget');
  assert.equal(evalSizing.initialRiskCash, 400); // 200 * 2.00 = 400
  assert.equal(evalSizing.executableRiskPct, 0.40); // 400 / 100000 = 0.40%
});

test('Motor Compartilhado — 5. runRubricPortfolioSimulation respeita Modo Rubric ATIVADO vs DESATIVADO sem mutar os dados originais', () => {
  const rawSims = [
    { id: 's1', symbol: 'WEGE3', signalDate: '2026-01-05', entryPrice: 40.00, stopLoss: 38.00, grade: 'A', rsScore: 95, marketCycle: 'healthy', resultR: 2, status: 'CLOSED_GAIN' },
    { id: 's2', symbol: 'VALE3', signalDate: '2026-01-10', entryPrice: 60.00, stopLoss: 57.00, grade: 'D', rsScore: 90, marketCycle: 'healthy', resultR: -1, status: 'CLOSED_LOSS' },
    { id: 's3', symbol: 'PETR4', signalDate: '2026-01-15', entryPrice: 30.00, stopLoss: 28.50, grade: 'B', rsScore: 84, marketCycle: 'healthy', resultR: 2, status: 'CLOSED_GAIN' }
  ];

  const cloneBefore = JSON.parse(JSON.stringify(rawSims));

  // 1. Modo Rubric ATIVADO
  const simWithRubric = TradeSimulatorModel.runRubricPortfolioSimulation(rawSims, { rubricMode: true, officialMode: true });
  assert.equal(simWithRubric.rubricMode, true);
  assert.equal(simWithRubric.performance.executedCount, 2, 'No Modo Rubric ATIVADO, trade Grade D (s2) é bloqueado');
  assert.equal(simWithRubric.performance.blockedCount, 1);
  assert.ok(simWithRubric.finalEquity > 100000, 'Patrimônio final deve ter crescido com os ganhos');
  assert.ok(Array.isArray(simWithRubric.equityCurve));

  // 2. Modo Rubric DESATIVADO
  const simWithoutRubric = TradeSimulatorModel.runRubricPortfolioSimulation(rawSims, { rubricMode: false });
  assert.equal(simWithoutRubric.rubricMode, false);
  assert.equal(simWithoutRubric.performance.executedCount, 3, 'No Modo Rubric DESATIVADO, todos os trades executam');
  assert.equal(simWithoutRubric.performance.blockedCount, 0);

  // 3. Imutabilidade dos dados originais
  assert.deepEqual(rawSims, cloneBefore, 'Execução da simulação nunca deve mutar o array ou objetos de simulação originais');
});

test('Motor Compartilhado — 6. compareRubricModes isola Efeito Seleção e Efeito Dimensionamento', () => {
  const testSims = [
    { id: '1', symbol: 'WEGE3', signalDate: '2026-02-01', entryPrice: 40.00, stopLoss: 38.00, grade: 'A', rsScore: 96, marketCycle: 'healthy', resultR: 2 },
    { id: '2', symbol: 'MGLU3', signalDate: '2026-02-05', entryPrice: 10.00, stopLoss: 9.00, grade: 'D', rsScore: 50, marketCycle: 'defensive', resultR: -1 },
    { id: '3', symbol: 'PRIO3', signalDate: '2026-02-10', entryPrice: 50.00, stopLoss: 47.50, grade: 'A', rsScore: 92, marketCycle: 'healthy', resultR: 2 }
  ];

  const comparison = TradeSimulatorModel.compareRubricModes(testSims, { initialCapital: 100000 });
  assert.ok(comparison.withRubric);
  assert.ok(comparison.withoutRubric);
  assert.ok(comparison.deltas);
  assert.ok(comparison.selectionEffect);
  assert.ok(comparison.sizingEffect);
  assert.equal(comparison.selectionEffect.blockedBadTradesCount, 1, 'Trade MGLU3 (Grade D / ciclo ruim) bloqueado pelo Rubric');
});

test('Motor Compartilhado — 7. analyzeGradeByTrigger avalia os 4 gatilhos ativos com incerteza amostral e consistência', () => {
  const sims = [
    { triggerName: 'Inside Bar', grade: 'A', resultR: 2, rsScore: 92, signalDate: '2026-01-01' },
    { triggerName: 'Inside Bar', grade: 'A', resultR: -1, rsScore: 90, signalDate: '2026-01-02' },
    { triggerName: '1-2-3 de Compra', grade: 'A', resultR: 2, rsScore: 94, signalDate: '2026-01-04' },
    { triggerName: 'PFR de Compra', grade: 'C', resultR: 1, rsScore: 82, signalDate: '2026-01-05' },
    { triggerName: 'Barra Vermelha Ignorada', grade: 'A', resultR: 2, rsScore: 91, signalDate: '2026-01-06' }
  ];

  const triggerAnalysis = TradeSimulatorModel.analyzeGradeByTrigger(sims);
  const triggers = Object.keys(triggerAnalysis);
  assert.deepEqual(triggers, ['Inside Bar', '1-2-3 de Compra', 'PFR de Compra', 'Barra Vermelha Ignorada']);

  // Verifica que alerta de incerteza amostral é ativado para amostras pequenas (<30)
  assert.equal(triggerAnalysis['Inside Bar']['A'].isLowSample, true);
  assert.match(triggerAnalysis['Inside Bar']['A'].confidenceNote, /Amostra reduzida \(<30 trades\)/i);
});

test('Motor Compartilhado — 8. runRubricRiskScenarios executa os 6 cenários de risco do laboratório', () => {
  const sims = [
    { symbol: 'WEGE3', signalDate: '2026-01-01', entryPrice: 40, stopLoss: 38, grade: 'A', rsScore: 92, marketCycle: 'healthy', resultR: 2 },
    { symbol: 'PETR4', signalDate: '2026-01-02', entryPrice: 30, stopLoss: 28.5, grade: 'B', rsScore: 86, marketCycle: 'healthy', resultR: -1 }
  ];

  const scenarios = TradeSimulatorModel.runRubricRiskScenarios(sims);
  const scenarioKeys = Object.keys(scenarios);
  assert.deepEqual(scenarioKeys, ['NORMAL', 'LOW_RS', 'WEAK_CYCLE', 'WEAK_EDGE', 'POOR_SELECTION', 'STRESS_STREAK']);
  assert.equal(scenarios.NORMAL.report.rubricMode, true);
  assert.ok(scenarios.STRESS_STREAK.report);
});
