'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const macroEventsCalendar = require('../src/macro-events-calendar');
const {
  EVENT_STATUS,
  EVENT_IMPACT,
  EVENT_CATEGORIES,
  OFFICIAL_CALENDAR_EVENTS,
  resolveEventStatus,
  buildMacroEventsDimension
} = macroEventsCalendar;

const calculator = require('../src/capital-intelligence-calculator');
const CapitalIntelligenceModel = require('../../frontend/capital-intelligence-model');

test('Macro Events Calendar — Estrutura e integridade do catálogo oficial de eventos', () => {
  assert.ok(Array.isArray(OFFICIAL_CALENDAR_EVENTS), 'OFFICIAL_CALENDAR_EVENTS deve ser uma lista');
  assert.ok(OFFICIAL_CALENDAR_EVENTS.length >= 10, 'Deve conter os eventos canônicos de 2026/2027');

  const requiredFields = [
    'id', 'title', 'shortTitle', 'category', 'country', 'countryLabel', 'flag',
    'date', 'time', 'timezone', 'timezoneLabel', 'impact', 'impactLabel',
    'source', 'numbers', 'affectedSpheres', 'transmissionChannel', 'behavioralGuardrail'
  ];

  OFFICIAL_CALENDAR_EVENTS.forEach(ev => {
    requiredFields.forEach(field => {
      assert.ok(ev[field] !== undefined && ev[field] !== null, `Evento ${ev.id || 'desconhecido'} deve possuir campo ${field}`);
    });

    // Validação de formato de data YYYY-MM-DD
    assert.match(ev.date, /^\d{4}-\d{2}-\d{2}$/, `Data do evento ${ev.id} deve estar em formato YYYY-MM-DD`);
    // Validação de formato de hora HH:MM
    assert.match(ev.time, /^\d{2}:\d{2}$/, `Horário do evento ${ev.id} deve estar em formato HH:MM`);

    // Validação de Fuso Horário Explícito
    assert.ok(
      ev.timezoneLabel.includes('BRT') || ev.timezoneLabel.includes('Horário de Brasília'),
      `Evento ${ev.id} deve indicar explicitamente o fuso Horário de Brasília (BRT)`
    );

    // Validação de números (painel numérico)
    assert.ok(ev.numbers.unit, `Evento ${ev.id} deve ter unidade de medida`);
    assert.ok(ev.numbers.previous !== undefined, `Evento ${ev.id} deve ter valor anterior`);
    assert.ok(ev.numbers.consensus !== undefined, `Evento ${ev.id} deve ter valor de consenso`);

    // Validação de esferas conectadas (canais de transmissão)
    assert.ok(Array.isArray(ev.affectedSpheres), `Evento ${ev.id} deve possuir lista de esferas afetadas`);
    assert.ok(ev.affectedSpheres.length > 0, `Evento ${ev.id} deve conectar ao menos uma esfera`);
    ev.affectedSpheres.forEach(aff => {
      assert.ok(aff.sphereId, `Conexão do evento ${ev.id} deve indicar sphereId`);
      assert.ok(aff.role, `Conexão do evento ${ev.id} deve indicar role/papel da transmissão`);
    });

    // Princípio Inviolável: Conduta operacional não deve emitir calls direcionais
    assert.ok(
      !ev.behavioralGuardrail.toLowerCase().includes('compre') &&
      !ev.behavioralGuardrail.toLowerCase().includes('venda'),
      `Evento ${ev.id} não deve recomendar compra ou venda direcional no guardrail comportamental`
    );
  });
});

test('Macro Events Calendar — Presença de eventos-chave (Copom, FOMC, Payroll, IPCA, CPI)', () => {
  const ids = OFFICIAL_CALENDAR_EVENTS.map(e => e.id);

  assert.ok(ids.some(id => id.includes('copom')), 'Deve conter reuniões do Copom');
  assert.ok(ids.some(id => id.includes('fomc')), 'Deve conter reuniões do FOMC');
  assert.ok(ids.some(id => id.includes('payroll')), 'Deve conter divulgações de Payroll');
  assert.ok(ids.some(id => id.includes('ipca')), 'Deve conter divulgações do IPCA/IPCA-15');
  assert.ok(ids.some(id => id.includes('cpi')), 'Deve conter divulgações do CPI dos EUA');
});

test('Macro Events Calendar — Resolução de status temporal determinístico (resolveEventStatus)', () => {
  const futureEvent = {
    date: '2026-12-10',
    time: '18:30',
    timezone: 'America/Sao_Paulo',
    status: 'upcoming'
  };

  const pastEvent = {
    date: '2026-11-06',
    time: '18:30',
    timezone: 'America/Sao_Paulo',
    status: 'upcoming'
  };

  const cancelledEvent = {
    date: '2026-12-15',
    time: '10:00',
    timezone: 'America/Sao_Paulo',
    status: 'cancelled'
  };

  const referenceDate = new Date('2026-11-24T12:00:00Z');

  assert.strictEqual(
    resolveEventStatus(futureEvent, referenceDate),
    EVENT_STATUS.UPCOMING,
    'Evento em data futura deve ser classificado como upcoming'
  );

  assert.strictEqual(
    resolveEventStatus(pastEvent, referenceDate),
    EVENT_STATUS.RELEASED,
    'Evento em data passada deve ser dinamicamente classificado como released'
  );

  assert.strictEqual(
    resolveEventStatus(cancelledEvent, referenceDate),
    EVENT_STATUS.CANCELLED,
    'Evento explicitamente cancelado deve manter status cancelled'
  );
});

test('Macro Events Calendar — Geração da dimensão canônica (buildMacroEventsDimension)', () => {
  const referenceDate = new Date('2026-11-24T12:00:00Z');
  const dimension = buildMacroEventsDimension({ now: referenceDate });

  assert.strictEqual(dimension.id, 'macro_events');
  assert.strictEqual(dimension.universe, 'macro');
  assert.strictEqual(dimension.region, 'GLOBAL');
  assert.strictEqual(dimension.badge, 'EVENTOS MACRO');
  assert.ok(dimension.counts.total > 0, 'Deve contabilizar total de eventos');
  assert.ok(dimension.counts.upcoming > 0, 'Deve haver eventos futuros');
  assert.ok(dimension.counts.released > 0, 'Deve haver eventos passados recentes');
  assert.ok(dimension.nextEvent, 'Deve identificar o próximo evento imediato');
  assert.strictEqual(dimension.nextEvent.date >= '2026-11-24', true, 'Próximo evento deve ser hoje ou posterior');

  // Princípios invioláveis explícitos
  assert.ok(Array.isArray(dimension.principles), 'Deve expor lista de princípios invioláveis');
  assert.ok(
    dimension.principles.some(p => p.toLowerCase().includes('não antecipar a reação')),
    'Deve incluir princípio explícito de não antecipação de reação do mercado'
  );
});

test('Macro Events Calendar — Integração no buildDailySnapshot do calculador de Capital Intelligence', () => {
  const snapshot = calculator.buildDailySnapshot({
    now: new Date('2026-11-24T12:00:00Z')
  });

  assert.ok(snapshot.spheres.macro_events, 'Snapshot deve incluir esfera macro_events');
  const macroNode = snapshot.spheres.macro_events;

  assert.strictEqual(macroNode.id, 'macro_events');
  assert.ok(macroNode.nextEvent, 'Esfera deve apontar o próximo catalisador');
  assert.ok(Array.isArray(macroNode.upcomingEvents), 'Esfera deve conter lista de eventos futuros');
  assert.ok(macroNode.counts.highImpact >= 1, 'Deve identificar eventos de alto impacto futuros');

  // Retrocompatibilidade do officialCalendar
  assert.ok(Array.isArray(snapshot.officialCalendar), 'Deve manter lista retrocompatível de calendário oficial');
});

test('Macro Events Calendar — Ingestão e conexões no CapitalIntelligenceModel (Frontend)', () => {
  const snapshot = calculator.buildDailySnapshot({
    now: new Date('2026-11-24T12:00:00Z')
  });

  const model = new CapitalIntelligenceModel();
  model.hydrateFromPipelineSnapshot(snapshot);

  const macroNode = model.getNodeById('macro_events');
  assert.ok(macroNode, 'Model deve conter nó macro_events');
  assert.ok(macroNode.macroEventsDetail, 'Nó deve conter objeto detalhado macroEventsDetail');
  assert.strictEqual(macroNode.macroEventsDetail.nextEvent.id, snapshot.spheres.macro_events.nextEvent.id);
  assert.strictEqual(macroNode.macroEventsDetail.counts.upcoming, snapshot.spheres.macro_events.counts.upcoming);

  // Verificação de conexões com os ciclos BR e US
  const connBr = model.getConnectionById('conn_macro_cycle_br');
  const connUs = model.getConnectionById('conn_macro_cycle_us');
  assert.ok(connBr, 'Deve existir conexão canônica macro_events -> cycle_br');
  assert.ok(connUs, 'Deve existir conexão canônica macro_events -> cycle_us');
  assert.strictEqual(connBr.source, 'macro_events');
  assert.strictEqual(connBr.target, 'cycle_br');
});
