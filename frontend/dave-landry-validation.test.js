const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SetupTriggersCatalog = require('./setup-triggers-catalog');
const TickerChartModel = require('./ticker-chart-model');
const TradeSimulatorModel = require('./trade-simulator-model');
const TradeAnatomyModel = require('./trade-anatomy-model');

test('Remoção Dave Landry — 1. SetupTriggersCatalog não possui DAVE_LANDRY', () => {
  assert.equal(SetupTriggersCatalog.isValidTrigger('DAVE_LANDRY'), false, 'DAVE_LANDRY não deve ser válido no catálogo');
  assert.equal(SetupTriggersCatalog.normalizeKey('Dave Landry'), null, 'Dave Landry normalizado deve ser nulo');
  assert.equal(SetupTriggersCatalog.normalizeKey('David Landry'), null, 'David Landry normalizado deve ser nulo');
  assert.equal(SetupTriggersCatalog.getTriggerLabel('DAVE_LANDRY'), 'Não informado');

  const allTriggers = SetupTriggersCatalog.getAllTriggers();
  assert.ok(Array.isArray(allTriggers));
  assert.equal(allTriggers.some(t => t.id === 'DAVE_LANDRY' || t.key === 'DAVE_LANDRY' || t.label === 'Dave Landry'), false, 'Nenhum item do catálogo deve ser Dave Landry');
});

test('Remoção Dave Landry — 2. TickerChartModel não possui detector nem padrão Dave Landry', () => {
  assert.equal(typeof TickerChartModel.validateDaveLandryPattern, 'undefined', 'validateDaveLandryPattern não deve existir no TickerChartModel');

  // Teste de detecção em série de candles
  const candles = [
    { open: 40.50, high: 42.00, low: 40.00, close: 41.50, date: '2026-05-18' },
    { open: 41.20, high: 41.50, low: 39.20, close: 39.80, date: '2026-05-19' },
    { open: 39.50, high: 40.80, low: 38.50, close: 40.20, date: '2026-05-20' }
  ];
  const detected = TickerChartModel.detectSetupTriggers(candles);
  assert.ok(detected && typeof detected === 'object');
  assert.notEqual(detected.id, 'DAVE_LANDRY', 'detectSetupTriggers não deve identificar Dave Landry');
  assert.notEqual(detected.name, 'Dave Landry', 'detectSetupTriggers não deve identificar Dave Landry');
});

test('Remoção Dave Landry — 3. TradeSimulatorModel removeu Dave Landry das regras e catalogo', () => {
  assert.equal(typeof TradeSimulatorModel.validateDaveLandryPattern, 'undefined', 'validateDaveLandryPattern não deve existir no TradeSimulatorModel');

  const candles = [
    { open: 40.50, high: 42.00, low: 40.00, close: 41.50, date: '2026-05-18' },
    { open: 41.20, high: 41.50, low: 39.20, close: 39.80, date: '2026-05-19' },
    { open: 39.50, high: 40.80, low: 38.50, close: 40.20, date: '2026-05-20' }
  ];
  const simDetected = TradeSimulatorModel.detectAllSetupTriggers(candles, 2);
  assert.ok(Array.isArray(simDetected));
  assert.equal(simDetected.some(t => t.type === 'DAVE_LANDRY' || t.name === 'Dave Landry'), false, 'detectAllSetupTriggers não deve identificar Dave Landry');

  // Trigger Types não deve conter DAVE_LANDRY
  if (TradeSimulatorModel.TRIGGER_TYPES) {
    const vals = Object.values(TradeSimulatorModel.TRIGGER_TYPES);
    assert.equal(vals.includes('DAVE_LANDRY'), false);
    assert.equal(vals.includes('Dave Landry'), false);
  }

  // Official rules panel não deve conter Dave Landry
  const officialRulesPanel = TradeSimulatorModel.buildOfficialRulesPanelData();
  const triggersRule = officialRulesPanel.rules.find(r => r.id === 'enabled_triggers');
  assert.ok(triggersRule);
  assert.equal(triggersRule.summary.includes('Dave Landry'), false, 'Gatilhos oficiais não devem incluir Dave Landry');
});

test('Remoção Dave Landry — 4. TradeAnatomyModel e index.html sem referências ativas a Dave Landry', () => {
  // TradeAnatomyModel
  const anatomyCatalog = TradeAnatomyModel.TRIGGER_CATALOG || [];
  assert.equal(anatomyCatalog.some(t => t.id === 'DAVE_LANDRY' || t.name === 'Dave Landry'), false, 'TradeAnatomyModel não deve ter Dave Landry no catálogo');

  // index.html
  const indexPath = path.join(__dirname, '..', 'index.html');
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  assert.equal(indexContent.includes('<option value="DAVE_LANDRY">'), false, 'index.html não deve ter option DAVE_LANDRY no select');
});
