'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const deservingDiary = require('../src/deserving-diary');

test.beforeEach(() => {
  deservingDiary.resetInMemoryStore();
});

test('deservingDiary.createEntry: cria novo registro com dados higienizados e UUID', async () => {
  const userId = crypto.randomUUID();
  const payload = {
    entryDate: '2026-10-20',
    ticker: 'mglu3',
    resultType: 'target_reached',
    emotions: ['tranquil_satisfied', 'surprised_speed'],
    emotionIntensity: 8,
    thought: 'O alvo chegou em dois dias. Será que foi fácil demais?',
    professionalAction: 'Respeitei meu plano, evitei a ganância e realizei o lucro.',
    learning: 'Posso ganhar dinheiro em poucos dias e ficar tranquilo.',
    gratitude: 'Grato pela disciplina executada.',
    revisitQuote: 'O dinheiro pode chegar rápido, e está tudo bem.'
  };

  const created = await deservingDiary.createEntry(userId, payload);

  assert.ok(created.id, 'Deve gerar um ID');
  assert.equal(created.userId, userId);
  assert.equal(created.entryDate, '2026-10-20');
  assert.equal(created.ticker, 'MGLU3');
  assert.equal(created.emotionIntensity, 8);
  assert.deepEqual(created.emotions, ['tranquil_satisfied', 'surprised_speed']);
  assert.equal(created.thought, 'O alvo chegou em dois dias. Será que foi fácil demais?');
  assert.equal(created.professionalAction, 'Respeitei meu plano, evitei a ganância e realizei o lucro.');
});

test('deservingDiary.listEntries: isola registros por tenant e deriva evolução emocional real', async () => {
  const userA = crypto.randomUUID();
  const userB = crypto.randomUUID();

  // User A: 2 registros
  await deservingDiary.createEntry(userA, {
    entryDate: '2026-10-18',
    ticker: 'VALE3',
    emotions: ['tranquil_satisfied'],
    emotionIntensity: 9,
    professionalAction: 'Saída técnica no alvo.'
  });
  await deservingDiary.createEntry(userA, {
    entryDate: '2026-10-20',
    ticker: 'MGLU3',
    emotions: ['surprised_speed', 'tranquil_satisfied'],
    emotionIntensity: 8,
    professionalAction: 'Plano seguido rigorosamente.'
  });

  // User B: 1 registro
  await deservingDiary.createEntry(userB, {
    entryDate: '2026-10-19',
    ticker: 'PETR4',
    emotions: ['anxious_tense'],
    emotionIntensity: 6,
    professionalAction: 'Fechei a tempo.'
  });

  const listA = await deservingDiary.listEntries(userA);
  assert.equal(listA.total, 2, 'User A deve ver apenas seus 2 registros');
  assert.equal(listA.entries.length, 2);
  assert.equal(listA.evolution.hasEnoughData, true);
  assert.equal(listA.evolution.tranquilityAvg, 8.5);

  const listB = await deservingDiary.listEntries(userB);
  assert.equal(listB.total, 1, 'User B deve ver apenas seu único registro');
  assert.equal(listB.entries[0].ticker, 'PETR4');
});

test('deservingDiary.getEntry e updateEntry: consulta e atualiza campos sem alterar ID', async () => {
  const userId = crypto.randomUUID();
  const created = await deservingDiary.createEntry(userId, {
    entryDate: '2026-10-20',
    ticker: 'ITUB4',
    emotions: ['tranquil_satisfied'],
    thought: 'Texto inicial'
  });

  const fetched = await deservingDiary.getEntry(userId, created.id);
  assert.equal(fetched.ticker, 'ITUB4');
  assert.equal(fetched.thought, 'Texto inicial');

  const updated = await deservingDiary.updateEntry(userId, created.id, {
    entryDate: '2026-10-20',
    ticker: 'ITUB4',
    emotions: ['tranquil_satisfied', 'pride_discipline'],
    thought: 'Texto revisado e aprofundado',
    professionalAction: 'Execução exemplar'
  });

  assert.equal(updated.id, created.id);
  assert.equal(updated.thought, 'Texto revisado e aprofundado');
  assert.deepEqual(updated.emotions, ['tranquil_satisfied', 'pride_discipline']);
});

test('deservingDiary.deleteEntry: remove registro com confirmação', async () => {
  const userId = crypto.randomUUID();
  const created = await deservingDiary.createEntry(userId, {
    ticker: 'WEGE3',
    emotions: ['tranquil_satisfied']
  });

  const del = await deservingDiary.deleteEntry(userId, created.id);
  assert.equal(del.deleted, true);

  await assert.rejects(
    async () => deservingDiary.getEntry(userId, created.id),
    /não encontrado/
  );
});
