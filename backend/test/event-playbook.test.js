'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const eventPlaybook = require('../src/event-playbook');
const attachments = require('../src/event-playbook-attachments');

test('event-playbook: default seeds contêm eventos essenciais e campos obrigatórios', () => {
  assert.ok(Array.isArray(eventPlaybook.DEFAULT_SEEDS));
  assert.ok(eventPlaybook.DEFAULT_SEEDS.length >= 5);

  const payroll = eventPlaybook.DEFAULT_SEEDS.find(e => e.id === 'evt-payroll');
  assert.ok(payroll);
  assert.equal(payroll.name, 'Payroll (EUA)');
  assert.equal(payroll.impact, 5);
  assert.equal(payroll.category, 'Macro');
  assert.ok(payroll.whatHappened);
  assert.ok(payroll.lessonsLearned);

  const copom = eventPlaybook.DEFAULT_SEEDS.find(e => e.id === 'evt-copom');
  assert.ok(copom);
  assert.equal(copom.category, 'Banco Central');
  assert.equal(copom.impact, 5);
});

test('event-playbook: listagem com filtros de busca, categoria e impacto', async () => {
  const all = await eventPlaybook.list('user-test', {});
  assert.ok(all.length >= 5);

  const macroOnly = await eventPlaybook.list('user-test', { category: 'Macro' });
  assert.ok(macroOnly.length > 0);
  assert.ok(macroOnly.every(e => e.category === 'Macro'));

  const highImpactOnly = await eventPlaybook.list('user-test', { impact: 5 });
  assert.ok(highImpactOnly.length > 0);
  assert.ok(highImpactOnly.every(e => e.impact === 5));

  const searchPayroll = await eventPlaybook.list('user-test', { search: 'payroll' });
  assert.ok(searchPayroll.length > 0);
  assert.ok(searchPayroll[0].name.toLowerCase().includes('payroll'));
});

test('event-playbook: criação, atualização, reação compartilhada e remoção', async () => {
  const newEvt = await eventPlaybook.create('user-test', {
    name: 'Evento Teste Unitário',
    date: '2026-10-15',
    time: '14:00',
    category: 'Geopolítica',
    impact: 4,
    relatedAssets: 'PETR4, PRIO3',
    description: 'Descrição de teste para validar persistência única.'
  });

  assert.ok(newEvt.id);
  assert.equal(newEvt.name, 'Evento Teste Unitário');
  assert.equal(newEvt.category, 'Geopolítica');
  assert.equal(newEvt.impact, 4);

  // Consulta pelo ID
  const fetched = await eventPlaybook.get('user-test', newEvt.id);
  assert.equal(fetched.name, 'Evento Teste Unitário');

  // Atualização de dados parciais
  const updated = await eventPlaybook.update('user-test', newEvt.id, {
    whatHappened: 'Preço subiu 3% imediatamente após o anúncio.',
    tradingImplications: 'Buscar setups de compra na superação da máxima do primeiro candle.'
  });
  assert.equal(updated.whatHappened, 'Preço subiu 3% imediatamente após o anúncio.');
  assert.equal(updated.name, 'Evento Teste Unitário'); // Nome preservado

  // Registro de reação pelo fluxo do modal da Central de Mercado
  const reacted = await eventPlaybook.saveReaction('user-test', {
    eventId: newEvt.id,
    whatHappened: 'Reação consolidada: gap de alta com fechamento na máxima.',
    volatilityBehavior: 'Volatilidade unidirecional sem retorno',
    affectedAssets: 'PETR4, VALE3',
    lessonsLearned: 'Não hesitar em entradas de continuação quando o fluxo é direcional.'
  });
  assert.equal(reacted.whatHappened, 'Reação consolidada: gap de alta com fechamento na máxima.');
  assert.equal(reacted.volatilityBehavior, 'Volatilidade unidirecional sem retorno');
  assert.equal(reacted.lessonsLearned, 'Não hesitar em entradas de continuação quando o fluxo é direcional.');

  // Remoção
  const removed = await eventPlaybook.remove('user-test', newEvt.id);
  assert.equal(removed.success, true);
});

test('event-playbook: validação rejeita evento sem nome', async () => {
  await assert.rejects(async () => {
    await eventPlaybook.create('user-test', { name: '' });
  }, /nome do evento é obrigatório/i);
});

test('event-playbook-attachments: upload, leitura e exclusão de screenshot', async () => {
  const fakeImageBytes = Buffer.from('fake-png-binary-data-for-event-screenshot');
  const att = await attachments.create('user-test', {
    name: 'grafico-petr4-durante-evento.png',
    contentType: 'image/png',
    bytes: fakeImageBytes
  });

  assert.ok(att.id);
  assert.ok(att.url.includes(att.id));

  const read = await attachments.content('user-test', att.id);
  assert.equal(read.id, att.id);
  assert.equal(read.content_type, 'image/png');
  assert.deepEqual(read.bytes, fakeImageBytes);

  const del = await attachments.remove('user-test', att.id);
  assert.equal(del.id, att.id);
});

test('event-playbook: proteção contra user_id não-UUID (anonymous / null) com persistência configurada', async () => {
  let queryCalled = false;
  const mockConfiguredPersistence = {
    configured: () => true,
    query: async () => {
      queryCalled = true;
      throw new Error('Should not execute SQL for invalid/anonymous UUID');
    }
  };

  // 1. Listagem para usuário anônimo ou null retorna DEFAULT_SEEDS sem disparar SQL
  const anonList = await eventPlaybook.list('anonymous', {}, mockConfiguredPersistence);
  assert.ok(Array.isArray(anonList));
  assert.ok(anonList.length >= 5);
  assert.equal(queryCalled, false);

  const nullList = await eventPlaybook.list(null, {}, mockConfiguredPersistence);
  assert.ok(Array.isArray(nullList));
  assert.equal(queryCalled, false);

  // 2. Consulta get para usuário anônimo busca seed sem disparar SQL
  const payroll = await eventPlaybook.get('anonymous', 'evt-payroll', mockConfiguredPersistence);
  assert.equal(payroll.name, 'Payroll (EUA)');
  assert.equal(queryCalled, false);

  // 3. Operações mutantes (create, update, remove) rejeitam com 401 sem disparar SQL
  await assert.rejects(async () => {
    await eventPlaybook.create('anonymous', { name: 'Novo' }, mockConfiguredPersistence);
  }, (err) => err.status === 401);

  await assert.rejects(async () => {
    await eventPlaybook.update('anonymous', 'evt-payroll', { name: 'Editado' }, mockConfiguredPersistence);
  }, (err) => err.status === 401);

  await assert.rejects(async () => {
    await eventPlaybook.remove('anonymous', 'evt-payroll', mockConfiguredPersistence);
  }, (err) => err.status === 401);

  assert.equal(queryCalled, false);
});

