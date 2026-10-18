const test = require('node:test');
const assert = require('node:assert/strict');
const Model = require('./browser-history-navigation-model.js');

test('BrowserHistoryNavigationModel: canonicalPageId mapeia aliases e normaliza IDs', () => {
  assert.equal(Model.canonicalPageId('today'), 'today');
  assert.equal(Model.canonicalPageId('  TODAY  '), 'today');
  assert.equal(Model.canonicalPageId('WATCHLIST'), 'watchlist');
  assert.equal(Model.canonicalPageId('news'), 'marketcentral');
  assert.equal(Model.canonicalPageId('marketnews'), 'marketcentral');
  assert.equal(Model.canonicalPageId('marketscans'), 'opportunityradar');
  assert.equal(Model.canonicalPageId('emergingleaders'), 'relativestrength');
  assert.equal(Model.canonicalPageId('couragechallenge'), 'mission');
  assert.equal(Model.canonicalPageId('rebuild'), 'mission');
  assert.equal(Model.canonicalPageId('risk'), 'newtrade');
  assert.equal(Model.canonicalPageId(null), 'today');
  assert.equal(Model.canonicalPageId(undefined), 'today');
  assert.equal(Model.canonicalPageId(''), 'today');
});

test('BrowserHistoryNavigationModel: normalizeExtra extrai e normaliza parâmetros adicionais', () => {
  assert.equal(Model.normalizeExtra('PETR4'), 'PETR4');
  assert.equal(Model.normalizeExtra('  vale3  '), 'vale3');
  assert.equal(Model.normalizeExtra({ ticker: 'wege3' }), 'WEGE3');
  assert.equal(Model.normalizeExtra({ id: 'pos-123' }), 'pos-123');
  assert.equal(Model.normalizeExtra(null), null);
  assert.equal(Model.normalizeExtra(undefined), null);
  assert.equal(Model.normalizeExtra(''), null);
  assert.equal(Model.normalizeExtra('   '), null);
});

test('BrowserHistoryNavigationModel: parseHash processa diferentes formatos de URL hash', () => {
  assert.deepEqual(Model.parseHash('#watchlist'), { pageId: 'watchlist', extra: null });
  assert.deepEqual(Model.parseHash('#/watchlist'), { pageId: 'watchlist', extra: null });
  assert.deepEqual(Model.parseHash('#charts:PETR4'), { pageId: 'charts', extra: 'PETR4' });
  assert.deepEqual(Model.parseHash('#charts/VALE3'), { pageId: 'charts', extra: 'VALE3' });
  assert.deepEqual(Model.parseHash('#charts?ticker=BBAS3'), { pageId: 'charts', extra: 'BBAS3' });
  assert.deepEqual(Model.parseHash('#positiondetail:pos-99'), { pageId: 'positiondetail', extra: 'pos-99' });
  assert.deepEqual(Model.parseHash('#marketscans'), { pageId: 'opportunityradar', extra: null });
  assert.deepEqual(Model.parseHash('#news'), { pageId: 'marketcentral', extra: null });
  assert.deepEqual(Model.parseHash('#risk'), { pageId: 'newtrade', extra: null });
  assert.deepEqual(Model.parseHash(''), { pageId: 'today', extra: null });
  assert.deepEqual(Model.parseHash('#'), { pageId: 'today', extra: null });
  assert.deepEqual(Model.parseHash(null), { pageId: 'today', extra: null });
});

test('BrowserHistoryNavigationModel: buildHash constrói URLs canônicas limpas', () => {
  assert.equal(Model.buildHash('today'), '#today');
  assert.equal(Model.buildHash('watchlist', null), '#watchlist');
  assert.equal(Model.buildHash('charts', 'PETR4'), '#charts:PETR4');
  assert.equal(Model.buildHash('positiondetail', 'pos-1'), '#positiondetail:pos-1');
  assert.equal(Model.buildHash('marketscans'), '#opportunityradar');
  assert.equal(Model.buildHash('risk'), '#newtrade');
});

test('BrowserHistoryNavigationModel: isSameNavigation detecta navegações duplicadas para evitar poluição no histórico', () => {
  assert.equal(Model.isSameNavigation({ pageId: 'today' }, { pageId: 'today' }), true);
  assert.equal(Model.isSameNavigation({ pageId: 'charts', extra: 'PETR4' }, { pageId: 'charts', extra: 'PETR4' }), true);
  assert.equal(Model.isSameNavigation({ pageId: 'marketscans' }, { pageId: 'opportunityradar' }), true);
  assert.equal(Model.isSameNavigation({ pageId: 'today' }, { pageId: 'watchlist' }), false);
  assert.equal(Model.isSameNavigation({ pageId: 'charts', extra: 'PETR4' }, { pageId: 'charts', extra: 'VALE3' }), false);
  assert.equal(Model.isSameNavigation({ pageId: 'charts', extra: 'PETR4' }, { pageId: 'charts', extra: null }), false);
  assert.equal(Model.isSameNavigation(null, { pageId: 'today' }), false);
});
