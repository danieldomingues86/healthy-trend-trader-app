const { test, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const StormAlertModel = require('./storm-alert-model.js');
const StormAlert = require('./storm-alert.js');

test('StormAlertModel — Calendário de negociação B3 e snapping de pregões', () => {
  // Fins de semana não são pregões
  assert.equal(StormAlertModel.isB3TradingDay('2026-10-03'), false, 'Sábado não é dia de negociação');
  assert.equal(StormAlertModel.isB3TradingDay('2026-10-04'), false, 'Domingo não é dia de negociação');
  // Sexta-feira útil é pregão
  assert.equal(StormAlertModel.isB3TradingDay('2026-10-02'), true, 'Sexta-feira 02/10/2026 é pregão');

  // Feriado nacional fixo de Tiradentes (21/04) e Proclamação da República (15/11)
  assert.equal(StormAlertModel.isB3TradingDay('2026-04-21'), false, 'Tiradentes não é dia útil');
  assert.equal(StormAlertModel.isB3TradingDay('2026-11-15'), false, 'Proclamação da República não é dia útil');

  // Snapping: domingo 04/10/2026 recua para sexta-feira 02/10/2026
  const snapped = StormAlertModel.snapToB3TradingDay('2026-10-04', -1);
  assert.equal(snapped, '2026-10-02', 'Domingo deve fazer snap para sexta-feira anterior');
});

test('StormAlertModel — Resolução do pregão obrigatório de zeragem (Cutoff)', () => {
  // Evento eleitoral em um domingo (2026-10-04) com antecedência padrão de 1 pregão
  const event = {
    name: 'Eleições presidenciais',
    eventDate: '2026-10-04',
    riskStartDate: '2026-10-04',
    riskEndDate: '2026-10-04',
    defaultAdvanceSessions: 1
  };

  const cutoff = StormAlertModel.resolveCutoffSession(event, 1);
  assert.ok(cutoff);
  assert.equal(cutoff.cutoffDate, '2026-10-02', 'Sessão de zeragem deve ser a sexta-feira 02/10/2026 no fechamento');

  // Formatação em português
  const formattedEvent = StormAlertModel.formatDateWithWeekdayBR(event.eventDate);
  assert.ok(formattedEvent.includes('Domingo'), 'Deve conter o dia da semana Domingo');
  assert.ok(formattedEvent.includes('04/10'), 'Deve conter a data 04/10');

  const formattedCutoff = StormAlertModel.formatCutoffSessionBR(cutoff.cutoffDate);
  assert.equal(formattedCutoff, 'Sexta-feira — fechamento');
});

test('StormAlert — ESTADO 2: AÇÃO NECESSÁRIA (Prazo de zeragem próximo/atingido e posições abertas)', () => {
  // Evento no domingo 2026-11-08, data de referência sexta-feira 2026-11-06 (dia do cutoff)
  const testCalendar = [
    {
      id: 'test-election-imminent',
      name: 'Eleições presidenciais',
      fullName: 'Eleições Presidenciais',
      eventDate: '2026-11-08',
      riskStartDate: '2026-11-08',
      riskEndDate: '2026-11-08',
      defaultAdvanceSessions: 1
    }
  ];

  const status = StormAlertModel.evaluateStormAlertStatus({
    referenceDate: '2026-11-06',
    openPositionsCount: 8,
    calendar: testCalendar,
    advanceSessions: 1
  });

  assert.equal(status.hasActiveAlert, true);
  assert.equal(status.state, 'ACTION_REQUIRED');
  assert.equal(status.stateLabel, 'AÇÃO NECESSÁRIA');
  assert.equal(status.riskLevel, 'RISCO EXTREMO');
  assert.equal(status.openPositionsCount, 8);
  assert.equal(status.isProtected, false);
  assert.equal(status.headline, 'TEMPESTADE À VISTA.');
  assert.equal(status.primaryMessage, 'ZERE SUAS POSIÇÕES. PROTEJA SEU CAPITAL.');
  assert.ok(status.complementaryMessage.includes('Um evento extremo está se aproximando'));
  assert.equal(status.impactQuote, 'PROTEGER SEU CAPITAL É MAIS IMPORTANTE DO QUE GANHAR DINHEIRO.');

  // Renderização HTML
  const html = StormAlert.buildStormAlertHtml({
    referenceDate: '2026-11-06',
    openPositionsCount: 8,
    calendar: testCalendar,
    advanceSessions: 1
  });

  assert.ok(html.includes('storm-state-action'), 'Deve possuir a classe CSS storm-state-action');
  assert.ok(html.includes('TEMPESTADE À VISTA.'), 'Deve conter título TEMPESTADE À VISTA.');
  assert.ok(html.includes('ZERE SUAS POSIÇÕES. PROTEJA SEU CAPITAL.'), 'Deve conter mensagem principal');
  assert.ok(html.includes('RISCO EXTREMO'), 'Deve exibir badge RISCO EXTREMO');
  assert.ok(html.includes('AÇÃO NECESSÁRIA'), 'Deve exibir status AÇÃO NECESSÁRIA');
  assert.ok(html.includes('08'), 'Deve exibir 08 posições em aberto');
  assert.ok(html.includes('VER POSIÇÕES EM ABERTO →'), 'Deve exibir botão para ver posições');
  assert.ok(html.includes('PROTEGER SEU CAPITAL É MAIS IMPORTANTE DO QUE GANHAR DINHEIRO.'), 'Deve conter banner de filosofia');
});

test('StormAlert — ESTADO 1: ATENÇÃO (Evento no radar com antecedência para preparação)', () => {
  // Evento em 2026-11-25, referência em 2026-11-06 (mais de 10 dias úteis de antecedência)
  const testCalendar = [
    {
      id: 'test-election-future',
      name: 'Eleições extraordinárias',
      eventDate: '2026-11-25',
      riskStartDate: '2026-11-25',
      riskEndDate: '2026-11-25',
      defaultAdvanceSessions: 1
    }
  ];

  const status = StormAlertModel.evaluateStormAlertStatus({
    referenceDate: '2026-11-06',
    openPositionsCount: 5,
    calendar: testCalendar,
    advanceSessions: 1
  });

  assert.equal(status.hasActiveAlert, true);
  assert.equal(status.state, 'WARNING');
  assert.equal(status.stateLabel, 'ATENÇÃO');
  assert.equal(status.riskLevel, 'RISCO ELEVADO');
  assert.equal(status.openPositionsCount, 5);
  assert.equal(status.headline, 'TEMPESTADE NO RADAR.');
  assert.equal(status.primaryMessage, 'PREPARE-SE PARA ZERAR SUAS POSIÇÕES.');

  // Renderização HTML
  const html = StormAlert.buildStormAlertHtml({
    referenceDate: '2026-11-06',
    openPositionsCount: 5,
    calendar: testCalendar,
    advanceSessions: 1
  });

  assert.ok(html.includes('storm-state-warning'), 'Deve possuir a classe CSS storm-state-warning');
  assert.ok(html.includes('TEMPESTADE NO RADAR.'), 'Deve conter título de advertência');
  assert.ok(html.includes('PREPARE-SE PARA ZERAR SUAS POSIÇÕES.'), 'Deve conter mensagem preparatória');
  assert.ok(html.includes('ATENÇÃO'), 'Deve conter badge de atenção');
});

test('StormAlert — ESTADO 3: PROTEÇÃO CONCLUÍDA (Posições 100% zeradas antes do evento)', () => {
  const testCalendar = [
    {
      id: 'test-event-zerado',
      name: 'Eleições presidenciais',
      eventDate: '2026-11-08',
      riskStartDate: '2026-11-08',
      riskEndDate: '2026-11-08',
      defaultAdvanceSessions: 1
    }
  ];

  // Com 0 posições abertas
  const status = StormAlertModel.evaluateStormAlertStatus({
    referenceDate: '2026-11-06',
    openPositionsCount: 0,
    calendar: testCalendar,
    advanceSessions: 1
  });

  assert.equal(status.hasActiveAlert, true);
  assert.equal(status.state, 'PROTECTED');
  assert.equal(status.stateLabel, 'PROTEÇÃO CONCLUÍDA');
  assert.equal(status.riskLevel, 'PATRIMÔNIO PROTEGIDO');
  assert.equal(status.openPositionsCount, 0);
  assert.equal(status.isProtected, true);
  assert.equal(status.headline, 'PATRIMÔNIO PROTEGIDO.');
  assert.equal(status.primaryMessage, 'VOCÊ FEZ SUA PARTE.');
  assert.ok(status.complementaryMessage.includes('Todas as operações foram encerradas'));

  // Renderização HTML
  const html = StormAlert.buildStormAlertHtml({
    referenceDate: '2026-11-06',
    openPositionsCount: 0,
    calendar: testCalendar,
    advanceSessions: 1
  });

  assert.ok(html.includes('storm-state-protected'), 'Deve possuir classe CSS storm-state-protected');
  assert.ok(html.includes('PATRIMÔNIO PROTEGIDO.'), 'Deve conter título PATRIMÔNIO PROTEGIDO');
  assert.ok(html.includes('VOCÊ FEZ SUA PARTE.'), 'Deve conter mensagem de confirmação positiva');
  assert.ok(html.includes('00'), 'Deve exibir 00 posições abertas');
  // No estado protegido com 0 posições, não deve exigir botão vermelho de zeragem
  assert.equal(html.includes('VER POSIÇÕES EM ABERTO →'), false, 'Não deve exibir botão de zeragem se não há posições');
});

test('StormAlert — ESTADO 0: INATIVO (Sem eventos extremos relevantes no horizonte)', () => {
  // Calendário vazio ou com eventos fora da janela de 45 dias
  const farCalendar = [
    {
      id: 'test-far-event',
      name: 'Evento Distante',
      eventDate: '2028-12-31',
      riskStartDate: '2028-12-31',
      riskEndDate: '2028-12-31'
    }
  ];

  const status = StormAlertModel.evaluateStormAlertStatus({
    referenceDate: '2026-11-06',
    openPositionsCount: 3,
    calendar: farCalendar,
    horizonDays: 30
  });

  assert.equal(status.hasActiveAlert, false);
  assert.equal(status.state, 'INACTIVE');

  // Renderização retorna string vazia para não ocupar espaço no dashboard
  const html = StormAlert.buildStormAlertHtml({
    referenceDate: '2026-11-06',
    openPositionsCount: 3,
    calendar: farCalendar,
    horizonDays: 30
  });

  assert.equal(html, '', 'Quando inativo, o widget deve retornar vazio');
});

test('StormAlert — Cadastro customizado e sincronização de eventos', () => {
  StormAlertModel.clearCustomEvents();

  const customEvt = StormAlertModel.registerCustomEvent({
    name: 'Decisão Judicial Histórica',
    eventDate: '2026-11-12',
    category: 'SYSTEMIC_JUDICIAL_POLITICAL',
    categoryLabel: 'Decisão Judicial Sistêmica',
    defaultAdvanceSessions: 1
  });

  assert.ok(customEvt);
  assert.equal(customEvt.name, 'Decisão Judicial Histórica');

  const cal = StormAlertModel.getActiveCalendar();
  assert.ok(cal.some(e => e.id === customEvt.id), 'Evento customizado deve estar no calendário ativo');

  StormAlertModel.clearCustomEvents();
});

test('StormAlert — Filosofia de proteção: Fechamento visual NÃO revoga regras de proteção', () => {
  StormAlert.setCollapsed(false);
  assert.equal(StormAlert.isCollapsed(), false);

  // Usuário recolhe o card visualmente
  StormAlert.setCollapsed(true);
  assert.equal(StormAlert.isCollapsed(), true);

  const testCalendar = [
    {
      id: 'test-election-active',
      name: 'Eleições presidenciais',
      eventDate: '2026-11-08',
      riskStartDate: '2026-11-08',
      riskEndDate: '2026-11-08'
    }
  ];

  const status = StormAlertModel.evaluateStormAlertStatus({
    referenceDate: '2026-11-06',
    openPositionsCount: 4,
    calendar: testCalendar
  });

  // O status e os riscos permanecem 100% ativos
  assert.equal(status.hasActiveAlert, true);
  assert.equal(status.state, 'ACTION_REQUIRED');
  assert.equal(status.riskLevel, 'RISCO EXTREMO');

  // O HTML recolhido aplica a classe storm-collapsed para exibição compacta sem desativar a política
  const html = StormAlert.buildStormAlertHtml({
    referenceDate: '2026-11-06',
    openPositionsCount: 4,
    calendar: testCalendar
  });

  assert.ok(html.includes('storm-collapsed'), 'Deve conter a classe storm-collapsed quando minimizado');
  assert.ok(html.includes('RISCO EXTREMO'), 'Mesmo minimizado, o alerta de risco extremo permanece presente');

  StormAlert.setCollapsed(false);
});

test('StormAlert CSS — Preserva contraste e identidade visual em Pigeon Light e outros temas', () => {
  const cssPath = path.resolve(__dirname, 'storm-alert.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  // Verifica que existe declaração explícita para Pigeon Light
  assert.ok(css.includes('[data-theme="pigeon"]'), 'Deve conter seletores para data-theme="pigeon"');
  assert.ok(css.includes('body.theme-pigeon'), 'Deve conter seletores para body.theme-pigeon');
  assert.ok(css.includes('!important'), 'Deve garantir propriedades com alta prioridade de contraste');
  assert.ok(css.includes('storm-state-action'), 'Deve estilizar o estado de ação');
  assert.ok(css.includes('storm-state-warning'), 'Deve estilizar o estado de advertência');
  assert.ok(css.includes('storm-state-protected'), 'Deve estilizar o estado de proteção');
  assert.ok(css.includes('storm-alert-philosophy-banner'), 'Deve estilizar o banner de filosofia');
});

test('WealthDashboardV2 — Integração do Storm Alert no início do dashboard', () => {
  const dashboardPath = path.resolve(__dirname, 'wealth-dashboard-v2.js');
  const js = fs.readFileSync(dashboardPath, 'utf8');

  assert.ok(js.includes('stormAlertHtml'), 'wealth-dashboard-v2 deve compor stormAlertHtml');
  assert.ok(js.includes('StormAlert.buildStormAlertHtml'), 'wealth-dashboard-v2 deve invocar StormAlert.buildStormAlertHtml');
  assert.ok(js.includes('StormAlert.attachEvents'), 'wealth-dashboard-v2 deve invocar StormAlert.attachEvents');
});


test('Widget Gallery — Storm Alert catalogado para adição/remoção pelo usuário', () => {
  const registryCode = fs.readFileSync(path.resolve(__dirname, 'home-widget-registry.js'), 'utf8');
  assert.ok(registryCode.includes("id: 'storm-alert'"), 'HomeWidgetRegistry deve conter widget storm-alert');
  assert.ok(registryCode.includes("name: 'Storm Alert'"), 'HomeWidgetRegistry deve ter nome Storm Alert');
  assert.ok(registryCode.includes("category: 'Trading'"), 'Categoria deve ser Trading');

  const cockpitCode = fs.readFileSync(path.resolve(__dirname, 'today-cockpit.js'), 'utf8');
  assert.ok(cockpitCode.includes("'storm-alert'"), 'today-cockpit deve conter artwork de galeria para storm-alert');
  assert.ok(cockpitCode.includes('renderStormAlert'), 'today-cockpit renderContext deve conter renderStormAlert');
});
