const test = require('node:test');
const assert = require('node:assert/strict');
const attachments = require('../src/journal-attachments');

test('anexos do diário validam o identificador do registro e o nome do arquivo', () => {
  assert.equal(attachments.recordId('day-2026-09-08'), 'day-2026-09-08');
  assert.equal(attachments.name('../print do trade.png'), 'print do trade.png');
  assert.throws(() => attachments.recordId('../diario'), /Registro do diário inválido/);
  assert.throws(() => attachments.name(''), /Nome do arquivo inválido/);
});

test('anexos do diário validam ids e tipos seguros', () => {
  const id = '2d9b0a59-c42e-4b09-a2c9-7fbec0cdbd05';
  assert.equal(attachments.attachmentId(id), id);
  assert.equal(attachments.contentType('image/png; charset=binary'), 'image/png');
  assert.throws(() => attachments.attachmentId('arquivo-1'), /Anexo inválido/);
  assert.throws(() => attachments.contentType('arquivo'), /Tipo de arquivo inválido/);
});
