const test = require('node:test');
const assert = require('node:assert/strict');
const { marketScansFromCache } = require('../src/market-scans');
const { mergeLiveQuote } = require('../src/market-data');

function asset(symbol, overrides = {}) {
  return {
    symbol, name: symbol, sector: 'Tecnologia', score: 94, m1: 8, m3: 20,
    relativeTrend: { change6w: 9, change13w: 12, direction6w: 'up', direction13w: 'up' },
    scan: { dayChangePct: 12, volume: 3_000_000, volumeRatio: 2.8, atrPct: 1.7, ema20: 102, ema200: 91, price: 110, healthyTrend: true },
    ...overrides
  };
}

test('market scans reutiliza as métricas de cache e retorna os sete scans da V1', () => {
  const cache = { updatedAt: '2026-09-06T20:00:00.000Z', source: 'brapi', benchmark: { symbol: 'IBOV' }, relativeStrength: [asset('ABCD3')], relativeStrengthByClass: { fii: { items: [] }, bdr: { items: [] } } };
  const payload = marketScansFromCache(cache);
  assert.equal(payload.cards.length, 7);
  assert.equal(payload.universe.total, 1);
  assert.equal(payload.cards.find((card) => card.id === 'strong-up').count, 1);
  assert.equal(payload.cards.find((card) => card.id === 'abnormal-volume').count, 1);
  assert.equal(payload.cards.find((card) => card.id === 'rs-leaders').results[0].symbol, 'ABCD3');
  assert.equal(payload.cards.find((card) => card.id === 'healthy-trend').count, 1);
});

test('market scans informa indisponibilidade de métricas sem fabricar resultados', () => {
  const cache = { updatedAt: '2026-09-02T20:00:00.000Z', relativeStrength: [asset('LEGACY3', { scan: undefined })] };
  const payload = marketScansFromCache(cache);
  assert.equal(payload.cards.find((card) => card.id === 'strong-up').available, false);
  assert.equal(payload.cards.find((card) => card.id === 'low-atr').count, 0);
  assert.equal(payload.cards.find((card) => card.id === 'rs-leaders').available, true);
});

test('cotação ao vivo atualiza o scan intradiário sem apagar métricas históricas', () => {
  const current = asset('ABCD3', { scan: { price: 100, averageVolume20: 1_000, atrPct: 1.5, ema20: 95, ema200: 90, healthyTrend: true } });
  const next = mergeLiveQuote(current, { regularMarketPrice: 104, regularMarketChangePercent: 4, regularMarketVolume: 3_200 });
  assert.equal(next.scan.price, 104);
  assert.equal(next.scan.dayChangePct, 4);
  assert.equal(next.scan.volumeRatio, 3.2);
  assert.equal(next.scan.atrPct, 1.5);
  assert.equal(next.scan.healthyTrend, true);
});
