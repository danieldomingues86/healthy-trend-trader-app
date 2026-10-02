'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');

const { MarketDataProvider } = require('../src/market-data-provider');
const { TwelveDataUsageGuard } = require('../src/twelve-data-usage-guard');
const { TwelveDataMarketDataProvider } = require('../src/twelve-data-provider');
const { NASDAQ_100_UNIVERSE, BENCHMARK_QQQ, MarketUniverse } = require('../src/nasdaq-universe');
const { NasdaqPriceStore } = require('../src/nasdaq-price-store');
const {
  NasdaqRelativeStrengthEngine,
  calculateSMA,
  calculateEMA,
  computeReturns,
  getDailyTrendState,
  resolveClassification
} = require('../src/nasdaq-relative-strength');

test('TwelveDataUsageGuard enforces limits, credits, and feature flags', (t) => {
  const tempUsageFile = path.join(__dirname, '..', 'data', `test-usage-${Date.now()}.json`);
  t.after(() => {
    if (fs.existsSync(tempUsageFile)) fs.unlinkSync(tempUsageFile);
  });

  const guard = new TwelveDataUsageGuard({
    hardLimit: 800,
    safeLimit: 700,
    minuteLimit: 8,
    apiKey: 'mock-test-key',
    stateFile: tempUsageFile
  });

  // 1. Initial status
  const status = guard.getStatus();
  assert.equal(status.safeDailyLimit, 700);
  assert.equal(status.maxCreditsPerMinute, 8);
  assert.equal(status.creditsUsedToday, 0);

  // 2. Can execute valid request within budget
  const check1 = guard.canExecute(5);
  assert.equal(check1.allowed, true);

  // 3. Record consumption
  guard.recordUsage(5);
  assert.equal(guard.state.creditsUsedToday, 5);

  // 4. Minute limit check
  const minuteCheck = guard.canExecute(4); // 5 + 4 = 9 > 8 minute limit
  assert.equal(minuteCheck.allowed, false);
  assert.match(minuteCheck.reason, /MINUTE_CREDIT_LIMIT_EXCEEDED/);

  // 5. Exceeding safe daily limit
  guard.minuteCalls = []; // clear minute window
  guard.state.creditsUsedToday = 698;
  const dailyCheck = guard.canExecute(5); // 698 + 5 = 703 > 700
  assert.equal(dailyCheck.allowed, false);
  assert.match(dailyCheck.reason, /DAILY_CREDIT_SAFE_LIMIT_EXCEEDED/);

  // 6. Header sync
  guard.state.creditsUsedToday = 0;
  guard.syncHeaders({
    'api-credits-used': '50',
    'api-credits-left': '750'
  });
  assert.equal(guard.state.creditsUsedToday, 50);
  assert.equal(guard.state.creditsLeftReported, 750);
});

test('MarketUniverse and NASDAQ-100 constituents validation', () => {
  const constituents = NASDAQ_100_UNIVERSE.getConstituents();
  assert.ok(constituents.length >= 100, 'Nasdaq-100 deve conter pelo menos 100 constituintes');

  // Benchmark check
  const benchmark = NASDAQ_100_UNIVERSE.getBenchmark();
  assert.equal(benchmark.symbol, 'QQQ');
  assert.equal(benchmark.isBenchmark, true);

  // Prominent stocks check
  const symbols = NASDAQ_100_UNIVERSE.getSymbols();
  assert.ok(symbols.includes('NVDA'));
  assert.ok(symbols.includes('AAPL'));
  assert.ok(symbols.includes('MSFT'));
  assert.ok(symbols.includes('AMZN'));
  assert.ok(symbols.includes('TSLA'));

  // Metadata retrieval
  const nvdaMeta = NASDAQ_100_UNIVERSE.getSymbolMeta('NVDA');
  assert.equal(nvdaMeta.symbol, 'NVDA');
  assert.equal(nvdaMeta.sector, 'Tecnologia');
});

test('TwelveDataMarketDataProvider batch chunking and interface conformance', async () => {
  const guard = new TwelveDataUsageGuard({
    hardLimit: 800,
    safeLimit: 700,
    minuteLimit: 20,
    apiKey: 'mock-key-for-tests'
  });

  // Mock fetch function simulating Twelve Data responses
  const mockFetch = async (url) => {
    const urlObj = new URL(url);
    const symbolParam = urlObj.searchParams.get('symbol');
    const symbols = symbolParam.split(',');

    // Return batch mock response
    if (symbols.length === 1) {
      return {
        ok: true,
        status: 200,
        headers: new Headers({ 'api-credits-used': '1', 'api-credits-left': '799' }),
        json: async () => ({
          symbol: symbols[0],
          datetime: '2026-10-01',
          open: '120.00',
          high: '125.00',
          low: '119.50',
          close: '124.50',
          volume: '50000000'
        })
      };
    }

    const data = {};
    symbols.forEach(sym => {
      data[sym] = {
        symbol: sym,
        datetime: '2026-10-01',
        open: '100.00',
        high: '105.00',
        low: '99.00',
        close: '104.00',
        volume: '1000000'
      };
    });

    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'api-credits-used': String(symbols.length), 'api-credits-left': '700' }),
      json: async () => data
    };
  };

  const provider = new TwelveDataMarketDataProvider({
    apiKey: 'mock-key-for-tests',
    usageGuard: guard,
    fetchFn: mockFetch
  });

  assert.ok(provider instanceof MarketDataProvider);
  assert.equal(provider.getName(), 'Twelve Data');

  // Test single price
  const singlePrice = await provider.getDailyPrice('NVDA');
  assert.equal(singlePrice.symbol, 'NVDA');
  assert.equal(singlePrice.close, 124.50);

  // Test batch with 12 symbols (must be split into chunks of max 8 symbols)
  guard.state.minuteWindow = []; // reset minute window for test
  guard.state.creditsUsedToday = 0;
  const testSymbols = ['AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'TSLA', 'NVDA', 'AVGO', 'COST', 'AMD', 'NFLX', 'PLTR'];
  const batchResult = await provider.getBatchDailyPrices(testSymbols, { delayBetweenBatchesMs: 10 });

  assert.equal(batchResult.size, 12);
  assert.ok(batchResult.has('AAPL'));
  assert.ok(batchResult.has('PLTR'));
  assert.equal(batchResult.get('AAPL').close, 104.00);
});

test('NasdaqPriceStore stores and queries prices in chronological order', async (t) => {
  const tempStoreFile = path.join(__dirname, '..', 'data', `test-prices-${Date.now()}.json`);
  t.after(() => {
    if (fs.existsSync(tempStoreFile)) fs.unlinkSync(tempStoreFile);
  });

  const store = new NasdaqPriceStore({ fallbackPath: tempStoreFile, jsonFile: tempStoreFile });

  await store.saveDailyPrices([
    { provider: 'twelve-data', universe: 'NASDAQ_100', symbol: 'TEST_NVDA', date: '2026-10-01', open: 120, high: 125, low: 119, close: 124.5, volume: 1000 },
    { provider: 'twelve-data', universe: 'NASDAQ_100', symbol: 'TEST_NVDA', date: '2026-09-30', open: 118, high: 121, low: 117, close: 120.0, volume: 1000 },
    { provider: 'twelve-data', universe: 'NASDAQ_100', symbol: 'TEST_NVDA', date: '2026-10-01', open: 120, high: 125, low: 119, close: 124.5, volume: 1000 } // duplicate
  ]);

  const exists = await store.hasEodPrice('TEST_NVDA', '2026-10-01');
  assert.equal(exists, true);

  const history = await store.getDailyPrices('TEST_NVDA', 'NASDAQ_100', 10);
  assert.equal(history.length, 2);
  assert.equal(history[0].date, '2026-09-30');
  assert.equal(history[1].date, '2026-10-01');
});

test('NasdaqRelativeStrengthEngine calculates RS, grades, sparklines, and kpis', (t) => {
  const tempCacheFile = path.join(__dirname, '..', 'data', `test-cache-${Date.now()}.json`);
  t.after(() => {
    if (fs.existsSync(tempCacheFile)) fs.unlinkSync(tempCacheFile);
  });

  const engine = new NasdaqRelativeStrengthEngine({ cacheFile: tempCacheFile, allowFixture: true });
  const result = engine.getNasdaqRelativeStrength();

  assert.ok(result);
  assert.ok(result.ranking.length >= 100);
  assert.equal(result.source, 'Twelve Data');

  // Verify KPIs
  assert.equal(result.kpis.totalAssets, result.ranking.length);
  assert.ok(result.kpis.leadersCount > 0);
  assert.ok(result.kpis.emergingCount > 0);

  // Verify ranking properties
  const leader = result.ranking[0];
  assert.equal(leader.rank, 1);
  assert.ok(leader.score >= 90);
  assert.equal(leader.status, 'A+');
  assert.equal(leader.isLeader, true);
  assert.equal(leader.trendState, 'BULLISH');
});

test('calculateSMA and calculateEMA mathematical correctness and null handling', () => {
  // Insufficient data
  assert.equal(calculateSMA([10, 20], 3), null);
  assert.equal(calculateEMA([10, 20], 3), null);

  // SMA with 5 values
  const series = [10, 12, 14, 16, 18];
  assert.equal(calculateSMA(series, 5), 14);
  assert.equal(calculateSMA(series, 3), 16); // (14+16+18)/3 = 16

  // EMA with 3 periods: k = 2 / (3 + 1) = 0.5
  // SMA of first 3 [10, 12, 14] = 12
  // val 16: (16 * 0.5) + (12 * 0.5) = 14
  // val 18: (18 * 0.5) + (14 * 0.5) = 16
  assert.equal(calculateEMA(series, 3), 16);
});

test('computeReturns deterministic 21-session 1M and 63-session 3M calculation', () => {
  // Build a controlled price series of 70 days
  const history = [];
  for (let i = 0; i < 70; i++) {
    history.push({ close: 100 + i });
  }
  // latest is index 69 (price 169)
  // prev1 is index 68 (price 168)
  // prev5 is index 64 (price 164)
  // prev21 (1M) is index 69 - 21 = 48 (price 148)
  // prev63 (3M) is index 69 - 63 = 6 (price 106)
  const res = computeReturns(history);
  assert.equal(res.currentPrice, 169);
  assert.equal(res.has1M, true);
  assert.equal(res.has3M, true);

  // 1M return: (169 - 148) / 148 * 100 = 14.19%
  const expected1M = Number((((169 - 148) / 148) * 100).toFixed(2));
  assert.equal(res.m1, expected1M);

  // 3M return: (169 - 106) / 106 * 100 = 59.43%
  const expected3M = Number((((169 - 106) / 106) * 100).toFixed(2));
  assert.equal(res.m3, expected3M);

  // Insufficient history (< 22 candles)
  const shortHistory = history.slice(0, 10);
  const shortRes = computeReturns(shortHistory);
  assert.equal(shortRes.has1M, false);
  assert.equal(shortRes.has3M, false);
});

test('getDailyTrendState classifies BULLISH, BEARISH, NEUTRAL on daily candles', () => {
  // 1. Bullish scenario: price rising steadily, 200 candles
  const bullCloses = [];
  for (let i = 0; i < 210; i++) {
    bullCloses.push(50 + i * 0.5);
  }
  const bullState = getDailyTrendState(bullCloses);
  assert.equal(bullState.state, 'BULLISH');
  assert.ok(bullState.latestClose > bullState.ema20);
  assert.ok(bullState.ema20 > bullState.sma50);
  assert.ok(bullState.sma50 > bullState.sma200);

  // 2. Bearish scenario: price falling steadily, 210 candles (APP/NFLX Case)
  const bearCloses = [];
  for (let i = 0; i < 210; i++) {
    bearCloses.push(300 - i * 0.8);
  }
  const bearState = getDailyTrendState(bearCloses);
  assert.equal(bearState.state, 'BEARISH');
  assert.ok(bearState.latestClose < bearState.ema20);
  assert.ok(bearState.latestClose < bearState.sma50);
  assert.ok(bearState.latestClose < bearState.sma200);

  // 3. Insufficient data (< 20 candles)
  const shortCloses = [100, 101, 102];
  const shortState = getDailyTrendState(shortCloses);
  assert.equal(shortState.state, 'NEUTRAL');
  assert.equal(shortState.ema20, null);
});

test('resolveClassification Phase 9 Matrix: High RS with Bearish Trend is NEVER Líder', () => {
  // Case A: High RS + BULLISH -> Líder
  const resA = resolveClassification(96, 'BULLISH');
  assert.equal(resA.classification, 'Líder');
  assert.equal(resA.bandKey, 'leader');
  assert.equal(resA.status, 'A+');
  assert.equal(resA.isLeader, true);

  // Case B: High RS + NEUTRAL -> Qualificado
  const resB = resolveClassification(96, 'NEUTRAL');
  assert.equal(resB.classification, 'Qualificado');
  assert.equal(resB.bandKey, 'qualified');
  assert.equal(resB.status, 'A');
  assert.equal(resB.isLeader, false);

  // Case C: High RS (99) + BEARISH -> CRITICAL RULE: NEVER Líder! Moves to Em observação!
  const resC = resolveClassification(99, 'BEARISH');
  assert.equal(resC.classification, 'Em observação');
  assert.equal(resC.bandKey, 'observation');
  assert.equal(resC.status, 'C');
  assert.equal(resC.isLeader, false);
  assert.match(resC.reason, /tendência diária baixista/);

  // Case D: Qualified RS (75) + BEARISH -> Em observação
  const resD = resolveClassification(75, 'BEARISH');
  assert.equal(resD.classification, 'Em observação');
  assert.equal(resD.bandKey, 'observation');
  assert.equal(resD.isLeader, false);

  // Case E: Watch RS (50) + BULLISH -> Acompanhar
  const resE = resolveClassification(50, 'BULLISH');
  assert.equal(resE.classification, 'Acompanhar');
  assert.equal(resE.bandKey, 'watch');
  assert.equal(resE.isLeader, false);

  // Case F: Weak RS (35) + BEARISH -> Abaixo do filtro
  const resF = resolveClassification(35, 'BEARISH');
  assert.equal(resF.classification, 'Abaixo do filtro');
  assert.equal(resF.bandKey, 'laggard');
  assert.equal(resF.isLeader, false);

  // Case G: Laggard RS (15) -> Abaixo do filtro
  const resG = resolveClassification(15, 'BULLISH');
  assert.equal(resG.classification, 'Abaixo do filtro');
  assert.equal(resG.bandKey, 'laggard');
  assert.equal(resG.isLeader, false);

  // Exhaustive Verification of Bearish Trend across ALL Specification Bands:
  // Band 1: RS 90–100 + BEARISH = EM OBSERVAÇÃO
  [100, 95, 90].forEach(score => {
    const res = resolveClassification(score, 'BEARISH');
    assert.equal(res.classification, 'Em observação', `Score ${score} + BEARISH must be Em observação`);
    assert.equal(res.bandKey, 'observation');
    assert.equal(res.isLeader, false);
  });

  // Band 2: RS 70–89 + BEARISH = EM OBSERVAÇÃO
  [89, 80, 70].forEach(score => {
    const res = resolveClassification(score, 'BEARISH');
    assert.equal(res.classification, 'Em observação', `Score ${score} + BEARISH must be Em observação`);
    assert.equal(res.bandKey, 'observation');
    assert.equal(res.isLeader, false);
  });

  // Band 3: RS 40–69 + BEARISH = EM OBSERVAÇÃO
  [69, 55, 50, 40].forEach(score => {
    const res = resolveClassification(score, 'BEARISH');
    assert.equal(res.classification, 'Em observação', `Score ${score} + BEARISH must be Em observação`);
    assert.equal(res.bandKey, 'observation');
    assert.equal(res.isLeader, false);
  });

  // Band 4: RS 30–39 + BEARISH = ABAIXO DO FILTRO
  [39, 35, 30].forEach(score => {
    const res = resolveClassification(score, 'BEARISH');
    assert.equal(res.classification, 'Abaixo do filtro', `Score ${score} + BEARISH must be Abaixo do filtro`);
    assert.equal(res.bandKey, 'laggard');
    assert.equal(res.isLeader, false);
  });

  // Band 5: RS 0–29 + BEARISH = ABAIXO DO FILTRO
  [29, 15, 0].forEach(score => {
    const res = resolveClassification(score, 'BEARISH');
    assert.equal(res.classification, 'Abaixo do filtro', `Score ${score} + BEARISH must be Abaixo do filtro`);
    assert.equal(res.bandKey, 'laggard');
    assert.equal(res.isLeader, false);
  });
});

test('Audit Case: APP and NFLX are strictly protected from being Líder', (t) => {
  const tempCacheFile = path.join(__dirname, '..', 'data', `test-app-${Date.now()}.json`);
  t.after(() => {
    if (fs.existsSync(tempCacheFile)) fs.unlinkSync(tempCacheFile);
  });

  const engine = new NasdaqRelativeStrengthEngine({ cacheFile: tempCacheFile, allowFixture: true });
  const data = engine.getNasdaqRelativeStrength();

  const app = data.ranking.find(item => item.symbol === 'APP');
  assert.ok(app, 'APP deve existir no ranking do Nasdaq-100');
  assert.notEqual(app.classification, 'Líder', 'APP nunca pode ser classificado como Líder');
  assert.equal(app.isLeader, false, 'APP isLeader deve ser false');
  assert.equal(app.trendState, 'BEARISH', 'APP deve ter tendência diária BEARISH');

  const nflx = data.ranking.find(item => item.symbol === 'NFLX');
  assert.ok(nflx, 'NFLX deve existir no ranking do Nasdaq-100');
  assert.notEqual(nflx.classification, 'Líder', 'NFLX nunca pode ser classificado como Líder');
  assert.equal(nflx.isLeader, false, 'NFLX isLeader deve ser false');
  assert.equal(nflx.trendState, 'BEARISH', 'NFLX deve ter tendência diária BEARISH');
});

test('Global Property Invariant: FOR ALL ASSETS: IF classification == Líder THEN trendState == BULLISH', (t) => {
  const tempCacheFile = path.join(__dirname, '..', 'data', `test-prop-${Date.now()}.json`);
  t.after(() => {
    if (fs.existsSync(tempCacheFile)) fs.unlinkSync(tempCacheFile);
  });

  const engine = new NasdaqRelativeStrengthEngine({ cacheFile: tempCacheFile, allowFixture: true });
  const data = engine.getNasdaqRelativeStrength();

  assert.ok(data.ranking.length >= 100);

  for (const item of data.ranking) {
    if (item.classification === 'Líder') {
      assert.equal(item.trendState, 'BULLISH', `Ativo ${item.symbol} tem classificação Líder mas trendState é ${item.trendState}`);
      assert.equal(item.isLeader, true);
    }
    if (item.isLeader === true) {
      assert.equal(item.trendState, 'BULLISH', `Ativo ${item.symbol} tem isLeader=true mas trendState é ${item.trendState}`);
      assert.equal(item.classification, 'Líder');
    }
    if (item.trendState === 'BEARISH') {
      assert.notEqual(item.classification, 'Líder', `Ativo ${item.symbol} tem trendState BEARISH mas foi classificado como Líder`);
      assert.equal(item.isLeader, false);
    }
  }
});

test('Production Engine without cache returns DATA_UNAVAILABLE and NEVER synthetic ASCII prices', () => {
  const nonExistentFile = path.join(__dirname, '..', 'data', `non-existent-${Date.now()}.json`);
  const engine = new NasdaqRelativeStrengthEngine({ cacheFile: nonExistentFile, allowFixture: false });
  const res = engine.getNasdaqRelativeStrength();

  assert.equal(res.status, 'DATA_UNAVAILABLE');
  assert.equal(res.syncStatus, 'AGUARDANDO SINCRONIZAÇÃO');
  assert.equal(res.ranking.length, 0);
  assert.match(res.providerStatus, /Aguardando/);
});

test('validateDataset detects empty store and returns DATA_UNAVAILABLE', async () => {
  const tempFallback = path.join(__dirname, '..', 'data', `temp-empty-${Date.now()}.json`);
  const store = new NasdaqPriceStore({ fallbackPath: tempFallback });
  const engine = new NasdaqRelativeStrengthEngine({ priceStore: store, allowFixture: false });

  const validation = await engine.validateDataset();
  assert.equal(validation.status, 'DATA_UNAVAILABLE');
  assert.equal(validation.syncStatus, 'AGUARDANDO SINCRONIZAÇÃO');
  assert.equal(validation.syncedCount, 0);
  assert.equal(validation.totalAssets, 100);
  assert.equal(validation.hasQqq, false);

  if (fs.existsSync(tempFallback)) fs.unlinkSync(tempFallback);
});

test('validateDataset detects partial sync and reports missing symbols without inventing data', async () => {
  const tempFallback = path.join(__dirname, '..', 'data', `temp-partial-${Date.now()}.json`);
  const store = new NasdaqPriceStore({ fallbackPath: tempFallback });

  // Seed QQQ with 70 candles
  const qqqCandles = [];
  for (let i = 0; i < 70; i++) {
    const d = new Date(Date.now() - (70 - i) * 86400000).toISOString().slice(0, 10);
    qqqCandles.push({ symbol: 'QQQ', date: d, close: 400 + i, open: 400 + i, high: 405 + i, low: 395 + i });
  }
  await store.saveDailyPrices(qqqCandles);

  // Seed only 3 constituents: NVDA, AAPL, MSFT with 70 candles each
  for (const sym of ['NVDA', 'AAPL', 'MSFT']) {
    const candles = [];
    for (let i = 0; i < 70; i++) {
      const d = new Date(Date.now() - (70 - i) * 86400000).toISOString().slice(0, 10);
      candles.push({ symbol: sym, date: d, close: 100 + i, open: 100 + i, high: 105 + i, low: 95 + i });
    }
    await store.saveDailyPrices(candles);
  }

  const engine = new NasdaqRelativeStrengthEngine({ priceStore: store, allowFixture: false });
  const validation = await engine.validateDataset();

  assert.equal(validation.status, 'PARTIAL_SYNC');
  assert.equal(validation.syncStatus, 'SINCRONIZAÇÃO PARCIAL');
  assert.equal(validation.syncedCount, 3);
  assert.equal(validation.totalAssets, 100);
  assert.equal(validation.hasQqq, true);
  assert.equal(validation.missingSymbols.length, 97);
  assert.ok(validation.missingSymbols.includes('TSLA'));
  assert.ok(validation.missingSymbols.includes('NFLX'));

  // Test that recalculateRankings in partial sync ONLY ranks the 3 valid constituents
  const rankingResult = await engine.recalculateRankings();
  assert.equal(rankingResult.status, 'PARTIAL_SYNC');
  assert.equal(rankingResult.syncStatus, 'SINCRONIZAÇÃO PARCIAL');
  assert.equal(rankingResult.ranking.length, 3);
  assert.equal(rankingResult.syncedCount, 3);
  assert.equal(rankingResult.totalAssets, 100);

  if (fs.existsSync(tempFallback)) fs.unlinkSync(tempFallback);
});

test('NasdaqPriceStore upsert is strictly idempotent and prevents duplicates', async () => {
  const tempFallback = path.join(__dirname, '..', 'data', `temp-idempotent-${Date.now()}.json`);
  const store = new NasdaqPriceStore({ fallbackPath: tempFallback });

  const candle = [{ symbol: 'AAPL', date: '2026-09-30', open: 220, high: 225, low: 219, close: 224, volume: 5000000 }];

  // Save first time
  await store.saveDailyPrices(candle);
  const count1 = await store.getCandleCount('AAPL');
  assert.equal(count1, 1);

  // Save same candle second time (updated close)
  const updatedCandle = [{ symbol: 'AAPL', date: '2026-09-30', open: 220, high: 226, low: 219, close: 225.5, volume: 5100000 }];
  await store.saveDailyPrices(updatedCandle);
  const count2 = await store.getCandleCount('AAPL');
  assert.equal(count2, 1, 'Candle count must remain 1 after second save of same date');

  const history = await store.getDailyPrices('AAPL');
  assert.equal(history.length, 1);
  assert.equal(history[0].close, 225.5);

  if (fs.existsSync(tempFallback)) fs.unlinkSync(tempFallback);
});

test('Historical depth: stores and retrieves up to 250 daily candles for SMA200 calculation', async () => {
  const tempFallback = path.join(__dirname, '..', 'data', `temp-depth-${Date.now()}.json`);
  const store = new NasdaqPriceStore({ fallbackPath: tempFallback });

  const candles = [];
  for (let i = 0; i < 220; i++) {
    const d = new Date(Date.now() - (220 - i) * 86400000).toISOString().slice(0, 10);
    candles.push({ symbol: 'MSFT', date: d, close: 300 + i * 0.5, open: 300, high: 305, low: 295 });
  }
  await store.saveDailyPrices(candles);

  const history = await store.getDailyPrices('MSFT', 'NASDAQ_100', 250);
  assert.equal(history.length, 220, 'Must retrieve all 220 candles');

  const trend = getDailyTrendState(history);
  assert.ok(trend.sma200 !== null, 'SMA 200 must be calculated when history >= 200');
  assert.ok(trend.sma50 !== null, 'SMA 50 must be calculated');
  assert.ok(trend.ema20 !== null, 'EMA 20 must be calculated');

  if (fs.existsSync(tempFallback)) fs.unlinkSync(tempFallback);
});

test('TwelveDataUsageGuard: waitForMinuteBudget respects minute limits', async () => {
  const tempUsage = path.join(__dirname, '..', 'data', `temp-usage-${Date.now()}.json`);
  const guard = new TwelveDataUsageGuard({
    storagePath: tempUsage,
    apiKey: 'test-key',
    maxCreditsPerMinute: 8
  });

  // Record 8 credits consumed right now
  guard.recordUsage(8);
  assert.equal(guard.getCreditsUsedInLastMinute(), 8);

  const check = guard.canExecute(1);
  assert.equal(check.allowed, false, 'Further credits in same minute must be blocked');

  if (fs.existsSync(tempUsage)) fs.unlinkSync(tempUsage);
});

test('runEodJob: Multi-batch processes without premature loop termination and produces detailed audit logs', async () => {
  const tempStore = path.join(__dirname, '..', 'data', `test-multibatch-store-${Date.now()}.json`);
  const tempUsage = path.join(__dirname, '..', 'data', `test-multibatch-usage-${Date.now()}.json`);

  const mockGuard = new TwelveDataUsageGuard({
    storagePath: tempUsage,
    apiKey: 'test-api-key',
    maxCreditsPerMinute: 8,
    dailySafeLimit: 700
  });

  // Mock provider that handles 10 symbols across 2 batches
  const mockProvider = {
    getStatus: async () => mockGuard.getStatus(),
    getBatchHistoricalDailyPrices: async (symbols, options) => {
      const results = new Map();
      const errors = new Map();
      const metadata = new Map();

      for (const sym of symbols) {
        if (sym === 'BAD_SYM') {
          errors.set(sym, 'Simulated provider error for symbol');
          metadata.set(sym, { ticker: sym, candleCount: 0, httpStatus: 400, failureReason: 'Simulated provider error' });
        } else {
          const fakeCandles = [];
          for (let i = 0; i < 210; i++) {
            fakeCandles.push({
              symbol: sym,
              date: new Date(Date.now() - (210 - i) * 86400000).toISOString().slice(0, 10),
              open: 100 + i, high: 105 + i, low: 95 + i, close: 102 + i, volume: 1000
            });
          }
          results.set(sym, fakeCandles);
          metadata.set(sym, { ticker: sym, candleCount: 210, httpStatus: 200, persisted: true, firstDate: fakeCandles[0].date, lastDate: fakeCandles[fakeCandles.length - 1].date });
        }
      }
      return { results, errors, metadata };
    }
  };

  const tempCache = path.join(__dirname, '..', 'data', `test-multibatch-cache-${Date.now()}.json`);
  const store = new NasdaqPriceStore({ fallbackPath: tempStore });
  const engine = new NasdaqRelativeStrengthEngine({
    provider: mockProvider,
    priceStore: store,
    usageGuard: mockGuard,
    cacheFile: tempCache
  });

  // 10 symbols: Batch 1 (8 symbols, including 1 bad symbol), Batch 2 (2 symbols)
  const testSymbols = ['QQQ', 'AAPL', 'MSFT', 'BAD_SYM', 'AMZN', 'GOOGL', 'META', 'TSLA', 'NVDA', 'AVGO'];

  const result = await engine.runEodJob({
    symbols: testSymbols,
    autoPacing: false, // fast execution for unit test
    forceBackfill: true
  });

  assert.ok(result.auditLogs, 'Must return auditLogs array');
  assert.equal(result.auditLogs.length, 10, 'All 10 symbols must have audit log entries');

  const badSymLog = result.auditLogs.find(l => l.ticker === 'BAD_SYM');
  assert.ok(badSymLog, 'BAD_SYM must be logged');
  assert.equal(badSymLog.status, 'FAILED');

  const goodSymLog = result.auditLogs.find(l => l.ticker === 'AAPL');
  assert.ok(goodSymLog, 'AAPL must be logged');
  assert.equal(goodSymLog.status, 'SYNCED');
  assert.equal(goodSymLog.candlesCount, 210);

  // Crucial check: Batch 2 symbols (NVDA, AVGO) were processed despite BAD_SYM in Batch 1!
  const batch2SymLog = result.auditLogs.find(l => l.ticker === 'NVDA');
  assert.ok(batch2SymLog, 'NVDA from Batch 2 must be processed (no premature break)');
  assert.equal(batch2SymLog.status, 'SYNCED');

  if (fs.existsSync(tempStore)) fs.unlinkSync(tempStore);
  if (fs.existsSync(tempUsage)) fs.unlinkSync(tempUsage);
  if (fs.existsSync(tempCache)) fs.unlinkSync(tempCache);
});
