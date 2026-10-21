const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { adjustCandles, adjustHistoricalSeries, getEventsForSymbol, CORPORATE_EVENTS } = require('../src/corporate-events');

test('corporate-events: identifica evento de grupamento 10:1 para LUPA3 em 14/08/2026', () => {
  const events = getEventsForSymbol('LUPA3');
  assert.equal(events.length, 1);
  assert.equal(events[0].exDate, '2026-08-14');
  assert.equal(events[0].ratio, 10.0);
  assert.equal(events[0].type, 'reverse_split');
});

test('corporate-events: adjustCandles ajusta preços anteriores à data-ex e preserva posteriores', () => {
  const candles = [
    { time: '2026-08-12', open: 0.59, high: 0.60, low: 0.59, close: 0.59, volume: 10000 },
    { time: '2026-08-13', open: 0.59, high: 0.60, low: 0.57, close: 0.60, volume: 30000 },
    { time: '2026-08-14', open: 5.89, high: 5.89, low: 5.89, close: 5.89, volume: 500 },
    { time: '2026-08-17', open: 5.75, high: 5.75, low: 3.60, close: 3.60, volume: 50000 }
  ];

  const adjusted = adjustCandles(candles, 'LUPA3');

  // Pregão anterior ao grupamento: 0.60 * 10 = 6.00
  assert.equal(adjusted[1].close, 6.0);
  assert.equal(adjusted[1].volume, 3000);

  // Pregão na data-ex e posterior: inalterados
  assert.equal(adjusted[2].close, 5.89);
  assert.equal(adjusted[2].volume, 500);
  assert.equal(adjusted[3].close, 3.60);
});

test('corporate-events: adjustHistoricalSeries ajusta série { date, close }', () => {
  const series = [
    { date: '20260813', close: 0.60 },
    { date: '20260814', close: 5.89 }
  ];

  const adjusted = adjustHistoricalSeries(series, 'LUPA3');
  assert.equal(adjusted[0].close, 6.0);
  assert.equal(adjusted[1].close, 5.89);
});

test('corporate-events: ativo sem eventos cadastrados não sofre alterações', () => {
  const candles = [
    { time: '2026-08-13', open: 30.0, high: 31.0, low: 29.5, close: 30.5, volume: 1000 }
  ];
  const adjusted = adjustCandles(candles, 'PETR4');
  assert.deepEqual(adjusted, candles);
});

test('corporate-events: corrige EMA 30 de LUPA3 para 4,12 (conforme Profit) e elimina retorno fictício de +498%', () => {
  function calcEma(series, period) {
    const k = 2 / (period + 1);
    let ema = series[0].close;
    for (let i = 1; i < series.length; i++) {
      ema = series[i].close * k + ema * (1 - k);
    }
    return ema;
  }

  const cachePath = path.join(__dirname, '..', 'data', 'b3-spot-candles-cache.json');
  if (!fs.existsSync(cachePath)) return;

  const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  const realCandles = cache['LUPA3'];
  if (!realCandles || realCandles.length < 50) return;

  const targetCandles = realCandles.filter(c => c.time <= '2026-10-19');
  const adjustedCandles = adjustCandles(targetCandles, 'LUPA3');

  const unadjustedEma30 = calcEma(targetCandles, 30);
  const adjustedEma30 = calcEma(adjustedCandles, 30);

  // Sem ajuste: EMA 30 resulta em 3.83
  assert.equal(Number(unadjustedEma30.toFixed(2)), 3.83);

  // Com ajuste: EMA 30 resulta exatamente em 4.12 (idêntico ao Profit!)
  assert.equal(Number(adjustedEma30.toFixed(2)), 4.12);

  // 3 meses atrás (64 pregões antes de 19/10/2026):
  const p3mUnadjusted = targetCandles[targetCandles.length - 64].close; // ~0.69
  const p3mAdjusted = adjustedCandles[adjustedCandles.length - 64].close; // ~6.90
  const latestClose = adjustedCandles[adjustedCandles.length - 1].close; // 4.24

  const retUnadjusted = (latestClose - p3mUnadjusted) / p3mUnadjusted;
  const retAdjusted = (latestClose - p3mAdjusted) / p3mAdjusted;

  assert.ok(retUnadjusted > 4.0, 'Retorno sem ajuste produzia distorção de > +400%');
  assert.ok(retAdjusted < -0.30, 'Retorno ajustado real é negativo (~ -38% a -40%)');
});
