'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

const { CapitalIntelligenceStore } = require('../src/capital-intelligence-store');
const ingestion = require('../src/capital-intelligence-ingestion');
const calculator = require('../src/capital-intelligence-calculator');
const { CapitalIntelligencePipeline } = require('../src/capital-intelligence-pipeline');
const CapitalIntelligenceModel = require('../../frontend/capital-intelligence-model');

function makeTempStorePath(suffix) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `ci-pipeline-${suffix}-`));
  return path.join(dir, 'store.json');
}

function makeDailySeries(indicatorId, symbol, startIso, count, startVal, step = 1, extra = {}) {
  const rows = [];
  let cursor = startIso;
  let val = startVal;
  for (let i = 0; i < count; i++) {
    while (!ingestion.isBusinessDay(cursor, extra.market || 'US')) {
      cursor = ingestion.addCalendarDays(cursor, 1);
    }
    rows.push({
      indicatorId,
      symbol,
      market: extra.market || 'US',
      currency: extra.currency || 'USD',
      unit: extra.unit || 'USD',
      metricNature: extra.metricNature || 'price_performance',
      referenceDate: cursor,
      closeValue: Number(val.toFixed(4)),
      sourceProvider: extra.provider || 'test_provider',
      sourceTimestamp: `${cursor}T21:00:00.000Z`,
      collectedAt: '2026-11-24T22:00:00.000Z',
      qualityStatus: 'valid',
      metadata: extra.metadata || {}
    });
    val += step;
    cursor = ingestion.addCalendarDays(cursor, 1);
  }
  return rows;
}

test('Calendário de mercado e fuso horário: nunca trata pregão ainda não publicado como dado do dia', () => {
  // Terça-feira 2026-11-24 às 15:00 BRT (18:00 UTC) — ANTES do fechamento da B3 (18h30 BRT)
  const brPreClose = new Date('2026-11-24T18:00:00.000Z');
  const expBrPre = ingestion.getExpectedReferenceDate('cycle_br_ibov', brPreClose);
  assert.equal(expBrPre.expectedDate, '2026-11-23', 'Antes das 18h30 BRT não deve esperar fechamento de hoje na B3');
  assert.equal(expBrPre.isAfterPublishCutoff, false);

  // Terça-feira 2026-11-24 às 19:00 BRT (22:00 UTC) — APÓS fechamento da B3
  const brPostClose = new Date('2026-11-24T22:00:00.000Z');
  const expBrPost = ingestion.getExpectedReferenceDate('cycle_br_ibov', brPostClose);
  assert.equal(expBrPost.expectedDate, '2026-11-24', 'Após 18h30 BRT deve esperar fechamento de hoje na B3');
  assert.equal(expBrPost.isAfterPublishCutoff, true);

  // BCB PTAX às 14:00 BRT (17:00 UTC) — APÓS publicação das 13h30 BRT
  const ptaxAfter = ingestion.getExpectedReferenceDate('fx_usd_brl', new Date('2026-11-24T17:00:00.000Z'));
  assert.equal(ptaxAfter.expectedDate, '2026-11-24');

  // Mercado EUA: Terça 2026-11-24 às 14:00 NY (19:00 UTC) — ANTES de 16h45 NY
  const usPreClose = ingestion.getExpectedReferenceDate('cycle_us_sp500', new Date('2026-11-24T19:00:00.000Z'));
  assert.equal(usPreClose.expectedDate, '2026-11-23', 'Antes das 16h45 NY não deve esperar dado de hoje nos EUA');

  // Mercado EUA: Terça 2026-11-24 às 17:30 NY (22:30 UTC) — APÓS 16h45 NY
  const usPostClose = ingestion.getExpectedReferenceDate('cycle_us_sp500', new Date('2026-11-24T22:30:00.000Z'));
  assert.equal(usPostClose.expectedDate, '2026-11-24');

  // FRED D+1 (rate_us10y) após fechamento de Terça espera Segunda (D-1 útil)
  const us10yPost = ingestion.getExpectedReferenceDate('rate_us10y', new Date('2026-11-24T22:30:00.000Z'));
  assert.equal(us10yPost.expectedDate, '2026-11-23', 'Séries FRED D+1 respeitam lag oficial de 1 dia útil');

  // Feriado BR (2026-11-20 Consciência Negra) em domingo 2026-11-22 recua para 2026-11-19
  const brWeekendAfterHoliday = ingestion.getExpectedReferenceDate('cycle_br_ibov', new Date('2026-11-22T16:00:00.000Z'));
  assert.equal(brWeekendAfterHoliday.expectedDate, '2026-11-19');
});

test('Armazenamento idempotente: reprocessamentos não duplicam observações nem snapshots', async () => {
  const storePath = makeTempStorePath('idempotent');
  const store = new CapitalIntelligenceStore({ storePath, useDatabase: false });

  const batch1 = [
    { indicatorId: 'fx_usd_brl', symbol: 'USDBRL', market: 'BR', currency: 'BRL', unit: 'BRL/USD', referenceDate: '2026-11-23', closeValue: 5.80, sourceProvider: 'bcb_sgs' },
    { indicatorId: 'fx_usd_brl', symbol: 'USDBRL', market: 'BR', currency: 'BRL', unit: 'BRL/USD', referenceDate: '2026-11-24', closeValue: 5.82, sourceProvider: 'bcb_sgs' },
    // Duplicata no mesmo lote com valor revisado
    { indicatorId: 'fx_usd_brl', symbol: 'USDBRL', market: 'BR', currency: 'BRL', unit: 'BRL/USD', referenceDate: '2026-11-24', closeValue: 5.83, sourceProvider: 'bcb_sgs' }
  ];

  const res1 = await store.upsertObservations(batch1);
  assert.equal(res1.upserted, 2, 'Deduplicação intra-lote deve consolidar mesma data');
  assert.equal(res1.inserted, 2);

  // Reprocessamento idêntico não cria duplicatas
  const res2 = await store.upsertObservations(batch1);
  assert.equal(res2.inserted, 0);
  assert.equal(res2.updated, 2);

  const series = await store.getSeries('fx_usd_brl');
  assert.equal(series.length, 2, 'Série deve manter exatamente 2 observações únicas');
  assert.equal(series[1].closeValue, 5.83, 'Valor mais recente deve prevalecer no upsert');

  // Re-leitura a partir do disco confirma persistência atômica
  const reloaded = new CapitalIntelligenceStore({ storePath, useDatabase: false });
  const persisted = await reloaded.getSeries('fx_usd_brl');
  assert.equal(persisted.length, 2);
});

test('Classificação de frescor: distingue atualizado, atrasado, indisponivel e parcial (nunca apresenta dado antigo como atual)', () => {
  const tuesdayNight = new Date('2026-11-24T22:30:00.000Z'); // 19:30 BRT / 17:30 NY

  // 1. Atualizado (data == 2026-11-24)
  const freshSeries = [{ referenceDate: '2026-11-24', closeValue: 590, collectedAt: tuesdayNight.toISOString() }];
  const freshStatus = calculator.classifySeriesFreshness('cycle_us_sp500', freshSeries, tuesdayNight);
  assert.equal(freshStatus.status, 'atualizado');
  assert.equal(freshStatus.lagBusinessDays, 0);

  // 2. Atrasado (último dado em 2026-11-18 -> 4 pregões atrás de 2026-11-24)
  const staleSeries = [{ referenceDate: '2026-11-18', closeValue: 580, collectedAt: '2026-11-18T22:00:00.000Z' }];
  const staleStatus = calculator.classifySeriesFreshness('cycle_us_sp500', staleSeries, tuesdayNight);
  assert.equal(staleStatus.status, 'atrasado', 'Dado antigo JAMAIS deve ser classificado como atualizado');
  assert.equal(staleStatus.lagBusinessDays, 4);

  // 3. Indisponível (sem fonte configurada ou sem série)
  const unavailBreadth = calculator.classifySeriesFreshness('breadth_us_broad', [], tuesdayNight);
  assert.equal(unavailBreadth.status, 'indisponivel');

  // 4. Parcial (mistura de atualizado e atrasado/indisponível)
  assert.equal(calculator.aggregateFreshnessStatus(['atualizado', 'atrasado']), 'parcial');
  assert.equal(calculator.aggregateFreshnessStatus(['atualizado', 'indisponivel']), 'parcial');
  assert.equal(calculator.aggregateFreshnessStatus(['atualizado', 'atualizado']), 'atualizado');
});

test('Retry e backoff em fetchWithRetry: recupera falha transitória 503/429', async () => {
  let attempts = 0;
  const flakyFetch = async () => {
    attempts += 1;
    if (attempts < 3) {
      return { ok: false, status: 503, headers: new Map() };
    }
    return {
      ok: true,
      status: 200,
      headers: new Map(),
      json: async () => ([{ data: '24/11/2026', valor: '5.81' }])
    };
  };

  const res = await ingestion.collectBcbMacro({
    indicatorIds: ['fx_usd_brl'],
    fetchImpl: flakyFetch,
    baseBackoffMs: 5,
    minIntervalMs: 0,
    now: new Date('2026-11-24T18:00:00.000Z')
  });

  assert.equal(attempts, 3, 'Deve tentar 3 vezes após dois HTTP 503');
  assert.equal(res.errors.length, 0);
  assert.equal(res.observations.length, 1);
  assert.equal(res.observations[0].referenceDate, '2026-11-24');
  assert.equal(res.observations[0].closeValue, 5.81);
});

test('Parser CBOE VIX CSV padroniza datas MM/DD/YYYY para ISO e OHLC', () => {
  const sampleCsv = [
    'DATE,OPEN,HIGH,LOW,CLOSE',
    '11/20/2026,18.10,19.40,17.50,18.25',
    '11/23/2026,18.30,18.90,17.20,17.60'
  ].join('\n');

  const rows = ingestion.parseCboeVixCsv(sampleCsv, 10);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].referenceDate, '2026-11-20');
  assert.equal(rows[1].referenceDate, '2026-11-23');
  assert.equal(rows[1].closeValue, 17.60);
});

test('Pipeline completo: ingestão agendada, snapshot diário, zero chamadas externas no consumo e proteção contra reexecução redundante', async () => {
  const storePath = makeTempStorePath('full');
  const store = new CapitalIntelligenceStore({ storePath, useDatabase: false });

  let externalCollectorCalls = 0;
  const now = new Date('2026-11-24T22:30:00.000Z'); // Terça após fechamento BR e EUA

  const spySeries = makeDailySeries('cycle_us_sp500', 'SPY', '2026-10-15', 26, 560, 1, {
    market: 'US',
    provider: 'twelve_data_market_regime',
    metadata: { regime: 'UP_QUIET', direction: 'UP', volatility: 'QUIET' }
  });
  // Garante última data exata == 2026-11-24
  spySeries[spySeries.length - 1].referenceDate = '2026-11-24';

  const xleSeries = makeDailySeries('sec_us_xle', 'XLE', '2026-10-15', 26, 85, 0.5, {
    market: 'US',
    provider: 'twelve_data',
    metadata: { sectorLabel: 'Energia' }
  });
  xleSeries[xleSeries.length - 1].referenceDate = '2026-11-24';

  const pipeline = new CapitalIntelligencePipeline({
    store,
    collectors: {
      collectFromMarketRegime: async (bmIds) => {
        externalCollectorCalls += 1;
        if (bmIds.includes('SP500')) {
          return { observations: spySeries, updatedIds: ['cycle_us_sp500'], errors: [], creditsUsed: 2 };
        }
        return {
          observations: [{
            indicatorId: 'cycle_br_ibov', symbol: 'IBOV', market: 'BR', currency: 'PTS', unit: 'pts',
            referenceDate: '2026-11-24', closeValue: 138500, sourceProvider: 'b3_market_regime',
            metadata: { regime: 'DOWN_VOLATILE', direction: 'DOWN', volatility: 'VOLATILE' }
          }],
          updatedIds: ['cycle_br_ibov'],
          errors: [],
          creditsUsed: 0
        };
      },
      collectBcbMacro: async () => {
        externalCollectorCalls += 1;
        return {
          observations: [
            { indicatorId: 'fx_usd_brl', symbol: 'USDBRL', market: 'BR', currency: 'BRL', unit: 'BRL/USD', referenceDate: '2026-11-24', closeValue: 5.85, sourceProvider: 'bcb_sgs' },
            { indicatorId: 'rate_selic_meta', symbol: 'SELIC', market: 'BR', currency: 'PCT', unit: '% a.a.', metricNature: 'macro_rate', referenceDate: '2026-11-24', closeValue: 11.25, sourceProvider: 'bcb_sgs' }
          ],
          updatedIds: ['fx_usd_brl', 'rate_selic_meta'],
          errors: [],
          creditsUsed: 0
        };
      },
      collectCboeVix: async () => {
        externalCollectorCalls += 1;
        return {
          observations: [
            { indicatorId: 'vol_vix', symbol: 'VIX', market: 'US', currency: 'PTS', unit: 'idx', metricNature: 'macro_rate', referenceDate: '2026-11-23', closeValue: 16.4, sourceProvider: 'cboe_csv' }
          ],
          updatedIds: ['vol_vix'],
          errors: [],
          creditsUsed: 0
        };
      },
      collectFredMacro: async () => {
        externalCollectorCalls += 1;
        return { observations: [], updatedIds: [], errors: [], skipped: true, creditsUsed: 0 };
      },
      collectTwelveDataEtfs: async () => {
        externalCollectorCalls += 1;
        return { observations: xleSeries, updatedIds: ['sec_us_xle'], errors: [], creditsUsed: 1 };
      }
    },
    dependencies: {
      wealth: { list: async () => ({ summary: { operationalEquity: 920000 } }) },
      trades: { list: async () => ([{ ticker: 'PETR4', status: 'open', currentQuantity: 1000, currentPrice: 38, currentRiskPercent: 0.8 }]) },
      riskPolicy: { get: async () => ({ maxPortfolioHeat: 5.0 }) },
      eventPlaybook: { list: async () => ([{ id: 'ep-copom', name: 'Decisão COPOM' }]) },
      usBreadthLoader: async () => null
    }
  });

  // 1. Executa jobs agendados
  const runs = await pipeline.runDueJobs({ now });
  assert.equal(runs.length, 3);
  assert.ok(runs.every(r => r.status === 'atualizado'));
  const callsAfterIngest = externalCollectorCalls;
  assert.ok(callsAfterIngest >= 5);

  // 2. Segunda rodada para o mesmo pregão esperado pula sem desperdiçar API
  const secondRuns = await pipeline.runDueJobs({ now });
  assert.ok(secondRuns.every(r => r.status === 'skipped'));
  assert.equal(externalCollectorCalls, callsAfterIngest, 'Não deve chamar coletores novamente para data já atualizada');

  // 3. Consumo pela API interna NÃO faz nenhuma chamada externa
  const snapshot = await pipeline.getSnapshotForUser('user-tenant-1', { now });
  assert.equal(externalCollectorCalls, callsAfterIngest, 'API interna deve servir 100% do cache/banco sem chamadas externas');
  assert.equal(snapshot.servedFromCache, true);
  assert.equal(snapshot.spheres.cycle_br.status, 'atualizado');
  assert.equal(snapshot.spheres.cycle_us.primary.status, 'atualizado');
  assert.equal(snapshot.spheres.breadth_us.status, 'indisponivel', 'Breadth amplo EUA sem provedor permanece indisponivel');
  assert.equal(snapshot.spheres.sector_rotation_us.sectors[0].symbol, 'XLE');
  assert.equal(snapshot.spheres.sector_rotation_us.sectors[0].metricNature, 'price_performance');
  assert.equal(snapshot.spheres.my_portfolio.equity, 920000);
  assert.equal(snapshot.spheres.my_portfolio.heatPct, 0.8);

  // 4. Consulta de série histórica e observabilidade
  const spyHist = await pipeline.getSeries('cycle_us_sp500', { now });
  assert.equal(spyHist.observations.length, 26);
  assert.ok(Number.isFinite(spyHist.summary.change21dPct), 'Janela exata de 21 pregões deve ser calculada');

  const statusReport = await pipeline.getStatus(now);
  assert.ok(statusReport.storage.totalObservations >= 50);
  assert.ok(statusReport.availableSnapshotDates.length >= 1);

  // 5. Hidratação do modelo frontend preserva estados de frescor
  const uiModel = new CapitalIntelligenceModel();
  uiModel.hydrateFromPipelineSnapshot(snapshot);
  assert.equal(uiModel.getNodeById('cycle_br').freshnessStatus, 'atualizado');
  assert.equal(uiModel.getNodeById('breadth_us').freshnessStatus, 'indisponivel');
  assert.equal(uiModel.getNodeById('my_portfolio').equityValue, 920000);
});
