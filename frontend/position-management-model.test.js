const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('./position-management-model');

function position(price = 55, stop = 45, direction = 'long', quantity = 1000) {
  return { entry: 50, initialStop: direction === 'long' ? 45 : 55, initialQty: quantity,
    direction, currentPrice: price, currentStop: stop, events: [{ type: 'entry', qty: quantity, price: 50, stop: direction === 'long' ? 45 : 55 }] };
}
const evaluate = (p, settings) => model.state(p, model.metricsFromEvents(p), settings);

test('antes de 2R a oportunidade não aparece; em 2,5R aparece sem executar saída', () => {
  const p = position(57);
  assert.equal(evaluate(p).sellAvailable, false);
  p.currentPrice = 62.5;
  assert.equal(evaluate(p).sellAvailable, true);
  assert.equal(evaluate(p).remaining, 1000);
  assert.equal(model.currentR(p), 2.5);
  assert.equal(evaluate(p, { enabled: false }).sellAvailable, false);
  p.currentPrice = 70;
  assert.equal(evaluate(p).sellAvailable, true); // salto além de 3R mantém a escolha manual
});

test('50% pode gerar Runner sem Free Roll quando não cobre o Ongoing Risk', () => {
  const p = position(60, 45);
  p.events.push({ type: 'peeloff', qty: 500, price: 52 });
  const s = evaluate(p);
  assert.equal(s.runner, true);
  assert.equal(s.remaining, 500);
  assert.equal(s.realizedProfit, 1000);
  assert.equal(s.ongoingRisk, 7500);
  assert.equal(s.freeRoll, false);
});

test('Sell Into Strength registrado não volta a oferecer a mesma parcial', () => {
  const p = position(62.5, 52);
  p.events.push({ type: 'peeloff', qty: 500, price: 62.5, context: { source: 'sell_into_strength' } });
  const s = evaluate(p);
  assert.equal(s.sellCount, 1);
  assert.equal(s.sellAvailable, false);
  assert.equal(s.runner, true);
  assert.equal(s.freeRoll, true);
});

test('reconhece Sell Into Strength em eventos antigos pela anotação registrada', () => {
  const p = position(62.5, 52);
  p.events.push({ type: 'peeloff', qty: 500, price: 62.5, note: 'Sell Into Strength · parcial de 50,0% registrada manualmente.' });
  const s = evaluate(p);
  assert.equal(model.isSellIntoStrength(p.events[1]), true);
  assert.equal(s.sellCount, 1);
  assert.equal(s.sellAvailable, false);
});

test('lucro realizado cobre Ongoing Risk e trailing stop recalcula cobertura', () => {
  const p = position(62.5, 45);
  p.events.push({ type: 'peeloff', qty: 500, price: 62.5 });
  assert.equal(evaluate(p).ongoingRisk, 8750);
  assert.equal(evaluate(p).freeRoll, false);
  p.currentStop = 52;
  const s = evaluate(p);
  assert.equal(s.realizedProfit, 6250);
  assert.equal(s.ongoingRisk, 5250);
  assert.equal(s.freeRoll, true);
  assert.ok(s.coverage > 1);
  assert.equal(model.currentR(p), 2.5); // o stop movido não muda o risco histórico
});

test('segunda parcial preserva quantidade original e recalcula realizado, saldo, risco e cobertura', () => {
  const p = position(65, 45);
  p.events.push({ type: 'peeloff', qty: 250, price: 60 });
  p.events.push({ type: 'peeloff', qty: 250, price: 65 });
  const s = evaluate(p);
  assert.equal(s.originalQuantity, 1000);
  assert.equal(s.remaining, 500);
  assert.equal(s.realizedProfit, 6250);
  assert.equal(s.ongoingRisk, 10000);
  assert.equal(s.freeRoll, false);
  p.currentStop = 55;
  assert.equal(evaluate(p).ongoingRisk, 5000);
  assert.equal(evaluate(p).freeRoll, true);
});

test('Runner sobe sem saída automática; SHORT usa fórmula invertida', () => {
  const p = position(62.5, 45);
  p.events.push({ type: 'peeloff', qty: 500, price: 62.5 });
  p.currentPrice = 100;
  assert.equal(model.currentR(p), 10);
  assert.equal(evaluate(p).remaining, 500);
  assert.equal(p.events.length, 2);
  const short = position(37.5, 55, 'short');
  assert.equal(model.currentR(short), 2.5);
  assert.equal(evaluate(short).sellAvailable, true);
  assert.equal(model.preview(short, model.metricsFromEvents(short), 50, 37.5).realizedProfit, 6250);
});

test('preview rejeita quantidade inválida e preserva ao menos uma unidade', () => {
  const p = position(62.5, 45, 'long', 3), metric = model.metricsFromEvents(p);
  assert.equal(model.preview(p, metric, 50, 62.5).quantity, 1);
  assert.equal(model.preview(p, metric, 90, 62.5, 3), null);
  assert.equal(model.preview(p, metric, 50, 62.5, 1.5), null);
  assert.equal(model.preview(p, metric, 50, -1), null);
  const single = position(62.5, 45, 'long', 1);
  assert.equal(evaluate(single).sellAvailable, false);
  assert.equal(model.preview(single, model.metricsFromEvents(single), 50, 62.5), null);
});

test('stop inicial invertido ou coincidente não produz um R enganoso', () => {
  const p = position(62.5); p.events[0].stop = 55;
  assert.equal(model.currentR(p), null);
  assert.equal(evaluate(p).sellAvailable, false);
});

test('gap abaixo da entrada não libera parcial e stop acima da entrada reduz o risco atual', () => {
  const p = position(42, 45);
  assert.equal(model.currentR(p), -1.6);
  assert.equal(evaluate(p).sellAvailable, false);
  assert.equal(evaluate(p).ongoingRisk, 0);
  p.currentPrice = 62.5; p.currentStop = 53;
  assert.equal(evaluate(p).ongoingRisk, 9500);
  assert.equal(model.currentR(p), 2.5);
});

test('expõe somente as ações pendentes na posição', () => {
  const sell = position(62.5, 52);
  const sellActions = model.actions(sell, model.metricsFromEvents(sell), {
    sellIntoStrength: { enabled: true, startR: 2, endR: 3 },
    policy: { profiles: { standard: { ongoingRiskPct: .5, ongoingVolatilityPct: .5 } }, selectedProfile: 'standard' },
    equity: 1000000,
    profileKey: 'standard'
  });
  assert.deepEqual(sellActions.map(action => action.type), ['sell-into-strength']);

  const peel = position(55, 45);
  const peelActions = model.actions(peel, model.metricsFromEvents(peel), {
    sellIntoStrength: { enabled: false },
    policy: { profiles: { standard: { ongoingRiskPct: .001, ongoingVolatilityPct: .5 } }, selectedProfile: 'standard' },
    equity: 1000000,
    profileKey: 'standard'
  });
  assert.deepEqual(peelActions.map(action => action.type), ['peeloff']);
});
