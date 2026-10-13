'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const Model = require('./event-playbook-model');

test('event-playbook-model: categorias e tipos de evidência padronizados', () => {
  assert.ok(Array.isArray(Model.CATEGORIES));
  assert.ok(Model.CATEGORIES.includes('Todos'));
  assert.ok(Model.CATEGORIES.includes('Política'));
  assert.ok(Model.CATEGORIES.includes('Macro'));
  assert.ok(Model.CATEGORIES.includes('Geopolítica'));
  assert.ok(Model.CATEGORIES.includes('Earnings'));
  assert.ok(Model.CATEGORIES.includes('Tarifas'));
  assert.ok(Model.CATEGORIES.includes('Banco Central'));
  assert.ok(Model.CATEGORIES.includes('Commodities'));
  assert.ok(Model.CATEGORIES.includes('Black Swan'));
  assert.ok(Model.CATEGORIES.includes('Outros'));

  assert.ok(Array.isArray(Model.EVIDENCE_TYPES));
  assert.equal(Model.EVIDENCE_TYPES.length, 5);
  const typeIds = Model.EVIDENCE_TYPES.map(t => t.id);
  assert.ok(typeIds.includes('before'));
  assert.ok(typeIds.includes('during'));
  assert.ok(typeIds.includes('after'));
  assert.ok(typeIds.includes('news'));
});

test('event-playbook-model: listagem inicial com seeds quando não há registros', () => {
  const events = Model.getAllEvents();
  assert.ok(events.length >= 5);

  const copom = events.find(e => e.id === 'evt-copom');
  assert.ok(copom);
  assert.equal(copom.name, 'Decisão de Juros (Brasil - Copom)');
  assert.equal(copom.category, 'Banco Central');
  assert.equal(copom.impact, 5);
});

test('event-playbook-model: criação e atualização mantendo entidade única', () => {
  const created = Model.addEvent({
    name: 'Reunião de Emergência OPEP+',
    date: '2026-10-18',
    time: '11:00',
    category: 'Commodities',
    impact: 4,
    relatedAssets: 'Petróleo WTI, PETR4',
    description: 'Corte extraordinário de produção de petróleo.'
  });

  assert.ok(created.id);
  assert.equal(created.name, 'Reunião de Emergência OPEP+');
  assert.equal(created.category, 'Commodities');
  assert.equal(created.impact, 4);

  // Consulta pelo ID
  const found = Model.getEventById(created.id);
  assert.equal(found.name, created.name);

  // Atualização parcial
  const updated = Model.updateEvent(created.id, {
    whatHappened: 'Petróleo saltou 4% em 10 minutos.',
    tradingImplications: 'Buscar entradas de breakout em PETR4 e PRIO3.'
  });

  assert.equal(updated.whatHappened, 'Petróleo saltou 4% em 10 minutos.');
  assert.equal(updated.name, 'Reunião de Emergência OPEP+'); // Preservado!
  assert.equal(updated.category, 'Commodities'); // Preservado!
});

test('event-playbook-model: reação rápida atualiza o mesmo evento compartilhado', () => {
  const event = Model.addEvent({
    name: 'Anúncio de Pacote Fiscal',
    date: '2026-10-20',
    time: '16:00',
    category: 'Política',
    impact: 5,
    relatedAssets: 'IBOV, Dólar, DI1F29'
  });

  const reacted = Model.saveReaction({
    eventId: event.id,
    whatHappened: 'Curva de juros abriu 35 bps e IBOV caiu 1,8%.',
    volatilityBehavior: 'Volatilidade unidirecional sem retorno',
    affectedAssets: 'DI1F29, IBOV, SMLL',
    lessonsLearned: 'Não operar contra abertura forte na curva de juros em dias de anúncio fiscal.'
  });

  assert.equal(reacted.id, event.id);
  assert.equal(reacted.whatHappened, 'Curva de juros abriu 35 bps e IBOV caiu 1,8%.');
  assert.equal(reacted.volatilityBehavior, 'Volatilidade unidirecional sem retorno');
  assert.equal(reacted.lessonsLearned, 'Não operar contra abertura forte na curva de juros em dias de anúncio fiscal.');

  // Confirma que consulta direta pelo ID reflete a reação
  const reloaded = Model.getEventById(event.id);
  assert.equal(reloaded.whatHappened, reacted.whatHappened);
  assert.equal(reloaded.lessonsLearned, reacted.lessonsLearned);
});

test('event-playbook-model: filtros e contagem por categoria', () => {
  const events = Model.getAllEvents();
  const counts = Model.countByCategory(events);

  assert.ok(counts.Todos >= 5);
  assert.ok(counts['Macro'] >= 1);
  assert.ok(counts['Banco Central'] >= 1);

  const filtered = Model.filterEvents(events, { category: 'Macro' });
  assert.ok(filtered.length > 0);
  assert.ok(filtered.every(e => e.category === 'Macro'));

  const searchPayroll = Model.filterEvents(events, { search: 'payroll' });
  assert.ok(searchPayroll.length > 0);
  assert.ok(searchPayroll[0].name.toLowerCase().includes('payroll'));
});

test('event-playbook-model: adicionar e remover screenshots', () => {
  const event = Model.addEvent({
    name: 'Teste Screenshots',
    category: 'Macro',
    impact: 3
  });

  const ss = {
    id: 'ss-1234',
    type: 'during',
    url: 'data:image/png;base64,fakeimage',
    caption: 'Reação imediata no gráfico de 5m'
  };

  const withSS = Model.addScreenshotToEvent(event.id, ss);
  assert.equal(withSS.screenshots.length, 1);
  assert.equal(withSS.screenshots[0].id, 'ss-1234');
  assert.equal(withSS.screenshots[0].caption, 'Reação imediata no gráfico de 5m');

  const removedSS = Model.removeScreenshotFromEvent(event.id, 'ss-1234');
  assert.equal(removedSS.screenshots.length, 0);
});
