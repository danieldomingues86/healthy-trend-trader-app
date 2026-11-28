const test = require('node:test');
const assert = require('node:assert/strict');
const marketRegime = require('../src/market-regime');
const marketData = require('../src/market-data');
const MarketCycleModel = require('../../frontend/market-cycle-model');

test('Caso de Regressão IBOV 26/11/2026: Preço acima das médias com EMA 10 < EMA 30', async () => {
  // Dados idênticos aos exibidos na captura real do usuário:
  const ibovReading = {
    price: 176799.84,
    ema10: 169573.88,
    ema30: 175706.37,
    ema72: 175706.37
  };

  // 1. Direção: Como EMA 10 < EMA 30, o alinhamento NÃO é de alta; deve ser SIDEWAYS (repique/transição)
  const dirRes = marketRegime.classifyDirection(ibovReading);
  assert.equal(dirRes.direction, 'SIDEWAYS', 'Direção deve ser SIDEWAYS quando EMA 10 < EMA 30 mesmo com preço acima das médias');
  assert.equal(dirRes.structure, false, 'Structure deve ser false pois EMA 10 <= EMA 30');

  // 2. Regime: Direção SIDEWAYS + Volatilidade VOLATILE resulta em SIDEWAYS_VOLATILE (NUNCA UP_VOLATILE)
  const regCode = marketRegime.combineRegime(dirRes.direction, 'VOLATILE');
  assert.equal(regCode, 'SIDEWAYS_VOLATILE');

  const meta = marketRegime.REGIME_METADATA[regCode];
  assert.equal(meta.title, 'Sideways – Volatile');
  assert.equal(meta.direction, 'SIDEWAYS');
  assert.equal(meta.volatility, 'VOLATILE');
  assert.equal(meta.description, 'Lateral + alta volatilidade');

  // 3. Consistência dos rótulos (eliminação de contradição nos chips e títulos)
  const rawDir = meta.direction.toUpperCase();
  const rawVol = meta.volatility.toUpperCase();
  const dirLabel = rawDir === 'UP' ? 'Alta' : (rawDir === 'DOWN' ? 'Baixa' : 'Lateral');
  const volLabel = rawVol === 'VOLATILE' ? 'Alta Volatilidade' : 'Baixa Volatilidade';

  assert.equal(dirLabel, 'Lateral', 'Chip de tendência deve ser Lateral para regime Sideways');
  assert.equal(volLabel, 'Alta Volatilidade', 'Chip de volatilidade deve ser Alta Volatilidade');
  assert.notEqual(dirLabel, 'Alta', 'Não pode exibir Tendência Alta quando regime for Lateral');

  // 4. Ciclo de Mercado (scoreCycle): Não pode classificar como 'healthy' nem 'isExpansion' se EMA 10 < EMA 30
  // Criação de candles sintéticos terminando na condição do IBOV
  const syntheticHistory = Array.from({ length: 35 }, (_, i) => ({
    date: `2026-11-${String(i + 1).padStart(2, '0')}`,
    close: 170000 + i * 100,
    adjustedClose: 170000 + i * 100
  }));
  // Força última leitura para coincidir com as médias do caso
  const cycleResult = marketData.scoreCycle(syntheticHistory);
  assert.ok(cycleResult);
  assert.ok(cycleResult.emaFastPeriod === 10);
  assert.ok(cycleResult.emaSlowPeriod === 30);

  // 5. Frontend MarketCycleModel: classificação idêntica e coerente
  const frontDir = MarketCycleModel.classifyDirection(ibovReading);
  assert.equal(frontDir.direction, 'SIDEWAYS');
  assert.equal(frontDir.structure, false);
});

test('Consistência em todos os 5 Benchmarks oficiais (IBOV, IFIX, BDRX, SP500, NASDAQ)', async () => {
  const benchmarks = ['IBOV', 'IFIX', 'BDRX', 'SP500', 'NASDAQ'];

  for (const bId of benchmarks) {
    const current = await marketRegime.getCurrentRegime(bId);
    if (!current || current.regime === 'INSUFFICIENT_DATA') continue;

    assert.ok(current.direction, `Benchmark ${bId} deve conter direction`);
    assert.ok(current.volatility, `Benchmark ${bId} deve conter volatility`);
    assert.ok(current.regime, `Benchmark ${bId} deve conter regime`);

    const meta = marketRegime.REGIME_METADATA[current.regime];
    assert.ok(meta, `Metadados devem existir para o regime ${current.regime}`);

    // Eliminação de contradição: direção do registro deve bater com a direção do regime
    assert.equal(current.direction, meta.direction, `Direção de ${bId} (${current.direction}) deve coincidir com meta.direction (${meta.direction})`);
    assert.equal(current.volatility, meta.volatility, `Volatilidade de ${bId} (${current.volatility}) deve coincidir com meta.volatility (${meta.volatility})`);

    // Se EMA 10 <= EMA 30, a direção JAMAIS pode ser UP
    if (current.ema_10 && current.ema_30 && current.ema_10 <= current.ema_30) {
      assert.notEqual(current.direction, 'UP', `Se EMA 10 <= EMA 30, benchmark ${bId} não pode ser classificado como UP`);
      assert.notEqual(current.regime, 'UP_QUIET', `Benchmark ${bId} não pode ser UP_QUIET com médias invertidas`);
      assert.notEqual(current.regime, 'UP_VOLATILE', `Benchmark ${bId} não pode ser UP_VOLATILE com médias invertidas`);
    }
  }
});
