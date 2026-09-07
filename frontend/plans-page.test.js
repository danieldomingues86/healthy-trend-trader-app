const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');
const renderer = fs.readFileSync(path.join(__dirname, 'plans-page.js'), 'utf8');
const declaration = name => {
  const line = html.split('\n').find(line => line.startsWith(`function ${name}(`) || line.startsWith(`const ${name}=`));
  assert.ok(line, `Existing subscription declaration: ${name}`);
  return line;
};
function setup(plan = 'basic', overrides = {}, language = 'pt-BR') {
  const root = { innerHTML: '', querySelectorAll: () => [], querySelector: () => null };
  const saved = {};
  const context = vm.createContext({
    Date, Set, Math, JSON,
    document: { getElementById: id => id === 'plan' ? root : null },
    localStorage: { setItem: (key, value) => saved[key] = value },
    applySubscriptionAccess() {}, setupAccountMenu() {}, showToast() {},
    appLanguage: language
  });
  context.window = context;
  const declarations = ['SUBSCRIPTION_STORAGE', 'BASIC_MONTHLY_LIMIT', 'TRIAL_DURATION_DAYS', 'professionalPages', 'titles',
    'subscriptionMonth', 'trialExpiresAt', 'trialIsActive', 'trialIsExpired', 'syncSubscriptionMonth',
    'saveSubscription', 'subscriptionText', 'isProfessional', 'planName', 'trialDaysRemaining', 'setSubscriptionPlan', 'startFreeTrial'];
  vm.runInContext(declarations.map(declaration).join('\n'), context);
  vm.runInContext(`let subscriptionState=${JSON.stringify({ plan, trialStartedAt: Date.now(), trialStatus: 'active', trialUsed: true, usageMonth: new Date().toISOString().slice(0, 7), tradesUsed: 12, trialAlertedDays: [], ...overrides })}`, context);
  vm.runInContext(renderer, context);
  context.renderPlan();
  return { root, context, saved, state: () => vm.runInContext('subscriptionState', context) };
}

test('comparison covers every current product route and assigns Professional using the real guard', () => {
  const { root, context } = setup();
  const inventory = [...root.innerHTML.matchAll(/data-plan-feature="([^"]+)"/g)].map(match => match[1]);
  const routes = vm.runInContext('Object.keys(titles)', context).filter(id => !['plan', 'upgrade'].includes(id));
  for (const route of routes) assert.ok(inventory.includes(route), `Missing product route: ${route}`);
  assert.equal(new Set(inventory).size, inventory.length);
  const proCard = root.innerHTML.split('plans-experience-pro')[1].split('</article>')[0];
  const proIds = [...proCard.matchAll(/data-plan-feature="([^"]+)"/g)].map(match => match[1]);
  assert.deepEqual(proIds.sort(), Array.from(vm.runInContext('professionalPages', context)).sort());
  assert.ok(root.innerHTML.indexOf('id="plans-comparison"') < root.innerHTML.indexOf('id="plans-pricing"'));
});

test('Basic preserves monthly usage, displays current plan and offers Professional', () => {
  const { root, state } = setup();
  assert.match(root.innerHTML, /12 de 50 novos trades/);
  assert.match(root.innerHTML, /disabled onclick="setSubscriptionPlan\('basic'\)"/);
  assert.match(root.innerHTML, /Desbloquear Professional/);
  assert.equal(state().plan, 'basic');
});

test('selecting Professional uses existing subscription persistence and preserves usage', () => {
  const { root, context, state, saved } = setup();
  context.setSubscriptionPlan('professional');
  assert.equal(state().plan, 'professional');
  assert.equal(state().tradesUsed, 12);
  assert.equal(JSON.parse(saved['healthy-trend-subscription-v1']).plan, 'professional');
  assert.match(root.innerHTML, /disabled onclick="setSubscriptionPlan\('professional'\)"/);
  assert.match(root.innerHTML, /Escolher Basic/);
});

test('active trial remains a trial and allows explicit paid-plan selection', () => {
  const { root, state } = setup('trial');
  assert.match(root.innerHTML, /Seu teste Professional está ativo/);
  assert.match(root.innerHTML, /Você está experimentando este plano/);
  assert.match(root.innerHTML, /Desbloquear Professional/);
  assert.equal(state().plan, 'trial');
});

test('expired trial has no current paid plan and keeps both choices available', () => {
  const { root, state } = setup('trial', { trialStartedAt: Date.now() - 8 * 86400000 });
  assert.equal(state().trialStatus, 'expired');
  assert.match(root.innerHTML, /Seu teste grátis chegou ao fim/);
  assert.match(root.innerHTML, /Escolher Basic/);
  assert.match(root.innerHTML, /Desbloquear Professional/);
  assert.doesNotMatch(root.innerHTML, /disabled onclick=/);
});

test('unused trial activation retains the original seven-day lifecycle', () => {
  const { root, context, state } = setup('basic', { trialUsed: false });
  assert.match(root.innerHTML, /Ativar teste grátis/);
  context.startFreeTrial();
  assert.equal(state().plan, 'trial');
  assert.equal(state().trialUsed, true);
  assert.match(root.innerHTML, /Seu teste Professional está ativo/);
});

test('English keeps plan actions, comparison and current state translated', () => {
  const { root } = setup('basic', {}, 'en-US');
  assert.match(root.innerHTML, /Unlock Professional/);
  assert.match(root.innerHTML, /12 of 50 new trades/);
  assert.match(root.innerHTML, /Everything connects/);
  assert.doesNotMatch(root.innerHTML, /Desbloquear|Seu plano atual|Mais processo/);
});
