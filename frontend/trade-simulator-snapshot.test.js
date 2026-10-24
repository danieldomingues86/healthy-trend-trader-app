/**
 * Fidelidade do Snapshot do Trade (Simulador de Trades)
 * Execução com: node --test frontend/trade-simulator-snapshot.test.js
 *
 * O snapshot precisa ser uma representação verificável do histórico real do ativo no momento do sinal:
 * sem candles artificiais, sem look-ahead e com divergências/indisponibilidade sinalizadas explicitamente.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const model = require('./trade-simulator-model.js');

// ---------------------------------------------------------------------------------------------------
// Fixture: histórico diário (apenas pregões B3 válidos) com 1-2-3 de Compra no candle de índice 42
// ---------------------------------------------------------------------------------------------------
function tradingDates(startIso, count) {
  const out = [];
  const d = new Date(`${startIso}T12:00:00Z`);
  while (out.length < count) {
    const iso = d.toISOString().slice(0, 10);
    if (model.isTradingDay(iso)) out.push(iso);
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

function buildHistory(kind = '123') {
  const dates = tradingDates('2026-03-02', 53);
  const rows = [];
  for (let i = 0; i < 40; i++) {
    const base = 20 + i * 0.3;
    rows.push([base - 0.1, base + 0.4, base - 0.35, base + 0.15]);
  }
  if (kind === '123') {
    rows.push([31.9, 32.3, 31.4, 32.0]); // 40 -> candle 1
    rows.push([32.0, 32.2, 30.8, 31.6]); // 41 -> vértice (mínima mais baixa)
    rows.push([31.5, 32.6, 31.1, 32.5]); // 42 -> sinal (mínima > vértice, fechamento > máxima do vértice)
  } else {
    rows.push([31.9, 32.3, 31.4, 32.0]); // 40
    rows.push([31.8, 33.0, 31.0, 32.7]); // 41 -> candle-mãe
    rows.push([32.5, 32.8, 31.4, 32.6]); // 42 -> Inside Bar (sinal)
  }
  rows.push([32.4, 32.9, 32.2, 32.8]); // 43 entrada
  rows.push([32.8, 34.0, 32.7, 33.9]);
  rows.push([33.9, 35.0, 33.5, 34.8]);
  rows.push([34.8, 36.4, 34.5, 36.2]); // alvo 2R
  rows.push([36.2, 36.6, 35.8, 36.4]);
  rows.push([36.4, 36.9, 36.0, 36.7]);
  rows.push([36.7, 37.2, 36.3, 37.0]);
  rows.push([37.0, 37.4, 36.6, 37.1]);
  rows.push([37.1, 37.5, 36.8, 37.3]);
  rows.push([37.3, 37.8, 37.0, 37.6]);
  return rows.map((r, i) => ({ time: dates[i], open: r[0], high: r[1], low: r[2], close: r[3], volume: 1000 + i }));
}

function buildSim(history) {
  const signalIdx = 42;
  const slice = history.slice(0, signalIdx + 1);
  const all = model.detectAllSetupTriggers(slice, { includeExperimental: true });
  return { slice, all, signalIdx };
}

function evaluatedSim(history, triggerId) {
  const { slice, all, signalIdx } = buildSim(history);
  const trigger = all.find(t => t.id === triggerId);
  assert.ok(trigger, `fixture deve produzir o gatilho ${triggerId}`);
  const raw = {
    id: `sim-fixture-${triggerId}`,
    symbol: 'TEST3',
    triggerName: trigger.name,
    grade: 'A',
    signalDate: slice[signalIdx].time,
    entryPrice: trigger.entry,
    stopLoss: trigger.stop,
    status: model.STATUS.WAITING_ENTRY,
    managementScenario: '2R',
    timeline: []
  };
  return model.evaluateSimulationOnCandles(raw, history.slice(signalIdx), '2R');
}

test('snapshot: candles exibidos são EXATAMENTE os OHLCV históricos reais (nenhum candle criado)', () => {
  const history = buildHistory();
  const sim = evaluatedSim(history, '123_COMPRA');
  const snap = model.buildSimulationSnapshot(sim, history, { source: 'fixture' });

  assert.equal(snap.available, true);
  const byDate = new Map(history.map(c => [c.time, c]));
  assert.ok(snap.candles.length > 10);
  snap.candles.forEach((c) => {
    const real = byDate.get(c.time);
    assert.ok(real, `candle ${c.time} deve existir no histórico real`);
    assert.equal(c.open, real.open);
    assert.equal(c.high, real.high);
    assert.equal(c.low, real.low);
    assert.equal(c.close, real.close);
  });
  // datas estritamente crescentes e consecutivas no histórico (sem lacunas preenchidas)
  const idxs = snap.candles.map(c => history.findIndex(h => h.time === c.time));
  idxs.forEach((v, i) => { if (i > 0) assert.equal(v, idxs[i - 1] + 1); });
});

test('snapshot: ativo, data do sinal e timeframe diário estão corretos', () => {
  const history = buildHistory();
  const sim = evaluatedSim(history, '123_COMPRA');
  const snap = model.buildSimulationSnapshot(sim, history);
  assert.equal(snap.symbol, 'TEST3');
  assert.equal(snap.timeframe, '1D');
  assert.equal(snap.signalDate, history[42].time);
  assert.equal(snap.candles[snap.signalIndex].time, history[42].time);
  assert.equal(snap.candles.filter(c => c.isSignal).length, 1);
  assert.ok(snap.candles.slice(0, snap.signalIndex + 1).every(c => c.phase === 'context'));
  assert.ok(snap.candles.slice(snap.signalIndex + 1).every(c => c.phase === 'post'));
});

test('snapshot: entrada, stop, entrada executada e saída correspondem ao registro da simulação', () => {
  const history = buildHistory();
  const sim = evaluatedSim(history, '123_COMPRA');
  assert.equal(sim.status, model.STATUS.CLOSED_GAIN);
  const snap = model.buildSimulationSnapshot(sim, history);

  assert.equal(snap.levels.entryPlanned, sim.entryPrice);
  assert.equal(snap.levels.stopInitial, sim.stopLoss);
  assert.equal(snap.levels.executedEntry, sim.executedEntryPrice);
  assert.equal(snap.levels.exitPrice, sim.exitPrice);

  const entryEv = snap.events.find(e => e.type === 'ENTRY');
  const exitEv = snap.events.find(e => e.type === 'EXIT');
  assert.equal(entryEv.time, sim.entryDate);
  assert.equal(entryEv.price, sim.executedEntryPrice);
  assert.equal(exitEv.time, sim.exitDate);
  assert.equal(exitEv.price, sim.exitPrice);
  assert.equal(snap.candles.find(c => c.isEntry).time, sim.entryDate);
  assert.equal(snap.candles.find(c => c.isExit).time, sim.exitDate);
  assert.equal(snap.verification.status, 'VERIFIED', JSON.stringify(snap.verification.checks));
});

test('snapshot: EMAs 10/72 são calculadas com os dados disponíveis em cada data', () => {
  const history = buildHistory();
  const sim = evaluatedSim(history, '123_COMPRA');
  const snap = model.buildSimulationSnapshot(sim, history);
  const closes = history.map(c => c.close);
  // referência independente: EMA clássica semeada no primeiro fechamento
  const ref = (period) => {
    const k = 2 / (period + 1);
    const out = [closes[0]];
    for (let i = 1; i < closes.length; i++) out.push(closes[i] * k + out[i - 1] * (1 - k));
    return out;
  };
  const r10 = ref(10);
  const r72 = ref(72);
  snap.candles.forEach((c) => {
    const i = history.findIndex(h => h.time === c.time);
    assert.ok(Math.abs((c.ema10 ?? c.ema9) - r10[i]) <= 0.006, `EMA10 em ${c.time}`);
    assert.ok(Math.abs((c.ema72 ?? c.ema30) - r72[i]) <= 0.006, `EMA72 em ${c.time}`);
  });
});

test('snapshot 1-2-3: pontos 1, 2 e 3 correspondem à lógica efetiva do detector e usam só candles até o sinal', () => {
  const history = buildHistory();
  const sim = evaluatedSim(history, '123_COMPRA');
  const snap = model.buildSimulationSnapshot(sim, history);

  assert.equal(snap.triggerId, '123_COMPRA');
  assert.deepEqual(snap.patternMarkers.map(m => m.role), ['1', '2', '3']);
  const [p1, p2, p3] = snap.patternMarkers;
  assert.equal(p1.time, history[40].time);
  assert.equal(p2.time, history[41].time);
  assert.equal(p3.time, history[42].time);
  assert.equal(p2.price, history[41].low, 'vértice na mínima real do candle 2');
  assert.ok(p2.price < p1.price && p3.price > p2.price, 'estrutura: mínima do 2 < mínima do 1 e mínima do 3 > mínima do 2');
  assert.ok(history[42].close > history[41].high, 'sinal fecha acima da máxima do vértice (regra do detector)');
  assert.ok(snap.patternMarkers.every(m => m.index <= snap.signalIndex), 'nenhum ponto após o candle do sinal');
});

test('snapshot: candles futuros NÃO influenciam contexto, EMAs, detecção nem marcadores', () => {
  const history = buildHistory();
  const sim = evaluatedSim(history, '123_COMPRA');
  const baseline = model.buildSimulationSnapshot(sim, history);

  // 1) adulterar violentamente tudo após o sinal
  const tampered = history.map((c, i) => (i <= 42 ? c : { ...c, open: c.open * 0.2, high: c.high * 3, low: c.low * 0.1, close: c.close * 0.3 }));
  const waiting = { ...sim, status: model.STATUS.WAITING_ENTRY, entryDate: null, executedEntryPrice: null, exitDate: null, exitPrice: null };
  const snapTampered = model.buildSimulationSnapshot(waiting, tampered);

  // 2) histórico truncado exatamente no sinal
  const snapTruncated = model.buildSimulationSnapshot(waiting, history.slice(0, 43));

  [snapTampered, snapTruncated].forEach((s) => {
    assert.equal(s.available, true);
    assert.equal(s.verification.checks.find(c => c.id === 'TRIGGER_REDETECTED').level, 'ok');
    assert.deepEqual(s.patternMarkers, baseline.patternMarkers);
    const ctxBase = baseline.candles.filter(c => c.phase === 'context');
    const ctx = s.candles.filter(c => c.phase === 'context');
    assert.deepEqual(ctx, ctxBase.map(c => ({ ...c, isEntry: false, isExit: false })));
  });
});

test('snapshot: ausência de histórico gera indisponibilidade explícita (nunca candles artificiais)', () => {
  const history = buildHistory();
  const sim = evaluatedSim(history, '123_COMPRA');

  const none = model.buildSimulationSnapshot(sim, []);
  assert.equal(none.available, false);
  assert.equal(none.reason, 'NO_HISTORY');
  assert.equal(none.candles, undefined);
  assert.equal(none.verification.status, 'UNVERIFIED');
  assert.ok(/artificialmente/.test(none.message));

  const nullHist = model.buildSimulationSnapshot(sim, null);
  assert.equal(nullHist.available, false);

  const missingSignal = model.buildSimulationSnapshot({ ...sim, signalDate: '2031-01-02' }, history);
  assert.equal(missingSignal.available, false);
  assert.equal(missingSignal.reason, 'SIGNAL_DATE_NOT_IN_HISTORY');

  const shortCtx = model.buildSimulationSnapshot({ ...sim, signalDate: history[1].time }, history);
  assert.equal(shortCtx.available, false);
  assert.equal(shortCtx.reason, 'INSUFFICIENT_CONTEXT');
});

test('snapshot: candles inválidos são descartados e reportados, nunca "consertados" ou interpolados', () => {
  const history = buildHistory();
  const sim = evaluatedSim(history, '123_COMPRA');
  const corrupted = history.map((c, i) => (i === 10 ? { ...c, high: NaN } : c));
  const snap = model.buildSimulationSnapshot(sim, corrupted);
  assert.equal(snap.available, true);
  assert.ok(!snap.candles.some(c => c.time === history[10].time), 'candle inválido não pode ser reconstruído');
  assert.ok(/descartado/.test(snap.verification.checks.find(c => c.id === 'HISTORY').detail));

  const { candles, rejectedCount } = model.normalizeSnapshotHistory([{ time: 'x', open: 1, high: 2, low: 1, close: 1 }, { time: '2026-03-02', open: 1, high: 0.5, low: 1, close: 1 }]);
  assert.equal(candles.length, 0);
  assert.equal(rejectedCount, 2);
});

test('snapshot: divergências com o registro são identificadas explicitamente', () => {
  const history = buildHistory();
  const sim = evaluatedSim(history, '123_COMPRA');

  const wrongEntry = model.buildSimulationSnapshot({ ...sim, entryPrice: sim.entryPrice + 1 }, history);
  assert.equal(wrongEntry.verification.status, 'DIVERGENT');
  assert.equal(wrongEntry.verification.checks.find(c => c.id === 'ENTRY_LEVEL').level, 'fail');

  const wrongStop = model.buildSimulationSnapshot({ ...sim, stopLoss: sim.stopLoss - 0.5 }, history);
  assert.equal(wrongStop.verification.status, 'DIVERGENT');
  assert.equal(wrongStop.verification.checks.find(c => c.id === 'STOP_LEVEL').level, 'fail');

  // gatilho registrado que NÃO existe nos candles reais (não desenha estrutura artificial)
  const fakePattern = model.buildSimulationSnapshot({ ...sim, triggerName: 'PFR de Compra' }, history);
  assert.equal(fakePattern.verification.status, 'DIVERGENT');
  assert.equal(fakePattern.verification.checks.find(c => c.id === 'TRIGGER_REDETECTED').level, 'fail');
  assert.deepEqual(fakePattern.patternMarkers, [], 'sem padrão reproduzido, nenhum marcador é desenhado');

  // entrada registrada em candle que não rompeu o gatilho
  const badEntryDate = model.buildSimulationSnapshot({ ...sim, entryDate: history[41].time }, history);
  assert.equal(badEntryDate.verification.status, 'DIVERGENT');
  assert.equal(badEntryDate.verification.checks.find(c => c.id === 'ENTRY_EXECUTION').level, 'fail');

  // gatilho fora do catálogo: fidelidade não verificada (não presumida)
  const unknown = model.buildSimulationSnapshot({ ...sim, triggerName: 'Setup Manual' }, history);
  assert.equal(unknown.verification.status, 'UNVERIFIED');
  assert.deepEqual(unknown.patternMarkers, []);
});

test('snapshot: Inside Bar e demais gatilhos refletem a estrutura realmente detectada', () => {
  const history = buildHistory('ib');
  const sim = evaluatedSim(history, 'INSIDE_BAR');
  const snap = model.buildSimulationSnapshot(sim, history);
  assert.equal(snap.triggerId, 'INSIDE_BAR');
  assert.deepEqual(snap.patternMarkers.map(m => m.role), ['M', 'IB']);
  assert.equal(snap.patternMarkers[0].time, history[41].time);
  assert.equal(snap.patternMarkers[0].price, history[41].high);
  assert.equal(snap.patternMarkers[1].time, history[42].time);
  assert.equal(snap.verification.status, 'VERIFIED', JSON.stringify(snap.verification.checks));
});

test('snapshot: adição de posição e saída parcial vêm dos registros, nunca inventadas', () => {
  const history = buildHistory();
  const sim = evaluatedSim(history, '123_COMPRA');
  const withScale = {
    ...sim,
    scaleIn: { executed: true, date: history[45].time, price: 34.43 },
    partialExit: { executed: true, date: history[46].time, percent: 50, partialPrice: 36.25 }
  };
  const snap = model.buildSimulationSnapshot(withScale, history);
  assert.equal(snap.events.find(e => e.type === 'SCALE_IN').price, 34.43);
  assert.equal(snap.events.find(e => e.type === 'SCALE_IN').time, history[45].time);
  assert.equal(snap.events.find(e => e.type === 'PARTIAL_EXIT').price, 36.25);

  const plain = model.buildSimulationSnapshot(sim, history);
  assert.equal(plain.events.some(e => e.type === 'SCALE_IN' || e.type === 'PARTIAL_EXIT'), false);
});

test('snapshot: generateSimulationSnapshotCandles nunca sintetiza candles a partir de entrada/stop', () => {
  const sim = { symbol: 'PRIO3', signalDate: '2026-09-28', entryPrice: 62.11, stopLoss: 59.07, status: model.STATUS.CLOSED_LOSS };
  assert.deepEqual(model.generateSimulationSnapshotCandles(sim), []);
});

test('snapshot: zoom contextual e sumário estruturado para auditoria sob demanda', () => {
  const history = buildHistory();
  const sim = evaluatedSim(history, '123_COMPRA');
  const snap = model.buildSimulationSnapshot(sim, history);

  // Validação do objeto summary
  assert.ok(snap.summary, 'summary deve existir no snapshot');
  assert.equal(snap.summary.status, 'VERIFIED');
  assert.ok(snap.summary.source);
  assert.ok(snap.summary.periodFormatted);
  assert.ok(snap.summary.triggerFormatted.includes('1-2-3'));

  // allCandles deve conter todo o histórico sem truncamento
  assert.equal(snap.allCandles.length, history.length);
  assert.equal(snap.signalIdxInHistory, 42);

  // Testar presets de zoom
  const z1M = model.sliceSnapshotByZoom(snap, '1M');
  assert.ok(z1M.candles.length <= 40, `1M deve ter recorte compacto (teve ${z1M.candles.length})`);
  assert.ok(z1M.signalIndex <= 20);

  const z3M = model.sliceSnapshotByZoom(snap, '3M');
  assert.ok(z3M.candles.length >= z1M.candles.length);
  assert.equal(z3M.signalIndex, 42); // no mock, signalIdx é 42 <= 50

  const z2A = model.sliceSnapshotByZoom(snap, '2A');
  assert.equal(z2A.candles.length, history.length);
  assert.equal(z2A.signalIndex, snap.signalIdxInHistory);

  // Marcadores de pivô devem manter coerência de deslocamento
  assert.equal(z3M.patternMarkers.length, snap.patternMarkers.length);
  assert.deepEqual(z3M.patternMarkers.map(m => m.role), ['1', '2', '3']);
});
