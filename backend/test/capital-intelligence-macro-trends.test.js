'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const macroTrends = require('../src/macro-trends');
const calculator = require('../src/capital-intelligence-calculator');
const { shiftBusinessDays } = require('../src/capital-intelligence-ingestion');
const CapitalIntelligenceModel = require('../../frontend/capital-intelligence-model');

function generateDates(count, endDate, market = 'BR') {
  const dates = [];
  let cursor = endDate;
  for (let i = 0; i < count; i++) {
    dates.push(cursor);
    cursor = shiftBusinessDays(cursor, -1, market);
  }
  return dates.reverse();
}

function buildSeries(indicatorId, symbol, dates, valFn, provider = 'test_provider') {
  return dates.map((refDate, i) => ({
    indicatorId,
    symbol,
    referenceDate: refDate,
    closeValue: Number(valFn(i, dates.length).toFixed(4)),
    collectedAt: '2026-11-24T22:15:00.000Z',
    sourceProvider: provider,
    qualityStatus: 'valid'
  }));
}

test('08 Macro Trends — computes 21p & 63p historical trends in strict native units (%, p.p., bps, pts) with VIX level regime', () => {
  // Terça 2026-11-24 19:30 BRT / 17:30 NY (BR esperado: 2026-11-24; FRED/CBOE D+1 esperado: 2026-11-23)
  const now = new Date('2026-11-24T22:30:00.000Z');
  const brDates = generateDates(70, '2026-11-24', 'BR');
  const usD1Dates = generateDates(70, '2026-11-23', 'US');

  const seriesById = {
    // Dólar sobe ~+4,0% em 21p (de ~5.65 para ~5.88)
    fx_usd_brl: buildSeries('fx_usd_brl', 'USDBRL', brDates, (i) => 5.30 + i * 0.0085, 'bcb_sgs'),
    // Curva DI abre +52 bps (+0,52 p.p.) em 21p
    rate_di_curve: buildSeries('rate_di_curve', 'DI1', brDates, (i) => 11.20 + i * 0.025, 'anbima_ettj'),
    // Selic Meta vigente mantida em 11,25% a.a.
    rate_selic_meta: buildSeries('rate_selic_meta', 'SELIC', brDates, () => 11.25, 'bcb_sgs'),
    // US Treasury 10Y sobe +25 bps (+0,25 p.p.) em 21p
    rate_us10y: buildSeries('rate_us10y', 'US10Y', usD1Dates, (i) => 3.90 + i * 0.012, 'fred'),
    // VIX expande de ~17 para ~23,9 pts (regime Elevada / Atenção)
    vol_vix: buildSeries('vol_vix', 'VIX', usD1Dates, (i) => 14.0 + i * 0.145, 'cboe_csv')
  };

  const dim = macroTrends.buildMacroTrendsDimension(seriesById, { now });

  assert.equal(dim.horizonSessions, 21);
  assert.equal(dim.contextSessions, 63);
  assert.equal(dim.causalityGuard, true);
  assert.equal(dim.normalizationGuard, true);

  // Dólar/BRL: nível R$/US$, variação %
  const fx = dim.indicators.fx_usd_brl;
  assert.equal(fx.status, 'atualizado');
  assert.equal(fx.unitSpec.levelUnit, 'R$/US$');
  assert.equal(fx.unitSpec.primaryDeltaUnit, '%');
  assert.equal(fx.trend.code, 'rising');
  assert.ok(fx.change21dPct > 2.5);
  assert.match(fx.primaryDelta21dFormatted, /%$/);
  assert.match(fx.currentValueFormatted, /^R\$ /);
  assert.equal(fx.series21d.length, 21);

  // Curva DI: nível % a.a., variação em bps e p.p.
  const di = dim.indicators.rate_di_curve;
  assert.equal(di.unitSpec.levelUnit, '% a.a.');
  assert.equal(di.unitSpec.primaryDeltaUnit, 'bps');
  assert.equal(di.unitSpec.secondaryDeltaUnit, 'p.p.');
  assert.equal(di.trend.code, 'rising');
  assert.ok(di.delta21dBps >= 50);
  assert.match(di.primaryDelta21dFormatted, /bps$/);
  assert.match(di.secondaryDelta21dFormatted, /p\.p\.$/);
  assert.equal(di.distinctFromMonetaryPolicy, true);

  // Selic Meta: contexto de política monetária separado do DI + spread DI vs Selic
  const selic = dim.policyContext.selic;
  assert.equal(selic.status, 'atualizado');
  assert.equal(selic.instrumentRole, 'monetary_policy_rate');
  assert.equal(selic.delta21dBps, 0);
  assert.equal(selic.currentValue, 11.25);
  assert.equal(dim.policyContext.brRatesDistinction.neverSubstituteSelicForDi, true);
  assert.ok(Number.isFinite(dim.policyContext.brRatesDistinction.spreadDiVsSelicBps));
  assert.ok(dim.policyContext.brRatesDistinction.spreadDiVsSelicBps > 0);

  // US10Y: % a.a., bps e p.p.
  const us10y = dim.indicators.rate_us10y;
  assert.equal(us10y.status, 'atualizado');
  assert.equal(us10y.trend.code, 'rising');
  assert.ok(us10y.delta21dBps >= 20);
  assert.match(us10y.primaryDelta21dFormatted, /bps$/);

  // VIX: pontos (pts), %, e regime de nível documentado
  const vix = dim.indicators.vol_vix;
  assert.equal(vix.status, 'atualizado');
  assert.equal(vix.unitSpec.levelUnit, 'pontos');
  assert.equal(vix.unitSpec.primaryDeltaUnit, 'pts');
  assert.equal(vix.trend.code, 'rising');
  assert.equal(vix.levelRegime.code, 'elevated');
  assert.match(vix.primaryDelta21dFormatted, /pts$/);
  assert.match(vix.currentValueFormatted, /pts$/);

  // Comparação transversal marcada explicitamente como escala normalizada
  assert.equal(dim.normalizedComparison21d.length, 4);
  assert.ok(dim.normalizedComparison21d.every(c => c.isNormalizedScale === true));
});

test('08 Macro Trends — NEVER substitutes Selic Meta for unavailable Curva DI and preserves honest delayed/unavailable states', () => {
  const now = new Date('2026-11-24T22:30:00.000Z');
  const brDates = generateDates(25, '2026-11-24', 'BR');
  const staleUsDates = generateDates(25, '2026-11-18', 'US'); // Defasado em vários pregões

  const seriesById = {
    fx_usd_brl: buildSeries('fx_usd_brl', 'USDBRL', brDates, (i) => 5.75 + i * 0.001, 'bcb_sgs'),
    // rate_di_curve AUSENTE intencionalmente
    rate_selic_meta: buildSeries('rate_selic_meta', 'SELIC', brDates, () => 11.25, 'bcb_sgs'),
    // rate_us10y atrasado em 3 dias úteis frente a 2026-11-23
    rate_us10y: buildSeries('rate_us10y', 'US10Y', staleUsDates, (i) => 4.20 + i * 0.008, 'fred')
    // vol_vix AUSENTE
  };

  const snapshot = calculator.buildDailySnapshot(seriesById, { now });
  const mt = snapshot.macroTrends;

  // DI deve permanecer indisponível (NUNCA copiado da Selic!)
  assert.equal(mt.indicators.rate_di_curve.status, 'indisponivel');
  assert.equal(mt.indicators.rate_di_curve.currentValue, null);
  assert.equal(snapshot.trendSatellites21d.trend_di.status, 'indisponivel');
  assert.equal(snapshot.trendSatellites21d.trend_di.diCurvePending, true);

  // Selic aparece em seu bloco dedicado de política monetária
  assert.equal(mt.policyContext.selic.status, 'atualizado');
  assert.equal(mt.policyContext.selic.currentValue, 11.25);
  assert.equal(mt.policyContext.brRatesDistinction.diAvailable, false);
  assert.equal(mt.policyContext.brRatesDistinction.selicAvailable, true);
  assert.equal(mt.policyContext.brRatesDistinction.spreadDiVsSelicBps, null);

  // US10Y deve sinalizar atraso explicitamente
  assert.equal(mt.indicators.rate_us10y.status, 'atrasado');
  assert.ok(mt.indicators.rate_us10y.lagBusinessDays >= 3);
  assert.match(mt.indicators.rate_us10y.explanation, /defasada/i);

  // VIX indisponível
  assert.equal(mt.indicators.vol_vix.status, 'indisponivel');
  assert.equal(mt.status, 'parcial');

  // Hidratação no frontend respeita separação DI × Selic
  const uiModel = new CapitalIntelligenceModel();
  uiModel.hydrateFromPipelineSnapshot(snapshot);
  const diNode = uiModel.getNodeById('trend_di');
  assert.equal(diNode.freshnessStatus, 'indisponivel');
  assert.equal(diNode.displayValue, 'DI Indisp.');
  assert.match(diNode.metricCaption, /Selic:/);
  assert.equal(uiModel.getNodeById('trend_us10y').freshnessStatus, 'atrasado');
  assert.ok(uiModel.macroTrendsDetail);
});

test('08 Macro Trends — single-day reversal does NOT override 21-session trend and future/incomplete candles are discarded', () => {
  const now = new Date('2026-11-24T15:00:00.000Z'); // 12:00 BRT (antes da PTAX 13h30 -> esperado 2026-11-23)
  const brDates = generateDates(26, '2026-11-23', 'BR');

  // Dólar sobe consistentemente +6% ao longo de 25 pregões, mas cai -1,8% no último único dia
  const fxSeries = buildSeries('fx_usd_brl', 'USDBRL', brDates, (i, len) => {
    const base = 5.50 + i * 0.016;
    return i === len - 1 ? base * 0.982 : base;
  }, 'bcb_sgs');

  // Injeta candle futuro de 2026-11-24 (antes da publicação PTAX) que deve ser rejeitado
  fxSeries.push({
    indicatorId: 'fx_usd_brl',
    symbol: 'USDBRL',
    referenceDate: '2026-11-24',
    closeValue: 4.10,
    qualityStatus: 'intraday'
  });

  const fx = macroTrends.buildSingleMacroIndicator('fx_usd_brl', fxSeries, now);
  assert.equal(fx.filteredFutureOrIncompleteCount, 1);
  assert.equal(fx.asOfDate, '2026-11-23');
  assert.ok(fx.change1dSecondary.value < -1.0, 'Último dia isolado teve queda forte');
  assert.equal(fx.trend.code, 'rising', 'Tendência de 21 pregões deve permanecer Alta apesar da queda isolada de 1 dia');
  assert.ok(fx.change21dPct > 3.0);
});
