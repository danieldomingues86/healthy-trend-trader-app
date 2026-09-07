const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const source = fs.readFileSync(path.join(__dirname, '../index.html'), 'utf8');
function fixture(allowed) {
  let active = false, renders = 0;
  const routes = [];
  const elements = {
    zen: { classList: { contains: () => active, toggle() {} } },
    audiolibrary: { hidden: true, querySelector: () => ({ focus() {} }) },
    traderZenRoot: { hidden: false }
  };
  const context = { document: { getElementById: id => elements[id] }, goWithMentalAudioLibrary: id => { routes.push(id); active = id === 'zen' && allowed; }, renderMentalAudioLibrary: () => renders++ };
  vm.runInNewContext(source.split('\n').find(line => line.startsWith("go=function(id){const library=id==='audiolibrary'")), context);
  return { context, elements, routes, renders: () => renders };
}
test('mental library opens inside Zen and returns without a separate page', () => {
  const f = fixture(true);
  f.context.go('audiolibrary');
  assert.deepEqual(f.routes, ['zen']);
  assert.equal(f.elements.audiolibrary.hidden, false);
  assert.equal(f.elements.traderZenRoot.hidden, true);
  assert.equal(f.renders(), 1);
  f.context.go('zen');
  assert.equal(f.elements.audiolibrary.hidden, true);
  assert.equal(f.elements.traderZenRoot.hidden, false);
});
test('library alias respects the Professional navigation guard', () => {
  const f = fixture(false);
  f.context.go('audiolibrary');
  assert.equal(f.elements.audiolibrary.hidden, true);
  assert.equal(f.renders(), 0);
});
test('library has one embedded root and no standalone menu or page', () => {
  assert.equal((source.match(/id="mentalAudioLibraryRoot"/g) || []).length, 1);
  assert.doesNotMatch(source, /data-page="audiolibrary"/);
  assert.doesNotMatch(source, /class="page" id="audiolibrary"/);
  assert.doesNotMatch(source, /\['audiolibrary','◉','Biblioteca Mental'/);
});
