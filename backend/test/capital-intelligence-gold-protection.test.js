'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const goldProtection = require('../src/gold-protection');
const calculator = require('../src/capital-intelligence-calculator');
const CapitalIntelligenceModel = require('../../frontend/capital-intelligence-model');

test('09 Gold & Protection — primary spotlight on 21-session trend and secondary 1-day change', () => {
  // Gera série sintética de 30 dias para o ouro terminando em 2026-11-20
  const goldSeries = [];
  const baseDate = new Date('2026-10-22T12:00:00.000Z');
  let price = 100;
  for (let i = 0; i < 30; i++) {
    const d = new Date(baseDate.getTime() + i * 24 * 60 * 60 * 1000);
    const dateStr = d.toISOString().slice(0, 10);
    price += (i >= 9 ? 0.8 : 0.2);
    if (i === 29) price -= 2.0;
    goldSeries.push({ referenceDate: dateStr, closeValue: price });
  }

  const seriesById = {
    cmd_gold: goldSeries
  };

  const dim = goldProtection.buildGoldProtectionDimension(seriesById, { now: new Date('2026-11-20T17:00:00.000Z') });
  assert.ok(dim, 'Dimensão de ouro deve ser construída com sucesso');
  assert.equal(dim.id, 'gold_commodities');
  assert.equal(dim.status, 'atualizado');

  // Tendência primária de 21 pregões é de alta, mesmo com queda de 1 dia no último pregão
  assert.ok(dim.historicalTrends.change21dPct > 5.0, 'Tendência de 21 pregões deve ser expressivamente positiva');
  assert.equal(dim.historicalTrends.trendDirection, 'up');
  assert.ok(dim.historicalTrends.change1dPct < 0, 'Variação de 1 dia deve ser negativa');
  assert.equal(dim.historicalTrends.primaryWindowLabel, '21 pregões (destaque)');

  // Display value da esfera destaca 21p
  assert.ok(dim.displayValue.includes('(21p)'), 'Display value deve conter o sufixo (21p)');
  assert.ok(dim.metricCaption.includes('Hoje:'), 'Metric caption deve expor a variação de hoje como secundária');
});

test('09 Gold & Protection — does NOT presume every gold rise is flight to safety (liquidity vs safety vs hedge)', () => {
  // Cenário A: Ouro sobe COM ações subindo e VIX calmo (Expansão de Liquidez, NÃO fuga para segurança)
  const regimeLiquidity = goldProtection.evaluateGoldMacroRegime({
    goldChange21d: 4.5,
    equitiesChange21d: 3.8,
    dollarChange21d: -2.1,
    vixLevel: 14.2,
    oilChange21d: 1.0
  });

  assert.equal(regimeLiquidity.regime.code, 'liquidity_expansion');
  assert.equal(regimeLiquidity.flightToSafetyConfirmed, false);
  assert.equal(regimeLiquidity.regime.badge, 'EXPANSÃO DE LIQUIDEZ');
  assert.ok(regimeLiquidity.rationale.includes('expansão ampla de liquidez'));

  // Cenário B: Ouro sobe COM ações em queda e VIX em estresse (Aversão a risco genuína)
  const regimeSafety = goldProtection.evaluateGoldMacroRegime({
    goldChange21d: 5.2,
    equitiesChange21d: -4.0,
    dollarChange21d: 1.5,
    vixLevel: 26.5,
    oilChange21d: 0.5
  });

  assert.equal(regimeSafety.regime.code, 'flight_to_safety');
  assert.equal(regimeSafety.flightToSafetyConfirmed, true);
  assert.equal(regimeSafety.regime.badge, 'PROTEÇÃO ATIVA');
  assert.ok(regimeSafety.rationale.includes('refúgio'));

  // Cenário C: Ouro sobe COM petróleo/commodities em disparada (Hedge Inflacionário)
  const regimeInflation = goldProtection.evaluateGoldMacroRegime({
    goldChange21d: 6.0,
    equitiesChange21d: 0.2,
    dollarChange21d: 0.1,
    vixLevel: 17.0,
    oilChange21d: 8.5
  });

  assert.equal(regimeInflation.regime.code, 'inflation_hedge');
  assert.equal(regimeInflation.flightToSafetyConfirmed, false);
  assert.equal(regimeInflation.regime.badge, 'HEDGE REAL');

  // Cenário D: Ouro em queda com dólar forte e juros (Custo de Oportunidade)
  const regimeOppCost = goldProtection.evaluateGoldMacroRegime({
    goldChange21d: -3.5,
    equitiesChange21d: 1.2,
    dollarChange21d: 2.8,
    vixLevel: 15.0,
    oilChange21d: -1.0
  });

  assert.equal(regimeOppCost.regime.code, 'opportunity_cost');
  assert.equal(regimeOppCost.regime.badge, 'PRESSÃO DE JUROS');
});

test('09 Gold & Protection — relative strength vs equities and dollar and future commodities expansion', () => {
  const dates = [];
  const baseDate = new Date('2026-10-25T12:00:00.000Z');
  for (let i = 0; i < 25; i++) {
    const d = new Date(baseDate.getTime() + i * 86400000);
    dates.push(d.toISOString().slice(0, 10));
  }

  // Ouro sobe 10%, SPY sobe 4%, DXY sobe 1%
  const goldSeries = dates.map((dt, i) => ({ referenceDate: dt, closeValue: 100 + i * (10 / 24) }));
  const spySeries = dates.map((dt, i) => ({ referenceDate: dt, closeValue: 500 + i * (20 / 24) })); // +4%
  const dollarSeries = dates.map((dt, i) => ({ referenceDate: dt, closeValue: 100 + i * (1 / 24) })); // +1%
  const oilSeries = dates.map((dt, i) => ({ referenceDate: dt, closeValue: 70 + i * (3 / 24) }));
  const dbcSeries = dates.map((dt, i) => ({ referenceDate: dt, closeValue: 22 + i * (0.5 / 24) }));

  const seriesById = {
    cmd_gold: goldSeries,
    cycle_us_sp500: spySeries,
    macro_dxy: dollarSeries,
    cmd_oil: oilSeries,
    cmd_broad: dbcSeries
  };

  const dim = goldProtection.buildGoldProtectionDimension(seriesById, { now: new Date('2026-11-20T17:00:00.000Z') });

  // Força Relativa
  assert.ok(dim.relativeStrength.vsEquitiesUsPct > 5.0, 'Ouro deve superar SPY em mais de 5pp');
  assert.ok(dim.relativeStrength.vsDollarPct > 7.0, 'Ouro deve superar o Dólar em mais de 7pp');
  assert.ok(dim.relativeStrength.summaryText.includes('Superando ações'));

  // Cesta de Commodities Futura
  assert.ok(Array.isArray(dim.otherCommodities) && dim.otherCommodities.length >= 2);
  const oil = dim.otherCommodities.find(c => c.symbol === 'OIL');
  const dbc = dim.otherCommodities.find(c => c.symbol === 'BROAD');
  assert.ok(oil && oil.latestValue > 0);
  assert.ok(dbc && dbc.latestValue > 0);
  assert.ok(Number.isFinite(oil.change21dPct));

  // Limitações Analíticas obrigatórias
  assert.ok(Array.isArray(dim.interpretation.limitations));
  assert.equal(dim.interpretation.limitations.length >= 3, true);
  assert.ok(dim.interpretation.limitations.some(l => l.includes('fuga para segurança')));
  assert.ok(dim.interpretation.limitations.some(l => l.includes('custo de oportunidade')));
});

test('09 Gold & Protection — integration with buildDailySnapshot and frontend CapitalIntelligenceModel', () => {
  const dates = [];
  const baseDate = new Date('2026-10-25T12:00:00.000Z');
  for (let i = 0; i < 25; i++) {
    const d = new Date(baseDate.getTime() + i * 86400000);
    dates.push(d.toISOString().slice(0, 10));
  }

  const seriesById = {
    cmd_gold: dates.map((dt, i) => ({ referenceDate: dt, closeValue: 200 + i * 0.5 })),
    cycle_us_sp500: dates.map((dt, i) => ({ referenceDate: dt, closeValue: 500 + i * 1.0 })),
    vol_vix: dates.map((dt, i) => ({ referenceDate: dt, closeValue: 15.5 }))
  };

  const now = new Date('2026-11-20T17:00:00.000Z');
  const snapshot = calculator.buildDailySnapshot(seriesById, { now });

  assert.ok(snapshot.spheres.gold_commodities, 'Snapshot deve conter esfera gold_commodities');
  const gc = snapshot.spheres.gold_commodities;
  assert.ok(gc.historicalTrends.change21dPct !== null);
  assert.equal(gc.id, 'gold_commodities');

  // Hidratação no frontend Model
  const model = new CapitalIntelligenceModel();
  model.hydrateFromPipelineSnapshot(snapshot);

  const node = model.getNodeById('gold_commodities');
  assert.ok(node, 'Nó gold_commodities deve existir no grafo');
  assert.equal(node.badge, 'OURO / PROTEÇÃO', 'Badge deve ser OURO / PROTEÇÃO');
  assert.ok(node.goldProtectionDetail, 'goldProtectionDetail deve estar anexado ao nó');
  assert.equal(node.displayValue, gc.displayValue);
  assert.equal(node.metricCaption, gc.metricCaption);

  // Insights gerados
  const insights = model.generateInsights();
  const goldInsight = insights.find(i => i.id === 'ins_gold_protection');
  assert.ok(goldInsight, 'Insight de proteção em ouro deve ser gerado');
  assert.ok(goldInsight.title.includes('Ouro & Ativos de Proteção'));
});
