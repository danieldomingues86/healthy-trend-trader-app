const test = require('node:test');
const assert = require('node:assert/strict');
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

test('CATEGORIES contains 4 required categories', () => {
  assert.equal(Model.CATEGORIES.length, 4);
  const ids = Model.CATEGORIES.map(c => c.id);
  assert.deepEqual(ids, ['animals', 'legends', 'symbols', 'traders']);
});

test('MARKET_ANIMALS contains 8 required animals from reference', () => {
  assert.equal(Model.MARKET_ANIMALS.length, 8);
  const expectedNames = ['Touro', 'Urso', 'Águia', 'Pantera', 'Lobo', 'Leão', 'Falcão', 'Cervo'];
  const names = Model.MARKET_ANIMALS.map(a => a.name);
  assert.deepEqual(names, expectedNames);
});

test('selectCategory updates category and defaults to first character in category', () => {
  const initial = Model.getDefaultAvatarState();
  const updated = Model.selectCategory(initial, 'legends');
  assert.equal(updated.category, 'legends');
  assert.equal(updated.characterId, 'livermore');
  assert.equal(updated.name, 'Jesse Livermore');
});

test('selectCharacter updates selected character and its assets', () => {
  const initial = Model.getDefaultAvatarState();
  const updated = Model.selectCharacter(initial, 'panther');
  assert.equal(updated.characterId, 'panther');
  assert.equal(updated.name, 'Pantera');
  assert.equal(updated.avatarUrl, 'assets/avatars/panther.png');
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
