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

function buildIbovRegimeSeries(entries) {
  return entries.map(([date, close, regime, extras = {}]) => {
    const meta = marketRegime.REGIME_METADATA[regime];
    return {
      indicatorId: 'cycle_br_ibov',
      symbol: 'IBOV',
      market: 'BR',
      currency: 'PTS',
      unit: 'pts',
      metricNature: 'price_performance',
      referenceDate: date,
      closeValue: close,
      sourceProvider: 'b3_market_regime',
      sourceTimestamp: `${date}T21:00:00.000Z`,
      collectedAt: '2026-11-24T22:05:00.000Z',
      qualityStatus: extras.qualityStatus || 'valid',
      metadata: {
        regime,
        direction: meta?.direction || extras.direction || null,
        volatility: meta?.volatility || extras.volatility || null,
        ema10: extras.ema10 ?? close * 1.01,
        ema72: extras.ema72 ?? close * 1.04,
        atr21: extras.atr21 ?? 2350,
        atrPct: extras.atrPct ?? 1.43,
        atrPctSma252: extras.atrPctSma252 ?? 0.91,
        volatilityDeviation: extras.volatilityDeviation ?? 57.1,
        isIncomplete: Boolean(extras.isIncomplete)
      }
    };
  });
}

test('Esfera Ciclo Brasil (04): reutiliza taxonomia oficial do market-regime.js, evolução de 21 pregões, períodos e fatores relacionados', () => {
  const now = new Date('2026-11-24T22:30:00.000Z'); // Terça pós-fechamento B3 (19:30 BRT)

  // Gera 25 pregões com transição clara: 15 pregões SIDEWAYS_QUIET -> 6 pregões DOWN_QUIET -> 4 pregões DOWN_VOLATILE
  const dates = [];
  let cursor = '2026-10-16';
  while (dates.length < 25) {
    if (ingestion.isBusinessDay(cursor, 'BR')) dates.push(cursor);
    cursor = ingestion.addCalendarDays(cursor, 1);
  }
  // Garante última data == 2026-11-24
  dates[dates.length - 1] = '2026-11-24';

  const ibovEntries = dates.map((d, i) => {
    const regime = i < 15 ? 'SIDEWAYS_QUIET' : i < 21 ? 'DOWN_QUIET' : 'DOWN_VOLATILE';
    // Último pregão sobe +2,5% no dia (close sobe de 162000 para 166050), mas regime oficial segue DOWN_VOLATILE!
    const close = i === 24 ? 166050 : (175000 - i * 540);
    return [d, close, regime, { ema10: 170150, ema72: 180960, atr21: 2379.32, atrPct: 1.43, atrPctSma252: 0.91, volatilityDeviation: 57.1 }];
  });

  const seriesById = {
    cycle_br_ibov: buildIbovRegimeSeries(ibovEntries),
    cycle_br_ifix: [
      { indicatorId: 'cycle_br_ifix', symbol: 'IFIX', market: 'BR', currency: 'PTS', unit: 'pts', referenceDate: '2026-11-24', closeValue: 3310, sourceProvider: 'b3_market_regime', metadata: { regime: 'SIDEWAYS_QUIET' } }
    ],
    cycle_br_bdrx: [
      { indicatorId: 'cycle_br_bdrx', symbol: 'BDRX', market: 'BR', currency: 'PTS', unit: 'pts', referenceDate: '2026-11-24', closeValue: 29100, sourceProvider: 'b3_market_regime', metadata: { regime: 'UP_VOLATILE' } }
    ],
    fx_usd_brl: [
      { indicatorId: 'fx_usd_brl', symbol: 'USDBRL', market: 'BR', currency: 'BRL', unit: 'BRL/USD', referenceDate: '2026-11-24', closeValue: 5.84, sourceProvider: 'bcb_sgs' }
    ],
    rate_selic_meta: [
      { indicatorId: 'rate_selic_meta', symbol: 'SELIC', market: 'BR', currency: 'PCT', unit: '% a.a.', metricNature: 'macro_rate', referenceDate: '2026-11-24', closeValue: 11.25, sourceProvider: 'bcb_sgs' }
    ]
  };

  const brBreadth = {
    dataAvailable: true,
    universe: 'stock_b3',
    totalEligible: 216,
    aboveEma20Pct: 34,
    aboveEma50Pct: 29,
    aboveEma200Pct: 41,
    positiveTrendPct: 26,
    asOfDate: '2026-11-24',
    status: 'atualizado'
  };

  const snapshot = calculator.buildDailySnapshot(seriesById, { now, brBreadth });
  const br = snapshot.spheres.cycle_br;

  // 1. Regime oficial exato (taxonomia do market-regime.js — nunca determinado pela alta diária de +2,5%)
  assert.equal(br.hasOfficialRegime, true);
  assert.equal(br.regimeCode, 'DOWN_VOLATILE');
  assert.equal(br.regimeLabel, marketRegime.REGIME_METADATA.DOWN_VOLATILE.label);
  assert.equal(br.direction, 'DOWN');
  assert.equal(br.volatility, 'VOLATILE');
  assert.equal(br.supportingIndicators.dailyChangeExcludedFromRegime, true);

  // 2. Evolução de 21 pregões e histórico de transições/períodos
  assert.equal(br.recentTimeline21d.length, 21);
  assert.equal(br.currentPeriod.regime, 'DOWN_VOLATILE');
  assert.equal(br.currentPeriod.durationTradingDays, 4);
  assert.equal(br.recentTransitions.length, 3);
  assert.equal(br.recentTransitions[0].regime, 'DOWN_VOLATILE');
  assert.equal(br.recentTransitions[1].regime, 'DOWN_QUIET');
  assert.equal(br.recentTransitions[2].regime, 'SIDEWAYS_QUIET');

  // 3. Benchmarks brasileiros e fatores relacionados
  assert.deepEqual(br.benchmarkSummary.map(b => b.symbol), ['IBOV', 'IFIX', 'BDRX']);
  assert.equal(br.relatedFactors.breadthB3.totalEligible, 216);
  assert.equal(br.relatedFactors.breadthB3.aboveEma50Pct, 29);
  assert.equal(br.relatedFactors.dolar.latestValue, 5.84);
  assert.equal(br.relatedFactors.juros.selicValue, 11.25);
  assert.equal(br.relatedFactors.juros.diCurveStatus, 'indisponivel');
  assert.equal(br.relatedFactors.volatility.atrPct, 1.43);

  // 4. Rastreabilidade e modelo frontend
  assert.equal(br.provenance.asOfDate, '2026-11-24');
  assert.equal(br.status, 'atualizado');

  const uiModel = new CapitalIntelligenceModel();
  uiModel.hydrateFromPipelineSnapshot(snapshot);
  const brNode = uiModel.getNodeById('cycle_br');
  assert.equal(brNode.displayValue, 'Down – Volatile');
  assert.ok(brNode.metricCaption.includes('4p no regime'));
  assert.ok(brNode.metricCaption.includes('21p:'), 'Legenda da esfera destaca evolução 21p e duração, nunca 1D');
  assert.equal(brNode.brazilCycleDetail.recentTimeline21d.length, 21);
});

test('Esfera Ciclo Brasil (04): nunca inventa classificação quando motor oficial não fornece regime válido', () => {
  const now = new Date('2026-11-24T22:30:00.000Z');
  const seriesById = {
    cycle_br_ibov: [
      {
        indicatorId: 'cycle_br_ibov',
        symbol: 'IBOV',
        market: 'BR',
        currency: 'PTS',
        unit: 'pts',
        referenceDate: '2026-11-24',
        closeValue: 168000,
        sourceProvider: 'b3_market_regime',
        metadata: { regime: 'INSUFFICIENT_DATA' }
      }
    ]
  };

  const snapshot = calculator.buildDailySnapshot(seriesById, { now });
  const br = snapshot.spheres.cycle_br;

  assert.equal(br.hasOfficialRegime, false);
  assert.equal(br.regimeCode, null);
  assert.equal(br.regimeLabel, null);
  assert.equal(br.status, 'indisponivel');

  const uiModel = new CapitalIntelligenceModel();
  uiModel.hydrateFromPipelineSnapshot(snapshot);
  assert.equal(uiModel.getNodeById('cycle_br').displayValue, 'Indisponível');
});

test('Esfera Ciclo Brasil (04): descarta estritamente datas futuras e candles incompletos antes do fechamento', () => {
  // Terça 2026-11-24 às 15:00 BRT (18:00 UTC) — pregão de 24/11 ainda aberto (esperado = 2026-11-23)
  const midSessionNow = new Date('2026-11-24T18:00:00.000Z');

  const series = buildIbovRegimeSeries([
    ['2026-11-23', 165000, 'DOWN_VOLATILE'],
    // Candle de hoje antes do fechamento (deve ser rejeitado!)
    ['2026-11-24', 178000, 'UP_QUIET'],
    // Candle futuro (deve ser rejeitado!)
    ['2026-11-27', 182000, 'UP_QUIET'],
    // Candle marcado incompleto (deve ser rejeitado!)
    ['2026-11-23', 179000, 'UP_QUIET', { qualityStatus: 'incomplete', isIncomplete: true }]
  ]);

  const snapshot = calculator.buildDailySnapshot({ cycle_br_ibov: series }, { now: midSessionNow });
  const br = snapshot.spheres.cycle_br;

  assert.equal(br.regimeCode, 'DOWN_VOLATILE', 'Candle incompleto ou pré-fechamento não pode alterar o regime oficial');
  assert.equal(br.asOfDate, '2026-11-23');
  assert.equal(br.provenance.filteredFutureOrIncompleteCount, 3);
  assert.equal(br.status, 'atualizado', 'Com 2026-11-23 fechado às 15h BRT de 24/11, o status é atualizado');
});

test('Esfera Ciclo Brasil (04): integração real com caches em disco (IBOV + Breadth B3) sem chamadas externas', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-br-real-'));
  const store = new CapitalIntelligenceStore({ storePath: path.join(tmpDir, 'store.json'), useDatabase: false });
  const pipeline = new CapitalIntelligencePipeline({ store });

  const now = new Date('2026-11-22T17:00:00.000Z');
  const snapshot = await pipeline.bootstrapFromLocalCaches(now);
  assert.ok(snapshot, 'Bootstrap local deve gerar snapshot válido');

  const br = snapshot.spheres.cycle_br;
  assert.equal(br.hasOfficialRegime, true, 'IBOV real em disco deve fornecer classificação oficial');
  assert.ok(Object.values(marketRegime.REGIMES).includes(br.regimeCode));
  assert.equal(br.recentTimeline21d.length, 21, 'Deve conter exatamente os 21 pregões recentes de evolução');
  assert.ok(br.currentPeriod && br.currentPeriod.durationTradingDays >= 1);
  assert.equal(br.relatedFactors.breadthB3.status !== 'indisponivel', true, 'Breadth real da B3 deve ser carregado do market-cache.json');
  assert.ok(br.relatedFactors.breadthB3.totalEligible > 100);
});
