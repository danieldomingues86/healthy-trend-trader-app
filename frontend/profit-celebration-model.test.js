const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('./profit-celebration-model');

test('profit-celebration-model: catálogo inicial contém 8 recompensas pré-configuradas', () => {
  assert.equal(model.DEFAULT_REWARDS.length, 8);
  const titles = model.DEFAULT_REWARDS.map(r => r.title);
  assert.ok(titles.includes('Tomar um café especial'));
  assert.ok(titles.includes('Assistir a um filme'));
  assert.ok(titles.includes('Fazer uma refeição especial'));
  assert.ok(titles.includes('Fazer um passeio'));
  assert.ok(titles.includes('Descansar sem pensar no mercado'));
  assert.ok(titles.includes('Fazer um treino'));
  assert.ok(titles.includes('Ler um livro'));
  assert.ok(titles.includes('Jogar um game'));
});

test('profit-celebration-model: calculateMilestones calcula com precisão os marcos de disciplina (1, 5, 10, 20, 50, 100)', () => {
  // 0 conquistas
  const m0 = model.calculateMilestones(0);
  assert.equal(m0.count, 0);
  assert.equal(m0.target, 1);
  assert.equal(m0.remaining, 1);
  assert.equal(m0.progressPct, 0);

  // 1 conquista: marco 1 alcançado, próximo é 5
  const m1 = model.calculateMilestones(1);
  assert.equal(m1.target, 5);
  assert.equal(m1.remaining, 4);

  // 8 conquistas (como na imagem 3: 8/10, faltam 2)
  const m8 = model.calculateMilestones(8);
  assert.equal(m8.target, 10);
  assert.equal(m8.remaining, 2);
  assert.equal(m8.summaryText, '8/10');
  assert.equal(m8.remainingText, 'Faltam 2 conquistas');
  assert.equal(m8.progressPct, 80);

  // 10 conquistas: marco 10 alcançado, próximo é 20
  const m10 = model.calculateMilestones(10);
  assert.equal(m10.target, 20);
  assert.equal(m10.remaining, 10);
});

test('profit-celebration-model: calculateDisciplineStreak computa dias consecutivos e zera com violação', () => {
  const sample = [
    { conquestDate: '2026-10-10', planAdhered: 'yes' },
    { conquestDate: '2026-10-11', planAdhered: 'yes' },
    { conquestDate: '2026-10-12', planAdhered: 'partial' },
    { conquestDate: '2026-10-13', planAdhered: 'yes' }
  ];

  const streak = model.calculateDisciplineStreak(sample);
  assert.equal(streak.currentStreakDays, 4);
  assert.equal(streak.recordStreakDays, 4);

  // Se um dia tiver violação ('no'), interrompe a sequência
  const withViolation = [
    ...sample,
    { conquestDate: '2026-10-14', planAdhered: 'no' },
    { conquestDate: '2026-10-15', planAdhered: 'yes' }
  ];

  const streakAfterViolation = model.calculateDisciplineStreak(withViolation);
  assert.equal(streakAfterViolation.currentStreakDays, 1);
  assert.equal(streakAfterViolation.recordStreakDays, 4);
});

test('profit-celebration-model: calculateConquestsStats separa rigorosamente resultado financeiro de disciplina', () => {
  const sample = [
    {
      realizedAmount: 1250.00,
      rMultiple: 2.0,
      planAdhered: 'yes',
      conquestDate: '2026-10-14',
      rewardTitle: 'Tomar um café especial',
      rewardIcon: '☕'
    },
    {
      realizedAmount: 980.00,
      rMultiple: 1.5,
      planAdhered: 'yes',
      conquestDate: '2026-10-10',
      rewardTitle: 'Assistir a um filme',
      rewardIcon: '🎬'
    },
    {
      realizedAmount: 1500.00,
      rMultiple: 3.0,
      planAdhered: 'no', // Lucro financeiro alto MAS violou o plano
      conquestDate: '2026-10-08',
      rewardTitle: 'Fazer uma refeição especial',
      rewardIcon: '🍽️'
    }
  ];

  const stats = model.calculateConquestsStats(sample, { referenceDate: '2026-10-15' });

  // Lucro total inclui todos os ganhos financeiros reais
  assert.equal(stats.totalRealizedProfit, 3730.00);
  assert.equal(stats.totalRealizedProfitFormatted, 'R$\u00a03.730,00');

  // Planos cumpridos contabiliza estritamente os disciplinados (2 de 3)
  assert.equal(stats.totalPlansComplied, 2);
  assert.equal(stats.plansViolated, 1);
  assert.equal(stats.disciplineRatePct, 66.67);

  // Média de R
  assert.equal(stats.avgR, 2.17);

  // Ranking de recompensas
  assert.equal(stats.topRewards.length, 3);
  assert.equal(stats.topRewards[0].title, 'Tomar um café especial');
});

test('profit-celebration-model: validação de payload recusa lucros não positivos e dados incompletos', () => {
  // Inválido: sem ativo e lucro zero
  const invalid1 = model.validateConquestPayload({ realizedAmount: 0 });
  assert.equal(invalid1.isValid, false);
  assert.ok(invalid1.errors.length >= 2);

  // Inválido: sem recompensa
  const invalid2 = model.validateConquestPayload({ ticker: 'PETR4', realizedAmount: 500, rewardTitle: '' });
  assert.equal(invalid2.isValid, false);

  // Válido
  const valid = model.validateConquestPayload({
    ticker: 'PETR4',
    realizedAmount: 500,
    planAdhered: 'yes',
    feeling: 'pride',
    rewardTitle: 'Tomar um café especial'
  });
  assert.equal(valid.isValid, true);
});

test('profit-celebration-model: validação de recompensas personalizadas', () => {
  const invalid = model.validateRewardPayload({ title: '', category: 'invalid' });
  assert.equal(invalid.isValid, false);

  const valid = model.validateRewardPayload({ title: 'Comprar um livro novo', category: 'lazer' });
  assert.equal(valid.isValid, true);
});

test('profit-celebration-model: calculateConquestsStats filtra por ano e detecta ausência de dados no período', () => {
  const sample = [
    {
      realizedAmount: 1000.00,
      rMultiple: 2.0,
      planAdhered: 'yes',
      conquestDate: '2025-04-14',
      rewardTitle: 'Tomar um café especial',
      rewardIcon: '☕'
    },
    {
      realizedAmount: 2000.00,
      rMultiple: 2.5,
      planAdhered: 'yes',
      conquestDate: '2026-05-10',
      rewardTitle: 'Assistir a um filme',
      rewardIcon: '🎬'
    }
  ];

  // Filtro 2025: apenas 1 conquista
  const stats2025 = model.calculateConquestsStats(sample, { filterYear: 2025 });
  assert.equal(stats2025.totalConquests, 1);
  assert.equal(stats2025.totalRealizedProfit, 1000.00);
  assert.equal(stats2025.hasAnyMonthlyData, true);

  // Filtro 2024: 0 conquistas, hasAnyMonthlyData é false
  const stats2024 = model.calculateConquestsStats(sample, { filterYear: 2024 });
  assert.equal(stats2024.totalConquests, 0);
  assert.equal(stats2024.totalRealizedProfit, 0);
  assert.equal(stats2024.hasAnyMonthlyData, false);
});

