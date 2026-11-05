const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const marketRegime = require('../src/market-regime');
const marketCycleModel = require('../../frontend/market-cycle-model');

describe('Market Regime Engine — Classificação dos 6 Regimes de Mercado', () => {

  test('Metadados canônicos dos 6 regimes estão presentes e completos', () => {
    const expectedRegimes = [
      'UP_QUIET',
      'UP_VOLATILE',
      'SIDEWAYS_QUIET',
      'SIDEWAYS_VOLATILE',
      'DOWN_QUIET',
      'DOWN_VOLATILE'
    ];

    assert.equal(Object.keys(marketRegime.REGIMES).length, 6);
    for (const key of expectedRegimes) {
      assert.ok(marketRegime.REGIMES[key], `Regime ${key} deve existir em REGIMES`);
      const meta = marketRegime.REGIME_METADATA[key];
      assert.ok(meta, `Metadados de ${key} devem existir`);
      assert.ok(meta.label, 'Deve ter label');
      assert.ok(meta.color, 'Deve ter cor');
      assert.ok(meta.direction, 'Deve ter direção');
      assert.ok(meta.volatility, 'Deve ter volatilidade');
    }
  });

  test('calculateTrueRange: cálculo exato com High/Low e fallback para Close', () => {
    // Caso 1: OHLC completo
    const c1 = { high: 110, low: 100, close: 105 };
    const prev1 = { close: 102 };
    // TR = max(110-100, |110-102|, |100-102|) = max(10, 8, 2) = 10
    assert.equal(marketRegime.calculateTrueRange(c1, prev1), 10);

    // Caso 2: Gap de alta onde prevClose é relevante
    const c2 = { high: 120, low: 115, close: 118 };
    const prev2 = { close: 105 };
    // TR = max(120-115, |120-105|, |115-105|) = max(5, 15, 10) = 15
    assert.equal(marketRegime.calculateTrueRange(c2, prev2), 15);

    // Caso 3: Fallback quando High/Low ausentes (B3 Index Proxy)
    const c3 = { close: 130 };
    const prev3 = { close: 125 };
    assert.equal(marketRegime.calculateTrueRange(c3, prev3), 5);
  });

  test('calculateWilderATRSeries: suavização de Wilder com período 21', () => {
    // Gerar 50 candles sintéticos com variação constante de 10 por pregão
    const candles = Array.from({ length: 50 }, (_, i) => ({
      date: `2025-01-${String(i + 1).padStart(2, '0')}`,
      high: 100 + i * 2 + 10,
      low: 100 + i * 2,
      close: 100 + i * 2 + 5
    }));

    const atrs = marketRegime.calculateWilderATRSeries(candles, 21);
    assert.equal(atrs.length, 50);

    // Primeiros 20 valores devem ser null (aquecimento)
    for (let i = 0; i < 21; i++) {
      assert.equal(atrs[i], null, `Índice ${i} deve ser null`);
    }

    // No índice 21 (21º candle de ATR), o valor deve ser a média dos TRs
    assert.ok(Number.isFinite(atrs[21]));
    assert.ok(atrs[21] > 0);

    // No índice 22, o cálculo segue Wilder: (prev * 20 + tr) / 21
    const tr22 = marketRegime.calculateTrueRange(candles[22], candles[21]);
    const expectedAtr22 = (atrs[21] * 20 + tr22) / 21;
    assert.ok(Math.abs(atrs[22] - expectedAtr22) < 0.0001);
  });

  test('calculateATRPercentageSeries: calcula (ATR(21) / Close) * 100', () => {
    const candles = Array.from({ length: 30 }, (_, i) => ({
      date: `2025-01-${String(i + 1).padStart(2, '0')}`,
      high: 105,
      low: 95,
      close: 100
    }));

    const series = marketRegime.calculateATRPercentageSeries(candles, 21);
    assert.equal(series.length, 30);
    const valid = series.filter(s => s.atrPct !== null);
    assert.equal(valid.length, 9); // de 21 a 29 = 9 valores
    assert.ok(valid[0].atrPct > 0);
  });

  test('calculateVolatility: retorna INSUFFICIENT_DATA se histórico < 252 pregões de ATR%', () => {
    // 200 candles (insuficiente para 21 + 252 pregões)
    const candles = Array.from({ length: 200 }, (_, i) => ({
      date: `2025-01-${String(i + 1).padStart(2, '0')}`,
      high: 105,
      low: 95,
      close: 100
    }));

    const res = marketRegime.calculateVolatility(candles, 21, 252);
    assert.equal(res.volatility, 'INSUFFICIENT_DATA');
    assert.equal(res.status, 'INSUFFICIENT_DATA');
    assert.ok(res.reason.includes('insuficiente'));
  });

  test('calculateVolatility: classifica QUIET e VOLATILE corretamente quando >= 252 pregões', () => {
    // 300 candles estáveis com variação baixa (TR = 2)
    const candlesQuiet = Array.from({ length: 300 }, (_, i) => ({
      date: `2025-01-${i}`,
      high: 100 + i * 0.1 + 1,
      low: 100 + i * 0.1 - 1,
      close: 100 + i * 0.1
    }));

    const resQuiet = marketRegime.calculateVolatility(candlesQuiet, 21, 252);
    assert.equal(resQuiet.status, 'OK');
    assert.equal(resQuiet.volatility, 'QUIET');
    assert.ok(Number.isFinite(resQuiet.atr21));
    assert.ok(Number.isFinite(resQuiet.atrPct));
    assert.ok(Number.isFinite(resQuiet.atrPctSma252));
    assert.ok(Number.isFinite(resQuiet.volatilityDeviation));

    // Agora adiciona 10 candles de alta volatilidade súbita
    const candlesVolatile = [...candlesQuiet];
    for (let k = 0; k < 10; k++) {
      candlesVolatile.push({
        date: `2026-01-${k}`,
        high: 200,
        low: 50,
        close: 120
      });
    }

    const resVolatile = marketRegime.calculateVolatility(candlesVolatile, 21, 252);
    assert.equal(resVolatile.volatility, 'VOLATILE');
    assert.ok(resVolatile.volatilityDeviation > 0);
  });

  test('classifyDirection: UP, DOWN e SIDEWAYS reutilizando EMA 10 e EMA 72', () => {
    // UP: price > ema10 && price > ema72
    const upReading = { price: 130, ema10: 120, ema72: 110 };
    assert.equal(marketRegime.classifyDirection(upReading).direction, 'UP');

    // DOWN: price < ema10 && price < ema72
    const downReading = { price: 90, ema10: 110, ema72: 120 };
    assert.equal(marketRegime.classifyDirection(downReading).direction, 'DOWN');

    // SIDEWAYS: entre as médias
    const sidewaysReading1 = { price: 115, ema10: 120, ema72: 110 };
    assert.equal(marketRegime.classifyDirection(sidewaysReading1).direction, 'SIDEWAYS');

    // SIDEWAYS: igual a uma das médias
    const sidewaysReading2 = { price: 120, ema10: 120, ema72: 110 };
    assert.equal(marketRegime.classifyDirection(sidewaysReading2).direction, 'SIDEWAYS');

    // Insuficiente
    const insufficient = { price: null, ema10: 120, ema72: 110 };
    assert.equal(marketRegime.classifyDirection(insufficient).direction, 'INSUFFICIENT_DATA');
  });

  test('combineRegime: mapeia determinísticamente os 6 regimes canônicos', () => {
    assert.equal(marketRegime.combineRegime('UP', 'QUIET'), 'UP_QUIET');
    assert.equal(marketRegime.combineRegime('UP', 'VOLATILE'), 'UP_VOLATILE');
    assert.equal(marketRegime.combineRegime('SIDEWAYS', 'QUIET'), 'SIDEWAYS_QUIET');
    assert.equal(marketRegime.combineRegime('SIDEWAYS', 'VOLATILE'), 'SIDEWAYS_VOLATILE');
    assert.equal(marketRegime.combineRegime('DOWN', 'QUIET'), 'DOWN_QUIET');
    assert.equal(marketRegime.combineRegime('DOWN', 'VOLATILE'), 'DOWN_VOLATILE');
    assert.equal(marketRegime.combineRegime('INSUFFICIENT_DATA', 'QUIET'), 'INSUFFICIENT_DATA');
    assert.equal(marketRegime.combineRegime('UP', 'INSUFFICIENT_DATA'), 'INSUFFICIENT_DATA');
  });

  test('derivePeriods: agrupa sequências contínuas e calcula durationTradingDays', () => {
    const dailyRecords = [
      { benchmark_id: 'IBOV', reference_date: '2025-01-02', regime: 'UP_QUIET', direction: 'UP', volatility: 'QUIET', close_price: 130000 },
      { benchmark_id: 'IBOV', reference_date: '2025-01-03', regime: 'UP_QUIET', direction: 'UP', volatility: 'QUIET', close_price: 131000 },
      { benchmark_id: 'IBOV', reference_date: '2025-01-06', regime: 'UP_QUIET', direction: 'UP', volatility: 'QUIET', close_price: 132000 },
      { benchmark_id: 'IBOV', reference_date: '2025-01-07', regime: 'UP_VOLATILE', direction: 'UP', volatility: 'VOLATILE', close_price: 133000 },
      { benchmark_id: 'IBOV', reference_date: '2025-01-08', regime: 'UP_VOLATILE', direction: 'UP', volatility: 'VOLATILE', close_price: 131500 }
    ];

    const periods = marketRegime.derivePeriods(dailyRecords);
    assert.equal(periods.length, 2);
    assert.equal(periods[0].regime, 'UP_QUIET');
    assert.equal(periods[0].startDate, '2025-01-02');
    assert.equal(periods[0].endDate, '2025-01-06');
    assert.equal(periods[0].durationTradingDays, 3);

    assert.equal(periods[1].regime, 'UP_VOLATILE');
    assert.equal(periods[1].startDate, '2025-01-07');
    assert.equal(periods[1].endDate, '2025-01-08');
    assert.equal(periods[1].durationTradingDays, 2);
  });

  test('calculateDistribution: calcula percentual e contagem dos 6 regimes', () => {
    const records = [
      ...Array.from({ length: 40 }, () => ({ regime: 'UP_QUIET' })),
      ...Array.from({ length: 20 }, () => ({ regime: 'UP_VOLATILE' })),
      ...Array.from({ length: 15 }, () => ({ regime: 'SIDEWAYS_QUIET' })),
      ...Array.from({ length: 10 }, () => ({ regime: 'SIDEWAYS_VOLATILE' })),
      ...Array.from({ length: 10 }, () => ({ regime: 'DOWN_QUIET' })),
      ...Array.from({ length: 5 }, () => ({ regime: 'DOWN_VOLATILE' }))
    ];

    const { totalDays, distribution } = marketRegime.calculateDistribution(records);
    assert.equal(totalDays, 100);
    assert.equal(distribution.UP_QUIET.percentage, 40);
    assert.equal(distribution.UP_VOLATILE.percentage, 20);
    assert.equal(distribution.DOWN_VOLATILE.percentage, 5);
  });

  test('calculateRegimePerformance: métricas por regime e exclusão de Grade D', () => {
    const trades = [
      // 3 trades Up-Quiet (2 winners, 1 loser)
      { id: '1', grade: 'A', entry_market_regime: 'UP_QUIET', resultR: 2.0, entryDate: '2025-01-02' },
      { id: '2', grade: 'B', entry_market_regime: 'UP_QUIET', resultR: 3.0, entryDate: '2025-01-05' },
      { id: '3', grade: 'B', entry_market_regime: 'UP_QUIET', resultR: -1.0, entryDate: '2025-01-08' },
      // 1 trade Grade D que DEVE ser excluído da estatística do simulador
      { id: '4', grade: 'D', entry_market_regime: 'UP_QUIET', resultR: 5.0, entryDate: '2025-01-10' },
      // 2 trades Down-Volatile (2 losers)
      { id: '5', grade: 'C', entry_market_regime: 'DOWN_VOLATILE', resultR: -1.0, entryDate: '2025-02-01' },
      { id: '6', grade: 'C', entry_market_regime: 'DOWN_VOLATILE', resultR: -1.0, entryDate: '2025-02-03' }
    ];

    const result = marketRegime.calculateRegimePerformance(trades);
    assert.equal(result.totalTrades, 5); // 6 - 1 (Grade D ignorado)

    const upQuietRow = result.rows.find(r => r.regime === 'UP_QUIET');
    assert.equal(upQuietRow.trades, 3);
    assert.equal(upQuietRow.winRate, 66.7);
    assert.equal(upQuietRow.profitFactor, 5.0); // 5.0 ganhos / 1.0 perda
    assert.equal(upQuietRow.resultadoR, 4.0); // 2 + 3 - 1
    assert.equal(upQuietRow.expectancy, 1.33);

    const downVolRow = result.rows.find(r => r.regime === 'DOWN_VOLATILE');
    assert.equal(downVolRow.trades, 2);
    assert.equal(downVolRow.winRate, 0);
    assert.equal(downVolRow.expectancy, -1.0);

    assert.equal(result.bestRegime.regime, 'UP_QUIET');
    assert.equal(result.worstRegime.regime, 'DOWN_VOLATILE');
  });

  test('resolveBenchmarkForAsset: resolve corretamente IBOV, IFIX, BDRX e US', () => {
    assert.equal(marketRegime.resolveBenchmarkForAsset('PETR4', 'stock', 'BR'), 'IBOV');
    assert.equal(marketRegime.resolveBenchmarkForAsset('HGLG11', 'fii', 'BR'), 'IFIX');
    assert.equal(marketRegime.resolveBenchmarkForAsset('NVDC34', 'bdr', 'BR'), 'BDRX');
    assert.equal(marketRegime.resolveBenchmarkForAsset('AAPL', 'stock', 'US'), 'SP500');
  });

  test('MarketCycleModel exporta todos os métodos e metadados no frontend', () => {
    assert.ok(marketCycleModel.REGIMES);
    assert.ok(marketCycleModel.REGIME_METADATA);
    assert.ok(marketCycleModel.DEFAULT_BENCHMARKS);
    assert.equal(typeof marketCycleModel.calculateWilderATRSeries, 'function');
    assert.equal(typeof marketCycleModel.calculateVolatility, 'function');
    assert.equal(typeof marketCycleModel.classifyDirection, 'function');
    assert.equal(typeof marketCycleModel.combineRegime, 'function');
    assert.equal(typeof marketCycleModel.calculateRegimePerformance, 'function');
  });

  test('syncBenchmarkRegimes e getCurrentRegime operam corretamente sobre o cache do IBOV', async () => {
    const syncRes = await marketRegime.syncBenchmarkRegimes('IBOV');
    assert.equal(syncRes.benchmarkId, 'IBOV');
    assert.ok(syncRes.count > 0, 'Deve conter dias classificados');
    assert.ok(syncRes.current, 'Deve conter regime atual');
    assert.ok(syncRes.current.regime, 'Regime deve ter código');
    assert.ok(syncRes.current.direction, 'Deve ter direção');
    assert.ok(syncRes.current.volatility, 'Deve ter volatilidade');
    assert.ok(syncRes.periods.length > 0, 'Deve conter períodos contínuos');
    assert.ok(syncRes.distribution.totalDays > 0, 'Deve conter distribuição');

    const current = await marketRegime.getCurrentRegime('IBOV');
    assert.equal(current.benchmark_id, 'IBOV');
    assert.ok(current.regime);
  });

  test('getPerformanceByRegime retorna ausência de dados quando sem trades reais', async () => {
    const perf = await marketRegime.getPerformanceByRegime({ benchmarkId: 'IBOV' });
    assert.equal(perf.benchmarkId, 'IBOV');
    assert.equal(perf.rows.length, 6);
    assert.equal(perf.hasData, false);
    assert.equal(perf.totalTrades, 0);
    assert.equal(perf.bestRegime, null);
    assert.equal(perf.worstRegime, null);
    assert.ok(perf.sampleRecommendationText.includes('Não há registros de operações'));
  });

  test('getPerformanceByRegime calcula métricas reais quando fornecidos trades válidos', async () => {
    const sampleTrades = [
      { id: '1', grade: 'A', entry_market_regime: 'UP_QUIET', resultR: 2.0, entryDate: '2025-01-02' },
      { id: '2', grade: 'B', entry_market_regime: 'UP_QUIET', resultR: 3.0, entryDate: '2025-01-05' },
      { id: '3', grade: 'A', entry_market_regime: 'UP_QUIET', resultR: 1.5, entryDate: '2025-01-08' },
      { id: '4', grade: 'A', entry_market_regime: 'UP_QUIET', resultR: 2.5, entryDate: '2025-01-10' },
      { id: '5', grade: 'B', entry_market_regime: 'UP_QUIET', resultR: -1.0, entryDate: '2025-01-12' },
      { id: '6', grade: 'C', entry_market_regime: 'DOWN_VOLATILE', resultR: -1.0, entryDate: '2025-02-01' },
      { id: '7', grade: 'C', entry_market_regime: 'DOWN_VOLATILE', resultR: -1.0, entryDate: '2025-02-03' },
      { id: '8', grade: 'B', entry_market_regime: 'DOWN_VOLATILE', resultR: -0.5, entryDate: '2025-02-05' },
      { id: '9', grade: 'C', entry_market_regime: 'DOWN_VOLATILE', resultR: -1.0, entryDate: '2025-02-07' },
      { id: '10', grade: 'B', entry_market_regime: 'DOWN_VOLATILE', resultR: 0.5, entryDate: '2025-02-10' }
    ];
    const perf = await marketRegime.getPerformanceByRegime({ benchmarkId: 'IBOV', trades: sampleTrades });
    assert.equal(perf.benchmarkId, 'IBOV');
    assert.equal(perf.hasData, true);
    assert.equal(perf.totalTrades, 10);
    assert.equal(perf.canRank, true);
    assert.equal(perf.bestRegime.regime, 'UP_QUIET');
    assert.equal(perf.worstRegime.regime, 'DOWN_VOLATILE');
  });

});
