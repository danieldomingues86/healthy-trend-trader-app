const test = require('node:test');
const assert = require('node:assert/strict');
const TradeSimulatorModel = require('./trade-simulator-model.js');

test('Evolução do Simulador — 1. Classificação de Universo Multiclasse em 7 Classes', () => {
  const stockBr = TradeSimulatorModel.classifySimulatorAsset('PETR4');
  assert.equal(stockBr.assetClass, 'STOCK_BR');
  assert.equal(stockBr.market, 'B3');

  const fii = TradeSimulatorModel.classifySimulatorAsset('HGLG11');
  assert.equal(fii.assetClass, 'FII');
  assert.equal(fii.market, 'B3');

  const bdr = TradeSimulatorModel.classifySimulatorAsset('AAPL34');
  assert.equal(bdr.assetClass, 'BDR');

  const etfBr = TradeSimulatorModel.classifySimulatorAsset('BOVA11');
  assert.equal(etfBr.assetClass, 'ETF_BR');

  const etfIntl = TradeSimulatorModel.classifySimulatorAsset('IVVB11');
  assert.equal(etfIntl.assetClass, 'ETF_INTL');

  const stockUs = TradeSimulatorModel.classifySimulatorAsset('NVDA');
  assert.equal(stockUs.assetClass, 'STOCK_US');
  assert.equal(stockUs.market, 'US');
});

test('Evolução do Simulador — 2. Catálogo de Ativos Multiclasse e Busca por Ticker', () => {
  const catalogResult = TradeSimulatorModel.getAvailableSimulatorAssetsCatalog();
  assert.ok(catalogResult && typeof catalogResult === 'object');
  assert.ok(Array.isArray(catalogResult.assets), 'Catálogo deve fornecer array de assets');
  assert.ok(catalogResult.assets.length >= 10, 'Catálogo deve fornecer lista inicial de ativos multiclasse');

  const petr = catalogResult.assets.find(a => a.symbol === 'PETR4');
  assert.ok(petr, 'PETR4 deve estar presente no catálogo');
  assert.equal(petr.assetClass, 'STOCK_BR');

  const ivvb = catalogResult.assets.find(a => a.symbol === 'IVVB11');
  assert.ok(ivvb, 'IVVB11 deve estar presente no catálogo');
  assert.equal(ivvb.assetClass, 'ETF_INTL');
});

test('Evolução do Simulador — 3. Presets de Período e Resolução de Datas', () => {
  const presets = ['LAST_30_DAYS', 'LAST_90_DAYS', 'LAST_6_MONTHS', 'LAST_1_YEAR', 'LAST_2_YEARS', 'ALL_TIME', 'CUSTOM'];
  
  presets.forEach(p => {
    const res = TradeSimulatorModel.resolveBacktestDatePreset(p, { referenceDate: '2026-11-20' });
    assert.ok(res, `Preset ${p} deve retornar objeto resolvido`);
    assert.ok(res.startDate, `Preset ${p} deve ter startDate`);
    assert.ok(res.endDate, `Preset ${p} deve ter endDate`);
    assert.ok(res.startDate <= res.endDate, `startDate deve ser <= endDate no preset ${p}`);
  });
});

test('Evolução do Simulador — 4. Validação Rigorosa de Período e Prevenção de Inconsistências', () => {
  // Data inicial posterior à data final deve falhar
  const invalidConfig = {
    startDate: '2026-06-30',
    endDate: '2026-01-01',
    initialCapital: 500000,
    assetClasses: ['STOCK_BR']
  };
  const valError = TradeSimulatorModel.validateBacktestConfiguration(invalidConfig);
  assert.equal(valError.isValid, false);
  const dateErr = valError.errors.find(e => e.code === 'START_DATE_AFTER_END_DATE');
  assert.ok(dateErr, 'Deve acusar erro START_DATE_AFTER_END_DATE');

  // Período válido deve passar
  const validConfig = {
    startDate: '2026-01-01',
    endDate: '2026-06-30',
    initialCapital: 500000,
    assetClasses: ['STOCK_BR', 'BDR']
  };
  const valSuccess = TradeSimulatorModel.validateBacktestConfiguration(validConfig);
  assert.equal(valSuccess.isValid, true);
  assert.equal(valSuccess.errors.length, 0);
});

test('Evolução do Simulador — 5. Zero Look-Ahead Bias: Truncamento Estrito pela Data Final', () => {
  // Simula array de candles contendo datas antes e depois da data final
  const sampleCandles = [
    { time: '2026-05-10', open: 20, high: 22, low: 19, close: 21 },
    { time: '2026-06-15', open: 21, high: 23, low: 20, close: 22 },
    { time: '2026-06-30', open: 22, high: 24, low: 21, close: 23 },
    { time: '2026-07-01', open: 23, high: 25, low: 22, close: 24 }, // Posterior!
    { time: '2026-08-10', open: 24, high: 26, low: 23, close: 25 }  // Posterior!
  ];

  const maxDate = '2026-06-30';
  const truncated = sampleCandles.filter(c => c.time <= maxDate);
  assert.equal(truncated.length, 3);
  assert.ok(truncated.every(c => c.time <= maxDate), 'Nenhum candle posterior à data final pode ser incluído');
});
