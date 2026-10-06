const test = require('node:test');
const assert = require('node:assert/strict');
const M = require('./journal-v2-model');
const storage = (values = {}) => ({ getItem: key => values[key] ?? null, setItem: (key, value) => { values[key] = value; }, values });

test('migration preserves all legacy fields and consolidates the two dimensions by day', () => {
  const old = [{ date: '27/08/2026', note: 'Esperei.', score: '8,7 / 10', state: 'transition', emotions: ['Paciente'], attachments: ['4 prints', 'Áudio'], custom: { preserved: true } }, { date: '2026-08-27', note: 'Revisei.', score: '9 / 10', emotions: ['Ansioso'], learning: 'Esperar é decidir.' }];
  const data = M.migrate(old), record = data.records[0];
  assert.equal(data.records.length, 1);
  assert.equal(record.date, '2026-08-27');
  assert.equal(record.technical.session, 'Esperei.\n\nRevisei.');
  assert.equal(record.technical.executionScore, 8.7);
  assert.deepEqual(record.legacyEntries, old);
  assert.deepEqual(record.emotional.states, ['Paciente', 'Ansioso']);
  assert.equal(record.shared.lesson, 'Esperar é decidir.');
  assert.equal(record.technical.planRespected, null);
  assert.equal(record.emotional.intensity, null);
  assert.deepEqual(record.evidence, []);
});

test('V2 saves both pages together and never overwrites V1', () => {
  const original = JSON.stringify([{ date: '01/09/2026', note: 'Original' }]);
  const s = storage({ [M.LEGACY_KEY]: original }), data = M.load(s);
  data.records[0].emotional.note = 'Ansiedade com paciência';
  data.records[0].shared.lesson = 'Esperar';
  M.save(s, data);
  assert.equal(s.values[M.LEGACY_KEY], original);
  assert.deepEqual(M.load(s), data);
});

test('opening an existing day never creates independent technical or emotional records', () => {
  const data = { version: 2, records: [] };
  const a = M.ensureDay(data, '2026-09-07');
  a.technical.session = 'Contexto'; a.emotional.note = 'Comportamento';
  assert.equal(M.ensureDay(data, '07/09/2026'), a);
  assert.equal(data.records.length, 1);
});

test('legacy unknown dates stay recoverable and invalid calendar dates are rejected', () => {
  const raw = { date: 'meu dia', note: 'Não perder', unknown: [1, 2] };
  assert.deepEqual(M.migrate([raw]).records[0].legacyEntries[0], raw);
  assert.equal(M.dateKey('2026-02-30'), null);
  assert.equal(M.dateKey('29/02/2024'), '2024-02-29');
  assert.throws(() => M.ensureDay({ records: [] }, '2026-02-30'));
});

test('corrupt data and quota failures are surfaced without fallback or silent overwrite', () => {
  const s = storage({ [M.KEY]: '{bad', [M.LEGACY_KEY]: '[]' });
  assert.throws(() => M.load(s));
  assert.equal(s.values[M.KEY], '{bad');
  assert.throws(() => M.load(storage({ [M.LEGACY_KEY]: '[null]' })));
  assert.throws(() => M.save({ setItem() { throw new Error('quota'); } }, M.migrate([])), /quota/);
});

test('day trades use effective entry dates, deduplicate IDs and exclude planned trades', () => {
  const trades = [{ id: 'a', entryDate: '2026-09-01' }, { id: 'a', openedAt: '2026-09-01T10:00:00Z' }, { id: 'b', executed_at: '2026-09-02T10:00:00Z' }, { id: 'c', entryDate: '2026-09-01', status: 'planned' }, { id: 'd', metadata: { entryDate: '2026-09-01' }, executed_at: '2026-09-07T10:00:00Z' }];
  assert.deepEqual(M.tradesForDay('2026-09-01', trades).map(item => item.id), ['a', 'd']);
});

test('day trades also offer a closed trade for an optional post-trade review on its close day', () => {
  const trade = { id: 'closed', status: 'closed', entryDate: '2026-09-01', events: [{ type: 'entry', at: '2026-09-01T12:00:00Z' }, { type: 'close', at: '2026-09-04T16:20:00Z' }] };
  assert.equal(M.closeDate(trade), '2026-09-04');
  assert.deepEqual(M.tradesForDay('2026-09-04', [trade]).map(item => item.id), ['closed']);
});

test('old scores parse without inventing a score for unknown or missing values', () => {
  assert.equal(M.score('8,7 / 10'), 8.7);
  for (const value of ['', null, '— / 10', '12 / 10', '-1']) assert.equal(M.score(value), null);
});

test('createTrade, addTrade and removeTrade manage individual child trades of the day', () => {
  const day = M.blank('2026-09-28');
  assert.deepEqual(day.trades, []);

  const trade = M.addTrade(day, {
    ticker: 'msft',
    direction: 'long',
    setup: 'Contração de Volatilidade',
    grade: 'A',
    timeframe: 'Diário + 4H',
    entryTime: '10:30',
    whatISaw: 'Contração na MM21 com volume seco',
    whyIEntered: 'Risco/retorno 3:1 com mercado saudável',
    execution: { entryPrice: 420.5, initialStop: 410, chartRisk: '2.5%', positionSize: '300 ações', oneR: 'R$ 3.150' },
    management: { rMultiple: '+2.5R' },
    postTrade: { planRespected: 'yes', whatWentRight: 'Esperei o fechamento do candle' }
  });

  assert.equal(trade.ticker, 'MSFT');
  assert.equal(trade.direction, 'long');
  assert.equal(trade.grade, 'A');
  assert.equal(day.trades.length, 1);
  assert.equal(day.trades[0].id, trade.id);
  assert.equal(day.trades[0].execution.entryPrice, 420.5);

  const trade2 = M.addTrade(day, { ticker: 'AAPL', direction: 'short' });
  assert.equal(day.trades.length, 2);

  const removed = M.removeTrade(day, trade.id);
  assert.equal(removed, true);
  assert.equal(day.trades.length, 1);
  assert.equal(day.trades[0].ticker, 'AAPL');
});

test('loading V2 storage without trades field automatically initializes trades as an array', () => {
  const rawV2 = JSON.stringify({
    version: 2,
    records: [{
      id: 'day-2026-09-28',
      date: '2026-09-28',
      technical: { market: 'ibov', session: 'Sem trades' },
      emotional: { states: ['Calmo'] },
      shared: { lesson: 'Paciência' },
      evidence: [],
      legacyEntries: []
    }]
  });
  const s = storage({ [M.KEY]: rawV2 });
  const data = M.load(s);
  assert.ok(Array.isArray(data.records[0].trades));
  assert.equal(data.records[0].trades.length, 0);
  assert.deepEqual(data.records[0].technical.analyses, []);
});

test('a daily record is ready to retain structured chart analyses alongside evidence', () => {
  const record = M.blank('2026-10-05');
  record.technical.analyses.push({ ticker: 'VALE3', timeframe: 'Diário', rubric: 'D' });
  assert.deepEqual(record.technical.analyses, [{ ticker: 'VALE3', timeframe: 'Diário', rubric: 'D' }]);
});

test('createTrade initializes setupTrigger from catalog and falls back cleanly for legacy trades', () => {
  const t1 = M.createTrade({ ticker: 'WEGE3', setupTrigger: 'INSIDE_BAR' });
  assert.equal(t1.setupTrigger, 'INSIDE_BAR');
  assert.equal(t1.setup, 'Inside Bar');

  const t2 = M.createTrade({ ticker: 'VALE3', setup: 'Dave Landry' });
  assert.equal(t2.setupTrigger, 'DAVE_LANDRY');
  assert.equal(t2.setup, 'Dave Landry');

  const t3 = M.createTrade({ ticker: 'PETR4', setup: 'RBI' });
  assert.equal(t3.setupTrigger, 'RBI');
  assert.equal(t3.setup, 'Barra Vermelha Ignorada (RBI)');

  const tLegacy = M.createTrade({ ticker: 'BBAS3' });
  assert.equal(tLegacy.setupTrigger, null);
  assert.equal(tLegacy.setup, 'Não informado');
});


