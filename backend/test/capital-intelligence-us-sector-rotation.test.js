'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const usSectorRotation = require('../src/us-sector-rotation');
const calculator = require('../src/capital-intelligence-calculator');
const { US_SECTOR_IDS, shiftBusinessDays } = require('../src/capital-intelligence-ingestion');
const CapitalIntelligenceModel = require('../../frontend/capital-intelligence-model');

function generateUsTradingDates(count, endDate = '2026-11-20') {
  const dates = [];
  let cursor = endDate;
  for (let i = 0; i < count; i++) {
    dates.push(cursor);
    cursor = shiftBusinessDays(cursor, -1, 'US');
  }
  return dates.reverse();
}

function buildDailySeries(indicatorId, symbol, dates, priceFn, extraMeta = {}) {
  return dates.map((refDate, idx) => {
    const close = Number(priceFn(idx, dates.length).toFixed(4));
    return {
      indicatorId,
      symbol,
      referenceDate: refDate,
      closeValue: close,
      collectedAt: '2026-11-20T22:10:00.000Z',
      sourceProvider: 'twelve_data',
      qualityStatus: 'valid',
      metadata: extraMeta
    };
  });
}

test('07 US Sector Rotation — calculates 21p & 63p relative strength vs SPY, classifies strengthening/neutral/weakening, and preserves thematic clusters', () => {
  const now = new Date('2026-11-20T22:30:00.000Z'); // Sexta 17:30 NY (pregão 2026-11-20 fechado)
  const dates = generateUsTradingDates(70, '2026-11-20');

  // SPY sobe +2,0% nos últimos 21p e +6,0% em 63p
  const spySeries = buildDailySeries('cycle_us_sp500', 'SPY', dates, (i) => 500 * Math.pow(1.00095, i));

  // Constrói os 12 ETFs setoriais com trajetórias distintas
  const seriesById = { cycle_us_sp500: spySeries };
  const dailyMultipliers = {
    sec_us_xle: 1.0042,  // Energia: forte fortalecimento vs SPY
    sec_us_xlv: 1.0029,  // Saúde: fortalecendo
    sec_us_xlf: 1.0024,  // Financeiro: fortalecendo
    sec_us_xlp: 1.0012,  // Consumo Básico: neutro
    sec_us_xlu: 1.0010,  // Utilities: neutro
    sec_us_xli: 1.0009,  // Industriais: neutro
    sec_us_xlb: 1.0008,  // Materiais: neutro
    sec_us_xlre: 1.0007, // Imobiliário: neutro
    sec_us_xlc: 1.0005,  // Comunicação: neutro
    sec_us_xly: 0.9990,  // Consumo Discricionário: enfraquecendo
    sec_us_xlk: 0.9978,  // Tecnologia / IA: enfraquecendo
    sec_us_smh: 0.9968   // Semicondutores: forte enfraquecimento
  };

  for (const id of US_SECTOR_IDS) {
    const sym = id.replace('sec_us_', '').toUpperCase();
    const mult = dailyMultipliers[id];
    seriesById[id] = buildDailySeries(id, sym, dates, (i) => 100 * Math.pow(mult, i));
  }

  const dim = usSectorRotation.buildUsSectorRotationDimension(seriesById, { now });

  assert.equal(dim.id, 'sector_rotation_us');
  assert.equal(dim.status, 'atualizado');
  assert.equal(dim.asOfDate, '2026-11-20');
  assert.equal(dim.lagBusinessDays, 0);
  assert.equal(dim.summaryCounts.totalCataloged, 12);
  assert.equal(dim.summaryCounts.covered, 12);
  assert.equal(dim.summaryCounts.classified21d, 12);

  // Benchmark SPY rastreável
  assert.equal(dim.benchmark.symbol, 'SPY');
  assert.equal(dim.benchmark.status, 'atualizado');
  assert.ok(Number.isFinite(dim.benchmark.return21dPct));
  assert.ok(Number.isFinite(dim.benchmark.return63dPct));

  // Classificação coerente
  const bySym = Object.fromEntries(dim.sectors.map(s => [s.symbol, s]));
  assert.equal(bySym.XLE.rotationState, 'strengthening');
  assert.equal(bySym.XLE.rotationColor, '#10b981');
  assert.equal(bySym.XLV.rotationState, 'strengthening');
  assert.equal(bySym.XLF.rotationState, 'strengthening');

  assert.equal(bySym.XLP.rotationState, 'neutral');
  assert.equal(bySym.XLP.rotationColor, '#94a3b8');

  assert.equal(bySym.XLK.rotationState, 'weakening');
  assert.equal(bySym.XLK.rotationColor, '#ef4444');
  assert.equal(bySym.SMH.rotationState, 'weakening');
  assert.equal(bySym.XLY.rotationState, 'weakening');

  // Ordenação estrita por Δ vs SPY (21p) decrescente
  assert.equal(dim.sectors[0].symbol, 'XLE');
  assert.equal(dim.sectors[dim.sectors.length - 1].symbol, 'SMH');
  assert.equal(dim.leader.symbol, 'XLE');
  assert.equal(dim.laggard.symbol, 'SMH');

  // Série RS normalizada de 21 pregões e contexto 63p presentes
  assert.equal(bySym.XLE.rsSeries21d.length, 21);
  assert.equal(bySym.XLE.rsSeries21d[0].rsIndex, 100);
  assert.ok(bySym.XLE.rsSeries21d[20].rsIndex > 100);
  assert.ok(Number.isFinite(bySym.XLE.excessReturnVsSpy63dPct));

  // Clusters temáticos comparam Tecnologia/IA, Semis, Energia, Saúde, Financeiro e Consumo
  assert.equal(dim.clusterComparison.length, 5);
  const techCluster = dim.clusterComparison.find(c => c.cluster.includes('Tecnologia'));
  const energyCluster = dim.clusterComparison.find(c => c.cluster.includes('Energia'));
  assert.ok(techCluster.symbols.includes('XLK') && techCluster.symbols.includes('SMH'));
  assert.ok(energyCluster.avgExcessVsSpy21dPct > techCluster.avgExcessVsSpy21dPct);

  // Epistemologia: desempenho relativo de preço, NUNCA fluxo líquido de fundos
  assert.equal(dim.metricNature, 'price_performance');
  assert.equal(dim.isCapitalFlowData, false);
  assert.match(dim.disclaimerNote, /não comprova entrada líquida/i);
  assert.equal(dim.colorLegend.length, 3);
  assert.ok(dim.methodology.benchmark.includes('SPY'));
});

test('07 US Sector Rotation — single-day spike does NOT override 21-session weakening rotation or ranking', () => {
  const now = new Date('2026-11-20T22:30:00.000Z');
  const dates = generateUsTradingDates(30, '2026-11-20');

  // SPY estável em 500
  const spySeries = buildDailySeries('cycle_us_sp500', 'SPY', dates, () => 500);

  // XLE sobe de forma consistente +8% em 21p, mas cai -1,5% no último pregão
  const xleSeries = buildDailySeries('sec_us_xle', 'XLE', dates, (i, len) => {
    const base = 100 + i * 0.45;
    return i === len - 1 ? base * 0.985 : base;
  });

  // SMH cai -12% ao longo de 20 pregões, mas salta +4,5% no último único pregão
  const smhSeries = buildDailySeries('sec_us_smh', 'SMH', dates, (i, len) => {
    const base = 100 - i * 0.55;
    return i === len - 1 ? base * 1.045 : base;
  });

  const dim = usSectorRotation.buildUsSectorRotationDimension({
    cycle_us_sp500: spySeries,
    sec_us_xle: xleSeries,
    sec_us_smh: smhSeries
  }, { now });

  const bySym = Object.fromEntries(dim.sectors.map(s => [s.symbol, s]));
  // Verifica que SMH teve alta forte de 1 dia enquanto XLE caiu no dia
  assert.ok(bySym.SMH.return1dPctSecondary > 3.5);
  assert.ok(bySym.XLE.return1dPctSecondary < -0.5);

  // Mas na rotação de 21p, XLE continua liderando e fortalecendo, e SMH continua enfraquecendo!
  assert.equal(bySym.XLE.rotationState, 'strengthening');
  assert.equal(bySym.SMH.rotationState, 'weakening');
  assert.equal(dim.sectors[0].symbol, 'XLE');
  assert.equal(dim.sectors[1].symbol, 'SMH');
});

test('07 US Sector Rotation — rejects future/incomplete candles and reports partial or unavailable coverage honestly', () => {
  const now = new Date('2026-11-20T18:00:00.000Z'); // 13:00 NY (antes das 16:45 ET -> esperado 2026-11-19)
  const dates = generateUsTradingDates(26, '2026-11-19');

  const spySeries = buildDailySeries('cycle_us_sp500', 'SPY', dates, (i) => 500 + i * 0.5);
  const xlkSeries = buildDailySeries('sec_us_xlk', 'XLK', dates, (i) => 200 + i * 0.9);

  // Injeta candle futuro/intraday de 2026-11-20 que DEVE ser descartado
  xlkSeries.push({
    indicatorId: 'sec_us_xlk',
    symbol: 'XLK',
    referenceDate: '2026-11-20',
    closeValue: 399,
    qualityStatus: 'intraday'
  });

  const partialDim = usSectorRotation.buildUsSectorRotationDimension({
    cycle_us_sp500: spySeries,
    sec_us_xlk: xlkSeries
  }, { now });

  assert.equal(partialDim.status, 'parcial'); // apenas 1/12 setores disponíveis
  assert.equal(partialDim.summaryCounts.covered, 1);
  assert.equal(partialDim.missingSectors.length, 11);
  assert.equal(partialDim.asOfDate, '2026-11-19');
  assert.equal(partialDim.provenance.filteredFutureOrIncompleteCount, 1);
  assert.equal(partialDim.sectors[0].latestClose, Number((200 + 25 * 0.9).toFixed(2)));

  // Sem séries -> indisponível sem estimativas fictícias
  const emptyDim = usSectorRotation.buildUsSectorRotationDimension({}, { now });
  assert.equal(emptyDim.status, 'indisponivel');
  assert.equal(emptyDim.sectors.length, 0);
  assert.equal(emptyDim.summaryCounts.covered, 0);
});

test('07 US Sector Rotation — integrates cleanly into buildDailySnapshot and frontend CapitalIntelligenceModel', () => {
  const now = new Date('2026-11-20T22:30:00.000Z');
  const dates = generateUsTradingDates(30, '2026-11-20');

  const seriesById = {
    cycle_us_sp500: buildDailySeries('cycle_us_sp500', 'SPY', dates, (i) => 500 + i * 0.4),
    sec_us_xle: buildDailySeries('sec_us_xle', 'XLE', dates, (i) => 90 + i * 0.6),
    sec_us_xlk: buildDailySeries('sec_us_xlk', 'XLK', dates, (i) => 220 - i * 0.4),
    sec_us_xlv: buildDailySeries('sec_us_xlv', 'XLV', dates, (i) => 140 + i * 0.12)
  };

  const snapshot = calculator.buildDailySnapshot(seriesById, { now });
  assert.equal(snapshot.spheres.sector_rotation_us.id, 'sector_rotation_us');
  assert.equal(snapshot.spheres.sector_rotation_us.benchmark.symbol, 'SPY');
  assert.equal(snapshot.spheres.sector_rotation_us.leader.symbol, 'XLE');
  assert.equal(snapshot.spheres.sector_rotation_us.laggard.symbol, 'XLK');
  assert.equal(snapshot.spheres.sector_rotation_us.isCapitalFlowData, false);

  // Hidrata modelo frontend
  const model = new CapitalIntelligenceModel();
  model.hydrateFromPipelineSnapshot(snapshot);
  const node = model.getNodeById('sector_rotation_us');

  assert.ok(node.usSectorRotationDetail);
  assert.equal(node.usSectorRotationDetail.leader.symbol, 'XLE');
  assert.equal(node.usSectorRotationDetail.summaryCounts.strengthening, 1);
  assert.equal(node.usSectorRotationDetail.summaryCounts.weakening, 1);
  assert.match(node.displayValue, /Energia/i);
  assert.match(node.metricCaption, /vs SPY \(21p\)/);
  assert.equal(node.usSectorRotationDetail.isCapitalFlowData, false);
});
