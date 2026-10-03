const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('./trader-training-model');

test('trader-training-model: catálogo contém categorias e objetivos especificados', () => {
  assert.ok(Array.isArray(model.CATALOG));
  assert.ok(model.CATALOG.length >= 20);

  const exec = model.catalogByCategory('execution');
  assert.ok(exec.some(item => item.title.includes('Executar o gatilho')));
  assert.ok(exec.some(item => item.title.includes('Não antecipar a entrada')));

  const psy = model.catalogByCategory('psychology');
  assert.ok(psy.some(item => item.title.includes('FOMO')));
  assert.ok(psy.some(item => item.title.includes('vingança')));

  const proc = model.catalogByCategory('process');
  assert.ok(proc.some(item => item.title.includes('checklist')));
  assert.ok(proc.some(item => item.title.includes('Registrar a operação')));

  const risk = model.catalogByCategory('risk');
  assert.ok(risk.some(item => item.title.includes('Position Sizing')));
  assert.ok(risk.some(item => item.title.includes('Heat máximo')));
});

test('trader-training-model: normalizeGoal valida catálogo e personalizado', () => {
  const goalFromCatalog = model.normalizeGoal({
    catalogId: 'exec-trigger',
    durationDays: 21,
    targetPct: 90
  }, '2026-10-03');

  assert.equal(goalFromCatalog.title, 'Executar o gatilho da operação sempre corretamente.');
  assert.equal(goalFromCatalog.category, 'execution');
  assert.equal(goalFromCatalog.startDate, '2026-10-03');
  assert.equal(goalFromCatalog.endDate, '2026-10-24');
  assert.equal(goalFromCatalog.durationDays, 21);
  assert.equal(goalFromCatalog.targetPct, 90);

  const customGoal = model.normalizeGoal({
    title: 'Não realizar lucro antes do meu plano de Sell Into Strength',
    category: 'risk',
    durationDays: 14,
    targetPct: 80
  }, '2026-10-03');

  assert.equal(customGoal.title, 'Não realizar lucro antes do meu plano de Sell Into Strength');
  assert.equal(customGoal.category, 'risk');
  assert.equal(customGoal.durationDays, 14);
  assert.equal(customGoal.endDate, '2026-10-17');

  // Validação de erros
  assert.throws(() => model.normalizeGoal({ catalogId: 'inexistente', durationDays: 21, targetPct: 90 }), /não reconhecido/);
  assert.throws(() => model.normalizeGoal({ title: '', category: 'risk', durationDays: 21, targetPct: 90 }), /Descreva o comportamento/);
  assert.throws(() => model.normalizeGoal({ title: 'Válido', category: 'invalida', durationDays: 21, targetPct: 90 }), /categoria/);
  assert.throws(() => model.normalizeGoal({ catalogId: 'exec-trigger', durationDays: 1, targetPct: 90 }), /período deve ter entre/);
  assert.throws(() => model.normalizeGoal({ catalogId: 'exec-trigger', durationDays: 21, targetPct: 30 }), /meta de consistência/);
});

test('trader-training-model: computeAdherence exclui "não se aplicava" do denominador', () => {
  const records = [
    { assessment: 'correct' },
    { assessment: 'correct' },
    { assessment: 'correct' },
    { assessment: 'correct' },
    { assessment: 'correct' },
    { assessment: 'correct' },
    { assessment: 'correct' },
    { assessment: 'correct' },
    { assessment: 'correct' },
    { assessment: 'correct' },
    { assessment: 'correct' },
    { assessment: 'correct' }, // 12 corretas
    { assessment: 'incorrect' },
    { assessment: 'incorrect' }, // 2 incorretas
    { assessment: 'not_applicable' },
    { assessment: 'not_applicable' },
    { assessment: 'not_applicable' },
    { assessment: 'not_applicable' } // 4 não se aplicavam
  ];

  const adh = model.computeAdherence(records);
  assert.equal(adh.correct, 12);
  assert.equal(adh.incorrect, 2);
  assert.equal(adh.notApplicable, 4);
  assert.equal(adh.applicable, 14);
  assert.equal(adh.total, 18);
  // 12 / 14 = 85.714...% -> 85.7%
  assert.equal(adh.pct, 85.7);

  // Se todos forem não aplicáveis, pct deve ser null sem divisão por zero
  const emptyAdh = model.computeAdherence([{ assessment: 'not_applicable' }]);
  assert.equal(emptyAdh.pct, null);
  assert.equal(emptyAdh.applicable, 0);
});

test('trader-training-model: weeklyEvolution agrupa por blocos de 7 dias e evolutionInsight calcula delta real', () => {
  const goal = {
    startDate: '2026-10-01',
    endDate: '2026-10-22',
    durationDays: 21,
    targetPct: 90
  };

  const records = [
    // Semana 1 (01 a 07): 2 corretas, 1 incorreta -> 66.7%
    { recordDate: '2026-10-02', assessment: 'correct' },
    { recordDate: '2026-10-04', assessment: 'correct' },
    { recordDate: '2026-10-05', assessment: 'incorrect' },

    // Semana 2 (08 a 14): 4 corretas, 1 incorreta -> 80%
    { recordDate: '2026-10-08', assessment: 'correct' },
    { recordDate: '2026-10-09', assessment: 'correct' },
    { recordDate: '2026-10-10', assessment: 'correct' },
    { recordDate: '2026-10-12', assessment: 'correct' },
    { recordDate: '2026-10-13', assessment: 'incorrect' },

    // Semana 3 (15 a 21): 9 corretas, 1 incorreta -> 90%
    { recordDate: '2026-10-15', assessment: 'correct' },
    { recordDate: '2026-10-16', assessment: 'correct' },
    { recordDate: '2026-10-17', assessment: 'correct' },
    { recordDate: '2026-10-18', assessment: 'correct' },
    { recordDate: '2026-10-19', assessment: 'correct' },
    { recordDate: '2026-10-20', assessment: 'correct' },
    { recordDate: '2026-10-21', assessment: 'correct' },
    { recordDate: '2026-10-21', assessment: 'correct' },
    { recordDate: '2026-10-21', assessment: 'correct' },
    { recordDate: '2026-10-21', assessment: 'incorrect' }
  ];

  const weeks = model.weeklyEvolution(goal, records);
  assert.equal(weeks.length, 3);
  assert.equal(weeks[0].label, 'Semana 1');
  assert.equal(weeks[0].pct, 66.7);
  assert.equal(weeks[1].pct, 80);
  assert.equal(weeks[2].pct, 90);

  const insight = model.evolutionInsight(weeks);
  assert.equal(insight.tone, 'up');
  assert.equal(insight.title, 'Você está evoluindo!');
  // 90 - 66.7 = 23.3 pontos percentuais
  assert.equal(insight.deltaPp, 23.3);
  assert.ok(insight.message.includes('23,3 pontos percentuais'));
});

test('trader-training-model: periodProgress calcula dias e término', () => {
  const goal = {
    startDate: '2026-10-03',
    endDate: '2026-10-24',
    durationDays: 21,
    targetPct: 90
  };

  const midProgress = model.periodProgress(goal, '2026-10-13');
  assert.equal(midProgress.totalDays, 21);
  assert.equal(midProgress.elapsed, 10);
  assert.equal(midProgress.remaining, 11);
  assert.equal(midProgress.ended, false);

  const endedProgress = model.periodProgress(goal, '2026-10-25');
  assert.equal(endedProgress.ended, true);
  assert.equal(endedProgress.remaining, 0);
});

test('trader-training-model: surfacesFor e shouldShowOn orientam lembrete contextual inteligente', () => {
  const execGoal = {
    status: 'active',
    category: 'execution',
    catalogId: 'exec-no-anticipate',
    title: 'Não antecipar a entrada.'
  };

  assert.ok(model.shouldShowOn(execGoal, 'newtrade'));
  assert.ok(model.shouldShowOn(execGoal, 'journal'));
  assert.equal(model.shouldShowOn(execGoal, 'charts'), false);
  assert.equal(model.focusMessageFor(execGoal), 'Não antecipe a entrada. Aguarde o gatilho definido no seu plano.');

  const chartGoal = {
    status: 'active',
    category: 'process',
    catalogId: 'proc-chart-watching',
    title: 'Não olhar o gráfico excessivamente.'
  };

  assert.ok(model.shouldShowOn(chartGoal, 'charts'));
  assert.ok(model.shouldShowOn(chartGoal, 'journal'));
  assert.equal(model.shouldShowOn(chartGoal, 'newtrade'), false);
});
