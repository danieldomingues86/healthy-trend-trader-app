/**
 * Validação estatística de edge: 1-2-3 de Compra + Inside Bar (e gatilhos isolados).
 *
 * Princípios:
 *  - Somente candles Diários (EOD); informação disponível até o fechamento da data do sinal.
 *  - Reutiliza o motor do simulador (detecção, entrada, stop, saída 2R, ambiguidade conservadora, métricas).
 *  - Ciclo de Mercado: scoreCycle() canônico (Preço > EMA 10 e > EMA 72 do índice) sobre o histórico até a data.
 *  - Força Relativa: score canônico (rank percentil 0-100 de 0,35*(m1-bench)+0,65*(m3-bench)) recalculado
 *    ponto-a-ponto com histórico até a data do sinal. Filtros apenas incluem/excluem sinais; nunca alteram o RS.
 *  - Não altera regras de entrada/saída, política de risco nem Bet Sizing.
 */
const fs = require('node:fs');
const path = require('node:path');
const model = require('../../frontend/trade-simulator-model');
const marketData = require('./market-data');
const tickerChart = require('./ticker-chart');
const { parseYearMatrix } = require('./b3-index-history');

const RS_HIGH_THRESHOLD = 80; // Radar de Oportunidades: "Força Relativa (3M) > 80"
const MIN_CLOSED_FOR_CONCLUSION = 30;
const MIN_PEERS_FOR_RS = 20;
const MANAGEMENT_SCENARIO = '2R';

const EXP = model.EXPERIMENTAL_TRIGGERS;
const TT = model.TRIGGER_TYPES;

const CANONICAL_INVENTORY = [
  { id: 'DOUBLE_INSIDE_BAR', name: TT.DOUBLE_INSIDE_BAR, inCatalog: false },
  { id: 'INSIDE_BAR', name: TT.INSIDE_BAR, inCatalog: true },
  { id: '123_COMPRA', name: TT.ONE_TWO_THREE, inCatalog: true },
  { id: 'PFR_COMPRA', name: TT.PFR_COMPRA, inCatalog: true },
  { id: 'DAVE_LANDRY', name: TT.DAVE_LANDRY, inCatalog: true },
  { id: 'RBI', name: TT.RBI, inCatalog: true }
];

function isoFromCompact(value) {
  const s = String(value);
  return /^\d{8}$/.test(s) ? `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}` : s.slice(0, 10);
}

function loadIndexSeries(symbol = 'IBOV', cacheDirectory = path.join(__dirname, '..', 'data', 'b3-index-history-cache')) {
  const rows = [];
  for (const file of fs.readdirSync(cacheDirectory)) {
    const m = file.match(new RegExp(`^b3-index-${symbol}-(\\d{4})\\.json$`));
    if (!m) continue;
    const payload = JSON.parse(fs.readFileSync(path.join(cacheDirectory, file), 'utf8'));
    for (const item of parseYearMatrix(Number(m[1]), payload)) rows.push({ date: isoFromCompact(item.date), close: item.close });
  }
  rows.sort((a, b) => a.date.localeCompare(b.date));
  return rows;
}

function loadDefaultInputs() {
  const candlesAll = tickerChart.loadB3History();
  const cache = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'data', 'market-cache.json'), 'utf8'));
  const metadataMap = {};
  const symbols = [];
  for (const item of cache.relativeStrength || []) {
    if (item.assetClass !== 'stock_ibov') continue;
    metadataMap[item.symbol] = { name: item.name || item.symbol, sector: item.sector || 'Geral' };
    if (candlesAll.has(item.symbol)) symbols.push(item.symbol);
  }
  const candlesMap = new Map(symbols.map(s => [s, candlesAll.get(s)]));
  return { candlesMap, metadataMap, symbols: symbols.sort(), indexSeries: loadIndexSeries('IBOV') };
}

/** Contexto ponto-a-ponto (apenas dados até a data informada). */
function createContextProvider({ candlesMap, symbols, indexSeries }) {
  const symbolIdx = new Map();
  for (const s of symbols) {
    const candles = candlesMap.get(s) || [];
    const dateToIdx = new Map();
    candles.forEach((c, i) => dateToIdx.set(String(c.time || c.date).slice(0, 10), i));
    symbolIdx.set(s, { candles, dateToIdx });
  }
  const indexDates = indexSeries.map(r => r.date);
  function indexCount(date) { // nº de observações com data <= date
    let lo = 0; let hi = indexDates.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (indexDates[mid] <= date) lo = mid + 1; else hi = mid; }
    return lo;
  }
  const memo = new Map();
  function dayContext(date) {
    if (memo.has(date)) return memo.get(date);
    const n = indexCount(date);
    let cycle = null;
    let rsMap = new Map();
    if (n >= 30) {
      const idxSlice = indexSeries.slice(0, n);
      cycle = marketData.scoreCycle(idxSlice).state;
      const bench = marketData.returns(idxSlice);
      const items = [];
      for (const s of symbols) {
        const { candles, dateToIdx } = symbolIdx.get(s);
        const i = dateToIdx.get(date);
        if (i == null || i < 63) continue;
        const r = marketData.returns(candles.slice(0, i + 1));
        if (!Number.isFinite(r.m1) || !Number.isFinite(r.m3) || !Number.isFinite(bench.m1) || !Number.isFinite(bench.m3)) continue;
        items.push({ symbol: s, relativeScore: (r.m1 - bench.m1) * 0.35 + (r.m3 - bench.m3) * 0.65 });
      }
      if (items.length >= MIN_PEERS_FOR_RS) {
        for (const r of marketData.rank(items)) rsMap.set(r.symbol, r.score);
      }
    }
    const ctx = { cycle, rsMap, peers: rsMap.size };
    memo.set(date, ctx);
    return ctx;
  }
  return {
    get(symbol, date) {
      const c = dayContext(date);
      return { cycle: c.cycle, rs: c.rsMap.has(symbol) ? c.rsMap.get(symbol) : null };
    },
    firstRsDate(sortedDates) {
      return sortedDates.find(d => dayContext(d).peers >= MIN_PEERS_FOR_RS) || null;
    }
  };
}

function buildScenarios() {
  const byId = id => ({ kind: 'canonical', id });
  const exp = e => ({ kind: 'experimental', id: e.id });
  const s = [];
  CANONICAL_INVENTORY.forEach((t, i) => s.push({
    key: `P${i + 1}`, group: 'Gatilhos isolados (sem filtros de contexto)', label: t.name, trigger: byId(t.id), ctx: { cycle: false, rs: false }
  }));
  s.push(
    { key: 'X1', group: '1-2-3 + Inside Bar', label: '1-2-3 + Inside Bar — sem contexto', trigger: exp(EXP.COMBO_IB_STOP), ctx: { cycle: false, rs: false } },
    { key: 'X2', group: '1-2-3 + Inside Bar', label: '1-2-3 + Inside Bar — só ciclo positivo', trigger: exp(EXP.COMBO_IB_STOP), ctx: { cycle: true, rs: false } },
    { key: 'X3', group: '1-2-3 + Inside Bar', label: '1-2-3 + Inside Bar — só RS alta', trigger: exp(EXP.COMBO_IB_STOP), ctx: { cycle: false, rs: true } },
    { key: 'X4', group: '1-2-3 + Inside Bar', label: '1-2-3 + Inside Bar — ciclo positivo + RS alta (cenário principal)', trigger: exp(EXP.COMBO_IB_STOP), ctx: { cycle: true, rs: true } },
    { key: 'X5', group: 'Sensibilidade de stop', label: '1-2-3 + Inside Bar — ciclo + RS, stop do vértice', trigger: exp(EXP.COMBO_VERTEX_STOP), ctx: { cycle: true, rs: true } },
    { key: 'C1', group: 'Controles com o mesmo contexto', label: 'Inside Bar — ciclo positivo + RS alta', trigger: byId('INSIDE_BAR'), ctx: { cycle: true, rs: true } },
    { key: 'C2', group: 'Controles com o mesmo contexto', label: '1-2-3 canônico — ciclo positivo + RS alta', trigger: byId('123_COMPRA'), ctx: { cycle: true, rs: true } },
    { key: 'C3', group: 'Controles com o mesmo contexto', label: '1-2-3 estrutural sem Inside Bar — sem contexto', trigger: exp(EXP.STRUCTURAL_123_NO_IB), ctx: { cycle: false, rs: false } },
    { key: 'C4', group: 'Controles com o mesmo contexto', label: '1-2-3 estrutural sem Inside Bar — ciclo positivo + RS alta', trigger: exp(EXP.STRUCTURAL_123_NO_IB), ctx: { cycle: true, rs: true } }
  );
  return s;
}

function mean(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : null; }
function median(a) {
  if (!a.length) return null;
  const s = [...a].sort((x, y) => x - y); const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
function sd(a) {
  if (a.length < 2) return null;
  const m = mean(a);
  return Math.sqrt(a.reduce((acc, v) => acc + (v - m) ** 2, 0) / (a.length - 1));
}
const r2 = v => (v == null || !Number.isFinite(v) ? null : Math.round(v * 100) / 100);
const r1 = v => (v == null || !Number.isFinite(v) ? null : Math.round(v * 10) / 10);

function summarize(sims, candlesMap) {
  const stats = model.calculateSimulatorStats(sims);
  const S = model.STATUS;
  const executed = sims.filter(s => [S.IN_OPERATION, S.CLOSED_GAIN, S.CLOSED_LOSS].includes(s.status));
  const closed = sims.filter(s => s.status === S.CLOSED_GAIN || s.status === S.CLOSED_LOSS);
  const closedR = closed.map(s => Number(s.resultR) || 0);
  const exCount = executed.length;
  const hit = key => executed.map(s => s[key]).filter(v => v != null && v > 0);
  const tttStat = key => {
    const v = hit(key);
    return { hits: v.length, pctOfExecuted: exCount ? r1((v.length / exCount) * 100) : null, mean: v.length ? r1(mean(v)) : null, median: v.length ? r1(median(v)) : null };
  };
  // Diagnóstico de gaps (convenções existentes: entrada executada ao preço planejado; saída no stop planejado).
  let gapEntries = 0; let gapStops = 0;
  for (const s of executed) {
    const candles = candlesMap.get(s.symbol) || [];
    const ec = candles.find(c => String(c.time || c.date).slice(0, 10) === String(s.entryDate).slice(0, 10));
    if (ec && Number(ec.open) > Number(s.entryPrice)) gapEntries++;
    if (s.status === S.CLOSED_LOSS && s.exitDate) {
      const xc = candles.find(c => String(c.time || c.date).slice(0, 10) === String(s.exitDate).slice(0, 10));
      if (xc && Number(xc.open) < Number(s.currentStop || s.stopLoss)) gapStops++;
    }
  }
  const m = mean(closedR); const s0 = sd(closedR);
  const se = s0 != null && closedR.length > 1 ? s0 / Math.sqrt(closedR.length) : null;
  return {
    counts: {
      signals: sims.length,
      pendingEntry: stats.waitingCount,
      notTriggered: stats.notTriggeredCount,
      executed: exCount,
      open: stats.inOperationCount,
      closed: closed.length
    },
    lowSample: closed.length < MIN_CLOSED_FOR_CONCLUSION,
    winRate: closed.length ? stats.winRate : null,
    avgWinR: stats.winningTradesCount ? stats.avgWinR : null,
    avgLossR: stats.losingTradesCount ? -stats.avgLossR : null,
    winLossRatio: stats.avgLossR > 0 && stats.avgWinR > 0 ? r2(stats.avgWinR / stats.avgLossR) : null,
    profitFactor: closed.length ? (stats.totalLossesR > 0 ? stats.profitFactor : null) : null,
    expectancyR: closed.length ? stats.expectancyR : null,
    expectancyCi95: se != null ? [r2(m - 1.96 * se), r2(m + 1.96 * se)] : null,
    totalR: closed.length ? stats.totalR : null,
    cumulativeResultR: closed.length ? stats.totalR : null,
    maxDrawdownR: closed.length ? stats.maxDrawdownR : null,
    maxConsecutiveLosses: closed.length ? stats.maxConsecutiveLosses : null,
    avgMfeR: exCount ? r2(mean(executed.map(s => Number(s.mfeR) || 0))) : null,
    avgMaeR: exCount ? r2(mean(executed.map(s => Number(s.maeR) || 0))) : null,
    ttt: { '1R': tttStat('ttt1R'), '2R': tttStat('ttt2R'), '3R': tttStat('ttt3R') },
    avgDurationDays: stats.avgDurationDays,
    gapDiagnostics: { entriesWithGapAbovePlanned: gapEntries, stopsWithGapBelowStop: gapStops },
    _closedR: closedR
  };
}

function welch(a, b) {
  if (a.length < 2 || b.length < 2) return null;
  const va = sd(a) ** 2 / a.length; const vb = sd(b) ** 2 / b.length;
  const den = Math.sqrt(va + vb);
  if (!den) return null;
  return r2((mean(a) - mean(b)) / den);
}

function compare(label, A, B) {
  const delta = A.expectancyR != null && B.expectancyR != null ? r2(A.expectancyR - B.expectancyR) : null;
  const z = welch(A._closedR, B._closedR);
  const enough = !A.lowSample && !B.lowSample;
  let verdict;
  if (delta == null) verdict = 'Sem dados suficientes para comparar.';
  else if (!enough) verdict = `Amostra insuficiente (< ${MIN_CLOSED_FOR_CONCLUSION} encerrados em ao menos um cenário): diferença de ${delta}R não é conclusiva.`;
  else if (z != null && Math.abs(z) < 1.96) verdict = `Diferença de ${delta}R na expectancy não é estatisticamente distinguível de zero (z=${z}).`;
  else verdict = `Diferença de ${delta}R na expectancy com z=${z} (indicativo; sujeito a limitações listadas).`;
  return { question: label, expectancyDeltaR: delta, winRateDelta: A.winRate != null && B.winRate != null ? r1(A.winRate - B.winRate) : null, z, sampleA: A.counts.closed, sampleB: B.counts.closed, verdict };
}

function partitionByContext(sims, tags, cycleOnly = false) {
  const pass = []; const fail = [];
  for (const s of sims) {
    const t = tags.get(`${s.symbol}|${s.signalDate}`);
    const ok = t && t.cycle === 'healthy' && (cycleOnly || (t.rs != null && t.rs > RS_HIGH_THRESHOLD));
    (ok ? pass : fail).push(s);
  }
  return { pass, fail };
}

function runEdgeValidation(inputs = loadDefaultInputs(), options = {}) {
  const { candlesMap, metadataMap, symbols, indexSeries } = inputs;
  const provider = createContextProvider({ candlesMap, symbols, indexSeries });

  const allDates = new Set();
  for (const s of symbols) for (const c of candlesMap.get(s) || []) allDates.add(String(c.time || c.date).slice(0, 10));
  const sortedDates = [...allDates].filter(d => model.isTradingDay(d)).sort();
  const startDate = options.startDate || provider.firstRsDate(sortedDates);
  const endDate = options.endDate || sortedDates[sortedDates.length - 1];

  const detectMemo = new Map();
  const detectAll = (slice, info) => {
    const key = `${info.symbol}|${info.date}`;
    if (!detectMemo.has(key)) detectMemo.set(key, model.detectAllSetupTriggers(slice, { includeExperimental: true }));
    return detectMemo.get(key);
  };

  const tags = new Map(); // contexto do sinal (para partições e consistência por regime)
  const scenarios = buildScenarios();
  const results = [];
  for (const sc of scenarios) {
    let candidates = 0; let rejectedByContext = 0; let contextUnavailable = 0;
    const generated = model.generateHistoricalSimulations({
      candlesMap, metadataMap, symbols,
      targetVolume: 'MAX', startDate, endDate, scenario: MANAGEMENT_SCENARIO, universe: 'IBOV_PIT',
      detectTrigger: (slice, info) => detectAll(slice, info).find(t => t.id === sc.trigger.id) || null,
      signalFilter: ({ symbol, date }) => {
        candidates++;
        const ctx = provider.get(symbol, date);
        tags.set(`${symbol}|${date}`, ctx);
        if (sc.ctx.cycle && ctx.cycle !== 'healthy') { rejectedByContext++; return false; }
        if (sc.ctx.rs) {
          if (ctx.rs == null) { contextUnavailable++; return false; }
          if (!(ctx.rs > RS_HIGH_THRESHOLD)) { rejectedByContext++; return false; }
        }
        return true;
      }
    });
    const sims = generated.simulations;
    results.push({
      ...sc,
      candidateSignalsBeforeContext: candidates,
      rejectedByContext,
      contextUnavailable,
      rejectedByIntegrity: generated.meta.rejectedSignalsCount,
      sims,
      summary: summarize(sims, candlesMap)
    });
  }

  const get = key => results.find(r => r.key === key);
  const comparisons = [
    compare('O 1-2-3 + Inside Bar (ciclo+RS) supera o 1-2-3 canônico isolado? [X4 vs P3]', get('X4').summary, get('P3').summary),
    compare('... supera o 1-2-3 estrutural sem Inside Bar com o mesmo contexto? [X4 vs C4]', get('X4').summary, get('C4').summary),
    compare('... supera a Inside Bar isolada (sem contexto)? [X4 vs P2]', get('X4').summary, get('P2').summary),
    compare('... supera a Inside Bar com o mesmo contexto? [X4 vs C1]', get('X4').summary, get('C1').summary),
    compare('Contexto (ciclo+RS) acrescenta valor ao 1-2-3 + Inside Bar? [X4 vs X1]', get('X4').summary, get('X1').summary),
    compare('Só ciclo positivo vs sem contexto [X2 vs X1]', get('X2').summary, get('X1').summary),
    compare('Só RS alta vs sem contexto [X3 vs X1]', get('X3').summary, get('X1').summary),
    compare('Sensibilidade: stop do vértice vs stop da Inside Bar [X5 vs X4]', get('X5').summary, get('X4').summary)
  ];

  // Mesma amostra particionada por contexto (sem mudar quais trades existem)
  const partitions = ['X1', 'P2', 'P3', 'C3'].map(key => {
    const r = get(key);
    const full = partitionByContext(r.sims, tags, false);
    const cycleOnly = partitionByContext(r.sims, tags, true);
    return {
      scenario: `${key} — ${r.label}`,
      cycleAndRsPass: summarize(full.pass, candlesMap),
      cycleAndRsFail: summarize(full.fail, candlesMap),
      cyclePositive: summarize(cycleOnly.pass, candlesMap),
      cycleNotPositive: summarize(cycleOnly.fail, candlesMap)
    };
  });

  // Consistência temporal: metades cronológicas do período
  const mid = sortedDates[Math.floor((sortedDates.indexOf(startDate) + sortedDates.length) / 2)];
  const consistency = ['X4', 'X1', 'P2', 'P3'].map(key => {
    const r = get(key);
    const h1 = r.sims.filter(s => s.signalDate < mid);
    const h2 = r.sims.filter(s => s.signalDate >= mid);
    return { scenario: `${key} — ${r.label}`, splitDate: mid, firstHalf: summarize(h1, candlesMap), secondHalf: summarize(h2, candlesMap) };
  });

  const strip = o => JSON.parse(JSON.stringify(o, (k, v) => (k === '_closedR' || k === 'sims' ? undefined : v)));
  return strip({
    meta: {
      generatedAt: new Date().toISOString(),
      engineVersion: model.SIMULATOR_ENGINE_VERSION,
      timeframe: 'Diário (EOD)',
      managementScenario: MANAGEMENT_SCENARIO,
      universe: `Ações IBOV (${symbols.length} ativos, composição atual do Ibovespa — vide viés de sobrevivência)`,
      period: { start: startDate, end: endDate, tradingSessions: sortedDates.filter(d => d >= startDate && d <= endDate).length, firstSessionInDataset: sortedDates[0] },
      contextRules: {
        cycle: 'Ciclo positivo = scoreCycle(IBOV) "healthy" (fechamento > EMA 10 e > EMA 72) com histórico até a data do sinal.',
        rs: `RS alta = score canônico de Força Relativa (rank percentil 0-100, 0,35*Δ1M + 0,65*Δ3M vs IBOV) > ${RS_HIGH_THRESHOLD}, recalculado ponto-a-ponto na data do sinal entre os ativos do universo (mín. ${MIN_PEERS_FOR_RS} pares).`,
        trend: 'Preço >= EMA 10 e >= EMA 72 do ativo é pré-condição do detector canônico e vale para TODOS os cenários.'
      },
      minClosedForConclusion: MIN_CLOSED_FOR_CONCLUSION
    },
    inventory: CANONICAL_INVENTORY,
    scenarios: results.map(r => ({
      key: r.key, group: r.group, label: r.label, triggerId: r.trigger.id, contextFilters: r.ctx,
      candidateSignalsBeforeContext: r.candidateSignalsBeforeContext,
      rejectedByContext: r.rejectedByContext, contextUnavailable: r.contextUnavailable,
      rejectedByIntegrity: r.rejectedByIntegrity,
      summary: r.summary
    })),
    comparisons,
    partitions,
    consistency
  });
}

module.exports = {
  runEdgeValidation, loadDefaultInputs, loadIndexSeries, createContextProvider, buildScenarios,
  summarize, compare, CANONICAL_INVENTORY, RS_HIGH_THRESHOLD
};
