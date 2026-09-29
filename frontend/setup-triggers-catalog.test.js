const { test } = require('node:test');
const assert = require('node:assert/strict');
const Catalog = require('./setup-triggers-catalog');

test('SetupTriggersCatalog exposes exactly the 5 official triggers', () => {
  const all = Catalog.getAllTriggers();
  assert.equal(all.length, 5);
  const ids = all.map(t => t.id);
  assert.deepEqual(ids, ['INSIDE_BAR', 'PFR_COMPRA', '123_COMPRA', 'DAVE_LANDRY', 'RBI']);
});

test('each trigger has all required educational and execution fields', () => {
  const all = Catalog.getAllTriggers();
  for (const t of all) {
    assert.ok(t.id, 'id is present');
    assert.ok(t.name, 'name is present');
    assert.ok(t.whatIs, 'whatIs is present');
    assert.ok(t.howToIdentify, 'howToIdentify is present');
    assert.ok(t.concept, 'concept is present');
    assert.ok(Array.isArray(t.conditions) && t.conditions.length > 0, 'conditions is an array');
    assert.ok(t.entryTrigger, 'entryTrigger is present');
    assert.ok(t.stop, 'stop is present');
    assert.ok(t.visualExample, 'visualExample is present');
    assert.ok(t.observations, 'observations is present');
  }
});

test('isValidTrigger accurately validates keys', () => {
  assert.equal(Catalog.isValidTrigger('INSIDE_BAR'), true);
  assert.equal(Catalog.isValidTrigger('PFR_COMPRA'), true);
  assert.equal(Catalog.isValidTrigger('123_COMPRA'), true);
  assert.equal(Catalog.isValidTrigger('DAVE_LANDRY'), true);
  assert.equal(Catalog.isValidTrigger('RBI'), true);
  assert.equal(Catalog.isValidTrigger('inside_bar'), true);
  assert.equal(Catalog.isValidTrigger('UNKNOWN_TRIGGER'), false);
  assert.equal(Catalog.isValidTrigger(null), false);
  assert.equal(Catalog.isValidTrigger(''), false);
});

test('getTriggerLabel provides correct display names and fallback', () => {
  assert.equal(Catalog.getTriggerLabel('INSIDE_BAR'), 'Inside Bar');
  assert.equal(Catalog.getTriggerLabel('PFR_COMPRA'), 'PFR de Compra');
  assert.equal(Catalog.getTriggerLabel('123_COMPRA'), '1-2-3 de Compra');
  assert.equal(Catalog.getTriggerLabel('DAVE_LANDRY'), 'Dave Landry');
  assert.equal(Catalog.getTriggerLabel('RBI'), 'Barra Vermelha Ignorada (RBI)');

  // Legacy or missing values
  assert.equal(Catalog.getTriggerLabel(null), 'Não informado');
  assert.equal(Catalog.getTriggerLabel(''), 'Não informado');
  assert.equal(Catalog.getTriggerLabel(undefined), 'Não informado');
  assert.equal(Catalog.getTriggerLabel('random legacy string'), 'Não informado');
  assert.equal(Catalog.getTriggerLabel('random legacy string', 'Padrão não catalogado'), 'Padrão não catalogado');
});

test('normalizeKey handles variations and legacy setup names', () => {
  assert.equal(Catalog.normalizeKey('INSIDE_BAR'), 'INSIDE_BAR');
  assert.equal(Catalog.normalizeKey('Inside Bar'), 'INSIDE_BAR');
  assert.equal(Catalog.normalizeKey('pfr de compra'), 'PFR_COMPRA');
  assert.equal(Catalog.normalizeKey('1-2-3 de Compra'), '123_COMPRA');
  assert.equal(Catalog.normalizeKey('Contração 1-2-3'), '123_COMPRA');
  assert.equal(Catalog.normalizeKey('Dave Landry'), 'DAVE_LANDRY');
  assert.equal(Catalog.normalizeKey('rbi'), 'RBI');
  assert.equal(Catalog.normalizeKey('Barra Vermelha Ignorada'), 'RBI');
  assert.equal(Catalog.normalizeKey('Outro'), null);
});

test('formatTriggerBadge creates consistent visual metadata', () => {
  const b1 = Catalog.formatTriggerBadge('INSIDE_BAR');
  assert.equal(b1.isAssigned, true);
  assert.equal(b1.label, 'Inside Bar');
  assert.equal(b1.badgeText, 'GATILHO: Inside Bar');

  const b2 = Catalog.formatTriggerBadge(null);
  assert.equal(b2.isAssigned, false);
  assert.equal(b2.label, 'Não informado');
  assert.equal(b2.badgeText, 'GATILHO: Não informado');
});
