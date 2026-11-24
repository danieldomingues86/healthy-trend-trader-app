'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

const calculator = require('../src/capital-intelligence-calculator');
const ingestion = require('../src/capital-intelligence-ingestion');
const { CapitalIntelligenceStore } = require('../src/capital-intelligence-store');
const { CapitalIntelligencePipeline } = require('../src/capital-intelligence-pipeline');
const marketRegime = require('../src/market-regime');
const CapitalIntelligenceModel = require('../../frontend/capital-intelligence-model');

function buildUsSeries(indicatorId, symbol, entries, provider = 'twelve_data_market_regime') {
  return entries.map(([date, close, regime, extras = {}]) => {
    const meta = regime ? marketRegime.REGIME_METADATA[regime] : null;
    return {
      indicatorId,
      symbol,
      market: 'US',
      currency: 'USD',
      unit: 'USD',
      metricNature: 'price_performance',
      referenceDate: date,
      closeValue: close,
      sourceProvider: provider,
      sourceTimestamp: `${date}T21:00:00.000Z`,
      collectedAt: '2026-11-24T22:10:00.000Z',
      qualityStatus: extras.qualityStatus || 'valid',
      metadata: {
        regime: regime || null,
        direction: meta?.direction || null,
        volatility: meta?.volatility || null,
        ema10: extras.ema10 ?? close * 0.99,
        ema72: extras.ema72 ?? close * 0.96,
        atr21: extras.atr21 ?? 6.2,
        atrPct: extras.atrPct ?? 1.04,
        atrPctSma252: extras.atrPctSma252 ?? 1.12,
        volatilityDeviation: extras.volatilityDeviation ?? -7.1,
        isIncomplete: Boolean(extras.isIncomplete)
      }
    };
  });
}

test('Esfera Ciclo EUA (05): opera de forma 100% independente do Brasil, avalia SPY × QQQ, Equal-Weight RSP e separa Market Breadth', () => {
  const now = new Date('2026-11-24T22:30:00.000Z'); // Terça 17:30 NY (pós-fechamento EUA e BR)

  const usDates = [];
  let cursor = '2026-10-16';
  while (usDates.length < 24) {
    if (ingestion.isBusinessDay(cursor, 'US')) usDates.push(cursor);
    cursor = ingestion.addCalendarDays(cursor, 1);
  }
  usDates[usDates.length - 1] = '2026-11-24';

  // SPY: 14p SIDEWAYS_QUIET -> 10p UP_QUIET (sobe ~4.2% em 21p)
  const spyEntries = usDates.map((d, i) => [d, 570 + i * 1.15, i < 14 ? 'SIDEWAYS_QUIET' : 'UP_QUIET']);
  // QQQ em SIDEWAYS_VOLATILE no fim (divergindo de SPY para testar detecção de divergência!)
  const qqqEntries = usDates.map((d, i) => [d, 495 + i * 0.4, i < 20 ? 'UP_QUIET' : 'SIDEWAYS_VOLATILE']);
  // RSP (Equal-Weight) sobe apenas ~1.5% em 21p -> concentração em megacaps
  const rspEntries = usDates.map((d, i) => [d, 178 + i * 0.12, null]);

  // Brasil em DOWN_VOLATILE (provando independência total EUA × Brasil!)
  const brEntries = [{
    indicatorId: 'cycle_br_ibov',
    symbol: 'IBOV',
    market: 'BR',
    currency: 'PTS',
    unit: 'pts',
    referenceDate: '2026-11-24',
    closeValue: 164000,
    sourceProvider: 'b3_market_regime',
    collectedAt: now.toISOString(),
    metadata: { regime: 'DOWN_VOLATILE', direction: 'DOWN', volatility: 'VOLATILE' }
  }];

  const snapshot = calculator.buildDailySnapshot({
    cycle_br_ibov: brEntries,
    cycle_us_sp500: buildUsSeries('cycle_us_sp500', 'SPY', spyEntries),
    cycle_us_nasdaq: buildUsSeries('cycle_us_nasdaq', 'QQQ', qqqEntries),
    cycle_us_rsp: buildUsSeries('cycle_us_rsp', 'RSP', rspEntries, 'twelve_data')
  }, { now });

  const br = snapshot.spheres.cycle_br;
  const us = snapshot.spheres.cycle_us;

  // 1. Independência Brasil × EUA
  assert.equal(br.regimeCode, 'DOWN_VOLATILE');
  assert.equal(us.regimeCode, 'UP_QUIET');
  assert.equal(us.regimeLabel, 'Up – Quiet');
  assert.equal(us.relatedContext.brazilComparison.independentFromBrazil, true);
  assert.equal(us.relatedContext.brazilComparison.state, 'divergent');

  // 2. Divergência SPY × QQQ e Equal-Weight RSP complementar
  assert.equal(us.spyVsQqqAlignment.state, 'divergent');
  assert.deepEqual(us.benchmarkSummary.map(b => b.symbol), ['SPY', 'QQQ', 'RSP']);
  assert.equal(us.equalWeightContext.status, 'atualizado');
  assert.ok(us.equalWeightContext.concentrationSpread21dPct > 1.0, 'Spread SPY - RSP deve detectar concentração em megacaps');

  // 3. Evolução de 21 pregões, períodos, metodologia e separação de Breadth
  assert.equal(us.recentTimeline21d.length, 21);
  assert.equal(us.currentPeriod.regime, 'UP_QUIET');
  assert.equal(us.currentPeriod.durationTradingDays, 10);
  assert.equal(us.supportingIndicators.breadthExcludedFromCycleClassification, true);
  assert.equal(us.relatedContext.breadthUs.excludedFromIndexCycle, true);
  assert.equal(snapshot.spheres.breadth_us.status, 'indisponivel', 'Breadth permanece independente mesmo com Ciclo EUA ativo');
  assert.ok(us.methodology.separationGuarantee.includes('Market Breadth EUA'));

  // 4. Hidratação do frontend preserva usCycleDetail completo e legenda estrutural (não 1D)
  const uiModel = new CapitalIntelligenceModel();
  uiModel.hydrateFromPipelineSnapshot(snapshot);
  const usNode = uiModel.getNodeById('cycle_us');
  assert.equal(usNode.displayValue, 'Up – Quiet');
  assert.ok(usNode.metricCaption.includes('10p no regime'));
  assert.ok(usNode.metricCaption.includes('21p:'));
  assert.equal(usNode.usCycleDetail.recentTimeline21d.length, 21);
  assert.equal(usNode.usCycleDetail.spyVsQqqAlignment.state, 'divergent');
});

test('Esfera Ciclo EUA (05): descarta candles futuros ou pré-fechamento no fuso America/New_York e funciona sem RSP', () => {
  // Terça 2026-11-24 às 13:00 NY (18:00 UTC) — pregão americano aberto (esperado = 2026-11-23)
  const nyMidSession = new Date('2026-11-24T18:00:00.000Z');

  const spySeries = buildUsSeries('cycle_us_sp500', 'SPY', [
    ['2026-11-23', 582.40, 'DOWN_VOLATILE'],
    ['2026-11-24', 599.90, 'UP_QUIET'], // Ainda não fechou em NY -> deve ser rejeitado
    ['2026-11-26', 610.00, 'UP_QUIET']  // Futuro -> deve ser rejeitado
  ]);

  const snapshot = calculator.buildDailySnapshot({ cycle_us_sp500: spySeries }, { now: nyMidSession });
  const us = snapshot.spheres.cycle_us;

  assert.equal(us.regimeCode, 'DOWN_VOLATILE');
  assert.equal(us.asOfDate, '2026-11-23');
  assert.equal(us.provenance.filteredFutureOrIncompleteCount, 2);
  assert.equal(us.equalWeightContext.status, 'indisponivel', 'Sem RSP coletado, marca complementar como indisponivel sem quebrar Ciclo EUA');
  assert.equal(us.equalWeightContext.concentrationSpread21dPct, null);
});

test('Esfera Ciclo EUA (05): integração real com caches em disco (SPY e QQQ) sem chamadas externas', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-us-real-'));
  const store = new CapitalIntelligenceStore({ storePath: path.join(tmpDir, 'store.json'), useDatabase: false });
  const pipeline = new CapitalIntelligencePipeline({ store });

  const now = new Date('2026-11-22T17:00:00.000Z');
  const snapshot = await pipeline.bootstrapFromLocalCaches(now);
  assert.ok(snapshot);

  const us = snapshot.spheres.cycle_us;
  assert.equal(us.hasOfficialRegime, true, 'SPY real em disco deve fornecer classificação oficial');
  assert.ok(Object.values(marketRegime.REGIMES).includes(us.regimeCode));
  assert.equal(us.recentTimeline21d.length, 21, 'Deve conter exatamente os 21 pregões recentes de evolução EUA');
  assert.ok(us.benchmarkSummary.some(b => b.symbol === 'SPY' && b.regimeCode));
  assert.ok(us.benchmarkSummary.some(b => b.symbol === 'QQQ' && b.regimeCode));
  assert.equal(us.relatedContext.breadthUs.excludedFromIndexCycle, true);
});
