'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const fs = require('node:fs');

const usBreadth = require('../src/us-market-breadth');
const calculator = require('../src/capital-intelligence-calculator');
const ingestion = require('../src/capital-intelligence-ingestion');
const { CapitalIntelligenceStore } = require('../src/capital-intelligence-store');
const { CapitalIntelligencePipeline } = require('../src/capital-intelligence-pipeline');
const CapitalIntelligenceModel = require('../../frontend/capital-intelligence-model');

function generateBusinessDates(startIso, count) {
  const out = [];
  let cursor = startIso;
  while (out.length < count) {
    if (ingestion.isBusinessDay(cursor, 'US')) out.push(cursor);
    cursor = ingestion.addCalendarDays(cursor, 1);
  }
  return out;
}

function makeSyntheticConstituents(dates, count, mode = 'strong') {
  const map = new Map();
  // Inclui SPY e QQQ propositalmente para validar que benchmarks são EXCLUÍDOS da amplitude
  map.set('SPY', dates.map((d, i) => ({ date: d, open: 500 + i, high: 502 + i, low: 499 + i, close: 501 + i })));
  map.set('QQQ', dates.map((d, i) => ({ date: d, open: 450 + i, high: 452 + i, low: 449 + i, close: 451 + i })));

  for (let s = 0; s < count; s++) {
    const sym = `US${String(s + 1).padStart(3, '0')}`;
    const candles = dates.map((d, i) => {
      let close;
      if (mode === 'strong') {
        // 85% dos ativos sobem consistentemente -> acima de SMA50, SMA200, A/D positivo, novas máximas 52s
        const isLeader = s < Math.round(count * 0.85);
        close = isLeader ? (100 + i * 0.45) : (100 - i * 0.15);
      } else {
        // 80% dos ativos caem -> abaixo de SMA50, SMA200, A/D negativo, novas mínimas 52s
        const isWeak = s < Math.round(count * 0.80);
        close = isWeak ? (220 - i * 0.45) : (100 + i * 0.20);
      }
      return {
        date: d,
        open: close,
        high: close * 1.01,
        low: close * 0.99,
        close
      };
    });
    map.set(sym, candles);
  }
  return map;
}

test('Market Breadth EUA (06): calcula % > SMA50, % > SMA200, A/D Line, Máx/Mín 52s, evolução 21p e exclui benchmarks', () => {
  const dates = generateBusinessDates('2025-11-10', 252);
  const lastDate = dates[dates.length - 1];
  const now = new Date(`${lastDate}T22:30:00.000Z`);

  const sp500Map = makeSyntheticConstituents(dates, 20, 'strong');
  const ndxMap = makeSyntheticConstituents(dates, 10, 'weak');

  const spRes = usBreadth.computeUniverseBreadth(sp500Map, {
    universeId: 'SP500',
    universeName: 'S&P 500',
    expectedConstituents: 20,
    now
  });
  const ndxRes = usBreadth.computeUniverseBreadth(ndxMap, {
    universeId: 'NASDAQ_100',
    universeName: 'Nasdaq-100',
    expectedConstituents: 10,
    now
  });

  // Benchmarks SPY e QQQ foram excluídos da contagem de componentes
  assert.equal(spRes.composition.coveredConstituents, 20);
  assert.equal(spRes.status, 'atualizado');
  assert.equal(spRes.latest.aboveSma50Pct, 85);
  assert.equal(spRes.latest.aboveSma200Pct, 85);
  assert.equal(spRes.latest.advances, 17);
  assert.equal(spRes.latest.declines, 3);
  assert.equal(spRes.latest.newHighs52w, 17);
  assert.equal(spRes.latest.newLows52w, 3);
  assert.equal(spRes.history21d.length, 21);
  assert.equal(spRes.history63d.length, 63);
  assert.ok(spRes.evolution21d.adLineDelta > 0);
  assert.equal(spRes.condition.code, 'strong');
  assert.equal(spRes.condition.label, 'Forte');
  assert.equal(spRes.condition.pillarsEvaluated, 4, 'Classificação multi-fator deve avaliar os 4 pilares reais');

  // Universo fraco
  assert.equal(ndxRes.latest.aboveSma50Pct, 20);
  assert.equal(ndxRes.latest.aboveSma200Pct, 20);
  assert.equal(ndxRes.condition.code, 'weak');
  assert.equal(ndxRes.condition.label, 'Fraca');
  assert.ok(ndxRes.evolution21d.adLineDelta < 0);
});

test('Market Breadth EUA (06): detecta divergência baixista (índice UP × amplitude Fraca) e divergência altista, com alerta de defasagem de datas', () => {
  const dates = generateBusinessDates('2025-11-10', 252);
  const lastDate = dates[dates.length - 1];
  const now = new Date(`${lastDate}T22:30:00.000Z`);

  const weakBreadth = usBreadth.computeUniverseBreadth(makeSyntheticConstituents(dates, 15, 'weak'), {
    universeId: 'NASDAQ_100',
    universeName: 'Nasdaq-100',
    expectedConstituents: 15,
    now
  });
  const strongBreadth = usBreadth.computeUniverseBreadth(makeSyntheticConstituents(dates, 15, 'strong'), {
    universeId: 'NASDAQ_100',
    universeName: 'Nasdaq-100',
    expectedConstituents: 15,
    now
  });

  // 1. Índice em alta (UP_QUIET) enquanto participação interna está Fraca -> Divergência Baixista
  const upCycle = {
    hasOfficialRegime: true,
    regimeLabel: 'Up – Quiet',
    direction: 'UP',
    asOfDate: lastDate,
    supportingIndicators: { return21dPct: 3.2 }
  };
  const bearishDiv = usBreadth.detectIndexVsBreadthDivergence(upCycle, weakBreadth);
  assert.equal(bearishDiv.state, 'bearish_divergence');
  assert.equal(bearishDiv.severity, 'high');
  assert.equal(bearishDiv.dateMismatchWarning, null);

  // 2. Índice em baixa (DOWN_VOLATILE) enquanto participação interna está Forte -> Divergência Altista
  const downCycle = {
    hasOfficialRegime: true,
    regimeLabel: 'Down – Volatile',
    direction: 'DOWN',
    asOfDate: lastDate,
    supportingIndicators: { return21dPct: -3.5 }
  };
  const bullishDiv = usBreadth.detectIndexVsBreadthDivergence(downCycle, strongBreadth);
  assert.equal(bullishDiv.state, 'bullish_divergence');

  // 3. Datas de referência distantes geram aviso explícito de defasagem na comparação
  const mismatchedCycle = { ...upCycle, asOfDate: '2026-12-20' };
  const mismatchDiv = usBreadth.detectIndexVsBreadthDivergence(mismatchedCycle, weakBreadth);
  assert.ok(mismatchDiv.dateMismatchWarning && mismatchDiv.dateMismatchWarning.includes('separados por'));
});

test('Market Breadth EUA (06): nunca usa um único percentual para classificar condição ampla', () => {
  // Simula apenas 1 pilar válido (somente % > SMA50, sem SMA200, sem A/D 21p, sem 52s)
  const cond = usBreadth.classifyBreadthCondition(
    { aboveSma50Pct: 80, aboveSma200Pct: null, netNewHighs52w: null },
    null
  );
  assert.equal(cond.code, null, 'Com apenas 1 pilar não deve emitir classificação Forte/Fraca');
  assert.equal(cond.label, 'Indisponível');
  assert.equal(cond.reason, 'INSUFFICIENT_MULTI_FACTOR_PILLARS');
});

test('Market Breadth EUA (06): integração real com nasdaq-daily-prices.json em disco (100 ações reais), documentando S&P 500 indisponível e defasagem', async () => {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ci-breadth-real-'));
  const store = new CapitalIntelligenceStore({ storePath: path.join(tmpDir, 'store.json'), useDatabase: false });
  const pipeline = new CapitalIntelligencePipeline({ store });

  const now = new Date('2026-11-22T17:00:00.000Z');
  const snapshot = await pipeline.bootstrapFromLocalCaches(now);
  const bu = snapshot.spheres.breadth_us;

  // Nasdaq-100 real calculado sobre os 100 componentes (QQQ excluído!)
  assert.equal(bu.universes.nasdaq100.available, true);
  assert.equal(bu.universes.nasdaq100.composition.coveredConstituents, 100);
  assert.ok(Number.isFinite(bu.universes.nasdaq100.latest.aboveSma50Pct));
  assert.ok(Number.isFinite(bu.universes.nasdaq100.latest.aboveSma200Pct));
  assert.ok(bu.universes.nasdaq100.latest.newHighs52w !== null);
  assert.equal(bu.history21d.length, 21);
  assert.equal(bu.history63d.length, 63);
  assert.ok(bu.condition.pillarsEvaluated >= 3);
  assert.ok(['Forte', 'Neutra', 'Fraca'].includes(bu.condition.label));

  // S&P 500 honestamente marcado como indisponível (0/500) sem estimativas fictícias
  assert.equal(bu.universes.sp500.available, false);
  assert.equal(bu.universes.sp500.composition.coveredConstituents, 0);
  assert.ok(bu.limitations.some(l => l.includes('S&P 500')));

  // Defasagem real frente a 2026-11-22 reportada honestamente ('atrasado')
  assert.equal(bu.status, 'atrasado');
  assert.ok(bu.lagBusinessDays > 0);
  assert.equal(bu.asOfDate, '2026-10-01');

  // Hidratação no modelo frontend
  const uiModel = new CapitalIntelligenceModel();
  uiModel.hydrateFromPipelineSnapshot(snapshot);
  const bNode = uiModel.getNodeById('breadth_us');
  assert.equal(bNode.badge, 'MARKET BREADTH (EUA)');
  assert.ok(Number.isFinite(bNode.breadthPct));
  assert.ok(Number.isFinite(bNode.breadth200Pct));
  assert.equal(bNode.freshnessStatus, 'atrasado');
  assert.equal(bNode.usBreadthDetail.history21d.length, 21);
});
