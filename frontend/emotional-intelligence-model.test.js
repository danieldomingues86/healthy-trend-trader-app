const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('./emotional-intelligence-model');
const J = require('./journal-v2-model');
const now = new Date('2026-09-14T18:00:00Z');
function record(date, states, intensity, execution, plan = 'yes') { const r = J.blank(date); r.emotional = { states, intensity, note: 'Registro original' }; r.technical.executionScore = execution; r.technical.planRespected = plan; return r; }
function sessions(date, count) { return Array.from({ length: count }, (_, i) => ({ sessionId: `${date}-${i}`, openedAt: `${date}T${String(10 + i % 8).padStart(2, '0')}:00:00-03:00` })); }

test('missing history produces no invented patterns, averages or points', () => {
  const a = M.analyze({ now, records: [J.blank('2026-09-14')] });
  assert.equal(a.patterns.length, 0); assert.equal(a.scatter.length, 0);
  assert.equal(a.current.execution, null); assert.equal(a.current.adherence, null); assert.equal(a.current.access, null);
  assert.equal(a.contexts.best, null);
});

test('area consultations join the correct day without becoming sessions or inventing past views', () => {
  const a = M.analyze({ now, period: '7', records: [record('2026-09-13', ['Calmo'], 1, 8), record('2026-09-14', ['Calmo'], 1, 8)], activity: [{ date: '2026-09-14', views: 5, areas: { positions: 3, journal: 2 } }] });
  assert.equal(a.days[0].monitoring, undefined); assert.equal(a.days[1].monitoring, 3);
  assert.equal(a.days[1].areas.journal, 2); assert.equal(a.current.access, null);
});
test('joins Brazil dates correctly, deduplicates trades and excludes planned trades', () => {
  const trade = { id: 'one', entryDate: '2026-09-14', status: 'open' };
  const a = M.analyze({ now, period: '7', records: [record('2026-09-14', ['Calmo'], 2, 8)], trades: [trade, trade, { id: 'planned', status: 'planned', entryDate: '2026-09-14' }], sessions: [{ openedAt: '2026-09-15T01:00:00Z' }] });
  assert.equal(a.current.trades, 1); assert.equal(a.days[0].access, 1); assert.equal(a.scatter[0].date, '2026-09-14');
});
test('R is realised on close date, includes partial exits and never fabricates unknown initial risk', () => {
  const trade = { id: 'one', direction: 'long', events: [{ type: 'entry', at: '2026-09-08T12:00:00Z', price: 100, qty: 10, stop: 90 }, { type: 'peeloff', at: '2026-09-09T12:00:00Z', price: 110, qty: 4 }, { type: 'close', at: '2026-09-11T12:00:00Z', price: 90, qty: 6 }] };
  const a = M.analyze({ now, period: '7', trades: [trade, { id: 'unknown', openedAt: '2026-09-08', closedAt: '2026-09-11', entry: 100, initialQty: 10, currentStop: 99, events: [{ type: 'close', price: 120, qty: 10 }] }] });
  assert.equal(a.days.find(d => d.date === '2026-09-08').resultR, null);
  assert.equal(a.days.find(d => d.date === '2026-09-11').resultR, -.2);
  assert.equal(M.tradeData([{ ...trade, direction: 'short' }])[0].resultR, .2);
});
test('detects recurring associations with auditable groups and conservative confidence', () => {
  const records = [], access = [];
  for (let i = 1; i <= 12; i++) { const date = `2026-09-${String(i).padStart(2, '0')}`, anxious = i <= 6; records.push(record(date, [anxious ? 'Ansioso' : 'Calmo'], anxious ? 4 : 1, anxious ? 5 : 9, anxious ? 'no' : 'yes')); access.push(...sessions(date, anxious ? 14 : 5)); }
  const a = M.analyze({ now, period: '30', records, sessions: access });
  const p = a.patterns.find(p => p.id === 'anxiety-access'); assert.equal(p.count, 6); assert.equal(p.controlCount, 6); assert.equal(p.value, 14); assert.equal(p.baseline, 5); assert.equal(p.confidence, 'low');
  assert.equal(p.days[0].note, 'Registro original'); assert.equal(a.contexts.best.execution, 9); assert.equal(a.contexts.attention.execution, 5);
  assert.equal(a.relationships.find(r => r.id === 'emotion-execution').value, -1);
});
test('few observations and constant factors never yield strong correlations', () => {
  assert.equal(M.correlation([{ x: 1, y: 2 }, { x: 2, y: 3 }], d => d.x, d => d.y).value, null);
  assert.equal(M.correlation(Array.from({ length: 10 }, () => ({ x: 1, y: 2 })), d => d.x, d => d.y).value, null);
});
test('explicit legacy emotion labels can be studied without inventing their intensity', () => {
  const records = Array.from({ length: 12 }, (_, i) => record(`2026-09-${String(i + 1).padStart(2, '0')}`, [i < 6 ? 'Ansioso' : 'Calmo'], null, i < 6 ? 5 : 9));
  const a = M.analyze({ now, records });
  const p = a.patterns.find(pattern => pattern.id === 'declared-anxiety-execution');
  assert.equal(p.count, 6); assert.equal(p.controlCount, 6); assert.equal(p.value, 5); assert.equal(p.baseline, 9);
  assert.equal(a.current.intensity, null); assert.equal(a.scatter.length, 0);
  assert.equal(a.patterns.some(pattern => pattern.id === 'anxiety-access'), false);
  assert.equal(a.relationships.find(factor => factor.id === 'emotion-execution').value, null);
});
test('all components respect selected period and comparison does not leak later results', () => {
  const records = [record('2026-09-01', ['Ansioso'], 5, 3, 'no'), record('2026-09-10', ['Calmo'], 1, 9)];
  const a = M.analyze({ now, period: '7', records, sessions: [...sessions('2026-09-01', 10), ...sessions('2026-09-10', 2)], trades: [{ id: 'future', openedAt: '2026-09-10', closedAt: '2026-10-01', resultR: 4 }] });
  assert.equal(a.current.dominant, 'Calmo'); assert.equal(a.current.execution, 9); assert.equal(a.current.accessTotal, 2); assert.equal(a.scatter.length, 1); assert.equal(a.days.find(d => d.date === '2026-09-10').resultR, null);
  assert.equal(a.bounds.previousEnd, '2026-09-07'); assert.equal(a.bounds.previousStart, '2026-09-01'); assert.equal(a.previous.execution, 3);
});
test('after-loss access patterns use actual ordered timestamps, not whole-day totals', () => {
  const trades = [], access = [];
  for (let i = 1; i <= 8; i++) { const date = `2026-09-0${i}`, lost = i <= 4; trades.push({ id: date, openedAt: `${date}T10:00:00-03:00`, closedAt: `${date}T13:00:00-03:00`, resultR: lost ? -1 : 1 }); access.push({ openedAt: `${date}T11:00:00-03:00` }, ...Array.from({ length: lost ? 4 : 1 }, (_, j) => ({ openedAt: `${date}T${14 + j}:00:00-03:00` }))); }
  const a = M.analyze({ now, period: '30', trades, sessions: access }); const p = a.patterns.find(p => p.id === 'loss-after-access'); assert.equal(p.value, 4); assert.equal(p.baseline, 1); assert.equal(p.count, 4);
});
