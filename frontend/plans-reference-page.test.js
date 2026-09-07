const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function bridge() {
  const calls = [];
  const source = {};
  const frame = { contentWindow: source, getBoundingClientRect: () => ({ top: 80, height: 1536 }) };
  let handler;
  const context = {
    document: { getElementById: id => id === 'plansReferenceFrame' ? frame : null },
    location: { origin: 'http://localhost:4173' },
    addEventListener: (type, callback) => { if (type === 'message') handler = callback; },
    setSubscriptionPlan: plan => calls.push(['plan', plan]),
    go: page => calls.push(['go', page]),
    scrollTo: options => calls.push(['scroll', options.top]),
    matchMedia: () => ({ matches: true }), scrollY: 0
  };
  context.window = context;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'plans-reference-page.js'), 'utf8'), context);
  return { calls, send: (action, overrides = {}) => handler({ source, origin: context.location.origin, data: { type: 'healthy-plans-reference', action }, ...overrides }) };
}

test('reference CTAs delegate to the existing Basic and Professional selection', () => {
  const { calls, send } = bridge();
  send('choose-basic'); send('choose-professional');
  assert.deepEqual(calls, [['plan', 'basic'], ['plan', 'professional']]);
});

test('reference bridge rejects messages from other frames or origins', () => {
  const { calls, send } = bridge();
  send('choose-professional', { source: {} });
  send('choose-professional', { origin: 'https://untrusted.example' });
  send('unknown-action');
  assert.deepEqual(calls, []);
});

test('reference navigation scrolls to existing artwork sections and returns to workspace', () => {
  const { calls, send } = bridge();
  send('solucao'); send('planos'); send('comecar'); send('entrar');
  assert.ok(calls[0][1] < calls[1][1]);
  assert.equal(calls[1][1], calls[2][1]);
  assert.deepEqual(calls[3], ['go', 'today']);
});

test('reference buttons also send valid messages from a local file preview', () => {
  for (const origin of ['null', 'http://localhost:4173']) {
    const sent = [];
    let click;
    const link = { dataset: {}, classList: { contains: name => name === 'pro-btn' }, addEventListener: (type, callback) => { click = callback; } };
    const context = { document: { querySelectorAll: () => [link] }, location: { origin }, parent: { postMessage: (message, target) => sent.push([message.action, target]) }, addEventListener() {} };
    context.window = context;
    vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'plans-reference-actions.js'), 'utf8'), context);
    click({ preventDefault() {} });
    assert.deepEqual(sent, [['ready', origin === 'null' ? '*' : origin], ['choose-professional', origin === 'null' ? '*' : origin]]);
  }
});
