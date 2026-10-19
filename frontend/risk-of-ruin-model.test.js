const test = require('node:test');
const assert = require('node:assert/strict');
const Model = require('./risk-of-ruin-model.js');

test('RiskOfRuinModel: fórmulas exatas de equity, pico e drawdown (compounding e fixed)', () => {
  // Sequência conhecida: +2R, -1R, -1R com risco de 10% por trade sobre Equity inicial de 100
  // Passo 0: Eq = 100, Peak = 100, DD = 0%
  // Passo 1 (+2R): Eq = 100 * (1 + 0.10 * 2) = 120, Peak = 120, DD = 0%
  // Passo 2 (-1R): Eq = 120 * (1 - 0.10) = 108, Peak = 120, DD = (120 - 108)/120 * 100 = 10%
  // Passo 3 (-1R): Eq = 108 * (1 - 0.10) = 97.2, Peak = 120, DD = (120 - 97.2)/120 * 100 = 19%
  const seriesComp = Model.calculateEquityAndDrawdownSeries([2, -1, -1], {
    initialEquity: 100,
    riskPerTradePct: 10,
    riskModel: 'compounding'
  });

  assert.equal(seriesComp.peakEquity, 120);
  assert.ok(Math.abs(seriesComp.finalEquity - 97.2) < 1e-9);
  assert.ok(Math.abs(seriesComp.currentDrawdownPct - 19) < 1e-9);
  assert.ok(Math.abs(seriesComp.maxDrawdownPct - 19) < 1e-9);

  // Modelo de risco monetário fixo (10% de 100 = 10 por R):
  // Passo 1 (+2R): Eq = 100 + 20 = 120, Peak = 120
  // Passo 2 (-1R): Eq = 120 - 10 = 110, Peak = 120, DD = 10/120 = 8.3333%
  // Passo 3 (-1R): Eq = 110 - 10 = 100, Peak = 120, DD = 20/120 = 16.6667%
  const seriesFixed = Model.calculateEquityAndDrawdownSeries([2, -1, -1], {
    initialEquity: 100,
    riskPerTradePct: 10,
    riskModel: 'fixed'
  });

  assert.equal(seriesFixed.peakEquity, 120);
  assert.equal(seriesFixed.finalEquity, 100);
  assert.ok(Math.abs(seriesFixed.maxDrawdownPct - (20 / 120) * 100) < 1e-9);

  // Patrimônio não positivo deve ser rejeitado
  assert.throws(
    () => Model.calculateEquityAndDrawdownSeries([1, -1], { initialEquity: 0, riskPerTradePct: 1 }),
    /estritamente positivo/
  );
  assert.throws(
    () => Model.calculateEquityAndDrawdownSeries([1, -1], { initialEquity: -500, riskPerTradePct: 1 }),
    /estritamente positivo/
  );
});

test('RiskOfRuinModel: limite atingido exatamente no valor configurado conta como ruína', () => {
  // Todos os trades na amostra são -1R; com risco fixo de 10% sobre base 100 e horizonte de 3 trades,
  // o drawdown após 3 trades é exatamente 30.0%. Se o limite configurado for 30%, 100% das trajetórias atingem ruína.
  const trades = Array.from({ length: 30 }, () => -1);
  const resExact = Model.runMonteCarloSimulation(trades, {
    maxDrawdownLimitPct: 30,
    horizonTrades: 3,
    simulationsCount: 500,
    riskPerTradePct: 10,
    riskModel: 'fixed',
    seed: 12345
  });

  assert.equal(resExact.status, 'CALCULATED');
  assert.equal(resExact.ruinedTrajectories, 500);
  assert.equal(resExact.ruinProbabilityPct, 100);

  // Se o horizonte for de apenas 2 trades (drawdown máximo = 20% < 30%), nenhuma trajetória atinge o limite de 30%
  const resBelow = Model.runMonteCarloSimulation(trades, {
    maxDrawdownLimitPct: 30,
    horizonTrades: 2,
    simulationsCount: 500,
    riskPerTradePct: 10,
    riskModel: 'fixed',
    seed: 12345
  });

  assert.equal(resBelow.ruinedTrajectories, 0);
  assert.equal(resBelow.ruinProbabilityPct, 0);
});

test('RiskOfRuinModel: tratamento rigoroso de 0 ocorrências e intervalo de confiança binomial de 95%', () => {
  // Para 0 ocorrências em 10.000 simulações, NUNCA deve exibir "risco zero" e o limite superior de 95% é ~0,03%
  const ciZero = Model.computeConfidenceInterval95(0, 10000);
  assert.equal(ciZero.zeroOccurrences, true);
  assert.equal(ciZero.displayText, '0 ocorrências observadas nesta simulação');
  assert.ok(!ciZero.displayText.toLowerCase().includes('risco zero'));
  assert.equal(ciZero.lowerPct, 0);
  // 1 - (0.05)^(1/10000) * 100 ≈ 0.02995% -> 0,03%
  assert.ok(Math.abs(ciZero.upperPct - 0.03) < 0.001, `Esperado ~0.03%, obtido ${ciZero.upperPct}`);

  // Para 480 ocorrências em 10.000 simulações (4,8%), IC 95% fica próximo de [4,4%, 5,2%]
  const ci480 = Model.computeConfidenceInterval95(480, 10000);
  assert.equal(ci480.zeroOccurrences, false);
  assert.ok(Math.abs(ci480.probabilityPct - 4.8) < 1e-6);
  assert.ok(ci480.lowerPct > 4.3 && ci480.lowerPct < 4.5);
  assert.ok(ci480.upperPct > 5.1 && ci480.upperPct < 5.3);
});

test('RiskOfRuinModel: históricos conhecidos com expectativa positiva vs expectativa negativa', () => {
  // Expectativa fortemente positiva (Win rate 60%, +2.5R / -1R -> Expectancy = +1.10R) com risco conservador (0.25%)
  const positiveHistory = [];
  for (let i = 0; i < 60; i++) positiveHistory.push(2.5);
  for (let i = 0; i < 40; i++) positiveHistory.push(-1.0);

  const posSim = Model.runMonteCarloSimulation(positiveHistory, {
    maxDrawdownLimitPct: 30,
    horizonTrades: 250,
    simulationsCount: 2000,
    riskPerTradePct: 0.25,
    seed: 20261018
  });

  assert.ok(posSim.sampleStats.expectancyR > 1.0);
  assert.equal(posSim.ruinProbabilityPct, 0);
  assert.equal(posSim.confidenceInterval95.zeroOccurrences, true);

  // Expectativa negativa (Win rate 25%, +1.2R / -1.0R -> Expectancy = -0.45R) com risco de 1.5%
  const negativeHistory = [];
  for (let i = 0; i < 25; i++) negativeHistory.push(1.2);
  for (let i = 0; i < 75; i++) negativeHistory.push(-1.0);

  const negSim = Model.runMonteCarloSimulation(negativeHistory, {
    maxDrawdownLimitPct: 30,
    horizonTrades: 250,
    simulationsCount: 2000,
    riskPerTradePct: 1.5,
    seed: 20261018
  });

  assert.ok(negSim.sampleStats.expectancyR < 0);
  assert.ok(negSim.ruinProbabilityPct > 90, `Expectativa negativa com risco alto deve ter alta probabilidade de ruína (obtido: ${negSim.ruinProbabilityPct}%)`);
});

test('RiskOfRuinModel: validação de dados insuficientes, nulos, abertos ou inválidos sem mutar original', () => {
  // Array vazio
  const emptyRes = Model.runMonteCarloSimulation([], { simulationsCount: 1000 });
  assert.equal(emptyRes.status, 'INSUFFICIENT_DATA');
  assert.equal(emptyRes.isSufficientSample, false);
  assert.equal(emptyRes.ruinProbabilityPct, null);

  // Dados mistos com nulos, NaN, posições abertas e apenas 3 fechados válidos (< minSampleRequired = 5)
  const rawInput = [
    null,
    undefined,
    { status: 'open', r: -2 },
    { status: 'closed', r: NaN },
    { status: 'closed', r: 1.5, ticker: 'WEGE3' },
    { status: 'closed', r: -1.0, ticker: 'PETR4' },
    { status: 'closed', r: 2.0, ticker: 'VALE3' }
  ];
  const snapshotBefore = JSON.stringify(rawInput);

  const fewRes = Model.runMonteCarloSimulation(rawInput, { simulationsCount: 1000 });
  assert.equal(fewRes.status, 'INSUFFICIENT_DATA');
  assert.equal(fewRes.sampleStats.count, 3);
  assert.equal(fewRes.invalidRecordsIgnored, 4);
  assert.equal(JSON.stringify(rawInput), snapshotBefore, 'O histórico original jamais deve ser modificado');

  // Amostra reduzida (12 trades: entre 5 e 29) -> calcula mas sinaliza LOW_SAMPLE
  const lowSampleTrades = Array.from({ length: 12 }, (_, i) => (i % 2 === 0 ? 2.0 : -1.0));
  const lowRes = Model.runMonteCarloSimulation(lowSampleTrades, { simulationsCount: 1000 });
  assert.equal(lowRes.status, 'LOW_SAMPLE');
  assert.equal(lowRes.isSufficientSample, true);
  assert.equal(lowRes.isLowSampleWarning, true);
});

test('RiskOfRuinModel: reprodutibilidade determinística com seed fixa', () => {
  const sample = Array.from({ length: 50 }, (_, i) => (i % 3 === 0 ? 2.2 : -1.0));
  const cfg = {
    maxDrawdownLimitPct: 20,
    horizonTrades: 250,
    simulationsCount: 3000,
    riskPerTradePct: 1.0,
    seed: 987654321
  };

  const run1 = Model.runMonteCarloSimulation(sample, cfg);
  const run2 = Model.runMonteCarloSimulation(sample, cfg);

  assert.equal(run1.ruinedTrajectories, run2.ruinedTrajectories);
  assert.equal(run1.ruinProbabilityPct, run2.ruinProbabilityPct);
  assert.deepEqual(run1.drawdownPercentiles, run2.drawdownPercentiles);
  assert.deepEqual(run1.equityPercentiles, run2.equityPercentiles);
});

test('RiskOfRuinModel: comparação de cenários alternativos de risco e recomendação de redução de mão', () => {
  // Amostra com volatilidade onde risco alto gera ruína relevante
  const sample = [];
  for (let i = 0; i < 45; i++) sample.push(1.8);
  for (let i = 0; i < 55; i++) sample.push(-1.0);

  const config = {
    maxDrawdownLimitPct: 15,
    ruinProbabilityTolerancePct: 2.0,
    horizonTrades: 250,
    simulationsCount: 3000,
    riskPerTradePct: 1.0,
    seed: 20261018
  };

  const mainSim = Model.runMonteCarloSimulation(sample, config);
  const comparison = Model.compareRiskScenarios(sample, config, [0.10, 0.25, 0.50, 1.00]);

  assert.equal(comparison.status, 'CALCULATED');
  assert.equal(comparison.scenarios.length, 4);

  // Monotonicidade: cenários com menor risco por trade têm menor ou igual drawdown mediano e probabilidade de ruína
  for (let i = 1; i < comparison.scenarios.length; i++) {
    const prev = comparison.scenarios[i - 1];
    const curr = comparison.scenarios[i];
    assert.ok(curr.riskPerTradePct > prev.riskPerTradePct);
    assert.ok(curr.medianDrawdownPct >= prev.medianDrawdownPct);
    assert.ok(curr.ruinProbabilityPct >= prev.ruinProbabilityPct);
  }

  // Recomendação deve sugerir redução de mão pois 1.00% ultrapassa a tolerância de 2.0%
  const rec = Model.evaluateHandRecommendation({
    simulationResult: mainSim,
    scenarioComparison: comparison
  });

  assert.equal(rec.shouldReduceHand, true);
  assert.equal(rec.neverAutoIncrease, true);
  assert.ok(rec.recommendedRiskPct < config.riskPerTradePct);
  assert.ok(rec.recommendedRuinProbPct < rec.currentRuinProbPct);

  // Quando o risco já é baixo e seguro (ex: 0.10%), NÃO deve recomendar aumento automático
  const safeConfig = { ...config, riskPerTradePct: 0.10 };
  const safeSim = Model.runMonteCarloSimulation(sample, safeConfig);
  const safeComp = Model.compareRiskScenarios(sample, safeConfig, [0.10, 0.25, 0.50, 1.00]);
  const safeRec = Model.evaluateHandRecommendation({
    simulationResult: safeSim,
    scenarioComparison: safeComp
  });

  assert.equal(safeRec.shouldReduceHand, false);
  assert.equal(safeRec.neverAutoIncrease, true);
  assert.equal(safeRec.recommendedRiskPct, 0.10);
});

test('RiskOfRuinModel: integração com formato do Trading Log, Position Sizing e Novo Trade', () => {
  // Trades no formato exato de synchronizedTrades (com events de entry, peeloff e close)
  const dbTrades = Array.from({ length: 40 }, (_, i) => {
    const isWin = i % 2 === 0;
    return {
      id: `trade-${i}`,
      ticker: isWin ? 'WEGE3' : 'VALE3',
      status: 'closed',
      direction: 'long',
      execution_price: 50,
      stop_price: 48,
      executed_quantity: 100, // Risco inicial = (50 - 48) * 100 = R$ 200
      events: [
        { type: 'entry', price: 50, stop: 48, qty: 100, at: '2026-05-01T10:00:00Z' },
        { type: 'close', price: isWin ? 54 : 48, qty: 100, at: '2026-05-10T17:00:00Z' } // Win = +2R, Loss = -1R
      ]
    };
  });

  const preEntry = Model.evaluateNewTradePreEntryContext({
    rawTrades: dbTrades,
    config: {
      maxDrawdownLimitPct: 30,
      horizonTrades: 250,
      simulationsCount: 2000,
      riskPerTradePct: 0.50,
      seed: 20261018
    },
    plannedTradeRiskPct: 0.75,
    currentDrawdownPct: 4.0,
    portfolioHeat: { heat: 1.5, limit: 6.0, openCount: 2, maxPositions: 6 }
  });

  assert.equal(preEntry.status, 'CALCULATED');
  assert.equal(preEntry.currentPolicyRiskPct, 0.50);
  assert.equal(preEntry.plannedTradeRiskPct, 0.75);
  assert.equal(preEntry.hasExplicitPlannedTrade, true);
  assert.ok(preEntry.ddAfterPlannedStopPct > 4.0, 'Stop planejado deve refletir o aumento potencial no drawdown atual');
  assert.ok(preEntry.modelScopeNotice.includes('Nota metodológica'));
});

test('RiskOfRuinModel: performance de 10.000 trajetórias com horizonte de 250 trades (< 1500ms)', () => {
  const sample = Array.from({ length: 120 }, (_, i) => (i % 3 === 0 ? 2.1 : -1.0));
  const t0 = Date.now();
  const res = Model.runMonteCarloSimulation(sample, {
    maxDrawdownLimitPct: 30,
    horizonTrades: 250,
    simulationsCount: 10000,
    riskPerTradePct: 0.50,
    seed: 20261018
  });
  const elapsedMs = Date.now() - t0;

  assert.equal(res.status, 'CALCULATED');
  assert.equal(res.totalTrajectories, 10000);
  assert.ok(elapsedMs < 1500, `10.000 simulações devem executar rapidamente (levou ${elapsedMs}ms)`);
});
