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

test('FocusGuardianModel: Regra Fundamental — Horário de Mercado e Calendário B3 (fechado antes das 10h, após 17h55, feriados fixos/móveis e Quarta de Cinzas antes das 13h)', () => {
  // 1. Dia útil fora do horário de pregão (08:45 BRT e 18:30 BRT) -> mercado fechado, sem modal e sem contabilizar tempo fechado como operacional
  const beforeOpenTs = new Date('2026-11-24T08:45:00-03:00').getTime();
  const afterCloseTs = new Date('2026-11-24T18:30:00-03:00').getTime();
  const openSessionTs = new Date('2026-11-24T14:00:00-03:00').getTime();

  assert.equal(Model.isMarketOpen(beforeOpenTs), false, 'Antes das 10h o mercado está fechado');
  assert.equal(Model.isMarketOpen(afterCloseTs), false, 'Após 17h55 o mercado está fechado');
  assert.equal(Model.isMarketOpen(openSessionTs), true, 'Terça-feira às 14h o mercado está aberto');

  const heavyBurstSessions = [
    { openedAt: '2026-11-24T08:30:00-03:00', durationSeconds: 3600 },
    { openedAt: '2026-11-24T08:35:00-03:00', durationSeconds: 3600 },
    { openedAt: '2026-11-24T08:40:00-03:00', durationSeconds: 3600 },
    { openedAt: '2026-11-24T08:42:00-03:00', durationSeconds: 3600 }
  ];

  const evalBeforeOpen = Model.evaluateFocusState({
    monitor: { active: true, profitRunning: true },
    sessions: heavyBurstSessions,
    now: beforeOpenTs
  });
  assert.equal(evalBeforeOpen.status, 'market_closed');
  assert.equal(evalBeforeOpen.isMarketOpen, false);
  assert.equal(evalBeforeOpen.shouldShowModal, false, 'Nunca exibir modal antes da abertura do mercado');
  assert.equal(evalBeforeOpen.openingsCount, 0, 'Não contabilizar mercado fechado como tempo/aberturas operacionais');
  assert.equal(evalBeforeOpen.totalDurationSeconds, 0);
  assert.deepEqual(evalBeforeOpen.triggers, []);

  const evalAfterClose = Model.evaluateFocusState({
    monitor: { active: true, profitRunning: true },
    sessions: heavyBurstSessions,
    now: afterCloseTs
  });
  assert.equal(evalAfterClose.status, 'market_closed');
  assert.equal(evalAfterClose.isMarketOpen, false);
  assert.equal(evalAfterClose.shouldShowModal, false, 'Nunca exibir modal após o fechamento do mercado');
  assert.equal(evalAfterClose.totalDurationSeconds, 0);

  // 2. Feriado Nacional B3 em plena sexta-feira às 14h (20/11/2026 - Consciência Negra) -> mercado fechado!
  const holidayTs = new Date('2026-11-20T14:00:00-03:00').getTime();
  assert.equal(Model.isB3TradingDay('2026-11-20'), false);
  assert.equal(Model.isMarketOpen(holidayTs), false);
  const evalHoliday = Model.evaluateFocusState({
    monitor: { active: true, profitRunning: true },
    sessions: [
      { openedAt: '2026-11-20T13:50:00-03:00', durationSeconds: 9000 },
      { openedAt: '2026-11-20T13:52:00-03:00', durationSeconds: 9000 },
      { openedAt: '2026-11-20T13:55:00-03:00', durationSeconds: 9000 }
    ],
    now: holidayTs
  });
  assert.equal(evalHoliday.status, 'market_closed');
  assert.equal(evalHoliday.isHoliday, true);
  assert.equal(evalHoliday.isMarketOpen, false);
  assert.equal(evalHoliday.shouldShowModal, false, 'Feriado B3 nunca dispara modal');

  // 3. Feriados móveis (Carnaval, Sexta-feira Santa, Corpus Christi) e Quarta-feira de Cinzas (abre às 13h)
  assert.equal(Model.isMarketOpen(new Date('2026-02-16T14:00:00-03:00').getTime()), false, 'Segunda de Carnaval fechada');
  assert.equal(Model.isMarketOpen(new Date('2026-02-17T14:00:00-03:00').getTime()), false, 'Terça de Carnaval fechada');
  assert.equal(Model.isMarketOpen(new Date('2026-02-18T11:30:00-03:00').getTime()), false, 'Quarta de Cinzas às 11h30 ainda está fechada na B3');
  assert.equal(Model.isMarketOpen(new Date('2026-02-18T14:00:00-03:00').getTime()), true, 'Quarta de Cinzas às 14h está aberta na B3');
  assert.equal(Model.isMarketOpen(new Date('2026-04-03T14:00:00-03:00').getTime()), false, 'Sexta-feira Santa fechada');
  assert.equal(Model.isMarketOpen(new Date('2026-06-04T14:00:00-03:00').getTime()), false, 'Corpus Christi fechado');
  assert.equal(Model.isMarketOpen(new Date('2026-12-24T14:00:00-03:00').getTime()), false, 'Véspera de Natal fechada na B3');
  assert.equal(Model.isMarketOpen(new Date('2026-12-31T14:00:00-03:00').getTime()), false, 'Véspera de Ano Novo fechada na B3');

  // 4. Durante o pregão aberto (Terça 24/11/2026 às 14:00), detecção de comportamento impulsivo funciona integralmente
  const evalOpenCritical = Model.evaluateFocusState({
    monitor: { active: true, profitRunning: true },
    sessions: [
      { openedAt: '2026-11-24T13:50:00-03:00', durationSeconds: 1800 },
      { openedAt: '2026-11-24T13:54:00-03:00', durationSeconds: 1800 },
      { openedAt: '2026-11-24T13:58:00-03:00', durationSeconds: 2400 }
    ],
    now: openSessionTs
  });
  assert.equal(evalOpenCritical.isMarketOpen, true);
  assert.equal(evalOpenCritical.level, 'critical');
  assert.equal(evalOpenCritical.shouldShowModal, true);
  assert.equal(evalOpenCritical.config.soundEnabled, false, 'Som permanentemente desativado');
});

test('FocusGuardianController & Redesign Premium: modal cinematográfico 88vw, arte do Guardião integrada, zero som e bloqueio com mercado fechado', () => {
  const fs = require('node:fs');
  const path = require('node:path');

  const controllerCode = fs.readFileSync(path.join(__dirname, 'focus-guardian.js'), 'utf8');
  const cssCode = fs.readFileSync(path.join(__dirname, 'focus-guardian.css'), 'utf8');
  const artPath = path.join(__dirname, '../assets/focus-guardian/spartan-guardian-backdrop.jpg');

  // 1. Arte do Guardião existe e está integrada ao CSS
  assert.equal(fs.existsSync(artPath), true, 'Imagem cinematográfica do Guardião Espartano deve existir em assets/focus-guardian/');
  assert.ok(cssCode.includes('spartan-guardian-backdrop.jpg'), 'CSS deve integrar a arte do Guardião ao fundo do modal');
  assert.ok(cssCode.includes('width: min(88vw, 1340px)'), 'Modal deve ocupar 85%-90% da largura em desktop');
  assert.ok(cssCode.includes('max-height: 85vh'), 'Modal deve respeitar limite de 85vh');
  assert.ok(cssCode.includes('.focus-guardian-split-layout'), 'Layout dividido em duas áreas deve estar definido');

  // 2. Ausência total de som / Web Audio API
  assert.equal(controllerCode.includes('AudioContext'), false, 'Nenhuma chamada a AudioContext deve existir');
  assert.equal(controllerCode.includes('webkitAudioContext'), false, 'Nenhuma chamada a webkitAudioContext deve existir');
  assert.equal(controllerCode.includes('createOscillator'), false, 'Nenhum oscilador sonoro deve existir');
  assert.equal(controllerCode.includes('playAlertChime'), false, 'Função playAlertChime deve ter sido removida');

  // 3. Execução do Controller no DOM simulado: exibe com mercado aberto e bloqueia com mercado fechado
  let backdropEl = null;
  const mockDoc = {
    readyState: 'complete',
    getElementById: (id) => (id === 'focusGuardianModalBackdrop' ? backdropEl : null),
    querySelector: () => null,
    createElement: () => {
      backdropEl = {
        id: '',
        className: '',
        innerHTML: '',
        style: { display: 'none' },
        setAttribute: () => {}
      };
      return backdropEl;
    },
    body: { appendChild: () => {} },
    addEventListener: () => {}
  };
  const mockWin = {
    FocusGuardianModel: Model,
    document: mockDoc,
    localStorage: { getItem: () => null, setItem: () => {} },
    addEventListener: () => {},
    go: () => {}
  };

  const savedWin = global.window;
  const savedDoc = global.document;
  const savedLS = global.localStorage;
  global.window = mockWin;
  global.document = mockDoc;
  global.localStorage = mockWin.localStorage;
  try {
    const fn = new Function('window', 'document', 'localStorage', controllerCode);
    fn(mockWin, mockDoc, mockWin.localStorage);

    const ctrl = mockWin.FocusGuardianController;

    // 3a. Mercado FECHADO (20:00 BRT): modal NÃO pode abrir
    ctrl._setMockDataForTesting({
      nowOverride: new Date('2026-11-24T20:00:00-03:00').getTime(),
      monitor: { active: true, profitRunning: true },
      sessions: [
        { openedAt: '2026-11-24T19:50:00-03:00', durationSeconds: 3600 },
        { openedAt: '2026-11-24T19:53:00-03:00', durationSeconds: 3600 },
        { openedAt: '2026-11-24T19:56:00-03:00', durationSeconds: 3600 }
      ]
    });
    ctrl.evaluateAndNotify();
    assert.equal(backdropEl === null || backdropEl.style.display === 'none', true, 'Modal nunca deve aparecer com o mercado fechado');

    // 3b. Mercado ABERTO (14:00 BRT em dia útil de pregão): modal abre com todos os elementos preservados
    ctrl._setMockDataForTesting({
      nowOverride: new Date('2026-11-24T14:00:00-03:00').getTime(),
      monitor: { active: true, profitRunning: true },
      sessions: [
        { openedAt: '2026-11-24T13:50:00-03:00', durationSeconds: 2000 },
        { openedAt: '2026-11-24T13:54:00-03:00', durationSeconds: 2000 },
        { openedAt: '2026-11-24T13:58:00-03:00', durationSeconds: 2000 }
      ]
    });
    ctrl.evaluateAndNotify();
    assert.ok(backdropEl, 'Backdrop do modal deve ser criado quando mercado está aberto e limite crítico é atingido');
    assert.equal(backdropEl.style.display, 'grid');
    assert.ok(backdropEl.innerHTML.includes('focus-guardian-cinematic'), 'Classe cinematográfica deve estar presente');
    assert.ok(backdropEl.innerHTML.includes('GUARDIÃO DO FOCO'));
    assert.ok(backdropEl.innerHTML.includes('Aberturas Hoje'));
    assert.ok(backdropEl.innerHTML.includes('Tempo de Tela Hoje'));
    assert.ok(backdropEl.innerHTML.includes('1h 40min'));
    assert.ok(backdropEl.innerHTML.includes('Motivo:'));
    assert.ok(backdropEl.innerHTML.includes('Tenho um setup válido segundo meu plano operacional?'));
    assert.ok(backdropEl.innerHTML.includes('Reconhecer e seguir meu plano'));
    assert.ok(backdropEl.innerHTML.includes('Vou fazer uma pausa (Trader Zen)'));

    // 3c. Se o mercado fechar enquanto o modal estava aberto, evaluateAndNotify fecha o modal imediatamente
    ctrl._setMockDataForTesting({
      nowOverride: new Date('2026-11-24T18:05:00-03:00').getTime()
    });
    ctrl.evaluateAndNotify();
    assert.equal(backdropEl.style.display, 'none', 'Fechamento do mercado deve ocultar qualquer modal aberto');
  } finally {
    global.window = savedWin;
    global.document = savedDoc;
    global.localStorage = savedLS;
  }
});
