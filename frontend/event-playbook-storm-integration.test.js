const test = require('node:test');
const assert = require('node:assert/strict');

// Mock localStorage and global environment
class MemoryStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.has(key) ? this.store.get(key) : null;
  }
  setItem(key, value) {
    this.store.set(key, String(value));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

globalThis.localStorage = new MemoryStorage();

const EventPlaybookModel = require('./event-playbook-model');
globalThis.EventPlaybookModel = EventPlaybookModel;

const StormAlertModel = require('./storm-alert-model');
globalThis.StormAlertModel = StormAlertModel;

const StormAlert = require('./storm-alert');
globalThis.StormAlert = StormAlert;

test('Event Playbook: criação de novo evento persiste e atualiza lista', () => {
  const initialCount = EventPlaybookModel.getAllEvents().length;
  
  const newEv = EventPlaybookModel.addEvent({
    name: 'Anúncio de Medidas Fiscais',
    category: 'Política',
    date: '2026-11-13',
    time: '14:00',
    impact: 4,
    affectedAssets: 'IBOV, DÓLAR, DI1F29',
    whatHappened: 'Pacote de contenção de despesas anunciado pelo Ministério da Fazenda.',
    tradingImplications: 'Reduzir risco em estatais e acompanhar fechamento da curva de juros.'
  });

  assert.ok(newEv.id, 'Novo evento deve possuir id');
  assert.equal(newEv.name, 'Anúncio de Medidas Fiscais');
  
  const allEvents = EventPlaybookModel.getAllEvents();
  assert.equal(allEvents.length, initialCount + 1, 'Total de eventos deve incrementar');
  
  const fetched = EventPlaybookModel.getEventById(newEv.id);
  assert.ok(fetched, 'getEventById deve recuperar o evento recém-criado');
  assert.equal(fetched.impact, 4);
});

test('Event Playbook: edição de evento existente atualiza os dados sem duplicar', () => {
  const allEvents = EventPlaybookModel.getAllEvents();
  const target = allEvents[0];
  const beforeCount = allEvents.length;

  const updated = EventPlaybookModel.updateEvent(target.id, {
    name: target.name + ' [REVISADO]',
    tradingImplications: 'Diretriz operacional atualizada pelo trader.'
  });

  assert.equal(updated.id, target.id, 'ID deve ser preservado');
  assert.equal(updated.name, target.name + ' [REVISADO]');
  assert.equal(updated.tradingImplications, 'Diretriz operacional atualizada pelo trader.');

  const reloaded = EventPlaybookModel.getEventById(target.id);
  assert.equal(reloaded.name, target.name + ' [REVISADO]');
  assert.equal(EventPlaybookModel.getAllEvents().length, beforeCount, 'Contagem total não deve mudar após edição');
});

test('Integração Event Playbook + Storm Alert: evento extremo criado dentro de 5 dias ativa o alerta no Dashboard', () => {
  // Data de referência de teste: 2026-11-11
  const refDate = '2026-11-11';
  // Evento em 2026-11-13 (2 dias no futuro, dentro da janela de 5 dias)
  const extremeEv = EventPlaybookModel.addEvent({
    name: 'Super Quarta Emergencial Copom + FOMC',
    category: 'Banco Central',
    date: '2026-11-13',
    time: '18:30',
    impact: 5,
    affectedAssets: 'IBOV, DI, SPX',
    whatHappened: 'Decisão coordenada sobre política monetária global.',
    tradingImplications: 'Zerar todas as posições na véspera.'
  });

  assert.equal(extremeEv.impact, 5);

  const status = StormAlertModel.evaluateStormAlertStatus({
    referenceDate: refDate,
    horizonDays: 5,
    openPositionsCount: 4
  });

  assert.equal(status.hasActiveAlert, true, 'Storm alert deve estar ativo');
  assert.ok(status.event, 'Deve conter o evento causador do alarme');
  assert.equal(status.event.name, 'Super Quarta Emergencial Copom + FOMC');
  assert.equal(status.event.daysRemaining, 2, 'Devem restar 2 dias para o evento');
  assert.equal(status.state, 'ACTION_REQUIRED');

  const html = StormAlert.buildStormAlertHtml({
    referenceDate: refDate,
    horizonDays: 5,
    openPositionsCount: 4
  });

  assert.ok(html.includes('STORM ALERT'), 'HTML deve conter o banner do Storm Alert');
  assert.ok(html.includes('Super Quarta Emergencial Copom + FOMC'), 'HTML deve conter o nome do evento criado');
});

test('Integração Event Playbook + Storm Alert: evento extremo criado fora de 5 dias NÃO ativa o alerta no Dashboard', () => {
  // Data de referência: 2026-11-11
  const refDate = '2026-11-11';
  // Evento em 2026-11-25 (14 dias no futuro, fora da janela de 5 dias)
  const farEv = EventPlaybookModel.addEvent({
    name: 'Cúpula Geopolítica Global',
    category: 'Geopolítica',
    date: '2026-11-25',
    time: '10:00',
    impact: 5,
    affectedAssets: 'PETR4, OURO, DÓLAR'
  });

  // Limpa o evento de 2026-11-13 do teste anterior para testar isoladamente
  const all = EventPlaybookModel.getAllEvents().filter(e => e.date !== '2026-11-13');
  EventPlaybookModel.saveAllEvents(all);

  const status = StormAlertModel.evaluateStormAlertStatus({
    referenceDate: refDate,
    horizonDays: 5,
    openPositionsCount: 4
  });

  assert.equal(status.hasActiveAlert, false, 'Alerta NÃO deve ativar para evento a 14 dias');
  assert.equal(status.state, 'INACTIVE');

  const html = StormAlert.buildStormAlertHtml({
    referenceDate: refDate,
    horizonDays: 5,
    openPositionsCount: 4
  });

  assert.equal(html, '', 'HTML do widget deve ser string vazia quando inativo');
});

test('Integração Event Playbook + Storm Alert: edição de evento alterando para Impacto 5 e data em 3 dias ativa o alerta imediatamente', () => {
  const refDate = '2026-11-11';
  // 1. Cria evento inicialmente de impacto 3 (médio)
  const mildEv = EventPlaybookModel.addEvent({
    name: 'Divulgação de Indicador Trimestral',
    category: 'Macro',
    date: '2026-11-14',
    impact: 3
  });

  let status = StormAlertModel.evaluateStormAlertStatus({
    referenceDate: refDate,
    horizonDays: 5,
    openPositionsCount: 2
  });
  assert.equal(status.hasActiveAlert, false, 'Impacto 3 não ativa o Storm Alert');

  // 2. Edita o evento elevando o impacto para 5 (Extremo)
  EventPlaybookModel.updateEvent(mildEv.id, {
    impact: 5,
    name: 'Divulgação de Indicador Crítico de Inflação'
  });

  status = StormAlertModel.evaluateStormAlertStatus({
    referenceDate: refDate,
    horizonDays: 5,
    openPositionsCount: 2
  });

  assert.equal(status.hasActiveAlert, true, 'Após edição para Impacto 5, alerta deve ser ativado imediatamente');
  assert.equal(status.event.name, 'Divulgação de Indicador Crítico de Inflação');
  assert.equal(status.event.daysRemaining, 3);
});
