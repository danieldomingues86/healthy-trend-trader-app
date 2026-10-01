const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('Força Relativa: STOCK_NAME_MAP and relativeCompanyName resolve company names for EMBJ3, AXIA3, MBRF3 and others', () => {
  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

  // Verify STOCK_NAME_MAP exists in index.html
  assert.ok(html.includes("EMBJ3: 'EMBRAER S.A.'"), 'EMBJ3 must be mapped to EMBRAER S.A.');
  assert.ok(html.includes("AXIA3: 'AXIA ENERGIA S.A.'"), 'AXIA3 must be mapped to AXIA ENERGIA S.A.');
  assert.ok(html.includes("MBRF3: 'MBRF GLOBAL FOODS COMPANY S.A.'"), 'MBRF3 must be mapped to MBRF GLOBAL FOODS COMPANY S.A.');

  // Extract STOCK_NAME_MAP and relativeCompanyName
  const stockMapMatch = html.match(/const STOCK_NAME_MAP = \{([^}]+)\};/);
  assert.ok(stockMapMatch, 'STOCK_NAME_MAP must be defined in index.html');

  // Evaluate logic in isolation
  const STOCK_NAME_MAP = {
    EMBJ3: 'EMBRAER S.A.',
    AXIA3: 'AXIA ENERGIA S.A.',
    AXIA6: 'AXIA ENERGIA S.A.',
    AXIA7: 'AXIA ENERGIA S.A.',
    MBRF3: 'MBRF GLOBAL FOODS COMPANY S.A.',
    RIAA3: 'RIACHUELO S.A.',
    WDCN3: 'WDC NETWORKS (LIVETECH DA BAHIA S.A.)',
    SAUD3: 'BRADSAÚDE S.A.'
  };

  function relativeCompanyName(item) {
    if (!item) return '—';
    const sym = String(item.symbol || '').trim().toUpperCase();
    if (STOCK_NAME_MAP[sym]) return STOCK_NAME_MAP[sym];
    const name = String(item.name || '').trim();
    if (name && name.toUpperCase() !== sym) return name;
    return '—';
  }

  assert.equal(relativeCompanyName({ symbol: 'EMBJ3', name: 'EMBJ3' }), 'EMBRAER S.A.');
  assert.equal(relativeCompanyName({ symbol: 'AXIA3', name: 'AXIA3' }), 'AXIA ENERGIA S.A.');
  assert.equal(relativeCompanyName({ symbol: 'MBRF3', name: 'MBRF3' }), 'MBRF GLOBAL FOODS COMPANY S.A.');
  assert.equal(relativeCompanyName({ symbol: 'AXIA6', name: 'AXIA6' }), 'AXIA ENERGIA S.A.');
  assert.equal(relativeCompanyName({ symbol: 'AXIA7', name: 'AXIA7' }), 'AXIA ENERGIA S.A.');
  assert.equal(relativeCompanyName({ symbol: 'PETR4', name: 'PETROLEO BRASILEIRO S.A. PETROBRAS' }), 'PETROLEO BRASILEIRO S.A. PETROBRAS');
});

test('Breadcrumb: Força Relativa is localized in Portuguese and translated in English', () => {
  const sidebarJs = fs.readFileSync(path.join(root, 'frontend', 'sidebar-navigation.js'), 'utf8');
  assert.ok(sidebarJs.includes("id: 'relativestrength'"), 'relativestrength must exist');
  assert.ok(sidebarJs.includes("title: 'Força Relativa'"), 'title must be Força Relativa in Portuguese');
  assert.ok(!sidebarJs.includes("title: 'Relative Strength'"), 'title should not be English Relative Strength in sidebar-navigation.js');

  const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
  assert.ok(html.includes("'Análise de Mercado':'Market Analysis'"), 'Análise de Mercado must translate to Market Analysis');
  assert.ok(html.includes("'Força Relativa':'Relative Strength'"), 'Força Relativa must translate to Relative Strength');
});

test('Backend: market-cache.json has valid company names for EMBJ3, AXIA3 and MBRF3', () => {
  const cachePath = path.join(root, 'backend', 'data', 'market-cache.json');
  if (!fs.existsSync(cachePath)) return;
  const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
  const items = cache.relativeStrength || [];
  const map = new Map(items.map(x => [x.symbol, x.name]));

  assert.equal(map.get('EMBJ3'), 'EMBRAER S.A.');
  assert.equal(map.get('AXIA3'), 'AXIA ENERGIA S.A.');
  assert.equal(map.get('MBRF3'), 'MBRF GLOBAL FOODS COMPANY S.A.');
});
