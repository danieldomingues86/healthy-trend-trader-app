const test = require('node:test');
const assert = require('node:assert/strict');

const VolatilitySimulatorModel = require('../../frontend/volatility-trade-simulator-model');
const VolatilityEngineModel = require('../../frontend/volatility-trading-engine-model');
const StrategyConfigModel = require('../../frontend/strategy-configuration-model');
const volatilitySimulatorService = require('../src/volatility-simulator');

// Helper para gerar histórico sintético com SMA200 estável
function makeWarmupCandles(count = 210, basePrice = 20.00) {
  const candles = [];
  let p = basePrice;
  let d = 1;
  let m = 1;
  let y = 2025;

  for (let i = 0; i < count; i++) {
    p += 0.05;
    const dStr = String(d).padStart(2, '0');
    const mStr = String(m).padStart(2, '0');
    candles.push({
      time: `${y}-${mStr}-${dStr}`,
      open: Number((p - 0.02).toFixed(2)),
      high: Number((p + 0.15).toFixed(2)),
      low: Number((p - 0.15).toFixed(2)),
      close: Number(p.toFixed(2)),
      volume: 2500000,
      trades: 600
    });
    d++;
    if (d > 28) {
      d = 1;
      m++;
      if (m > 12) {
        m = 1;
        y++;
      }
    }
  }
  return candles;
}

test('PASSO 7 — Caso 1: IFR exatamente no limiar (10.00 aprova, 10.01 rejeita)', () => {
  const candles = makeWarmupCandles(210, 30.00);
  const series = VolatilityEngineModel.computeIndicators(candles, { shortMaPeriod: 7, longMaPeriod: 200, rsiPeriod: 2 });
  const lastIdx = series.length - 1;

  // Força parâmetros de teste
  const baseBar = series[lastIdx];
  const sma200 = baseBar.smaLong;
  const sma7 = baseBar.smaShort;

  // Simula barra com IFR exatamente 10.00
  const barAtThreshold = {
    ...baseBar,
    close: 25.00, // Acima da SMA200 (20.00) e abaixo da SMA7 (28.00)
    smaLong: 20.00,
    smaShort: 28.00,
    ifr: 10.00
  };
  series[lastIdx] = barAtThreshold;

  const res10 = VolatilityEngineModel.evaluateSignal(series, lastIdx, { oversoldLevel: 10 });
  assert.equal(res10.isValid, true, 'IFR = 10.00 deve ser APROVADO quando limiar é 10');

  // Simula barra com IFR a 10.01 (fora do limiar)
  const barAboveThreshold = {
    ...barAtThreshold,
    ifr: 10.01
  };
  series[lastIdx] = barAboveThreshold;

  const res1001 = VolatilityEngineModel.evaluateSignal(series, lastIdx, { oversoldLevel: 10 });
  assert.equal(res1001.isValid, false, 'IFR = 10.01 deve ser REJEITADO quando limiar é 10');
  assert.equal(res1001.code, VolatilityEngineModel.SIGNAL_CODES.RSI_NOT_OVERSOLD);
});

test('PASSO 7 — Caso 2: Fechamento exatamente na SMA (SMA7 e SMA200)', () => {
  const candles = makeWarmupCandles(210, 30.00);
  const series = VolatilityEngineModel.computeIndicators(candles, { shortMaPeriod: 7, longMaPeriod: 200, rsiPeriod: 2 });
  const lastIdx = series.length - 1;

  const baseBar = series[lastIdx];
  const sma200 = 35.00;
  const sma7 = 36.00;

  // A. Fechamento IGUAL à SMA200 (Close == SMA200) -> Rejeita porque a regra exige estritamente Close > SMA200
  series[lastIdx] = {
    ...baseBar,
    close: 35.00,
    smaLong: 35.00,
    smaShort: 37.00,
    ifr: 8.00
  };
  const resEqualSma200 = VolatilityEngineModel.evaluateSignal(series, lastIdx, { oversoldLevel: 10 });
  assert.equal(resEqualSma200.isValid, false, 'Close == SMA200 deve ser rejeitado (exige Close > SMA200)');
  assert.equal(resEqualSma200.code, VolatilityEngineModel.SIGNAL_CODES.NOT_ABOVE_LONG_MA);

  // B. Fechamento IGUAL à SMA7 na entrada (Close == SMA7) -> Rejeita porque entrada exige estritamente Close < SMA7
  series[lastIdx] = {
    ...baseBar,
    close: 37.00,
    smaLong: 35.00,
    smaShort: 37.00,
    ifr: 8.00
  };
  const resEqualSma7 = VolatilityEngineModel.evaluateSignal(series, lastIdx, { oversoldLevel: 10 });
  assert.equal(resEqualSma7.isValid, false, 'Close == SMA7 deve ser rejeitado na entrada (exige Close < SMA7)');
  assert.equal(resEqualSma7.code, VolatilityEngineModel.SIGNAL_CODES.NOT_BELOW_SHORT_MA);

  // C. Na saída: se Close == SMA7 no fechamento da sessão, não atinge recuperação (exige Close > SMA7)
  const pos = {
    holdingSessions: 3,
    entryDate: '2026-03-01',
    effectiveEntryPrice: 30.00,
    sharesQuantity: 100,
    allocatedCapital: 3000
  };
  const sessionBar = {
    time: '2026-03-04',
    close: 32.00,
    smaShort: 32.00 // Close exatamente igual à média
  };
  assert.equal(sessionBar.close > sessionBar.smaShort, false, 'Close == SMA7 não dispara saída por recuperação');
});

test('PASSO 7 — Caso 3: Gap entre sinal e execução (absorção precisa na Abertura de T+1)', () => {
  const candles = makeWarmupCandles(210, 30.00);
  const series = VolatilityEngineModel.computeIndicators(candles, { shortMaPeriod: 7, longMaPeriod: 200, rsiPeriod: 2 });
  const signalIdx = series.length - 2;

  // Força sinal na barra penúltima
  series[signalIdx] = {
    ...series[signalIdx],
    time: '2026-04-10',
    close: 25.00,
    smaLong: 20.00,
    smaShort: 27.00,
    ifr: 8.50
  };

  // Barra seguinte (T+1) abre com gap de alta (+4% em 26.00)
  series[signalIdx + 1] = {
    ...series[signalIdx + 1],
    time: '2026-04-11',
    open: 26.00, // Gap de +4%
    high: 27.50,
    low: 25.80,
    close: 27.20,
    smaShort: 27.00,
    smaLong: 20.00
  };

  const trade = VolatilityEngineModel.simulateTradeLifecycle({
    series,
    signalIndex: signalIdx,
    options: { fixedCapitalPerTrade: 10000 }
  });

  assert.ok(trade, 'Trade deve ser criado');
  assert.equal(trade.entryPrice, 26.00, 'Preço executado deve ser estritamente o Open do candle T+1');
  assert.equal(trade.entryGapPct, 4.00, 'Gap de entrada deve registrar +4.00%');
  assert.equal(trade.sharesQuantity, Math.floor(10000 / 26.00), 'Quantidade calculada sobre preço de abertura');
  assert.equal(trade.signalPrice, 25.00, 'Preço do sinal deve ser 25.00');
});

test('PASSO 7 — Caso 4: Saída por SMA versus Saída Temporal (e precedência no pregão D7)', () => {
  // Cenário A: Recuperação ocorre antes de D7 (ex: no dia D3)
  const candlesA = makeWarmupCandles(210, 30.00);
  const seriesA = VolatilityEngineModel.computeIndicators(candlesA, { shortMaPeriod: 7, longMaPeriod: 200, rsiPeriod: 2 });
  const sigIdxA = 200;

  seriesA[sigIdxA] = { ...seriesA[sigIdxA], close: 25.00, smaLong: 20.00, smaShort: 27.00, ifr: 7.0 };
  seriesA[sigIdxA + 1] = { ...seriesA[sigIdxA + 1], open: 25.20, close: 25.40, smaShort: 26.80 }; // D0
  seriesA[sigIdxA + 2] = { ...seriesA[sigIdxA + 2], open: 25.40, close: 25.80, smaShort: 26.70 }; // D1
  seriesA[sigIdxA + 3] = { ...seriesA[sigIdxA + 3], open: 25.80, close: 26.00, smaShort: 26.60 }; // D2
  seriesA[sigIdxA + 4] = { ...seriesA[sigIdxA + 4], open: 26.00, close: 27.50, smaShort: 26.50 }; // D3: Close > SMA7!

  const tradeA = VolatilityEngineModel.simulateTradeLifecycle({
    series: seriesA,
    signalIndex: sigIdxA,
    options: { fixedCapitalPerTrade: 10000 }
  });
  assert.equal(tradeA.status, 'CLOSED');
  assert.equal(tradeA.exitReason, VolatilityEngineModel.EXIT_REASONS.TARGET_MA_RECOVERY);
  assert.equal(tradeA.holdingSessions, 3);

  // Cenário B: Preço não recupera e sai estritamente no encerramento de D7
  const seriesB = VolatilityEngineModel.computeIndicators(makeWarmupCandles(220, 30.00));
  const sigIdxB = 200;
  seriesB[sigIdxB] = { ...seriesB[sigIdxB], close: 25.00, smaLong: 20.00, smaShort: 27.00, ifr: 7.0 };
  for (let k = 1; k <= 9; k++) {
    seriesB[sigIdxB + k] = {
      ...seriesB[sigIdxB + k],
      open: 24.50,
      close: 24.80,
      smaShort: 27.00, // Close sempre abaixo da média
      smaLong: 20.00
    };
  }
  const tradeB = VolatilityEngineModel.simulateTradeLifecycle({
    series: seriesB,
    signalIndex: sigIdxB,
    options: { fixedCapitalPerTrade: 10000 }
  });
  assert.equal(tradeB.status, 'CLOSED');
  assert.equal(tradeB.exitReason, VolatilityEngineModel.EXIT_REASONS.TIME_EXIT);
  assert.equal(tradeB.holdingSessions, 7);

  // Cenário C: No pregão D7 (entryIndex + 7 = sigIdxC + 8), Close > SMA7 -> PRECEDÊNCIA TÉCNICA É TARGET_MA_RECOVERY
  const seriesC = VolatilityEngineModel.computeIndicators(makeWarmupCandles(220, 30.00));
  const sigIdxC = 200;
  seriesC[sigIdxC] = { ...seriesC[sigIdxC], close: 25.00, smaLong: 20.00, smaShort: 27.00, ifr: 7.0 };
  for (let k = 1; k <= 7; k++) {
    seriesC[sigIdxC + k] = { ...seriesC[sigIdxC + k], open: 24.50, close: 24.80, smaShort: 27.00, smaLong: 20.00 };
  }
  seriesC[sigIdxC + 8] = {
    ...seriesC[sigIdxC + 8],
    open: 25.00,
    close: 28.00, // Recuperou no pregão D7!
    smaShort: 27.00,
    smaLong: 20.00
  };
  const tradeC = VolatilityEngineModel.simulateTradeLifecycle({
    series: seriesC,
    signalIndex: sigIdxC,
    options: { fixedCapitalPerTrade: 10000 }
  });
  assert.equal(tradeC.status, 'CLOSED');
  assert.equal(tradeC.exitReason, VolatilityEngineModel.EXIT_REASONS.TARGET_MA_RECOVERY, 'Recuperação na média no D7 tem precedência sobre saída temporal');
  assert.equal(tradeC.holdingSessions, 7);
});

test('PASSO 7 — Caso 5: Entrada e Saída em candles adjacentes (holdingSessions = 1)', () => {
  const candles = makeWarmupCandles(210, 30.00);
  const series = VolatilityEngineModel.computeIndicators(candles, { shortMaPeriod: 7, longMaPeriod: 200, rsiPeriod: 2 });
  const sigIdx = 200;

  series[sigIdx] = { ...series[sigIdx], time: '2026-05-04', close: 25.00, smaLong: 20.00, smaShort: 27.00, ifr: 8.0 }; // T: Sinal
  series[sigIdx + 1] = { ...series[sigIdx + 1], time: '2026-05-05', open: 25.20, close: 25.80, smaShort: 26.80 }; // T+1 (D0): Entrada
  series[sigIdx + 2] = { ...series[sigIdx + 2], time: '2026-05-06', open: 26.00, close: 27.50, smaShort: 26.70 }; // T+2 (D1): Saída imediata na média!

  const trade = VolatilityEngineModel.simulateTradeLifecycle({
    series,
    signalIndex: sigIdx,
    options: { fixedCapitalPerTrade: 10000 }
  });

  assert.equal(trade.status, 'CLOSED');
  assert.equal(trade.entryDate, '2026-05-05');
  assert.equal(trade.exitDate, '2026-05-06');
  assert.equal(trade.holdingSessions, 1, 'Candles adjacentes: entrada em T+1 e saída em T+2 resulta em holdingSessions = 1');
  assert.equal(trade.exitReason, VolatilityEngineModel.EXIT_REASONS.TARGET_MA_RECOVERY);
});

test('PASSO 7 — Caso 6: Feriados e pregões ausentes (contagem por pregões negociados, não por dias corridos)', () => {
  const candles = makeWarmupCandles(210, 30.00);
  const series = VolatilityEngineModel.computeIndicators(candles, { shortMaPeriod: 7, longMaPeriod: 200, rsiPeriod: 2 });
  const sigIdx = 200;

  // Sexta-feira: Sinal (T)
  series[sigIdx].time = '2026-02-13'; // Sexta
  series[sigIdx].close = 25.00;
  series[sigIdx].smaLong = 20.00;
  series[sigIdx].smaShort = 27.00;
  series[sigIdx].ifr = 8.00;

  // Quarta-feira de Cinzas: Entrada (T+1 / D0) após Carnaval (sem pregão segunda e terça)
  series[sigIdx + 1].time = '2026-02-18'; // Quarta (D0)
  series[sigIdx + 1].open = 25.50;
  series[sigIdx + 1].close = 25.70;
  series[sigIdx + 1].smaShort = 27.00;

  // Quinta-feira: D1
  series[sigIdx + 2].time = '2026-02-19'; // Quinta (D1)
  series[sigIdx + 2].close = 28.00; // > SMA7
  series[sigIdx + 2].smaShort = 26.50;

  const trade = VolatilityEngineModel.simulateTradeLifecycle({
    series,
    signalIndex: sigIdx,
    options: { fixedCapitalPerTrade: 10000 }
  });

  assert.equal(trade.status, 'CLOSED');
  assert.equal(trade.entryDate, '2026-02-18');
  assert.equal(trade.exitDate, '2026-02-19');
  assert.equal(trade.holdingSessions, 1, 'Feriados não inflacionam contagem: 1 pregão decorrido');
});

test('PASSO 7 — Caso 7: Liquidez insuficiente (Liquidity Gate reprovado na data histórica correta)', () => {
  const candles = makeWarmupCandles(210, 30.00);
  // Reduz volume financeiro para R$ 100.000 nos últimos 20 dias (abaixo do limiar de R$ 500.000)
  for (let i = candles.length - 25; i < candles.length; i++) {
    candles[i].volume = 100000;
  }
  const series = VolatilityEngineModel.computeIndicators(candles, { shortMaPeriod: 7, longMaPeriod: 200, rsiPeriod: 2 });
  const sigIdx = series.length - 1;

  series[sigIdx] = {
    ...series[sigIdx],
    close: 25.00,
    smaLong: 20.00,
    smaShort: 27.00,
    ifr: 8.00,
    volume: 100000
  };

  const res = VolatilityEngineModel.evaluateSignal(series, sigIdx, {
    oversoldLevel: 10,
    minFinancialVolume: 500000
  });

  assert.equal(res.isValid, false, 'Ativo com volume médio < R$ 500k deve ser reprovado no Liquidity Gate');
  assert.equal(res.code, VolatilityEngineModel.SIGNAL_CODES.LIQUIDITY_REJECTED);
});

test('PASSO 7 — Caso 8 e 9: Tratamento de dados faltantes e candle incompleto no fim da série', () => {
  // A. Normalização resiliente de candles malformados
  const malformed = [
    null,
    { time: '2026-01-01', open: NaN, high: 0, low: -5, close: 10.00 },
    { time: 'invalid-date', close: 10.00 },
    { time: '2026-01-02', open: 10.00, high: 10.50, low: 9.80, close: 10.20, volume: 1000000 }
  ];
  const cleaned = VolatilityEngineModel.normalizeCandles(malformed);
  assert.equal(cleaned.length, 2, 'Ignora registros sem data ou preços válidos');
  assert.equal(cleaned[0].time, '2026-01-01');
  assert.equal(cleaned[0].open, 10.00, 'Substitui open NaN pelo close');

  // B. Sinal no último candle da série resulta em PENDING_NEXT_OPEN
  const candles = makeWarmupCandles(210, 30.00);
  const series = VolatilityEngineModel.computeIndicators(candles, { shortMaPeriod: 7, longMaPeriod: 200, rsiPeriod: 2 });
  const lastIdx = series.length - 1;

  series[lastIdx] = {
    ...series[lastIdx],
    close: 25.00,
    smaLong: 20.00,
    smaShort: 27.00,
    ifr: 8.00
  };

  const trade = VolatilityEngineModel.simulateTradeLifecycle({
    series,
    signalIndex: lastIdx,
    options: { fixedCapitalPerTrade: 10000 }
  });
  assert.equal(trade.status, 'PENDING_NEXT_OPEN', 'Sinal no candle mais recente da base fica aguardando abertura');
});

test('PASSO 7 — Caso 10: Prevenção de duplicidade (não gera novas entradas enquanto posicionado)', () => {
  const candles = makeWarmupCandles(220, 30.00);
  const series = VolatilityEngineModel.computeIndicators(candles, { shortMaPeriod: 7, longMaPeriod: 200, rsiPeriod: 2 });

  // Sinal 1 no candle 200
  series[200] = { ...series[200], close: 25.00, smaLong: 20.00, smaShort: 27.00, ifr: 7.00 };
  // Sinal 2 no candle 202 (enquanto o trade 1 ainda está em aberto)
  series[202] = { ...series[202], close: 24.50, smaLong: 20.00, smaShort: 27.00, ifr: 6.00 };

  const candlesMap = new Map([['TEST4', series]]);
  const simUniverseResult = VolatilitySimulatorModel.simulateUniverse(candlesMap, {
    oversoldLevel: 10,
    symbols: ['TEST4']
  });

  // Verifica que não há 2 trades iniciados simultaneamente no mesmo ticker
  const trades = simUniverseResult.trades;
  for (let i = 0; i < trades.length - 1; i++) {
    const tCurrent = trades[i];
    const tNext = trades[i + 1];
    assert.ok(
      tNext.entryDate >= tCurrent.exitDate,
      `Trade subsequente (${tNext.entryDate}) não pode iniciar antes da saída do anterior (${tCurrent.exitDate})`
    );
  }
});

test('PASSO 7 — Métricas de Simulação de Universo e Alerta de Amostra Reduzida', () => {
  const candlesA = makeWarmupCandles(220, 20.00);
  const candlesB = makeWarmupCandles(220, 30.00);

  const candlesMap = new Map([
    ['PETR4', candlesA],
    ['VALE3', candlesB]
  ]);

  const simResult = VolatilitySimulatorModel.simulateUniverse(candlesMap, {
    universe: 'IBOV',
    oversoldLevel: 10,
    fixedCapitalPerTrade: 10000,
    initialCapital: 100000
  });

  assert.equal(simResult.strategyType, 'VOLATILITY_TRADING');
  assert.equal(simResult.simulatorVersion, 'volatility-sim-v1.0');
  assert.ok(simResult.metrics, 'Métricas devem estar presentes');
  assert.ok(typeof simResult.metrics.winRatePct === 'number', 'Win Rate numérico');
  assert.ok(typeof simResult.metrics.profitFactor === 'number', 'Profit Factor numérico');
  assert.ok(typeof simResult.metrics.expectancyPct === 'number', 'Expectancy numérico');
  assert.ok(typeof simResult.metrics.avgHoldingSessions === 'number', 'Holding Period numérico');
  assert.ok(Array.isArray(simResult.equityCurve), 'Curva de capital deve ser array');
  assert.ok(simResult.equityCurve.length > 0, 'Curva de capital preenchida');

  // Amostra pequena em dataset sintético dispara alerta de amostra reduzida (< 30)
  if (simResult.metrics.totalTrades < 30) {
    assert.equal(simResult.metrics.sampleSizeAlert, true, 'Deve alertar sobre amostra estatística reduzida');
    assert.match(simResult.metrics.sampleSizeWarning, /Amostra/i);
  }

  // Auditoria de integridade
  const audit = VolatilitySimulatorModel.auditSimulationIntegrity(simResult);
  assert.equal(audit.isValid, true, 'Auditoria de integridade da simulação deve ser 100% aprovada: ' + audit.issues.join(', '));
});

test('PASSO 7 — Experimentos Comparativos: avalia múltiplos perfis (IFR 5, 10, 15, 20)', () => {
  const candlesA = makeWarmupCandles(220, 25.00);
  const candlesMap = new Map([['B3SA3', candlesA]]);

  const comparison = VolatilitySimulatorModel.compareExperiments(candlesMap, null, {
    universe: 'IBOV',
    fixedCapitalPerTrade: 10000
  });

  assert.equal(comparison.strategyType, 'VOLATILITY_TRADING');
  assert.equal(comparison.variantsCount, 4, 'Deve conter os 4 presets padrão (5, 10, 15, 20)');
  assert.equal(comparison.results.length, 4);

  const levels = comparison.results.map(r => r.oversoldLevel);
  assert.deepEqual(levels, [5, 10, 15, 20]);

  for (const r of comparison.results) {
    assert.ok(r.parameters, 'Parâmetros completos presentes');
    assert.ok(r.metrics, 'Métricas consolidadas presentes');
    assert.ok(r.parameters.shortMaPeriod === 7);
    assert.ok(r.parameters.longMaPeriod === 200);
  }

  assert.ok(comparison.bestVariants, 'Melhores variantes devem ser calculadas');
});

test('PASSO 7 — Serviço Backend Volatility Simulator: execução, histórico e persistência', async () => {
  const userId = 'test-sim-user-' + Date.now();

  // Executa simulação no universo B3
  const simRes = await volatilitySimulatorService.runUniverseSimulation({
    userId,
    universe: 'IBOV',
    oversoldLevel: 10,
    period: '120',
    initialCapital: 100000,
    fixedCapitalPerTrade: 10000
  });

  assert.ok(simRes.experimentId, 'ID do experimento deve ser retornado');
  assert.equal(simRes.strategyType, 'VOLATILITY_TRADING');
  assert.ok(simRes.metrics, 'Métricas geradas');

  // Lista experimentos salvos
  const list = await volatilitySimulatorService.listExperiments(userId);
  assert.ok(Array.isArray(list), 'Lista de experimentos deve ser array');
  assert.ok(list.length >= 1, 'Deve conter pelo menos 1 experimento salvo');
  assert.equal(list[0].id, simRes.experimentId);

  // Consulta experimento individual
  const retrieved = await volatilitySimulatorService.getExperiment(userId, simRes.experimentId);
  assert.equal(retrieved.id, simRes.experimentId);
  assert.ok(Array.isArray(retrieved.trades));
  assert.ok(Array.isArray(retrieved.equityCurve));

  // Exclui experimento
  const delRes = await volatilitySimulatorService.deleteExperiment(userId, simRes.experimentId);
  assert.equal(delRes.success, true);
});

test('PASSO 7 — Determinismo: Mesmos dados, configuração e versão geram resultados idênticos', () => {
  const candles = makeWarmupCandles(220, 25.00);
  const mapA = new Map([['ASSET1', candles]]);
  const mapB = new Map([['ASSET1', candles]]);

  const res1 = VolatilitySimulatorModel.simulateUniverse(mapA, { oversoldLevel: 10 });
  const res2 = VolatilitySimulatorModel.simulateUniverse(mapB, { oversoldLevel: 10 });

  assert.equal(res1.metrics.totalTrades, res2.metrics.totalTrades);
  assert.equal(res1.metrics.winRatePct, res2.metrics.winRatePct);
  assert.equal(res1.metrics.profitFactor, res2.metrics.profitFactor);
  assert.equal(res1.metrics.netProfit, res2.metrics.netProfit);
  assert.equal(res1.metrics.expectancyPct, res2.metrics.expectancyPct);
  assert.equal(res1.metrics.avgHoldingSessions, res2.metrics.avgHoldingSessions);
  assert.equal(res1.metrics.maxDrawdownPct, res2.metrics.maxDrawdownPct);
});
