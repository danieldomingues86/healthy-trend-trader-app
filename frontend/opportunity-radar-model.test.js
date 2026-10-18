const test = require('node:test');
const assert = require('node:assert/strict');
const OpportunityRadarModel = require('./opportunity-radar-model');

function generateUptrendWithInsideBar() {
  const candles = [];
  let price = 30.0;
  for (let i = 0; i < 35; i++) {
    price += 0.35;
    candles.push({
      time: `2026-09-${String((i % 28) + 1).padStart(2, '0')}`,
      open: Number((price - 0.2).toFixed(2)),
      high: Number((price + 0.4).toFixed(2)),
      low: Number((price - 0.3).toFixed(2)),
      close: Number((price + 0.1).toFixed(2)),
      volume: 1000000
    });
  }
  // Mother bar
  candles.push({
    time: '2026-10-15',
    open: 41.0,
    high: 43.0,
    low: 40.5,
    close: 42.5,
    volume: 1500000
  });
  // Inside Bar above EMA 9 and EMA 30
  candles.push({
    time: '2026-10-16',
    open: 41.8,
    high: 42.6,
    low: 41.2,
    close: 42.2,
    volume: 1200000
  });
  return candles;
}

test('OpportunityRadarModel.resolveMarketCategory classifica corretamente em IBOV, IFIX ou BDRs', () => {
  assert.equal(
    OpportunityRadarModel.resolveMarketCategory({ symbol: 'PETR4', sector: 'Energy Minerals', assetClass: 'stock_ibov' }),
    'IBOV'
  );
  assert.equal(
    OpportunityRadarModel.resolveMarketCategory({ symbol: 'HGLG11', sector: 'Logística', assetClass: 'fii' }),
    'IFIX'
  );
  assert.equal(
    OpportunityRadarModel.resolveMarketCategory({ symbol: 'AAPL34', sector: 'Tecnologia', assetClass: 'bdr' }),
    'BDRs'
  );
  assert.equal(
    OpportunityRadarModel.resolveMarketCategory({ symbol: 'NVDC34', sector: 'Tecnologia' }),
    'BDRs'
  );
});

test('OpportunityRadarModel.evaluateAssetReadiness aprova apenas ativo que cumpre todos os critérios e tem gatilho confirmado', () => {
  const candles = generateUptrendWithInsideBar();
  const asset = {
    symbol: 'PETR4',
    name: 'PETROLEO BRASILEIRO S.A. PETROBRAS',
    sector: 'Energy Minerals',
    score: 92,
    m3: 24.5,
    assetClass: 'stock_ibov'
  };

  const result = OpportunityRadarModel.evaluateAssetReadiness(asset, candles, 'healthy');
  assert.ok(result, 'Ativo que cumpre todos os critérios deve ser retornado como pronto');
  assert.equal(result.symbol, 'PETR4');
  assert.equal(result.name, 'Petrobras');
  assert.equal(result.market, 'IBOV');
  assert.equal(result.rsScore, 92);
  assert.equal(result.rsLabel, 'Líder');
  assert.equal(result.marketCycle, 'Ciclo Positivo');
  assert.equal(result.trend, 'Alinhada');
  assert.equal(result.triggerName, 'Inside Bar');
  assert.equal(result.entry, 42.61);
  assert.equal(result.stop, 41.19);
  assert.ok(result.rr >= 2.0);
  assert.equal(result.status, 'Pronto para entrada');
});

test('OpportunityRadarModel.evaluateAssetReadiness rejeita ativo sem gatilho, com RS baixo ou em ciclo defensivo', () => {
  const candles = generateUptrendWithInsideBar();
  const asset = {
    symbol: 'VALE3',
    name: 'VALE S.A.',
    sector: 'Non-Energy Minerals',
    score: 85,
    assetClass: 'stock_ibov'
  };

  // Rejeita ciclo defensivo
  assert.equal(OpportunityRadarModel.evaluateAssetReadiness(asset, candles, 'defensive'), null);

  // Rejeita RS abaixo de 70
  assert.equal(OpportunityRadarModel.evaluateAssetReadiness({ ...asset, score: 62 }, candles, 'healthy'), null);

  // Rejeita quando não há candles suficientes
  assert.equal(OpportunityRadarModel.evaluateAssetReadiness(asset, candles.slice(0, 10), 'healthy'), null);
});

test('OpportunityRadarModel.filterOpportunities filtra por Mercado (IBOV, IFIX, BDRs), Setor, Gatilho e Busca', () => {
  const items = [
    {
      symbol: 'PETR4',
      name: 'Petrobras',
      fullName: 'PETROBRAS',
      market: 'IBOV',
      sector: 'Petróleo, Gás e Energia',
      triggerId: 'INSIDE_BAR',
      triggerName: 'Inside Bar',
      status: 'Pronto para entrada'
    },
    {
      symbol: 'HGLG11',
      name: 'Cshg Logística',
      fullName: 'CSHG LOGISTICA FII',
      market: 'IFIX',
      sector: 'Logística',
      triggerId: 'PFR_COMPRA',
      triggerName: 'PFR de Compra',
      status: 'Pronto para entrada'
    },
    {
      symbol: 'AAPL34',
      name: 'Apple',
      fullName: 'APPLE INC BDR',
      market: 'BDRs',
      sector: 'Tecnologia',
      triggerId: '123_COMPRA',
      triggerName: '123 Buy',
      status: 'Pronto para entrada'
    }
  ];

  assert.equal(OpportunityRadarModel.filterOpportunities(items, { market: 'ALL' }).length, 3);
  assert.equal(OpportunityRadarModel.filterOpportunities(items, { market: 'IBOV' }).length, 1);
  assert.equal(OpportunityRadarModel.filterOpportunities(items, { market: 'IFIX' })[0].symbol, 'HGLG11');
  assert.equal(OpportunityRadarModel.filterOpportunities(items, { market: 'BDRs' })[0].symbol, 'AAPL34');
  assert.equal(OpportunityRadarModel.filterOpportunities(items, { sector: 'Tecnologia' })[0].symbol, 'AAPL34');
  assert.equal(OpportunityRadarModel.filterOpportunities(items, { trigger: '123 Buy' })[0].symbol, 'AAPL34');
  assert.equal(OpportunityRadarModel.filterOpportunities(items, { search: 'petr' })[0].symbol, 'PETR4');
});
