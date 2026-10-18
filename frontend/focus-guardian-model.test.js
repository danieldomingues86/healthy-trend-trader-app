const test = require('node:test');
const assert = require('node:assert/strict');
const Model = require('./focus-guardian-model.js');

test('FocusGuardianModel: formatDuration formata durações com clareza em pt-BR', () => {
  assert.equal(Model.formatDuration(0), '0min');
  assert.equal(Model.formatDuration(50), '0min');
  assert.equal(Model.formatDuration(120), '2min');
  assert.equal(Model.formatDuration(3600), '1h 00min');
  assert.equal(Model.formatDuration(3665), '1h 01min');
  assert.equal(Model.formatDuration(7500), '2h 05min');
});

test('FocusGuardianModel: detectRapidOpenings identifica rajadas frequentes de reabertura', () => {
  const baseTime = new Date('2026-10-18T10:00:00Z').getTime();

  // Apenas 2 aberturas (abaixo do limiar de 3)
  const fewSessions = [
    { openedAt: new Date(baseTime).toISOString() },
    { openedAt: new Date(baseTime + 2 * 60 * 1000).toISOString() }
  ];
  assert.equal(Model.detectRapidOpenings(fewSessions, 3, 15), false);

  // 3 aberturas em 5 minutos (abaixo de 15 min) -> detecta rajada!
  const burstSessions = [
    { openedAt: new Date(baseTime).toISOString() },
    { openedAt: new Date(baseTime + 2 * 60 * 1000).toISOString() },
    { openedAt: new Date(baseTime + 5 * 60 * 1000).toISOString() }
  ];
  assert.equal(Model.detectRapidOpenings(burstSessions, 3, 15), true);

  // 3 aberturas espalhadas por 3 horas -> sem rajada
  const spacedSessions = [
    { openedAt: new Date(baseTime).toISOString() },
    { openedAt: new Date(baseTime + 60 * 60 * 1000).toISOString() },
    { openedAt: new Date(baseTime + 120 * 60 * 1000).toISOString() }
  ];
  assert.equal(Model.detectRapidOpenings(spacedSessions, 3, 15), false);
});

test('FocusGuardianModel: isWeekend identifica sábados e domingos em SP', () => {
  assert.equal(Model.isWeekend('2026-10-16T14:00:00-03:00'), false); // Sexta
  assert.equal(Model.isWeekend('2026-10-17T10:00:00-03:00'), true);  // Sábado
  assert.equal(Model.isWeekend('2026-10-18T15:00:00-03:00'), true);  // Domingo
  assert.equal(Model.isWeekend('2026-10-19T09:00:00-03:00'), false); // Segunda
});

test('FocusGuardianModel: monitor desligado ou inativo nunca é tratado como zero', () => {
  const result = Model.evaluateFocusState({
    monitor: { active: false },
    sessions: [],
    now: new Date('2026-10-16T14:00:00-03:00').getTime()
  });
  assert.equal(result.level, 'inactive');
  assert.equal(result.label, 'Monitor Desligado');
  assert.equal(result.badgeClass, 'neutral');
  assert.equal(result.isMonitorActive, false);
  assert.equal(result.shouldShowModal, false);
});

test('FocusGuardianModel: monitor ativo em dia útil aguardando o Profit Trader', () => {
  const result = Model.evaluateFocusState({
    monitor: { active: true, profitRunning: false },
    sessions: [],
    now: new Date('2026-10-16T14:00:00-03:00').getTime()
  });
  assert.equal(result.level, 'waiting');
  assert.equal(result.label, 'Aguardando Profit');
  assert.equal(result.openingsCount, 0);
  assert.equal(result.shouldShowModal, false);
});

test('FocusGuardianModel: uso consciente em dia útil dentro dos limites (Verde)', () => {
  const now = new Date('2026-10-16T14:00:00-03:00').getTime();
  const todayDate = Model.getTodayKey(now);

  const sessions = [
    { openedAt: `${todayDate}T09:00:00-03:00`, durationSeconds: 1800 },
    { openedAt: `${todayDate}T11:00:00-03:00`, durationSeconds: 2400 }
  ];

  const result = Model.evaluateFocusState({
    monitor: { active: true, profitRunning: true },
    sessions,
    now
  });

  assert.equal(result.level, 'good');
  assert.equal(result.label, 'Uso Consciente');
  assert.equal(result.badgeClass, 'good');
  assert.equal(result.openingsCount, 2);
  assert.equal(result.totalDurationSeconds, 4200);
  assert.equal(result.totalDurationFormatted, '1h 10min');
  assert.equal(result.shouldShowModal, false);
});

test('FocusGuardianModel: aproximação de limite em dia útil gera alerta Amarelo', () => {
  const now = new Date('2026-10-16T14:00:00-03:00').getTime();
  const todayDate = Model.getTodayKey(now);

  // 6 aberturas atingem maxOpeningsWarning (default: 6)
  const sessions = Array.from({ length: 6 }, (_, i) => ({
    openedAt: `${todayDate}T${String(8 + i).padStart(2, '0')}:00:00-03:00`,
    durationSeconds: 600
  }));

  const result = Model.evaluateFocusState({
    monitor: { active: true, profitRunning: true },
    sessions,
    now
  });

  assert.equal(result.level, 'warning');
  assert.equal(result.label, 'Atenção ao Foco');
  assert.equal(result.badgeClass, 'warning');
  assert.equal(result.openingsCount, 6);
  assert.equal(result.shouldShowModal, false);
});

test('FocusGuardianModel: limite crítico em dia útil ultrapassado aciona alerta Vermelho e modal com cooldown', () => {
  const now = new Date('2026-10-16T15:00:00-03:00').getTime();
  const todayDate = Model.getTodayKey(now);

  // 11 aberturas excedem maxOpeningsCritical (default: 10)
  const sessions = Array.from({ length: 11 }, (_, i) => ({
    openedAt: `${todayDate}T${String(7 + Math.floor(i / 2)).padStart(2, '0')}:${String((i % 2) * 30).padStart(2, '0')}:00-03:00`,
    durationSeconds: 900
  }));

  // Sem reconhecimento prévio -> modal deve disparar!
  const firstEval = Model.evaluateFocusState({
    monitor: { active: true, profitRunning: true },
    sessions,
    lastAcknowledgedAt: null,
    now
  });

  assert.equal(firstEval.level, 'critical');
  assert.equal(firstEval.label, 'Atenção Crítica');
  assert.equal(firstEval.badgeClass, 'critical');
  assert.equal(firstEval.shouldShowModal, true);
  assert.equal(firstEval.inCooldown, false);

  // Reconhecido há 10 minutos (cooldown de 30 min ativo) -> não deve disparar modal de novo!
  const acknowledgedRecently = now - (10 * 60 * 1000);
  const cooldownEval = Model.evaluateFocusState({
    monitor: { active: true, profitRunning: true },
    sessions,
    lastAcknowledgedAt: acknowledgedRecently,
    now
  });

  assert.equal(cooldownEval.level, 'critical');
  assert.equal(cooldownEval.shouldShowModal, false);
  assert.equal(cooldownEval.inCooldown, true);
  assert.equal(cooldownEval.cooldownRemainingMinutes, 20);

  // Cooldown de 30 minutos expirou (reconhecido há 35 min) -> dispara novamente
  const acknowledgedLongAgo = now - (35 * 60 * 1000);
  const expiredEval = Model.evaluateFocusState({
    monitor: { active: true, profitRunning: true },
    sessions,
    lastAcknowledgedAt: acknowledgedLongAgo,
    now
  });

  assert.equal(expiredEval.level, 'critical');
  assert.equal(expiredEval.shouldShowModal, true);
  assert.equal(expiredEval.inCooldown, false);
});

test('FocusGuardianModel: finais de semana são liberados para estudos (sem alarmes ou modal)', () => {
  const saturdayNow = new Date('2026-10-17T14:00:00-03:00').getTime();
  const satDate = Model.getTodayKey(saturdayNow);

  // Mesmo com 15 aberturas, 5 horas de tela e reaberturas rápidas
  const heavyWeekendSessions = Array.from({ length: 15 }, (_, i) => ({
    openedAt: `${satDate}T${String(8 + Math.floor(i / 2)).padStart(2, '0')}:${(i % 2) * 20}:00-03:00`,
    durationSeconds: 1200
  }));

  const saturdayEval = Model.evaluateFocusState({
    monitor: { active: true, profitRunning: true },
    sessions: heavyWeekendSessions,
    now: saturdayNow
  });

  assert.equal(saturdayEval.status, 'weekend');
  assert.equal(saturdayEval.level, 'good');
  assert.equal(saturdayEval.badgeClass, 'good');
  assert.equal(saturdayEval.label, 'Estudo Livre');
  assert.equal(saturdayEval.isWeekend, true);
  assert.equal(saturdayEval.shouldShowModal, false);
  assert.deepEqual(saturdayEval.triggers, []);
  assert.match(saturdayEval.message, /Fim de semana/);

  // Domingo
  const sundayNow = new Date('2026-10-18T16:00:00-03:00').getTime();
  const sundayEval = Model.evaluateFocusState({
    monitor: { active: true, profitRunning: true },
    sessions: heavyWeekendSessions,
    now: sundayNow
  });

  assert.equal(sundayEval.status, 'weekend');
  assert.equal(sundayEval.label, 'Estudo Livre');
  assert.equal(sundayEval.shouldShowModal, false);
});
