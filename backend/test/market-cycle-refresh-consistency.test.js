const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const marketRegime = require('../src/market-regime');
const marketData = require('../src/market-data');

function generateSyntheticCandles(count, startIso = '2024-01-02', basePrice = 500, trendStep = 0.4) {
  const [y, m, d] = startIso.split('-').map(Number);
  let cursor = new Date(Date.UTC(y, m - 1, d));
  const candles = [];
  let price = basePrice;

  while (candles.length < count) {
    const dow = cursor.getUTCDay();
    if (dow !== 0 && dow !== 6) {
      const iso = cursor.toISOString().slice(0, 10);
      const wave = Math.sin(candles.length / 8) * 3;
      const close = Number((price + wave).toFixed(2));
      const open = Number((close - 1.2).toFixed(2));
      const high = Number((close + 2.5).toFixed(2));
      const low = Number((close - 2.5).toFixed(2));
      candles.push({
        date: iso,
        open,
        high,
        low,
        close,
        volume: 1000000 + candles.length * 1000
      });
      price += trendStep;
    }
    cursor = new Date(cursor.getTime() + 86400000);
  }
  return candles;
}

test('Calendário e consistência temporal: respeita horário de fechamento, finais de semana e feriados (BR e US)', () => {
  // 1. Quarta-feira 25/11/2026 às 13:20 BRT (11:20 ET) -> pregão ainda ABERTO nos dois mercados
  // Último pregão fechado deve ser 24/11/2026 (terça-feira)
  const duringSession = new Date('2026-11-25T16:20:00Z');
  assert.equal(marketRegime.getExpectedClosedDate('BR', duringSession), '2026-11-24');
  assert.equal(marketRegime.getExpectedClosedDate('US', duringSession), '2026-11-24');

  // 2. Quarta-feira 25/11/2026 às 18:30 BRT (16:30 ET) -> pregão já FECHADO nos dois mercados
  // Último pregão fechado avança para 25/11/2026
  const afterClose = new Date('2026-11-25T21:30:00Z');
  assert.equal(marketRegime.getExpectedClosedDate('BR', afterClose), '2026-11-25');
  assert.equal(marketRegime.getExpectedClosedDate('US', afterClose), '2026-11-25');

  // 3. Feriado nacional nos EUA: Thanksgiving (26/11/2026, 4ª quinta-feira de novembro)
  // Mesmo após as 17h ET de 26/11/2026, os EUA não tiveram pregão, então permanece 25/11/2026; já o Brasil fecha 26/11/2026
  assert.equal(marketRegime.isMarketTradingDay('2026-11-26', 'US'), false, 'Thanksgiving não é dia de pregão nos EUA');
  assert.equal(marketRegime.isMarketTradingDay('2026-11-26', 'BR'), true, '26/11/2026 é dia normal de pregão na B3');
  const thanksgivingEvening = new Date('2026-11-26T22:00:00Z');
  assert.equal(marketRegime.getExpectedClosedDate('US', thanksgivingEvening), '2026-11-25');
  assert.equal(marketRegime.getExpectedClosedDate('BR', thanksgivingEvening), '2026-11-26');

  // 4. Feriado nacional no Brasil: Consciência Negra (20/11/2026, sexta-feira)
  assert.equal(marketRegime.isMarketTradingDay('2026-11-20', 'BR'), false, '20/11 não é dia de pregão na B3');
  assert.equal(marketRegime.isMarketTradingDay('2026-11-20', 'US'), true, '20/11 é dia normal de pregão nos EUA');
  const nov20Evening = new Date('2026-11-20T22:00:00Z');
  assert.equal(marketRegime.getExpectedClosedDate('BR', nov20Evening), '2026-11-19');
  assert.equal(marketRegime.getExpectedClosedDate('US', nov20Evening), '2026-11-20');
});

test('Exclusão de candle diário aberto (intradiário): nunca considera candle em formação como fechamento definitivo', () => {
  // Simula consulta em 25/11/2026 às 13:20 BRT com provedor retornando candle parcial de 25/11/2026
  const duringSession = new Date('2026-11-25T16:20:00Z');
  const rawCandles = [
    { date: '2026-11-20', open: 600, high: 612, low: 598, close: 608.45, volume: 45000000 },
    { date: '2026-11-23', open: 610, high: 635, low: 609, close: 633.87, volume: 42000000 },
    { date: '2026-11-24', open: 634, high: 641, low: 631, close: 638.10, volume: 39000000 },
    { date: '2026-11-25', open: 637, high: 638, low: 610, close: 611.33, volume: 616224 } // Candle intradiário aberto
  ];

  const filtered = marketRegime.filterClosedDailyCandles(rawCandles, 'US', duringSession);
  assert.equal(filtered.length, 3, 'Candle aberto de 25/11/2026 deve ser descartado antes do fechamento');
  assert.equal(filtered.at(-1).date, '2026-11-24', 'Último candle válido deve ser 24/11/2026');
  assert.equal(filtered.at(-1).close, 638.10);

  // Após o fechamento (25/11/2026 às 21:30 UTC / 16:30 ET), o candle de 25/11 passa a ser aceito
  const afterClose = new Date('2026-11-25T21:30:00Z');
  const filteredAfterClose = marketRegime.filterClosedDailyCandles(rawCandles, 'US', afterClose);
  assert.equal(filteredAfterClose.length, 4, 'Após o fechamento do mercado, candle de 25/11 é consolidado');
  assert.equal(filteredAfterClose.at(-1).date, '2026-11-25');
});

test('Novo pregão fechado provoca atualização dos dados e recálculo sincronizado de indicadores e regime', () => {
  const baseCandles = generateSyntheticCandles(310, '2025-06-02', 500, 0.35);
  const lastBase = baseCandles.at(-1);
  const regimesBefore = marketRegime.calculateBenchmarkRegimes(baseCandles, 'NASDAQ');
  const currentBefore = regimesBefore.at(-1);
  const cycleBefore = marketData.scoreCycle(baseCandles);

  assert.equal(currentBefore.reference_date, lastBase.date);
  assert.equal(currentBefore.close_price, lastBase.close);
  assert.equal(Number(cycleBefore.ema10.toFixed(2)), Number(currentBefore.ema_10.toFixed(2)));
  assert.equal(Number(cycleBefore.ema72.toFixed(2)), Number(currentBefore.ema_72.toFixed(2)));

  // Adicionar novo pregão fechado com queda forte que inverte a direção para DOWN_VOLATILE
  const nextDate = '2026-11-25';
  const sharpDropCandle = {
    date: nextDate,
    open: lastBase.close - 5,
    high: lastBase.close - 2,
    low: lastBase.close - 95,
    close: Number((lastBase.close - 90).toFixed(2)),
    volume: 95000000
  };
  const updatedCandles = [...baseCandles, sharpDropCandle];
  const regimesAfter = marketRegime.calculateBenchmarkRegimes(updatedCandles, 'NASDAQ');
  const currentAfter = regimesAfter.at(-1);
  const cycleAfter = marketData.scoreCycle(updatedCandles);

  assert.equal(currentAfter.reference_date, nextDate);
  assert.equal(currentAfter.close_price, sharpDropCandle.close);
  assert.notEqual(currentAfter.ema_10, currentBefore.ema_10, 'EMA 10 deve ser recalculada no novo pregão');
  assert.notEqual(currentAfter.ema_72, currentBefore.ema_72, 'EMA 72 deve ser recalculada no novo pregão');
  assert.equal(currentAfter.direction, 'DOWN', 'Direção deve refletir rompimento abaixo das EMAs 10 e 72');
  assert.equal(currentAfter.regime, 'DOWN_VOLATILE', 'Regime deve ser recalculado para DOWN_VOLATILE');
  assert.equal(Number(cycleAfter.ema10.toFixed(2)), Number(currentAfter.ema_10.toFixed(2)));
  assert.equal(Number(cycleAfter.ema72.toFixed(2)), Number(currentAfter.ema_72.toFixed(2)));
});

test('Todos os 5 benchmarks (IBOV, IFIX, BDRX, SP500, NASDAQ) atualizam individualmente e mantêm sincronia 1:1', async () => {
  const cachePath = path.join(__dirname, '../data/market-cache.json');
  const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

  const pairs = [
    { market: 'stock_b3', benchmark: 'IBOV', marketCode: 'BR' },
    { market: 'fii', benchmark: 'IFIX', marketCode: 'BR' },
    { market: 'bdr', benchmark: 'BDRX', marketCode: 'BR' },
    { market: 'sp500', benchmark: 'SP500', marketCode: 'US' },
    { market: 'nasdaq', benchmark: 'NASDAQ', marketCode: 'US' }
  ];

  const seenCloses = new Map();

  for (const pair of pairs) {
    const cyclePayload = await marketData.resolveMarketCycle(cache, pair.market);
    const regimeHistory = await marketRegime.getRegimeHistory(pair.benchmark, {
      latestCandleDate: cyclePayload.cycle?.date
    });

    const normalizeDate = (d) => {
      const s = String(d || '').trim();
      return /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : s.slice(0, 10);
    };

    const cycleDate = normalizeDate(cyclePayload.cycle?.date);
    const lastChartDate = normalizeDate(cyclePayload.benchmark?.history?.at(-1)?.date);
    const regimeDate = normalizeDate(regimeHistory.current?.reference_date);

    assert.ok(cycleDate, `${pair.benchmark} deve possuir cycle.date`);
    assert.equal(cycleDate, lastChartDate, `${pair.benchmark}: cycle.date e último candle do gráfico devem coincidir`);
    assert.equal(cycleDate, regimeDate, `${pair.benchmark}: cycle.date e Regime Atual devem coincidir`);

    // Preço e médias sincronizados
    const chartLast = cyclePayload.benchmark.history.at(-1);
    assert.ok(Math.abs(Number(chartLast.close) - Number(regimeHistory.current.close_price)) < 0.01, `${pair.benchmark}: cotação sincronizada`);
    assert.ok(Math.abs(Number(cyclePayload.cycle.ema10) - Number(regimeHistory.current.ema_10)) < 0.05, `${pair.benchmark}: EMA 10 sincronizada`);
    assert.ok(Math.abs(Number(cyclePayload.cycle.ema72) - Number(regimeHistory.current.ema_72)) < 0.05, `${pair.benchmark}: EMA 72 sincronizada`);

    seenCloses.set(pair.benchmark, regimeHistory.current.close_price);
  }

  // Garantir que nenhuma série foi misturada entre os 5 benchmarks
  const uniqueCloses = new Set(seenCloses.values());
  assert.equal(uniqueCloses.size, 5, 'Cada um dos 5 benchmarks possui sua própria série e cotação distinta');
});

test('Falha do provedor, resposta inválida e recuperação após falha preservam cache e expõem diagnóstico observável', async () => {
  // 1. Simular falha do provedor quando o cache está atrasado em relação a uma data futura simulada
  const simulatedFutureSession = new Date('2026-12-15T22:00:00Z');
  const failingProvider = {
    async getHistoricalDailyPrices() {
      throw new Error('Twelve Data API rate limit exceeded (HTTP 429)');
    }
  };

  const fallbackCandles = await marketRegime.loadUsBenchmarkCandles('NASDAQ', {
    now: simulatedFutureSession,
    force: true,
    provider: failingProvider
  });

  assert.ok(Array.isArray(fallbackCandles) && fallbackCandles.length >= 700, 'Mantém último cache válido em caso de falha do provedor');
  assert.ok(fallbackCandles.fetchError && fallbackCandles.fetchError.includes('HTTP 429'), 'Registra motivo da falha de forma observável');

  // Verificar que syncBenchmarkRegimes propaga isStale = true e lastError sem mascarar a defasagem
  const staleSync = await marketRegime.syncBenchmarkRegimes('NASDAQ', {
    now: simulatedFutureSession,
    force: true,
    provider: failingProvider
  });
  assert.equal(staleSync.freshness.isStale, true, 'Deve sinalizar isStale = true quando provedor falha e cache está defasado');
  assert.equal(staleSync.freshness.status, 'stale');
  assert.ok(staleSync.freshness.lastError.includes('HTTP 429'), 'Deve expor o erro do provedor em freshness.lastError');

  // 2. Simular resposta inválida/vazia do provedor
  const invalidProvider = {
    async getHistoricalDailyPrices() {
      return [];
    }
  };
  const invalidSync = await marketRegime.syncBenchmarkRegimes('NASDAQ', {
    now: simulatedFutureSession,
    force: true,
    provider: invalidProvider
  });
  assert.equal(invalidSync.freshness.isStale, true, 'Resposta vazia não deve ser aceita como atualização válida');
  assert.ok(invalidSync.freshness.lastError.includes('vazia ou inválida'), 'Registra erro de resposta inválida');

  // 3. Recuperação após falha na data atual real
  const realNow = new Date('2026-11-25T16:30:00Z'); // Pregão de 25/11 ainda aberto, último fechado = 24/11
  const healthyProvider = {
    async getHistoricalDailyPrices() {
      return fallbackCandles.slice(-60);
    }
  };
  const recoveredSync = await marketRegime.syncBenchmarkRegimes('NASDAQ', {
    now: realNow,
    force: true,
    provider: healthyProvider
  });
  assert.equal(recoveredSync.freshness.isStale, false, 'Após recuperação, isStale volta para false');
  assert.equal(recoveredSync.freshness.status, 'fresh');
  assert.equal(recoveredSync.freshness.lastError, null);
  assert.equal(recoveredSync.current.reference_date, '2026-11-24');
});

test('Frontend Ciclo de Mercado: exibe aviso claro de "Dados desatualizados" com motivo e não mistura séries ao trocar benchmark', async () => {
  const listeners = new Map();
  const storage = new Map();

  class MockElement {
    constructor(tagName, id = '') {
      this.tagName = tagName.toUpperCase();
      this.id = id;
      const set = new Set();
      this.classList = {
        has: (c) => set.has(c),
        contains: (c) => set.has(c),
        add: (...cs) => { for (const c of cs) set.add(c); return this.classList; },
        delete: (c) => set.delete(c),
        toggle: (c, val) => {
          if (val === undefined) val = !set.has(c);
          if (val) set.add(c); else set.delete(c);
          return val;
        }
      };
      this._innerHTML = '';
      this.eventListeners = new Map();
    }
    get innerHTML() { return this._innerHTML; }
    set innerHTML(html) { this._innerHTML = html; }
    addEventListener(event, fn) {
      if (!this.eventListeners.has(event)) this.eventListeners.set(event, []);
      this.eventListeners.get(event).push(fn);
    }
  }

  const rootElement = new MockElement('div', 'marketcycle');
  rootElement.classList.add('page', 'active');

  const mockDocument = {
    getElementById: (id) => (id === 'marketcycle' ? rootElement : null),
    documentElement: new MockElement('html'),
    body: new MockElement('body'),
    addEventListener: () => {}
  };
  const mockLocalStorage = {
    getItem: (k) => storage.get(k) || null,
    setItem: (k, v) => storage.set(k, String(v)),
    removeItem: (k) => storage.delete(k),
    clear: () => storage.clear()
  };
  const mockWindow = {
    document: mockDocument,
    localStorage: mockLocalStorage,
    MutationObserver: class { observe() {} disconnect() {} },
    addEventListener: () => {},
    appLanguage: 'pt-BR',
    MARKET_DATA_API_URL: 'http://localhost:8787/api'
  };

  let simulateStaleNasdaq = true;
  const originalFetch = global.fetch;
  global.fetch = async (url) => {
    if (url.includes('performance-by-regime')) {
      return { ok: true, json: async () => ({ rows: [], hasData: false, totalTrades: 0 }) };
    }
    const parsed = new URL(url);
    const benchmark = parsed.searchParams.get('benchmark') || 'IBOV';

    if (benchmark === 'NASDAQ' && simulateStaleNasdaq) {
      return {
        ok: true,
        json: async () => ({
          updatedAt: '2026-11-20T21:00:00Z',
          market: 'nasdaq',
          cycle: { state: 'defensive', score: 25, price: 608.45, ema10: 656.93, ema72: 701.15, date: '2026-11-20' },
          benchmark: {
            symbol: 'QQQ',
            name: 'Nasdaq-100 (QQQ)',
            history: [{ date: '2026-11-20', close: 608.45, ema10: 656.93, ema72: 701.15, regime: 'DOWN_VOLATILE' }]
          },
          marketRegime: {
            current: {
              reference_date: '2026-11-20',
              regime: 'DOWN_VOLATILE',
              direction: 'DOWN',
              volatility: 'VOLATILE',
              close_price: 608.45,
              ema_10: 656.93,
              ema_72: 701.15
            },
            regimes: [{ reference_date: '2026-11-20', regime: 'DOWN_VOLATILE', direction: 'DOWN', volatility: 'VOLATILE' }]
          },
          freshness: {
            benchmarkId: 'NASDAQ',
            market: 'US',
            lastCandleDate: '2026-11-20',
            expectedClosedDate: '2026-11-24',
            isUpToDate: false,
            isStale: true,
            status: 'stale',
            updatedAt: '2026-11-20T21:00:00Z',
            lastError: 'Falha temporária no provedor Twelve Data'
          }
        })
      };
    }

    return {
      ok: true,
      json: async () => ({
        updatedAt: '2026-11-24T21:30:00Z',
        market: 'nasdaq',
        cycle: { state: 'defensive', score: 25, price: 638.10, ema10: 652.63, ema72: 698.09, date: '2026-11-24' },
        benchmark: {
          symbol: 'QQQ',
          name: 'Nasdaq-100 (QQQ)',
          history: [{ date: '2026-11-24', close: 638.10, ema10: 652.63, ema72: 698.09, regime: 'DOWN_VOLATILE' }]
        },
        marketRegime: {
          current: {
            reference_date: '2026-11-24',
            regime: 'DOWN_VOLATILE',
            direction: 'DOWN',
            volatility: 'VOLATILE',
            close_price: 638.10,
            ema_10: 652.63,
            ema_72: 698.09
          },
          regimes: [{ reference_date: '2026-11-24', regime: 'DOWN_VOLATILE', direction: 'DOWN', volatility: 'VOLATILE' }]
        },
        freshness: {
          benchmarkId: 'NASDAQ',
          market: 'US',
          lastCandleDate: '2026-11-24',
          expectedClosedDate: '2026-11-24',
          isUpToDate: true,
          isStale: false,
          status: 'fresh',
          updatedAt: '2026-11-24T21:30:00Z',
          lastError: null
        }
      })
    };
  };

  const code = fs.readFileSync(path.join(__dirname, '../../frontend/market-cycle-v2.js'), 'utf8');
  const runCode = new Function('document', 'window', 'localStorage', 'MutationObserver', 'fetch', code);
  runCode(mockDocument, mockWindow, mockLocalStorage, mockWindow.MutationObserver, global.fetch);

  // 1. Carregar NASDAQ em estado defasado (20/11/2026 quando esperado 24/11/2026)
  await mockWindow.loadMarketCycleV2('NASDAQ');
  assert.ok(rootElement.innerHTML.includes('Dados desatualizados'), 'Deve exibir badge "Dados desatualizados"');
  assert.ok(rootElement.innerHTML.includes('Falha temporária no provedor Twelve Data'), 'Deve exibir o motivo da falha');
  assert.ok(rootElement.innerHTML.includes('20/11/2026'), 'Deve preservar e informar a data real do último dado em cache');

  // 2. Como o estado está marcado como isStale, uma nova chamada a load('NASDAQ') não deve ficar presa no cache em memória
  simulateStaleNasdaq = false;
  await mockWindow.loadMarketCycleV2('NASDAQ');
  assert.ok(!rootElement.innerHTML.includes('Dados desatualizados'), 'Após atualização bem-sucedida, alerta de dados desatualizados desaparece');
  assert.ok(rootElement.innerHTML.includes('24/11/2026'), 'Tela passa a exibir a nova data 24/11/2026');
  assert.ok(rootElement.innerHTML.includes('638,10'), 'Cotação atualizada para 638,10');
  assert.ok(rootElement.innerHTML.includes('652,63'), 'EMA 10 atualizada para 652,63');
  assert.ok(rootElement.innerHTML.includes('698,09'), 'EMA 72 atualizada para 698,09');

  global.fetch = originalFetch;
});
