const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const LiquidityGateModel = require('./liquidity-gate-model');

test('LiquidityGateModel: Aprovado para ativo líquido com volume médio acima do mínimo', () => {
  // Gera 25 dias consecutivos de pregões com R$ 10.000.000 diários
  const candles = [];
  const base = new Date('2026-09-01T12:00:00Z');
  for (let i = 0; i < 25; i++) {
    const d = new Date(base.getTime() + i * 24 * 3600 * 1000).toISOString().slice(0, 10);
    candles.push({
      time: d,
      open: 50,
      high: 51,
      low: 49,
      close: 50.5,
      volume: 10000000
    });
  }

  const result = LiquidityGateModel.evaluateLiquidity({
    candles,
    targetDate: '2026-09-25',
    symbol: 'WEGE3',
    market: 'B3'
  });

  assert.equal(result.isEligible, true);
  assert.equal(result.status, LiquidityGateModel.STATUS_CODES.APPROVED);
  assert.equal(result.metrics.evaluatedSessions, 21);
  assert.equal(result.metrics.averageDailyVolume, 10000000);
  assert.equal(result.badge.class, 'badge-liquidity-approved');
  assert.match(result.reason, /Liquidez aprovada/);
});

test('LiquidityGateModel: Regressão empírica BGAR39 é categoricamente bloqueado na data do sinal (2026-11-03)', () => {
  const cachePath = path.join(__dirname, '..', 'backend', 'data', 'b3-spot-candles-cache.json');
  assert.ok(fs.existsSync(cachePath), 'Cache de candles da B3 deve existir');

  const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  const bgarCandles = cache['BGAR39'];
  assert.ok(Array.isArray(bgarCandles), 'BGAR39 deve constar nos candles históricos da B3');

  const result = LiquidityGateModel.evaluateLiquidity({
    candles: bgarCandles,
    targetDate: '2026-11-03',
    symbol: 'BGAR39',
    market: 'B3'
  });

  // O ativo BGAR39 deve ser terminantemente rejeitado
  assert.equal(result.isEligible, false);
  // Rejeitado por descontinuidade / negociação esparsa ou volume insuficiente
  assert.ok(
    result.status === LiquidityGateModel.STATUS_CODES.SPARSE_TRADING ||
    result.status === LiquidityGateModel.STATUS_CODES.VOLUME_BELOW_MINIMUM
  );
  assert.equal(result.badge.text, 'BLOQUEADO POR LIQUIDEZ');
  assert.equal(result.badge.class, 'badge-liquidity-blocked');
});

test('LiquidityGateModel: Zero look-ahead bias — candles na data ou após o sinal não entram na janela', () => {
  const candles = [
    // 20 pregões com volume baixo
    ...Array.from({ length: 20 }, (_, i) => ({
      time: `2026-09-${String(i + 1).padStart(2, '0')}`,
      close: 10,
      volume: 100000
    })),
    // 21º pregão anterior (volume baixo)
    { time: '2026-09-21', close: 10, volume: 100000 },
    // Candle NO DIA DO SINAL com volume artificialmente inflado de R$ 500.000.000
    { time: '2026-09-22', close: 10, volume: 500000000 },
    // Candle posterior
    { time: '2026-09-23', close: 10, volume: 500000000 }
  ];

  const result = LiquidityGateModel.evaluateLiquidity({
    candles,
    targetDate: '2026-09-22',
    symbol: 'TEST3',
    market: 'B3'
  });

  // Não pode se beneficiar do volume de 2026-09-22
  assert.equal(result.isEligible, false);
  assert.equal(result.status, LiquidityGateModel.STATUS_CODES.VOLUME_BELOW_MINIMUM);
  assert.equal(result.metrics.targetDate, '2026-09-22');
  assert.equal(result.metrics.windowEndDate, '2026-09-21');
  assert.equal(result.metrics.averageDailyVolume, 100000);
});

test('LiquidityGateModel: Fail closed com candles vazios ou nulos', () => {
  const empty = LiquidityGateModel.evaluateLiquidity({ candles: [], targetDate: '2026-10-01' });
  assert.equal(empty.isEligible, false);
  assert.equal(empty.status, LiquidityGateModel.STATUS_CODES.DATA_UNAVAILABLE);

  const nil = LiquidityGateModel.evaluateLiquidity({ candles: null, targetDate: '2026-10-01' });
  assert.equal(nil.isEligible, false);
  assert.equal(nil.status, LiquidityGateModel.STATUS_CODES.DATA_UNAVAILABLE);
});

test('LiquidityGateModel: Histórico insuficiente (< 21 pregões prévios)', () => {
  const candles = Array.from({ length: 15 }, (_, i) => ({
    time: `2026-09-${String(i + 1).padStart(2, '0')}`,
    close: 10,
    volume: 10000000
  }));

  const result = LiquidityGateModel.evaluateLiquidity({
    candles,
    targetDate: '2026-09-16',
    symbol: 'IPO3',
    market: 'B3'
  });

  assert.equal(result.isEligible, false);
  assert.equal(result.status, LiquidityGateModel.STATUS_CODES.INSUFFICIENT_HISTORY);
  assert.match(result.reason, /Histórico insuficiente/);
});

test('LiquidityGateModel: Negociação esparsa / ativo descontinuado (> 45 dias corridos para 21 pregões)', () => {
  // 21 pregões espaçados por 5 dias cada (span total > 100 dias corridos)
  const candles = [];
  const base = new Date('2026-01-01T12:00:00Z');
  for (let i = 0; i < 21; i++) {
    const d = new Date(base.getTime() + i * 5 * 24 * 3600 * 1000).toISOString().slice(0, 10);
    candles.push({
      time: d,
      close: 20,
      volume: 2000000 // volume aparentemente bom, mas negocia uma vez por semana
    });
  }

  const result = LiquidityGateModel.evaluateLiquidity({
    candles,
    targetDate: '2026-05-01',
    symbol: 'SPARSE3',
    market: 'B3'
  });

  assert.equal(result.isEligible, false);
  assert.equal(result.status, LiquidityGateModel.STATUS_CODES.SPARSE_TRADING);
  assert.match(result.reason, /Negociação esparsa/);
});

test('LiquidityGateModel: Critério alternativo de número de negócios quando volume financeiro ausente', () => {
  // Candles sem campo volume, mas com trades
  const candles = Array.from({ length: 21 }, (_, i) => ({
    time: `2026-09-${String(i + 1).padStart(2, '0')}`,
    close: 30,
    trades: 850
  }));

  const passResult = LiquidityGateModel.evaluateLiquidity({
    candles,
    targetDate: '2026-09-22',
    symbol: 'TRD3',
    market: 'B3'
  });

  assert.equal(passResult.isEligible, true);
  assert.equal(passResult.status, LiquidityGateModel.STATUS_CODES.APPROVED);
  assert.match(passResult.reason, /critério de negócios/);

  // Candles com poucos negócios (< 500)
  const illiquidCandles = Array.from({ length: 21 }, (_, i) => ({
    time: `2026-09-${String(i + 1).padStart(2, '0')}`,
    close: 30,
    trades: 120
  }));

  const failResult = LiquidityGateModel.evaluateLiquidity({
    candles: illiquidCandles,
    targetDate: '2026-09-22',
    symbol: 'LOWTRD3',
    market: 'B3'
  });

  assert.equal(failResult.isEligible, false);
  assert.equal(failResult.status, LiquidityGateModel.STATUS_CODES.TRADES_BELOW_MINIMUM);
});

test('LiquidityGateModel: Detecção de mercado US aplica teto de US$ 1.000.000', () => {
  const candles = Array.from({ length: 21 }, (_, i) => ({
    time: `2026-09-${String(i + 1).padStart(2, '0')}`,
    close: 100,
    volume: 750000 // R$ 750.000 passaria em B3 (min 500k), mas US$ 750.000 deve reprovar em US (min 1M)
  }));

  const resultUs = LiquidityGateModel.evaluateLiquidity({
    candles,
    targetDate: '2026-09-22',
    symbol: 'AAPL',
    market: 'US'
  });

  assert.equal(resultUs.isEligible, false);
  assert.equal(resultUs.status, LiquidityGateModel.STATUS_CODES.VOLUME_BELOW_MINIMUM);
  assert.equal(resultUs.metrics.minDailyVolume, 1000000);
  assert.match(resultUs.reason, /US\$/);
});
