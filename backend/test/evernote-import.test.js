const test = require('node:test');
const assert = require('node:assert/strict');
const Import = require('../src/evernote-import');
const Journal = require('../../frontend/journal-v2-model');
function note(patch = {}) { return { title: 'Trading Journal - 01/07/2026', created: '20260701T150000Z', updated: '20260701T160000Z', enml: '<en-note>Source</en-note>', text: 'Nota (0-10): 7\nHoje fui:\n[ ] Calmo\n[x] Ansioso', checked: ['Ansioso'], todo: [], media: [], resources: [], ...patch }; }
test('only checked emotions and actual scores are imported; intensity stays unknown', () => {
  const plan = Import.sourcePlan(note(), 'file.enex'), data = { version: 2, records: [] };
  Import.mergeRecord(data, plan, []);
  assert.deepEqual(data.records[0].emotional.states, ['Ansioso']); assert.equal(data.records[0].emotional.intensity, null);
  assert.equal(data.records[0].technical.executionScore, 7); assert.equal(data.records[0].technical.planRespected, null);
});
test('correcting an inconsistent title year is explicit and preserves the original date', () => {
  const n = note({ title: 'Trading Journal - 15/07/2024', created: '20260715T120000Z' });
  assert.equal(Import.titleDates(n).date, '2024-07-15');
  const dates = Import.titleDates(n, { correctTitleYear: true });
  assert.equal(dates.date, '2026-07-15'); assert.equal(dates.originalDate, '2024-07-15'); assert.equal(dates.basis, 'user-confirmed-title-year');
});
test('combined notes are archived once without manufacturing independent daily scores/emotions', () => {
  for (const title of ['Trading Journal - 08-09/07/2026', 'Trading Journal - Dia: 01, 02 e 03 Set/2026']) {
    const plan = Import.sourcePlan(note({ title }), 'file.enex'), data = { version: 2, records: [] };
    Import.mergeRecord(data, plan, []);
    assert.equal(data.records.length, 1); assert.equal(data.records[0].technical.executionScore, null);
    assert.deepEqual(data.records[0].emotional.states, []); assert.equal(data.records[0].imports[0].sourceExecutionScore, 7);
  }
});
test('merging preserves existing user values and is idempotent, including attachments', () => {
  const existing = Journal.blank('2026-07-01'); existing.technical.executionScore = 10; existing.shared.observations = 'User text';
  const data = { version: 2, records: [existing] }, plan = Import.sourcePlan(note(), 'file.enex');
  const first = Import.mergeRecord(data, plan, [{ id: 'actual-file', name: 'chart.png' }]);
  assert.equal(first.record.technical.executionScore, 10); assert.deepEqual(first.conflicts, ['executionScore']);
  assert.match(first.record.shared.observations, /^User text/);
  const duplicate = Import.mergeRecord(data, plan, [{ id: 'other-file' }]);
  assert.equal(duplicate.duplicate, true); assert.equal(duplicate.record.evidence.length, 1); assert.equal(duplicate.record.imports.length, 1);
});
test('audio transcripts are decoded from escaped ENML CSS, not guessed from the filename', () => {
  const data = { segments: [{ text: 'Senti ansiedade.\nSegui meu método.' }] };
  const style = `--en-transcription:${JSON.stringify(JSON.stringify(data))};`;
  const transcripts = Import.transcriptions(note({ media: [{ hash: 'resource-hash', style }] }));
  assert.equal(transcripts[0].text, data.segments[0].text);
  assert.throws(() => Import.transcriptions(note({ media: [{ style: '--en-transcription:"broken";' }] })), /Transcrição inválida/);
});
test('template advice does not become a daily observation and blank checklist does not become a violation', () => {
  const n = note({ title: 'Por que esse template funciona?', checked: ['Calmo'], todo: [{ label: 'Sem alterar regras', checked: false }] });
  const plan = Import.sourcePlan(n, 'file.enex'); assert.deepEqual(plan.fields.states, []); assert.equal(plan.fields.score, null); assert.equal(plan.fields.plan, null);
});
test('imported checklist maps to the journal UI indices without replacing existing choices', () => {
  const n = note({ todo: [{ label: 'Segui Diário + 4H', checked: true }, { label: 'Sem alterar regras', checked: false, explicitFalse: true }] });
  const data = { version: 2, records: [Journal.blank('2026-07-01')] };
  data.records[0].technical.checklist[0] = false;
  const result = Import.mergeRecord(data, Import.sourcePlan(n, 'file.enex'), []);
  assert.equal(result.record.technical.checklist[0], false); assert.equal(result.record.technical.checklist[6], false);
  assert.equal(result.record.technical.checklist['Trades somente no Diário + 4H'], true);
});
