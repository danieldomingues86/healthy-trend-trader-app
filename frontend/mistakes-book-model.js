(function (root, factory) {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.MistakesBookModel = model;
}(typeof window === 'undefined' ? globalThis : window, function () {
  'use strict';
  const KEY = 'healthy-trend-mistakes-book-v1';
  const TYPES = ['Entrada antecipada', 'FOMO', 'Quebra de regra', 'Contexto ruim', 'Sizing incorreto', 'Stop incorreto', 'Saída antecipada', 'Setup ruim', 'Contra tendência', 'Overtrading', 'Erro emocional', 'Erro de execução'];
  const GROUPS = { Entrada: ['Entrada antecipada', 'FOMO', 'Contra tendência'], Saída: ['Saída antecipada'], Gestão: ['Sizing incorreto', 'Stop incorreto'], Emocional: ['FOMO', 'Overtrading', 'Erro emocional'], Setup: ['Setup ruim', 'Contexto ruim', 'Quebra de regra', 'Erro de execução'] };
  const number = value => { if (value == null || String(value).trim() === '') return null; const result = Number(String(value).replace(',', '.')); return Number.isFinite(result) ? result : null; };
  function load(storage) {
    const raw = storage?.getItem(KEY);
    if (!raw) return { version: 1, records: [], marketLessons: [] };
    const data = JSON.parse(raw);
    if (data?.version !== 1 || !Array.isArray(data.records)) throw new Error('Formato do Mistakes Book não reconhecido.');
    // v1 records remain intact; market lessons are an additive field.
    return { ...data, marketLessons: Array.isArray(data.marketLessons) ? data.marketLessons : [] };
  }
  function save(storage, data) { storage.setItem(KEY, JSON.stringify(data)); }
  function occurrences(records, type) { return records.filter(record => record.mistakeTypes?.includes(type)); }
  function impact(records, type) {
    const related = occurrences(records, type);
    const known = related.map(record => number(record.resultR)).filter(value => value !== null);
    return { count: related.length, percentage: records.length ? Math.round(related.length / records.length * 100) : 0, costR: known.length ? known.reduce((sum, value) => sum + Math.min(0, value), 0) : null };
  }
  function metrics(records) {
    const repeated = records.filter(record => record.mistakeTypes?.some(type => occurrences(records, type).length > 1)).length;
    const known = records.map(record => number(record.resultR)).filter(value => value !== null);
    return { total: records.length, repeated, repeatedPercent: records.length ? Math.round(repeated / records.length * 100) : 0, costR: known.length ? known.reduce((sum, value) => sum + Math.min(0, value), 0) : null, mastered: records.filter(record => record.isMastered).length };
  }
  function monthlyCounts(records, type, now = new Date()) {
    return Array.from({ length: 6 }, (_, index) => {
      const month = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
      const key = `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
      return { key, count: occurrences(records, type).filter(record => record.date?.slice(0, 7) === key).length };
    });
  }
  function change(records, type, now = new Date()) {
    const months = monthlyCounts(records, type, now);
    const previous = months.slice(0, 3).reduce((sum, item) => sum + item.count, 0);
    const recent = months.slice(3).reduce((sum, item) => sum + item.count, 0);
    return { months, previous, recent, percentage: previous ? Math.round((previous - recent) / previous * 100) : null };
  }
  const ANNOTATION_TOOLS = ['Entrada', 'Stop', 'Saída', 'Região de interesse', 'Breakout', 'Erro', 'Confirmação correta'];
  function nextRecordId(records, currentId, delta) {
    if (!Array.isArray(records) || !records.length) return null;
    const index = records.findIndex(record => record.id === currentId);
    if (index === -1) {
      return delta > 0 ? records[0].id : records[records.length - 1].id;
    }
    const nextIndex = index + delta;
    if (nextIndex < 0 || nextIndex >= records.length) return records[index].id;
    return records[nextIndex].id;
  }
  const uppercase = value => (value != null ? String(value).trim().toUpperCase() : '');
  return { KEY, TYPES, GROUPS, ANNOTATION_TOOLS, nextRecordId, load, save, number, occurrences, impact, metrics, monthlyCounts, change, uppercase };
}));
