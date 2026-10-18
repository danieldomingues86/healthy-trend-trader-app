const test = require('node:test');
const assert = require('node:assert/strict');
const Model = require('./daily-wisdom-model.js');

test('DailyWisdomModel: getEligibleRecords filtra apenas registros aprovados com texto', () => {
  const records = [
    { id: '1', quote: 'A', pt: 'A pt', needsReview: false },
    { id: '2', quote: 'B', needsReview: true }, // em revisão -> rejeita
    { id: '3', quote: '', pt: '', needsReview: false }, // texto vazio -> rejeita
    { id: '4', quote: 'C', pt: 'C pt', needsReview: false }
  ];

  const eligible = Model.getEligibleRecords(records);
  assert.equal(eligible.length, 2);
  assert.deepEqual(eligible.map(e => e.id), ['1', '4']);
});

test('DailyWisdomModel: resolveDailyWisdom mantém a frase estável no mesmo dia', () => {
  const records = [
    { id: 'rec-1', quote: 'Quote 1', pt: 'Frase 1', theme: 'risk', author: 'Paul Tudor Jones', needsReview: false },
    { id: 'rec-2', quote: 'Quote 2', pt: 'Frase 2', theme: 'psychology', author: 'Brett Steenbarger', needsReview: false }
  ];

  const todayKey = '2026-10-18';

  // 1ª visita do dia: seleciona frase e gera novo estado
  const firstVisit = Model.resolveDailyWisdom(records, { todayKey, savedState: null });
  assert.ok(firstVisit.record);
  assert.equal(firstVisit.state.date, todayKey);
  assert.equal(firstVisit.state.recordId, firstVisit.record.id);

  // 2ª visita (recarregamento da página no mesmo dia): deve retornar exatamente a mesma frase!
  const reloadVisit = Model.resolveDailyWisdom(records, { todayKey, savedState: firstVisit.state });
  assert.equal(reloadVisit.record.id, firstVisit.record.id);
  assert.equal(reloadVisit.state.recordId, firstVisit.record.id);
});

test('DailyWisdomModel: resolveDailyWisdom evita repetição de frases recentes', () => {
  const records = [
    { id: 'rec-1', quote: 'Quote 1', pt: 'Frase 1', needsReview: false },
    { id: 'rec-2', quote: 'Quote 2', pt: 'Frase 2', needsReview: false },
    { id: 'rec-3', quote: 'Quote 3', pt: 'Frase 3', needsReview: false }
  ];

  // No dia 1, 'rec-1' foi exibido
  const day1State = { date: '2026-10-17', recordId: 'rec-1', history: ['rec-1'] };

  // No dia 2, não deve selecionar 'rec-1' novamente se há outras disponíveis
  const day2Visit = Model.resolveDailyWisdom(records, { todayKey: '2026-10-18', savedState: day1State });
  assert.notEqual(day2Visit.record.id, 'rec-1');
  assert.ok(['rec-2', 'rec-3'].includes(day2Visit.record.id));
});

test('DailyWisdomModel: formatWisdomPresentation trata campos ausentes graciosamente', () => {
  // Registro completo
  const completeRecord = {
    id: 'rec-complete',
    quote: 'Control risk first.',
    pt: 'Controle o risco primeiro.',
    author: 'Larry Hite',
    theme: 'risk',
    reflection: { pt: 'Qual é o seu stop hoje?' }
  };

  const formattedComplete = Model.formatWisdomPresentation(completeRecord);
  assert.equal(formattedComplete.text, 'Controle o risco primeiro.');
  assert.equal(formattedComplete.author, 'Larry Hite');
  assert.equal(formattedComplete.category, 'Risco e Gerenciamento');
  assert.equal(formattedComplete.reflection, 'Qual é o seu stop hoje?');

  // Registro sem autor e sem reflexão cadastrada
  const minimalRecord = {
    id: 'rec-minimal',
    quote: 'Only trade with edge.',
    pt: 'Opere apenas com vantagem.',
    author: '',
    theme: 'strategy'
  };

  const formattedMinimal = Model.formatWisdomPresentation(minimalRecord);
  assert.equal(formattedMinimal.text, 'Opere apenas com vantagem.');
  assert.equal(formattedMinimal.author, null); // oculta campo ausente sem quebrar
  assert.equal(formattedMinimal.category, 'Estratégia');
  assert.ok(formattedMinimal.reflection.length > 0); // provê reflexão temático padrão
});
