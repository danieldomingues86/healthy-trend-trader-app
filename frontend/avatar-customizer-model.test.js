const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const Model = require('./avatar-customizer-model.js');

test('getDefaultAvatarState returns Touro as initial character with gold frame and green color', () => {
  const state = Model.getDefaultAvatarState();
  assert.equal(state.characterId, 'bull');
  assert.equal(state.name, 'Touro');
  assert.equal(state.category, 'animals');
  assert.equal(state.highlightColor, 'green');
  assert.equal(state.frame, 'gold_classic');
  assert.equal(state.avatarUrl, 'assets/avatars/bull.png');
});

test('CATEGORIES contains exactly 3 exclusive categories without legends', () => {
  assert.equal(Model.CATEGORIES.length, 3);
  const ids = Model.CATEGORIES.map(c => c.id);
  assert.deepEqual(ids, ['animals', 'symbols', 'identity']);
  assert.equal(Model.CATEGORIES.some(c => c.id === 'legends'), false);
});

test('MARKET_ANIMALS contains 8 required animals from reference', () => {
  assert.equal(Model.MARKET_ANIMALS.length, 8);
  const expectedNames = ['Touro', 'Urso', 'Águia', 'Pantera', 'Lobo', 'Leão', 'Falcão', 'Cervo'];
  const names = Model.MARKET_ANIMALS.map(a => a.name);
  assert.deepEqual(names, expectedNames);
});

test('MARKET_SYMBOLS contains 8 required technical market concepts', () => {
  assert.equal(Model.MARKET_SYMBOLS.length, 8);
  const expectedNames = [
    'Candlestick',
    'Tendência de Alta',
    'Rompimento',
    'Fibonacci',
    'Volume',
    'Suporte e Resistência',
    'Volatilidade',
    'Fluxo de Mercado'
  ];
  const names = Model.MARKET_SYMBOLS.map(s => s.name);
  assert.deepEqual(names, expectedNames);
});

test('TRADER_IDENTITY contains 8 required realistic trader profiles', () => {
  assert.equal(Model.TRADER_IDENTITY.length, 8);
  const expectedNames = [
    'O Trader Estrategista',
    'A Trader Analista',
    'O Trader Institucional',
    'A Trader Executora',
    'O Analista Técnico',
    'A Trader de Performance',
    'O Trader Experiente',
    'O Trader Digital'
  ];
  const names = Model.TRADER_IDENTITY.map(t => t.name);
  assert.deepEqual(names, expectedNames);
});

test('Strict exclusivity rule: 24 total distinct characters with ZERO asset or id reuse', () => {
  const all = Model.getAllCharacters();
  assert.equal(all.length, 24);

  const ids = new Set(all.map(c => c.id));
  assert.equal(ids.size, 24, 'All 24 character IDs must be unique');

  const names = new Set(all.map(c => c.name));
  assert.equal(names.size, 24, 'All 24 character names must be unique');

  const avatarUrls = new Set(all.map(c => c.avatarUrl));
  assert.equal(avatarUrls.size, 24, 'All 24 avatar image URLs must be unique (zero asset reuse)');

  // Verify that every image file actually exists on disk
  all.forEach(c => {
    const fullPath = path.resolve(__dirname, '..', c.avatarUrl);
    assert.equal(fs.existsSync(fullPath), true, `Asset file must exist: ${c.avatarUrl}`);
  });
});

test('selectCategory updates category and defaults to first character of that category', () => {
  const initial = Model.getDefaultAvatarState();

  const toSymbols = Model.selectCategory(initial, 'symbols');
  assert.equal(toSymbols.category, 'symbols');
  assert.equal(toSymbols.characterId, 'candlestick');
  assert.equal(toSymbols.name, 'Candlestick');
  assert.equal(toSymbols.avatarUrl, 'assets/avatars/symbol-candlestick.png');

  const toIdentity = Model.selectCategory(toSymbols, 'identity');
  assert.equal(toIdentity.category, 'identity');
  assert.equal(toIdentity.characterId, 'trader-strategist');
  assert.equal(toIdentity.name, 'O Trader Estrategista');
  assert.equal(toIdentity.avatarUrl, 'assets/avatars/trader-strategist.png');
});

test('selectCharacter updates selected character and its assets', () => {
  const initial = Model.getDefaultAvatarState();
  const updated = Model.selectCharacter(initial, 'panther');
  assert.equal(updated.characterId, 'panther');
  assert.equal(updated.name, 'Pantera');
  assert.equal(updated.avatarUrl, 'assets/avatars/panther.png');

  const symbolSelected = Model.selectCharacter(initial, 'fibonacci');
  assert.equal(symbolSelected.characterId, 'fibonacci');
  assert.equal(symbolSelected.name, 'Fibonacci');
  assert.equal(symbolSelected.avatarUrl, 'assets/avatars/symbol-fibonacci.png');
});

test('selectColor updates highlight color and hex', () => {
  const initial = Model.getDefaultAvatarState();
  const updated = Model.selectColor(initial, 'gold');
  assert.equal(updated.highlightColor, 'gold');
  assert.equal(updated.colour, '#eab308');
});

test('selectFrame updates frame', () => {
  const initial = Model.getDefaultAvatarState();
  const updated = Model.selectFrame(initial, 'green_premium');
  assert.equal(updated.frame, 'green_premium');
});

test('paginate divides items correctly', () => {
  const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const p1 = Model.paginate(items, 1, 4);
  assert.equal(p1.page, 1);
  assert.equal(p1.totalPages, 3);
  assert.deepEqual(p1.items, [1, 2, 3, 4]);
  assert.equal(p1.hasPrev, false);
  assert.equal(p1.hasNext, true);

  const p2 = Model.paginate(items, 2, 4);
  assert.equal(p2.page, 2);
  assert.deepEqual(p2.items, [5, 6, 7, 8]);
  assert.equal(p2.hasPrev, true);
  assert.equal(p2.hasNext, true);
});

test('toLegacyStorageFormat and fromLegacyStorageFormat maintain backwards compatibility', () => {
  const state = Model.getDefaultAvatarState();
  const legacy = Model.toLegacyStorageFormat(state);
  assert.equal(legacy.colour, '#10b981');
  assert.equal(legacy.characterId, 'bull');

  const restored = Model.fromLegacyStorageFormat(legacy);
  assert.equal(restored.characterId, 'bull');
  assert.equal(restored.colour, '#10b981');
});
