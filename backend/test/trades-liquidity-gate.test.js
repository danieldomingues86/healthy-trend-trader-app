const test = require('node:test');
const assert = require('node:assert/strict');
const trades = require('../src/trades');

test('trades.createPlan: Bloqueia criação de operação em ativo ilíquido (BGAR39)', async () => {
  const illiquidPayload = {
    ticker: 'BGAR39',
    market: 'B3',
    direction: 'long',
    setup: 'Barra Vermelha Ignorada',
    setupTrigger: 'RBI',
    entry: 70.99,
    stop: 70.07,
    plannedQuantity: 100,
    executedQty: 100,
    riskPct: 0.002,
    grade: 'B',
    rubricScore: 80,
    rubricMaxScore: 100,
    entryDate: '2026-11-03',
    rubricResponses: {
      trendQuality: 'good',
      marketCycle: 'healthy',
      relativeStrength: 'good',
      volatility: 'good',
      setupQuality: 'good',
      fundamentalScore: 'good'
    }
  };

  await assert.rejects(
    async () => {
      await trades.createPlan('test-user-id', illiquidPayload);
    },
    (err) => {
      assert.ok(
        err.message.includes('Liquidity Gate') ||
        err.message.includes('liquidez') ||
        err.message.includes('BLOQUEADO'),
        `Mensagem esperada de bloqueio de liquidez, recebido: ${err.message}`
      );
      assert.equal(err.status, 400);
      return true;
    }
  );
});
