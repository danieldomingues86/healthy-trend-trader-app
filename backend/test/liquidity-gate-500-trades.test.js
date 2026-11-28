'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const LiquidityGateModel = require('../../frontend/liquidity-gate-model');
const TradingRubrics = require('../../frontend/trading-rubrics');
const OpportunityRadarModel = require('../../frontend/opportunity-radar-model');
const tickerChart = require('../src/ticker-chart');
const trades = require('../src/trades');

function generateMockCandles(count, dailyVolume, dailyTrades) {
  const candles = [];
  const baseDate = new Date('2026-10-01');
  for (let i = 0; i < count; i++) {
    const d = new Date(baseDate);
    d.setDate(baseDate.getDate() + i);
    const dateStr = d.toISOString().slice(0, 10);
    candles.push({
      time: dateStr,
      open: 50.0,
      high: 51.5,
      low: 49.5,
      close: 51.0,
      volume: dailyVolume,
      trades: dailyTrades
    });
  }
  return candles;
}

test('Liquidity Gate 500 trades: Ação B3 com 499 negócios/dia é estritamente reprovada (Hard Gate)', () => {
  const candles = generateMockCandles(30, 2000000, 499); // Volume R$ 2 mi (alto), mas 499 negócios
  const result = LiquidityGateModel.evaluateLiquidity({
    candles,
    symbol: 'ACAO3',
    market: 'B3'
  });

  assert.strictEqual(result.isEligible, false, 'Ativo com 499 negócios/dia não pode ser elegível');
  assert.strictEqual(result.code, 'TRADES_BELOW_MINIMUM');
  assert.strictEqual(result.badge.text, 'ATIVO SEM LIQUIDEZ — NÃO OPERE');
  assert.ok(result.reason.includes('ATIVO SEM LIQUIDEZ — NÃO OPERE'));
  assert.ok(result.reason.includes('500 negócios/dia'));
});

test('Liquidity Gate 500 trades: Ação B3 com exatamente 500 negócios/dia é aprovada', () => {
  const candles = generateMockCandles(30, 2000000, 500);
  const result = LiquidityGateModel.evaluateLiquidity({
    candles,
    symbol: 'ACAO3',
    market: 'B3'
  });

  assert.strictEqual(result.isEligible, true, 'Ativo com 500 negócios/dia e volume adequado deve ser aprovado');
  assert.strictEqual(result.code, 'APPROVED');
  assert.strictEqual(result.badge.text, 'LIQUIDEZ APROVADA');
});

test('Liquidity Gate 500 trades: BDR com 350 negócios/dia é reprovada', () => {
  const candles = generateMockCandles(30, 1500000, 350);
  const result = LiquidityGateModel.evaluateLiquidity({
    candles,
    symbol: 'BDRX34',
    market: 'B3'
  });

  assert.strictEqual(result.isEligible, false, 'BDR com menos de 500 negócios/dia deve ser reprovada');
  assert.strictEqual(result.code, 'TRADES_BELOW_MINIMUM');
  assert.strictEqual(result.badge.text, 'ATIVO SEM LIQUIDEZ — NÃO OPERE');
});

test('Liquidity Gate 500 trades: BDR com 850 negócios/dia é aprovada', () => {
  const candles = generateMockCandles(30, 1500000, 850);
  const result = LiquidityGateModel.evaluateLiquidity({
    candles,
    symbol: 'BDRX34',
    market: 'B3'
  });

  assert.strictEqual(result.isEligible, true, 'BDR com 850 negócios/dia deve ser aprovada');
  assert.strictEqual(result.code, 'APPROVED');
});

test('Liquidity Gate 500 trades: FII com 200 negócios/dia é reprovado', () => {
  const candles = generateMockCandles(30, 800000, 200);
  const result = LiquidityGateModel.evaluateLiquidity({
    candles,
    symbol: 'HGLG11',
    market: 'B3'
  });

  assert.strictEqual(result.isEligible, false, 'FII com 200 negócios/dia deve ser reprovado');
  assert.strictEqual(result.code, 'TRADES_BELOW_MINIMUM');
  assert.strictEqual(result.badge.text, 'ATIVO SEM LIQUIDEZ — NÃO OPERE');
});

test('Liquidity Gate 500 trades: Fail-Closed em dado ausente ou indisponível', () => {
  const candlesWithoutTrades = generateMockCandles(30, 2000000, 0).map(c => ({
    time: c.time,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
    volume: c.volume
    // Sem campo trades ou trades = 0
  }));

  const result = LiquidityGateModel.evaluateLiquidity({
    candles: candlesWithoutTrades,
    symbol: 'TEST3',
    market: 'B3'
  });

  assert.strictEqual(result.isEligible, false);
  assert.strictEqual(result.code, 'DATA_UNAVAILABLE');
  assert.strictEqual(result.badge.text, 'ATIVO SEM LIQUIDEZ — NÃO OPERE');
  assert.ok(result.reason.includes('Dados de negócios indisponíveis'));
});

test('Trading Rubric: Critério Negócios por dia bloqueia nota final (Grade D) e zera Risk Budget se < 500', () => {
  const rubric = TradingRubrics.calculateRubric({
    ratings: {
      trendQuality: 'good',
      marketCycle: 'healthy',
      relativeStrength: 'good',
      volatility: 'good',
      setupQuality: 'good',
      fundamentalScore: 'good'
    },
    dailyTrades: 380, // Abaixo do mínimo de 500
    market: 'B3',
    entry: 50,
    atr: 1.5
  });

  assert.strictEqual(rubric.grade, 'D', 'Ativo com 380 negócios/dia deve ter nota travada em Grade D');
  assert.strictEqual(rubric.riskBudgetPct, 0, 'Risk Budget deve ser zerado (0%)');
  assert.strictEqual(rubric.isLiquidityApproved, false);
  assert.strictEqual(rubric.isBuyPermitted, false);

  const tradesGate = rubric.gates.find(g => g.key === 'dailyTrades');
  assert.ok(tradesGate, 'Deve existir o gate explícito dailyTrades');
  assert.strictEqual(tradesGate.status, 'blocked');
  assert.strictEqual(tradesGate.observed, 380);
  assert.strictEqual(tradesGate.minimum, 500);
  assert.ok(tradesGate.message.includes('ATIVO SEM LIQUIDEZ — NÃO OPERE'));
});

test('Trading Rubric: Critério Negócios por dia aprovado quando >= 500', () => {
  const rubric = TradingRubrics.calculateRubric({
    ratings: {
      trendQuality: 'good',
      marketCycle: 'healthy',
      relativeStrength: 'good',
      volatility: 'good',
      setupQuality: 'good',
      fundamentalScore: 'good'
    },
    dailyTrades: 750,
    market: 'B3',
    entry: 50,
    atr: 1.5
  });

  assert.notStrictEqual(rubric.grade, 'D', 'Ativo com 750 negócios/dia não deve ser travado em Grade D');
  assert.ok(rubric.riskBudgetPct > 0, 'Risk Budget deve ser liberado');
  assert.strictEqual(rubric.isLiquidityApproved, true);
  assert.strictEqual(rubric.isBuyPermitted, true);

  const tradesGate = rubric.gates.find(g => g.key === 'dailyTrades');
  assert.ok(tradesGate);
  assert.strictEqual(tradesGate.status, 'approved');
  assert.strictEqual(tradesGate.observed, 750);
});

test('Radar de Oportunidades: evaluateAssetReadiness descarta ativo com menos de 500 negócios/dia', () => {
  const illiquidCandles = generateMockCandles(35, 1000000, 220); // 220 negócios
  const item = {
    symbol: 'WEGE3',
    name: 'Weg ON',
    sector: 'Bens Industriais',
    score: 95
  };

  const ready = OpportunityRadarModel.evaluateAssetReadiness(item, illiquidCandles, 'healthy');
  assert.strictEqual(ready, null, 'Ativo com 220 negócios/dia não pode ser qualificado no Radar');
});

test('Radar de Oportunidades: filterOpportunities descarta ativo se tradesCount < 500', () => {
  const items = [
    { symbol: 'PETR4', status: 'Pronto para entrada', tradesCount: 15000, dailyTrades: 15000, marketCycleState: 'healthy' },
    { symbol: 'ILLIQ3', status: 'Pronto para entrada', tradesCount: 300, dailyTrades: 300, marketCycleState: 'healthy' }
  ];

  const filtered = OpportunityRadarModel.filterOpportunities(items, { market: 'ALL' });
  assert.strictEqual(filtered.length, 1);
  assert.strictEqual(filtered[0].symbol, 'PETR4');
});

test('Gráficos TickerChart: criteriaTable inclui critério Negócios por dia com status correspondente', async () => {
  const data = await tickerChart.getTickerChartData('PETR4');
  assert.ok(data.rubric, 'Rubric deve existir');
  assert.ok(Array.isArray(data.rubric.criteria), 'Criteria deve ser array');

  const tradesCriteria = data.rubric.criteria.find(c => c.name === 'Negócios por dia');
  assert.ok(tradesCriteria, 'Critério Negócios por dia deve estar presente na Rubric');
  assert.strictEqual(tradesCriteria.status, true, 'PETR4 tem dezenas de milhares de negócios/dia');
  assert.ok(tradesCriteria.obs.includes('/ 500 mín.'));
});

test('Bloqueio no Backend: validateLiquidityGate rejeita tentativa de operação em BGAR39 (< 500 negócios/dia)', () => {
  assert.throws(
    () => {
      trades.validateLiquidityGate({
        ticker: 'BGAR39',
        market: 'B3',
        direction: 'long'
      });
    },
    (err) => {
      assert.ok(
        err.message.includes('Liquidity Gate') ||
        err.message.includes('liquidez') ||
        err.message.includes('ATIVO SEM LIQUIDEZ'),
        `Mensagem esperada de erro de liquidez, recebido: ${err.message}`
      );
      return true;
    }
  );
});
