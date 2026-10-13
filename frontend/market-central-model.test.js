const test = require('node:test');
const assert = require('node:assert/strict');
const MarketCentralModel = require('./market-central-model.js');

test('MarketCentralModel: constantes básicas e estruturas de universos, mercados e períodos', () => {
  assert.ok(Array.isArray(MarketCentralModel.UNIVERSES), 'UNIVERSES deve ser um array');
  assert.ok(MarketCentralModel.UNIVERSES.length >= 4, 'UNIVERSES deve conter ao menos 4 universos');
  assert.ok(MarketCentralModel.UNIVERSES.some(u => u.id === 'stock_b3'));
  assert.ok(MarketCentralModel.UNIVERSES.some(u => u.id === 'ibov'));
  assert.ok(MarketCentralModel.UNIVERSES.some(u => u.id === 'smallcaps'));
  assert.ok(MarketCentralModel.UNIVERSES.some(u => u.id === 'watchlist'));

  assert.ok(Array.isArray(MarketCentralModel.MARKETS), 'MARKETS deve ser um array');
  assert.ok(MarketCentralModel.MARKETS.some(m => m.id === 'stock_b3' && m.benchmark === 'IBOV'));

  assert.ok(Array.isArray(MarketCentralModel.PERIODS), 'PERIODS deve ser um array');
  assert.ok(MarketCentralModel.PERIODS.some(p => p.id === 'today'));
  assert.ok(MarketCentralModel.PERIODS.some(p => p.id === '5d'));
});

test('MarketCentralModel: scoreToGaugeAngle mapeia o score 0-100 para o arco -90 a +90 graus', () => {
  assert.equal(MarketCentralModel.scoreToGaugeAngle(0), -90);
  assert.equal(MarketCentralModel.scoreToGaugeAngle(50), 0);
  assert.equal(MarketCentralModel.scoreToGaugeAngle(100), 90);
  assert.equal(MarketCentralModel.scoreToGaugeAngle(25), -45);
  assert.equal(MarketCentralModel.scoreToGaugeAngle(75), 45);

  // Clamping de valores extremos
  assert.equal(MarketCentralModel.scoreToGaugeAngle(-20), -90);
  assert.equal(MarketCentralModel.scoreToGaugeAngle(150), 90);
  assert.equal(MarketCentralModel.scoreToGaugeAngle(null), -90);
});

test('MarketCentralModel: resolveRegimeColor retorna paleta e rótulo semântico correto', () => {
  const healthy = MarketCentralModel.resolveRegimeColor('healthy');
  assert.equal(healthy.hex, '#22c55e');
  assert.match(healthy.label, /Alta/);

  const defensive = MarketCentralModel.resolveRegimeColor('defensive');
  assert.equal(defensive.hex, '#ef4444');
  assert.match(defensive.label, /Baixa/);

  const transition = MarketCentralModel.resolveRegimeColor('transition');
  assert.equal(transition.hex, '#eab308');
  assert.match(transition.label, /Atenção/);
});

test('MarketCentralModel: formatadores numéricos e de porcentagem', () => {
  assert.equal(MarketCentralModel.formatPercent(2.5), '+2,5%');
  assert.equal(MarketCentralModel.formatPercent(-1.2), '-1,2%');
  assert.equal(MarketCentralModel.formatPercent(0), '0,0%');
  assert.equal(MarketCentralModel.formatPercent(NaN), '—');

  assert.equal(MarketCentralModel.formatNumber(132500), '132.500');
  assert.equal(MarketCentralModel.formatNumber(NaN), '—');
});

test('MarketCentralModel: cadastro e remoção de eventos customizados pelo trader', () => {
  const testEvent = {
    name: 'Reunião Extraordinária do Copom',
    date: '2026-10-20',
    time: '18:00',
    impact: 'ALTO',
    relatedAssets: 'IBOV / DI1'
  };

  const added = MarketCentralModel.addCustomEvent(testEvent);
  assert.ok(added.id.startsWith('cust-evt-'));
  assert.equal(added.name, testEvent.name);
  assert.equal(added.impact, 'ALTO');

  const list = MarketCentralModel.getCustomEvents();
  assert.ok(list.some(e => e.id === added.id));

  // Remoção
  const remaining = MarketCentralModel.removeCustomEvent(added.id);
  assert.ok(!remaining.some(e => e.id === added.id));
});

test('MarketCentralModel: Playbook de Eventos salva e consulta reação do mercado', () => {
  const reaction = {
    eventId: 'evt-test-999',
    eventName: 'Payroll EUA Teste',
    eventDate: '2026-10-07',
    whatHappened: 'Criação de vagas veio 40% acima do esperado, gerando reprecificação imediata da curva de juros.',
    volatilityBehavior: 'Spike inicial de 1,5% seguido de devolução e fechamento perto da mínima.',
    affectedAssets: 'Dólar Futuro, S&P 500, IBOV',
    lessonsLearned: 'Não antecipar a entrada antes da divulgação oficial e esperar a primeira vela de 15m fechar.'
  };

  const saved = MarketCentralModel.saveEventReaction(reaction);
  assert.ok(saved.id.startsWith('reaction-'));
  assert.equal(saved.eventId, 'evt-test-999');

  const reactionsForEvent = MarketCentralModel.getReactionsForEvent('evt-test-999');
  assert.ok(reactionsForEvent.length >= 1);
  assert.equal(reactionsForEvent[0].lessonsLearned, reaction.lessonsLearned);
});
