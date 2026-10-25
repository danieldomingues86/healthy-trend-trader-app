const test = require('node:test');
const assert = require('node:assert/strict');
const MarketCycleModel = require('../../frontend/market-cycle-model');
const simulatorModel = require('../../frontend/trade-simulator-model');
const tradeSimulator = require('../src/trade-simulator');
const { getOpportunityRadarData } = require('../src/opportunity-radar');
const trades = require('../src/trades');

test('Regra Central P0: validateMarketPermissionForBuy exige Preço > EMA 10 AND Preço > EMA 72 AND Ciclo Favorável', () => {
  // 1. Todas as condições satisfeitas -> Permite
  const ok = MarketCycleModel.validateMarketPermissionForBuy({
    regime: 'healthy',
    indexPrice: 100,
    indexEma10: 95,
    indexEma72: 90,
    benchmarkSymbol: 'IBOV'
  });
  assert.equal(ok.isPermitted, true);
  assert.equal(ok.isFavorable, true);
  assert.equal(ok.aboveEma10, true);
  assert.equal(ok.aboveEma72, true);
  assert.equal(ok.reason, null);

  // 2. Preço abaixo da EMA 10 -> Bloqueia
  const belowEma10 = MarketCycleModel.validateMarketPermissionForBuy({
    regime: 'healthy',
    indexPrice: 94,
    indexEma10: 95,
    indexEma72: 90,
    benchmarkSymbol: 'IBOV'
  });
  assert.equal(belowEma10.isPermitted, false);
  assert.equal(belowEma10.aboveEma10, false);
  assert.match(belowEma10.reason, /ENTRADA BLOQUEADA/);
  assert.ok(belowEma10.reasons.some(r => r.includes('abaixo da EMA 10')));

  // 3. Preço abaixo da EMA 72 -> Bloqueia
  const belowEma72 = MarketCycleModel.validateMarketPermissionForBuy({
    regime: 'healthy',
    indexPrice: 96,
    indexEma10: 95,
    indexEma72: 98,
    benchmarkSymbol: 'IBOV'
  });
  assert.equal(belowEma72.isPermitted, false);
  assert.equal(belowEma72.aboveEma72, false);
  assert.match(belowEma72.reason, /ENTRADA BLOQUEADA/);
  assert.ok(belowEma72.reasons.some(r => r.includes('abaixo da EMA 72')));

  // 4. Preço acima das duas, mas regime é defensivo -> Bloqueia
  const defensiveRegime = MarketCycleModel.validateMarketPermissionForBuy({
    regime: 'defensive',
    indexPrice: 100,
    indexEma10: 95,
    indexEma72: 90,
    benchmarkSymbol: 'IBOV'
  });
  assert.equal(defensiveRegime.isPermitted, false);
  assert.match(defensiveRegime.reason, /CICLO DE MERCADO DEFENSIVO/);

  // 5. Dados ausentes ou inválidos -> Bloqueia por padrão (Safe Fallback)
  const missingData = MarketCycleModel.validateMarketPermissionForBuy({});
  assert.equal(missingData.isPermitted, false);
  assert.match(missingData.reason, /DADOS DO ÍNDICE DE REFERÊNCIA AUSENTES OU INSUFICIENTES/);

  const nanData = MarketCycleModel.validateMarketPermissionForBuy({
    regime: 'healthy',
    indexPrice: NaN,
    indexEma10: 95,
    indexEma72: 90
  });
  assert.equal(nanData.isPermitted, false);
});

test('Benchmark mapping: Ativos são mapeados corretamente para seus índices de referência', () => {
  // Ações B3 comuns e units de ações
  assert.equal(MarketCycleModel.getBenchmarkForAsset('PETR4').symbol, 'IBOV');
  assert.equal(MarketCycleModel.getBenchmarkForAsset('VALE3').symbol, 'IBOV');
  assert.equal(MarketCycleModel.getBenchmarkForAsset('KLBN11').symbol, 'IBOV');
  assert.equal(MarketCycleModel.getBenchmarkForAsset('SANB11').symbol, 'IBOV');
  assert.equal(MarketCycleModel.getBenchmarkForAsset('BPAC11').symbol, 'IBOV');

  // FIIs
  assert.equal(MarketCycleModel.getBenchmarkForAsset('JGPX11').symbol, 'IFIX');
  assert.equal(MarketCycleModel.getBenchmarkForAsset('HGLG11').symbol, 'IFIX');
  assert.equal(MarketCycleModel.getBenchmarkForAsset('KNIP11').symbol, 'IFIX');
  assert.equal(MarketCycleModel.getBenchmarkForAsset('HGRF11').symbol, 'IFIX');

  // BDRs
  assert.equal(MarketCycleModel.getBenchmarkForAsset('AAPL34').symbol, 'BDRX');
  assert.equal(MarketCycleModel.getBenchmarkForAsset('NVDC34').symbol, 'BDRX');

  // Nasdaq
  assert.equal(MarketCycleModel.getBenchmarkForAsset('AAPL').symbol, 'QQQ');
  assert.equal(MarketCycleModel.getBenchmarkForAsset('NVDA').symbol, 'QQQ');
});

test('Caso Real JGPX11 (10/03/2026): IFIX estava com Preço < EMA 10 -> Bloqueio estrito de compra', () => {
  const cycleMap = tradeSimulator.getPrecomputedBenchmarkCycleMap();
  const ifixPerm = cycleMap.get('IFIX:2026-03-10');

  assert.ok(ifixPerm, 'IFIX em 10/03/2026 deve estar precomputado');
  assert.equal(ifixPerm.isPermitted, false, 'IFIX em 10/03/2026 NÃO deve ter permissão de compra');
  assert.equal(ifixPerm.aboveEma10, false, 'Preço do IFIX estava abaixo da EMA 10');
  assert.match(ifixPerm.reason, /ENTRADA BLOQUEADA — CICLO DE MERCADO DEFENSIVO/);

  // Simulador de trades: detectSetupTrigger com permissão defensiva retorna null
  const mockCandles = [
    { time: '2026-03-08', open: 70.0, high: 71.5, low: 69.8, close: 71.2 },
    { time: '2026-03-09', open: 71.2, high: 72.0, low: 70.5, close: 71.8 },
    { time: '2026-03-10', open: 71.5, high: 71.7, low: 70.8, close: 71.4 } // Inside Bar geométrico
  ];
  // Sem permissão de mercado, a detecção é bloqueada
  const trigger = simulatorModel.detectSetupTrigger(mockCandles, {
    marketPermission: ifixPerm
  });
  assert.equal(trigger, null, 'Gatilho de compra deve ser bloqueado quando ciclo for defensivo');

  // Com trilha de auditoria
  const audit = simulatorModel.evaluateSetupTriggerWithAudit(mockCandles, {
    marketPermission: ifixPerm
  });
  assert.equal(audit.isValid, false);
  assert.equal(audit.hasTrigger, false);
  assert.equal(audit.rejectionReason, 'ENTRADA BLOQUEADA — CICLO DE MERCADO DEFENSIVO');
});

test('Trade Simulator create(): Rejeita criação com 422 quando regime for defensivo na data do sinal', async () => {
  const mockClient = { query: async () => ({ rows: [] }) };

  await assert.rejects(
    async () => {
      await tradeSimulator.create(
        'user-test-123',
        {
          symbol: 'JGPX11',
          triggerName: 'Inside Bar',
          entryPrice: 71.30,
          stopLoss: 70.83,
          signalDate: '2026-03-10'
        },
        mockClient
      );
    },
    (err) => {
      assert.equal(err.status, 422);
      assert.match(err.message, /ENTRADA BLOQUEADA — CICLO DE MERCADO DEFENSIVO/);
      return true;
    }
  );
});

test('Trades createPlan() e createPendingOrder(): Bloqueiam compras em ciclo defensivo', async () => {
  // createPlan com marketCycle: 'defensive'
  await assert.rejects(
    async () => {
      await trades.createPlan('user-test-123', {
        asset: 'PETR4',
        direction: 'long',
        entry: 30.0,
        stop: 28.5,
        plannedQuantity: 100,
        riskPct: 0.005,
        grade: 'B',
        marketCycle: 'defensive',
        rubricResponses: { marketCycle: 'defensive' }
      });
    },
    (err) => {
      assert.match(err.message, /ENTRADA BLOQUEADA — CICLO DE MERCADO DEFENSIVO/);
      return true;
    }
  );

  // createPendingOrder com marketCycle: 'defensive'
  await assert.rejects(
    async () => {
      await trades.createPendingOrder('user-test-123', {
        ticker: 'PETR4',
        direction: 'long',
        entry: 30.0,
        stop: 28.5,
        quantity: 100,
        setup: 'Inside Bar',
        marketCycle: 'defensive',
        snapshotMarketData: { marketCycle: 'defensive' }
      });
    },
    (err) => {
      assert.match(err.message, /ENTRADA BLOQUEADA — CICLO DE MERCADO DEFENSIVO/);
      return true;
    }
  );
});

test('Opportunity Radar: Mercados em ciclo defensivo excluem seus ativos do pool de oportunidades', async () => {
  const mockCache = {
    updatedAt: new Date().toISOString(),
    cycles: {
      stock_b3: {
        cycle: { state: 'healthy', price: 130000, ema10: 128000, ema72: 120000 },
        benchmark: { symbol: 'IBOV' }
      },
      fii: {
        cycle: { state: 'defensive', price: 3800, ema10: 3850, ema72: 3750 }, // Preço < EMA 10
        benchmark: { symbol: 'IFIX' }
      },
      bdr: {
        cycle: { state: 'defensive', price: 26000, ema10: 27000, ema72: 27500 }, // Preço < EMA 10 e EMA 72
        benchmark: { symbol: 'BDRX' }
      }
    },
    relativeStrength: [],
    relativeStrengthByClass: {
      stock_ibov: { items: [{ symbol: 'PETR4', rsScore: 90 }] },
      fii: { items: [{ symbol: 'JGPX11', rsScore: 95 }, { symbol: 'HGLG11', rsScore: 92 }] },
      bdr: { items: [{ symbol: 'AAPL34', rsScore: 94 }] }
    }
  };

  const radarData = await getOpportunityRadarData(mockCache);

  // FIIs e BDRs devem ter 0 itens no radar porque seus ciclos de mercado estão Defensivos
  const fiiItems = radarData.items.filter(item => item.marketCategory === 'IFIX');
  const bdrItems = radarData.items.filter(item => item.marketCategory === 'BDRs');

  assert.equal(fiiItems.length, 0, 'FIIs não devem gerar entradas quando IFIX estiver defensivo');
  assert.equal(bdrItems.length, 0, 'BDRs não devem gerar entradas quando BDRX estiver defensivo');
});
