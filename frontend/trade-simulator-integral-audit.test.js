const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('./trade-simulator-model.js');
const tickerChart = require('../backend/src/ticker-chart.js');

/**
 * Gera uma série histórica diária determinística em tendência de alta (EMAs 10 e 72 alinhadas e ascendentes,
 * liquidez elegível pelo Liquidity Gate) culminando em um Inside Bar válido no índice 80 e execução realista em 81/82.
 */
function buildValidAscendingCandles() {
  const dates = [];
  const d = new Date('2026-05-04T12:00:00Z');
  while (dates.length < 90) {
    const iso = d.toISOString().slice(0, 10);
    if (model.isTradingDay(iso)) dates.push(iso);
    d.setUTCDate(d.getUTCDate() + 1);
  }

  const candles = [];
  for (let i = 0; i < 79; i++) {
    const base = 20 + i * 0.25;
    candles.push({
      time: dates[i],
      date: dates[i],
      open: model.round2(base - 0.10),
      high: model.round2(base + 0.35),
      low: model.round2(base - 0.25),
      close: model.round2(base + 0.15),
      volume: 25000000,
      trades: 1800
    });
  }

  // Índice 79: Barra-Mãe (Mother Bar) — 2026-08-26 (ou data equivalente)
  candles.push({
    time: dates[79],
    date: dates[79],
    open: 39.80,
    high: 41.00,
    low: 39.50,
    close: 40.60,
    volume: 28000000,
    trades: 2100
  });

  // Índice 80: Inside Bar (Sinal) — contido estritamente dentro de [39.50, 41.00]
  // Entrada planejada = 40.50 + 0.01 = 40.51 | Stop Inicial (barra-mãe) = 39.50 - 0.01 = 39.49 (Risco 1R = 1.02)
  candles.push({
    time: dates[80],
    date: dates[80],
    open: 40.10,
    high: 40.50,
    low: 39.90,
    close: 40.40,
    volume: 22000000,
    trades: 1600
  });

  // Índice 81: T+1 (Entrada executada a 40.51)
  candles.push({
    time: dates[81],
    date: dates[81],
    open: 40.45,
    high: 41.20,
    low: 40.30,
    close: 41.05,
    volume: 30000000,
    trades: 2400
  });

  // Índice 82: T+2 (Alvo +2R = 40.51 + 2 * 1.02 = 42.55 atingido)
  candles.push({
    time: dates[82],
    date: dates[82],
    open: 41.10,
    high: 42.80,
    low: 40.95,
    close: 42.60,
    volume: 32000000,
    trades: 2600
  });

  // Índice 83: T+3 (Candle alternativo caso operação saísse no stop)
  candles.push({
    time: dates[83],
    date: dates[83],
    open: 42.50,
    high: 42.90,
    low: 42.10,
    close: 42.70,
    volume: 24000000,
    trades: 1900
  });

  return { candles, dates };
}

function buildValidReferenceTrade(candles, dates) {
  return {
    id: 'sim-valid-ref-1',
    symbol: 'WEGE3',
    companyName: 'WEG ON',
    triggerName: 'Inside Bar',
    grade: 'A',
    sector: 'Bens Industriais',
    signalDate: dates[80],
    entryPrice: 40.51,
    stopLoss: 39.49,
    status: model.STATUS.CLOSED_GAIN,
    executedEntryPrice: 40.51,
    entryDate: dates[81],
    currentStop: 39.49,
    currentPrice: 42.55,
    exitPrice: 42.55,
    exitDate: dates[82],
    exitReason: 'Sell Into Strength (+2R)',
    resultR: 2.00,
    mfeR: 2.25,
    maeR: -0.21,
    rsScore: 92,
    marketCycle: 'Positivo',
    marketPermission: { isPermitted: true, benchmarkSymbol: 'IBOV', evalDate: dates[80] },
    simulationMode: 'OFFICIAL',
    shares: 100,
    grossPnL: 204.00,
    totalCosts: 0,
    netPnL: 204.00
  };
}

test('Auditoria Integral — Trade 100% válido passa em todos os 6 estágios e nas 10 perguntas obrigatórias', () => {
  const { candles, dates } = buildValidAscendingCandles();
  const validTrade = buildValidReferenceTrade(candles, dates);

  const audit = model.performIntegralTradeAudit(validTrade, candles);
  assert.equal(audit.approved, true, `Erros inesperados: ${JSON.stringify(audit.errors)}`);
  assert.equal(audit.status, 'APPROVED');
  assert.equal(audit.errors.length, 0);

  // Todas as 10 perguntas obrigatórias devem ser respondidas com true
  for (const [qKey, val] of Object.entries(audit.questions10)) {
    assert.equal(val, true, `Pergunta ${qKey} deveria ser true`);
  }
  assert.equal(audit.stages.signalIdentification, true);
  assert.equal(audit.stages.technicalValidation, true);
  assert.equal(audit.stages.historicalValidation, true);
  assert.equal(audit.stages.executionValidation, true);
  assert.equal(audit.stages.financialValidation, true);
});

test('Caso 1 (Seção 6): Sinal inexistente no histórico deve ser rejeitado', () => {
  const { candles, dates } = buildValidAscendingCandles();
  const trade = {
    ...buildValidReferenceTrade(candles, dates),
    signalDate: '2025-01-15' // Data ausente na série histórica
  };

  const audit = model.performIntegralTradeAudit(trade, candles);
  assert.equal(audit.approved, false);
  assert.equal(audit.status, 'REJECTED');
  assert.ok(audit.violatedRules.includes('SIGNAL_DATE_NOT_FOUND') || audit.violatedRules.includes('SIGNAL_NOT_REPRODUCIBLE'));
  assert.equal(audit.questions10.q1_signalExisted, false);
});

test('Caso 2 (Seção 6): Inside Bar não reproduzido nos candles históricos deve ser rejeitado', () => {
  const { candles, dates } = buildValidAscendingCandles();
  // Altera o candle do sinal para romper a máxima da barra-mãe (deixa de ser Inside Bar)
  const mutatedCandles = candles.map((c, idx) => idx === 80 ? { ...c, high: 41.50 } : c);
  const trade = buildValidReferenceTrade(mutatedCandles, dates);

  const audit = model.performIntegralTradeAudit(trade, mutatedCandles);
  assert.equal(audit.approved, false);
  assert.ok(audit.violatedRules.includes('INSIDE_BAR_NOT_REPRODUCIBLE'));
  assert.ok(audit.categories.includes(model.REJECTION_CATEGORIES.SETUP_DIVERGENCE));
  assert.equal(audit.questions10.q2_setupMetOfficialRules, false);
});

test('Caso 3 (Seção 6): Tendência incompatível com EMAs (médias descendentes) deve ser rejeitada', () => {
  const { candles, dates } = buildValidAscendingCandles();
  // Constrói série descendente onde EMA 10 < EMA 72 e inclinadas para baixo
  const downCandles = candles.map((c, i) => {
    if (i < 79) {
      const b = 60 - i * 0.25;
      return { ...c, open: b + 0.1, high: b + 0.3, low: b - 0.3, close: b - 0.15 };
    }
    return c;
  });
  const trade = buildValidReferenceTrade(downCandles, dates);

  const audit = model.performIntegralTradeAudit(trade, downCandles);
  assert.equal(audit.approved, false);
  assert.ok(audit.violatedRules.includes('TREND_MISALIGNMENT'));
  assert.ok(audit.categories.includes(model.REJECTION_CATEGORIES.MANDATORY_FILTER_VIOLATION));
  assert.equal(audit.questions10.q4_trendRsAndFiltersTrue, false);
});

test('Caso 4 (Seção 6): Entrada acima da máxima do candle de execução deve ser rejeitada', () => {
  const { candles, dates } = buildValidAscendingCandles();
  // No candle T+1 (índice 81), a máxima foi apenas 40.35 (< entrada 40.51)
  const lowHighCandles = candles.map((c, idx) => idx === 81 ? { ...c, open: 40.10, high: 40.35, low: 40.00, close: 40.20 } : c);
  const trade = buildValidReferenceTrade(lowHighCandles, dates);

  const audit = model.performIntegralTradeAudit(trade, lowHighCandles);
  assert.equal(audit.approved, false);
  assert.ok(audit.violatedRules.includes('ENTRY_ABOVE_CANDLE_HIGH'));
  assert.ok(audit.violatedRules.includes('ENTRY_PRICE_OUT_OF_OHLC_RANGE'));
  assert.ok(audit.categories.includes(model.REJECTION_CATEGORIES.IMPOSSIBLE_EXECUTION));
  assert.equal(audit.questions10.q5_entryExecutable, false);
});

test('Caso 5 (Seção 6): Entrada abaixo da mínima do candle de execução deve ser rejeitada', () => {
  const { candles, dates } = buildValidAscendingCandles();
  // O candle T+1 abriu em gap de alta em [41.00, 41.80], mas o trade registrou execução a 40.51 (abaixo da mínima 41.00)
  const gapUpCandles = candles.map((c, idx) => idx === 81 ? { ...c, open: 41.10, high: 41.80, low: 41.00, close: 41.50 } : c);
  const trade = buildValidReferenceTrade(gapUpCandles, dates);

  const audit = model.performIntegralTradeAudit(trade, gapUpCandles);
  assert.equal(audit.approved, false);
  assert.ok(audit.violatedRules.includes('ENTRY_BELOW_CANDLE_LOW'));
  assert.ok(audit.violatedRules.includes('ENTRY_PRICE_OUT_OF_OHLC_RANGE'));
  assert.equal(audit.questions10.q5_entryExecutable, false);
});

test('Caso 6 (Seção 6): Stop não atingido no candle de saída deve ser rejeitado', () => {
  const { candles, dates } = buildValidAscendingCandles();
  // Trade encerrado por Stop Loss a 39.49 em T+2 (índice 82), mas a mínima de T+2 foi 40.95 (nunca atingiu 39.49)
  const trade = {
    ...buildValidReferenceTrade(candles, dates),
    status: model.STATUS.CLOSED_LOSS,
    exitPrice: 39.49,
    currentPrice: 39.49,
    exitDate: dates[82],
    exitReason: 'Stop Loss (-1R)',
    resultR: -1.00,
    grossPnL: -102.00,
    netPnL: -102.00
  };

  const audit = model.performIntegralTradeAudit(trade, candles);
  assert.equal(audit.approved, false);
  assert.ok(audit.violatedRules.includes('STOP_NOT_REACHED'));
  assert.ok(audit.categories.includes(model.REJECTION_CATEGORIES.IMPOSSIBLE_EXECUTION));
  assert.equal(audit.questions10.q7_exitTradable, false);
});

test('Caso 7 (Seção 6): Alvo não atingido no candle de saída deve ser rejeitado', () => {
  const { candles, dates } = buildValidAscendingCandles();
  // No candle T+2 (índice 82), a máxima foi apenas 41.90 (< alvo 2R de 42.55)
  const noTargetCandles = candles.map((c, idx) => idx === 82 ? { ...c, open: 41.10, high: 41.90, low: 40.95, close: 41.70 } : c);
  const trade = buildValidReferenceTrade(noTargetCandles, dates);

  const audit = model.performIntegralTradeAudit(trade, noTargetCandles);
  assert.equal(audit.approved, false);
  assert.ok(audit.violatedRules.includes('TARGET_NOT_REACHED'));
  assert.equal(audit.questions10.q7_exitTradable, false);
});

test('Caso 8 (Seção 6): Saída fora do intervalo OHLC do candle deve ser rejeitada', () => {
  const { candles, dates } = buildValidAscendingCandles();
  // Saída registrada a R$ 45,00 quando o candle T+2 teve faixa [40.95, 42.80]
  const trade = {
    ...buildValidReferenceTrade(candles, dates),
    exitPrice: 45.00,
    currentPrice: 45.00,
    resultR: model.round2((45.00 - 40.51) / 1.02),
    grossPnL: 449.00,
    netPnL: 449.00
  };

  const audit = model.performIntegralTradeAudit(trade, candles);
  assert.equal(audit.approved, false);
  assert.ok(audit.violatedRules.includes('EXIT_PRICE_OUT_OF_OHLC_RANGE'));
  assert.equal(audit.questions10.q7_exitTradable, false);
});

test('Caso 9 (Seção 6): Execução antes do sinal (ou no mesmo candle do sinal) deve ser rejeitada', () => {
  const { candles, dates } = buildValidAscendingCandles();
  const trade = {
    ...buildValidReferenceTrade(candles, dates),
    entryDate: dates[79] // Anterior à data do sinal (dates[80])
  };

  const audit = model.performIntegralTradeAudit(trade, candles);
  assert.equal(audit.approved, false);
  assert.ok(audit.violatedRules.includes('EXECUTION_BEFORE_SIGNAL'));
  assert.ok(audit.violatedRules.includes('CHRONOLOGY_ERROR'));
  assert.ok(audit.categories.includes(model.REJECTION_CATEGORIES.TEMPORAL_INCONSISTENCY));
  assert.equal(audit.questions10.q5_entryExecutable, false);
});

test('Caso 10 (Seção 6): Indicador contaminado por dados futuros (look-ahead bias) deve ser rejeitado', () => {
  const { candles, dates } = buildValidAscendingCandles();
  const trade = {
    ...buildValidReferenceTrade(candles, dates),
    indicatorEvalDate: dates[82], // Calculado 2 dias no futuro após o sinal
    ema10AtSignal: 44.95 // Valor contaminado por candles futuros
  };

  const audit = model.performIntegralTradeAudit(trade, candles);
  assert.equal(audit.approved, false);
  assert.ok(audit.violatedRules.includes('LOOKAHEAD_CONTAMINATION'));
  assert.ok(audit.categories.includes(model.REJECTION_CATEGORIES.TEMPORAL_INCONSISTENCY));
  assert.equal(audit.questions10.q9_zeroLookAhead, false);
});

test('Caso 11 (Seção 6): Inconsistência de preços ajustados / eventos corporativos deve ser rejeitada', () => {
  const { candles, dates } = buildValidAscendingCandles();
  // Preço de entrada em outra escala (ex: pré-split R$ 81,02 enquanto série histórica ajustada está em R$ 40,50)
  const trade = {
    ...buildValidReferenceTrade(candles, dates),
    entryPrice: 81.02,
    stopLoss: 78.98,
    executedEntryPrice: 81.02,
    exitPrice: 85.10
  };

  const audit = model.performIntegralTradeAudit(trade, candles);
  assert.equal(audit.approved, false);
  assert.ok(audit.violatedRules.includes('ADJUSTED_PRICE_INCONSISTENCY'));
  assert.ok(audit.categories.includes(model.REJECTION_CATEGORIES.HISTORICAL_DATA_DIVERGENCE));
});

test('Caso 12 (Seção 6): Inconsistência entre preço, quantidade e resultado financeiro deve ser rejeitada', () => {
  const { candles, dates } = buildValidAscendingCandles();
  // 100 ações * (42.55 - 40.51) = +R$ 204,00, mas o registro afirma +R$ 950,00
  const trade = {
    ...buildValidReferenceTrade(candles, dates),
    shares: 100,
    grossPnL: 950.00,
    netPnL: 950.00
  };

  const audit = model.performIntegralTradeAudit(trade, candles);
  assert.equal(audit.approved, false);
  assert.ok(audit.violatedRules.includes('FINANCIAL_CALCULATION_ERROR'));
  assert.ok(audit.categories.includes(model.REJECTION_CATEGORIES.FINANCIAL_CALCULATION_ERROR));
  assert.equal(audit.questions10.q8_durationAndFinancialCoherent, false);
});

test('Caso 13 (Seção 6): Ativo sem liquidez suficiente (reprovado no Liquidity Gate) deve ser rejeitado', () => {
  const { candles, dates } = buildValidAscendingCandles();
  // Série ilíquida (volume diário R$ 15 mil e 12 negócios/dia)
  const illiquidCandles = candles.map(c => ({ ...c, volume: 15000, trades: 12 }));
  const trade = buildValidReferenceTrade(illiquidCandles, dates);

  const audit = model.performIntegralTradeAudit(trade, illiquidCandles);
  assert.equal(audit.approved, false);
  assert.ok(audit.violatedRules.includes('ILLIQUID_ASSET_BLOCKED'));
  assert.ok(audit.categories.includes(model.REJECTION_CATEGORIES.MANDATORY_FILTER_VIOLATION));
  assert.equal(audit.questions10.q4_trendRsAndFiltersTrue, false);
});

test('Caso 14 (Seção 6): Candle com gap de abertura deve executar no Open e rejeitar execução sem considerar o gap', () => {
  const { candles, dates } = buildValidAscendingCandles();
  // T+1 abre em gap de alta a 40.90 (> entrada planejada 40.51, com mínima 40.40 e máxima 41.20)
  const gapCandles = candles.map((c, idx) => idx === 81 ? { ...c, open: 40.90, high: 41.20, low: 40.40, close: 41.05 } : c);

  // Trade inválido que ignorou o gap de abertura e registrou entrada a 40.51
  const invalidGapTrade = buildValidReferenceTrade(gapCandles, dates);
  const auditInvalid = model.performIntegralTradeAudit(invalidGapTrade, gapCandles);
  assert.equal(auditInvalid.approved, false);
  assert.ok(auditInvalid.violatedRules.includes('OPENING_GAP_MISMATCH'));

  // Trade válido que executou na abertura (40.90) e realizou +2R (40.90 + 2 * 1.02 = 42.94) ou via evaluateSimulationOnCandles
  const evaluated = model.evaluateSimulationOnCandles(
    { ...invalidGapTrade, status: model.STATUS.WAITING_ENTRY },
    gapCandles
  );
  assert.equal(evaluated.executedEntryPrice, 40.90);
});

test('Caso 15 (Seção 6): Candle que atinge stop e alvo no mesmo período deve aplicar a regra conservadora (Stop primeiro)', () => {
  const { candles, dates } = buildValidAscendingCandles();
  // Em T+2 (índice 82), o candle atinge TANTO o stop inicial (39.49, mínima 39.20) QUANTO o alvo +2R (42.55, máxima 42.90)
  const ambiguousCandles = candles.map((c, idx) => idx === 82 ? { ...c, open: 40.80, high: 42.90, low: 39.20, close: 41.00 } : c);

  // Um registro otimista que considerou Gain (+2R) nesse candle ambíguo DEVE ser rejeitado
  const optimisticGainTrade = buildValidReferenceTrade(ambiguousCandles, dates);
  const auditOptimistic = model.performIntegralTradeAudit(optimisticGainTrade, ambiguousCandles);
  assert.equal(auditOptimistic.approved, false);
  assert.ok(auditOptimistic.violatedRules.includes('AMBIGUITY_RULE_VIOLATION'));
  assert.equal(auditOptimistic.questions10.q10_riskManagementRespected, false);

  // Já o motor oficial (evaluateSimulationOnCandles) encerra no Stop Loss (-1R a 39.49) e é APROVADO na auditoria
  const realisticEval = model.evaluateSimulationOnCandles(
    { ...optimisticGainTrade, status: model.STATUS.WAITING_ENTRY, shares: undefined, grossPnL: undefined, netPnL: undefined },
    ambiguousCandles
  );
  assert.equal(realisticEval.status, model.STATUS.CLOSED_LOSS);
  assert.equal(realisticEval.exitPrice, 39.49);
  assert.equal(realisticEval.resultR, -1.00);
  const auditRealistic = model.performIntegralTradeAudit(realisticEval, ambiguousCandles);
  assert.equal(auditRealistic.approved, true, `Erros inesperados: ${JSON.stringify(auditRealistic.errors)}`);
});

test('Caso Concreto Reportado (KEPL3 17/09/2026): detecta todas as falhas históricas, rejeita o trade e o exclui das estatísticas', (t) => {
  const b3Map = tickerChart.loadB3History();
  const keplCandles = b3Map && b3Map.get('KEPL3');
  if (!keplCandles || keplCandles.length === 0) {
    return t.skip('Cache B3 de KEPL3 indisponível neste ambiente');
  }

  // O registro exato de KEPL3 em 17/09/2026 apontado no relatório de auditoria
  const keplTrade = {
    id: 'sim-kepl3-35',
    symbol: 'KEPL3',
    companyName: 'Kepler Weber',
    triggerName: 'Inside Bar',
    grade: 'B',
    sector: 'Bens Industriais',
    signalDate: '2026-09-17',
    entryPrice: 10.80,
    stopLoss: 10.10,
    status: model.STATUS.CLOSED_LOSS,
    executedEntryPrice: 10.80,
    entryDate: '2026-09-18',
    currentPrice: 10.10,
    exitPrice: 10.10,
    exitDate: '2026-09-24',
    exitReason: 'Stop Loss',
    resultR: -1.00,
    mfeR: 0.45,
    maeR: -1.00,
    rsScore: 80,
    marketCycle: 'Positivo',
    marketPermission: { isPermitted: true, benchmarkSymbol: 'IBOV', evalDate: '2026-09-17' },
    simulationMode: 'OFFICIAL'
  };

  const audit = model.performIntegralTradeAudit(keplTrade, keplCandles);
  assert.equal(audit.approved, false, 'KEPL3 17/09/2026 jamais pode ser aprovado');
  assert.equal(audit.status, 'REJECTED');

  // Verifica as 4 divergências relatadas pelo usuário:
  // 1. Setup Inside Bar não reproduzido
  assert.ok(audit.violatedRules.includes('INSIDE_BAR_NOT_REPRODUCIBLE'), 'Deve detectar que o Inside Bar não existe em 17/09/2026');
  // 2. Tendência incompatível (EMAs 10 e 72 descendentes)
  assert.ok(audit.violatedRules.includes('TREND_MISALIGNMENT'), 'Deve detectar desalinhamento das EMAs 10 e 72');
  // 3. Entrada impossível (R$ 10,80 quando máxima de 18/09/2026 foi R$ 6,58)
  assert.ok(audit.violatedRules.includes('ENTRY_ABOVE_CANDLE_HIGH'), 'Deve detectar entrada impossível acima da máxima de R$ 6,58');
  // 4. Saída impossível (R$ 10,10 quando máxima de 24/09/2026 foi R$ 6,50)
  assert.ok(audit.violatedRules.includes('EXIT_PRICE_OUT_OF_OHLC_RANGE'), 'Deve detectar saída fora da faixa OHLC de 24/09/2026');

  // Verifica higienização em lote e recálculo de estatísticas (trade rejeitado NÃO impacta métricas)
  const { candles, dates } = buildValidAscendingCandles();
  const validTrade = buildValidReferenceTrade(candles, dates);
  const combinedMap = new Map([
    ['KEPL3', keplCandles],
    ['WEGE3', candles]
  ]);

  const batchResult = model.auditAndSanitizeSimulationsBatch([validTrade, keplTrade], {
    candlesMap: combinedMap
  });

  assert.equal(batchResult.approvedTrades.length, 1);
  assert.equal(batchResult.approvedTrades[0].symbol, 'WEGE3');
  assert.equal(batchResult.rejectedTrades.length, 1);
  assert.equal(batchResult.rejectedTrades[0].symbol, 'KEPL3');
  assert.equal(batchResult.rejectedTrades[0].rejectionStatus, 'REJECTED');

  // Estatísticas refletem EXCLUSIVAMENTE o trade válido (+2.00R, 100% Win Rate, 0 derrotas)
  assert.equal(batchResult.stats.closedTradesCount, 1);
  assert.equal(batchResult.stats.winningTradesCount, 1);
  assert.equal(batchResult.stats.losingTradesCount, 0);
  assert.equal(batchResult.stats.winRate, 100);
  assert.equal(batchResult.stats.totalR, 2.00);
});
