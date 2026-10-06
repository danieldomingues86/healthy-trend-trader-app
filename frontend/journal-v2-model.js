(function (root, factory) {
  const triggersCatalog = (typeof module === 'object' && module.exports)
    ? require('./setup-triggers-catalog')
    : (typeof window !== 'undefined' ? window.SetupTriggersCatalog : null);
  const model = factory(triggersCatalog);
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.JournalV2Model = model;
}(typeof window === 'undefined' ? globalThis : window, function (setupTriggers) {
  'use strict';
  const KEY = 'healthy-trend-journal-v2';
  const LEGACY_KEY = 'healthy-trend-journal-book-v1';
  const clone = value => JSON.parse(JSON.stringify(value));
  function dateKey(value) {
    if (typeof value !== 'string') return null;
    let match = value.match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/);
    if (!match) {
      const br = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (br) match = [br[0], br[3], br[2], br[1]];
    }
    if (!match) return null;
    const [, y, m, d] = match;
    const check = new Date(Number(y), Number(m) - 1, Number(d), 12);
    return check.getFullYear() === Number(y) && check.getMonth() === Number(m) - 1 && check.getDate() === Number(d) ? `${y}-${m}-${d}` : null;
  }
  function today(now = new Date()) {
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  function blank(date) {
    return { id: `day-${date}`, date, title: '', technical: { market: null, markets: [], marketState: null, marketStates: {}, session: '', executionScore: null, planRespected: null, checklist: {}, permissionMoney: null, tradeIds: [], analyses: [] }, emotional: { states: [], intensity: null, note: '', impact: null, impactNote: '' }, shared: { lesson: '', patterns: '', observations: '', phrase: '' }, trades: [], evidence: [], legacyEntries: [], updatedAt: null };
  }
  function score(value) {
    if (value == null || String(value).trim() === '') return null;
    const n = Number(String(value).split('/')[0].trim().replace(',', '.'));
    return Number.isFinite(n) && n >= 0 && n <= 10 ? n : null;
  }
  const combine = (a, b) => [...new Set([a, b].filter(Boolean))].join('\n\n');
  function migrate(entries) {
    if (!Array.isArray(entries)) throw new Error('Formato do diário antigo não reconhecido.');
    const records = [];
    entries.forEach((entry, index) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) throw new Error('Registro antigo inválido. Os dados originais foram preservados.');
      const date = dateKey(entry.date);
      let record = date && records.find(item => item.date === date);
      if (!record) { record = blank(date); if (!date) record.id = `legacy-${index}`; records.push(record); }
      record.legacyEntries.push(clone(entry));
      record.title ||= entry.title || '';
      record.technical.marketState ||= ['up', 'transition', 'down'].includes(entry.state) ? entry.state : null;
      record.technical.session = combine(record.technical.session, entry.note || '');
      record.technical.executionScore ??= score(entry.score);
      record.emotional.states = [...new Set([...record.emotional.states, ...(Array.isArray(entry.emotions) ? entry.emotions.filter(item => typeof item === 'string') : [])])];
      record.shared.lesson = combine(record.shared.lesson, entry.learning || entry.lesson || '');
      record.shared.phrase = combine(record.shared.phrase, entry.phrase || '');
      // Unknown fields, conflicting scores, labels and original dates remain in legacyEntries.
    });
    return { version: 2, records };
  }
  function load(storage, fallback = []) {
    const raw = storage.getItem(KEY);
    if (raw !== null) {
      const parsed = JSON.parse(raw);
      if (parsed?.version !== 2 || !Array.isArray(parsed.records)) throw new Error('Formato do Diário V2 não reconhecido.');
      const ids = new Set(), dates = new Set();
      for (const record of parsed.records) {
        if (!record || !record.id || !record.technical || !record.emotional || !record.shared || !Array.isArray(record.emotional.states) || !Array.isArray(record.evidence) || !Array.isArray(record.legacyEntries) || ids.has(record.id) || (record.date && (!dateKey(record.date) || dates.has(record.date)))) throw new Error('Não foi possível ler um registro do Diário V2.');
        record.trades = Array.isArray(record.trades) ? record.trades : [];
        record.technical.analyses = Array.isArray(record.technical.analyses) ? record.technical.analyses : [];
        ids.add(record.id); if (record.date) dates.add(record.date);
      }
      return parsed;
    }
    const old = storage.getItem(LEGACY_KEY);
    return migrate(old === null ? fallback : JSON.parse(old));
  }
  function save(storage, data) { storage.setItem(KEY, JSON.stringify(data)); }
  function ensureDay(data, date) {
    const key = dateKey(date);
    if (!key) throw new Error('Escolha uma data válida.');
    let record = data.records.find(item => item.date === key);
    if (!record) { record = blank(key); data.records.push(record); }
    record.trades = Array.isArray(record.trades) ? record.trades : [];
    record.technical.analyses = Array.isArray(record.technical.analyses) ? record.technical.analyses : [];
    return record;
  }
  function entryDate(trade) {
    return dateKey(trade.entryDate || trade.metadata?.entryDate || trade.executed_at || trade.openedAt);
  }
  function closeDate(trade) {
    const events = Array.isArray(trade.events) ? trade.events : [];
    const close = [...events].reverse().find(event => event?.type === 'close');
    return dateKey(trade.closedAt || trade.closed_at || close?.at);
  }
  function tradesForDay(date, trades) {
    const seen = new Set();
    return trades.filter(trade => {
      const id = trade.id || trade.databaseId;
      if (trade.status === 'planned' || !id || seen.has(id) || (entryDate(trade) !== date && closeDate(trade) !== date)) return false;
      seen.add(id); return true;
    });
  }

  function createTrade(data = {}) {
    const ticker = String(data.ticker || '').trim().toUpperCase() || 'TRADE';
    const now = new Date();
    const defaultTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const rawTrigger = data.setupTrigger || data.setup_trigger;
    const triggerKey = rawTrigger
      ? (setupTriggers ? setupTriggers.normalizeKey(rawTrigger) : rawTrigger)
      : (data.setup ? (setupTriggers ? setupTriggers.normalizeKey(data.setup) : null) : null);
    const triggerLabel = triggerKey && setupTriggers
      ? setupTriggers.getTriggerLabel(triggerKey)
      : (data.setup || 'Não informado');

    return {
      id: data.id || `trade-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      ticker,
      direction: data.direction === 'short' ? 'short' : 'long',
      setup: triggerLabel,
      setupTrigger: triggerKey,
      grade: data.grade || 'A',
      timeframe: data.timeframe || 'Diário + 4H',
      entryTime: data.entryTime || defaultTime,
      whatISaw: data.whatISaw || '',
      whyIEntered: data.whyIEntered || '',
      execution: {
        entryPrice: data.execution?.entryPrice != null ? Number(data.execution.entryPrice) : null,
        initialStop: data.execution?.initialStop != null ? Number(data.execution.initialStop) : null,
        chartRisk: data.execution?.chartRisk || '',
        positionSize: data.execution?.positionSize || '',
        oneR: data.execution?.oneR || ''
      },
      images: Array.isArray(data.images) ? data.images : (data.image ? [data.image] : []),
      management: {
        movementNotes: data.management?.movementNotes || '',
        stopAdjustments: data.management?.stopAdjustments || '',
        partialExits: data.management?.partialExits || '',
        additions: data.management?.additions || '',
        exitPrice: data.management?.exitPrice != null ? Number(data.management.exitPrice) : null,
        result: data.management?.result || '',
        rMultiple: data.management?.rMultiple || ''
      },
      postTrade: {
        planRespected: data.postTrade?.planRespected ?? null,
        whatWentRight: data.postTrade?.whatWentRight || '',
        whatWentWrong: data.postTrade?.whatWentWrong || '',
        lessonsLearned: data.postTrade?.lessonsLearned || ''
      },
      trainingAssessment: data.trainingAssessment || null,
      createdAt: data.createdAt || now.toISOString()
    };
  }

  function addTrade(record, tradeData) {
    if (!record) throw new Error('Registro inválido para adicionar trade.');
    record.trades = Array.isArray(record.trades) ? record.trades : [];
    const trade = createTrade(tradeData);
    record.trades.push(trade);
    return trade;
  }

  function removeTrade(record, tradeId) {
    if (!record || !Array.isArray(record.trades)) return false;
    const initialLen = record.trades.length;
    record.trades = record.trades.filter(t => t.id !== tradeId);
    return record.trades.length < initialLen;
  }

  return { KEY, LEGACY_KEY, dateKey, today, blank, score, migrate, load, save, ensureDay, entryDate, closeDate, tradesForDay, createTrade, addTrade, removeTrade };
}));
