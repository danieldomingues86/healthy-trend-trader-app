const test = require('node:test');
const assert = require('node:assert/strict');
const MarketCycleModel = require('./market-cycle-model');

test('MarketCycleModel: getBenchmarkForAsset mapeia corretamente índices oficiais da B3 e Nasdaq', () => {
  assert.equal(MarketCycleModel.getBenchmarkForAsset('JGPX11').symbol, 'IFIX');
  assert.equal(MarketCycleModel.getBenchmarkForAsset('HGLG11').symbol, 'IFIX');
  assert.equal(MarketCycleModel.getBenchmarkForAsset('MXRF11').symbol, 'IFIX');
  assert.equal(MarketCycleModel.getBenchmarkForAsset('HGRF11').symbol, 'IFIX');

  // Ações Units terminadas em 11 pertencem ao IBOV, não ao IFIX
  assert.equal(MarketCycleModel.getBenchmarkForAsset('KLBN11').symbol, 'IBOV');
  assert.equal(MarketCycleModel.getBenchmarkForAsset('SANB11').symbol, 'IBOV');
  assert.equal(MarketCycleModel.getBenchmarkForAsset('BPAC11').symbol, 'IBOV');
  assert.equal(MarketCycleModel.getBenchmarkForAsset('TAEE11').symbol, 'IBOV');

  // BDRs
  assert.equal(MarketCycleModel.getBenchmarkForAsset('AAPL34').symbol, 'BDRX');
  assert.equal(MarketCycleModel.getBenchmarkForAsset('NVDC34').symbol, 'BDRX');

  // Ações normais
  assert.equal(MarketCycleModel.getBenchmarkForAsset('PETR4').symbol, 'IBOV');
  assert.equal(MarketCycleModel.getBenchmarkForAsset('VALE3').symbol, 'IBOV');

  // Nasdaq
  assert.equal(MarketCycleModel.getBenchmarkForAsset('AAPL', 'nasdaq').symbol, 'QQQ');
  assert.equal(MarketCycleModel.getBenchmarkForAsset('NVDA', 'nasdaq').symbol, 'QQQ');
});

test('MarketCycleModel: validação de compra - Cenário 1: Índice acima de ambas as médias e ciclo favorável -> PERMITIDO', () => {
  const result = MarketCycleModel.validateMarketPermissionForBuy({
    regime: 'healthy',
    indexPrice: 130000,
    indexEma10: 128000,
    indexEma72: 125000,
    benchmarkSymbol: 'IBOV'
  });

  assert.equal(result.isPermitted, true);
  assert.equal(result.isFavorable, true);
  assert.equal(result.aboveEma10, true);
  assert.equal(result.aboveEma72, true);
  assert.equal(result.reason, null);
  assert.equal(result.regime, 'Expansão');
});

test('MarketCycleModel: validação de compra - Cenário 2: Índice abaixo da EMA 10 -> BLOQUEADO', () => {
  const result = MarketCycleModel.validateMarketPermissionForBuy({
    regime: 'healthy',
    indexPrice: 127500,
    indexEma10: 128000,
    indexEma72: 125000,
    benchmarkSymbol: 'IBOV'
  });

  assert.equal(result.isPermitted, false);
  assert.equal(result.aboveEma10, false);
  assert.equal(result.aboveEma72, true);
  assert.equal(result.reason, 'ENTRADA BLOQUEADA — ÍNDICE ABAIXO DA EMA 10');
});

test('MarketCycleModel: validação de compra - Cenário 3: Índice abaixo da EMA 72 -> BLOQUEADO', () => {
  const result = MarketCycleModel.validateMarketPermissionForBuy({
    regime: 'healthy',
    indexPrice: 124000,
    indexEma10: 123000,
    indexEma72: 125000,
    benchmarkSymbol: 'IBOV'
  });

  assert.equal(result.isPermitted, false);
  assert.equal(result.aboveEma10, true);
  assert.equal(result.aboveEma72, false);
  assert.equal(result.reason, 'ENTRADA BLOQUEADA — ÍNDICE ABAIXO DA EMA 72');
});

test('MarketCycleModel: validação de compra - Cenário 4: Índice abaixo de ambas as médias -> BLOQUEADO', () => {
  const result = MarketCycleModel.validateMarketPermissionForBuy({
    regime: 'healthy',
    indexPrice: 120000,
    indexEma10: 123000,
    indexEma72: 125000,
    benchmarkSymbol: 'IBOV'
  });

  assert.equal(result.isPermitted, false);
  assert.equal(result.aboveEma10, false);
  assert.equal(result.aboveEma72, false);
  assert.equal(result.reason, 'ENTRADA BLOQUEADA — ÍNDICE ABAIXO DAS EMAS 10 E 72');
});

test('MarketCycleModel: validação de compra - Cenário 5: Ciclo de Mercado Defensivo mesmo com preço acima das médias -> BLOQUEADO', () => {
  const result = MarketCycleModel.validateMarketPermissionForBuy({
    regime: 'defensive',
    indexPrice: 130000,
    indexEma10: 128000,
    indexEma72: 125000,
    benchmarkSymbol: 'IBOV'
  });

  assert.equal(result.isPermitted, false);
  assert.equal(result.isFavorable, false);
  assert.equal(result.reason, 'ENTRADA BLOQUEADA — CICLO DE MERCADO DEFENSIVO');
});

test('MarketCycleModel: validação de compra - Cenário 6: Dados ausentes, nulos ou indefinidos -> BLOQUEADO POR PADRÃO', () => {
  const empty = MarketCycleModel.validateMarketPermissionForBuy({});
  assert.equal(empty.isPermitted, false);
  assert.equal(empty.reason, 'ENTRADA BLOQUEADA — DADOS DO ÍNDICE DE REFERÊNCIA AUSENTES OU INSUFICIENTES');

  const missingPrice = MarketCycleModel.validateMarketPermissionForBuy({ regime: 'healthy', indexEma10: 100, indexEma72: 90 });
  assert.equal(missingPrice.isPermitted, false);
  assert.equal(missingPrice.reason, 'ENTRADA BLOQUEADA — DADOS DO ÍNDICE DE REFERÊNCIA AUSENTES OU INSUFICIENTES');

  const nanValues = MarketCycleModel.validateMarketPermissionForBuy({ regime: 'healthy', indexPrice: NaN, indexEma10: 100, indexEma72: 90 });
  assert.equal(nanValues.isPermitted, false);
  assert.equal(nanValues.reason, 'ENTRADA BLOQUEADA — DADOS DO ÍNDICE DE REFERÊNCIA AUSENTES OU INSUFICIENTES');
});

test('MarketCycleModel: caso real JGPX11 em 10/03/2026 com IFIX defensivo -> BLOQUEADO', () => {
  // Dados exatos do IFIX em 10/03/2026:
  // price: 3876.45, ema10: 3882.62 (abaixo da EMA 10), state: 'defensive'
  const jgpxValidation = MarketCycleModel.validateMarketPermissionForBuy({
    regime: 'defensive',
    indexPrice: 3876.45,
    indexEma10: 3882.62,
    indexEma72: 3788.87,
    benchmarkSymbol: 'IFIX'
  });

  assert.equal(jgpxValidation.isPermitted, false, 'JGPX11 não pode ter compra autorizada com IFIX em modo defensivo');
  assert.equal(jgpxValidation.aboveEma10, false, 'IFIX estava abaixo da EMA 10');
  assert.equal(jgpxValidation.reason, 'ENTRADA BLOQUEADA — CICLO DE MERCADO DEFENSIVO');
});

test('MarketCycleModel: scoreMarketCycleFromCandles calcula métricas canônicas de candles diários fechados', () => {
  // Gera série sintética crescente de 40 candles
  const candles = [];
  for (let i = 0; i < 40; i++) {
    candles.push({
      date: `2026-01-${String(i + 1).padStart(2, '0')}`,
      close: 100 + i * 2,
      high: 101 + i * 2,
      low: 99 + i * 2
    });
  }

  const reading = MarketCycleModel.scoreMarketCycleFromCandles(candles);
  assert.ok(reading);
  assert.equal(reading.state, 'healthy');
  assert.equal(reading.isFavorable, true);
  assert.ok(reading.price > reading.ema10);
  assert.ok(reading.price > reading.ema72);

  const permission = MarketCycleModel.validateMarketPermissionForBuy({
    indexCandles: candles,
    benchmarkSymbol: 'IBOV'
  });
  assert.equal(permission.isPermitted, true);
});
